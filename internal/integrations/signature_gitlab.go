package integrations

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	HeaderWebhookID        = "webhook-id"
	HeaderWebhookTimestamp = "webhook-timestamp"
	HeaderWebhookSignature = "webhook-signature"
	HeaderGitLabToken      = "X-Gitlab-Token" // #nosec G101 -- header name, not a credential
)

// SignGitLab returns the "v1,<base64>" signature GitLab computes for a delivery.
func SignGitLab(key []byte, id, timestamp string, body []byte) string {
	return "v1," + base64.StdEncoding.EncodeToString(gitlabMAC(key, id, timestamp, body))
}

func gitlabMAC(key []byte, id, timestamp string, body []byte) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write([]byte(id))
	_, _ = mac.Write([]byte{'.'})
	_, _ = mac.Write([]byte(timestamp))
	_, _ = mac.Write([]byte{'.'})
	_, _ = mac.Write(body)
	return mac.Sum(nil)
}

// VerifyGitLabSignature checks a Standard Webhooks signature (signing token)
// and the freshness of webhook-timestamp. Only v1 entries are considered.
func VerifyGitLabSignature(key []byte, h http.Header, body []byte, now time.Time, tolerance time.Duration) error {
	if len(key) == 0 {
		return ErrInvalidSignature
	}
	id := strings.TrimSpace(h.Get(HeaderWebhookID))
	ts := strings.TrimSpace(h.Get(HeaderWebhookTimestamp))
	sigs := strings.TrimSpace(h.Get(HeaderWebhookSignature))
	if id == "" || ts == "" || sigs == "" {
		return ErrMissingSignature
	}
	seconds, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		return ErrInvalidSignature
	}
	expected := gitlabMAC(key, id, ts, body)
	matched := false
	for _, entry := range strings.Fields(sigs) {
		version, value, ok := strings.Cut(entry, ",")
		if !ok || version != "v1" {
			continue
		}
		got, err := base64.StdEncoding.DecodeString(value)
		if err != nil {
			continue
		}
		if hmac.Equal(got, expected) {
			matched = true
		}
	}
	if !matched {
		return ErrInvalidSignature
	}
	return CheckFreshness(time.Unix(seconds, 0), now, tolerance)
}

// VerifyGitLabSecretToken compares X-Gitlab-Token in constant time. Both
// values are hashed first so that the comparison does not leak the length.
func VerifyGitLabSecretToken(expected, got string) error {
	if expected == "" {
		return ErrInvalidSignature
	}
	if got == "" {
		return ErrMissingSignature
	}
	a := sha256.Sum256([]byte(expected))
	b := sha256.Sum256([]byte(got))
	if subtle.ConstantTimeCompare(a[:], b[:]) != 1 {
		return ErrInvalidSignature
	}
	return nil
}
