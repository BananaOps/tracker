package store

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestAuthTeamStoreCRUD(t *testing.T) {
	db := testDatabase(t)
	s := NewAuthTeamStoreFromCollection(db.Collection(authTeamsCollection))
	ctx := context.Background()

	team := &Team{Name: "Platform", Permissions: []string{"event:read"}, Scope: TeamScope{All: true}}
	require.NoError(t, s.Create(ctx, team))
	assert.Equal(t, "platform", team.NameLower)
	assert.ErrorIs(t, s.Create(ctx, &Team{Name: "PLATFORM"}), ErrAlreadyExists)

	got, err := s.GetByName(ctx, "platform")
	require.NoError(t, err)
	assert.Equal(t, team.ID, got.ID)

	other := &Team{Name: "Ops", Scope: TeamScope{Services: []string{"api"}}}
	require.NoError(t, s.Create(ctx, other))
	byIDs, err := s.GetByIDs(ctx, []primitive.ObjectID{team.ID, other.ID, primitive.NewObjectID()})
	require.NoError(t, err)
	assert.Len(t, byIDs, 2)

	empty, err := s.GetByIDs(ctx, nil)
	require.NoError(t, err)
	assert.Empty(t, empty)

	got.Description = "platform team"
	require.NoError(t, s.Update(ctx, got))
	again, _ := s.GetByID(ctx, team.ID)
	assert.Equal(t, "platform team", again.Description)

	require.NoError(t, s.Delete(ctx, other.ID))
	_, err = s.GetByID(ctx, other.ID)
	assert.ErrorIs(t, err, ErrNotFound)
	assert.ErrorIs(t, s.Delete(ctx, other.ID), ErrNotFound)

	list, err := s.List(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 1)
}
