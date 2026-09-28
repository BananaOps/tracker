package server

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/identity"
	"github.com/bananaops/tracker/internal/integrations"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// syncBuffer is a bytes.Buffer safe for concurrent writes, used to capture
// the JSON logger output of an integrationEnv.
type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

// integrationSecrets are the fixed test credentials for both webhook sources.
type integrationSecrets struct {
	signingToken  string
	signingKeyB64 string
	signingKey    []byte
	secretToken   string
	fluxKey       string
}

func newIntegrationSecrets() integrationSecrets {
	signingKey := bytes.Repeat([]byte{0x11}, 32)
	signingKeyB64 := base64.StdEncoding.EncodeToString(signingKey)
	return integrationSecrets{
		signingKey:    signingKey,
		signingKeyB64: signingKeyB64,
		signingToken:  "whsec_" + signingKeyB64,
		secretToken:   "gitlab-secret-token-0123",
		fluxKey:       "flux-hmac-key-0123456789abcdef0123456789",
	}
}

// loadIntegrationConfig loads an integrations.Config from a fixed set of
// environment variables, ignoring the real process environment.
func loadIntegrationConfig(t *testing.T, vars map[string]string) integrations.Config {
	t.Helper()
	cfg, err := integrations.LoadConfig(func(k string) (string, bool) {
		v, ok := vars[k]
		return v, ok
	})
	require.NoError(t, err)
	return cfg
}

// integrationEnv wires a real Mongo database, the integration handlers and
// the auth middleware together, so tests exercise the exact request path a
// webhook goes through in production.
type integrationEnv struct {
	db      *mongo.Database
	handler http.Handler
	logs    *syncBuffer
	now     time.Time
	cfg     integrations.Config
	sec     integrationSecrets
	seq     int
}

func newIntegrationEnv(t *testing.T, cfg integrations.Config) *integrationEnv {
	t.Helper()
	db := testMongoDatabase(t)

	logs := &syncBuffer{}
	logger := slog.New(slog.NewJSONHandler(logs, nil))
	prev := slog.Default()
	slog.SetDefault(logger)
	t.Cleanup(func() { slog.SetDefault(prev) })

	events := newEventFromStores(
		store.NewStoreEventFromCollection(db.Collection("events")),
		store.NewStoreLockFromCollection(db.Collection("locks")),
		logger,
	)

	now := time.Now().UTC().Truncate(time.Second)

	mux := runtime.NewServeMux()
	err := RegisterIntegrationHandlers(mux, cfg, IntegrationDeps{
		Events:      events,
		Deployments: store.NewIntegrationDeploymentStoreFromCollection(db.Collection(store.IntegrationDeploymentsCollection)),
		Catalog:     store.NewStoreCatalogFromCollection(db.Collection("catalog")),
		Logger:      logger,
		Now:         func() time.Time { return now },
	})
	require.NoError(t, err)

	// The resolver carries no store: there is no user or api key to look up,
	// so any credential (including a malformed X-Api-Key) is rejected before
	// it ever reaches a store, and an absent one resolves to anonymous.
	handler := auth.HTTPMiddleware(
		&identity.Resolver{AnonymousPermissions: []auth.Permission{}},
		auth.Config{AnonymousPermissions: []auth.Permission{}},
	)(mux)

	return &integrationEnv{
		db:      db,
		handler: handler,
		logs:    logs,
		now:     now,
		cfg:     cfg,
		sec:     newIntegrationSecrets(),
	}
}

// gitlabDeploymentBody builds a GitLab "Deployment Hook" payload for project
// team/payments (web_url https://gitlab.example.com/team/payments), deployed
// by jdoe at short_sha a1b2c3d4.
func gitlabDeploymentBody(t *testing.T, id int64, status string, at time.Time, environment string) []byte {
	t.Helper()
	body, err := json.Marshal(map[string]any{
		"object_kind":       "deployment",
		"status":            status,
		"status_changed_at": at.Format(time.RFC3339),
		"deployment_id":     id,
		"environment":       environment,
		"short_sha":         "a1b2c3d4",
		"commit_title":      "Fix rounding",
		"user":              map[string]any{"username": "jdoe"},
		"project": map[string]any{
			"web_url":             "https://gitlab.example.com/team/payments",
			"path_with_namespace": "team/payments",
		},
	})
	require.NoError(t, err)
	return body
}

// fluxEventBody builds a Flux notification-controller event for the
// Kustomization apps/payments, in the production environment.
func fluxEventBody(t *testing.T, severity, reason string, at time.Time, revision string) []byte {
	t.Helper()
	body, err := json.Marshal(map[string]any{
		"involvedObject": map[string]any{"kind": "Kustomization", "namespace": "apps", "name": "payments"},
		"severity":       severity,
		"reason":         reason,
		"timestamp":      at.Format(time.RFC3339),
		"message":        "Reconciliation finished",
		"metadata": map[string]any{
			"kustomize.toolkit.fluxcd.io/revision": revision,
			"environment":                          "production",
		},
	})
	require.NoError(t, err)
	return body
}

// gitlabRequest builds a signed GitLab webhook request. Each call uses a
// fresh webhook-id, unless the caller reuses the returned *http.Request
// itself (do resets its body for a replay).
func (e *integrationEnv) gitlabRequest(t *testing.T, body []byte, ts time.Time) *http.Request {
	t.Helper()
	e.seq++
	id := fmt.Sprintf("msg_%d", e.seq)
	tsString := strconv.FormatInt(ts.Unix(), 10)

	req, err := http.NewRequest(http.MethodPost, integrationGitLabPath, bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(integrations.HeaderGitLabEvent, integrations.GitLabDeploymentHook)
	req.Header.Set(integrations.HeaderGitLabInstance, "https://gitlab.example.com")
	req.Header.Set(integrations.HeaderWebhookID, id)
	req.Header.Set(integrations.HeaderWebhookTimestamp, tsString)
	req.Header.Set(integrations.HeaderWebhookSignature, integrations.SignGitLab(e.sec.signingKey, id, tsString, body))
	return req
}

// fluxRequest builds a signed Flux webhook request.
func (e *integrationEnv) fluxRequest(t *testing.T, body []byte) *http.Request {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, integrationFluxPath, bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	sig, err := integrations.SignFlux("sha256", []byte(e.sec.fluxKey), body)
	require.NoError(t, err)
	req.Header.Set(integrations.HeaderFluxSignature, sig)
	return req
}

// do serves req through the full handler chain (auth middleware, then mux).
// req's body is reset from GetBody first, so the same *http.Request can be
// replayed several times.
func (e *integrationEnv) do(req *http.Request) *httptest.ResponseRecorder {
	if req.GetBody != nil {
		if b, err := req.GetBody(); err == nil {
			req.Body = b
		}
	}
	rec := httptest.NewRecorder()
	e.handler.ServeHTTP(rec, req)
	return rec
}

// count returns the number of documents in collection.
func (e *integrationEnv) count(t *testing.T, collection string) int64 {
	t.Helper()
	n, err := e.db.Collection(collection).CountDocuments(context.Background(), bson.M{})
	require.NoError(t, err)
	return n
}

// onlyEvent requires exactly one document in the events collection and
// returns it decoded.
func (e *integrationEnv) onlyEvent(t *testing.T) *eventv1.Event {
	t.Helper()
	events, err := store.NewStoreEventFromCollection(e.db.Collection("events")).List(context.Background())
	require.NoError(t, err)
	require.Len(t, events, 1)
	return events[0]
}

// locks returns every lock currently held.
func (e *integrationEnv) locks(t *testing.T) []*lockv1.Lock {
	t.Helper()
	locks, err := store.NewStoreLockFromCollection(e.db.Collection("locks")).List(context.Background())
	require.NoError(t, err)
	return locks
}
