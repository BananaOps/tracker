package ssotest

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

// randomVerifier returns a 43-character base64url string suitable as a PKCE
// code_verifier.
func randomVerifier(t testing.TB) string {
	t.Helper()
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		t.Fatalf("rand.Read: %v", err)
	}
	v := base64.RawURLEncoding.EncodeToString(b)
	if len(v) != 43 {
		t.Fatalf("verifier length = %d, want 43", len(v))
	}
	return v
}

func challengeFor(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// getJSON issues a GET request via http.NewRequest+Do (rather than http.Get
// with a variable URL) and decodes the JSON response body into v.
func getJSON(t testing.TB, rawURL string, v any) {
	t.Helper()
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, rawURL, nil)
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET %s: %v", rawURL, err)
	}
	defer res.Body.Close()
	if err := json.NewDecoder(res.Body).Decode(v); err != nil {
		t.Fatalf("decode %s: %v", rawURL, err)
	}
}

func TestDiscoveryAndKeys(t *testing.T) {
	idp := New(t)

	var doc struct {
		Issuer  string `json:"issuer"`
		JWKSURI string `json:"jwks_uri"`
	}
	getJSON(t, idp.URL+"/.well-known/openid-configuration", &doc)
	if doc.Issuer != idp.URL {
		t.Fatalf("issuer = %q, want %q", doc.Issuer, idp.URL)
	}

	var jwks struct {
		Keys []struct {
			Kid string `json:"kid"`
		} `json:"keys"`
	}
	getJSON(t, doc.JWKSURI, &jwks)
	if len(jwks.Keys) != 1 || jwks.Keys[0].Kid != KeyID {
		t.Fatalf("jwks keys = %+v, want one key with kid %q", jwks.Keys, KeyID)
	}
}

// authorizeAndToken drives the full authorization code flow with PKCE and
// returns the token endpoint's raw JSON response and status code.
func authorizeAndToken(t testing.TB, idp *IdP, verifier string, extra url.Values) (*http.Response, map[string]any) {
	t.Helper()

	challenge := challengeFor(verifier)

	authURL := idp.URL + "/authorize?" + url.Values{
		"client_id":             {idp.ClientID},
		"redirect_uri":          {"http://tracker.test/cb"},
		"response_type":         {"code"},
		"scope":                 {"openid profile"},
		"state":                 {"st"},
		"nonce":                 {"nn"},
		"code_challenge":        {challenge},
		"code_challenge_method": {"S256"},
	}.Encode()

	loc := idp.Authorize(t, authURL)

	if loc.Query().Get("state") != "st" {
		t.Fatalf("state = %q, want %q", loc.Query().Get("state"), "st")
	}
	code := loc.Query().Get("code")
	if code == "" {
		t.Fatalf("no code in redirect: %s", loc)
	}

	form := url.Values{
		"grant_type":   {"authorization_code"},
		"code":         {code},
		"redirect_uri": {"http://tracker.test/cb"},
	}
	if extra.Get("code_verifier") != "" {
		form.Set("code_verifier", extra.Get("code_verifier"))
	} else {
		form.Set("code_verifier", verifier)
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, idp.URL+"/token", strings.NewReader(form.Encode()))
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if extra.Get("client_secret") != "" {
		req.SetBasicAuth(idp.ClientID, extra.Get("client_secret"))
	} else {
		req.SetBasicAuth(idp.ClientID, idp.ClientSecret)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("POST token: %v", err)
	}
	defer res.Body.Close()

	var body map[string]any
	if res.Header.Get("Content-Type") != "" {
		if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
			t.Fatalf("decode token response: %v", err)
		}
	}
	return res, body
}

func TestAuthorizationCodeFlowWithPKCE(t *testing.T) {
	idp := New(t)
	verifier := randomVerifier(t)

	res, body := authorizeAndToken(t, idp, verifier, url.Values{})
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200, body = %v", res.StatusCode, body)
	}

	idToken, _ := body["id_token"].(string)
	if idToken == "" {
		t.Fatalf("no id_token in response: %v", body)
	}

	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(idToken, claims, func(*jwt.Token) (interface{}, error) {
		return &idp.key.PublicKey, nil
	})
	if err != nil {
		t.Fatalf("parse id_token: %v", err)
	}

	if claims["iss"] != idp.URL {
		t.Errorf("iss = %v, want %v", claims["iss"], idp.URL)
	}
	if claims["aud"] != idp.ClientID {
		t.Errorf("aud = %v, want %v", claims["aud"], idp.ClientID)
	}
	if claims["nonce"] != "nn" {
		t.Errorf("nonce = %v, want %q", claims["nonce"], "nn")
	}
	if claims["preferred_username"] != "alice" {
		t.Errorf("preferred_username = %v, want %q", claims["preferred_username"], "alice")
	}

	if got := idp.TokenRequests(); got != 1 {
		t.Errorf("TokenRequests() = %d, want 1", got)
	}
}

func TestTokenRejectsWrongVerifier(t *testing.T) {
	idp := New(t)
	verifier := randomVerifier(t)

	res, body := authorizeAndToken(t, idp, verifier, url.Values{"code_verifier": {randomVerifier(t)}})
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400, body = %v", res.StatusCode, body)
	}
	if body["error"] != "invalid_grant" {
		t.Errorf("error = %v, want %q", body["error"], "invalid_grant")
	}
}

func TestCodeIsSingleUse(t *testing.T) {
	idp := New(t)
	verifier := randomVerifier(t)
	challenge := challengeFor(verifier)

	authURL := idp.URL + "/authorize?" + url.Values{
		"client_id":             {idp.ClientID},
		"redirect_uri":          {"http://tracker.test/cb"},
		"response_type":         {"code"},
		"scope":                 {"openid"},
		"state":                 {"st"},
		"code_challenge":        {challenge},
		"code_challenge_method": {"S256"},
	}.Encode()
	loc := idp.Authorize(t, authURL)
	code := loc.Query().Get("code")

	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {"http://tracker.test/cb"},
		"code_verifier": {verifier},
	}
	post := func() *http.Response {
		req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, idp.URL+"/token", strings.NewReader(form.Encode()))
		if err != nil {
			t.Fatalf("NewRequest: %v", err)
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.SetBasicAuth(idp.ClientID, idp.ClientSecret)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("POST token: %v", err)
		}
		return res
	}

	first := post()
	first.Body.Close()
	if first.StatusCode != http.StatusOK {
		t.Fatalf("first status = %d, want 200", first.StatusCode)
	}

	second := post()
	defer second.Body.Close()
	if second.StatusCode != http.StatusBadRequest {
		t.Fatalf("second status = %d, want 400", second.StatusCode)
	}
	var body map[string]any
	if err := json.NewDecoder(second.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body["error"] != "invalid_grant" {
		t.Errorf("error = %v, want %q", body["error"], "invalid_grant")
	}
}

func TestTokenRejectsWrongClientSecret(t *testing.T) {
	idp := New(t)
	verifier := randomVerifier(t)

	res, body := authorizeAndToken(t, idp, verifier, url.Values{"client_secret": {"wrong-secret"}})
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401, body = %v", res.StatusCode, body)
	}
	if body["error"] != "invalid_client" {
		t.Errorf("error = %v, want %q", body["error"], "invalid_client")
	}
}

func TestAuthorizeRequiresS256(t *testing.T) {
	idp := New(t)

	authURL := idp.URL + "/authorize?" + url.Values{
		"client_id":     {idp.ClientID},
		"redirect_uri":  {"http://tracker.test/cb"},
		"response_type": {"code"},
		"scope":         {"openid"},
		"state":         {"st"},
	}.Encode()

	loc := idp.Authorize(t, authURL)
	if loc.Query().Get("error") != "invalid_request" {
		t.Errorf("error = %v, want %q", loc.Query().Get("error"), "invalid_request")
	}
}

func TestAuthorizeError(t *testing.T) {
	idp := New(t)
	idp.SetAuthorizeError("access_denied", "<b>nope</b>")

	authURL := idp.URL + "/authorize?" + url.Values{
		"client_id":             {idp.ClientID},
		"redirect_uri":          {"http://tracker.test/cb"},
		"response_type":         {"code"},
		"scope":                 {"openid"},
		"state":                 {"st"},
		"code_challenge":        {"c"},
		"code_challenge_method": {"S256"},
	}.Encode()

	loc := idp.Authorize(t, authURL)
	if loc.Query().Get("error") != "access_denied" {
		t.Errorf("error = %v, want %q", loc.Query().Get("error"), "access_denied")
	}
	if loc.Query().Get("state") != "st" {
		t.Errorf("state = %v, want %q", loc.Query().Get("state"), "st")
	}
}

func TestSigningModes(t *testing.T) {
	idp := New(t)
	verifier := randomVerifier(t)

	idp.SetSigning(SignNone)
	_, body := authorizeAndToken(t, idp, verifier, url.Values{})
	idToken, _ := body["id_token"].(string)
	if idToken == "" {
		t.Fatalf("no id_token: %v", body)
	}
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		t.Fatalf("id_token has %d parts, want 3", len(parts))
	}
	headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		t.Fatalf("decode header: %v", err)
	}
	var header struct {
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(headerJSON, &header); err != nil {
		t.Fatalf("unmarshal header: %v", err)
	}
	if header.Alg != "none" {
		t.Errorf("alg = %q, want %q", header.Alg, "none")
	}

	idp.SetSigning(SignForeignKey)
	_, body2 := authorizeAndToken(t, idp, verifier, url.Values{})
	idToken2, _ := body2["id_token"].(string)
	if idToken2 == "" {
		t.Fatalf("no id_token: %v", body2)
	}
	_, err = jwt.Parse(idToken2, func(*jwt.Token) (interface{}, error) {
		return &idp.key.PublicKey, nil
	})
	if err == nil {
		t.Fatal("expected signature verification to fail for a foreign key token")
	}
}

func TestMutatorAndUser(t *testing.T) {
	idp := New(t)
	idp.SetUser(User{
		Subject: "user-42",
		Claims: map[string]any{
			"preferred_username": "bob",
			"email":              "bob@example.com",
			"name":               "Bob Example",
			"groups":             []string{"admins"},
		},
	})
	idp.SetTokenMutator(func(claims map[string]any) {
		claims["aud"] = "other"
	})

	verifier := randomVerifier(t)
	res, body := authorizeAndToken(t, idp, verifier, url.Values{})
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200, body = %v", res.StatusCode, body)
	}
	idToken, _ := body["id_token"].(string)

	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(idToken, claims, func(*jwt.Token) (interface{}, error) {
		return &idp.key.PublicKey, nil
	})
	if err != nil {
		t.Fatalf("parse id_token: %v", err)
	}
	if claims["sub"] != "user-42" {
		t.Errorf("sub = %v, want %q", claims["sub"], "user-42")
	}
	if claims["preferred_username"] != "bob" {
		t.Errorf("preferred_username = %v, want %q", claims["preferred_username"], "bob")
	}
	if claims["aud"] != "other" {
		t.Errorf("aud = %v, want %q (mutator applied last)", claims["aud"], "other")
	}
}
