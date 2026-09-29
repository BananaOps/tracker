package server

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/sso"
	"github.com/bananaops/tracker/internal/auth/sso/ssotest"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/oauth2"
)

func TestOIDCRoutesAbsentWhenDisabled(t *testing.T) {
	h := newOIDCHarness(t, func(c *auth.Config) { c.OIDC = auth.OIDCConfig{} })

	assert.Equal(t, http.StatusNotFound, h.get(auth.OIDCLoginPath, nil).Code)
	assert.Equal(t, http.StatusNotFound, h.get(auth.OIDCCallbackPath, nil).Code)
	rec := h.get("/api/v1alpha1/auth/config", nil)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.NotContains(t, rec.Body.String(), `"oidcEnabled":true`)
}

func TestOIDCLoginRedirectsToProvider(t *testing.T) {
	h := newOIDCHarness(t, nil)
	rec := h.startRaw("/locks")

	require.Equal(t, http.StatusFound, rec.Code)
	assert.Contains(t, rec.Header().Get("Cache-Control"), "no-store")
	loc, err := url.Parse(rec.Header().Get("Location"))
	require.NoError(t, err)
	assert.Equal(t, h.idp.URL+"/authorize", loc.Scheme+"://"+loc.Host+loc.Path)
	assert.Equal(t, "S256", loc.Query().Get("code_challenge_method"))

	c := cookieNamed(rec, sso.TransactionCookieName)
	require.NotNil(t, c)
	assert.True(t, c.HttpOnly)
	assert.Equal(t, http.SameSiteLaxMode, c.SameSite)
	assert.Equal(t, auth.OIDCCallbackPath, c.Path)
	assert.Equal(t, 600, c.MaxAge)
	assert.False(t, c.Secure)
	tx, err := h.codec.Decode(c.Value)
	require.NoError(t, err)
	assert.Equal(t, "/locks", tx.Redirect)
	assert.Equal(t, tx.State, loc.Query().Get("state"))
	assert.Equal(t, tx.Nonce, loc.Query().Get("nonce"))
}

func TestOIDCLoginSecureCookie(t *testing.T) {
	h := newOIDCHarness(t, func(c *auth.Config) { c.CookieSecure = true })
	_, tx := h.start(t, "")
	assert.True(t, tx.Secure)
}

func TestOIDCLoginEndToEnd(t *testing.T) {
	h := newOIDCHarness(t, nil)
	before := oidcLoginCount("success")

	rec := h.login(t, "/locks")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.Equal(t, "/locks", rec.Header().Get("Location"))
	assert.Equal(t, "no-referrer", rec.Header().Get("Referrer-Policy"))
	cleared := cookieNamed(rec, sso.TransactionCookieName)
	require.NotNil(t, cleared)
	assert.Equal(t, -1, cleared.MaxAge)
	session := cookieNamed(rec, auth.SessionCookieName)
	require.NotNil(t, session)
	_, err := h.f.sessions.Verify(session.Value)
	require.NoError(t, err)

	me := h.me(t, session)
	assert.True(t, me.Authenticated)
	assert.Equal(t, "alice", me.Username)
	assert.Equal(t, "oidc", me.Source)
	assert.False(t, me.MustChangePassword)

	u, err := h.f.users.GetByUsername(context.Background(), "alice")
	require.NoError(t, err)
	assert.Equal(t, store.UserSourceOIDC, u.Source)
	assert.Equal(t, h.idp.URL, u.OIDCIssuer)
	assert.Equal(t, "user-1", u.OIDCSubject)
	assert.NotNil(t, u.LastLoginAt)
	assert.Equal(t, before+1, oidcLoginCount("success"))
}

func TestOIDCSecondLoginSameUser(t *testing.T) {
	h := newOIDCHarness(t, nil)
	require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
	require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)

	users, err := h.f.users.List(context.Background())
	require.NoError(t, err)
	n := 0
	for _, u := range users {
		if u.Username == "alice" {
			n++
		}
	}
	assert.Equal(t, 1, n)
}

func TestOIDCTeamMappingEndToEnd(t *testing.T) {
	h := newOIDCHarness(t, nil)
	team := &store.Team{Name: "Platform", Permissions: []string{"event:read"}, OIDCGroups: []string{"platform-eng"}}
	require.NoError(t, h.f.teams.Create(context.Background(), team))

	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{
		"preferred_username": "alice", "groups": []string{"platform-eng"},
	}})
	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	me := h.me(t, cookieNamed(rec, auth.SessionCookieName))
	require.Len(t, me.Teams, 1)
	assert.Equal(t, "Platform", me.Teams[0].Name)

	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{
		"preferred_username": "alice", "groups": []string{},
	}})
	rec = h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.Empty(t, h.me(t, cookieNamed(rec, auth.SessionCookieName)).Teams)
}

func TestOIDCGroupsClaimMissingFailsClosed(t *testing.T) {
	ctx := context.Background()
	h := newOIDCHarness(t, nil)

	// Existing OIDC user, provisioned while no team was mapped.
	require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
	before, err := h.f.users.GetByUsername(ctx, "alice")
	require.NoError(t, err)

	platform := h.createTeam(t, "Platform", "platform-eng")
	require.NoError(t, h.f.users.SyncTeams(ctx, before.ID, []primitive.ObjectID{platform.ID}, nil))
	before, err = h.f.users.GetByUsername(ctx, "alice")
	require.NoError(t, err)
	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{
		"preferred_username": "alice", "email": "changed@example.com", "name": "Changed Name",
	}})
	failures := oidcLoginCount("failure")

	rec := h.login(t, "")
	assert.Equal(t, http.StatusSeeOther, rec.Code)
	assert.Equal(t, "/login?error=oidc_failed", rec.Header().Get("Location"))
	assert.Nil(t, cookieNamed(rec, auth.SessionCookieName))
	assert.Equal(t, failures+1, oidcLoginCount("failure"))
	assert.Contains(t, h.logs.String(), `"level":"ERROR"`)
	assert.Contains(t, h.logs.String(), `"claim":"groups"`)
	assert.Contains(t, h.logs.String(), `"username":"alice"`)

	after, err := h.f.users.GetByUsername(ctx, "alice")
	require.NoError(t, err)
	assert.Equal(t, before.Email, after.Email)
	assert.Equal(t, before.DisplayName, after.DisplayName)
	assert.Equal(t, before.LastLoginAt.UTC(), after.LastLoginAt.UTC())
	assert.Equal(t, before.Teams, after.Teams)
}

func TestOIDCDiscoveryErrorBodyNeverLogged(t *testing.T) {
	broken := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("<html>LEAKED-DISCOVERY-BODY</html>"))
	}))
	t.Cleanup(broken.Close)
	h := newOIDCHarness(t, func(c *auth.Config) { c.OIDC.Issuer = broken.URL })

	rec := h.startRaw("")
	assert.Equal(t, "/login?error=oidc_unavailable", rec.Header().Get("Location"))
	assert.Contains(t, h.logs.String(), "provider_unavailable")
	assert.NotContains(t, h.logs.String(), "LEAKED-DISCOVERY-BODY")
}

func TestOIDCVerificationErrorNeverLogsDetail(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	h.oidc.provider = stubProvider{err: fmt.Errorf("%w: failed to fetch keys: LEAKED-JWKS-BODY", sso.ErrIDToken)}

	rec := h.callback(t, cb, tx)
	assert.Equal(t, "/login?error=oidc_failed", rec.Header().Get("Location"))
	assert.Contains(t, h.logs.String(), "id_token_verification_failed")
	assert.NotContains(t, h.logs.String(), "LEAKED-JWKS-BODY")
}

func TestOIDCUserCannotChangePassword(t *testing.T) {
	h := newOIDCHarness(t, nil)
	session := cookieNamed(h.login(t, ""), auth.SessionCookieName)
	require.NotNil(t, session)

	rec := post(h.handler, "/api/v1alpha1/auth/password", `{"currentPassword":"x","newPassword":"another-long-password-1"}`, session)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "managed by the identity provider")
}

func TestLocalLoginStillWorksWhenProviderDown(t *testing.T) {
	h := newOIDCHarness(t, nil)
	h.idp.Close()
	before := oidcLoginCount("failure")

	rec := h.startRaw("")
	assert.Equal(t, http.StatusSeeOther, rec.Code)
	assert.Equal(t, "/login?error=oidc_unavailable", rec.Header().Get("Location"))
	assert.Nil(t, cookieNamed(rec, sso.TransactionCookieName))

	rec = post(h.handler, "/api/v1alpha1/auth/login", `{"username":"admin","password":"admin-password-123"}`, nil)
	assert.Equal(t, http.StatusNoContent, rec.Code)
	assert.Contains(t, h.get("/api/v1alpha1/auth/config", nil).Body.String(), `"oidcEnabled":true`)
	assert.Equal(t, before+1, oidcLoginCount("failure"))
}

func TestLoginPageRedirectIsSanitized(t *testing.T) {
	h := newOIDCHarness(t, nil)
	_, c := h.start(t, "//evil.example")
	tx, err := h.codec.Decode(c.Value)
	require.NoError(t, err)
	assert.Equal(t, "/", tx.Redirect)
}

func TestOIDCCallbackRedirectReSanitized(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, orig := h.start(t, "")
	tx, err := h.codec.Decode(orig.Value)
	require.NoError(t, err)
	// A hostile redirect that would somehow be sealed in the cookie is
	// neutralised again on the way out.
	tx.Redirect = "//evil.example"
	v, err := h.codec.Encode(tx)
	require.NoError(t, err)

	rec := h.callback(t, h.idp.Authorize(t, authURL.String()), sso.TransactionCookie(v, false))
	require.Equal(t, http.StatusSeeOther, rec.Code)
	assert.Equal(t, "/", rec.Header().Get("Location"))
}

func TestOIDCCallbackRefusals(t *testing.T) {
	t.Run("missing transaction cookie", func(t *testing.T) {
		h := newOIDCHarness(t, nil)
		authURL, _ := h.start(t, "")
		rec := h.callback(t, h.idp.Authorize(t, authURL.String()), nil)
		assert.Equal(t, "/login?error=oidc_state", rec.Header().Get("Location"))
		assert.Equal(t, 0, h.idp.TokenRequests())
	})
	t.Run("state mismatch", func(t *testing.T) {
		h := newOIDCHarness(t, nil)
		authURL, tx := h.start(t, "")
		cb := h.idp.Authorize(t, authURL.String())
		q := cb.Query()
		q.Set("state", "forged")
		cb.RawQuery = q.Encode()
		before := oidcLoginCount("failure")
		rec := h.callback(t, cb, tx)
		assert.Equal(t, "/login?error=oidc_state", rec.Header().Get("Location"))
		assert.Equal(t, 0, h.idp.TokenRequests())
		assert.Equal(t, before+1, oidcLoginCount("failure"))
		assert.Nil(t, cookieNamed(rec, auth.SessionCookieName))
	})
	t.Run("idp error", func(t *testing.T) {
		h := newOIDCHarness(t, nil)
		h.idp.SetAuthorizeError("access_denied", "nope")
		authURL, tx := h.start(t, "")
		rec := h.callback(t, h.idp.Authorize(t, authURL.String()), tx)
		assert.Equal(t, "/login?error=oidc_denied", rec.Header().Get("Location"))
		assert.Contains(t, h.logs.String(), "access_denied")
	})
	t.Run("provisioning disabled", func(t *testing.T) {
		h := newOIDCHarness(t, func(c *auth.Config) { c.OIDC.UserProvisioning = false })
		rec := h.login(t, "")
		assert.Equal(t, http.StatusForbidden, rec.Code)
		assert.Contains(t, rec.Body.String(), "not registered in Tracker")
		assert.Equal(t, "default-src 'none'", rec.Header().Get("Content-Security-Policy"))
		assert.Nil(t, cookieNamed(rec, auth.SessionCookieName))
	})
	t.Run("disabled user", func(t *testing.T) {
		h := newOIDCHarness(t, nil)
		require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
		u, err := h.f.users.GetByUsername(context.Background(), "alice")
		require.NoError(t, err)
		u.Disabled = true
		require.NoError(t, h.f.users.Update(context.Background(), u))
		rec := h.login(t, "")
		assert.Equal(t, http.StatusForbidden, rec.Code)
		assert.Contains(t, rec.Body.String(), "account is disabled")
	})
}

// stubProvider fails the exchange with a canned error.
type stubProvider struct{ err error }

func (stubProvider) AuthCodeURL(context.Context, string, string, string) (string, error) {
	return "http://idp.test/authorize", nil
}

func (s stubProvider) Exchange(context.Context, string, string, string) (sso.Claims, error) {
	return sso.Claims{}, s.err
}

func TestOIDCExchangeErrorNeverLogsRawBody(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	h.oidc.provider = stubProvider{err: fmt.Errorf("%w: %w", sso.ErrExchange, &oauth2.RetrieveError{
		Response: &http.Response{StatusCode: http.StatusBadGateway},
		Body:     []byte("<html><body>LEAKED-RAW-BODY access_token=abc</body></html>"),
	})}

	rec := h.callback(t, cb, tx)
	assert.Equal(t, "/login?error=oidc_failed", rec.Header().Get("Location"))
	assert.NotContains(t, h.logs.String(), "LEAKED-RAW-BODY")
	assert.NotContains(t, h.logs.String(), "access_token")
	assert.Contains(t, h.logs.String(), `"status":502`)
	assert.Contains(t, h.logs.String(), "exchange_failed")
}

func TestOIDCExchangeUnavailableRedirects(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	h.oidc.provider = stubProvider{err: fmt.Errorf("%w: boom", sso.ErrUnavailable)}
	rec := h.callback(t, cb, tx)
	assert.Equal(t, "/login?error=oidc_unavailable", rec.Header().Get("Location"))
}

func TestOIDCNoSecretsInLogs(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	rec := h.callback(t, cb, tx)
	require.Equal(t, http.StatusSeeOther, rec.Code)
	logs := h.logs.String()
	for _, secret := range []string{h.idp.ClientSecret, h.idp.LastIDToken(), cb.Query().Get("code"), cb.Query().Get("state"), tx.Value} {
		require.NotEmpty(t, secret)
		assert.False(t, strings.Contains(logs, secret), "log leaks a secret")
	}
}

// A provider that omits the groups claim for a user without groups must not
// lock that user out: only users holding a mapped membership are refused.
func TestOIDCGroupsClaimAbsentNewSubject(t *testing.T) {
	ctx := context.Background()
	h := newOIDCHarness(t, nil)
	h.createTeam(t, "Platform", "platform-eng")
	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{"preferred_username": "alice"}})

	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.NotNil(t, cookieNamed(rec, auth.SessionCookieName))
	u, err := h.f.users.GetByUsername(ctx, "alice")
	require.NoError(t, err)
	assert.Empty(t, u.Teams)
	assert.Contains(t, h.logs.String(), `"level":"WARN"`)
	assert.Contains(t, h.logs.String(), `"reason":"groups_claim_missing_accepted"`)
	assert.Contains(t, h.logs.String(), `"claim":"groups"`)
	assert.Contains(t, h.logs.String(), `"username":"alice"`)
}

func TestOIDCGroupsClaimAbsentUserWithoutMappedMembership(t *testing.T) {
	ctx := context.Background()
	h := newOIDCHarness(t, nil)
	require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
	manual := h.createTeam(t, "Manual")
	h.createTeam(t, "Platform", "platform-eng")
	u := h.userNamed(t, "alice")
	require.NoError(t, h.f.users.SyncTeams(ctx, u.ID, []primitive.ObjectID{manual.ID}, nil))
	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{"preferred_username": "alice"}})

	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.NotNil(t, cookieNamed(rec, auth.SessionCookieName))
	assert.Equal(t, []string{"Manual"}, teamNames(h.me(t, cookieNamed(rec, auth.SessionCookieName))))
	assert.Contains(t, h.logs.String(), `"reason":"groups_claim_missing_accepted"`)
}

// Without any mapped team an absent claim is normal: no warning.
func TestOIDCGroupsClaimAbsentNoMappedTeamNoWarning(t *testing.T) {
	h := newOIDCHarness(t, nil)
	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{"preferred_username": "alice"}})

	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.NotContains(t, h.logs.String(), "groups_claim_missing_accepted")
}
