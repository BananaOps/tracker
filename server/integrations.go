package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	"github.com/bananaops/tracker/internal/config"
	"github.com/bananaops/tracker/internal/integrations"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/prometheus/client_golang/prometheus"
)

// integrationWebhooks counts deployment webhooks received, by source (gitlab,
// flux) and result. The result matches one of the resultXxx constants below.
var integrationWebhooks = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "tracker_integration_webhooks_total",
		Help: "Deployment webhooks received, by source and result",
	},
	[]string{"source", "result"},
)

func init() {
	prometheus.MustRegister(integrationWebhooks)
}

const (
	integrationGitLabPath     = "/api/v1alpha1/integrations/gitlab/webhook"
	integrationFluxPath       = "/api/v1alpha1/integrations/flux/webhook"
	integrationMaxBodyBytes   = 1 << 20
	integrationProcessTimeout = 15 * time.Second

	resultRecorded     = "recorded"
	resultIgnored      = "ignored"
	resultDuplicate    = "duplicate"
	resultUnauthorized = "unauthorized"
	resultInvalid      = "invalid"
	resultError        = "error"
	resultLockConflict = "lock_conflict"
)

// IntegrationDeps are the dependencies wired into the GitLab and Flux webhook
// handlers by RegisterIntegrationHandlers.
type IntegrationDeps struct {
	Events      *Event
	Deployments DeploymentStore
	Catalog     CatalogLister
	Logger      *slog.Logger
	Now         func() time.Time
}

// NewIntegrationDeps builds the production IntegrationDeps for events. It
// opens the deployment and catalog collections, so it must only be called
// once a deployment integration source is actually configured.
func NewIntegrationDeps(events *Event) IntegrationDeps {
	return IntegrationDeps{
		Events:      events,
		Deployments: store.NewIntegrationDeploymentStore(),
		Catalog:     store.NewStoreCatalog(config.ConfigDatabase.CatalogCollection),
		Logger:      slog.New(slog.NewJSONHandler(os.Stdout, nil)),
		Now:         time.Now,
	}
}

// integrationHandler serves the GitLab and Flux webhook endpoints.
type integrationHandler struct {
	cfg       integrations.Config
	processor *IntegrationProcessor
	logger    *slog.Logger
	now       func() time.Time
}

// RegisterIntegrationHandlers registers the GitLab and Flux webhook handlers
// for the sources cfg configures. It registers nothing and returns nil when
// cfg.Enabled() is false.
func RegisterIntegrationHandlers(mux *runtime.ServeMux, cfg integrations.Config, deps IntegrationDeps) error {
	if !cfg.Enabled() {
		return nil
	}
	if deps.Events == nil || deps.Deployments == nil || deps.Catalog == nil {
		return errors.New("integrations: Events, Deployments and Catalog are required")
	}
	logger := deps.Logger
	if logger == nil {
		logger = slog.Default()
	}
	now := deps.Now
	if now == nil {
		now = time.Now
	}

	h := &integrationHandler{
		cfg:       cfg,
		processor: NewIntegrationProcessor(deps.Events, deps.Deployments, deps.Catalog, logger),
		logger:    logger,
		now:       now,
	}

	if cfg.GitLabEnabled() {
		if err := mux.HandlePath(http.MethodPost, integrationGitLabPath, authz.RequireHTTP(auth.PermPublic, h.handleGitLab)); err != nil {
			return fmt.Errorf("register gitlab webhook: %w", err)
		}
	}
	if cfg.FluxEnabled() {
		if err := mux.HandlePath(http.MethodPost, integrationFluxPath, authz.RequireHTTP(auth.PermPublic, h.handleFlux)); err != nil {
			return fmt.Errorf("register flux webhook: %w", err)
		}
	}
	return nil
}

// Response bodies. Field names match the wire contract in the design spec.
type (
	integrationRecorded struct {
		Status  string `json:"status"`
		EventID string `json:"eventId"`
	}
	integrationIgnored struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}
	integrationError struct {
		Error string `json:"error"`
	}
)

// integrationVerify authenticates a request; a non nil error is always a
// signature problem (missing, malformed or not matching).
type integrationVerify func(header http.Header, body []byte) error

// integrationParse turns a verified request into an Observation, or
// *integrations.IgnoredError, *integrations.InvalidError or
// integrations.ErrStaleTimestamp.
type integrationParse func(header http.Header, body []byte) (integrations.Observation, error)

// maxLoggedHeaderBytes bounds a delivery identifier logged before the
// request is authenticated, so an anonymous caller cannot inflate log
// volume by sending an oversized header.
const maxLoggedHeaderBytes = 64

// truncateHeader bounds v to maxLoggedHeaderBytes for logging.
func truncateHeader(v string) string {
	if len(v) <= maxLoggedHeaderBytes {
		return v
	}
	return v[:maxLoggedHeaderBytes]
}

func (h *integrationHandler) handleGitLab(w http.ResponseWriter, r *http.Request, _ map[string]string) {
	verify := func(header http.Header, body []byte) error {
		if len(h.cfg.GitLabSigningKey) > 0 {
			return integrations.VerifyGitLabSignature(h.cfg.GitLabSigningKey, header, body, h.now(), h.cfg.Tolerance)
		}
		return integrations.VerifyGitLabSecretToken(h.cfg.GitLabSecretToken, header.Get(integrations.HeaderGitLabToken))
	}
	parse := func(header http.Header, body []byte) (integrations.Observation, error) {
		return integrations.ParseGitLab(header.Get(integrations.HeaderGitLabEvent), body, h.cfg)
	}
	h.serve(w, r, integrations.SourceGitLab, verify, parse)
}

func (h *integrationHandler) handleFlux(w http.ResponseWriter, r *http.Request, _ map[string]string) {
	verify := func(header http.Header, body []byte) error {
		return integrations.VerifyFluxSignature(h.cfg.FluxHMACKey, header.Get(integrations.HeaderFluxSignature), body)
	}
	parse := func(header http.Header, body []byte) (integrations.Observation, error) {
		return integrations.ParseFlux(body, h.cfg, h.now())
	}
	h.serve(w, r, integrations.SourceFlux, verify, parse)
}

// serve is the pipeline common to both webhooks: read the body under a size
// limit, verify its signature, parse it into an Observation and process it.
// Exactly one result is counted and logged per request. Never logged: the
// raw body, a parsed message, or a secret/signature header value.
func (h *integrationHandler) serve(w http.ResponseWriter, r *http.Request, source string, verify integrationVerify, parse integrationParse) {
	baseAttrs := []any{"source", source}
	if source == integrations.SourceGitLab {
		baseAttrs = append(baseAttrs,
			"idempotencyKey", truncateHeader(r.Header.Get("Idempotency-Key")),
			"gitlabEventUUID", truncateHeader(r.Header.Get("X-Gitlab-Event-UUID")),
			"webhookId", truncateHeader(r.Header.Get(integrations.HeaderWebhookID)),
			"gitlabInstance", truncateHeader(r.Header.Get(integrations.HeaderGitLabInstance)),
		)
	}

	finish := func(status int, result string, body any, extra ...any) {
		integrationWebhooks.WithLabelValues(source, result).Inc()

		attrs := make([]any, 0, len(baseAttrs)+len(extra)+2)
		attrs = append(attrs, baseAttrs...)
		attrs = append(attrs, "result", result)
		attrs = append(attrs, extra...)

		level := slog.LevelInfo
		switch result {
		case resultUnauthorized, resultInvalid:
			level = slog.LevelWarn
		case resultError:
			level = slog.LevelError
		}
		h.logger.Log(r.Context(), level, "integration webhook", attrs...)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(body)
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, integrationMaxBodyBytes))
	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			finish(http.StatusRequestEntityTooLarge, resultInvalid, integrationError{Error: "request body too large"})
			return
		}
		finish(http.StatusBadRequest, resultInvalid, integrationError{Error: "cannot read request body"})
		return
	}

	if err := verify(r.Header, body); err != nil {
		finish(http.StatusUnauthorized, resultUnauthorized, integrationError{Error: "invalid signature"}, "reason", err.Error())
		return
	}

	obs, err := parse(r.Header, body)
	if err != nil {
		var ignored *integrations.IgnoredError
		var invalid *integrations.InvalidError
		switch {
		case errors.As(err, &ignored):
			finish(http.StatusAccepted, resultIgnored, integrationIgnored{Status: "ignored", Reason: ignored.Reason}, "reason", ignored.Reason)
		case errors.As(err, &invalid):
			finish(http.StatusBadRequest, resultInvalid, integrationError{Error: invalid.Reason}, "reason", invalid.Reason)
		case errors.Is(err, integrations.ErrStaleTimestamp):
			finish(http.StatusUnauthorized, resultUnauthorized, integrationError{Error: "invalid signature"}, "reason", err.Error())
		default:
			finish(http.StatusInternalServerError, resultError, integrationError{Error: "internal error"}, "reason", err.Error())
		}
		return
	}

	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), integrationProcessTimeout)
	defer cancel()
	res, err := h.processor.Process(ctx, obs)
	if err != nil {
		if errors.Is(err, errClaimPending) {
			finish(http.StatusInternalServerError, resultError, integrationError{Error: "deployment is being recorded, retry later"}, "key", obs.Key, "reason", err.Error())
			return
		}
		finish(http.StatusInternalServerError, resultError, integrationError{Error: "storage failure"}, "key", obs.Key, "reason", err.Error())
		return
	}

	switch res.Outcome {
	case outcomeIgnored:
		finish(http.StatusAccepted, resultIgnored, integrationIgnored{Status: "ignored", Reason: res.Reason}, "key", obs.Key, "reason", res.Reason)
	case outcomeDuplicate, outcomeStale:
		finish(http.StatusAccepted, resultDuplicate, integrationIgnored{Status: "ignored", Reason: res.Outcome}, "key", obs.Key, "eventId", res.EventID)
	case outcomeLockConflict:
		finish(http.StatusOK, resultLockConflict, integrationRecorded{Status: "recorded", EventID: res.EventID}, "key", obs.Key, "eventId", res.EventID)
	default:
		finish(http.StatusOK, resultRecorded, integrationRecorded{Status: "recorded", EventID: res.EventID}, "key", obs.Key, "eventId", res.EventID)
	}
}
