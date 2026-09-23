package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func fakeResolver() Resolver {
	return ResolverFunc(func(_ context.Context, c Credentials) Principal {
		if c.APIKey == "trk_abcdefgh_ok" {
			return Principal{Kind: KindAPIKey, Username: "apikey:abcdefgh", Permissions: NewPermissionSet(PermEventRead)}
		}
		if c.SessionToken == "session.ok" {
			return Principal{Kind: KindUser, Username: "alice", Permissions: NewPermissionSet(PermEventRead)}
		}
		return Anonymous(nil)
	})
}

func TestHTTPMiddlewareStoresPrincipal(t *testing.T) {
	var seen Principal
	h := HTTPMiddleware(fakeResolver(), Config{})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen, _ = FromContext(r.Context())
	}))
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("X-Api-Key", "trk_abcdefgh_ok")
	h.ServeHTTP(httptest.NewRecorder(), r)
	assert.Equal(t, KindAPIKey, seen.Kind)

	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	assert.Equal(t, KindAnonymous, seen.Kind)
}

func TestUnaryInterceptorStoresPrincipal(t *testing.T) {
	var seen Principal
	handler := func(ctx context.Context, req any) (any, error) {
		seen, _ = FromContext(ctx)
		return nil, nil
	}
	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("x-api-key", "trk_abcdefgh_ok"))
	_, err := UnaryInterceptor(fakeResolver())(ctx, nil, &grpc.UnaryServerInfo{FullMethod: "/x/Y"}, handler)
	require.NoError(t, err)
	assert.Equal(t, KindAPIKey, seen.Kind)
}

type fakeStream struct {
	grpc.ServerStream
	ctx context.Context
}

func (s fakeStream) Context() context.Context { return s.ctx }

func TestStreamInterceptorStoresPrincipal(t *testing.T) {
	var seen Principal
	handler := func(srv any, ss grpc.ServerStream) error {
		seen, _ = FromContext(ss.Context())
		return nil
	}
	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("x-api-key", "trk_abcdefgh_ok"))
	err := StreamInterceptor(fakeResolver())(nil, fakeStream{ctx: ctx}, &grpc.StreamServerInfo{FullMethod: "/x/Y"}, handler)
	require.NoError(t, err)
	assert.Equal(t, KindAPIKey, seen.Kind)
}

// A session cookie is SameSite=Lax, so a browser still sends it on a top level
// cross-site GET. The middleware must not turn that into an authenticated call.
func TestHTTPMiddlewareIgnoresCookieOnCrossSiteRequest(t *testing.T) {
	var seen Principal
	cfg := Config{PublicURL: "https://tracker.example.com"}
	h := HTTPMiddleware(fakeResolver(), cfg)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen, _ = FromContext(r.Context())
	}))

	withCookie := func(secFetch string) *http.Request {
		r := httptest.NewRequest(http.MethodGet, "/api/v1alpha1/unlock/abc", nil)
		r.AddCookie(&http.Cookie{Name: SessionCookieName, Value: "session.ok"})
		if secFetch != "" {
			r.Header.Set("Sec-Fetch-Site", secFetch)
		}
		return r
	}

	h.ServeHTTP(httptest.NewRecorder(), withCookie("same-origin"))
	assert.Equal(t, KindUser, seen.Kind, "same-origin cookie request stays authenticated")

	h.ServeHTTP(httptest.NewRecorder(), withCookie("cross-site"))
	assert.Equal(t, KindAnonymous, seen.Kind, "cross-site cookie request falls back to anonymous")
	assert.False(t, seen.Has(PermEventRead))

	// An API key is not a browser credential and is never dropped.
	r := httptest.NewRequest(http.MethodGet, "/api/v1alpha1/unlock/abc", nil)
	r.Header.Set("X-Api-Key", "trk_abcdefgh_ok")
	r.Header.Set("Sec-Fetch-Site", "cross-site")
	h.ServeHTTP(httptest.NewRecorder(), r)
	assert.Equal(t, KindAPIKey, seen.Kind, "an API key is not subject to the cookie CSRF guard")

	// A bearer session token is explicit, so it is not dropped either.
	r = httptest.NewRequest(http.MethodGet, "/api/v1alpha1/unlock/abc", nil)
	r.Header.Set("Authorization", "Bearer session.ok")
	r.Header.Set("Sec-Fetch-Site", "cross-site")
	h.ServeHTTP(httptest.NewRecorder(), r)
	assert.Equal(t, KindUser, seen.Kind, "an explicit bearer token is not subject to the cookie CSRF guard")
}
