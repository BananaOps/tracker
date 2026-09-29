package identity

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	store "github.com/bananaops/tracker/internal/stores"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// mongoStores returns real stores on a throwaway database, or skips without MONGO_TEST_URI.
func mongoStores(t *testing.T) (*store.AuthUserStore, *store.AuthTeamStore) {
	t.Helper()
	uri := os.Getenv("MONGO_TEST_URI")
	if uri == "" {
		t.Skip("MONGO_TEST_URI not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	require.NoError(t, err)
	db := client.Database(fmt.Sprintf("tracker_test_%d", time.Now().UnixNano()))
	t.Cleanup(func() {
		c, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = db.Drop(c)
		_ = client.Disconnect(c)
	})
	require.NoError(t, store.EnsureIndexes(ctx, db))
	return store.NewAuthUserStoreFromCollection(db.Collection("auth_users")),
		store.NewAuthTeamStoreFromCollection(db.Collection("auth_teams"))
}
