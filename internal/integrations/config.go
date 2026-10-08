package integrations

import (
	"encoding/base64"
	"fmt"
	"sort"
	"strings"
	"time"

	eventv1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
)

// LookupEnv has the signature of os.LookupEnv.
type LookupEnv func(key string) (string, bool)

// Environment variables read by LoadConfig.
const (
	EnvGitLabSigningToken = "INTEGRATION_GITLAB_SIGNING_TOKEN"
	EnvGitLabSecretToken  = "INTEGRATION_GITLAB_SECRET_TOKEN"
	EnvFluxHMACKey        = "INTEGRATION_FLUX_HMAC_KEY"
	EnvWebhookTolerance   = "INTEGRATION_WEBHOOK_TOLERANCE"
	EnvEnvironments       = "INTEGRATION_ENVIRONMENTS"
)

// DefaultTolerance is the clock skew allowed between a webhook timestamp and
// the time it is received, when INTEGRATION_WEBHOOK_TOLERANCE is not set.
const DefaultTolerance = 5 * time.Minute

// DefaultEnvironments is the mapping used when INTEGRATION_ENVIRONMENTS is not set.
const DefaultEnvironments = "production=production,staging=preproduction"

// Config is the deployment integrations configuration read from the environment.
type Config struct {
	// GitLabSigningKey is the decoded INTEGRATION_GITLAB_SIGNING_TOKEN, used to
	// verify the GitLab "webhook-signature" HMAC header. Empty when unset.
	GitLabSigningKey []byte
	// GitLabSecretToken is the raw INTEGRATION_GITLAB_SECRET_TOKEN, compared
	// against the "X-Gitlab-Token" header. Empty when unset, or when a signing
	// key is also configured (the signing key then takes precedence).
	GitLabSecretToken string
	// FluxHMACKey is the raw INTEGRATION_FLUX_HMAC_KEY, used to verify Flux
	// notification-controller HMAC signatures.
	FluxHMACKey []byte
	// Tolerance is the maximum accepted gap between a webhook timestamp and now.
	Tolerance time.Duration
	// Environments maps a lower-cased external environment name to a Tracker
	// environment.
	Environments map[string]eventv1.Environment
	// Warnings are non-fatal configuration issues, to be logged by the caller.
	Warnings []string
}

// LoadConfig reads and validates the INTEGRATION_* variables. An invalid
// value returns an error whose text never contains the offending secret.
func LoadConfig(lookup LookupEnv) (Config, error) {
	get := func(k string) string {
		v, _ := lookup(k)
		return strings.TrimSpace(v)
	}

	cfg := Config{}

	if v := get(EnvGitLabSigningToken); v != "" {
		key, err := decodeSigningToken(v)
		if err != nil {
			return Config{}, err
		}
		cfg.GitLabSigningKey = key
	}

	if v := get(EnvGitLabSecretToken); v != "" {
		if len(cfg.GitLabSigningKey) > 0 {
			cfg.Warnings = append(cfg.Warnings, fmt.Sprintf(
				"%s is ignored because %s is set", EnvGitLabSecretToken, EnvGitLabSigningToken))
		} else {
			if len(v) < 16 {
				return Config{}, fmt.Errorf("%s must be at least %d characters", EnvGitLabSecretToken, 16)
			}
			cfg.GitLabSecretToken = v
		}
	}

	if v := get(EnvFluxHMACKey); v != "" {
		if len([]byte(v)) < 32 {
			return Config{}, fmt.Errorf("%s must be at least %d bytes", EnvFluxHMACKey, 32)
		}
		cfg.FluxHMACKey = []byte(v)
	}

	tolerance, err := parseTolerance(get(EnvWebhookTolerance))
	if err != nil {
		return Config{}, err
	}
	cfg.Tolerance = tolerance

	environments, err := parseEnvironments(get(EnvEnvironments))
	if err != nil {
		return Config{}, err
	}
	cfg.Environments = environments

	return cfg, nil
}

// decodeSigningToken validates and decodes INTEGRATION_GITLAB_SIGNING_TOKEN.
// v must be non-empty; the error never repeats v.
func decodeSigningToken(v string) ([]byte, error) {
	invalid := fmt.Errorf("%s must be whsec_ followed by a non empty base64 value", EnvGitLabSigningToken)
	if !strings.HasPrefix(v, "whsec_") {
		return nil, invalid
	}
	key, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(v, "whsec_"))
	if err != nil || len(key) == 0 {
		return nil, invalid
	}
	return key, nil
}

// parseTolerance validates INTEGRATION_WEBHOOK_TOLERANCE. v is already trimmed.
func parseTolerance(v string) (time.Duration, error) {
	if v == "" {
		return DefaultTolerance, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil || d <= 0 {
		return 0, fmt.Errorf("%s must be a positive duration such as 5m, got %q", EnvWebhookTolerance, v)
	}
	return d, nil
}

// parseEnvironments validates INTEGRATION_ENVIRONMENTS. v is already trimmed;
// an empty v falls back to DefaultEnvironments.
func parseEnvironments(v string) (map[string]eventv1.Environment, error) {
	if v == "" {
		v = DefaultEnvironments
	}

	result := make(map[string]eventv1.Environment)
	for _, rawEntry := range strings.Split(v, ",") {
		entry := strings.TrimSpace(rawEntry)
		if entry == "" {
			return nil, fmt.Errorf("%s: entry must not be empty", EnvEnvironments)
		}

		idx := strings.Index(entry, "=")
		if idx < 0 {
			return nil, fmt.Errorf("%s: entry %q must be key=value", EnvEnvironments, entry)
		}

		key := strings.TrimSpace(entry[:idx])
		value := strings.TrimSpace(entry[idx+1:])
		if key == "" {
			return nil, fmt.Errorf("%s: entry %q has an empty key", EnvEnvironments, entry)
		}

		lowerKey := strings.ToLower(key)
		if _, exists := result[lowerKey]; exists {
			return nil, fmt.Errorf("%s: duplicate key %q", EnvEnvironments, lowerKey)
		}

		n, ok := eventv1.Environment_value[value]
		if !ok || value == "ENVIRONMENT_UNSPECIFIED" {
			return nil, fmt.Errorf("%s: %q is not a known environment", EnvEnvironments, value)
		}

		result[lowerKey] = eventv1.Environment(n)
	}

	return result, nil
}

// GitLabEnabled reports whether GitLab webhook verification is configured.
func (c Config) GitLabEnabled() bool {
	return len(c.GitLabSigningKey) > 0 || c.GitLabSecretToken != ""
}

// FluxEnabled reports whether Flux webhook verification is configured.
func (c Config) FluxEnabled() bool {
	return len(c.FluxHMACKey) > 0
}

// Enabled reports whether any deployment integration is configured.
func (c Config) Enabled() bool {
	return c.GitLabEnabled() || c.FluxEnabled()
}

// LookupEnvironment resolves an external environment name, trimmed and
// compared case-insensitively, to a Tracker environment.
func (c Config) LookupEnvironment(name string) (eventv1.Environment, bool) {
	k := strings.ToLower(strings.TrimSpace(name))
	if k == "" {
		return 0, false
	}
	e, ok := c.Environments[k]
	return e, ok
}

// LogAttrs returns slog-style key/value pairs describing the configuration,
// without ever exposing a secret.
func (c Config) LogAttrs() []any {
	mode := "disabled"
	switch {
	case len(c.GitLabSigningKey) > 0:
		mode = "signing_token"
	case c.GitLabSecretToken != "":
		mode = "secret_token"
	}

	keys := make([]string, 0, len(c.Environments))
	for k := range c.Environments {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	pairs := make([]string, 0, len(keys))
	for _, k := range keys {
		pairs = append(pairs, k+"="+c.Environments[k].String())
	}

	return []any{
		"gitlab", mode,
		"flux", c.FluxEnabled(),
		"tolerance", c.Tolerance.String(),
		"environments", strings.Join(pairs, ","),
	}
}
