package store

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// AuthAPIKeyStore persists API keys. Only the hash of a secret is stored.
type AuthAPIKeyStore struct {
	coll *mongo.Collection
}

func NewAuthAPIKeyStore() *AuthAPIKeyStore {
	return NewAuthAPIKeyStoreFromCollection(NewClient(authAPIKeysCollection))
}

func NewAuthAPIKeyStoreFromCollection(coll *mongo.Collection) *AuthAPIKeyStore {
	return &AuthAPIKeyStore{coll: coll}
}

func (s *AuthAPIKeyStore) Create(ctx context.Context, k *APIKey) error {
	k.CreatedAt = time.Now().UTC()
	res, err := s.coll.InsertOne(ctx, k)
	if mongo.IsDuplicateKeyError(err) {
		return ErrAlreadyExists
	}
	if err != nil {
		return err
	}
	k.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *AuthAPIKeyStore) GetByID(ctx context.Context, id primitive.ObjectID) (*APIKey, error) {
	return s.findOne(ctx, bson.M{"_id": id})
}

func (s *AuthAPIKeyStore) GetByPrefix(ctx context.Context, prefix string) (*APIKey, error) {
	return s.findOne(ctx, bson.M{"prefix": prefix})
}

func (s *AuthAPIKeyStore) findOne(ctx context.Context, filter bson.M) (*APIKey, error) {
	var k APIKey
	err := s.coll.FindOne(ctx, filter).Decode(&k)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &k, nil
}

func (s *AuthAPIKeyStore) List(ctx context.Context) ([]*APIKey, error) {
	cur, err := s.coll.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	out := []*APIKey{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *AuthAPIKeyStore) Revoke(ctx context.Context, id primitive.ObjectID, at time.Time) error {
	res, err := s.coll.UpdateOne(ctx, bson.M{"_id": id, "revokedAt": nil}, bson.M{"$set": bson.M{"revokedAt": at}})
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}

// RevokeByTeam revokes every active key of a team, when the team is deleted.
func (s *AuthAPIKeyStore) RevokeByTeam(ctx context.Context, teamID primitive.ObjectID, at time.Time) error {
	_, err := s.coll.UpdateMany(ctx, bson.M{"teamId": teamID, "revokedAt": nil}, bson.M{"$set": bson.M{"revokedAt": at}})
	return err
}

func (s *AuthAPIKeyStore) TouchLastUsed(ctx context.Context, id primitive.ObjectID, at time.Time) error {
	_, err := s.coll.UpdateByID(ctx, id, bson.M{"$set": bson.M{"lastUsedAt": at}})
	return err
}
