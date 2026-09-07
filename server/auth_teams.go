package server

import (
	"context"
	"sort"
	"strings"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	store "github.com/bananaops/tracker/internal/stores"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const teamNameMaxLength = 64

func (a *Auth) ListTeams(ctx context.Context, _ *authv1.ListTeamsRequest) (*authv1.ListTeamsResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	teams, err := a.teams.List(ctx)
	if err != nil {
		return nil, storeError(err, "teams")
	}
	resp := &authv1.ListTeamsResponse{Teams: make([]*authv1.Team, 0, len(teams))}
	for _, t := range teams {
		resp.Teams = append(resp.Teams, toProtoTeam(t))
	}
	return resp, nil
}

// teamFromRequest validates the editable fields of a team.
func teamFromRequest(name, description string, perms []string, scopeAll bool, services, groups []string) (*store.Team, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > teamNameMaxLength {
		return nil, status.Errorf(codes.InvalidArgument, "team name must be 1 to %d characters", teamNameMaxLength)
	}
	cleanPerms := make([]string, 0, len(perms))
	seenPerm := map[string]struct{}{}
	for _, raw := range perms {
		p := auth.Permission(strings.TrimSpace(raw))
		if !auth.IsValidPermission(p) {
			return nil, status.Errorf(codes.InvalidArgument, "unknown permission %q", raw)
		}
		if _, dup := seenPerm[string(p)]; dup {
			continue
		}
		seenPerm[string(p)] = struct{}{}
		cleanPerms = append(cleanPerms, string(p))
	}
	sort.Strings(cleanPerms)

	cleanServices := dedupeTrimmed(services)
	scope := store.TeamScope{All: scopeAll || len(cleanServices) == 0, Services: cleanServices}
	if scope.All {
		scope.Services = []string{}
	}
	return &store.Team{
		Name:        name,
		Description: strings.TrimSpace(description),
		Permissions: cleanPerms,
		Scope:       scope,
		OIDCGroups:  dedupeTrimmed(groups),
	}, nil
}

func dedupeTrimmed(in []string) []string {
	out := make([]string, 0, len(in))
	seen := map[string]struct{}{}
	for _, raw := range in {
		s := strings.TrimSpace(raw)
		if s == "" {
			continue
		}
		if _, dup := seen[s]; dup {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	sort.Strings(out)
	return out
}

func (a *Auth) CreateTeam(ctx context.Context, req *authv1.CreateTeamRequest) (*authv1.CreateTeamResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	team, err := teamFromRequest(req.Name, req.Description, req.Permissions, req.ScopeAll, req.ScopeServices, req.OidcGroups)
	if err != nil {
		return nil, err
	}
	if err := a.teams.Create(ctx, team); err != nil {
		return nil, storeError(err, "team")
	}
	a.logger.Info("auth.team.create", "team", team.Name, "by", currentPrincipal(ctx).Username)
	return &authv1.CreateTeamResponse{Team: toProtoTeam(team)}, nil
}

func (a *Auth) UpdateTeam(ctx context.Context, req *authv1.UpdateTeamRequest) (*authv1.UpdateTeamResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	id, err := parseObjectID(req.Id, "team")
	if err != nil {
		return nil, err
	}
	existing, err := a.teams.GetByID(ctx, id)
	if err != nil {
		return nil, storeError(err, "team")
	}
	if existing.Builtin {
		// Name, permissions and scope of the built-in team are immutable.
		existing.Description = strings.TrimSpace(req.Description)
		existing.OIDCGroups = dedupeTrimmed(req.OidcGroups)
	} else {
		edited, err := teamFromRequest(req.Name, req.Description, req.Permissions, req.ScopeAll, req.ScopeServices, req.OidcGroups)
		if err != nil {
			return nil, err
		}
		existing.Name = edited.Name
		existing.Description = edited.Description
		existing.Permissions = edited.Permissions
		existing.Scope = edited.Scope
		existing.OIDCGroups = edited.OIDCGroups
	}
	if err := a.teams.Update(ctx, existing); err != nil {
		return nil, storeError(err, "team")
	}
	a.logger.Info("auth.team.update", "team", existing.Name, "by", currentPrincipal(ctx).Username)
	return &authv1.UpdateTeamResponse{Team: toProtoTeam(existing)}, nil
}

func (a *Auth) DeleteTeam(ctx context.Context, req *authv1.DeleteTeamRequest) (*authv1.DeleteTeamResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	id, err := parseObjectID(req.Id, "team")
	if err != nil {
		return nil, err
	}
	team, err := a.teams.GetByID(ctx, id)
	if err != nil {
		return nil, storeError(err, "team")
	}
	if team.Builtin {
		return nil, status.Error(codes.FailedPrecondition, "the built-in team cannot be deleted")
	}
	if err := a.users.RemoveTeam(ctx, id); err != nil {
		return nil, storeError(err, "users")
	}
	if err := a.keys.RevokeByTeam(ctx, id, a.now().UTC()); err != nil {
		return nil, storeError(err, "api keys")
	}
	if err := a.teams.Delete(ctx, id); err != nil {
		return nil, storeError(err, "team")
	}
	a.logger.Info("auth.team.delete", "team", team.Name, "by", currentPrincipal(ctx).Username)
	return &authv1.DeleteTeamResponse{}, nil
}
