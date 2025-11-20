package store

import (
	"context"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EnsureIndexes crée les index nécessaires pour optimiser les requêtes MongoDB
// Cette fonction doit être appelée au démarrage de l'application
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	logger := slog.Default()

	// Index pour la collection events
	if err := ensureEventIndexes(ctx, db, logger); err != nil {
		return err
	}

	// Index pour la collection locks
	if err := ensureLockIndexes(ctx, db, logger); err != nil {
		return err
	}

	// Index pour la collection catalogs
	if err := ensureCatalogIndexes(ctx, db, logger); err != nil {
		return err
	}

	logger.Info("All database indexes ensured successfully")
	return nil
}

func ensureEventIndexes(ctx context.Context, db *mongo.Database, logger *slog.Logger) error {
	collection := db.Collection("events")

	indexes := []mongo.IndexModel{
		// Index unique sur metadata.id pour les recherches par ID
		// PartialFilterExpression ignore les documents avec metadata.id vide ou null
		// Utilise $gt: "" car $ne n'est pas supporté dans les filtres partiels
		{
			Keys: bson.D{{Key: "metadata.id", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetName("idx_metadata_id").
				SetPartialFilterExpression(bson.D{
					{Key: "metadata.id", Value: bson.D{{Key: "$gt", Value: ""}}},
				}),
		},
		// Index sur metadata.slackid pour les recherches par Slack ID
		// NON unique car plusieurs événements peuvent avoir le même Slack ID
		// Sparse pour ignorer les documents sans slackid
		{
			Keys:    bson.D{{Key: "metadata.slackid", Value: 1}},
			Options: options.Index().SetSparse(true).SetName("idx_metadata_slackid"),
		},
		// Index sur attributes.relatedId pour les vérifications de relations
		{
			Keys:    bson.D{{Key: "attributes.relatedid", Value: 1}},
			Options: options.Index().SetSparse(true).SetName("idx_attributes_relatedid"),
		},
		// Index composé pour les recherches fréquentes par service, environment et status
		{
			Keys: bson.D{
				{Key: "attributes.service", Value: 1},
				{Key: "attributes.environment", Value: 1},
				{Key: "attributes.status", Value: 1},
			},
			Options: options.Index().SetName("idx_service_env_status"),
		},
		// Index sur startdate pour les recherches par plage de dates
		{
			Keys:    bson.D{{Key: "attributes.startdate.seconds", Value: -1}},
			Options: options.Index().SetName("idx_startdate"),
		},
		// Index sur source pour les filtres par source
		{
			Keys:    bson.D{{Key: "attributes.source", Value: 1}},
			Options: options.Index().SetName("idx_source"),
		},
		// Index sur type pour les filtres par type
		{
			Keys:    bson.D{{Key: "attributes.type", Value: 1}},
			Options: options.Index().SetName("idx_type"),
		},
		// Index sur priority pour les filtres par priorité
		{
			Keys:    bson.D{{Key: "attributes.priority", Value: 1}},
			Options: options.Index().SetName("idx_priority"),
		},
		// Index composé pour la timeline (date + service + environment)
		{
			Keys: bson.D{
				{Key: "attributes.startdate.seconds", Value: -1},
				{Key: "attributes.service", Value: 1},
				{Key: "attributes.environment", Value: 1},
			},
			Options: options.Index().SetName("idx_timeline"),
		},
		// Index sur created_at pour trier par date de création
		{
			Keys:    bson.D{{Key: "metadata.createdat.seconds", Value: -1}},
			Options: options.Index().SetName("idx_createdat"),
		},
	}

	return createIndexes(ctx, collection, indexes, logger, "events")
}

func ensureLockIndexes(ctx context.Context, db *mongo.Database, logger *slog.Logger) error {
	collection := db.Collection("locks")

	indexes := []mongo.IndexModel{
		// Index unique sur id pour les recherches par ID
		// PartialFilterExpression ignore les documents avec id vide ou null
		// Utilise $gt: "" car $ne n'est pas supporté dans les filtres partiels
		{
			Keys: bson.D{{Key: "id", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetName("idx_lock_id").
				SetPartialFilterExpression(bson.D{
					{Key: "id", Value: bson.D{{Key: "$gt", Value: ""}}},
				}),
		},
		// Index sur created_at pour gérer les locks expirés
		{
			Keys:    bson.D{{Key: "createdat.seconds", Value: 1}},
			Options: options.Index().SetName("idx_lock_createdat"),
		},
		// Index composé sur environment et resource pour les locks par ressource
		{
			Keys: bson.D{
				{Key: "environment", Value: 1},
				{Key: "resource", Value: 1},
			},
			Options: options.Index().SetName("idx_lock_env_resource"),
		},
	}

	return createIndexes(ctx, collection, indexes, logger, "locks")
}

func ensureCatalogIndexes(ctx context.Context, db *mongo.Database, logger *slog.Logger) error {
	collection := db.Collection("catalogs")

	indexes := []mongo.IndexModel{
		// Index sur service pour les recherches par service
		// PartialFilterExpression ignore les documents avec service vide ou null
		// Utilise $gt: "" car $ne n'est pas supporté dans les filtres partiels
		{
			Keys: bson.D{{Key: "service", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetName("idx_catalog_service").
				SetPartialFilterExpression(bson.D{
					{Key: "service", Value: bson.D{{Key: "$gt", Value: ""}}},
				}),
		},
		// Index sur environment pour les filtres par environnement
		{
			Keys:    bson.D{{Key: "environment", Value: 1}},
			Options: options.Index().SetName("idx_catalog_environment"),
		},
	}

	return createIndexes(ctx, collection, indexes, logger, "catalogs")
}

func createIndexes(ctx context.Context, collection *mongo.Collection, indexes []mongo.IndexModel, logger *slog.Logger, collectionName string) error {
	// Créer un contexte avec timeout pour éviter les blocages
	ctxTimeout, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Créer les index
	names, err := collection.Indexes().CreateMany(ctxTimeout, indexes)
	if err != nil {
		logger.Error("Failed to create indexes", "collection", collectionName, "error", err)
		return err
	}

	logger.Info("Indexes ensured", "collection", collectionName, "indexes", names)
	return nil
}
