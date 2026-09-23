package server

import (
	"context"
	"strings"
	"testing"
	"time"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func TestAPIKeyLifecycle(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	admin := f.principalOf(t, f.admin)

	team, err := svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{Name: "Ops", Permissions: []string{"lock:write"}})
	require.NoError(t, err)

	created, err := svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "deploy", TeamId: team.Team.Id})
	require.NoError(t, err)
	assert.True(t, strings.HasPrefix(created.Secret, "trk_"))
	assert.Equal(t, created.ApiKey.Prefix, strings.Split(created.Secret, "_")[1])
	assert.Equal(t, team.Team.Id, created.ApiKey.TeamId)
	assert.Equal(t, f.admin.ID.Hex(), created.ApiKey.CreatedBy)

	// The secret really authenticates with the team rights.
	p := f.resolver.Resolve(context.Background(), auth.Credentials{APIKey: created.Secret})
	assert.Equal(t, auth.KindAPIKey, p.Kind)
	assert.True(t, p.Has(auth.PermLockWrite))
	assert.False(t, p.IsAdmin)

	// Global key: admins only.
	manager := auth.Principal{Kind: auth.KindUser, UserID: f.admin.ID.Hex(), Username: "mgr", Permissions: auth.NewPermissionSet(auth.PermAccessManage)}
	_, err = svc.CreateApiKey(rpcCtx(manager, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "global"})
	assert.Equal(t, codes.PermissionDenied, status.Code(err))
	global, err := svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "global"})
	require.NoError(t, err)
	assert.Empty(t, global.ApiKey.TeamId)
	p = f.resolver.Resolve(context.Background(), auth.Credentials{APIKey: global.Secret})
	assert.True(t, p.IsAdmin)

	// Validation.
	_, err = svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: ""})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))
	_, err = svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "x", TeamId: "000000000000000000000000"})
	assert.Equal(t, codes.NotFound, status.Code(err))
	_, err = svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "x", ExpiresAt: timestamppb.New(time.Now().Add(-time.Hour))})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))
	future := time.Now().Add(time.Hour)
	exp, err := svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "temp", ExpiresAt: timestamppb.New(future)})
	require.NoError(t, err)
	assert.WithinDuration(t, future, exp.ApiKey.ExpiresAt.AsTime(), time.Second)

	// Revocation.
	_, err = svc.RevokeApiKey(rpcCtx(admin, "RevokeApiKey"), &authv1.RevokeApiKeyRequest{Id: created.ApiKey.Id})
	require.NoError(t, err)
	p = f.resolver.Resolve(context.Background(), auth.Credentials{APIKey: created.Secret})
	assert.Equal(t, auth.KindAnonymous, p.Kind)
	_, err = svc.RevokeApiKey(rpcCtx(admin, "RevokeApiKey"), &authv1.RevokeApiKeyRequest{Id: created.ApiKey.Id})
	assert.Equal(t, codes.NotFound, status.Code(err), "already revoked")
	_, err = svc.RevokeApiKey(rpcCtx(admin, "RevokeApiKey"), &authv1.RevokeApiKeyRequest{Id: "bad"})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))

	list, err := svc.ListApiKeys(rpcCtx(admin, "ListApiKeys"), &authv1.ListApiKeysRequest{})
	require.NoError(t, err)
	assert.Len(t, list.ApiKeys, 3)
}
