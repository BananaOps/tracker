package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// loginCount reads tracker_auth_logins_total for one result label.
func loginCount(result string) float64 {
	return testutil.ToFloat64(authz.AuthLogins.WithLabelValues("local", result))
}

func newAuthHTTPServer(t *testing.T, f *authFixture) http.Handler {
	t.Helper()
	mux := runtime.NewServeMux()
	NewAuthHTTP(f.users, f.sessions, f.cfg).Register(mux)
	return auth.HTTPMiddleware(f.resolver, f.cfg)(mux)
}

func post(h http.Handler, path, body string, cookie *http.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if cookie != nil {
		req.AddCookie(cookie)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func sessionCookie(t *testing.T, rec *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	for _, c := range rec.Result().Cookies() {
		if c.Name == auth.SessionCookieName {
			return c
		}
	}
	t.Fatal("no session cookie in response")
	return nil
}

func TestLoginSuccessSetsCookie(t *testing.T) {
	f := newAuthFixture(t)
	h := newAuthHTTPServer(t, f)
	before := loginCount("success")

	rec := post(h, "/api/v1alpha1/auth/login", `{"username":"Admin","password":"admin-password-123"}`, nil)
	require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())
	c := sessionCookie(t, rec)
	assert.True(t, c.HttpOnly)
	assert.Equal(t, http.SameSiteLaxMode, c.SameSite)
	assert.False(t, c.Secure, "no https public url in this fixture")

	sess, err := f.sessions.Verify(c.Value)
	require.NoError(t, err)
	assert.Equal(t, f.admin.ID.Hex(), sess.UserID)

	again, _ := f.users.GetByID(context.Background(), f.admin.ID)
	assert.NotNil(t, again.LastLoginAt)
	assert.Equal(t, before+1, loginCount("success"))
}

func TestLoginFailures(t *testing.T) {
	f := newAuthFixture(t)
	h := newAuthHTTPServer(t, f)
	before := loginCount("failure")

	rec := post(h, "/api/v1alpha1/auth/login", `{"username":"admin","password":"wrong-password-1"}`, nil)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assert.Empty(t, rec.Result().Cookies())

	rec = post(h, "/api/v1alpha1/auth/login", `{"username":"ghost","password":"wrong-password-1"}`, nil)
	assert.Equal(t, http.StatusUnauthorized, rec.Code, "unknown user gets the same answer")

	rec = post(h, "/api/v1alpha1/auth/login", `{"username":"admin"}`, nil)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	rec = post(h, "/api/v1alpha1/auth/login", `not json`, nil)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	f.admin.Disabled = true
	require.NoError(t, f.users.Update(context.Background(), f.admin))
	rec = post(h, "/api/v1alpha1/auth/login", `{"username":"admin","password":"admin-password-123"}`, nil)
	assert.Equal(t, http.StatusUnauthorized, rec.Code, "disabled user cannot log in")

	// Wrong password, unknown user and disabled user, the two 400 answers are
	// not login attempts and are not counted.
	assert.Equal(t, before+3, loginCount("failure"))
}

func TestLoginRateLimited(t *testing.T) {
	f := newAuthFixture(t)
	h := newAuthHTTPServer(t, f)
	before := loginCount("rate_limited")
	for i := 0; i < 5; i++ {
		rec := post(h, "/api/v1alpha1/auth/login", `{"username":"admin","password":"wrong-password-1"}`, nil)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	}
	rec := post(h, "/api/v1alpha1/auth/login", `{"username":"admin","password":"admin-password-123"}`, nil)
	assert.Equal(t, http.StatusTooManyRequests, rec.Code, "even the right password is blocked")
	assert.Equal(t, before+1, loginCount("rate_limited"))
}

func TestLogoutClearsCookie(t *testing.T) {
	f := newAuthFixture(t)
	h := newAuthHTTPServer(t, f)
	rec := post(h, "/api/v1alpha1/auth/logout", "", nil)
	assert.Equal(t, http.StatusNoContent, rec.Code)
	c := sessionCookie(t, rec)
	assert.Equal(t, -1, c.MaxAge)
}

func TestChangePassword(t *testing.T) {
	f := newAuthFixture(t)
	h := newAuthHTTPServer(t, f)

	rec := post(h, "/api/v1alpha1/auth/password", `{"currentPassword":"admin-password-123","newPassword":"brand-new-password-1"}`, nil)
	assert.Equal(t, http.StatusUnauthorized, rec.Code, "anonymous")

	login := post(h, "/api/v1alpha1/auth/login", `{"username":"admin","password":"admin-password-123"}`, nil)
	cookie := sessionCookie(t, login)

	rec = post(h, "/api/v1alpha1/auth/password", `{"currentPassword":"nope-nope-nope","newPassword":"brand-new-password-1"}`, cookie)
	assert.Equal(t, http.StatusUnauthorized, rec.Code, "wrong current password")

	rec = post(h, "/api/v1alpha1/auth/password", `{"currentPassword":"admin-password-123","newPassword":"short"}`, cookie)
	assert.Equal(t, http.StatusBadRequest, rec.Code, "policy")

	rec = post(h, "/api/v1alpha1/auth/password", `{"currentPassword":"admin-password-123","newPassword":"brand-new-password-1"}`, cookie)
	require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())
	fresh := sessionCookie(t, rec)

	// The old session is invalidated, the new one works.
	rec = post(h, "/api/v1alpha1/auth/password", `{"currentPassword":"brand-new-password-1","newPassword":"another-new-password-2"}`, cookie)
	assert.Equal(t, http.StatusUnauthorized, rec.Code, "old session version rejected")
	rec = post(h, "/api/v1alpha1/auth/password", `{"currentPassword":"brand-new-password-1","newPassword":"another-new-password-2"}`, fresh)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	u, _ := f.users.GetByID(context.Background(), f.admin.ID)
	assert.False(t, u.MustChangePassword)
	assert.Equal(t, 2, u.SessionVersion)
}

func TestLoginRejectsCrossSiteRequest(t *testing.T) {
	f := newAuthFixture(t)
	h := newAuthHTTPServer(t, f)

	req := httptest.NewRequest(http.MethodPost, "/api/v1alpha1/auth/login",
		strings.NewReader(`{"username":"admin","password":"admin-password-123"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Sec-Fetch-Site", "cross-site")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusForbidden, rec.Code)
	assert.Empty(t, rec.Result().Cookies(), "no session is issued to a cross-site caller")
	assert.Contains(t, rec.Body.String(), "cross-site")
}
