package server

import (
	"context"
	"errors"
	"log/slog"
	"time"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	store "github.com/bananaops/tracker/internal/stores"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Auth implements tracker.auth.v1alpha1.AuthService.
type Auth struct {
	authv1.UnimplementedAuthServiceServer
	users  *store.AuthUserStore
	teams  *store.AuthTeamStore
	keys   *store.AuthAPIKeyStore
	cfg    auth.Config
	logger *slog.Logger
	now    func() time.Time
}

// NewAuth builds the AuthService implementation.
func NewAuth(users *store.AuthUserStore, teams *store.AuthTeamStore, keys *store.AuthAPIKeyStore, cfg auth.Config) *Auth {
	return &Auth{
		users:  users,
		teams:  teams,
		keys:   keys,
		cfg:    cfg,
		logger: slog.Default(),
		now:    time.Now,
	}
}

func (a *Auth) GetAuthConfig(ctx context.Context, _ *authv1.GetAuthConfigRequest) (*authv1.GetAuthConfigResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	return &authv1.GetAuthConfigResponse{
		LocalLoginEnabled:    true,
		OidcEnabled:          false,
		AnonymousPermissions: permissionStrings(a.cfg.AnonymousPermissions),
		DemoMode:             a.cfg.DemoMode,
	}, nil
}

func (a *Auth) Me(ctx context.Context, _ *authv1.MeRequest) (*authv1.MeResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	p := currentPrincipal(ctx)
	resp := &authv1.MeResponse{
		Authenticated: p.IsAuthenticated(),
		Kind:          string(p.Kind),
		UserId:        p.UserID,
		Username:      p.Username,
		Permissions:   permissionStrings(p.Permissions.Slice()),
		ScopeAll:      p.Scope.All,
		ScopeServices: p.Scope.ServiceList(),
		IsAdmin:       p.IsAdmin,
	}
	if p.Kind == auth.KindUser {
		if id, err := primitive.ObjectIDFromHex(p.UserID); err == nil {
			if user, err := a.users.GetByID(ctx, id); err == nil {
				resp.DisplayName = user.DisplayName
				resp.Source = user.Source
				resp.MustChangePassword = user.MustChangePassword
			}
		}
	}
	ids := make([]primitive.ObjectID, 0, len(p.TeamIDs))
	for _, raw := range p.TeamIDs {
		if id, err := primitive.ObjectIDFromHex(raw); err == nil {
			ids = append(ids, id)
		}
	}
	teams, err := a.teams.GetByIDs(ctx, ids)
	if err != nil {
		return nil, storeError(err, "teams")
	}
	for _, t := range teams {
		resp.Teams = append(resp.Teams, &authv1.TeamRef{Id: t.ID.Hex(), Name: t.Name})
	}
	return resp, nil
}

// currentPrincipal never fails: a missing principal is anonymous without rights.
func currentPrincipal(ctx context.Context) auth.Principal {
	if p, ok := auth.FromContext(ctx); ok {
		return p
	}
	return auth.Anonymous(nil)
}

func permissionStrings(perms []auth.Permission) []string {
	out := make([]string, 0, len(perms))
	for _, p := range perms {
		out = append(out, string(p))
	}
	return out
}

func parseObjectID(id, what string) (primitive.ObjectID, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return primitive.NilObjectID, status.Errorf(codes.InvalidArgument, "invalid %s id", what)
	}
	return oid, nil
}

// parseTeamIDs validates ids and checks that every team exists.
func (a *Auth) parseTeamIDs(ctx context.Context, raw []string) ([]primitive.ObjectID, error) {
	ids := make([]primitive.ObjectID, 0, len(raw))
	seen := map[primitive.ObjectID]struct{}{}
	for _, r := range raw {
		id, err := parseObjectID(r, "team")
		if err != nil {
			return nil, err
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	teams, err := a.teams.GetByIDs(ctx, ids)
	if err != nil {
		return nil, storeError(err, "teams")
	}
	if len(teams) != len(ids) {
		return nil, status.Error(codes.NotFound, "one of the teams does not exist")
	}
	return ids, nil
}

// storeError maps store errors to gRPC statuses.
func storeError(err error, what string) error {
	switch {
	case errors.Is(err, store.ErrNotFound):
		return status.Errorf(codes.NotFound, "%s not found", what)
	case errors.Is(err, store.ErrAlreadyExists):
		return status.Errorf(codes.AlreadyExists, "%s already exists", what)
	default:
		slog.Error("auth store error", "what", what, "error", err)
		return status.Error(codes.Internal, "internal error")
	}
}

func tsOrNil(t *time.Time) *timestamppb.Timestamp {
	if t == nil {
		return nil
	}
	return timestamppb.New(*t)
}

func objectIDStrings(ids []primitive.ObjectID) []string {
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		out = append(out, id.Hex())
	}
	return out
}

func toProtoUser(u *store.User) *authv1.User {
	return &authv1.User{
		Id:                 u.ID.Hex(),
		Username:           u.Username,
		Email:              u.Email,
		DisplayName:        u.DisplayName,
		Source:             u.Source,
		TeamIds:            objectIDStrings(u.Teams),
		Disabled:           u.Disabled,
		MustChangePassword: u.MustChangePassword,
		CreatedAt:          timestamppb.New(u.CreatedAt),
		LastLoginAt:        tsOrNil(u.LastLoginAt),
	}
}

func toProtoTeam(t *store.Team) *authv1.Team {
	return &authv1.Team{
		Id:            t.ID.Hex(),
		Name:          t.Name,
		Description:   t.Description,
		Permissions:   t.Permissions,
		ScopeAll:      t.Scope.All,
		ScopeServices: t.Scope.Services,
		OidcGroups:    t.OIDCGroups,
		Builtin:       t.Builtin,
	}
}

func toProtoAPIKey(k *store.APIKey) *authv1.ApiKey {
	out := &authv1.ApiKey{
		Id:         k.ID.Hex(),
		Prefix:     k.Prefix,
		Name:       k.Name,
		CreatedBy:  k.CreatedBy.Hex(),
		CreatedAt:  timestamppb.New(k.CreatedAt),
		ExpiresAt:  tsOrNil(k.ExpiresAt),
		LastUsedAt: tsOrNil(k.LastUsedAt),
		RevokedAt:  tsOrNil(k.RevokedAt),
	}
	if k.TeamID != nil {
		out.TeamId = k.TeamID.Hex()
	}
	if k.CreatedBy.IsZero() {
		out.CreatedBy = ""
	}
	return out
}
