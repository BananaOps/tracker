package store

import (
	"context"
	"testing"
	"time"

	"github.com/bananaops/tracker/internal/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// TestEnsureIndexes vérifie que les index sont créés correctement
func TestEnsureIndexes(t *testing.T) {
	// Skip si pas de MongoDB disponible
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	// Configuration de test
	cfg := config.ConfigDatabase
	if cfg.Host == "" {
		t.Skip("No MongoDB configuration available")
	}

	// Connexion à MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	uri := createMongoUri(cfg)
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Skipf("MongoDB not available: %v", err)
	}
	defer client.Disconnect(ctx)

	// Ping MongoDB pour vérifier la connexion
	if err := client.Ping(ctx, nil); err != nil {
		t.Skipf("Cannot ping MongoDB: %v", err)
	}

	// Utiliser une base de données de test
	testDB := client.Database(cfg.Name + "_test")

	// Nettoyer après le test
	defer func() {
		if err := testDB.Drop(ctx); err != nil {
			t.Logf("Warning: failed to drop test database: %v", err)
		}
	}()

	// Créer les collections
	collections := []string{"events", "locks", "catalogs"}
	for _, coll := range collections {
		if err := testDB.CreateCollection(ctx, coll); err != nil {
			t.Logf("Collection %s may already exist: %v", coll, err)
		}
	}

	// Créer les index
	if err := EnsureIndexes(ctx, testDB); err != nil {
		t.Fatalf("Failed to ensure indexes: %v", err)
	}

	// Vérifier les index de la collection events
	t.Run("EventIndexes", func(t *testing.T) {
		indexes := testDB.Collection("events").Indexes()
		cursor, err := indexes.List(ctx)
		if err != nil {
			t.Fatalf("Failed to list indexes: %v", err)
		}
		defer cursor.Close(ctx)

		var results []bson.M
		if err := cursor.All(ctx, &results); err != nil {
			t.Fatalf("Failed to decode indexes: %v", err)
		}

		// Vérifier qu'on a au moins les index attendus
		expectedIndexes := []string{
			"idx_metadata_id",
			"idx_metadata_slackid",
			"idx_attributes_relatedid",
			"idx_service_env_status",
			"idx_startdate",
			"idx_source",
			"idx_type",
			"idx_priority",
			"idx_timeline",
			"idx_createdat",
		}

		indexNames := make(map[string]bool)
		for _, idx := range results {
			if name, ok := idx["name"].(string); ok {
				indexNames[name] = true
			}
		}

		for _, expected := range expectedIndexes {
			if !indexNames[expected] {
				t.Errorf("Expected index %s not found", expected)
			}
		}

		t.Logf("Found %d indexes for events collection", len(results))
	})

	// Vérifier les index de la collection locks
	t.Run("LockIndexes", func(t *testing.T) {
		indexes := testDB.Collection("locks").Indexes()
		cursor, err := indexes.List(ctx)
		if err != nil {
			t.Fatalf("Failed to list indexes: %v", err)
		}
		defer cursor.Close(ctx)

		var results []bson.M
		if err := cursor.All(ctx, &results); err != nil {
			t.Fatalf("Failed to decode indexes: %v", err)
		}

		expectedIndexes := []string{
			"idx_lock_id",
			"idx_lock_createdat",
			"idx_lock_env_resource",
		}

		indexNames := make(map[string]bool)
		for _, idx := range results {
			if name, ok := idx["name"].(string); ok {
				indexNames[name] = true
			}
		}

		for _, expected := range expectedIndexes {
			if !indexNames[expected] {
				t.Errorf("Expected index %s not found", expected)
			}
		}

		t.Logf("Found %d indexes for locks collection", len(results))
	})

	// Vérifier les index de la collection catalogs
	t.Run("CatalogIndexes", func(t *testing.T) {
		indexes := testDB.Collection("catalogs").Indexes()
		cursor, err := indexes.List(ctx)
		if err != nil {
			t.Fatalf("Failed to list indexes: %v", err)
		}
		defer cursor.Close(ctx)

		var results []bson.M
		if err := cursor.All(ctx, &results); err != nil {
			t.Fatalf("Failed to decode indexes: %v", err)
		}

		expectedIndexes := []string{
			"idx_catalog_service",
			"idx_catalog_environment",
		}

		indexNames := make(map[string]bool)
		for _, idx := range results {
			if name, ok := idx["name"].(string); ok {
				indexNames[name] = true
			}
		}

		for _, expected := range expectedIndexes {
			if !indexNames[expected] {
				t.Errorf("Expected index %s not found", expected)
			}
		}

		t.Logf("Found %d indexes for catalogs collection", len(results))
	})
}

// TestIndexIdempotency vérifie que créer les index plusieurs fois ne cause pas d'erreur
func TestIndexIdempotency(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	cfg := config.ConfigDatabase
	if cfg.Host == "" {
		t.Skip("No MongoDB configuration available")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	uri := createMongoUri(cfg)
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Skipf("MongoDB not available: %v", err)
	}
	defer client.Disconnect(ctx)

	// Ping MongoDB pour vérifier la connexion
	if err := client.Ping(ctx, nil); err != nil {
		t.Skipf("Cannot ping MongoDB: %v", err)
	}

	testDB := client.Database(cfg.Name + "_test_idempotency")
	defer testDB.Drop(ctx)

	// Créer les collections
	collections := []string{"events", "locks", "catalogs"}
	for _, coll := range collections {
		testDB.CreateCollection(ctx, coll)
	}

	// Créer les index une première fois
	if err := EnsureIndexes(ctx, testDB); err != nil {
		t.Fatalf("First EnsureIndexes failed: %v", err)
	}

	// Créer les index une deuxième fois - ne devrait pas échouer
	if err := EnsureIndexes(ctx, testDB); err != nil {
		t.Fatalf("Second EnsureIndexes failed: %v", err)
	}

	t.Log("Index creation is idempotent")
}
