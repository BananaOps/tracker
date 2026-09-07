package server

import (
	"context"
	"testing"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestTeamLifecycle(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	admin := f.principalOf(t, f.admin)

	created, err := svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{
		Name: "Platform", Description: "platform team", Permissions: []string{"event:read", "event:write"},
		ScopeServices: []string{"api", "api", " web "},
	})
	require.NoError(t, err)
	assert.Equal(t, "Platform", created.Team.Name)
	assert.False(t, created.Team.ScopeAll)
	assert.Equal(t, []string{"api", "web"}, created.Team.ScopeServices)
	assert.False(t, created.Team.Builtin)

	all, err := svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{Name: "Everyone"})
	require.NoError(t, err)
	assert.True(t, all.Team.ScopeAll, "no services means every service")

	_, err = svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{Name: "platform"})
	assert.Equal(t, codes.AlreadyExists, status.Code(err))
	_, err = svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{Name: "  "})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))
	_, err = svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{Name: "X", Permissions: []string{"public"}})
	assert.Equal(t, codes.InvalidArgument, status.Code(err), "pseudo permissions are not grantable")
	_, err = svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{Name: "X", Permissions: []string{"nope:read"}})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))

	updated, err := svc.UpdateTeam(rpcCtx(admin, "UpdateTeam"), &authv1.UpdateTeamRequest{
		Id: created.Team.Id, Name: "Platform2", Description: "d", Permissions: []string{"lock:read"}, ScopeAll: true,
	})
	require.NoError(t, err)
	assert.Equal(t, "Platform2", updated.Team.Name)
	assert.True(t, updated.Team.ScopeAll)
	assert.Equal(t, []string{"lock:read"}, updated.Team.Permissions)

	// Builtin team: only description and oidc groups change.
	builtin, err := svc.UpdateTeam(rpcCtx(admin, "UpdateTeam"), &authv1.UpdateTeamRequest{
		Id: f.adminsID, Name: "Hackers", Description: "root", Permissions: []string{"event:read"}, OidcGroups: []string{"admins"},
	})
	require.NoError(t, err)
	assert.Equal(t, "Administrators", builtin.Team.Name)
	assert.Equal(t, "root", builtin.Team.Description)
	assert.Equal(t, []string{"admins"}, builtin.Team.OidcGroups)
	assert.Contains(t, builtin.Team.Permissions, "access:manage")

	_, err = svc.DeleteTeam(rpcCtx(admin, "DeleteTeam"), &authv1.DeleteTeamRequest{Id: f.adminsID})
	assert.Equal(t, codes.FailedPrecondition, status.Code(err))

	// Deleting a team detaches users and revokes its keys.
	_, err = svc.CreateUser(rpcCtx(admin, "CreateUser"), &authv1.CreateUserRequest{Username: "bob", Password: "bob-initial-pass-1", TeamIds: []string{created.Team.Id}})
	require.NoError(t, err)
	key, err := svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "ci", TeamId: created.Team.Id})
	require.NoError(t, err)

	_, err = svc.DeleteTeam(rpcCtx(admin, "DeleteTeam"), &authv1.DeleteTeamRequest{Id: created.Team.Id})
	require.NoError(t, err)
	bob, _ := f.users.GetByUsername(context.Background(), "bob")
	assert.Empty(t, bob.Teams)
	keys, _ := svc.ListApiKeys(rpcCtx(admin, "ListApiKeys"), &authv1.ListApiKeysRequest{})
	require.Len(t, keys.ApiKeys, 1)
	assert.Equal(t, key.ApiKey.Id, keys.ApiKeys[0].Id)
	assert.NotNil(t, keys.ApiKeys[0].RevokedAt)

	_, err = svc.DeleteTeam(rpcCtx(admin, "DeleteTeam"), &authv1.DeleteTeamRequest{Id: created.Team.Id})
	assert.Equal(t, codes.NotFound, status.Code(err))
}
