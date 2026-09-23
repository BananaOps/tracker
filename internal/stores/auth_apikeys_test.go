package store

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestAuthAPIKeyStore(t *testing.T) {
	db := testDatabase(t)
	s := NewAuthAPIKeyStoreFromCollection(db.Collection(authAPIKeysCollection))
	ctx := context.Background()
	team := primitive.NewObjectID()

	k := &APIKey{Prefix: "abcdefgh", Hash: "h1", Name: "ci", TeamID: &team, CreatedBy: primitive.NewObjectID()}
	require.NoError(t, s.Create(ctx, k))
	assert.False(t, k.CreatedAt.IsZero())
	assert.ErrorIs(t, s.Create(ctx, &APIKey{Prefix: "abcdefgh", Hash: "h2", Name: "dup"}), ErrAlreadyExists)

	global := &APIKey{Prefix: "zzzzzzzz", Hash: "h3", Name: "global", CreatedBy: primitive.NewObjectID()}
	require.NoError(t, s.Create(ctx, global))

	got, err := s.GetByPrefix(ctx, "abcdefgh")
	require.NoError(t, err)
	assert.Equal(t, "ci", got.Name)
	_, err = s.GetByPrefix(ctx, "nope")
	assert.ErrorIs(t, err, ErrNotFound)

	at := time.Now().UTC().Truncate(time.Millisecond)
	require.NoError(t, s.TouchLastUsed(ctx, k.ID, at))
	got, _ = s.GetByID(ctx, k.ID)
	require.NotNil(t, got.LastUsedAt)

	require.NoError(t, s.RevokeByTeam(ctx, team, at))
	got, _ = s.GetByID(ctx, k.ID)
	require.NotNil(t, got.RevokedAt)
	g, _ := s.GetByID(ctx, global.ID)
	assert.Nil(t, g.RevokedAt, "global keys are untouched")

	require.NoError(t, s.Revoke(ctx, global.ID, at))
	g, _ = s.GetByID(ctx, global.ID)
	assert.NotNil(t, g.RevokedAt)
	assert.ErrorIs(t, s.Revoke(ctx, primitive.NewObjectID(), at), ErrNotFound)

	list, err := s.List(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 2)
}
