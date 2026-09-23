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
