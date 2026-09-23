package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// AuthTeamStore persists teams.
type AuthTeamStore struct {
	coll *mongo.Collection
}

func NewAuthTeamStore() *AuthTeamStore {
	return NewAuthTeamStoreFromCollection(NewClient(authTeamsCollection))
}

func NewAuthTeamStoreFromCollection(coll *mongo.Collection) *AuthTeamStore {
	return &AuthTeamStore{coll: coll}
}

func normalizeTeam(t *Team) {
	t.NameLower = strings.ToLower(strings.TrimSpace(t.Name))
	if t.Permissions == nil {
		t.Permissions = []string{}
	}
	if t.Scope.Services == nil {
		t.Scope.Services = []string{}
	}
	if t.OIDCGroups == nil {
		t.OIDCGroups = []string{}
	}
}

func (s *AuthTeamStore) Create(ctx context.Context, t *Team) error {
	now := time.Now().UTC()
	normalizeTeam(t)
	t.CreatedAt, t.UpdatedAt = now, now
	res, err := s.coll.InsertOne(ctx, t)
	if mongo.IsDuplicateKeyError(err) {
		return ErrAlreadyExists
	}
	if err != nil {
		return err
	}
	t.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *AuthTeamStore) GetByID(ctx context.Context, id primitive.ObjectID) (*Team, error) {
	return s.findOne(ctx, bson.M{"_id": id})
}

func (s *AuthTeamStore) GetByName(ctx context.Context, name string) (*Team, error) {
	return s.findOne(ctx, bson.M{"nameLower": strings.ToLower(strings.TrimSpace(name))})
}

func (s *AuthTeamStore) findOne(ctx context.Context, filter bson.M) (*Team, error) {
	var t Team
	err := s.coll.FindOne(ctx, filter).Decode(&t)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// GetByIDs returns the teams that exist among ids, in name order.
func (s *AuthTeamStore) GetByIDs(ctx context.Context, ids []primitive.ObjectID) ([]*Team, error) {
	if len(ids) == 0 {
		return []*Team{}, nil
	}
	return s.find(ctx, bson.M{"_id": bson.M{"$in": ids}})
}

func (s *AuthTeamStore) List(ctx context.Context) ([]*Team, error) {
	return s.find(ctx, bson.M{})
}

func (s *AuthTeamStore) find(ctx context.Context, filter bson.M) ([]*Team, error) {
	cur, err := s.coll.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "nameLower", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := []*Team{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *AuthTeamStore) Update(ctx context.Context, t *Team) error {
	normalizeTeam(t)
	t.UpdatedAt = time.Now().UTC()
	res, err := s.coll.ReplaceOne(ctx, bson.M{"_id": t.ID}, t)
	if mongo.IsDuplicateKeyError(err) {
		return ErrAlreadyExists
	}
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *AuthTeamStore) Delete(ctx context.Context, id primitive.ObjectID) error {
	res, err := s.coll.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}
