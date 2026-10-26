package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// newPasswordRequiredServer mounts the real auth routes, the real AuthService
// and EventService gateways and the HTTP middleware. The two guarded probe
// routes use authz.RequireHTTP exactly as /api/links does, without needing the
// global MongoDB collections the links and event stores connect to. The Event
// service has no store: a denied call returns before reaching it.
func newPasswordRequiredServer(t *testing.T, f *authFixture) http.Handler {
	t.Helper()
	mux := runtime.NewServeMux()
	NewAuthHTTP(f.users, f.sessions, f.cfg).Register(mux)
	require.NoError(t, authv1.RegisterAuthServiceHandlerServer(context.Background(), mux, newAuthService(f)))
	require.NoError(t, eventv1.RegisterEventServiceHandlerServer(context.Background(), mux, &Event{}))
	ok := func(w http.ResponseWriter, _ *http.Request, _ map[string]string) { w.WriteHeader(http.StatusOK) }
	require.NoError(t, mux.HandlePath(http.MethodGet, "/api/links", authz.RequireHTTP(auth.PermLinksRead, ok)))
	require.NoError(t, mux.HandlePath(http.MethodGet, "/api/probe/events", authz.RequireHTTP(auth.PermEventRead, ok)))
	return auth.HTTPMiddleware(f.resolver, f.cfg)(recoverAsServerError(mux))
}

// recoverAsServerError turns a panic into a 500. The Event service has no
// store, so if the authz rule ever stopped refusing a flagged user the call
// would reach the nil store and panic, aborting the whole test binary and
// hiding every test scheduled after it. A 500 makes the assertion fail
// cleanly instead.
func recoverAsServerError(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recover() != nil {
				w.WriteHeader(http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func get(h http.Handler, path string, cookie *http.Cookie, bearer string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	if cookie != nil {
		req.AddCookie(cookie)
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestForcedPasswordChangeIsEnforcedByTheServer(t *testing.T) {
	f := newAuthFixture(t)
	require.True(t, f.admin.MustChangePassword, "the bootstrap admin is flagged")
	h := newPasswordRequiredServer(t, f)

	login := post(h, "/api/v1alpha1/auth/login", `{"username":"admin","password":"admin-password-123"}`, nil)
	require.Equal(t, http.StatusNoContent, login.Code, login.Body.String())
	cookie := sessionCookie(t, login)

	// Every protected route is refused, whatever the transport.
	for _, path := range []string{"/api/v1alpha1/events/list", "/api/links", "/api/probe/events"} {
		rec := get(h, path, cookie, "")
		assert.Equal(t, http.StatusForbidden, rec.Code, path)
		assert.Contains(t, rec.Body.String(), "password change required", path)
	}
	rec := get(h, "/api/v1alpha1/auth/users", cookie, "")
	assert.Equal(t, http.StatusForbidden, rec.Code, "access:manage route")
	assert.Contains(t, rec.Body.String(), "password change required")

	// The public routes stay reachable: the UI needs Me to learn it must redirect.
	rec = get(h, "/api/v1alpha1/auth/me", cookie, "")
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.Contains(t, rec.Body.String(), `"mustChangePassword":true`)
	assert.Equal(t, http.StatusOK, get(h, "/api/v1alpha1/auth/config", cookie, "").Code)

	// The password can be changed, and the new session is served normally.
	rec = post(h, "/api/v1alpha1/auth/password", `{"currentPassword":"admin-password-123","newPassword":"brand-new-password-1"}`, cookie)
	require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())
	fresh := sessionCookie(t, rec)

	// The change bumps the session version: the old cookie is dead, the
	// reissued one works without logging in again.
	assert.Equal(t, http.StatusUnauthorized, get(h, "/api/probe/events", cookie, "").Code, "old session")
	assert.Equal(t, http.StatusOK, get(h, "/api/probe/events", fresh, "").Code)
	assert.Equal(t, http.StatusOK, get(h, "/api/links", fresh, "").Code)
	rec = get(h, "/api/v1alpha1/auth/me", fresh, "")
	assert.Contains(t, rec.Body.String(), `"mustChangePassword":false`)
}

func TestLogoutStillWorksWhileFlagged(t *testing.T) {
	f := newAuthFixture(t)
	h := newPasswordRequiredServer(t, f)

	login := post(h, "/api/v1alpha1/auth/login", `{"username":"admin","password":"admin-password-123"}`, nil)
	cookie := sessionCookie(t, login)

	rec := post(h, "/api/v1alpha1/auth/logout", `{}`, cookie)
	assert.Equal(t, http.StatusNoContent, rec.Code)
	assert.Equal(t, -1, sessionCookie(t, rec).MaxAge)
}

// An API key is never affected by the flag of the user who created it.
func TestAPIKeyIgnoresCreatorMustChangePassword(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	h := newPasswordRequiredServer(t, f)

	// A flagged admin cannot create a key through the service: it is refused.
	flagged := f.flaggedPrincipalOf(t, f.admin)
	require.True(t, flagged.MustChangePassword)
	_, err := svc.CreateApiKey(rpcCtx(flagged, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "denied"})
	require.Error(t, err)
	assert.Equal(t, codes.PermissionDenied, status.Code(err))
	assert.Equal(t, "password change required", status.Convert(err).Message())

	// The key exists, created by an admin (here the same one with the flag
	// lifted on the principal only), while the stored user is still flagged.
	created, err := svc.CreateApiKey(rpcCtx(f.principalOf(t, f.admin), "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "ci"})
	require.NoError(t, err)

	stored, err := f.users.GetByID(context.Background(), f.admin.ID)
	require.NoError(t, err)
	require.True(t, stored.MustChangePassword)

	assert.Equal(t, http.StatusOK, get(h, "/api/probe/events", nil, created.Secret).Code)
	assert.Equal(t, http.StatusOK, get(h, "/api/links", nil, created.Secret).Code)
}
