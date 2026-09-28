package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	catalogv1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	lockv1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"github.com/bananaops/tracker/internal/integrations"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson"
)

// fullIntegrationConfig loads a Config with both GitLab (signing token) and
// Flux configured, using the deterministic test secrets.
func fullIntegrationConfig(t *testing.T) integrations.Config {
	t.Helper()
	sec := newIntegrationSecrets()
	return loadIntegrationConfig(t, map[string]string{
		integrations.EnvGitLabSigningToken: sec.signingToken,
		integrations.EnvFluxHMACKey:        sec.fluxKey,
	})
}

// gitlabRequestWithSignatureFor builds a GitLab request whose body is body
// but whose signature is computed over signedBody, so the signature never
// matches (used to test a tampered or mismatched signature).
func gitlabRequestWithSignatureFor(t *testing.T, env *integrationEnv, body, signedBody []byte, ts time.Time) *http.Request {
	t.Helper()
	env.seq++
	id := fmt.Sprintf("msg_%d", env.seq)
	tsString := strconv.FormatInt(ts.Unix(), 10)
	req, err := http.NewRequest(http.MethodPost, integrationGitLabPath, bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(integrations.HeaderGitLabEvent, integrations.GitLabDeploymentHook)
	req.Header.Set(integrations.HeaderGitLabInstance, "https://gitlab.example.com")
	req.Header.Set(integrations.HeaderWebhookID, id)
	req.Header.Set(integrations.HeaderWebhookTimestamp, tsString)
	req.Header.Set(integrations.HeaderWebhookSignature, integrations.SignGitLab(env.sec.signingKey, id, tsString, signedBody))
	return req
}

func TestIntegrationRoutesAbsentWithoutConfig(t *testing.T) {
	env := newIntegrationEnv(t, loadIntegrationConfig(t, nil))

	for _, path := range []string{integrationGitLabPath, integrationFluxPath} {
		req, err := http.NewRequest(http.MethodPost, path, bytes.NewReader([]byte("{}")))
		require.NoError(t, err)
		rec := env.do(req)
		require.Equal(t, http.StatusNotFound, rec.Code, "path %s", path)
	}
}

func TestIntegrationFluxOnly(t *testing.T) {
	sec := newIntegrationSecrets()
	cfg := loadIntegrationConfig(t, map[string]string{integrations.EnvFluxHMACKey: sec.fluxKey})
	env := newIntegrationEnv(t, cfg)

	req, err := http.NewRequest(http.MethodPost, integrationGitLabPath, bytes.NewReader([]byte("{}")))
	require.NoError(t, err)
	rec := env.do(req)
	require.Equal(t, http.StatusNotFound, rec.Code)

	body := fluxEventBody(t, "info", "Progressing", env.now, "main@sha1:abcdef1234567890abcdef1234567890abcdef12")
	unsigned, err := http.NewRequest(http.MethodPost, integrationFluxPath, bytes.NewReader(body))
	require.NoError(t, err)
	unsigned.Header.Set("Content-Type", "application/json")
	rec2 := env.do(unsigned)
	require.Equal(t, http.StatusUnauthorized, rec2.Code)
}

func TestGitLabInvalidSignature(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "unauthorized"))

	body := gitlabDeploymentBody(t, 42, "running", time.Now(), "production")
	otherBody := gitlabDeploymentBody(t, 43, "running", time.Now(), "production")
	req := gitlabRequestWithSignatureFor(t, env, body, otherBody, env.now)

	rec := env.do(req)
	require.Equal(t, http.StatusUnauthorized, rec.Code)
	require.JSONEq(t, `{"error":"invalid signature"}`, rec.Body.String())

	after := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "unauthorized"))
	require.Equal(t, before+1, after)
	require.Equal(t, int64(0), env.count(t, "events"))
	require.Equal(t, int64(0), env.count(t, "integration_deployments"))
}

func TestGitLabTimestampOutsideTolerance(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	body := gitlabDeploymentBody(t, 44, "running", time.Now(), "production")

	for _, ts := range []time.Time{
		env.now.Add(-5*time.Minute - time.Second),
		env.now.Add(5*time.Minute + time.Second),
	} {
		req := env.gitlabRequest(t, body, ts)
		rec := env.do(req)
		require.Equal(t, http.StatusUnauthorized, rec.Code, "ts %s", ts)
	}

	require.Equal(t, int64(0), env.count(t, "events"))
	require.Equal(t, int64(0), env.count(t, "integration_deployments"))
}

func TestGitLabRejectedAPIKey(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))

	body := gitlabDeploymentBody(t, 45, "running", time.Now(), "production")
	req := env.gitlabRequest(t, body, env.now)
	req.Header.Set("X-Api-Key", "not-a-key")

	before := totalIntegrationWebhooks(t)
	rec := env.do(req)
	require.Equal(t, http.StatusUnauthorized, rec.Code)
	require.JSONEq(t, `{"error":"invalid or expired credentials"}`, rec.Body.String())
	after := totalIntegrationWebhooks(t)
	require.Equal(t, before, after)
}

func TestGitLabAnonymousWithEmptyPermissions(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	body := gitlabDeploymentBody(t, 46, "running", time.Now(), "review/foo")
	req := env.gitlabRequest(t, body, env.now)

	rec := env.do(req)
	require.Equal(t, http.StatusAccepted, rec.Code)
}

func TestGitLabBodyTooLarge(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "invalid"))

	body := bytes.Repeat([]byte("a"), integrationMaxBodyBytes+1)
	req := env.gitlabRequest(t, body, env.now)

	rec := env.do(req)
	require.Equal(t, http.StatusRequestEntityTooLarge, rec.Code)

	after := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "invalid"))
	require.Equal(t, before+1, after)
}

func TestGitLabInvalidJSON(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "invalid"))

	req := env.gitlabRequest(t, []byte(`{`), env.now)
	rec := env.do(req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	after := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "invalid"))
	require.Equal(t, before+1, after)
}

func TestIntegrationIgnoredCases(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))

	assertIgnored := func(t *testing.T, reason string, rec *httptest.ResponseRecorder) {
		t.Helper()
		require.Equal(t, http.StatusAccepted, rec.Code)
		require.JSONEq(t, fmt.Sprintf(`{"status":"ignored","reason":%q}`, reason), rec.Body.String())
		require.Equal(t, int64(0), env.count(t, "events"))
		require.Equal(t, int64(0), env.count(t, "integration_deployments"))
	}

	t.Run("gitlab push hook", func(t *testing.T) {
		before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "ignored"))
		body := gitlabDeploymentBody(t, 100, "running", time.Now(), "production")
		req := env.gitlabRequest(t, body, env.now)
		req.Header.Set(integrations.HeaderGitLabEvent, "Push Hook")
		rec := env.do(req)
		assertIgnored(t, "unsupported event", rec)
		require.Equal(t, before+1, testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "ignored")))
	})

	t.Run("gitlab review environment", func(t *testing.T) {
		before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "ignored"))
		body := gitlabDeploymentBody(t, 101, "running", time.Now(), "review/foo")
		req := env.gitlabRequest(t, body, env.now)
		rec := env.do(req)
		assertIgnored(t, "unmapped environment", rec)
		require.Equal(t, before+1, testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "ignored")))
	})

	t.Run("gitlab integration environment", func(t *testing.T) {
		before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "ignored"))
		body := gitlabDeploymentBody(t, 102, "running", time.Now(), "integration")
		req := env.gitlabRequest(t, body, env.now)
		rec := env.do(req)
		assertIgnored(t, "unmapped environment", rec)
		require.Equal(t, before+1, testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "ignored")))
	})

	t.Run("gitlab approved status", func(t *testing.T) {
		before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "ignored"))
		body := gitlabDeploymentBody(t, 103, "approved", time.Now(), "production")
		req := env.gitlabRequest(t, body, env.now)
		rec := env.do(req)
		assertIgnored(t, "approval not tracked", rec)
		require.Equal(t, before+1, testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "ignored")))
	})

	t.Run("flux unsupported kind", func(t *testing.T) {
		before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("flux", "ignored"))
		body, err := json.Marshal(map[string]any{
			"involvedObject": map[string]any{"kind": "GitRepository", "namespace": "apps", "name": "payments"},
			"severity":       "info",
			"reason":         "Progressing",
			"timestamp":      env.now.Format(time.RFC3339),
			"metadata":       map[string]any{"environment": "production"},
		})
		require.NoError(t, err)
		req := env.fluxRequest(t, body)
		rec := env.do(req)
		assertIgnored(t, "unsupported kind", rec)
		require.Equal(t, before+1, testutil.ToFloat64(integrationWebhooks.WithLabelValues("flux", "ignored")))
	})

	t.Run("flux unsupported reason", func(t *testing.T) {
		before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("flux", "ignored"))
		body := fluxEventBody(t, "info", "DependencyNotReady", env.now, "main@sha1:abcdef1234567890abcdef1234567890abcdef12")
		req := env.fluxRequest(t, body)
		rec := env.do(req)
		assertIgnored(t, "unsupported reason", rec)
		require.Equal(t, before+1, testutil.ToFloat64(integrationWebhooks.WithLabelValues("flux", "ignored")))
	})
}

func TestGitLabDeploymentLifecycle(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	beforeRecorded := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "recorded"))

	t0 := time.Now()
	req1 := env.gitlabRequest(t, gitlabDeploymentBody(t, 200, "running", t0, "production"), env.now)
	rec1 := env.do(req1)
	require.Equal(t, http.StatusOK, rec1.Code)
	var resp1 integrationRecorded
	require.NoError(t, json.Unmarshal(rec1.Body.Bytes(), &resp1))
	require.Equal(t, "recorded", resp1.Status)
	require.NotEmpty(t, resp1.EventID)

	locks := env.locks(t)
	require.Len(t, locks, 1)
	require.Equal(t, "gitlab:jdoe", locks[0].Who)
	require.Equal(t, resp1.EventID, locks[0].EventId)

	t1 := t0.Add(30 * time.Second)
	req2 := env.gitlabRequest(t, gitlabDeploymentBody(t, 200, "success", t1, "production"), env.now)
	rec2 := env.do(req2)
	require.Equal(t, http.StatusOK, rec2.Code)
	var resp2 integrationRecorded
	require.NoError(t, json.Unmarshal(rec2.Body.Bytes(), &resp2))
	require.Equal(t, resp1.EventID, resp2.EventID)

	ev := env.onlyEvent(t)
	require.Equal(t, eventv1.Type_deployment, ev.Attributes.Type)
	require.Equal(t, "gitlab", ev.Attributes.Source)
	require.Equal(t, eventv1.Environment_production, ev.Attributes.Environment)
	require.Equal(t, eventv1.Status_success, ev.Attributes.Status)
	require.Equal(t, "payments", ev.Attributes.Service)

	require.Len(t, env.locks(t), 0)

	duration := ev.Metadata.Duration.AsDuration()
	require.GreaterOrEqual(t, duration, 25*time.Second)
	require.LessOrEqual(t, duration, 35*time.Second)

	var created, statusChanged *eventv1.ChangelogEntry
	for _, e := range ev.Changelog {
		switch e.ChangeType {
		case eventv1.ChangeType_created:
			created = e
		case eventv1.ChangeType_status_changed:
			statusChanged = e
		}
	}
	require.NotNil(t, created)
	require.Equal(t, "gitlab:jdoe", created.User)
	require.NotNil(t, statusChanged)
	require.Equal(t, "start", statusChanged.OldValue)
	require.Equal(t, "success", statusChanged.NewValue)
	require.Equal(t, "gitlab:jdoe", statusChanged.User)

	afterRecorded := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "recorded"))
	require.Equal(t, beforeRecorded+2, afterRecorded)
}

func TestGitLabCanceled(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	t0 := time.Now()

	rec1 := env.do(env.gitlabRequest(t, gitlabDeploymentBody(t, 300, "running", t0, "production"), env.now))
	require.Equal(t, http.StatusOK, rec1.Code)

	rec2 := env.do(env.gitlabRequest(t, gitlabDeploymentBody(t, 300, "canceled", t0.Add(5*time.Second), "production"), env.now))
	require.Equal(t, http.StatusOK, rec2.Code)

	ev := env.onlyEvent(t)
	require.Equal(t, eventv1.Status_warning, ev.Attributes.Status)

	var commented *eventv1.ChangelogEntry
	for _, e := range ev.Changelog {
		if e.ChangeType == eventv1.ChangeType_commented && e.Comment == "Deployment canceled" {
			commented = e
		}
	}
	require.NotNil(t, commented)

	require.Len(t, env.locks(t), 0)
}

func TestGitLabLockConflict(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	ctx := context.Background()

	alice, err := store.NewStoreLockFromCollection(env.db.Collection("locks")).Create(ctx, &lockv1.Lock{
		Service: "payments", Environment: "production", Resource: "deployment", Who: "alice",
	})
	require.NoError(t, err)

	beforeLockConflict := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "lock_conflict"))
	beforeRecorded := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "recorded"))

	t0 := time.Now()
	rec1 := env.do(env.gitlabRequest(t, gitlabDeploymentBody(t, 400, "running", t0, "production"), env.now))
	require.Equal(t, http.StatusOK, rec1.Code)
	var resp1 integrationRecorded
	require.NoError(t, json.Unmarshal(rec1.Body.Bytes(), &resp1))
	require.Equal(t, "recorded", resp1.Status)

	ev := env.onlyEvent(t)
	var commented *eventv1.ChangelogEntry
	for _, e := range ev.Changelog {
		if e.ChangeType == eventv1.ChangeType_commented {
			commented = e
		}
	}
	require.NotNil(t, commented)
	require.Equal(t, "Deployed while payments was locked in production by alice", commented.Comment)

	require.Equal(t, beforeLockConflict+1, testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "lock_conflict")))
	require.Equal(t, beforeRecorded, testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "recorded")))

	rec2 := env.do(env.gitlabRequest(t, gitlabDeploymentBody(t, 400, "success", t0.Add(10*time.Second), "production"), env.now))
	require.Equal(t, http.StatusOK, rec2.Code)

	locks := env.locks(t)
	require.Len(t, locks, 1)
	require.Equal(t, alice.Id, locks[0].Id)
	require.Equal(t, "alice", locks[0].Who)
	require.Equal(t, "", locks[0].EventId)
}

func TestFluxProgressingThenSucceededSameSecond(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	beforeRecorded := testutil.ToFloat64(integrationWebhooks.WithLabelValues("flux", "recorded"))

	revision := "main@sha1:abcdef1234567890abcdef1234567890abcdef12"
	rec1 := env.do(env.fluxRequest(t, fluxEventBody(t, "info", "Progressing", env.now, revision)))
	require.Equal(t, http.StatusOK, rec1.Code)

	rec2 := env.do(env.fluxRequest(t, fluxEventBody(t, "info", "ReconciliationSucceeded", env.now, revision)))
	require.Equal(t, http.StatusOK, rec2.Code)

	ev := env.onlyEvent(t)
	require.Equal(t, "flux", ev.Attributes.Source)
	require.Equal(t, eventv1.Status_success, ev.Attributes.Status)

	require.Len(t, env.locks(t), 0)

	afterRecorded := testutil.ToFloat64(integrationWebhooks.WithLabelValues("flux", "recorded"))
	require.Equal(t, beforeRecorded+2, afterRecorded)
}

func TestGitLabOutOfOrder(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	beforeDuplicate := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "duplicate"))

	t0 := time.Now()
	rec1 := env.do(env.gitlabRequest(t, gitlabDeploymentBody(t, 500, "success", t0, "production"), env.now))
	require.Equal(t, http.StatusOK, rec1.Code)

	rec2 := env.do(env.gitlabRequest(t, gitlabDeploymentBody(t, 500, "running", t0.Add(-10*time.Second), "production"), env.now))
	require.Equal(t, http.StatusAccepted, rec2.Code)
	require.JSONEq(t, `{"status":"ignored","reason":"stale"}`, rec2.Body.String())

	ev := env.onlyEvent(t)
	require.Equal(t, eventv1.Status_success, ev.Attributes.Status)

	require.Len(t, env.locks(t), 0)

	afterDuplicate := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "duplicate"))
	require.Equal(t, beforeDuplicate+1, afterDuplicate)
}

func TestGitLabReplayTenTimes(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))

	req := env.gitlabRequest(t, gitlabDeploymentBody(t, 600, "running", time.Now(), "production"), env.now)

	rec := env.do(req)
	require.Equal(t, http.StatusOK, rec.Code)

	firstLen := len(env.onlyEvent(t).Changelog)

	for i := 0; i < 9; i++ {
		rec = env.do(req)
		require.Equal(t, http.StatusAccepted, rec.Code)
		require.JSONEq(t, `{"status":"ignored","reason":"duplicate"}`, rec.Body.String())
	}

	ev := env.onlyEvent(t)
	require.Len(t, ev.Changelog, firstLen)
	require.Len(t, env.locks(t), 1)
}

func TestGitLabReplayWithDifferentInstanceHeaderIsDuplicate(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))

	req := env.gitlabRequest(t, gitlabDeploymentBody(t, 601, "running", time.Now(), "production"), env.now)
	rec := env.do(req)
	require.Equal(t, http.StatusOK, rec.Code)

	// Same signed delivery (id, timestamp, signature and body all unchanged,
	// still within the replay window): only X-Gitlab-Instance differs. The
	// correlation key is derived from project.web_url, not this header, so
	// replaying it must still be recognized as a duplicate of the same
	// deployment instead of minting a second event.
	req.Header.Set(integrations.HeaderGitLabInstance, "https://attacker.example.com")
	rec2 := env.do(req)
	require.Equal(t, http.StatusAccepted, rec2.Code)
	require.JSONEq(t, `{"status":"ignored","reason":"duplicate"}`, rec2.Body.String())

	env.onlyEvent(t)
}

func TestFluxInvalidSignatureAndStaleTimestamp(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))

	body := fluxEventBody(t, "info", "Progressing", env.now, "main@sha1:abcdef1234567890abcdef1234567890abcdef12")
	badKeyReq, err := http.NewRequest(http.MethodPost, integrationFluxPath, bytes.NewReader(body))
	require.NoError(t, err)
	badKeyReq.Header.Set("Content-Type", "application/json")
	sig, err := integrations.SignFlux("sha256", []byte("wrong-flux-key-0123456789abcdef01234567"), body)
	require.NoError(t, err)
	badKeyReq.Header.Set(integrations.HeaderFluxSignature, sig)
	rec := env.do(badKeyReq)
	require.Equal(t, http.StatusUnauthorized, rec.Code)

	staleBody := fluxEventBody(t, "info", "Progressing", env.now.Add(-5*time.Minute-time.Second), "main@sha1:abcdef1234567890abcdef1234567890abcdef12")
	rec2 := env.do(env.fluxRequest(t, staleBody))
	require.Equal(t, http.StatusUnauthorized, rec2.Code)

	require.Equal(t, int64(0), env.count(t, "events"))
	require.Equal(t, int64(0), env.count(t, "integration_deployments"))
}

func TestGitLabSecretTokenMode(t *testing.T) {
	sec := newIntegrationSecrets()
	cfg := loadIntegrationConfig(t, map[string]string{integrations.EnvGitLabSecretToken: sec.secretToken})
	env := newIntegrationEnv(t, cfg)

	body := gitlabDeploymentBody(t, 700, "running", time.Now(), "review/foo")

	rec := env.do(gitlabTokenRequest(t, body, sec.secretToken))
	require.Equal(t, http.StatusAccepted, rec.Code)

	recBad := env.do(gitlabTokenRequest(t, body, "wrong-token-0123456789"))
	require.Equal(t, http.StatusUnauthorized, recBad.Code)

	recNone := env.do(gitlabTokenRequest(t, body, ""))
	require.Equal(t, http.StatusUnauthorized, recNone.Code)
}

// gitlabTokenRequest builds a GitLab request authenticated with
// X-Gitlab-Token instead of a Standard Webhooks signature. An empty token
// omits the header entirely.
func gitlabTokenRequest(t *testing.T, body []byte, token string) *http.Request {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, integrationGitLabPath, bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(integrations.HeaderGitLabEvent, integrations.GitLabDeploymentHook)
	req.Header.Set(integrations.HeaderGitLabInstance, "https://gitlab.example.com")
	if token != "" {
		req.Header.Set(integrations.HeaderGitLabToken, token)
	}
	return req
}

// TestGitLabSigningTokenNeverFallsBackToSecretToken enforces controller
// ruling 1: when a signing token is configured, a valid webhook-signature is
// required and X-Gitlab-Token is never accepted as a fallback, even when a
// secret token is also configured.
func TestGitLabSigningTokenNeverFallsBackToSecretToken(t *testing.T) {
	sec := newIntegrationSecrets()
	cfg := loadIntegrationConfig(t, map[string]string{
		integrations.EnvGitLabSigningToken: sec.signingToken,
		integrations.EnvGitLabSecretToken:  sec.secretToken,
	})
	env := newIntegrationEnv(t, cfg)

	body := gitlabDeploymentBody(t, 800, "running", time.Now(), "production")
	req := gitlabTokenRequest(t, body, sec.secretToken)

	rec := env.do(req)
	require.Equal(t, http.StatusUnauthorized, rec.Code)
}

// TestGitLabClaimPendingReturns500 enforces controller ruling 2: an abandoned
// claim (event id never recorded, past the staleness window) makes Process
// return errClaimPending, which the handler must map to 500 so the sender
// retries, not to a 4xx.
func TestGitLabClaimPendingReturns500(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	ctx := context.Background()

	key := "gitlab:gitlab.example.com:900"
	depStore := store.NewIntegrationDeploymentStoreFromCollection(env.db.Collection(store.IntegrationDeploymentsCollection))
	created, _, err := depStore.Claim(ctx, key, "gitlab", "start", env.now, 1)
	require.NoError(t, err)
	require.True(t, created)

	_, err = env.db.Collection(store.IntegrationDeploymentsCollection).UpdateOne(ctx,
		bson.M{"_id": key},
		bson.M{"$set": bson.M{"createdAt": env.now.Add(-time.Hour)}},
	)
	require.NoError(t, err)

	before := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "error"))

	body := gitlabDeploymentBody(t, 900, "running", time.Now(), "production")
	rec := env.do(env.gitlabRequest(t, body, env.now))
	require.Equal(t, http.StatusInternalServerError, rec.Code)
	require.JSONEq(t, `{"error":"deployment is being recorded, retry later"}`, rec.Body.String())

	after := testutil.ToFloat64(integrationWebhooks.WithLabelValues("gitlab", "error"))
	require.Equal(t, before+1, after)
}

func TestGitLabCatalogResolution(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	ctx := context.Background()

	_, err := store.NewStoreCatalogFromCollection(env.db.Collection("catalog")).Update(ctx,
		map[string]interface{}{"name": "payments-api"},
		&catalogv1.Catalog{Name: "payments-api", Repository: "git@gitlab.example.com:team/payments.git"},
	)
	require.NoError(t, err)

	body := gitlabDeploymentBody(t, 1000, "running", time.Now(), "production")
	rec := env.do(env.gitlabRequest(t, body, env.now))
	require.Equal(t, http.StatusOK, rec.Code)

	ev := env.onlyEvent(t)
	require.Equal(t, "payments-api", ev.Attributes.Service)
	require.Equal(t, "Deploy payments-api a1b2c3d4 to production", ev.Title)
}

func TestIntegrationLogsContainNoSecret(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	var gitlabSignatures []string
	var fluxSignatures []string

	// Case 3: invalid signature, with an (unused) X-Gitlab-Token also set.
	body := gitlabDeploymentBody(t, 1100, "running", time.Now(), "production")
	other := gitlabDeploymentBody(t, 1101, "running", time.Now(), "production")
	badSigReq := gitlabRequestWithSignatureFor(t, env, body, other, env.now)
	badSigReq.Header.Set(integrations.HeaderGitLabToken, env.sec.secretToken)
	env.do(badSigReq)
	gitlabSignatures = append(gitlabSignatures, badSigReq.Header.Get(integrations.HeaderWebhookSignature))

	// Case 10: lifecycle (recorded).
	t0 := time.Now()
	req1 := env.gitlabRequest(t, gitlabDeploymentBody(t, 1102, "running", t0, "production"), env.now)
	env.do(req1)
	gitlabSignatures = append(gitlabSignatures, req1.Header.Get(integrations.HeaderWebhookSignature))
	req2 := env.gitlabRequest(t, gitlabDeploymentBody(t, 1102, "success", t0.Add(30*time.Second), "production"), env.now)
	env.do(req2)
	gitlabSignatures = append(gitlabSignatures, req2.Header.Get(integrations.HeaderWebhookSignature))

	// Case 13: Flux progressing then succeeded, same instant.
	revision := "main@sha1:abcdef1234567890abcdef1234567890abcdef12"
	fluxReq1 := env.fluxRequest(t, fluxEventBody(t, "info", "Progressing", env.now, revision))
	env.do(fluxReq1)
	fluxSignatures = append(fluxSignatures, fluxReq1.Header.Get(integrations.HeaderFluxSignature))
	fluxReq2 := env.fluxRequest(t, fluxEventBody(t, "info", "ReconciliationSucceeded", env.now, revision))
	env.do(fluxReq2)
	fluxSignatures = append(fluxSignatures, fluxReq2.Header.Get(integrations.HeaderFluxSignature))

	// The secret-token request itself: a signing token and a secret token
	// cannot be configured together, so this runs against its own env, and
	// its log buffer is checked alongside the one above.
	secretEnv := newIntegrationEnv(t, loadIntegrationConfig(t, map[string]string{
		integrations.EnvGitLabSecretToken: env.sec.secretToken,
	}))
	secretEnv.do(gitlabTokenRequest(t, gitlabDeploymentBody(t, 1103, "running", time.Now(), "review/foo"), secretEnv.sec.secretToken))

	logs := env.logs.String() + secretEnv.logs.String()
	require.NotContains(t, logs, env.sec.signingToken)
	require.NotContains(t, logs, env.sec.signingKeyB64)
	require.NotContains(t, logs, env.sec.fluxKey)
	require.NotContains(t, logs, env.sec.secretToken)
	for _, sig := range gitlabSignatures {
		require.NotEmpty(t, sig)
		require.NotContains(t, logs, sig)
	}
	for _, sig := range fluxSignatures {
		_, hexPart, ok := strings.Cut(sig, "=")
		require.True(t, ok)
		require.NotEmpty(t, hexPart)
		require.NotContains(t, logs, hexPart)
	}

	require.Contains(t, logs, `"source":"gitlab"`)
	require.Contains(t, logs, `"result":"recorded"`)
}

func TestIntegrationMetricRegistered(t *testing.T) {
	env := newIntegrationEnv(t, fullIntegrationConfig(t))
	body := gitlabDeploymentBody(t, 1200, "running", time.Now(), "production")
	env.do(env.gitlabRequest(t, body, env.now))

	mfs, err := prometheus.DefaultGatherer.Gather()
	require.NoError(t, err)
	var found bool
	for _, mf := range mfs {
		if mf.GetName() != "tracker_integration_webhooks_total" {
			continue
		}
		found = true
		for _, m := range mf.GetMetric() {
			var names []string
			for _, lp := range m.GetLabel() {
				names = append(names, lp.GetName())
			}
			require.ElementsMatch(t, []string{"result", "source"}, names)
		}
	}
	require.True(t, found)
}

// totalIntegrationWebhooks sums tracker_integration_webhooks_total across
// every source/result series.
func totalIntegrationWebhooks(t *testing.T) float64 {
	t.Helper()
	mfs, err := prometheus.DefaultGatherer.Gather()
	require.NoError(t, err)
	var total float64
	for _, mf := range mfs {
		if mf.GetName() != "tracker_integration_webhooks_total" {
			continue
		}
		for _, m := range mf.GetMetric() {
			total += m.GetCounter().GetValue()
		}
	}
	return total
}
