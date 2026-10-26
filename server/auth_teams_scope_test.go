package server

import (
	"context"
	"fmt"
	"strings"
	"testing"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func distinctServices(n int) []string {
	out := make([]string, n)
	for i := range out {
		out[i] = fmt.Sprintf("svc-%d", i)
	}
	return out
}

func TestTeamScopeValidation(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	admin := f.principalOf(t, f.admin)

	cases := []struct {
		name         string
		scopeAll     bool
		services     []string
		wantCode     codes.Code
		wantAll      bool
		wantServices []string
	}{
		{name: "default", wantAll: true, wantServices: []string{}},
		{name: "explicit-all", scopeAll: true, wantAll: true, wantServices: []string{}},
		{name: "clean-and-dedupe", services: []string{" svc-b ", "svc-a", "svc-a", ""}, wantServices: []string{"svc-a", "svc-b"}},
		{name: "all-with-services", scopeAll: true, services: []string{"svc-a"}, wantCode: codes.InvalidArgument},
		{name: "blank-only", services: []string{"  ", ""}, wantCode: codes.InvalidArgument},
		{name: "too-many", services: distinctServices(501), wantCode: codes.InvalidArgument},
		{name: "max-services", services: distinctServices(500), wantServices: nil},
		{name: "name-too-long", services: []string{strings.Repeat("x", 129)}, wantCode: codes.InvalidArgument},
		{name: "name-max-length", services: []string{strings.Repeat("x", 128)}, wantServices: []string{strings.Repeat("x", 128)}},
		{name: "multibyte-max-length", services: []string{strings.Repeat("\u00e9", 128)}, wantServices: []string{strings.Repeat("\u00e9", 128)}},
		{name: "multibyte-too-long", services: []string{strings.Repeat("\u00e9", 129)}, wantCode: codes.InvalidArgument},
		{name: "case-sensitive", services: []string{"Svc-A", "svc-a"}, wantServices: []string{"Svc-A", "svc-a"}},
		{name: "unknown-service", services: []string{"does-not-exist-in-catalog"}, wantServices: []string{"does-not-exist-in-catalog"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp, err := svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{
				Name: "team-" + tc.name, ScopeAll: tc.scopeAll, ScopeServices: tc.services,
			})
			if tc.wantCode != codes.OK {
				assert.Equal(t, tc.wantCode, status.Code(err))
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantAll, resp.Team.ScopeAll)
			if tc.name == "max-services" {
				assert.Len(t, resp.Team.ScopeServices, 500)
				return
			}
			assert.ElementsMatch(t, tc.wantServices, resp.Team.ScopeServices)
		})
	}
}

func TestUpdateTeamScope(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	admin := f.principalOf(t, f.admin)

	created, err := svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{Name: "Ops"})
	require.NoError(t, err)
	require.True(t, created.Team.ScopeAll)

	updated, err := svc.UpdateTeam(rpcCtx(admin, "UpdateTeam"), &authv1.UpdateTeamRequest{
		Id: created.Team.Id, Name: "Ops", ScopeServices: []string{"svc-a"},
	})
	require.NoError(t, err)
	assert.False(t, updated.Team.ScopeAll)

	updated, err = svc.UpdateTeam(rpcCtx(admin, "UpdateTeam"), &authv1.UpdateTeamRequest{
		Id: created.Team.Id, Name: "Ops", ScopeAll: true,
	})
	require.NoError(t, err)
	assert.True(t, updated.Team.ScopeAll)

	_, err = svc.UpdateTeam(rpcCtx(admin, "UpdateTeam"), &authv1.UpdateTeamRequest{
		Id: created.Team.Id, Name: "Ops", ScopeServices: []string{"svc-a"},
	})
	require.NoError(t, err)
	_, err = svc.UpdateTeam(rpcCtx(admin, "UpdateTeam"), &authv1.UpdateTeamRequest{
		Id: created.Team.Id, Name: "Ops", ScopeAll: true, ScopeServices: []string{"svc-b"},
	})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))

	oid, err := primitive.ObjectIDFromHex(created.Team.Id)
	require.NoError(t, err)
	stored, err := f.teams.GetByID(context.Background(), oid)
	require.NoError(t, err)
	assert.False(t, stored.Scope.All)
	assert.Equal(t, []string{"svc-a"}, stored.Scope.Services)
}

func TestBuiltinTeamScopeIsImmutable(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	admin := f.principalOf(t, f.admin)

	for _, req := range []*authv1.UpdateTeamRequest{
		{Id: f.adminsID, Name: "Administrators", ScopeAll: false, ScopeServices: []string{"svc-a"}},
		{Id: f.adminsID, Name: "Administrators", ScopeAll: true, ScopeServices: []string{"svc-a"}},
	} {
		resp, err := svc.UpdateTeam(rpcCtx(admin, "UpdateTeam"), req)
		require.NoError(t, err)
		assert.True(t, resp.Team.ScopeAll)
		assert.Empty(t, resp.Team.ScopeServices)

		oid, err := primitive.ObjectIDFromHex(f.adminsID)
		require.NoError(t, err)
		stored, err := f.teams.GetByID(context.Background(), oid)
		require.NoError(t, err)
		assert.True(t, stored.Scope.All)
	}
}

func TestTeamScopeRequiresAccessManage(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	p := auth.Principal{
		Kind: auth.KindUser, UserID: f.admin.ID.Hex(),
		Permissions: auth.NewPermissionSet(auth.PermEventWrite), Scope: auth.ScopeAll(),
	}

	_, err := svc.CreateTeam(rpcCtx(p, "CreateTeam"), &authv1.CreateTeamRequest{Name: "X", ScopeServices: []string{"svc-a"}})
	assert.Equal(t, codes.PermissionDenied, status.Code(err))
	_, err = svc.UpdateTeam(rpcCtx(p, "UpdateTeam"), &authv1.UpdateTeamRequest{Id: f.adminsID, Name: "X"})
	assert.Equal(t, codes.PermissionDenied, status.Code(err))
}

func TestMeReturnsEffectiveScope(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	admin := f.principalOf(t, f.admin)

	mkTeam := func(name string, services ...string) string {
		r, err := svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{Name: name, ScopeServices: services})
		require.NoError(t, err)
		return r.Team.Id
	}
	a := mkTeam("A", "svc-a")
	b := mkTeam("B", "svc-c", "svc-b")
	everyone := mkTeam("Everyone")

	created, err := svc.CreateUser(rpcCtx(admin, "CreateUser"), &authv1.CreateUserRequest{
		Username: "alice", Password: "alice-initial-pass-1", TeamIds: []string{a, b},
	})
	require.NoError(t, err)
	alice, err := f.users.GetByUsername(context.Background(), "alice")
	require.NoError(t, err)

	me, err := svc.Me(rpcCtx(f.principalOf(t, alice), "Me"), &authv1.MeRequest{})
	require.NoError(t, err)
	assert.False(t, me.ScopeAll)
	assert.Equal(t, []string{"svc-a", "svc-b", "svc-c"}, me.ScopeServices)

	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{
		Id: created.User.Id, Email: created.User.Email, DisplayName: created.User.DisplayName,
		TeamIds: []string{a, b, everyone},
	})
	require.NoError(t, err)
	alice, err = f.users.GetByUsername(context.Background(), "alice")
	require.NoError(t, err)
	me, err = svc.Me(rpcCtx(f.principalOf(t, alice), "Me"), &authv1.MeRequest{})
	require.NoError(t, err)
	assert.True(t, me.ScopeAll)
	assert.Empty(t, me.ScopeServices)

	_, err = svc.CreateUser(rpcCtx(admin, "CreateUser"), &authv1.CreateUserRequest{
		Username: "nobody", Password: "nobody-initial-pass-1",
	})
	require.NoError(t, err)
	nobody, err := f.users.GetByUsername(context.Background(), "nobody")
	require.NoError(t, err)
	me, err = svc.Me(rpcCtx(f.principalOf(t, nobody), "Me"), &authv1.MeRequest{})
	require.NoError(t, err)
	assert.False(t, me.ScopeAll)
	assert.Empty(t, me.ScopeServices)
}

func TestTeamKeyFollowsTeamScope(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	admin := f.principalOf(t, f.admin)
	bg := context.Background()

	team, err := svc.CreateTeam(rpcCtx(admin, "CreateTeam"), &authv1.CreateTeamRequest{
		Name: "A", Permissions: []string{"lock:write"}, ScopeServices: []string{"svc-a"},
	})
	require.NoError(t, err)
	key, err := svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "k", TeamId: team.Team.Id})
	require.NoError(t, err)

	p := f.resolver.Resolve(bg, auth.Credentials{APIKey: key.Secret})
	assert.True(t, p.Scope.Allows("svc-a"))
	assert.False(t, p.Scope.Allows("svc-b"))

	_, err = svc.UpdateTeam(rpcCtx(admin, "UpdateTeam"), &authv1.UpdateTeamRequest{
		Id: team.Team.Id, Name: "A", Permissions: []string{"lock:write"}, ScopeServices: []string{"svc-b"},
	})
	require.NoError(t, err)
	p = f.resolver.Resolve(bg, auth.Credentials{APIKey: key.Secret})
	assert.True(t, p.Scope.Allows("svc-b"))
	assert.False(t, p.Scope.Allows("svc-a"))

	global, err := svc.CreateApiKey(rpcCtx(admin, "CreateApiKey"), &authv1.CreateApiKeyRequest{Name: "g"})
	require.NoError(t, err)
	p = f.resolver.Resolve(bg, auth.Credentials{APIKey: global.Secret})
	assert.True(t, p.Scope.All)
}
