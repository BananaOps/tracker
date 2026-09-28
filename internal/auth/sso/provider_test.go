package sso

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"golang.org/x/oauth2"

	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/sso/ssotest"
)

func newTestProvider(t *testing.T, idp *ssotest.IdP, opts ...ProviderOption) *OIDCProvider {
	t.Helper()
	cfg := auth.OIDCConfig{
		Issuer: idp.URL, ClientID: idp.ClientID, ClientSecret: idp.ClientSecret,
		Scopes: []string{"openid", "profile", "email"}, GroupsClaim: "groups",
		UsernameClaim: "preferred_username", UserProvisioning: true, TeamSync: true,
	}
	return NewOIDCProvider(cfg, "http://tracker.test"+auth.OIDCCallbackPath, opts...)
}

// flow runs AuthCodeURL, the IdP authorization and Exchange with the given
// nonce. AuthCodeURL always uses "n-1" as its own nonce; exchangeNonce is
// what the caller then presents to Exchange, letting tests simulate a
// mismatch.
func flow(t *testing.T, p *OIDCProvider, idp *ssotest.IdP, exchangeNonce string) (Claims, error) {
	t.Helper()

	verifier := oauth2.GenerateVerifier()
	authURL, err := p.AuthCodeURL(context.Background(), "st", "n-1", verifier)
	if err != nil {
		t.Fatalf("AuthCodeURL: %v", err)
	}

	loc := idp.Authorize(t, authURL)
	code := loc.Query().Get("code")

	return p.Exchange(context.Background(), code, verifier, exchangeNonce)
}

func scopeContains(scope, want string) bool {
	for _, s := range strings.Fields(scope) {
		if s == want {
			return true
		}
	}
	return false
}

func TestAuthCodeURL(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)
	verifier := oauth2.GenerateVerifier()

	authURL, err := p.AuthCodeURL(context.Background(), "st", "n-1", verifier)
	if err != nil {
		t.Fatalf("AuthCodeURL: %v", err)
	}
	if !strings.HasPrefix(authURL, idp.URL+"/authorize") {
		t.Fatalf("authURL = %q, want prefix %q", authURL, idp.URL+"/authorize")
	}

	u, err := url.Parse(authURL)
	if err != nil {
		t.Fatalf("parse authURL: %v", err)
	}
	q := u.Query()

	if q.Get("response_type") != "code" {
		t.Fatalf("response_type = %q, want code", q.Get("response_type"))
	}
	if q.Get("client_id") != idp.ClientID {
		t.Fatalf("client_id = %q, want %q", q.Get("client_id"), idp.ClientID)
	}
	if want := "http://tracker.test" + auth.OIDCCallbackPath; q.Get("redirect_uri") != want {
		t.Fatalf("redirect_uri = %q, want %q", q.Get("redirect_uri"), want)
	}
	if !scopeContains(q.Get("scope"), "openid") {
		t.Fatalf("scope = %q, want it to contain openid", q.Get("scope"))
	}
	if q.Get("state") != "st" {
		t.Fatalf("state = %q, want st", q.Get("state"))
	}
	if q.Get("nonce") != "n-1" {
		t.Fatalf("nonce = %q, want n-1", q.Get("nonce"))
	}
	if q.Get("code_challenge_method") != "S256" {
		t.Fatalf("code_challenge_method = %q, want S256", q.Get("code_challenge_method"))
	}
	challenge := q.Get("code_challenge")
	if challenge == "" {
		t.Fatal("code_challenge is empty")
	}
	if challenge == verifier {
		t.Fatal("code_challenge equals the verifier")
	}
}

func TestExchangeSuccess(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)

	claims, err := flow(t, p, idp, "n-1")
	if err != nil {
		t.Fatalf("flow: %v", err)
	}
	if claims.Issuer != idp.URL {
		t.Fatalf("Issuer = %q, want %q", claims.Issuer, idp.URL)
	}
	if claims.Subject != "user-1" {
		t.Fatalf("Subject = %q, want user-1", claims.Subject)
	}
	if claims.Username != "alice" {
		t.Fatalf("Username = %q, want alice", claims.Username)
	}
	if claims.Email == "" {
		t.Fatal("Email is empty")
	}
	if claims.DisplayName != "Alice Example" {
		t.Fatalf("DisplayName = %q, want Alice Example", claims.DisplayName)
	}
	if !claims.GroupsPresent {
		t.Fatal("GroupsPresent = false, want true")
	}
}

func TestExchangeGroups(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)

	idp.SetUser(ssotest.User{
		Subject: "user-2",
		Claims: map[string]any{
			"preferred_username": "bob",
			"email":              "bob@example.com",
			"groups":             []string{"platform-eng", "ops"},
		},
	})

	claims, err := flow(t, p, idp, "n-1")
	if err != nil {
		t.Fatalf("flow: %v", err)
	}
	if !equalStrings(claims.Groups, []string{"platform-eng", "ops"}) {
		t.Fatalf("Groups = %v, want [platform-eng ops]", claims.Groups)
	}
}

func TestExchangeNonceMismatch(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)

	_, err := flow(t, p, idp, "other-nonce")
	if !errors.Is(err, ErrIDToken) {
		t.Fatalf("err = %v, want ErrIDToken", err)
	}
}

func TestExchangeWrongAudience(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)
	idp.SetTokenMutator(func(claims map[string]any) {
		claims["aud"] = "someone-else"
	})

	_, err := flow(t, p, idp, "n-1")
	if !errors.Is(err, ErrIDToken) {
		t.Fatalf("err = %v, want ErrIDToken", err)
	}
}

func TestExchangeExpiredToken(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)
	idp.SetTokenMutator(func(claims map[string]any) {
		claims["exp"] = time.Now().Add(-time.Hour).Unix()
	})

	_, err := flow(t, p, idp, "n-1")
	if !errors.Is(err, ErrIDToken) {
		t.Fatalf("err = %v, want ErrIDToken", err)
	}
}

func TestExchangeWrongIssuer(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)
	idp.SetTokenMutator(func(claims map[string]any) {
		claims["iss"] = "https://evil.example"
	})

	_, err := flow(t, p, idp, "n-1")
	if !errors.Is(err, ErrIDToken) {
		t.Fatalf("err = %v, want ErrIDToken", err)
	}
}

func TestExchangeAlgNone(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)
	idp.SetSigning(ssotest.SignNone)

	_, err := flow(t, p, idp, "n-1")
	if !errors.Is(err, ErrIDToken) {
		t.Fatalf("err = %v, want ErrIDToken", err)
	}
}

func TestExchangeUnknownKey(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)
	idp.SetSigning(ssotest.SignForeignKey)

	_, err := flow(t, p, idp, "n-1")
	if !errors.Is(err, ErrIDToken) {
		t.Fatalf("err = %v, want ErrIDToken", err)
	}
}

func TestExchangeWrongVerifier(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)

	verifier := oauth2.GenerateVerifier()
	authURL, err := p.AuthCodeURL(context.Background(), "st", "n-1", verifier)
	if err != nil {
		t.Fatalf("AuthCodeURL: %v", err)
	}
	loc := idp.Authorize(t, authURL)
	code := loc.Query().Get("code")

	otherVerifier := oauth2.GenerateVerifier()
	_, err = p.Exchange(context.Background(), code, otherVerifier, "n-1")
	if !errors.Is(err, ErrExchange) {
		t.Fatalf("err = %v, want ErrExchange", err)
	}
}

func TestExchangeReusedCode(t *testing.T) {
	idp := ssotest.New(t)
	p := newTestProvider(t, idp)

	verifier := oauth2.GenerateVerifier()
	authURL, err := p.AuthCodeURL(context.Background(), "st", "n-1", verifier)
	if err != nil {
		t.Fatalf("AuthCodeURL: %v", err)
	}
	loc := idp.Authorize(t, authURL)
	code := loc.Query().Get("code")

	if _, err := p.Exchange(context.Background(), code, verifier, "n-1"); err != nil {
		t.Fatalf("first Exchange: %v", err)
	}
	if _, err := p.Exchange(context.Background(), code, verifier, "n-1"); !errors.Is(err, ErrExchange) {
		t.Fatalf("second Exchange err = %v, want ErrExchange", err)
	}
}

// flakyTransport fails the first request, then delegates every later one.
// It lets a test simulate a provider that is briefly unreachable without
// changing the issuer's URL, which would trip the issuer-equality check.
type flakyTransport struct {
	mu     sync.Mutex
	failed bool
	inner  http.RoundTripper
}

func (t *flakyTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	t.mu.Lock()
	shouldFail := !t.failed
	t.failed = true
	t.mu.Unlock()
	if shouldFail {
		return nil, errors.New("simulated network failure")
	}
	return t.inner.RoundTrip(req)
}

func TestDiscoveryUnavailableThenRetry(t *testing.T) {
	var calls int32
	badServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer badServer.Close()

	clock := time.Now()
	now := func() time.Time { return clock }

	cfg := auth.OIDCConfig{Issuer: badServer.URL, ClientID: "client", Scopes: []string{"openid"}}
	p := NewOIDCProvider(cfg, "http://tracker.test"+auth.OIDCCallbackPath, WithRetryInterval(time.Minute), WithClock(now))

	if _, err := p.AuthCodeURL(context.Background(), "st", "n-1", "verifier"); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("first AuthCodeURL err = %v, want ErrUnavailable", err)
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("calls = %d, want 1", got)
	}

	if _, err := p.AuthCodeURL(context.Background(), "st", "n-1", "verifier"); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("second AuthCodeURL err = %v, want ErrUnavailable", err)
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("calls after immediate retry = %d, want 1", got)
	}

	clock = clock.Add(2 * time.Minute)

	if _, err := p.AuthCodeURL(context.Background(), "st", "n-1", "verifier"); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("third AuthCodeURL err = %v, want ErrUnavailable", err)
	}
	if got := atomic.LoadInt32(&calls); got != 2 {
		t.Fatalf("calls after clock advance = %d, want 2", got)
	}

	// A real IdP behind a transport that fails once: after the error,
	// advancing the clock lets the next attempt succeed.
	idp := ssotest.New(t)
	transport := &flakyTransport{inner: http.DefaultTransport}
	client := &http.Client{Transport: transport}

	p2 := NewOIDCProvider(auth.OIDCConfig{
		Issuer: idp.URL, ClientID: idp.ClientID, ClientSecret: idp.ClientSecret, Scopes: []string{"openid"},
	}, "http://tracker.test"+auth.OIDCCallbackPath, WithHTTPClient(client), WithRetryInterval(time.Minute), WithClock(now))

	if err := p2.Discover(context.Background()); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("first Discover err = %v, want ErrUnavailable", err)
	}

	clock = clock.Add(2 * time.Minute)

	if err := p2.Discover(context.Background()); err != nil {
		t.Fatalf("second Discover err = %v, want nil", err)
	}
}

func TestDiscoveryIssuerMismatch(t *testing.T) {
	idp := ssotest.New(t)
	cfg := auth.OIDCConfig{Issuer: idp.URL + "/", ClientID: idp.ClientID, ClientSecret: idp.ClientSecret, Scopes: []string{"openid"}}
	p := NewOIDCProvider(cfg, "http://tracker.test"+auth.OIDCCallbackPath)

	if err := p.Discover(context.Background()); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("err = %v, want ErrUnavailable", err)
	}
}

func TestErrorsDoNotLeakSecrets(t *testing.T) {
	idp := ssotest.New(t)

	forbidden := []string{idp.ClientSecret}

	check := func(t *testing.T, err error) {
		t.Helper()
		if err == nil {
			t.Fatal("err is nil, want a rejection")
		}
		msg := err.Error()
		for _, s := range forbidden {
			if s != "" && strings.Contains(msg, s) {
				t.Fatalf("error %q leaks %q", msg, s)
			}
		}
		if last := idp.LastIDToken(); last != "" && strings.Contains(msg, last) {
			t.Fatalf("error %q leaks the id_token", msg)
		}
	}

	t.Run("NonceMismatch", func(t *testing.T) {
		p := newTestProvider(t, idp)
		_, err := flow(t, p, idp, "other-nonce")
		check(t, err)
	})

	t.Run("WrongAudience", func(t *testing.T) {
		p := newTestProvider(t, idp)
		idp.SetTokenMutator(func(claims map[string]any) { claims["aud"] = "someone-else" })
		defer idp.SetTokenMutator(nil)
		_, err := flow(t, p, idp, "n-1")
		check(t, err)
	})

	t.Run("ExpiredToken", func(t *testing.T) {
		p := newTestProvider(t, idp)
		idp.SetTokenMutator(func(claims map[string]any) { claims["exp"] = time.Now().Add(-time.Hour).Unix() })
		defer idp.SetTokenMutator(nil)
		_, err := flow(t, p, idp, "n-1")
		check(t, err)
	})

	t.Run("WrongIssuer", func(t *testing.T) {
		p := newTestProvider(t, idp)
		idp.SetTokenMutator(func(claims map[string]any) { claims["iss"] = "https://evil.example" })
		defer idp.SetTokenMutator(nil)
		_, err := flow(t, p, idp, "n-1")
		check(t, err)
	})

	t.Run("AlgNone", func(t *testing.T) {
		p := newTestProvider(t, idp)
		idp.SetSigning(ssotest.SignNone)
		defer idp.SetSigning(ssotest.SignRS256)
		_, err := flow(t, p, idp, "n-1")
		check(t, err)
	})

	t.Run("UnknownKey", func(t *testing.T) {
		p := newTestProvider(t, idp)
		idp.SetSigning(ssotest.SignForeignKey)
		defer idp.SetSigning(ssotest.SignRS256)
		_, err := flow(t, p, idp, "n-1")
		check(t, err)
	})

	t.Run("WrongVerifier", func(t *testing.T) {
		p := newTestProvider(t, idp)
		verifier := oauth2.GenerateVerifier()
		authURL, err := p.AuthCodeURL(context.Background(), "st", "n-1", verifier)
		if err != nil {
			t.Fatalf("AuthCodeURL: %v", err)
		}
		loc := idp.Authorize(t, authURL)
		code := loc.Query().Get("code")
		otherVerifier := oauth2.GenerateVerifier()
		_, err = p.Exchange(context.Background(), code, otherVerifier, "n-1")
		check(t, err)
		if strings.Contains(err.Error(), verifier) || strings.Contains(err.Error(), otherVerifier) {
			t.Fatalf("error %q leaks the verifier", err.Error())
		}
	})

	t.Run("ReusedCode", func(t *testing.T) {
		p := newTestProvider(t, idp)
		verifier := oauth2.GenerateVerifier()
		authURL, err := p.AuthCodeURL(context.Background(), "st", "n-1", verifier)
		if err != nil {
			t.Fatalf("AuthCodeURL: %v", err)
		}
		loc := idp.Authorize(t, authURL)
		code := loc.Query().Get("code")
		if _, err := p.Exchange(context.Background(), code, verifier, "n-1"); err != nil {
			t.Fatalf("first Exchange: %v", err)
		}
		_, err = p.Exchange(context.Background(), code, verifier, "n-1")
		check(t, err)
		if strings.Contains(err.Error(), code) {
			t.Fatalf("error %q leaks the code", err.Error())
		}
	})
}
