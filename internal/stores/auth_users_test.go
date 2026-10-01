package store

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestAuthUserStoreCRUD(t *testing.T) {
	db := testDatabase(t)
	s := NewAuthUserStoreFromCollection(db.Collection(authUsersCollection))
	ctx := context.Background()

	n, err := s.Count(ctx)
	require.NoError(t, err)
	assert.Zero(t, n)

	team := primitive.NewObjectID()
	u := &User{Username: "Alice", Email: "alice@example.com", Source: UserSourceLocal, PasswordHash: "x", Teams: []primitive.ObjectID{team}}
	require.NoError(t, s.Create(ctx, u))
	assert.False(t, u.ID.IsZero())
	assert.Equal(t, "alice", u.UsernameLower)

	dup := &User{Username: "ALICE", Source: UserSourceLocal}
	assert.ErrorIs(t, s.Create(ctx, dup), ErrAlreadyExists)

	got, err := s.GetByUsername(ctx, "aLiCe")
	require.NoError(t, err)
	assert.Equal(t, u.ID, got.ID)

	_, err = s.GetByUsername(ctx, "nobody")
	assert.ErrorIs(t, err, ErrNotFound)

	got.DisplayName = "Alice A."
	got.SessionVersion++
	require.NoError(t, s.Update(ctx, got))
	again, err := s.GetByID(ctx, u.ID)
	require.NoError(t, err)
	assert.Equal(t, "Alice A.", again.DisplayName)
	assert.Equal(t, 1, again.SessionVersion)

	at := time.Now().UTC().Truncate(time.Millisecond)
	require.NoError(t, s.TouchLogin(ctx, u.ID, at))
	again, _ = s.GetByID(ctx, u.ID)
	require.NotNil(t, again.LastLoginAt)
	assert.Equal(t, at, again.LastLoginAt.UTC())

	count, err := s.CountEnabledInTeam(ctx, team, primitive.NilObjectID)
	require.NoError(t, err)
	assert.Equal(t, int64(1), count)
	count, err = s.CountEnabledInTeam(ctx, team, u.ID)
	require.NoError(t, err)
	assert.Zero(t, count)

	require.NoError(t, s.RemoveTeam(ctx, team))
	again, _ = s.GetByID(ctx, u.ID)
	assert.Empty(t, again.Teams)

	list, err := s.List(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	assert.ErrorIs(t, s.Update(ctx, &User{ID: primitive.NewObjectID(), Username: "ghost"}), ErrNotFound)
}

func TestAuthUserStoreOIDC(t *testing.T) {
	db := testDatabase(t)
	s := NewAuthUserStoreFromCollection(db.Collection(authUsersCollection))
	ctx := context.Background()

	team := primitive.NewObjectID()
	oidcUser := &User{Username: "bob", Source: UserSourceOIDC, OIDCIssuer: "https://idp", OIDCSubject: "sub-1", Teams: []primitive.ObjectID{team}}
	require.NoError(t, s.Create(ctx, oidcUser))

	got, err := s.GetByOIDCIdentity(ctx, "https://idp", "sub-1")
	require.NoError(t, err)
	assert.Equal(t, oidcUser.ID, got.ID)
	_, err = s.GetByOIDCIdentity(ctx, "https://idp", "sub-2")
	assert.ErrorIs(t, err, ErrNotFound)
	_, err = s.GetByOIDCIdentity(ctx, "https://other", "sub-1")
	assert.ErrorIs(t, err, ErrNotFound)

	dup := &User{Username: "bob2", Source: UserSourceOIDC, OIDCIssuer: "https://idp", OIDCSubject: "sub-1"}
	assert.ErrorIs(t, s.Create(ctx, dup), ErrAlreadyExists)

	require.NoError(t, s.Create(ctx, &User{Username: "l1", Source: UserSourceLocal, PasswordHash: "x"}))
	require.NoError(t, s.Create(ctx, &User{Username: "l2", Source: UserSourceLocal, PasswordHash: "x"}))

	at := time.Now().UTC().Add(time.Hour)
	require.NoError(t, s.UpdateOIDCProfile(ctx, oidcUser.ID, "b@x.io", "Bob B", at))
	after, err := s.GetByID(ctx, oidcUser.ID)
	require.NoError(t, err)
	assert.Equal(t, "b@x.io", after.Email)
	assert.Equal(t, "Bob B", after.DisplayName)
	require.NotNil(t, after.LastLoginAt)
	assert.WithinDuration(t, at, *after.LastLoginAt, time.Second)
	assert.True(t, after.UpdatedAt.After(got.UpdatedAt))
	assert.Equal(t, "bob", after.Username)
	assert.Equal(t, []primitive.ObjectID{team}, after.Teams)
	assert.Equal(t, UserSourceOIDC, after.Source)
	assert.Equal(t, got.SessionVersion, after.SessionVersion)

	assert.ErrorIs(t, s.UpdateOIDCProfile(ctx, primitive.NewObjectID(), "a", "b", at), ErrNotFound)
}

func TestAuthUserStoreSyncTeams(t *testing.T) {
	db := testDatabase(t)
	s := NewAuthUserStoreFromCollection(db.Collection(authUsersCollection))
	ctx := context.Background()

	a, m, b := primitive.NewObjectID(), primitive.NewObjectID(), primitive.NewObjectID()
	u := &User{Username: "sync", Source: UserSourceOIDC, Teams: []primitive.ObjectID{a, m}}
	require.NoError(t, s.Create(ctx, u))

	for range 2 {
		require.NoError(t, s.SyncTeams(ctx, u.ID, []primitive.ObjectID{b}, []primitive.ObjectID{a}))
		got, err := s.GetByID(ctx, u.ID)
		require.NoError(t, err)
		assert.ElementsMatch(t, []primitive.ObjectID{m, b}, got.Teams)
	}

	require.NoError(t, s.SyncTeams(ctx, u.ID, nil, nil))
	assert.ErrorIs(t, s.SyncTeams(ctx, primitive.NewObjectID(), []primitive.ObjectID{b}, nil), ErrNotFound)
}
