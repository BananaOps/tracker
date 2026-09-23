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

// AuthUserStore persists users.
type AuthUserStore struct {
	coll *mongo.Collection
}

// NewAuthUserStore connects to the configured database.
func NewAuthUserStore() *AuthUserStore {
	return NewAuthUserStoreFromCollection(NewClient(authUsersCollection))
}

// NewAuthUserStoreFromCollection wraps an existing collection (tests).
func NewAuthUserStoreFromCollection(coll *mongo.Collection) *AuthUserStore {
	return &AuthUserStore{coll: coll}
}

func (s *AuthUserStore) Create(ctx context.Context, u *User) error {
	now := time.Now().UTC()
	u.UsernameLower = strings.ToLower(u.Username)
	u.CreatedAt, u.UpdatedAt = now, now
	if u.Teams == nil {
		u.Teams = []primitive.ObjectID{}
	}
	res, err := s.coll.InsertOne(ctx, u)
	if mongo.IsDuplicateKeyError(err) {
		return ErrAlreadyExists
	}
	if err != nil {
		return err
	}
	u.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *AuthUserStore) GetByID(ctx context.Context, id primitive.ObjectID) (*User, error) {
	return s.findOne(ctx, bson.M{"_id": id})
}

func (s *AuthUserStore) GetByUsername(ctx context.Context, username string) (*User, error) {
	return s.findOne(ctx, bson.M{"usernameLower": strings.ToLower(strings.TrimSpace(username))})
}

func (s *AuthUserStore) findOne(ctx context.Context, filter bson.M) (*User, error) {
	var u User
	err := s.coll.FindOne(ctx, filter).Decode(&u)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *AuthUserStore) List(ctx context.Context) ([]*User, error) {
	cur, err := s.coll.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "usernameLower", Value: 1}}))
	if err != nil {
		return nil, err
	}
	var out []*User
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []*User{}
	}
	return out, nil
}

func (s *AuthUserStore) Update(ctx context.Context, u *User) error {
	u.UsernameLower = strings.ToLower(u.Username)
	u.UpdatedAt = time.Now().UTC()
	if u.Teams == nil {
		u.Teams = []primitive.ObjectID{}
	}
	res, err := s.coll.ReplaceOne(ctx, bson.M{"_id": u.ID}, u)
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

func (s *AuthUserStore) Count(ctx context.Context) (int64, error) {
	return s.coll.CountDocuments(ctx, bson.M{})
}

func (s *AuthUserStore) TouchLogin(ctx context.Context, id primitive.ObjectID, at time.Time) error {
	_, err := s.coll.UpdateByID(ctx, id, bson.M{"$set": bson.M{"lastLoginAt": at}})
	return err
}

// RemoveTeam pulls a deleted team out of every user.
func (s *AuthUserStore) RemoveTeam(ctx context.Context, teamID primitive.ObjectID) error {
	_, err := s.coll.UpdateMany(ctx, bson.M{"teams": teamID}, bson.M{"$pull": bson.M{"teams": teamID}})
	return err
}

// CountEnabledInTeam counts enabled members of a team, ignoring excludeUser.
func (s *AuthUserStore) CountEnabledInTeam(ctx context.Context, teamID, excludeUser primitive.ObjectID) (int64, error) {
	filter := bson.M{"teams": teamID, "disabled": false}
	if !excludeUser.IsZero() {
		filter["_id"] = bson.M{"$ne": excludeUser}
	}
	return s.coll.CountDocuments(ctx, filter)
}
