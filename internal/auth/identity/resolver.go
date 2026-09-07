package identity

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/bananaops/tracker/internal/auth"
	store "github.com/bananaops/tracker/internal/stores"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserStore is the subset of store.AuthUserStore used to resolve sessions.
type UserStore interface {
	GetByID(ctx context.Context, id primitive.ObjectID) (*store.User, error)
}

// TeamStore is the subset of store.AuthTeamStore used to compute rights.
type TeamStore interface {
	GetByIDs(ctx context.Context, ids []primitive.ObjectID) ([]*store.Team, error)
}

// APIKeyStore is the subset of store.AuthAPIKeyStore used to resolve keys.
type APIKeyStore interface {
	GetByPrefix(ctx context.Context, prefix string) (*store.APIKey, error)
	TouchLastUsed(ctx context.Context, id primitive.ObjectID, at time.Time) error
}

// Resolver implements auth.Resolver on top of the stores.
type Resolver struct {
	Users                UserStore
	Teams                TeamStore
	Keys                 APIKeyStore
	Sessions             *auth.SessionManager
	AnonymousPermissions []auth.Permission
	Now                  func() time.Time
	Logger               *slog.Logger
}

const lastUsedGranularity = time.Minute

func (r *Resolver) logger() *slog.Logger {
	if r.Logger != nil {
		return r.Logger
	}
	return slog.Default()
}

func (r *Resolver) now() time.Time {
	if r.Now != nil {
		return r.Now()
	}
	return time.Now()
}

func (r *Resolver) anonymous() auth.Principal {
	return auth.Anonymous(r.AnonymousPermissions)
}

// Resolve never fails: any invalid credential yields the anonymous principal.
func (r *Resolver) Resolve(ctx context.Context, creds auth.Credentials) auth.Principal {
	if creds.APIKey != "" {
		if p, ok := r.resolveAPIKey(ctx, creds.APIKey); ok {
			return p
		}
		return r.anonymous()
	}
	if creds.SessionToken != "" {
		if p, ok := r.resolveSession(ctx, creds.SessionToken); ok {
			return p
		}
		return r.anonymous()
	}
	return r.anonymous()
}

func (r *Resolver) resolveAPIKey(ctx context.Context, secret string) (auth.Principal, bool) {
	prefix, ok := auth.ParseAPIKeyPrefix(secret)
	if !ok {
		r.logger().Warn("auth: malformed api key")
		return auth.Principal{}, false
	}
	key, err := r.Keys.GetByPrefix(ctx, prefix)
	if err != nil {
		if !errors.Is(err, store.ErrNotFound) {
			r.logger().Error("auth: api key lookup failed", "error", err)
		} else {
			r.logger().Warn("auth: unknown api key", "prefix", prefix)
		}
		return auth.Principal{}, false
	}
	if !auth.APIKeyMatches(key.Hash, secret) {
		r.logger().Warn("auth: api key secret mismatch", "prefix", prefix)
		return auth.Principal{}, false
	}
	now := r.now()
	if key.RevokedAt != nil {
		r.logger().Warn("auth: revoked api key used", "prefix", prefix)
		return auth.Principal{}, false
	}
	if key.ExpiresAt != nil && now.After(*key.ExpiresAt) {
		r.logger().Warn("auth: expired api key used", "prefix", prefix)
		return auth.Principal{}, false
	}
	if key.LastUsedAt == nil || now.Sub(*key.LastUsedAt) > lastUsedGranularity {
		if err := r.Keys.TouchLastUsed(ctx, key.ID, now); err != nil {
			r.logger().Error("auth: touch api key failed", "error", err)
		}
	}

	if key.TeamID == nil {
		return auth.Principal{
			Kind:        auth.KindAPIKey,
			Username:    "apikey:" + prefix,
			Permissions: auth.NewPermissionSet(auth.AllPermissions()...),
			Scope:       auth.ScopeAll(),
			IsAdmin:     true,
			KeyPrefix:   prefix,
		}, true
	}
	teams, err := r.Teams.GetByIDs(ctx, []primitive.ObjectID{*key.TeamID})
	if err != nil {
		r.logger().Error("auth: team lookup failed", "error", err)
		return auth.Principal{}, false
	}
	if len(teams) == 0 {
		r.logger().Warn("auth: api key belongs to a deleted team", "prefix", prefix)
		return auth.Principal{}, false
	}
	// A key attached to the built-in Administrators team inherits its admin
	// flag, exactly like a user of that team. Spec 4.1 and the comment on
	// auth.Principal.IsAdmin both say so, and a key holding access:manage is
	// an administrator credential in practice anyway.
	perms, scope, admin := Effective(teams)
	return auth.Principal{
		Kind:        auth.KindAPIKey,
		Username:    "apikey:" + prefix,
		TeamIDs:     []string{key.TeamID.Hex()},
		Permissions: perms,
		Scope:       scope,
		IsAdmin:     admin,
		KeyPrefix:   prefix,
	}, true
}

func (r *Resolver) resolveSession(ctx context.Context, token string) (auth.Principal, bool) {
	sess, err := r.Sessions.Verify(token)
	if err != nil {
		return auth.Principal{}, false
	}
	id, err := primitive.ObjectIDFromHex(sess.UserID)
	if err != nil {
		return auth.Principal{}, false
	}
	user, err := r.Users.GetByID(ctx, id)
	if err != nil {
		if !errors.Is(err, store.ErrNotFound) {
			r.logger().Error("auth: user lookup failed", "error", err)
		}
		return auth.Principal{}, false
	}
	if user.Disabled || user.SessionVersion != sess.SessionVersion {
		return auth.Principal{}, false
	}
	p, err := r.PrincipalForUser(ctx, user)
	if err != nil {
		r.logger().Error("auth: team lookup failed", "error", err)
		return auth.Principal{}, false
	}
	return p, true
}

// PrincipalForUser builds the principal of a user from its teams.
func (r *Resolver) PrincipalForUser(ctx context.Context, user *store.User) (auth.Principal, error) {
	teams, err := r.Teams.GetByIDs(ctx, user.Teams)
	if err != nil {
		return auth.Principal{}, err
	}
	perms, scope, admin := Effective(teams)
	teamIDs := make([]string, 0, len(teams))
	for _, t := range teams {
		teamIDs = append(teamIDs, t.ID.Hex())
	}
	return auth.Principal{
		Kind:        auth.KindUser,
		UserID:      user.ID.Hex(),
		Username:    user.Username,
		TeamIDs:     teamIDs,
		Permissions: perms,
		Scope:       scope,
		IsAdmin:     admin,
	}, nil
}
