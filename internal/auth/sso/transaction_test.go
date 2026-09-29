package sso

import (
	"bytes"
	"encoding/base64"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/bananaops/tracker/internal/auth"
)

var base64URLPattern = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

func testSecret(b byte) []byte {
	return bytes.Repeat([]byte{b}, auth.SessionSecretLength)
}

func TestNewTransaction(t *testing.T) {
	now := time.Now()

	tx1, err := NewTransaction("/locks", now)
	if err != nil {
		t.Fatalf("NewTransaction: %v", err)
	}
	tx2, err := NewTransaction("/locks", now)
	if err != nil {
		t.Fatalf("NewTransaction: %v", err)
	}

	for _, tc := range []struct {
		name string
		v    string
	}{
		{"tx1 state", tx1.State},
		{"tx1 nonce", tx1.Nonce},
		{"tx1 verifier", tx1.Verifier},
		{"tx2 state", tx2.State},
		{"tx2 nonce", tx2.Nonce},
		{"tx2 verifier", tx2.Verifier},
	} {
		if len(tc.v) != 43 {
			t.Fatalf("%s length = %d, want 43", tc.name, len(tc.v))
		}
		if !base64URLPattern.MatchString(tc.v) {
			t.Fatalf("%s = %q, want base64url characters only", tc.name, tc.v)
		}
	}

	if tx1.State == tx2.State {
		t.Fatal("State is the same across two calls")
	}
	if tx1.Nonce == tx2.Nonce {
		t.Fatal("Nonce is the same across two calls")
	}

	if tx1.IssuedAt != now.Unix() {
		t.Fatalf("IssuedAt = %d, want %d", tx1.IssuedAt, now.Unix())
	}

	txRedirect, err := NewTransaction("//evil", now)
	if err != nil {
		t.Fatalf("NewTransaction: %v", err)
	}
	if txRedirect.Redirect != "/" {
		t.Fatalf("Redirect = %q, want /", txRedirect.Redirect)
	}
}

func TestCodecRoundTrip(t *testing.T) {
	codec, err := NewTransactionCodec(testSecret(1))
	if err != nil {
		t.Fatalf("NewTransactionCodec: %v", err)
	}

	tx := Transaction{
		State:    "state-value-0123456789012345678901234",
		Nonce:    "nonce-value-0123456789012345678901234",
		Verifier: "verifier-value-01234567890123456789012",
		Redirect: "/locks",
		IssuedAt: time.Now().Unix(),
	}

	encoded, err := codec.Encode(tx)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	for _, secret := range []string{tx.State, tx.Nonce, tx.Verifier} {
		if strings.Contains(encoded, secret) {
			t.Fatalf("encoded value contains a cleartext secret %q", secret)
		}
		std := base64.StdEncoding.EncodeToString([]byte(secret))
		if strings.Contains(encoded, std) {
			t.Fatalf("encoded value contains a standard-base64 secret %q", std)
		}
	}

	got, err := codec.Decode(encoded)
	if err != nil {
		t.Fatalf("Decode: %v", err)
	}
	if got != tx {
		t.Fatalf("Decode = %+v, want %+v", got, tx)
	}
}

func TestCodecRejectsTampering(t *testing.T) {
	codec, err := NewTransactionCodec(testSecret(1))
	if err != nil {
		t.Fatalf("NewTransactionCodec: %v", err)
	}

	tx := Transaction{
		State:    "state-value-0123456789012345678901234",
		Nonce:    "nonce-value-0123456789012345678901234",
		Verifier: "verifier-value-01234567890123456789012",
		Redirect: "/locks",
		IssuedAt: time.Now().Unix(),
	}
	encoded, err := codec.Encode(tx)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	mutateMiddle := func(s string) string {
		mid := len(s) / 2
		b := []byte(s)
		if b[mid] == 'A' {
			b[mid] = 'B'
		} else {
			b[mid] = 'A'
		}
		return string(b)
	}

	cases := map[string]string{
		"modified middle char": mutateMiddle(encoded),
		"truncated":            encoded[:len(encoded)-4],
		"appended char":        encoded + "A",
		"empty":                "",
		"too long":             strings.Repeat("A", 2049),
		"invalid base64":       "not-valid-!!!base64!!!",
	}

	for name, value := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := codec.Decode(value)
			if !errors.Is(err, ErrTransactionInvalid) {
				t.Fatalf("Decode(%s) err = %v, want ErrTransactionInvalid", name, err)
			}
		})
	}
}

func TestCodecRejectsOtherSecret(t *testing.T) {
	encoder, err := NewTransactionCodec(testSecret(1))
	if err != nil {
		t.Fatalf("NewTransactionCodec: %v", err)
	}
	decoder, err := NewTransactionCodec(testSecret(2))
	if err != nil {
		t.Fatalf("NewTransactionCodec: %v", err)
	}

	tx := Transaction{
		State:    "state-value-0123456789012345678901234",
		Nonce:    "nonce-value-0123456789012345678901234",
		Verifier: "verifier-value-01234567890123456789012",
		Redirect: "/locks",
		IssuedAt: time.Now().Unix(),
	}
	encoded, err := encoder.Encode(tx)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	if _, err := decoder.Decode(encoded); !errors.Is(err, ErrTransactionInvalid) {
		t.Fatalf("Decode with the wrong secret err = %v, want ErrTransactionInvalid", err)
	}
}

func TestCodecExpiry(t *testing.T) {
	codec, err := NewTransactionCodec(testSecret(1))
	if err != nil {
		t.Fatalf("NewTransactionCodec: %v", err)
	}

	issuedAt := time.Now()
	tx := Transaction{
		State:    "state-value-0123456789012345678901234",
		Nonce:    "nonce-value-0123456789012345678901234",
		Verifier: "verifier-value-01234567890123456789012",
		Redirect: "/locks",
		IssuedAt: issuedAt.Unix(),
	}
	encoded, err := codec.Encode(tx)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	codec.Now = func() time.Time { return issuedAt.Add(9*time.Minute + 59*time.Second) }
	if _, err := codec.Decode(encoded); err != nil {
		t.Fatalf("Decode within TTL: %v, want nil", err)
	}

	codec.Now = func() time.Time { return issuedAt.Add(10*time.Minute + time.Second) }
	if _, err := codec.Decode(encoded); !errors.Is(err, ErrTransactionExpired) {
		t.Fatalf("Decode past TTL err = %v, want ErrTransactionExpired", err)
	}

	codec.Now = func() time.Time { return issuedAt.Add(-2 * time.Minute) }
	if _, err := codec.Decode(encoded); !errors.Is(err, ErrTransactionInvalid) {
		t.Fatalf("Decode with issuance in the future err = %v, want ErrTransactionInvalid", err)
	}
}

func TestCodecRejectsIncomplete(t *testing.T) {
	codec, err := NewTransactionCodec(testSecret(1))
	if err != nil {
		t.Fatalf("NewTransactionCodec: %v", err)
	}

	tx := Transaction{
		State:    "state-value-0123456789012345678901234",
		Nonce:    "nonce-value-0123456789012345678901234",
		Verifier: "",
		Redirect: "/locks",
		IssuedAt: time.Now().Unix(),
	}
	encoded, err := codec.Encode(tx)
	if err != nil {
		t.Fatalf("Encode: %v", err)
	}

	if _, err := codec.Decode(encoded); !errors.Is(err, ErrTransactionInvalid) {
		t.Fatalf("Decode with no verifier err = %v, want ErrTransactionInvalid", err)
	}
}

func TestNewTransactionCodecShortSecret(t *testing.T) {
	_, err := NewTransactionCodec(bytes.Repeat([]byte{1}, auth.SessionSecretLength-1))
	if err == nil {
		t.Fatal("NewTransactionCodec with a short secret succeeded, want an error")
	}
}

func TestTransactionCookieAttributes(t *testing.T) {
	cookie := TransactionCookie("v", true)
	if cookie.Name != TransactionCookieName {
		t.Fatalf("Name = %q, want %q", cookie.Name, TransactionCookieName)
	}
	if cookie.Path != auth.OIDCCallbackPath {
		t.Fatalf("Path = %q, want %q", cookie.Path, auth.OIDCCallbackPath)
	}
	if !cookie.HttpOnly {
		t.Fatal("HttpOnly = false, want true")
	}
	if !cookie.Secure {
		t.Fatal("Secure = false, want true")
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("SameSite = %v, want SameSiteLaxMode", cookie.SameSite)
	}
	if cookie.MaxAge != 600 {
		t.Fatalf("MaxAge = %d, want 600", cookie.MaxAge)
	}

	insecure := TransactionCookie("v", false)
	if insecure.Secure {
		t.Fatal("Secure = true, want false")
	}

	clear := ClearTransactionCookie(true)
	if clear.Name != TransactionCookieName {
		t.Fatalf("Name = %q, want %q", clear.Name, TransactionCookieName)
	}
	if clear.Path != auth.OIDCCallbackPath {
		t.Fatalf("Path = %q, want %q", clear.Path, auth.OIDCCallbackPath)
	}
	if clear.MaxAge != -1 {
		t.Fatalf("MaxAge = %d, want -1", clear.MaxAge)
	}
	if clear.Value != "" {
		t.Fatalf("Value = %q, want empty", clear.Value)
	}
}
