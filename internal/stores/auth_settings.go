package store

import (
	"context"
	"crypto/rand"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// AuthSettingsStore holds server generated secrets that must survive restarts.
type AuthSettingsStore struct {
	coll *mongo.Collection
}

func NewAuthSettingsStore() *AuthSettingsStore {
	return NewAuthSettingsStoreFromCollection(NewClient(authSettingsCollection))
}

func NewAuthSettingsStoreFromCollection(coll *mongo.Collection) *AuthSettingsStore {
	return &AuthSettingsStore{coll: coll}
}

type sessionSecretDoc struct {
	Secret []byte `bson:"secret"`
}

// SessionSecret returns the persisted session secret, generating it on first call.
// Concurrent first calls are safe: the upsert only inserts once.
func (s *AuthSettingsStore) SessionSecret(ctx context.Context) ([]byte, error) {
	fresh := make([]byte, 32)
	if _, err := rand.Read(fresh); err != nil {
		return nil, fmt.Errorf("generate session secret: %w", err)
	}
	var doc sessionSecretDoc
	err := s.coll.FindOneAndUpdate(ctx,
		bson.M{"_id": "session"},
		bson.M{"$setOnInsert": bson.M{"secret": fresh, "createdAt": time.Now().UTC()}},
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
	).Decode(&doc)
	if err != nil {
		return nil, fmt.Errorf("load session secret: %w", err)
	}
	return doc.Secret, nil
}
