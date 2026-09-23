package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
)

const (
	apiKeyMarker    = "trk_"
	apiKeyPrefixLen = 8
	apiKeySecretLen = 32
	apiKeyAlphabet  = "abcdefghijklmnopqrstuvwxyz0123456789"
)

// GeneratedAPIKey is a freshly created key. Secret is shown once to the user,
// only Prefix and Hash are persisted.
type GeneratedAPIKey struct {
	Secret string
	Prefix string
	Hash   string
}

// GenerateAPIKey creates a key formatted as trk_<prefix>_<random>.
func GenerateAPIKey() (GeneratedAPIKey, error) {
	prefix := make([]byte, apiKeyPrefixLen)
	for i := range prefix {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(apiKeyAlphabet))))
		if err != nil {
			return GeneratedAPIKey{}, fmt.Errorf("generate prefix: %w", err)
		}
		prefix[i] = apiKeyAlphabet[n.Int64()]
	}
	raw := make([]byte, apiKeySecretLen)
	if _, err := rand.Read(raw); err != nil {
		return GeneratedAPIKey{}, fmt.Errorf("generate secret: %w", err)
	}
	secret := apiKeyMarker + string(prefix) + "_" + base64.RawURLEncoding.EncodeToString(raw)
	return GeneratedAPIKey{Secret: secret, Prefix: string(prefix), Hash: HashAPIKey(secret)}, nil
}

// IsAPIKey reports whether the token looks like an API key rather than a session token.
func IsAPIKey(token string) bool {
	return strings.HasPrefix(token, apiKeyMarker)
}

// ParseAPIKeyPrefix extracts the lookup prefix from a full secret.
func ParseAPIKeyPrefix(secret string) (string, bool) {
	if !IsAPIKey(secret) {
		return "", false
	}
	rest := secret[len(apiKeyMarker):]
	sep := strings.IndexByte(rest, '_')
	if sep != apiKeyPrefixLen || len(rest) <= sep+1 {
		return "", false
	}
	return rest[:sep], true
}

// HashAPIKey returns the hex SHA-256 of the full secret.
func HashAPIKey(secret string) string {
	sum := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(sum[:])
}

// APIKeyMatches compares a stored hash with a presented secret in constant time.
func APIKeyMatches(hash, secret string) bool {
	return subtle.ConstantTimeCompare([]byte(hash), []byte(HashAPIKey(secret))) == 1
}
