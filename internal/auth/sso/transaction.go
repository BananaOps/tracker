package sso

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hkdf"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"golang.org/x/oauth2"

	"github.com/bananaops/tracker/internal/auth"
)

const (
	// TransactionCookieName carries the sealed OIDC login transaction.
	TransactionCookieName = "tracker_oidc"
	// TransactionTTL is how long a transaction is accepted after issuance.
	TransactionTTL = 10 * time.Minute

	// hkdfInfo binds the derived key to this specific use, separating it
	// from any other key derived from the same session secret.
	hkdfInfo = "tracker oidc transaction v1"
	// maxTransactionCookieLength bounds Decode's input before any decoding
	// work happens.
	maxTransactionCookieLength = 2048
	// futureSkew is how far into the future IssuedAt may be before a
	// transaction is rejected as invalid, to tolerate minor clock drift.
	futureSkew = time.Minute

	randomTokenBytes = 32
)

var (
	// ErrTransactionInvalid covers every rejection except a well-formed,
	// correctly decrypted transaction that is simply too old: tampering,
	// truncation, wrong key, wrong AAD, malformed input, and an issuance
	// timestamp too far in the future. Kept generic so decoding never gives
	// an attacker an oracle.
	ErrTransactionInvalid = errors.New("invalid oidc transaction")
	// ErrTransactionExpired means the transaction decrypted and parsed
	// correctly but is older than TransactionTTL.
	ErrTransactionExpired = errors.New("expired oidc transaction")
)

// Transaction is the state carried across the redirect to the identity
// provider and back: the CSRF state, the id_token nonce, the PKCE code
// verifier, where to send the browser after login, and when it was issued.
// JSON tags are kept short since the marshaled form is encrypted, not
// displayed.
type Transaction struct {
	State    string `json:"s"`
	Nonce    string `json:"n"`
	Verifier string `json:"v"`
	Redirect string `json:"r"`
	IssuedAt int64  `json:"t"`
}

// NewTransaction builds a fresh transaction: random state and nonce, a PKCE
// code verifier, and redirect sanitized through SafeRedirect.
func NewTransaction(redirect string, now time.Time) (Transaction, error) {
	state, err := randomToken()
	if err != nil {
		return Transaction{}, fmt.Errorf("generate state: %w", err)
	}
	nonce, err := randomToken()
	if err != nil {
		return Transaction{}, fmt.Errorf("generate nonce: %w", err)
	}
	return Transaction{
		State:    state,
		Nonce:    nonce,
		Verifier: oauth2.GenerateVerifier(),
		Redirect: SafeRedirect(redirect),
		IssuedAt: now.Unix(),
	}, nil
}

// randomToken returns a 32 byte crypto/rand value, base64url encoded
// without padding.
func randomToken() (string, error) {
	b := make([]byte, randomTokenBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// TransactionCodec seals and opens the transaction cookie with AES-256-GCM,
// under a key derived from the session secret so no new secret needs to be
// provisioned.
type TransactionCodec struct {
	// Now is overridable in tests.
	Now func() time.Time

	aead cipher.AEAD
}

// NewTransactionCodec derives the encryption key from sessionSecret with
// HKDF-SHA256. sessionSecret must be at least auth.SessionSecretLength
// bytes, the same requirement as the session HMAC secret.
func NewTransactionCodec(sessionSecret []byte) (*TransactionCodec, error) {
	if len(sessionSecret) < auth.SessionSecretLength {
		return nil, fmt.Errorf("session secret must be at least %d bytes", auth.SessionSecretLength)
	}

	key, err := hkdf.Key(sha256.New, sessionSecret, nil, hkdfInfo, 32)
	if err != nil {
		return nil, fmt.Errorf("derive transaction key: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("build cipher: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("build AEAD: %w", err)
	}

	return &TransactionCodec{Now: time.Now, aead: aead}, nil
}

// Encode seals t into an opaque, base64url value suitable for a cookie.
// The cookie name is bound in as associated data, so a value cannot be
// replayed under a different cookie.
func (c *TransactionCodec) Encode(t Transaction) (string, error) {
	plain, err := json.Marshal(t)
	if err != nil {
		return "", fmt.Errorf("marshal transaction: %w", err)
	}

	nonce := make([]byte, c.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("generate nonce: %w", err)
	}

	sealed := c.aead.Seal(nonce, nonce, plain, []byte(TransactionCookieName))
	return base64.RawURLEncoding.EncodeToString(sealed), nil
}

// Decode opens a value produced by Encode. Every rejection short of a
// verified-but-too-old transaction collapses to ErrTransactionInvalid, with
// no detail that would let an attacker distinguish tampering from a bad key
// from a malformed value; nothing decrypted or partially decrypted is ever
// included in the error.
func (c *TransactionCodec) Decode(value string) (Transaction, error) {
	if value == "" || len(value) > maxTransactionCookieLength {
		return Transaction{}, ErrTransactionInvalid
	}

	sealed, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return Transaction{}, ErrTransactionInvalid
	}

	nonceSize := c.aead.NonceSize()
	if len(sealed) < nonceSize {
		return Transaction{}, ErrTransactionInvalid
	}
	nonce, ciphertext := sealed[:nonceSize], sealed[nonceSize:]

	plain, err := c.aead.Open(nil, nonce, ciphertext, []byte(TransactionCookieName))
	if err != nil {
		return Transaction{}, ErrTransactionInvalid
	}

	var t Transaction
	if err := json.Unmarshal(plain, &t); err != nil {
		return Transaction{}, ErrTransactionInvalid
	}

	if t.State == "" || t.Nonce == "" || t.Verifier == "" {
		return Transaction{}, ErrTransactionInvalid
	}

	issued := time.Unix(t.IssuedAt, 0)
	now := c.Now()
	if issued.After(now.Add(futureSkew)) {
		return Transaction{}, ErrTransactionInvalid
	}
	if now.Sub(issued) > TransactionTTL {
		return Transaction{}, ErrTransactionExpired
	}

	return t, nil
}

// TransactionCookie builds the cookie carrying a sealed transaction value.
// Scoped to the callback path since only the callback handler needs it.
func TransactionCookie(value string, secure bool) *http.Cookie {
	// Lax, not Strict: the identity provider sends the browser back with a
	// top level cross-site GET, which Strict would strip the cookie from.
	return &http.Cookie{ // #nosec G124 -- Secure is configuration driven, HttpOnly and SameSite are set
		Name:     TransactionCookieName,
		Value:    value,
		Path:     auth.OIDCCallbackPath,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(TransactionTTL.Seconds()),
	}
}

// ClearTransactionCookie builds the cookie that removes the transaction.
func ClearTransactionCookie(secure bool) *http.Cookie {
	return &http.Cookie{ // #nosec G124 -- Secure is configuration driven, HttpOnly and SameSite are set
		Name:     TransactionCookieName,
		Value:    "",
		Path:     auth.OIDCCallbackPath,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	}
}
