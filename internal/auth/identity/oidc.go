package identity

import (
	"context"
	"errors"
	"fmt"
	"time"

	store "github.com/bananaops/tracker/internal/stores"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	maxUsernameLength   = 64
	maxUsernameAttempts = 100
)

// OIDCUserStore is the subset of store.AuthUserStore used to resolve OpenID Connect users.
type OIDCUserStore interface {
	GetByOIDCIdentity(ctx context.Context, issuer, subject string) (*store.User, error)
	Create(ctx context.Context, u *store.User) error
	UpdateOIDCProfile(ctx context.Context, id primitive.ObjectID, email, displayName string, at time.Time) error
}

// OIDCIdentity is what the identity provider asserts about a user.
type OIDCIdentity struct {
	Issuer, Subject, Username, Email, DisplayName string
}

var (
	ErrOIDCNotProvisioned    = errors.New("oidc user is not provisioned")
	ErrOIDCUserDisabled      = errors.New("oidc user is disabled")
	ErrOIDCNoUsername        = errors.New("oidc identity carries no usable username")
	ErrOIDCUsernameExhausted = errors.New("no free username for the oidc identity")
	ErrOIDCInvalidIdentity   = errors.New("oidc identity has no issuer or subject")
	ErrOIDCNotOIDCUser       = errors.New("user bound to the oidc identity is not an oidc account")
)

// ResolveOIDCUser finds the user bound to (issuer, subject), or creates it
// when provisioning is on. It never binds an existing account by username or
// email. created reports a new account.
func ResolveOIDCUser(ctx context.Context, users OIDCUserStore, id OIDCIdentity, provisioning bool, now time.Time) (user *store.User, created bool, err error) {
	if id.Issuer == "" || id.Subject == "" {
		return nil, false, ErrOIDCInvalidIdentity
	}
	existing, err := users.GetByOIDCIdentity(ctx, id.Issuer, id.Subject)
	if err == nil {
		u, err := refreshOIDCUser(ctx, users, existing, id, now)
		return u, false, err
	}
	if !errors.Is(err, store.ErrNotFound) {
		return nil, false, fmt.Errorf("lookup oidc user: %w", err)
	}
	if !provisioning {
		return nil, false, ErrOIDCNotProvisioned
	}
	if id.Username == "" {
		return nil, false, ErrOIDCNoUsername
	}

	for attempt := 1; attempt <= maxUsernameAttempts; attempt++ {
		name := candidateUsername(id.Username, attempt)
		displayName := id.DisplayName
		if displayName == "" {
			displayName = name
		}
		u := &store.User{
			Username:    name,
			Email:       id.Email,
			DisplayName: displayName,
			Source:      store.UserSourceOIDC,
			OIDCIssuer:  id.Issuer,
			OIDCSubject: id.Subject,
			Teams:       []primitive.ObjectID{},
			LastLoginAt: &now,
		}
		err := users.Create(ctx, u)
		if err == nil {
			return u, true, nil
		}
		if !errors.Is(err, store.ErrAlreadyExists) {
			return nil, false, fmt.Errorf("create oidc user: %w", err)
		}
		// Either a concurrent first login won the race on (issuer, subject),
		// or the username is taken.
		existing, lookupErr := users.GetByOIDCIdentity(ctx, id.Issuer, id.Subject)
		if lookupErr == nil {
			u, err := refreshOIDCUser(ctx, users, existing, id, now)
			return u, false, err
		}
		if !errors.Is(lookupErr, store.ErrNotFound) {
			return nil, false, fmt.Errorf("lookup oidc user: %w", lookupErr)
		}
	}
	return nil, false, ErrOIDCUsernameExhausted
}

func refreshOIDCUser(ctx context.Context, users OIDCUserStore, u *store.User, id OIDCIdentity, now time.Time) (*store.User, error) {
	if u.Disabled {
		return nil, ErrOIDCUserDisabled
	}
	if u.Source != store.UserSourceOIDC {
		return nil, ErrOIDCNotOIDCUser
	}
	displayName := id.DisplayName
	if displayName == "" {
		displayName = u.DisplayName
	}
	if displayName == "" {
		displayName = u.Username
	}
	if err := users.UpdateOIDCProfile(ctx, u.ID, id.Email, displayName, now); err != nil {
		return nil, fmt.Errorf("update oidc profile: %w", err)
	}
	u.Email, u.DisplayName, u.LastLoginAt = id.Email, displayName, &now
	return u, nil
}

// candidateUsername returns base for the first attempt, then base suffixed
// with -attempt, truncated so the result fits the username length limit. The
// base is ASCII by construction.
func candidateUsername(base string, attempt int) string {
	if attempt <= 1 {
		return base
	}
	suffix := fmt.Sprintf("-%d", attempt)
	if max := maxUsernameLength - len(suffix); len(base) > max {
		base = base[:max]
	}
	return base + suffix
}
