package store

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthSettingsSessionSecretIsStable(t *testing.T) {
	db := testDatabase(t)
	s := NewAuthSettingsStoreFromCollection(db.Collection(authSettingsCollection))
	ctx := context.Background()

	first, err := s.SessionSecret(ctx)
	require.NoError(t, err)
	assert.Len(t, first, 32)
	second, err := s.SessionSecret(ctx)
	require.NoError(t, err)
	assert.Equal(t, first, second)
}
