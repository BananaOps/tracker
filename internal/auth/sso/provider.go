package sso

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	gooidc "github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"

	"github.com/bananaops/tracker/internal/auth"
)

const (
	defaultHTTPTimeout   = 10 * time.Second
	defaultRetryInterval = 5 * time.Second
)

var (
	// ErrUnavailable means discovery could not reach or parse the identity
	// provider's configuration.
	ErrUnavailable = errors.New("identity provider unavailable")
	// ErrExchange means the authorization code exchange failed.
	ErrExchange = errors.New("authorization code exchange failed")
	// ErrIDToken means the id_token was rejected: bad signature, issuer,
	// audience, expiry or nonce.
	ErrIDToken = errors.New("id_token rejected")
	// ErrClaims means the id_token claims could not be turned into usable
	// Claims.
	ErrClaims = errors.New("id_token claims unusable")
)

// Provider is the part of the identity provider used by the HTTP handlers.
type Provider interface {
	AuthCodeURL(ctx context.Context, state, nonce, verifier string) (string, error)
	Exchange(ctx context.Context, code, verifier, nonce string) (Claims, error)
}

// ProviderOption configures an OIDCProvider.
type ProviderOption func(*OIDCProvider)

// WithHTTPClient sets the HTTP client used for discovery, JWKS fetches and
// the token exchange.
func WithHTTPClient(c *http.Client) ProviderOption {
	return func(p *OIDCProvider) {
		p.httpClient = c
	}
}

// WithClock overrides the time source, for tests.
func WithClock(now func() time.Time) ProviderOption {
	return func(p *OIDCProvider) {
		p.now = now
	}
}

// WithRetryInterval overrides the minimum delay between two discovery
// attempts after a failure.
func WithRetryInterval(d time.Duration) ProviderOption {
	return func(p *OIDCProvider) {
		p.retry = d
	}
}

// OIDCProvider talks to the identity provider. Discovery is lazy: it runs on
// the first use and is retried at most once per retry interval after a
// failure, so an unreachable provider never prevents Tracker from starting.
type OIDCProvider struct {
	cfg         auth.OIDCConfig
	redirectURL string
	httpClient  *http.Client
	now         func() time.Time
	retry       time.Duration

	mu          sync.Mutex
	oauth       *oauth2.Config
	verifier    *gooidc.IDTokenVerifier
	lastErr     error
	lastAttempt time.Time
}

var _ Provider = (*OIDCProvider)(nil)

// NewOIDCProvider builds a client for cfg's issuer. redirectURL is the
// Tracker callback URL registered with the identity provider.
func NewOIDCProvider(cfg auth.OIDCConfig, redirectURL string, opts ...ProviderOption) *OIDCProvider {
	p := &OIDCProvider{
		cfg:         cfg,
		redirectURL: redirectURL,
		httpClient:  &http.Client{Timeout: defaultHTTPTimeout},
		now:         time.Now,
		retry:       defaultRetryInterval,
	}
	for _, o := range opts {
		o(p)
	}
	return p
}

// Discover runs discovery now; used as a startup warm-up. Safe to call
// concurrently.
func (p *OIDCProvider) Discover(_ context.Context) error {
	_, _, err := p.ready()
	return err
}

// ready returns the oauth2 config and id_token verifier, running discovery
// on first use and retrying at most once per retry interval after a
// failure.
func (p *OIDCProvider) ready() (*oauth2.Config, *gooidc.IDTokenVerifier, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.oauth != nil {
		return p.oauth, p.verifier, nil
	}
	if p.lastErr != nil && p.now().Sub(p.lastAttempt) < p.retry {
		return nil, nil, fmt.Errorf("%w: %w", ErrUnavailable, p.lastErr)
	}
	p.lastAttempt = p.now()

	// No deadline on this context: the remote key set may keep it for later
	// JWKS refreshes. The HTTP client timeout bounds every request instead.
	dctx := gooidc.ClientContext(context.Background(), p.httpClient)
	provider, err := gooidc.NewProvider(dctx, p.cfg.Issuer)
	if err != nil {
		p.lastErr = err
		return nil, nil, fmt.Errorf("%w: %w", ErrUnavailable, err)
	}
	p.lastErr = nil

	p.oauth = &oauth2.Config{
		ClientID:     p.cfg.ClientID,
		ClientSecret: p.cfg.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  p.redirectURL,
		Scopes:       p.cfg.Scopes,
	}
	p.verifier = provider.Verifier(&gooidc.Config{ClientID: p.cfg.ClientID, Now: p.now})

	return p.oauth, p.verifier, nil
}

// AuthCodeURL builds the authorization URL: PKCE S256 challenge derived
// from verifier, plus the nonce that Exchange will check against the
// id_token.
func (p *OIDCProvider) AuthCodeURL(_ context.Context, state, nonce, verifier string) (string, error) {
	oc, _, err := p.ready()
	if err != nil {
		return "", err
	}
	return oc.AuthCodeURL(state, gooidc.Nonce(nonce), oauth2.S256ChallengeOption(verifier)), nil
}

// Exchange trades an authorization code for a verified id_token and returns
// its claims. verifier is the PKCE code_verifier generated for AuthCodeURL,
// nonce is the value AuthCodeURL sent.
func (p *OIDCProvider) Exchange(ctx context.Context, code, verifier, nonce string) (Claims, error) {
	oc, idv, err := p.ready()
	if err != nil {
		return Claims{}, err
	}

	ctx = gooidc.ClientContext(ctx, p.httpClient)
	tok, err := oc.Exchange(ctx, code, oauth2.VerifierOption(verifier))
	if err != nil {
		return Claims{}, fmt.Errorf("%w: %w", ErrExchange, err)
	}

	rawIDToken, ok := tok.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return Claims{}, fmt.Errorf("%w: token response carries no id_token", ErrIDToken)
	}

	idt, err := idv.Verify(ctx, rawIDToken)
	if err != nil {
		return Claims{}, fmt.Errorf("%w: %w", ErrIDToken, err)
	}

	if nonce == "" || subtle.ConstantTimeCompare([]byte(idt.Nonce), []byte(nonce)) != 1 {
		return Claims{}, fmt.Errorf("%w: nonce mismatch", ErrIDToken)
	}

	var raw map[string]any
	if err := idt.Claims(&raw); err != nil {
		return Claims{}, fmt.Errorf("%w: %w", ErrClaims, err)
	}

	return claimsFrom(idt.Issuer, idt.Subject, raw, p.cfg)
}
