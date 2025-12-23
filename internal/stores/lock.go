package store

import (
	"context"
	"log"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/lock/v1alpha1"
	"google.golang.org/protobuf/types/known/timestamppb"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/google/uuid"
)

type LockStoreClient struct {
	collection *mongo.Collection
}

func NewStoreLock(collection string) (c *LockStoreClient) {
	return &LockStoreClient{
		collection: NewClient(collection),
	}
}

// List takes label and field selectors, and returns the list of Locks that match those selectors.
func (c *LockStoreClient) List(ctx context.Context) (results []*v1alpha1.Lock, err error) {
	cursor, err := c.collection.Find(context.TODO(), bson.D{})
	if err != nil {
		return nil, err
	}
	if err = cursor.All(context.TODO(), &results); err != nil {
		return
	}

	return
}

// Create takes the representation of an Lock and creates it.  Returns the server's representation of the Lock, and an error, if there is any.
func (c *LockStoreClient) Create(ctx context.Context, lockInsert *v1alpha1.Lock) (result *v1alpha1.Lock, err error) {

	result = &v1alpha1.Lock{}
	id := uuid.New()
	lockInsert.Id = id.String()
	lockInsert.CreatedAt = timestamppb.Now()

	_, err = c.collection.InsertOne(context.TODO(), lockInsert)
	if err != nil {
		log.Fatalln("Error Inserting Document", err)
	}

	err = c.collection.FindOne(context.TODO(), map[string]interface{}{"id": &lockInsert.Id}).Decode(&result)
	if err != nil {
		return
	}

	return
}

// Get an Lock and creates it.  Returns the server's representation of the Lock, and an error, if there is any.
func (c *LockStoreClient) Get(ctx context.Context, filter map[string]interface{}) (result *v1alpha1.Lock, err error) {
	result = &v1alpha1.Lock{}

	err = c.collection.FindOne(context.TODO(), filter).Decode(&result)
	return
}

// Search and returns the list of Locks that match those selectors.
func (c *LockStoreClient) Unlock(ctx context.Context, filter map[string]interface{}) (count int64, err error) {

	cursor, err := c.collection.DeleteOne(context.TODO(), filter)
	if err != nil {
		return
	}

	return cursor.DeletedCount, nil
}

func (c *LockStoreClient) Update(ctx context.Context, filter map[string]interface{}, lockUpdate *v1alpha1.Lock) (result *v1alpha1.Lock, err error) {
	result = &v1alpha1.Lock{}
	updateFilter := bson.D{{Key: "$set", Value: lockUpdate}}
	err = c.collection.FindOneAndUpdate(context.TODO(), filter, updateFilter).Decode(&result)
	return
}
