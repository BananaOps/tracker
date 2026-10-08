package integrations

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"strings"
	"testing"
	"time"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func env(m map[string]string) LookupEnv {
	return func(k string) (string, bool) { v, ok := m[k]; return v, ok }
}

var (
	signing  = "whsec_" + base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x11}, 32))
	secret16 = "0123456789abcdef"
	flux32   = strings.Repeat("k", 32)
)

func TestLoadConfig(t *testing.T) {
	tests := []struct {
		name    string
		vars    map[string]string
		wantErr string
		check   func(t *testing.T, cfg Config)
	}{
		{
			name: "no variables",
			vars: map[string]string{},
			check: func(t *testing.T, cfg Config) {
				assert.False(t, cfg.Enabled())
				assert.Equal(t, 5*time.Minute, cfg.Tolerance)
				assert.Equal(t, map[string]eventv1.Environment{
					"production": eventv1.Environment_production,
					"staging":    eventv1.Environment_preproduction,
				}, cfg.Environments)
			},
		},
		{
			name: "valid signing token",
			vars: map[string]string{EnvGitLabSigningToken: signing},
			check: func(t *testing.T, cfg Config) {
				assert.Len(t, cfg.GitLabSigningKey, 32)
				assert.True(t, cfg.GitLabEnabled())
				assert.False(t, cfg.FluxEnabled())
			},
		},
		{
			name:    "signing token without whsec_ prefix",
			vars:    map[string]string{EnvGitLabSigningToken: "bad"},
			wantErr: EnvGitLabSigningToken,
		},
		{
			name:    "signing token with invalid base64",
			vars:    map[string]string{EnvGitLabSigningToken: "whsec_!!!"},
			wantErr: EnvGitLabSigningToken,
		},
		{
			name:    "signing token empty after prefix",
			vars:    map[string]string{EnvGitLabSigningToken: "whsec_"},
			wantErr: EnvGitLabSigningToken,
		},
		{
			name:    "secret token too short",
			vars:    map[string]string{EnvGitLabSecretToken: "short"},
			wantErr: EnvGitLabSecretToken,
		},
		{
			name: "secret token valid",
			vars: map[string]string{EnvGitLabSecretToken: secret16},
			check: func(t *testing.T, cfg Config) {
				assert.Equal(t, secret16, cfg.GitLabSecretToken)
			},
		},
		{
			name: "secret token ignored when signing token is set",
			vars: map[string]string{EnvGitLabSigningToken: signing, EnvGitLabSecretToken: "short"},
			check: func(t *testing.T, cfg Config) {
				assert.Empty(t, cfg.GitLabSecretToken)
				assert.Len(t, cfg.Warnings, 1)
			},
		},
		{
			name:    "flux key too short",
			vars:    map[string]string{EnvFluxHMACKey: strings.Repeat("k", 31)},
			wantErr: EnvFluxHMACKey,
		},
		{
			name: "flux key valid",
			vars: map[string]string{EnvFluxHMACKey: flux32},
			check: func(t *testing.T, cfg Config) {
				assert.True(t, cfg.FluxEnabled())
				assert.Equal(t, []byte(flux32), cfg.FluxHMACKey)
			},
		},
		{
			name:    "tolerance not a duration",
			vars:    map[string]string{EnvWebhookTolerance: "abc"},
			wantErr: EnvWebhookTolerance,
		},
		{
			name:    "tolerance zero",
			vars:    map[string]string{EnvWebhookTolerance: "0s"},
			wantErr: EnvWebhookTolerance,
		},
		{
			name:    "tolerance negative",
			vars:    map[string]string{EnvWebhookTolerance: "-1m"},
			wantErr: EnvWebhookTolerance,
		},
		{
			name: "tolerance valid",
			vars: map[string]string{EnvWebhookTolerance: "30s"},
			check: func(t *testing.T, cfg Config) {
				assert.Equal(t, 30*time.Second, cfg.Tolerance)
			},
		},
		{
			name:    "environments entry without =",
			vars:    map[string]string{EnvEnvironments: "production"},
			wantErr: EnvEnvironments,
		},
		{
			name:    "environments empty key",
			vars:    map[string]string{EnvEnvironments: "=production"},
			wantErr: EnvEnvironments,
		},
		{
			name:    "environments duplicate key case insensitive",
			vars:    map[string]string{EnvEnvironments: "prod=production,PROD=production"},
			wantErr: EnvEnvironments,
		},
		{
			name:    "environments unknown value",
			vars:    map[string]string{EnvEnvironments: "prod=live"},
			wantErr: EnvEnvironments,
		},
		{
			name:    "environments unspecified value",
			vars:    map[string]string{EnvEnvironments: "prod=ENVIRONMENT_UNSPECIFIED"},
			wantErr: EnvEnvironments,
		},
		{
			name:    "environments empty entry",
			vars:    map[string]string{EnvEnvironments: "prod=production,,x=UAT"},
			wantErr: EnvEnvironments,
		},
		{
			name: "environments trimmed and case insensitive keys, case sensitive values",
			vars: map[string]string{EnvEnvironments: " Prod=production , QA=UAT "},
			check: func(t *testing.T, cfg Config) {
				assert.Equal(t, map[string]eventv1.Environment{
					"prod": eventv1.Environment_production,
					"qa":   eventv1.Environment_UAT,
				}, cfg.Environments)
			},
		},
		{
			name: "environments blank falls back to default",
			vars: map[string]string{EnvEnvironments: "   "},
			check: func(t *testing.T, cfg Config) {
				assert.Equal(t, map[string]eventv1.Environment{
					"production": eventv1.Environment_production,
					"staging":    eventv1.Environment_preproduction,
				}, cfg.Environments)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := LoadConfig(env(tt.vars))
			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
				for _, secretValue := range []string{signing, secret16, flux32} {
					assert.NotContains(t, err.Error(), secretValue)
				}
				return
			}
			require.NoError(t, err)
			if tt.check != nil {
				tt.check(t, cfg)
			}
		})
	}
}

func TestLookupEnvironment(t *testing.T) {
	cfg, err := LoadConfig(env(map[string]string{}))
	require.NoError(t, err)

	e, ok := cfg.LookupEnvironment("PRODUCTION")
	assert.True(t, ok)
	assert.Equal(t, eventv1.Environment_production, e)

	e, ok = cfg.LookupEnvironment(" staging ")
	assert.True(t, ok)
	assert.Equal(t, eventv1.Environment_preproduction, e)

	_, ok = cfg.LookupEnvironment("")
	assert.False(t, ok)

	_, ok = cfg.LookupEnvironment("review")
	assert.False(t, ok)
}

func TestLogAttrsHidesSecrets(t *testing.T) {
	cfg, err := LoadConfig(env(map[string]string{
		EnvGitLabSigningToken: signing,
		EnvGitLabSecretToken:  "short",
		EnvFluxHMACKey:        flux32,
	}))
	require.NoError(t, err)

	s := fmt.Sprint(cfg.LogAttrs()...)
	assert.NotContains(t, s, signing)
	assert.NotContains(t, s, strings.TrimPrefix(signing, "whsec_"))
	assert.NotContains(t, s, flux32)
	assert.Contains(t, s, "signing_token")
	assert.Contains(t, s, "production=production")
}
