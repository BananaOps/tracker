package auth

import (
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	OIDCLoginPath    = "/api/v1alpha1/auth/oidc/login"
	OIDCCallbackPath = "/api/v1alpha1/auth/oidc/callback"

	defaultOIDCScopes        = "openid profile email"
	defaultOIDCGroupsClaim   = "groups"
	defaultOIDCUsernameClaim = "preferred_username"
	defaultOIDCButtonLabel   = "Single Sign-On"
	maxOIDCButtonLabelLength = 64
)

// Config is the authentication configuration read from the environment.
type Config struct {
	// SessionSecret is nil when AUTH_SESSION_SECRET is not set; the caller then
	// loads or generates a persisted secret.
	SessionSecret        []byte
	SessionTTL           time.Duration
	AnonymousPermissions []Permission
	// AnonymousDefaulted is true when the transitional default was applied
	// because AUTH_ANONYMOUS_PERMISSIONS is not set.
	AnonymousDefaulted bool
	AdminPassword      string
	PublicURL          string
	CookieSecure       bool
	TrustProxy         bool
	DemoMode           bool
	// OIDC is the OpenID Connect login, disabled when Issuer is empty.
	OIDC OIDCConfig
}

// OIDCConfig is the OpenID Connect login configuration read from the
// AUTH_OIDC_* environment variables.
type OIDCConfig struct {
	Issuer           string
	ClientID         string
	ClientSecret     string
	Scopes           []string
	GroupsClaim      string
	UsernameClaim    string
	UserProvisioning bool
	TeamSync         bool
	ButtonLabel      string
}

// Enabled reports whether OIDC login is configured.
func (c OIDCConfig) Enabled() bool {
	return c.Issuer != ""
}

// LogValue implements slog.LogValuer, omitting ClientSecret from logs.
func (c OIDCConfig) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("issuer", c.Issuer),
		slog.String("client_id", c.ClientID),
		slog.Any("scopes", c.Scopes),
		slog.String("groups_claim", c.GroupsClaim),
		slog.String("username_claim", c.UsernameClaim),
		slog.Bool("user_provisioning", c.UserProvisioning),
		slog.Bool("team_sync", c.TeamSync),
		slog.String("button_label", c.ButtonLabel),
	)
}

// OIDCRedirectURL is the OIDC callback URL registered with the identity
// provider.
func (c Config) OIDCRedirectURL() string {
	return c.PublicURL + OIDCCallbackPath
}

// LookupEnv has the signature of os.LookupEnv.
type LookupEnv func(key string) (string, bool)

// ReadOnlyPermissions is what anonymous visitors get in demo mode.
func ReadOnlyPermissions() []Permission {
	return []Permission{PermEventRead, PermCatalogRead, PermLockRead, PermLinksRead}
}

// TransitionalAnonymousPermissions is the default applied while authentication
// is being rolled out: everything but access management. It becomes empty in
// the next major release.
func TransitionalAnonymousPermissions() []Permission {
	out := []Permission{}
	for _, p := range AllPermissions() {
		if p != PermAccessManage {
			out = append(out, p)
		}
	}
	return out
}

// LoadConfig reads and validates the AUTH_* variables.
func LoadConfig(lookup LookupEnv) (Config, error) {
	get := func(key string) string {
		v, _ := lookup(key)
		return strings.TrimSpace(v)
	}
	cfg := Config{SessionTTL: 12 * time.Hour}
	cfg.DemoMode = get("DEMO_MODE") == "true"

	if v := get("AUTH_SESSION_SECRET"); v != "" {
		secret, err := base64.StdEncoding.DecodeString(v)
		if err != nil {
			return Config{}, fmt.Errorf("AUTH_SESSION_SECRET must be base64: %w", err)
		}
		if len(secret) < SessionSecretLength {
			return Config{}, fmt.Errorf("AUTH_SESSION_SECRET must decode to at least %d bytes", SessionSecretLength)
		}
		cfg.SessionSecret = secret
	}

	if v := get("AUTH_SESSION_TTL"); v != "" {
		ttl, err := time.ParseDuration(v)
		if err != nil || ttl <= 0 {
			return Config{}, fmt.Errorf("AUTH_SESSION_TTL must be a positive duration such as 12h, got %q", v)
		}
		cfg.SessionTTL = ttl
	}

	if raw, ok := lookup("AUTH_ANONYMOUS_PERMISSIONS"); ok {
		perms, err := ParsePermissions(raw)
		if err != nil {
			return Config{}, fmt.Errorf("AUTH_ANONYMOUS_PERMISSIONS: %w", err)
		}
		cfg.AnonymousPermissions = perms
	} else if cfg.DemoMode {
		cfg.AnonymousPermissions = ReadOnlyPermissions()
	} else {
		cfg.AnonymousPermissions = TransitionalAnonymousPermissions()
		cfg.AnonymousDefaulted = true
	}

	cfg.AdminPassword = get("AUTH_ADMIN_PASSWORD")
	if cfg.AdminPassword != "" {
		if err := ValidatePasswordPolicy(cfg.AdminPassword); err != nil {
			return Config{}, fmt.Errorf("AUTH_ADMIN_PASSWORD: %w", err)
		}
	}

	cfg.PublicURL = strings.TrimRight(get("AUTH_PUBLIC_URL"), "/")
	cfg.CookieSecure = strings.HasPrefix(cfg.PublicURL, "https://") || get("AUTH_COOKIE_SECURE") == "true"
	cfg.TrustProxy = get("AUTH_TRUST_PROXY") == "true"

	oidc, err := loadOIDCConfig(get, cfg.PublicURL)
	if err != nil {
		return Config{}, err
	}
	cfg.OIDC = oidc

	return cfg, nil
}

// loadOIDCConfig reads the AUTH_OIDC_* variables. OIDC is off without an
// issuer. Error messages name the variable, never the client secret.
func loadOIDCConfig(get func(string) string, publicURL string) (OIDCConfig, error) {
	cfg := OIDCConfig{
		Issuer:       get("AUTH_OIDC_ISSUER"),
		ClientID:     get("AUTH_OIDC_CLIENT_ID"),
		ClientSecret: get("AUTH_OIDC_CLIENT_SECRET"),
	}
	if cfg.Issuer == "" {
		if cfg.ClientID != "" || cfg.ClientSecret != "" {
			return OIDCConfig{}, errors.New("AUTH_OIDC_CLIENT_ID or AUTH_OIDC_CLIENT_SECRET is set but AUTH_OIDC_ISSUER is empty")
		}
		return OIDCConfig{}, nil
	}
	if err := validateOIDCIssuer(cfg.Issuer); err != nil {
		return OIDCConfig{}, err
	}
	if cfg.ClientID == "" {
		return OIDCConfig{}, errors.New("AUTH_OIDC_CLIENT_ID is required when AUTH_OIDC_ISSUER is set")
	}
	if cfg.ClientSecret == "" {
		return OIDCConfig{}, errors.New("AUTH_OIDC_CLIENT_SECRET is required when AUTH_OIDC_ISSUER is set")
	}
	if err := validateOIDCPublicURL(publicURL); err != nil {
		return OIDCConfig{}, err
	}
	cfg.Scopes = parseOIDCScopes(getOr(get, "AUTH_OIDC_SCOPES", defaultOIDCScopes))
	cfg.GroupsClaim = getOr(get, "AUTH_OIDC_GROUPS_CLAIM", defaultOIDCGroupsClaim)
	cfg.UsernameClaim = getOr(get, "AUTH_OIDC_USERNAME_CLAIM", defaultOIDCUsernameClaim)
	var err error
	if cfg.UserProvisioning, err = boolOr(get, "AUTH_OIDC_USER_PROVISIONING", true); err != nil {
		return OIDCConfig{}, err
	}
	if cfg.TeamSync, err = boolOr(get, "AUTH_OIDC_TEAM_SYNC", true); err != nil {
		return OIDCConfig{}, err
	}
	cfg.ButtonLabel = getOr(get, "AUTH_OIDC_BUTTON_LABEL", defaultOIDCButtonLabel)
	if utf8.RuneCountInString(cfg.ButtonLabel) > maxOIDCButtonLabelLength {
		return OIDCConfig{}, fmt.Errorf("AUTH_OIDC_BUTTON_LABEL must be at most %d characters", maxOIDCButtonLabelLength)
	}
	return cfg, nil
}

// getOr returns def when key is unset or blank.
func getOr(get func(string) string, key, def string) string {
	if v := get(key); v != "" {
		return v
	}
	return def
}

// boolOr returns def when key is unset or blank, otherwise parses it as a
// bool. The error never repeats the value.
func boolOr(get func(string) string, key string, def bool) (bool, error) {
	v := get(key)
	if v == "" {
		return def, nil
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return false, fmt.Errorf("%s must be true or false", key)
	}
	return b, nil
}

// parseOIDCScopes splits on spaces and commas, deduplicates while keeping
// order, and puts openid first.
func parseOIDCScopes(raw string) []string {
	fields := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ' ' || r == ','
	})
	seen := make(map[string]bool, len(fields)+1)
	scopes := make([]string, 0, len(fields)+1)
	scopes = append(scopes, "openid")
	seen["openid"] = true
	for _, f := range fields {
		if f == "" || seen[f] {
			continue
		}
		seen[f] = true
		scopes = append(scopes, f)
	}
	return scopes
}

// validateOIDCIssuer requires an absolute https URL without query or
// fragment; http is accepted for loopback hosts only.
func validateOIDCIssuer(issuer string) error {
	const msg = "AUTH_OIDC_ISSUER must be an absolute https URL without query or fragment (http is accepted for loopback hosts only)"
	u, err := url.Parse(issuer)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return errors.New(msg)
	}
	switch u.Scheme {
	case "https":
		return nil
	case "http":
		if isLoopbackHost(u.Hostname()) {
			return nil
		}
	}
	return errors.New(msg)
}

// isLoopbackHost reports whether h is localhost or a loopback IP.
func isLoopbackHost(h string) bool {
	if h == "localhost" {
		return true
	}
	ip := net.ParseIP(h)
	return ip != nil && ip.IsLoopback()
}

// validateOIDCPublicURL requires an absolute scheme://host[:port] URL
// without a path, since it is the base of the OIDC redirect URI.
func validateOIDCPublicURL(publicURL string) error {
	if publicURL == "" {
		return errors.New("AUTH_PUBLIC_URL is required when AUTH_OIDC_ISSUER is set: it is the base of the OIDC redirect URI")
	}
	const msg = "AUTH_PUBLIC_URL must be scheme://host[:port] without path when OIDC is enabled"
	u, err := url.Parse(publicURL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.Path != "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return errors.New(msg)
	}
	return nil
}
