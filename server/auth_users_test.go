package server

import (
	"context"
	"testing"

	authv1 "github.com/bananaops/tracker/generated/proto/auth/v1alpha1"
	"github.com/bananaops/tracker/internal/auth"
	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestCreateAndListUsers(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	ctx := rpcCtx(f.principalOf(t, f.admin), "CreateUser")

	resp, err := svc.CreateUser(ctx, &authv1.CreateUserRequest{
		Username: "bob", Email: "bob@example.com", DisplayName: "Bob", Password: "bob-initial-pass-1", TeamIds: []string{f.adminsID},
	})
	require.NoError(t, err)
	assert.Equal(t, "bob", resp.User.Username)
	assert.Equal(t, "local", resp.User.Source)
	assert.True(t, resp.User.MustChangePassword)
	assert.Equal(t, []string{f.adminsID}, resp.User.TeamIds)

	_, err = svc.CreateUser(ctx, &authv1.CreateUserRequest{Username: "BOB", Password: "bob-initial-pass-1"})
	assert.Equal(t, codes.AlreadyExists, status.Code(err))
	_, err = svc.CreateUser(ctx, &authv1.CreateUserRequest{Username: "bad name!", Password: "bob-initial-pass-1"})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))
	_, err = svc.CreateUser(ctx, &authv1.CreateUserRequest{Username: "carol", Password: "short"})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))
	_, err = svc.CreateUser(ctx, &authv1.CreateUserRequest{Username: "carol", Password: "carol-initial-pass-1", TeamIds: []string{"not-an-id"}})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))
	_, err = svc.CreateUser(ctx, &authv1.CreateUserRequest{Username: "carol", Password: "carol-initial-pass-1", TeamIds: []string{"000000000000000000000000"}})
	assert.Equal(t, codes.NotFound, status.Code(err), "unknown team")

	list, err := svc.ListUsers(rpcCtx(f.principalOf(t, f.admin), "ListUsers"), &authv1.ListUsersRequest{})
	require.NoError(t, err)
	assert.Len(t, list.Users, 2)
}

func TestUpdateUserGuards(t *testing.T) {
	f := newAuthFixture(t)
	svc := newAuthService(f)
	admin := f.principalOf(t, f.admin)

	created, err := svc.CreateUser(rpcCtx(admin, "CreateUser"), &authv1.CreateUserRequest{Username: "bob", Password: "bob-initial-pass-1"})
	require.NoError(t, err)

	// Admin cannot disable itself.
	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{Id: f.admin.ID.Hex(), TeamIds: []string{f.adminsID}, Disabled: true})
	assert.Equal(t, codes.FailedPrecondition, status.Code(err))

	// Admin cannot leave the Administrators team while being the last one.
	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{Id: f.admin.ID.Hex(), TeamIds: []string{}})
	assert.Equal(t, codes.FailedPrecondition, status.Code(err))

	// Promote bob, then admin may leave.
	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{Id: created.User.Id, TeamIds: []string{f.adminsID}, Email: "bob@example.com"})
	require.NoError(t, err)
	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{Id: f.admin.ID.Hex(), TeamIds: []string{}})
	require.NoError(t, err)

	// Admin joins back, so that bob is no longer the last administrator.
	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{Id: f.admin.ID.Hex(), TeamIds: []string{f.adminsID}, DisplayName: "Administrator"})
	require.NoError(t, err)

	// Disabling bob bumps its session version; a password reset too.
	before, _ := f.users.GetByUsername(context.Background(), "bob")
	resp, err := svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{Id: created.User.Id, TeamIds: []string{f.adminsID}, Disabled: true, NewPassword: "bob-reset-pass-22"})
	require.NoError(t, err)
	assert.True(t, resp.User.Disabled)
	after, _ := f.users.GetByUsername(context.Background(), "bob")
	assert.Equal(t, before.SessionVersion+2, after.SessionVersion)
	assert.True(t, after.MustChangePassword)
	ok, _ := auth.VerifyPassword(after.PasswordHash, "bob-reset-pass-22")
	assert.True(t, ok)

	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{Id: "000000000000000000000000"})
	assert.Equal(t, codes.NotFound, status.Code(err))
	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{Id: "zzz"})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))

	// Password reset is refused for OIDC accounts.
	oidc := &store.User{Username: "sso-user", Source: store.UserSourceOIDC, OIDCIssuer: "https://idp", OIDCSubject: "abc"}
	require.NoError(t, f.users.Create(context.Background(), oidc))
	_, err = svc.UpdateUser(rpcCtx(admin, "UpdateUser"), &authv1.UpdateUserRequest{Id: oidc.ID.Hex(), NewPassword: "whatever-pass-123"})
	assert.Equal(t, codes.InvalidArgument, status.Code(err))
}
