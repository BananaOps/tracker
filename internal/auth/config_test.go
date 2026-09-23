package auth

import (
	"bytes"
	"encoding/base64"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func envOf(m map[string]string) LookupEnv {
	return func(k string) (string, bool) { v, ok := m[k]; return v, ok }
}

func TestLoadConfigDefaults(t *testing.T) {
	cfg, err := LoadConfig(envOf(map[string]string{}))
	require.NoError(t, err)
	assert.Nil(t, cfg.SessionSecret)
	assert.Equal(t, 12*time.Hour, cfg.SessionTTL)
	assert.True(t, cfg.AnonymousDefaulted)
	assert.ElementsMatch(t, TransitionalAnonymousPermissions(), cfg.AnonymousPermissions)
	assert.NotContains(t, cfg.AnonymousPermissions, PermAccessManage)
	assert.False(t, cfg.CookieSecure)
	assert.False(t, cfg.DemoMode)
}

func TestLoadConfigDemoMode(t *testing.T) {
	cfg, err := LoadConfig(envOf(map[string]string{"DEMO_MODE": "true"}))
	require.NoError(t, err)
	assert.True(t, cfg.DemoMode)
	assert.False(t, cfg.AnonymousDefaulted)
	assert.ElementsMatch(t, ReadOnlyPermissions(), cfg.AnonymousPermissions)
}

func TestLoadConfigExplicit(t *testing.T) {
	secret := bytes.Repeat([]byte{1}, 32)
	cfg, err := LoadConfig(envOf(map[string]string{
		"AUTH_SESSION_SECRET":        base64.StdEncoding.EncodeToString(secret),
		"AUTH_SESSION_TTL":           "30m",
		"AUTH_ANONYMOUS_PERMISSIONS": "",
		"AUTH_ADMIN_PASSWORD":        "a-long-enough-password",
		"AUTH_PUBLIC_URL":            "https://tracker.example.com/",
		"AUTH_TRUST_PROXY":           "true",
	}))
	require.NoError(t, err)
	assert.Equal(t, secret, cfg.SessionSecret)
	assert.Equal(t, 30*time.Minute, cfg.SessionTTL)
	assert.Empty(t, cfg.AnonymousPermissions)
	assert.False(t, cfg.AnonymousDefaulted)
	assert.Equal(t, "https://tracker.example.com", cfg.PublicURL)
	assert.True(t, cfg.CookieSecure)
	assert.True(t, cfg.TrustProxy)
}

func TestLoadConfigErrors(t *testing.T) {
	_, err := LoadConfig(envOf(map[string]string{"AUTH_SESSION_SECRET": "not-base64!"}))
	assert.Error(t, err)
	_, err = LoadConfig(envOf(map[string]string{"AUTH_SESSION_SECRET": base64.StdEncoding.EncodeToString([]byte("short"))}))
	assert.Error(t, err)
	_, err = LoadConfig(envOf(map[string]string{"AUTH_SESSION_TTL": "soon"}))
	assert.Error(t, err)
	_, err = LoadConfig(envOf(map[string]string{"AUTH_ANONYMOUS_PERMISSIONS": "event:read,nope"}))
	assert.Error(t, err)
	_, err = LoadConfig(envOf(map[string]string{"AUTH_ADMIN_PASSWORD": "short"}))
	assert.ErrorIs(t, err, ErrPasswordPolicy)
}
