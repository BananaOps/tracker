package server

import (
	"context"
	"strings"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/bananaops/tracker/internal/auth/authz"
	store "github.com/bananaops/tracker/internal/stores"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (a *Auth) ListApiKeys(ctx context.Context, _ *authv1.ListApiKeysRequest) (*authv1.ListApiKeysResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	keys, err := a.keys.List(ctx)
	if err != nil {
		return nil, storeError(err, "api keys")
	}
	resp := &authv1.ListApiKeysResponse{ApiKeys: make([]*authv1.ApiKey, 0, len(keys))}
	for _, k := range keys {
		resp.ApiKeys = append(resp.ApiKeys, toProtoAPIKey(k))
	}
	return resp, nil
}

func (a *Auth) CreateApiKey(ctx context.Context, req *authv1.CreateApiKeyRequest) (*authv1.CreateApiKeyResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	name := strings.TrimSpace(req.Name)
	if name == "" || len(name) > teamNameMaxLength {
		return nil, status.Error(codes.InvalidArgument, "api key name is required")
	}
	caller := currentPrincipal(ctx)

	var teamID *primitive.ObjectID
	if req.TeamId == "" {
		if !caller.IsAdmin {
			return nil, status.Error(codes.PermissionDenied, "only administrators can create global api keys")
		}
	} else {
		id, err := parseObjectID(req.TeamId, "team")
		if err != nil {
			return nil, err
		}
		if _, err := a.teams.GetByID(ctx, id); err != nil {
			return nil, storeError(err, "team")
		}
		teamID = &id
	}

	key := &store.APIKey{Name: name, TeamID: teamID}
	if req.ExpiresAt != nil {
		exp := req.ExpiresAt.AsTime().UTC()
		if !exp.After(a.now()) {
			return nil, status.Error(codes.InvalidArgument, "expiresAt must be in the future")
		}
		key.ExpiresAt = &exp
	}
	if id, err := primitive.ObjectIDFromHex(caller.UserID); err == nil {
		key.CreatedBy = id
	}

	gen, err := auth.GenerateAPIKey()
	if err != nil {
		return nil, status.Error(codes.Internal, "internal error")
	}
	key.Prefix, key.Hash = gen.Prefix, gen.Hash
	if err := a.keys.Create(ctx, key); err != nil {
		return nil, storeError(err, "api key")
	}
	a.logger.Info("auth.apikey.create", "prefix", key.Prefix, "name", key.Name, "global", teamID == nil, "by", caller.Username)
	return &authv1.CreateApiKeyResponse{ApiKey: toProtoAPIKey(key), Secret: gen.Secret}, nil
}

func (a *Auth) RevokeApiKey(ctx context.Context, req *authv1.RevokeApiKeyRequest) (*authv1.RevokeApiKeyResponse, error) {
	if err := authz.Authorize(ctx); err != nil {
		return nil, err
	}
	id, err := parseObjectID(req.Id, "api key")
	if err != nil {
		return nil, err
	}
	if err := a.keys.Revoke(ctx, id, a.now().UTC()); err != nil {
		return nil, storeError(err, "active api key")
	}
	a.logger.Info("auth.apikey.revoke", "id", id.Hex(), "by", currentPrincipal(ctx).Username)
	return &authv1.RevokeApiKeyResponse{}, nil
}
