package server

import (
	"context"
	"testing"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func newAuthService(f *authFixture) *Auth {
	return NewAuth(f.users, f.teams, f.keys, f.cfg)
}

func TestGetAuthConfigIsPublic(t *testing.T) {
	f := newAuthFixture(t)
	f.cfg.AnonymousPermissions = []auth.Permission{auth.PermEventRead}
	f.cfg.DemoMode = true
	svc := newAuthService(f)

	resp, err := svc.GetAuthConfig(rpcCtx(auth.Anonymous(nil), "GetAuthConfig"), &authv1.GetAuthConfigRequest{})
	require.NoError(t, err)
	assert.True(t, resp.LocalLoginEnabled)
	assert.False(t, resp.OidcEnabled)
	assert.Equal(t, []string{"event:read"}, resp.AnonymousPermissions)
	assert.True(t, resp.DemoMode)
}

func TestMe(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)

	resp, err := svc.Me(rpcCtx(auth.Anonymous([]auth.Permission{auth.PermEventRead}), "Me"), &authv1.MeRequest{})
	require.NoError(t, err)
	assert.False(t, resp.Authenticated)
	assert.Equal(t, "anonymous", resp.Kind)
	assert.Equal(t, []string{"event:read"}, resp.Permissions)

	resp, err = svc.Me(rpcCtx(f.principalOf(t, f.admin), "Me"), &authv1.MeRequest{})
	require.NoError(t, err)
	assert.True(t, resp.Authenticated)
	assert.Equal(t, "user", resp.Kind)
	assert.Equal(t, "admin", resp.Username)
	assert.Equal(t, "Administrator", resp.DisplayName)
	assert.Equal(t, "local", resp.Source)
	assert.True(t, resp.MustChangePassword)
	assert.True(t, resp.IsAdmin)
	assert.True(t, resp.ScopeAll)
	require.Len(t, resp.Teams, 1)
	assert.Equal(t, "Administrators", resp.Teams[0].Name)
	assert.Contains(t, resp.Permissions, "access:manage")
}

func TestAuthServiceRequiresAccessManage(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	reader := auth.Principal{Kind: auth.KindUser, UserID: f.admin.ID.Hex(), Permissions: auth.NewPermissionSet(auth.PermEventRead)}

	_, err := svc.ListUsers(rpcCtx(auth.Anonymous(nil), "ListUsers"), &authv1.ListUsersRequest{})
	assert.Equal(t, codes.Unauthenticated, status.Code(err))
	_, err = svc.ListUsers(rpcCtx(reader, "ListUsers"), &authv1.ListUsersRequest{})
	assert.Equal(t, codes.PermissionDenied, status.Code(err))
	_, err = svc.ListTeams(rpcCtx(reader, "ListTeams"), &authv1.ListTeamsRequest{})
	assert.Equal(t, codes.PermissionDenied, status.Code(err))
	_, err = svc.ListApiKeys(rpcCtx(reader, "ListApiKeys"), &authv1.ListApiKeysRequest{})
	assert.Equal(t, codes.PermissionDenied, status.Code(err))
	_, err = svc.ListUsers(context.Background(), &authv1.ListUsersRequest{})
	assert.Equal(t, codes.PermissionDenied, status.Code(err), "no method in context is denied")
}
