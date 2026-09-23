package auth

import (
	"encoding/base64"
	"fmt"
	"strings"
	"time"
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
	return cfg, nil
}
