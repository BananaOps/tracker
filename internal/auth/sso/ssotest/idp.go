// Package ssotest runs an in-process OpenID Connect provider for tests. It
// is imported by tests only and never linked into the tracker binary.
package ssotest

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// KeyID is the kid published in the JWKS and set on every signed token
// header, including tokens signed with the foreign, unpublished key.
const KeyID = "ssotest-key"

// SigningMode selects how the next id_token is signed.
type SigningMode int

const (
	// SignRS256 produces a valid signature with the published key.
	SignRS256 SigningMode = iota
	// SignNone produces an unsigned token, alg "none".
	SignNone
	// SignForeignKey produces an RS256 token signed with a key absent
	// from the JWKS, reusing the same kid.
	SignForeignKey
	// SignHS256PublicKey produces an HS256 token whose HMAC secret is the
	// PEM encoded published public key: the algorithm confusion attack.
	SignHS256PublicKey
)

// User is the identity returned by the next authorizations.
type User struct {
	Subject string
	// Claims is merged into the id_token: preferred_username, email,
	// name, groups...
	Claims map[string]any
}

// authState is the server-side memory of a pending authorization code.
type authState struct {
	challenge   string
	nonce       string
	redirectURI string
	user        User
}

// IdP is an in-process OpenID Connect provider for tests.
type IdP struct {
	// URL is the issuer, http://127.0.0.1:<port>, no trailing slash.
	URL          string
	ClientID     string
	ClientSecret string

	server *httptest.Server

	key     *rsa.PrivateKey // published in the JWKS
	foreign *rsa.PrivateKey // never published, same kid

	mu            sync.Mutex
	user          User
	signing       SigningMode
	mutator       func(claims map[string]any)
	authErrCode   string
	authErrDesc   string
	codes         map[string]authState
	tokenRequests int
	lastIDToken   string
}

// New starts the server and registers t.Cleanup(Close).
func New(t testing.TB) *IdP {
	t.Helper()

	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate signing key: %v", err)
	}
	foreign, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate foreign key: %v", err)
	}

	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		t.Fatalf("generate client secret: %v", err)
	}

	idp := &IdP{
		ClientID:     "tracker-test",
		ClientSecret: base64.RawURLEncoding.EncodeToString(secret),
		key:          key,
		foreign:      foreign,
		user: User{
			Subject: "user-1",
			Claims: map[string]any{
				"preferred_username": "alice",
				"email":              "alice@example.com",
				"name":               "Alice Example",
				"groups":             []string{},
			},
		},
		codes: make(map[string]authState),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /.well-known/openid-configuration", idp.handleDiscovery)
	mux.HandleFunc("GET /keys", idp.handleKeys)
	mux.HandleFunc("GET /authorize", idp.handleAuthorize)
	mux.HandleFunc("POST /token", idp.handleToken)

	idp.server = httptest.NewServer(mux)
	idp.URL = idp.server.URL
	t.Cleanup(idp.Close)

	return idp
}

// Close shuts the server down.
func (i *IdP) Close() {
	i.server.Close()
}

// SetUser sets the identity returned by the next authorizations.
func (i *IdP) SetUser(u User) {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.user = u
}

// SetSigning selects how the next id_token is signed.
func (i *IdP) SetSigning(m SigningMode) {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.signing = m
}

// SetTokenMutator sets a function applied to the id_token claims last,
// right before signing.
func (i *IdP) SetTokenMutator(f func(claims map[string]any)) {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.mutator = f
}

// SetAuthorizeError makes /authorize redirect with error=code instead of
// running the normal flow. An empty code disables it.
func (i *IdP) SetAuthorizeError(code, description string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.authErrCode = code
	i.authErrDesc = description
}

// TokenRequests returns how many requests /token has received.
func (i *IdP) TokenRequests() int {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.tokenRequests
}

// LastIDToken returns the id_token issued by the last successful /token
// request.
func (i *IdP) LastIDToken() string {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.lastIDToken
}

// Authorize plays the browser at the IdP: it issues a GET on authURL
// without following the redirect and returns the parsed Location (the
// Tracker callback URL).
func (i *IdP) Authorize(t testing.TB, authURL string) *url.URL {
	t.Helper()

	client := &http.Client{
		Timeout: 5 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	req, err := http.NewRequest(http.MethodGet, authURL, nil) //nolint:noctx // test-only, one-shot request against a loopback test server
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}

	res, err := client.Do(req) // #nosec G107 -- test identity provider on loopback, never linked into the binary
	if err != nil {
		t.Fatalf("GET %s: %v", authURL, err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusFound {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusFound)
	}

	loc, err := url.Parse(res.Header.Get("Location"))
	if err != nil {
		t.Fatalf("parse Location: %v", err)
	}
	return loc
}

func (i *IdP) handleDiscovery(w http.ResponseWriter, _ *http.Request) {
	doc := map[string]any{
		"issuer":                                i.URL,
		"authorization_endpoint":                i.URL + "/authorize",
		"token_endpoint":                        i.URL + "/token",
		"jwks_uri":                              i.URL + "/keys",
		"response_types_supported":              []string{"code"},
		"subject_types_supported":               []string{"public"},
		"id_token_signing_alg_values_supported": []string{"RS256"},
		"code_challenge_methods_supported":      []string{"S256"},
		"token_endpoint_auth_methods_supported": []string{"client_secret_basic", "client_secret_post"},
		"scopes_supported":                      []string{"openid", "profile", "email", "groups"},
	}
	writeJSON(w, http.StatusOK, doc)
}

func (i *IdP) handleKeys(w http.ResponseWriter, _ *http.Request) {
	n := base64.RawURLEncoding.EncodeToString(i.key.N.Bytes())
	e := base64.RawURLEncoding.EncodeToString(big.NewInt(int64(i.key.E)).Bytes())

	jwks := map[string]any{
		"keys": []map[string]any{
			{
				"kty": "RSA",
				"use": "sig",
				"alg": "RS256",
				"kid": KeyID,
				"n":   n,
				"e":   e,
			},
		},
	}
	writeJSON(w, http.StatusOK, jwks)
}

func (i *IdP) handleAuthorize(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	redirectURI := q.Get("redirect_uri")
	state := q.Get("state")

	i.mu.Lock()
	errCode, errDesc := i.authErrCode, i.authErrDesc
	i.mu.Unlock()

	if errCode != "" {
		redirectWithError(w, r, redirectURI, state, errCode, errDesc)
		return
	}

	valid := q.Get("response_type") == "code" &&
		q.Get("client_id") == i.ClientID &&
		redirectURI != "" &&
		scopeContains(q.Get("scope"), "openid") &&
		q.Get("code_challenge_method") == "S256" &&
		q.Get("code_challenge") != ""

	if !valid {
		redirectWithError(w, r, redirectURI, state, "invalid_request", "missing or invalid authorization request parameter")
		return
	}

	code, err := randomToken(32)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	i.mu.Lock()
	i.codes[code] = authState{
		challenge:   q.Get("code_challenge"),
		nonce:       q.Get("nonce"),
		redirectURI: redirectURI,
		user:        i.user,
	}
	i.mu.Unlock()

	dest, err := url.Parse(redirectURI)
	if err != nil {
		http.Error(w, "invalid redirect_uri", http.StatusBadRequest)
		return
	}
	dq := dest.Query()
	dq.Set("code", code)
	dq.Set("state", state)
	dest.RawQuery = dq.Encode()

	http.Redirect(w, r, dest.String(), http.StatusFound) // #nosec G710 -- test identity provider on loopback, never linked into the binary; redirects to the client-supplied redirect_uri as a real IdP authorize endpoint does
}

func redirectWithError(w http.ResponseWriter, r *http.Request, redirectURI, state, code, description string) {
	if redirectURI == "" {
		http.Error(w, code, http.StatusBadRequest)
		return
	}
	dest, err := url.Parse(redirectURI)
	if err != nil {
		http.Error(w, "invalid redirect_uri", http.StatusBadRequest)
		return
	}
	q := dest.Query()
	q.Set("error", code)
	q.Set("error_description", description)
	q.Set("state", state)
	dest.RawQuery = q.Encode()
	http.Redirect(w, r, dest.String(), http.StatusFound) // #nosec G710 -- test identity provider on loopback, never linked into the binary; redirects to the client-supplied redirect_uri as a real IdP authorize endpoint does
}

func (i *IdP) handleToken(w http.ResponseWriter, r *http.Request) {
	i.mu.Lock()
	i.tokenRequests++
	i.mu.Unlock()

	if err := r.ParseForm(); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}

	if !i.authenticateClient(r) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_client"})
		return
	}

	if r.PostForm.Get("grant_type") != "authorization_code" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unsupported_grant_type"})
		return
	}

	code := r.PostForm.Get("code")

	i.mu.Lock()
	state, ok := i.codes[code]
	delete(i.codes, code) // single use, even if a later check fails
	i.mu.Unlock()

	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_grant"})
		return
	}

	if r.PostForm.Get("redirect_uri") != state.redirectURI {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_grant"})
		return
	}

	sum := sha256.Sum256([]byte(r.PostForm.Get("code_verifier")))
	computed := base64.RawURLEncoding.EncodeToString(sum[:])
	if subtle.ConstantTimeCompare([]byte(computed), []byte(state.challenge)) != 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_grant"})
		return
	}

	idToken, err := i.signIDToken(state)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	accessToken, err := randomToken(32)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	i.mu.Lock()
	i.lastIDToken = idToken
	i.mu.Unlock()

	writeJSON(w, http.StatusOK, map[string]any{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_in":   300,
		"id_token":     idToken,
	})
}

// authenticateClient checks the client_id/client_secret pair, either from
// HTTP Basic auth or from the request body, with a constant-time
// comparison of the secret.
func (i *IdP) authenticateClient(r *http.Request) bool {
	var clientID, clientSecret string

	if basicID, basicSecret, ok := r.BasicAuth(); ok {
		unescapedID, err := url.QueryUnescape(basicID)
		if err != nil {
			return false
		}
		unescapedSecret, err := url.QueryUnescape(basicSecret)
		if err != nil {
			return false
		}
		clientID, clientSecret = unescapedID, unescapedSecret
	} else {
		clientID = r.PostForm.Get("client_id")
		clientSecret = r.PostForm.Get("client_secret")
	}

	if subtle.ConstantTimeCompare([]byte(clientID), []byte(i.ClientID)) != 1 {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(clientSecret), []byte(i.ClientSecret)) == 1
}

func (i *IdP) signIDToken(state authState) (string, error) {
	now := time.Now()

	i.mu.Lock()
	signing := i.signing
	mutator := i.mutator
	i.mu.Unlock()

	claims := map[string]any{
		"iss": i.URL,
		"sub": state.user.Subject,
		"aud": i.ClientID,
		"iat": now.Unix(),
		"exp": now.Add(5 * time.Minute).Unix(),
	}
	if state.nonce != "" {
		claims["nonce"] = state.nonce
	}
	for k, v := range state.user.Claims {
		claims[k] = v
	}
	if mutator != nil {
		mutator(claims)
	}

	switch signing {
	case SignNone:
		token := jwt.NewWithClaims(jwt.SigningMethodNone, jwt.MapClaims(claims))
		token.Header["kid"] = KeyID
		return token.SignedString(jwt.UnsafeAllowNoneSignatureType)
	case SignForeignKey:
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims(claims))
		token.Header["kid"] = KeyID
		return token.SignedString(i.foreign)
	case SignHS256PublicKey:
		der, err := x509.MarshalPKIXPublicKey(&i.key.PublicKey)
		if err != nil {
			return "", fmt.Errorf("marshal public key: %w", err)
		}
		secret := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: der})
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims(claims))
		token.Header["kid"] = KeyID
		return token.SignedString(secret)
	default:
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims(claims))
		token.Header["kid"] = KeyID
		return token.SignedString(i.key)
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func scopeContains(scope, want string) bool {
	for _, s := range strings.Fields(scope) {
		if s == want {
			return true
		}
	}
	return false
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate random token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
