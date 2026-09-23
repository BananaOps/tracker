package server

import (
	"context"
	"regexp"
	"strings"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	store "github.com/bananaops/tracker/internal/stores"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$`)

func (a *Auth) ListUsers(ctx context.Context, _ *authv1.ListUsersRequest) (*authv1.ListUsersResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	users, err := a.users.List(ctx)
	if err != nil {
		return nil, storeError(err, "users")
	}
	resp := &authv1.ListUsersResponse{Users: make([]*authv1.User, 0, len(users))}
	for _, u := range users {
		resp.Users = append(resp.Users, toProtoUser(u))
	}
	return resp, nil
}

func (a *Auth) CreateUser(ctx context.Context, req *authv1.CreateUserRequest) (*authv1.CreateUserResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	username := strings.TrimSpace(req.Username)
	if !usernamePattern.MatchString(username) {
		return nil, status.Error(codes.InvalidArgument, "username must be 2 to 64 characters of letters, digits, dot, underscore or dash")
	}
	if err := auth.ValidatePasswordPolicy(req.Password); err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	teamIDs, err := a.parseTeamIDs(ctx, req.TeamIds)
	if err != nil {
		return nil, err
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, status.Error(codes.Internal, "internal error")
	}
	user := &store.User{
		Username:           username,
		Email:              strings.TrimSpace(req.Email),
		DisplayName:        strings.TrimSpace(req.DisplayName),
		Source:             store.UserSourceLocal,
		PasswordHash:       hash,
		Teams:              teamIDs,
		MustChangePassword: true,
	}
	if err := a.users.Create(ctx, user); err != nil {
		return nil, storeError(err, "user")
	}
	a.logger.Info("auth.user.create", "username", user.Username, "by", currentPrincipal(ctx).Username)
	return &authv1.CreateUserResponse{User: toProtoUser(user)}, nil
}

func (a *Auth) UpdateUser(ctx context.Context, req *authv1.UpdateUserRequest) (*authv1.UpdateUserResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	id, err := parseObjectID(req.Id, "user")
	if err != nil {
		return nil, err
	}
	user, err := a.users.GetByID(ctx, id)
	if err != nil {
		return nil, storeError(err, "user")
	}
	caller := currentPrincipal(ctx)
	if req.Disabled && caller.UserID == user.ID.Hex() {
		return nil, status.Error(codes.FailedPrecondition, "you cannot disable your own account")
	}
	teamIDs, err := a.parseTeamIDs(ctx, req.TeamIds)
	if err != nil {
		return nil, err
	}
	if req.NewPassword != "" {
		if user.Source != store.UserSourceLocal {
			return nil, status.Error(codes.InvalidArgument, "password is managed by the identity provider")
		}
		if err := auth.ValidatePasswordPolicy(req.NewPassword); err != nil {
			return nil, status.Error(codes.InvalidArgument, err.Error())
		}
	}

	admins, err := a.teams.GetByName(ctx, store.AdministratorsTeamName)
	if err != nil {
		return nil, storeError(err, "administrators team")
	}
	wasAdmin := !user.Disabled && containsID(user.Teams, admins.ID)
	staysAdmin := !req.Disabled && containsID(teamIDs, admins.ID)
	if wasAdmin && !staysAdmin {
		others, err := a.users.CountEnabledInTeam(ctx, admins.ID, user.ID)
		if err != nil {
			return nil, storeError(err, "users")
		}
		if others == 0 {
			return nil, status.Error(codes.FailedPrecondition, "cannot remove the last administrator")
		}
	}

	user.Email = strings.TrimSpace(req.Email)
	user.DisplayName = strings.TrimSpace(req.DisplayName)
	user.Teams = teamIDs
	if req.Disabled && !user.Disabled {
		user.SessionVersion++
	}
	user.Disabled = req.Disabled
	if req.NewPassword != "" {
		hash, err := auth.HashPassword(req.NewPassword)
		if err != nil {
			return nil, status.Error(codes.Internal, "internal error")
		}
		user.PasswordHash = hash
		user.MustChangePassword = true
		user.SessionVersion++
	}
	if err := a.users.Update(ctx, user); err != nil {
		return nil, storeError(err, "user")
	}
	a.logger.Info("auth.user.update", "username", user.Username, "disabled", user.Disabled, "by", caller.Username)
	return &authv1.UpdateUserResponse{User: toProtoUser(user)}, nil
}

func containsID(ids []primitive.ObjectID, id primitive.ObjectID) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}
