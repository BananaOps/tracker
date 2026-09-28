package auth

import (
	"bytes"
	"encoding/base64"
	"log/slog"
	"strings"
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

func oidcEnv(extra map[string]string) map[string]string {
	env := map[string]string{
		"AUTH_PUBLIC_URL":         "https://tracker.example.com",
		"AUTH_OIDC_ISSUER":        "https://idp.example.com/realms/main",
		"AUTH_OIDC_CLIENT_ID":     "tracker",
		"AUTH_OIDC_CLIENT_SECRET": "s3cr3t-value-never-logged",
	}
	for k, v := range extra {
		env[k] = v
	}
	return env
}

func TestLoadConfigOIDCDisabledByDefault(t *testing.T) {
	cfg, err := LoadConfig(envOf(map[string]string{}))
	require.NoError(t, err)
	assert.False(t, cfg.OIDC.Enabled())
	assert.Empty(t, cfg.OIDC.ButtonLabel)
}

func TestLoadConfigOIDCDefaults(t *testing.T) {
	cfg, err := LoadConfig(envOf(oidcEnv(nil)))
	require.NoError(t, err)
	o := cfg.OIDC
	assert.True(t, o.Enabled())
	assert.Equal(t, "https://idp.example.com/realms/main", o.Issuer)
	assert.Equal(t, "tracker", o.ClientID)
	assert.Equal(t, "s3cr3t-value-never-logged", o.ClientSecret)
	assert.Equal(t, []string{"openid", "profile", "email"}, o.Scopes)
	assert.Equal(t, "groups", o.GroupsClaim)
	assert.Equal(t, "preferred_username", o.UsernameClaim)
	assert.True(t, o.UserProvisioning)
	assert.True(t, o.TeamSync)
	assert.Equal(t, "Single Sign-On", o.ButtonLabel)
	assert.Equal(t, "https://tracker.example.com/api/v1alpha1/auth/oidc/callback", cfg.OIDCRedirectURL())
}

func TestLoadConfigOIDCExplicit(t *testing.T) {
	cfg, err := LoadConfig(envOf(oidcEnv(map[string]string{
		"AUTH_PUBLIC_URL":             "https://tracker.example.com/",
		"AUTH_OIDC_ISSUER":            "https://tenant.example.com/",
		"AUTH_OIDC_SCOPES":            "profile, groups  email",
		"AUTH_OIDC_GROUPS_CLAIM":      "roles",
		"AUTH_OIDC_USERNAME_CLAIM":    "email",
		"AUTH_OIDC_USER_PROVISIONING": "false",
		"AUTH_OIDC_TEAM_SYNC":         "false",
		"AUTH_OIDC_BUTTON_LABEL":      "Sign in with Okta",
	})))
	require.NoError(t, err)
	o := cfg.OIDC
	assert.Equal(t, "https://tenant.example.com/", o.Issuer, "the trailing slash is significant for issuer matching")
	assert.Equal(t, []string{"openid", "profile", "groups", "email"}, o.Scopes, "openid is added first, separators are commas or spaces")
	assert.Equal(t, "roles", o.GroupsClaim)
	assert.Equal(t, "email", o.UsernameClaim)
	assert.False(t, o.UserProvisioning)
	assert.False(t, o.TeamSync)
	assert.Equal(t, "Sign in with Okta", o.ButtonLabel)
	assert.Equal(t, "https://tracker.example.com/api/v1alpha1/auth/oidc/callback", cfg.OIDCRedirectURL())
}

func TestLoadConfigOIDCLoopbackHTTPIssuer(t *testing.T) {
	for _, issuer := range []string{"http://127.0.0.1:5556/dex", "http://localhost:8081", "http://[::1]:5556"} {
		_, err := LoadConfig(envOf(oidcEnv(map[string]string{"AUTH_OIDC_ISSUER": issuer})))
		assert.NoError(t, err, issuer)
	}
}

func TestLoadConfigOIDCInvalid(t *testing.T) {
	cases := map[string]map[string]string{
		"http issuer off loopback": {"AUTH_OIDC_ISSUER": "http://idp.example.com"},
		"relative issuer":          {"AUTH_OIDC_ISSUER": "idp.example.com"},
		"issuer with query":        {"AUTH_OIDC_ISSUER": "https://idp.example.com?x=1"},
		"missing client id":        {"AUTH_OIDC_CLIENT_ID": ""},
		"missing client secret":    {"AUTH_OIDC_CLIENT_SECRET": ""},
		"missing public url":       {"AUTH_PUBLIC_URL": ""},
		"public url with path":     {"AUTH_PUBLIC_URL": "https://example.com/tracker"},
		"public url not absolute":  {"AUTH_PUBLIC_URL": "tracker.example.com"},
		"bad provisioning bool":    {"AUTH_OIDC_USER_PROVISIONING": "yes please"},
		"bad team sync bool":       {"AUTH_OIDC_TEAM_SYNC": "maybe"},
		"label too long":           {"AUTH_OIDC_BUTTON_LABEL": strings.Repeat("x", 65)},
		"empty groups claim name":  {"AUTH_OIDC_GROUPS_CLAIM": "   "}, // blank falls back to the default: must NOT error, see below
	}
	for name, extra := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := LoadConfig(envOf(oidcEnv(extra)))
			if name == "empty groups claim name" {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.NotContains(t, err.Error(), "s3cr3t-value-never-logged", "the client secret never appears in errors")
		})
	}
}

func TestLoadConfigOIDCClientWithoutIssuer(t *testing.T) {
	_, err := LoadConfig(envOf(map[string]string{"AUTH_OIDC_CLIENT_ID": "tracker", "AUTH_OIDC_CLIENT_SECRET": "s3cr3t-value-never-logged"}))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "AUTH_OIDC_ISSUER")
	assert.NotContains(t, err.Error(), "s3cr3t-value-never-logged")
}

func TestLoadConfigOIDCMissingPublicURLMessage(t *testing.T) {
	_, err := LoadConfig(envOf(oidcEnv(map[string]string{"AUTH_PUBLIC_URL": ""})))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "AUTH_PUBLIC_URL")
}

func TestOIDCConfigLogValueHidesSecret(t *testing.T) {
	cfg, err := LoadConfig(envOf(oidcEnv(nil)))
	require.NoError(t, err)
	var buf bytes.Buffer
	slog.New(slog.NewJSONHandler(&buf, nil)).Info("oidc", "config", cfg.OIDC)
	assert.Contains(t, buf.String(), "https://idp.example.com/realms/main")
	assert.NotContains(t, buf.String(), "s3cr3t-value-never-logged")
}
