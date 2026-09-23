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
	// CredentialRejected is true when the request presented an explicit
	// credential that could not be honoured. Authorization turns it into a
	// 401 whatever the permission asked for, including a public one.
	CredentialRejected bool
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

// RejectedCredential is the principal of a request that presented an explicit
// credential, an API key or a bearer token, which could not be honoured:
// malformed, unknown, revoked or expired.
//
// It is deliberately not the anonymous principal. Falling back to anonymous
// would hand the caller whatever AUTH_ANONYMOUS_PERMISSIONS grants, which
// under the transitional default is more than most credentials carry: a key
// restricted to event:read would silently gain event:write the moment it is
// revoked. A dead credential must be refused, not upgraded.
//
// An absent credential is not rejected, and neither is a session cookie that
// no longer resolves: the cookie is ambient, and a browser holding a stale one
// must still be able to load the SPA and its login page. See
// Credentials.FromCookie.
func RejectedCredential() Principal {
	return Principal{
		Kind:               KindAnonymous,
		Username:           "anonymous",
		Permissions:        NewPermissionSet(),
		Scope:              ScopeAll(),
		CredentialRejected: true,
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
