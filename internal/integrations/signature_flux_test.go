package integrations

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"hash"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func fluxMAC(newHash func() hash.Hash, key, body []byte) string {
	mac := hmac.New(newHash, key)
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func TestSignFlux(t *testing.T) {
	key := []byte(strings.Repeat("k", 32))
	body := []byte(`{"reason":"ReconciliationSucceeded"}`)

	tests := []struct {
		alg     string
		newHash func() hash.Hash
	}{
		{"sha224", sha256.New224},
		{"sha256", sha256.New},
		{"sha384", sha512.New384},
		{"sha512", sha512.New},
	}

	for _, tt := range tests {
		t.Run(tt.alg, func(t *testing.T) {
			want := tt.alg + "=" + fluxMAC(tt.newHash, key, body)
			got, err := SignFlux(tt.alg, key, body)
			assert.NoError(t, err)
			assert.Equal(t, want, got)
		})
	}

	t.Run("unsupported algorithm", func(t *testing.T) {
		_, err := SignFlux("sha1", key, body)
		assert.Error(t, err)
	})
}

func TestVerifyFluxSignature(t *testing.T) {
	key := []byte(strings.Repeat("k", 32))
	body := []byte(`{"reason":"ReconciliationSucceeded"}`)
	otherBody := []byte(`{"reason":"ReconciliationFailed"}`)
	otherKey := []byte(strings.Repeat("o", 32))

	sha256Hex := fluxMAC(sha256.New, key, body)

	tests := []struct {
		name    string
		key     []byte
		header  string
		body    []byte
		wantErr error
	}{
		{"sha224", key, "sha224=" + fluxMAC(sha256.New224, key, body), body, nil},
		{"sha256", key, "sha256=" + sha256Hex, body, nil},
		{"sha384", key, "sha384=" + fluxMAC(sha512.New384, key, body), body, nil},
		{"sha512", key, "sha512=" + fluxMAC(sha512.New, key, body), body, nil},
		{"algorithm name case insensitive", key, "SHA256=" + sha256Hex, body, nil},
		{"algorithm too weak", key, "sha1=" + sha256Hex, body, ErrInvalidSignature},
		{"algorithm unknown", key, "md5=00", body, ErrInvalidSignature},
		{"hex value invalid", key, "sha256=zz", body, ErrInvalidSignature},
		{"no separator", key, "sha256", body, ErrInvalidSignature},
		{"wrong key", otherKey, "sha256=" + sha256Hex, body, ErrInvalidSignature},
		{"body modified", key, "sha256=" + sha256Hex, otherBody, ErrInvalidSignature},
		{"missing header", key, "", body, ErrMissingSignature},
		{"nil key", nil, "sha256=" + sha256Hex, body, ErrInvalidSignature},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := VerifyFluxSignature(tt.key, tt.header, tt.body)
			if tt.wantErr == nil {
				assert.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, tt.wantErr)
			}
		})
	}
}
