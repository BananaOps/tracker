package store

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	IntegrationDeploymentsCollection = "integration_deployments"
	// IntegrationDeploymentTTL bounds how long a correlation is kept after its last update.
	IntegrationDeploymentTTL = 90 * 24 * time.Hour
)

// IntegrationDeployment correlates the notifications of one deployment with
// its Tracker event. Rank orders statuses sharing the same instant.
type IntegrationDeployment struct {
	Key         string    `bson:"_id"`
	EventID     string    `bson:"eventId"`
	Source      string    `bson:"source"`
	Status      string    `bson:"status"`
	Rank        int       `bson:"rank"`
	LastEventAt time.Time `bson:"lastEventAt"`
	CreatedAt   time.Time `bson:"createdAt"`
	UpdatedAt   time.Time `bson:"updatedAt"`
}

// NormalizeEventTime matches the millisecond precision of BSON dates.
func NormalizeEventTime(t time.Time) time.Time { return t.UTC().Truncate(time.Millisecond) }

// IntegrationDeploymentStore persists the correlation between webhook
// notifications and Tracker events.
type IntegrationDeploymentStore struct {
	coll *mongo.Collection
	now  func() time.Time
}

func NewIntegrationDeploymentStore() *IntegrationDeploymentStore {
	return NewIntegrationDeploymentStoreFromCollection(NewClient(IntegrationDeploymentsCollection))
}

func NewIntegrationDeploymentStoreFromCollection(coll *mongo.Collection) *IntegrationDeploymentStore {
	return &IntegrationDeploymentStore{coll: coll, now: time.Now}
}

// Claim inserts the correlation. When the key already exists it returns
// created=false and the stored document.
func (s *IntegrationDeploymentStore) Claim(ctx context.Context, key, source, status string, at time.Time, rank int) (bool, *IntegrationDeployment, error) {
	now := s.now().UTC()
	doc := &IntegrationDeployment{Key: key, Source: source, Status: status, Rank: rank, LastEventAt: NormalizeEventTime(at), CreatedAt: now, UpdatedAt: now}
	_, err := s.coll.InsertOne(ctx, doc)
	if err == nil {
		return true, doc, nil
	}
	if !mongo.IsDuplicateKeyError(err) {
		return false, nil, err
	}
	existing, err := s.Get(ctx, key)
	if err != nil {
		return false, nil, err
	}
	return false, existing, nil
}

// Advance applies status atomically when it is newer than the stored state
// (see spec 5.3). Applied: returns the previous state. Not applied: returns
// the current state so that the caller can tell duplicate from stale.
func (s *IntegrationDeploymentStore) Advance(ctx context.Context, key, status string, at time.Time, rank int) (bool, *IntegrationDeployment, error) {
	at = NormalizeEventTime(at)
	filter := bson.M{"_id": key, "$or": bson.A{
		bson.M{"lastEventAt": bson.M{"$lt": at}, "rank": bson.M{"$lte": rank}},
		bson.M{"lastEventAt": at, "rank": bson.M{"$lt": rank}},
	}}
	update := bson.M{"$set": bson.M{"status": status, "rank": rank, "lastEventAt": at, "updatedAt": s.now().UTC()}}
	var prev IntegrationDeployment
	err := s.coll.FindOneAndUpdate(ctx, filter, update, options.FindOneAndUpdate().SetReturnDocument(options.Before)).Decode(&prev)
	if err == nil {
		return true, &prev, nil
	}
	if !errors.Is(err, mongo.ErrNoDocuments) {
		return false, nil, err
	}
	current, err := s.Get(ctx, key)
	if err != nil {
		return false, nil, err
	}
	return false, current, nil
}

// SetEventID records the Tracker event created for this correlation.
func (s *IntegrationDeploymentStore) SetEventID(ctx context.Context, key, eventID string) error {
	res, err := s.coll.UpdateOne(ctx, bson.M{"_id": key}, bson.M{"$set": bson.M{"eventId": eventID, "updatedAt": s.now().UTC()}})
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}

// Revert restores the previous state after a Tracker write fails, but only
// if the stored state still matches the Advance being undone: status, rank
// and lastEventAt all have to match, so a Revert can never clobber a newer
// state that shares the same instant but carries a higher rank.
func (s *IntegrationDeploymentStore) Revert(ctx context.Context, key string, prev *IntegrationDeployment, status string, rank int, at time.Time) error {
	if prev == nil {
		return errors.New("revert: previous state is required")
	}
	_, err := s.coll.UpdateOne(ctx,
		bson.M{"_id": key, "status": status, "rank": rank, "lastEventAt": NormalizeEventTime(at)},
		bson.M{"$set": bson.M{"status": prev.Status, "rank": prev.Rank, "lastEventAt": prev.LastEventAt, "updatedAt": s.now().UTC()}},
	)
	return err
}

// Delete removes a correlation, e.g. once it is no longer needed.
func (s *IntegrationDeploymentStore) Delete(ctx context.Context, key string) error {
	_, err := s.coll.DeleteOne(ctx, bson.M{"_id": key})
	return err
}

// Get returns the stored correlation, or ErrNotFound.
func (s *IntegrationDeploymentStore) Get(ctx context.Context, key string) (*IntegrationDeployment, error) {
	var doc IntegrationDeployment
	err := s.coll.FindOne(ctx, bson.M{"_id": key}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &doc, nil
}
