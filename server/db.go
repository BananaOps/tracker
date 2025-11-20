package server

import (
	"context"

	store "github.com/bananaops/tracker/internal/stores"
	"go.mongodb.org/mongo-driver/mongo"
)

// GetDatabaseConnection retourne la connexion à la base de données MongoDB
func GetDatabaseConnection() *mongo.Database {
	return store.GetDatabase()
}

// EnsureIndexes initialise tous les index nécessaires pour les collections MongoDB
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	return store.EnsureIndexes(ctx, db)
}
