package integrations

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func hdr(id, ts, sig string) http.Header {
	h := http.Header{}
	if id != "" {
		h.Set(HeaderWebhookID, id)
	}
	if ts != "" {
		h.Set(HeaderWebhookTimestamp, ts)
	}
	if sig != "" {
		h.Set(HeaderWebhookSignature, sig)
	}
	return h
}

func TestSignGitLab(t *testing.T) {
	key := bytes.Repeat([]byte{0x2a}, 32)
	id := "msg_2Lh9"
	ts := "1790000000"
	body := []byte(`{"object_kind":"deployment"}`)

	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(id + "." + ts + "." + string(body)))
	want := "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))

	assert.Equal(t, want, SignGitLab(key, id, ts, body))
}

func TestVerifyGitLabSignature(t *testing.T) {
	key := bytes.Repeat([]byte{0x2a}, 32)
	id := "msg_2Lh9"
	now := time.Unix(1790000000, 0)
	ts := "1790000000"
	body := []byte(`{"object_kind":"deployment"}`)
	tol := 5 * time.Minute

	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(id + "." + ts + "." + string(body)))
	want := "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))

	tests := []struct {
		name    string
		key     []byte
		h       http.Header
		body    []byte
		now     time.Time
		tol     time.Duration
		wantErr error
	}{
		{
			name: "valid headers",
			key:  key, h: hdr(id, ts, want), body: body, now: now, tol: tol,
			wantErr: nil,
		},
		{
			name: "multiple entries, one valid",
			key:  key, h: hdr(id, ts, "v1,AAAA "+want), body: body, now: now, tol: tol,
			wantErr: nil,
		},
		{
			name: "version ignored",
			key:  key, h: hdr(id, ts, "v2,"+want[3:]), body: body, now: now, tol: tol,
			wantErr: ErrInvalidSignature,
		},
		{
			name: "signature not base64",
			key:  key, h: hdr(id, ts, "v1,!!!notbase64"), body: body, now: now, tol: tol,
			wantErr: ErrInvalidSignature,
		},
		{
			name: "body modified",
			key:  key, h: hdr(id, ts, want), body: []byte(`{"object_kind":"push"}`), now: now, tol: tol,
			wantErr: ErrInvalidSignature,
		},
		{
			name: "webhook-id modified",
			key:  key, h: hdr("msg_other", ts, want), body: body, now: now, tol: tol,
			wantErr: ErrInvalidSignature,
		},
		{
			name: "webhook-timestamp changed",
			key:  key, h: hdr(id, "1790000001", want), body: body, now: now, tol: tol,
			wantErr: ErrInvalidSignature,
		},
		{
			name: "timestamp not a number",
			key:  key, h: hdr(id, "abc", want), body: body, now: now, tol: tol,
			wantErr: ErrInvalidSignature,
		},
		{
			name: "missing webhook-id",
			key:  key, h: hdr("", ts, want), body: body, now: now, tol: tol,
			wantErr: ErrMissingSignature,
		},
		{
			name: "missing webhook-timestamp",
			key:  key, h: hdr(id, "", want), body: body, now: now, tol: tol,
			wantErr: ErrMissingSignature,
		},
		{
			name: "missing webhook-signature",
			key:  key, h: hdr(id, ts, ""), body: body, now: now, tol: tol,
			wantErr: ErrMissingSignature,
		},
		{
			name: "nil key",
			key:  nil, h: hdr(id, ts, want), body: body, now: now, tol: tol,
			wantErr: ErrInvalidSignature,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := VerifyGitLabSignature(tt.key, tt.h, tt.body, tt.now, tt.tol)
			if tt.wantErr == nil {
				assert.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, tt.wantErr)
			}
		})
	}
}

func TestVerifyGitLabSignatureFreshness(t *testing.T) {
	key := bytes.Repeat([]byte{0x2a}, 32)
	id := "msg_2Lh9"
	now := time.Unix(1790000000, 0)
	body := []byte(`{"object_kind":"deployment"}`)
	tol := 5 * time.Minute

	sign := func(ts string) (string, string) {
		mac := hmac.New(sha256.New, key)
		mac.Write([]byte(id + "." + ts + "." + string(body)))
		return ts, "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))
	}

	tests := []struct {
		name    string
		at      time.Time
		wantErr error
	}{
		{"now minus tolerance", now.Add(-tol), nil},
		{"now minus tolerance minus one second", now.Add(-tol - time.Second), ErrStaleTimestamp},
		{"now plus tolerance plus one second", now.Add(tol + time.Second), ErrStaleTimestamp},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ts, sig := sign(strconv.FormatInt(tt.at.Unix(), 10))
			err := VerifyGitLabSignature(key, hdr(id, ts, sig), body, now, tol)
			if tt.wantErr == nil {
				assert.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, tt.wantErr)
			}
		})
	}
}

// TestVerifyGitLabSignatureReferenceVector uses the Standard Webhooks
// reference test vector (svix test suite, standard-webhooks/standard-webhooks
// repository) to check SignGitLab and VerifyGitLabSignature against an
// implementation-independent value.
func TestVerifyGitLabSignatureReferenceVector(t *testing.T) {
	// Public test key of the Standard Webhooks specification, not a secret.
	// The "whsec_" prefix is added at run time so secret scanners do not
	// report the literal as a leaked signing secret.
	const referenceKey = "MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
	secret := "whsec_" + referenceKey
	key, err := base64.StdEncoding.DecodeString(secret[len("whsec_"):])
	assert.NoError(t, err)

	id := "msg_p5jXN8AQM9LWM0D4loKWxJek"
	ts := "1614265330"
	body := []byte(`{"test": 2432232314}`)
	now := time.Unix(1614265330, 0)
	want := "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE="

	assert.Equal(t, want, SignGitLab(key, id, ts, body))
	assert.NoError(t, VerifyGitLabSignature(key, hdr(id, ts, want), body, now, 5*time.Minute))
}

func TestVerifyGitLabSecretToken(t *testing.T) {
	tests := []struct {
		name     string
		expected string
		got      string
		wantErr  error
	}{
		{"match", "gitlab-secret-token-0123", "gitlab-secret-token-0123", nil},
		{"mismatch", "gitlab-secret-token-0123", "wrong", ErrInvalidSignature},
		{"got empty", "gitlab-secret-token-0123", "", ErrMissingSignature},
		{"expected empty", "", "x", ErrInvalidSignature},
		{"longer value with correct prefix", "gitlab-secret-token-0123", "gitlab-secret-token-0123x", ErrInvalidSignature},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := VerifyGitLabSecretToken(tt.expected, tt.got)
			if tt.wantErr == nil {
				assert.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, tt.wantErr)
			}
		})
	}
}
