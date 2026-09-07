package auth

import "context"

// Kind tells how a principal was authenticated.
type Kind string

const (
	KindAnonymous Kind = "anonymous"
	KindUser      Kind = "user"
	KindAPIKey    Kind = "apikey"
)

// Principal is the resolved identity of a request, whatever the transport.
type Principal struct {
	Kind        Kind
	UserID      string
	Username    string
	TeamIDs     []string
	Permissions PermissionSet
	Scope       Scope
	// IsAdmin is true for members of the built-in Administrators team and for global API keys.
	IsAdmin bool
	// KeyPrefix is set when Kind is KindAPIKey, for logging.
	KeyPrefix string
}

// Anonymous returns the principal used for unauthenticated requests.
func Anonymous(perms []Permission) Principal {
	return Principal{
		Kind:        KindAnonymous,
		Username:    "anonymous",
		Permissions: NewPermissionSet(perms...),
		Scope:       ScopeAll(),
	}
}

// IsAuthenticated reports whether the principal is a user or an API key.
func (p Principal) IsAuthenticated() bool {
	return p.Kind == KindUser || p.Kind == KindAPIKey
}

// Has reports whether the principal holds the permission.
func (p Principal) Has(perm Permission) bool {
	return p.Permissions.Has(perm)
}

type principalKey struct{}

// WithPrincipal stores the principal in the context.
func WithPrincipal(ctx context.Context, p Principal) context.Context {
	return context.WithValue(ctx, principalKey{}, p)
}

// FromContext returns the principal stored by WithPrincipal.
func FromContext(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey{}).(Principal)
	return p, ok
}
