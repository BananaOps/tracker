package integrations

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"hash"
	"strings"
)

const HeaderFluxSignature = "X-Signature"

// fluxHashes are the HMAC algorithms the Flux generic-hmac provider can use.
var fluxHashes = map[string]func() hash.Hash{
	"sha224": sha256.New224,
	"sha256": sha256.New,
	"sha384": sha512.New384,
	"sha512": sha512.New,
}

// SignFlux returns the X-Signature value Flux sends for body.
func SignFlux(alg string, key, body []byte) (string, error) {
	newHash, ok := fluxHashes[alg]
	if !ok {
		return "", fmt.Errorf("unsupported algorithm %q", alg)
	}
	mac := hmac.New(newHash, key)
	_, _ = mac.Write(body)
	return alg + "=" + hex.EncodeToString(mac.Sum(nil)), nil
}

// VerifyFluxSignature checks X-Signature: <alg>=<hex> over the raw body.
func VerifyFluxSignature(key []byte, header string, body []byte) error {
	if len(key) == 0 {
		return ErrInvalidSignature
	}
	header = strings.TrimSpace(header)
	if header == "" {
		return ErrMissingSignature
	}
	alg, value, ok := strings.Cut(header, "=")
	if !ok {
		return ErrInvalidSignature
	}
	newHash, ok := fluxHashes[strings.ToLower(strings.TrimSpace(alg))]
	if !ok {
		return ErrInvalidSignature
	}
	got, err := hex.DecodeString(strings.TrimSpace(value))
	if err != nil {
		return ErrInvalidSignature
	}
	mac := hmac.New(newHash, key)
	_, _ = mac.Write(body)
	if !hmac.Equal(got, mac.Sum(nil)) {
		return ErrInvalidSignature
	}
	return nil
}
