package server

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	"github.com/bananaops/tracker/internal/auth/sso"
	"github.com/bananaops/tracker/internal/auth/sso/ssotest"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/require"
)

const oidcTestPublicURL = "http://tracker.test"

type oidcHarness struct {
	f       *authFixture
	idp     *ssotest.IdP
	cfg     auth.Config
	codec   *sso.TransactionCodec
	oidc    *OIDCHTTP
	handler http.Handler
	logs    *bytes.Buffer
}

// newOIDCHarness wires the gateway (AuthService), the cookie endpoints and the
// OIDC routes on a real mux, behind the real auth middleware.
func newOIDCHarness(t *testing.T, mutate func(*auth.Config)) *oidcHarness {
	t.Helper()
	f := newAuthFixture(t)
	idp := ssotest.New(t)

	cfg := f.cfg
	cfg.PublicURL = oidcTestPublicURL
	cfg.OIDC = auth.OIDCConfig{
		Issuer:           idp.URL,
		ClientID:         idp.ClientID,
		ClientSecret:     idp.ClientSecret,
		Scopes:           []string{"openid", "profile", "email", "groups"},
		GroupsClaim:      "groups",
		UsernameClaim:    "preferred_username",
		UserProvisioning: true,
		TeamSync:         true,
		ButtonLabel:      "Single Sign-On",
	}
	if mutate != nil {
		mutate(&cfg)
	}

	codec, err := sso.NewTransactionCodec(bytes.Repeat([]byte{7}, 32))
	require.NoError(t, err)

	h := &oidcHarness{f: f, idp: idp, cfg: cfg, codec: codec, logs: &bytes.Buffer{}}
	mux := runtime.NewServeMux()
	require.NoError(t, authv1.RegisterAuthServiceHandlerServer(context.Background(), mux, NewAuth(f.users, f.teams, f.keys, cfg)))
	NewAuthHTTP(f.users, f.sessions, cfg).Register(mux)
	if cfg.OIDC.Enabled() {
		provider := sso.NewOIDCProvider(cfg.OIDC, cfg.OIDCRedirectURL())
		h.oidc = NewOIDCHTTP(f.users, f.teams, f.sessions, provider, codec, cfg)
		h.oidc.logger = slog.New(slog.NewJSONHandler(h.logs, nil))
		h.oidc.Register(mux)
	}
	h.handler = auth.HTTPMiddleware(f.resolver, cfg)(mux)
	return h
}

func (h *oidcHarness) get(path string, headers map[string]string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	for _, c := range cookies {
		if c != nil {
			req.AddCookie(c)
		}
	}
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, req)
	return rec
}

// startRaw calls the login route.
func (h *oidcHarness) startRaw(redirect string) *httptest.ResponseRecorder {
	path := auth.OIDCLoginPath
	if redirect != "" {
		path += "?redirect=" + url.QueryEscape(redirect)
	}
	return h.get(path, nil)
}

// start calls the login route and returns the IdP authorization URL and the transaction cookie.
func (h *oidcHarness) start(t *testing.T, redirect string) (*url.URL, *http.Cookie) {
	t.Helper()
	rec := h.startRaw(redirect)
	require.Equal(t, http.StatusFound, rec.Code, rec.Body.String())
	loc, err := url.Parse(rec.Header().Get("Location"))
	require.NoError(t, err)
	tx := cookieNamed(rec, sso.TransactionCookieName)
	require.NotNil(t, tx)
	return loc, tx
}

// callback replays the IdP redirect on the Tracker callback, as a browser coming back cross-site.
func (h *oidcHarness) callback(t *testing.T, cb *url.URL, tx *http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	return h.get(cb.RequestURI(), map[string]string{"Sec-Fetch-Site": "cross-site"}, tx)
}

// login runs start, the IdP authorization and the callback.
func (h *oidcHarness) login(t *testing.T, redirect string) *httptest.ResponseRecorder {
	t.Helper()
	authURL, tx := h.start(t, redirect)
	return h.callback(t, h.idp.Authorize(t, authURL.String()), tx)
}

type meBody struct {
	Authenticated      bool   `json:"authenticated"`
	Username           string `json:"username"`
	Source             string `json:"source"`
	Kind               string `json:"kind"`
	MustChangePassword bool   `json:"mustChangePassword"`
	IsAdmin            bool   `json:"isAdmin"`
	Teams              []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"teams"`
}

// me calls GET /api/v1alpha1/auth/me with a same-origin session cookie.
func (h *oidcHarness) me(t *testing.T, session *http.Cookie) meBody {
	t.Helper()
	rec := h.get("/api/v1alpha1/auth/me", map[string]string{"Sec-Fetch-Site": "same-origin"}, session)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var b meBody
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &b))
	return b
}

// cookieNamed returns the named Set-Cookie of the response, nil when absent.
func cookieNamed(rec *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range rec.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

// oidcLoginCount reads tracker_auth_logins_total{method="oidc"} for one result.
func oidcLoginCount(result string) float64 {
	return testutil.ToFloat64(authz.AuthLogins.WithLabelValues(authz.LoginMethodOIDC, result))
}
