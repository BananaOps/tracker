package server

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	"github.com/bananaops/tracker/internal/auth/sso"
	"github.com/bananaops/tracker/internal/auth/sso/ssotest"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// requireTransactionCleared checks the callback expired the transaction cookie.
func requireTransactionCleared(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	c := cookieNamed(rec, sso.TransactionCookieName)
	require.NotNil(t, c, "transaction cookie must be cleared")
	assert.Equal(t, -1, c.MaxAge)
	assert.Empty(t, c.Value)
}

// requireRefusedRedirect checks a failed callback: 303 to loc, no session, transaction cookie cleared.
func requireRefusedRedirect(t *testing.T, rec *httptest.ResponseRecorder, loc string) {
	t.Helper()
	assert.Equal(t, http.StatusSeeOther, rec.Code)
	assert.Equal(t, loc, rec.Header().Get("Location"))
	assert.Nil(t, cookieNamed(rec, auth.SessionCookieName))
	requireTransactionCleared(t, rec)
}

// requireRefusedPage checks a 403 HTML refusal: no session, CSP, transaction cookie cleared.
func requireRefusedPage(t *testing.T, rec *httptest.ResponseRecorder, contains string) {
	t.Helper()
	assert.Equal(t, http.StatusForbidden, rec.Code)
	assert.Contains(t, rec.Header().Get("Content-Type"), "text/html")
	assert.NotEmpty(t, rec.Header().Get("Content-Security-Policy"))
	assert.Contains(t, rec.Body.String(), contains)
	assert.Nil(t, cookieNamed(rec, auth.SessionCookieName))
	requireTransactionCleared(t, rec)
}

func (h *oidcHarness) userNamed(t *testing.T, name string) *store.User {
	t.Helper()
	u, err := h.f.users.GetByUsername(context.Background(), name)
	require.NoError(t, err)
	return u
}

func (h *oidcHarness) teamNamed(t *testing.T, name string) *store.Team {
	t.Helper()
	tm, err := h.f.teams.GetByName(context.Background(), name)
	require.NoError(t, err)
	return tm
}

func (h *oidcHarness) createTeam(t *testing.T, name string, groups ...string) *store.Team {
	t.Helper()
	tm := &store.Team{Name: name, Permissions: []string{"event:read"}, OIDCGroups: groups}
	require.NoError(t, h.f.teams.Create(context.Background(), tm))
	return tm
}

func (h *oidcHarness) setGroups(groups any) {
	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{
		"preferred_username": "alice", "groups": groups,
	}})
}

func (h *oidcHarness) inTeam(t *testing.T, username, team string) bool {
	t.Helper()
	tm := h.teamNamed(t, team)
	for _, id := range h.userNamed(t, username).Teams {
		if id == tm.ID {
			return true
		}
	}
	return false
}

func teamNames(m meBody) []string {
	names := make([]string, 0, len(m.Teams))
	for _, tm := range m.Teams {
		names = append(names, tm.Name)
	}
	return names
}

func TestOIDCCallbackCSRFStateMismatch(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	q := cb.Query()
	q.Set("state", "another-state-value")
	cb.RawQuery = q.Encode()
	failures := oidcLoginCount("failure")

	rec := h.callback(t, cb, tx)
	requireRefusedRedirect(t, rec, "/login?error=oidc_state")
	assert.Equal(t, 0, h.idp.TokenRequests())
	assert.Equal(t, failures+1, oidcLoginCount("failure"))
}

// A login CSRF: the attacker's code and state are delivered to the victim's
// browser, which holds its own transaction cookie.
func TestOIDCCallbackForeignLogin(t *testing.T) {
	h := newOIDCHarness(t, nil)
	_, victim := h.start(t, "")
	attackerAuthURL, _ := h.start(t, "")
	attackerCB := h.idp.Authorize(t, attackerAuthURL.String())

	rec := h.callback(t, attackerCB, victim)
	requireRefusedRedirect(t, rec, "/login?error=oidc_state")
	assert.Equal(t, 0, h.idp.TokenRequests())
	_, err := h.f.users.GetByUsername(context.Background(), "alice")
	assert.ErrorIs(t, err, store.ErrNotFound)
}

func TestOIDCCallbackWithoutTransaction(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, _ := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	failures, successes := oidcLoginCount("failure"), oidcLoginCount("success")

	rec := h.callback(t, cb, nil)
	requireRefusedRedirect(t, rec, "/login?error=oidc_state")
	assert.Equal(t, 0, h.idp.TokenRequests())
	assert.Equal(t, failures, oidcLoginCount("failure"))
	assert.Equal(t, successes, oidcLoginCount("success"))
}

func TestOIDCCallbackReplayWithoutCookie(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	require.Equal(t, http.StatusSeeOther, h.callback(t, cb, tx).Code)

	rec := h.callback(t, cb, nil)
	requireRefusedRedirect(t, rec, "/login?error=oidc_state")
	assert.Equal(t, 1, h.idp.TokenRequests())
}

func TestOIDCCallbackReplayWithCapturedCookie(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	first := h.callback(t, cb, tx)
	require.Equal(t, http.StatusSeeOther, first.Code)
	require.NotNil(t, cookieNamed(first, auth.SessionCookieName))

	// The browser dropped the cleared cookie, an attacker kept a copy.
	rec := h.callback(t, cb, tx)
	requireRefusedRedirect(t, rec, "/login?error=oidc_failed")
	assert.Equal(t, 2, h.idp.TokenRequests())
}

func TestOIDCCallbackIDTokenRejections(t *testing.T) {
	now := time.Now()
	cases := []struct {
		name  string
		setup func(*ssotest.IdP)
	}{
		{"nonce mismatch", func(i *ssotest.IdP) {
			i.SetTokenMutator(func(c map[string]any) { c["nonce"] = "forged" })
		}},
		{"wrong audience", func(i *ssotest.IdP) {
			i.SetTokenMutator(func(c map[string]any) { c["aud"] = "another-client" })
		}},
		{"expired id_token", func(i *ssotest.IdP) {
			i.SetTokenMutator(func(c map[string]any) {
				c["exp"] = now.Add(-time.Hour).Unix()
				c["iat"] = now.Add(-2 * time.Hour).Unix()
			})
		}},
		{"wrong issuer", func(i *ssotest.IdP) {
			i.SetTokenMutator(func(c map[string]any) { c["iss"] = "https://evil.example" })
		}},
		{"alg none", func(i *ssotest.IdP) { i.SetSigning(ssotest.SignNone) }},
		{"unknown key", func(i *ssotest.IdP) { i.SetSigning(ssotest.SignForeignKey) }},
		{"algorithm confusion HS256 with the public key", func(i *ssotest.IdP) { i.SetSigning(ssotest.SignHS256PublicKey) }},
		{"missing sub", func(i *ssotest.IdP) {
			i.SetTokenMutator(func(c map[string]any) { delete(c, "sub") })
		}},
		{"empty sub", func(i *ssotest.IdP) {
			i.SetTokenMutator(func(c map[string]any) { c["sub"] = "" })
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			h := newOIDCHarness(t, nil)
			tc.setup(h.idp)
			failures := oidcLoginCount("failure")

			rec := h.login(t, "")
			requireRefusedRedirect(t, rec, "/login?error=oidc_failed")
			assert.Equal(t, failures+1, oidcLoginCount("failure"))
			assert.Equal(t, 1, h.idp.TokenRequests())
			users, err := h.f.users.List(context.Background())
			require.NoError(t, err)
			assert.Len(t, users, 1, "only the bootstrap admin exists, no user is created")
		})
	}
}

func TestOIDCCallbackTamperedCookie(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	v := []byte(tx.Value)
	mid := len(v) / 2
	if v[mid] == 'A' {
		v[mid] = 'B'
	} else {
		v[mid] = 'A'
	}

	rec := h.callback(t, cb, &http.Cookie{Name: tx.Name, Value: string(v)})
	requireRefusedRedirect(t, rec, "/login?error=oidc_state")
	assert.Equal(t, 0, h.idp.TokenRequests())
}

func TestOIDCCallbackCookieFromOtherSecret(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	plain, err := h.codec.Decode(tx.Value)
	require.NoError(t, err)
	other, err := sso.NewTransactionCodec(bytes.Repeat([]byte{8}, 32))
	require.NoError(t, err)
	forged, err := other.Encode(plain)
	require.NoError(t, err)

	rec := h.callback(t, cb, sso.TransactionCookie(forged, false))
	requireRefusedRedirect(t, rec, "/login?error=oidc_state")
	assert.Equal(t, 0, h.idp.TokenRequests())
}

func TestOIDCCallbackExpiredTransaction(t *testing.T) {
	h := newOIDCHarness(t, nil)
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	h.codec.Now = func() time.Time { return time.Now().Add(11 * time.Minute) }

	rec := h.callback(t, cb, tx)
	requireRefusedRedirect(t, rec, "/login?error=oidc_state")
	assert.Equal(t, 0, h.idp.TokenRequests())
	assert.Contains(t, h.logs.String(), "transaction_expired")
}

func TestOIDCCallbackIdPError(t *testing.T) {
	h := newOIDCHarness(t, nil)
	h.idp.SetAuthorizeError("access_denied", "<script>alert(1)</script>")
	authURL, tx := h.start(t, "")
	failures := oidcLoginCount("failure")

	rec := h.callback(t, h.idp.Authorize(t, authURL.String()), tx)
	requireRefusedRedirect(t, rec, "/login?error=oidc_denied")
	assert.NotContains(t, rec.Header().Get("Location"), "script")
	assert.NotContains(t, rec.Body.String(), "script")
	assert.Equal(t, failures+1, oidcLoginCount("failure"))
	assert.Equal(t, 0, h.idp.TokenRequests())
}

// Every failure path of the callback expires the transaction cookie and issues no session.
func TestOIDCTransactionCookieClearedOnEveryFailure(t *testing.T) {
	type outcome struct {
		rec *httptest.ResponseRecorder
	}
	cases := []struct {
		name string
		run  func(t *testing.T) outcome
	}{
		{"idp error", func(t *testing.T) outcome {
			h := newOIDCHarness(t, nil)
			h.idp.SetAuthorizeError("access_denied", "no")
			authURL, tx := h.start(t, "")
			return outcome{h.callback(t, h.idp.Authorize(t, authURL.String()), tx)}
		}},
		{"bad state", func(t *testing.T) outcome {
			h := newOIDCHarness(t, nil)
			authURL, tx := h.start(t, "")
			cb := h.idp.Authorize(t, authURL.String())
			q := cb.Query()
			q.Set("state", "x")
			cb.RawQuery = q.Encode()
			return outcome{h.callback(t, cb, tx)}
		}},
		{"expired transaction", func(t *testing.T) outcome {
			h := newOIDCHarness(t, nil)
			authURL, tx := h.start(t, "")
			cb := h.idp.Authorize(t, authURL.String())
			h.codec.Now = func() time.Time { return time.Now().Add(time.Hour) }
			return outcome{h.callback(t, cb, tx)}
		}},
		{"exchange failure", func(t *testing.T) outcome {
			h := newOIDCHarness(t, nil)
			authURL, tx := h.start(t, "")
			cb := h.idp.Authorize(t, authURL.String())
			h.oidc.provider = stubProvider{err: sso.ErrExchange}
			return outcome{h.callback(t, cb, tx)}
		}},
		{"id_token failure", func(t *testing.T) outcome {
			h := newOIDCHarness(t, nil)
			h.idp.SetSigning(ssotest.SignNone)
			return outcome{h.login(t, "")}
		}},
		{"provisioning disabled", func(t *testing.T) outcome {
			h := newOIDCHarness(t, func(c *auth.Config) { c.OIDC.UserProvisioning = false })
			return outcome{h.login(t, "")}
		}},
		{"disabled user", func(t *testing.T) outcome {
			h := newOIDCHarness(t, nil)
			require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
			u := h.userNamed(t, "alice")
			u.Disabled = true
			require.NoError(t, h.f.users.Update(context.Background(), u))
			return outcome{h.login(t, "")}
		}},
		{"missing groups claim", func(t *testing.T) outcome {
			h := newOIDCHarness(t, nil)
			h.createTeam(t, "Platform", "platform-eng")
			h.setGroups([]string{"platform-eng"})
			require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
			h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{"preferred_username": "alice"}})
			return outcome{h.login(t, "")}
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := tc.run(t).rec
			assert.Nil(t, cookieNamed(rec, auth.SessionCookieName))
			requireTransactionCleared(t, rec)
		})
	}
}

func TestOIDCOpenRedirect(t *testing.T) {
	cases := []struct{ redirect, want string }{
		{"//evil.example", "/"},
		{"/\\evil.example", "/"},
		{"https://evil.example", "/"},
		{"/\r\nX:1", "/"},
		{"/locks?tab=1", "/locks?tab=1"},
	}
	for _, tc := range cases {
		t.Run(tc.redirect, func(t *testing.T) {
			h := newOIDCHarness(t, nil)
			path := auth.OIDCLoginPath + "?" + url.Values{"redirect": {tc.redirect}}.Encode()
			rec := h.get(path, nil)
			require.Equal(t, http.StatusFound, rec.Code)
			authURL, err := url.Parse(rec.Header().Get("Location"))
			require.NoError(t, err)
			tx := cookieNamed(rec, sso.TransactionCookieName)
			require.NotNil(t, tx)

			cbRec := h.callback(t, h.idp.Authorize(t, authURL.String()), tx)
			require.Equal(t, http.StatusSeeOther, cbRec.Code)
			assert.Equal(t, tc.want, cbRec.Header().Get("Location"))
			assert.Empty(t, cbRec.Header().Get("X"))
		})
	}
}

func TestOIDCUsernameCollision(t *testing.T) {
	h := newOIDCHarness(t, nil)
	local := &store.User{Username: "alice", Source: store.UserSourceLocal, PasswordHash: "local-hash"}
	require.NoError(t, h.f.users.Create(context.Background(), local))

	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	me := h.me(t, cookieNamed(rec, auth.SessionCookieName))
	assert.Equal(t, "alice-2", me.Username)
	assert.Equal(t, "oidc", me.Source)

	after := h.userNamed(t, "alice")
	assert.Equal(t, store.UserSourceLocal, after.Source)
	assert.Equal(t, "local-hash", after.PasswordHash)
	assert.Empty(t, after.OIDCSubject)
	assert.Empty(t, after.OIDCIssuer)
}

func TestOIDCCannotTakeOverAdmin(t *testing.T) {
	h := newOIDCHarness(t, nil)
	before := h.userNamed(t, "admin")
	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{
		"preferred_username": "admin", "groups": []string{},
	}})

	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	me := h.me(t, cookieNamed(rec, auth.SessionCookieName))
	assert.Equal(t, "admin-2", me.Username)
	assert.False(t, me.IsAdmin)

	after := h.userNamed(t, "admin")
	assert.Equal(t, before.ID, after.ID)
	assert.Equal(t, before.PasswordHash, after.PasswordHash)
	assert.Equal(t, store.UserSourceLocal, after.Source)
	assert.Empty(t, after.OIDCSubject)
	assert.Equal(t, before.Teams, after.Teams)
}

func TestOIDCDisabledUser(t *testing.T) {
	h := newOIDCHarness(t, nil)
	require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
	u := h.userNamed(t, "alice")
	u.Disabled = true
	require.NoError(t, h.f.users.Update(context.Background(), u))
	failures := oidcLoginCount("failure")

	rec := h.login(t, "")
	requireRefusedPage(t, rec, "disabled")
	assert.Equal(t, failures+1, oidcLoginCount("failure"))
}

func TestOIDCProvisioningDisabled(t *testing.T) {
	h := newOIDCHarness(t, func(c *auth.Config) { c.OIDC.UserProvisioning = false })

	rec := h.login(t, "")
	requireRefusedPage(t, rec, "not registered")
	_, err := h.f.users.GetByUsername(context.Background(), "alice")
	assert.ErrorIs(t, err, store.ErrNotFound)

	require.NoError(t, h.f.users.Create(context.Background(), &store.User{
		Username: "alice", Source: store.UserSourceOIDC, OIDCIssuer: h.idp.URL, OIDCSubject: "user-1",
	}))
	rec = h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.NotNil(t, cookieNamed(rec, auth.SessionCookieName))
}

func TestOIDCNoUsableUsername(t *testing.T) {
	h := newOIDCHarness(t, nil)
	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{"groups": []string{}}})

	rec := h.login(t, "")
	requireRefusedRedirect(t, rec, "/login?error=oidc_failed")
}

func TestOIDCGroupsSingleString(t *testing.T) {
	h := newOIDCHarness(t, nil)
	h.createTeam(t, "Platform", "platform-eng")
	h.setGroups("platform-eng")

	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.Equal(t, []string{"Platform"}, teamNames(h.me(t, cookieNamed(rec, auth.SessionCookieName))))
}

func TestOIDCGroupsCaseSensitive(t *testing.T) {
	h := newOIDCHarness(t, nil)
	h.createTeam(t, "Platform", "platform-eng")
	h.setGroups([]string{"Platform-Eng"})

	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.Empty(t, teamNames(h.me(t, cookieNamed(rec, auth.SessionCookieName))))
	assert.False(t, h.inTeam(t, "alice", "Platform"))
}

// A groups claim that disappears never strips the mapped teams of a user who
// holds one: the login is refused before any write (fail closed). A user
// without mapped membership is not affected, see TestOIDCGroupsClaimAbsent*.
func TestOIDCGroupsAbsentKeepsMappedTeams(t *testing.T) {
	h := newOIDCHarness(t, nil)
	h.createTeam(t, "Platform", "platform-eng")
	h.setGroups([]string{"platform-eng"})
	require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
	require.True(t, h.inTeam(t, "alice", "Platform"))

	h.idp.SetUser(ssotest.User{Subject: "user-1", Claims: map[string]any{"preferred_username": "alice"}})
	rec := h.login(t, "")
	requireRefusedRedirect(t, rec, "/login?error=oidc_failed")
	assert.Nil(t, cookieNamed(rec, auth.SessionCookieName))
	assert.True(t, h.inTeam(t, "alice", "Platform"), "membership untouched")
	assert.Contains(t, h.logs.String(), "groups_claim_missing")
}

func TestOIDCTeamSyncDisabled(t *testing.T) {
	h := newOIDCHarness(t, func(c *auth.Config) { c.OIDC.TeamSync = false })
	h.createTeam(t, "Platform", "platform-eng")
	h.setGroups([]string{"platform-eng"})

	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.Empty(t, teamNames(h.me(t, cookieNamed(rec, auth.SessionCookieName))))
}

func TestOIDCManualTeamKept(t *testing.T) {
	h := newOIDCHarness(t, nil)
	require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
	manual := h.createTeam(t, "Manual")
	h.createTeam(t, "Ops", "ops")
	u := h.userNamed(t, "alice")
	u.Teams = append(u.Teams, manual.ID)
	require.NoError(t, h.f.users.Update(context.Background(), u))
	h.setGroups([]string{"ops"})

	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.ElementsMatch(t, []string{"Manual", "Ops"}, teamNames(h.me(t, cookieNamed(rec, auth.SessionCookieName))))
}

func (h *oidcHarness) mapAdministrators(t *testing.T, group string) {
	t.Helper()
	admins := h.teamNamed(t, store.AdministratorsTeamName)
	admins.OIDCGroups = []string{group}
	require.NoError(t, h.f.teams.Update(context.Background(), admins))
}

func TestOIDCAdministratorsMapping(t *testing.T) {
	h := newOIDCHarness(t, nil)
	h.mapAdministrators(t, "tracker-admins")

	h.setGroups([]string{"tracker-admins"})
	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.True(t, h.me(t, cookieNamed(rec, auth.SessionCookieName)).IsAdmin)

	h.setGroups([]string{})
	rec = h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.False(t, h.me(t, cookieNamed(rec, auth.SessionCookieName)).IsAdmin)

	assert.True(t, h.inTeam(t, "admin", store.AdministratorsTeamName), "the local admin keeps Administrators")
}

func TestOIDCLastAdminKept(t *testing.T) {
	h := newOIDCHarness(t, nil)
	h.mapAdministrators(t, "tracker-admins")
	h.setGroups([]string{"tracker-admins"})
	require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)

	admin := h.userNamed(t, "admin")
	admin.Disabled = true
	require.NoError(t, h.f.users.Update(context.Background(), admin))

	h.setGroups([]string{})
	rec := h.login(t, "")
	require.Equal(t, http.StatusSeeOther, rec.Code, rec.Body.String())
	assert.True(t, h.me(t, cookieNamed(rec, auth.SessionCookieName)).IsAdmin)
	assert.Contains(t, h.logs.String(), "last enabled administrator")
}

func TestOIDCLogsCarryNoSecrets(t *testing.T) {
	h := newOIDCHarness(t, nil)
	secrets := []string{h.idp.ClientSecret}
	collect := func(cb *url.URL, tx *http.Cookie) {
		plain, err := h.codec.Decode(tx.Value)
		require.NoError(t, err)
		secrets = append(secrets, cb.Query().Get("code"), cb.Query().Get("state"), tx.Value,
			plain.Verifier, plain.State, plain.Nonce, h.idp.LastIDToken())
	}

	// Successful login.
	authURL, tx := h.start(t, "")
	cb := h.idp.Authorize(t, authURL.String())
	require.Equal(t, http.StatusSeeOther, h.callback(t, cb, tx).Code)
	collect(cb, tx)

	// Forged nonce.
	h.idp.SetTokenMutator(func(c map[string]any) { c["nonce"] = "forged-nonce-value" })
	authURL, tx = h.start(t, "")
	cb = h.idp.Authorize(t, authURL.String())
	require.Equal(t, "/login?error=oidc_failed", h.callback(t, cb, tx).Header().Get("Location"))
	collect(cb, tx)
	h.idp.SetTokenMutator(nil)

	// Replay of the forged flow: the code is already consumed.
	require.Equal(t, "/login?error=oidc_failed", h.callback(t, cb, tx).Header().Get("Location"))

	logs := h.logs.String()
	require.NotEmpty(t, logs)
	for _, s := range secrets {
		require.NotEmpty(t, s)
		assert.False(t, strings.Contains(logs, s), "log leaks a secret")
	}
}

func TestOIDCMetrics(t *testing.T) {
	h := newOIDCHarness(t, nil)
	success, failure := oidcLoginCount("success"), oidcLoginCount("failure")
	localSuccess := oidcLocalCount(authz.LoginSuccess)
	localFailure := oidcLocalCount(authz.LoginFailure)

	require.Equal(t, http.StatusSeeOther, h.login(t, "").Code)
	h.idp.SetTokenMutator(func(c map[string]any) { c["nonce"] = "forged" })
	assert.Equal(t, "/login?error=oidc_failed", h.login(t, "").Header().Get("Location"))

	assert.Equal(t, success+1, oidcLoginCount("success"))
	assert.Equal(t, failure+1, oidcLoginCount("failure"))
	assert.Equal(t, localSuccess, oidcLocalCount(authz.LoginSuccess))
	assert.Equal(t, localFailure, oidcLocalCount(authz.LoginFailure))
}

// oidcLocalCount reads tracker_auth_logins_total{method="local"} for one result.
func oidcLocalCount(result string) float64 {
	return testutil.ToFloat64(authz.AuthLogins.WithLabelValues(authz.LoginMethodLocal, result))
}
