package store

import (
	"context"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/freeze/v1alpha1"
	"google.golang.org/protobuf/types/known/timestamppb"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/google/uuid"
)

type FreezeWindowStoreClient struct {
	collection *mongo.Collection
}

func NewStoreFreezeWindow(collection string) (c *FreezeWindowStoreClient) {
	return &FreezeWindowStoreClient{
		collection: NewClient(collection),
	}
}

func (c *FreezeWindowStoreClient) List(ctx context.Context) (results []*v1alpha1.FreezeWindow, err error) {
	cursor, err := c.collection.Find(ctx, bson.D{})
	if err != nil {
		return nil, err
	}
	if err = cursor.All(ctx, &results); err != nil {
		return
	}
	return
}

func (c *FreezeWindowStoreClient) Create(ctx context.Context, freezeInsert *v1alpha1.FreezeWindow) (result *v1alpha1.FreezeWindow, err error) {
	result = &v1alpha1.FreezeWindow{}
	id := uuid.New()
	now := timestamppb.Now()

	freezeInsert.Id = id.String()
	freezeInsert.CreatedAt = now
	freezeInsert.UpdatedAt = now

	_, err = c.collection.InsertOne(ctx, freezeInsert)
	if err != nil {
		return nil, err
	}

	err = c.collection.FindOne(ctx, map[string]interface{}{"id": freezeInsert.Id}).Decode(&result)
	if err != nil {
		return
	}

	return
}

func (c *FreezeWindowStoreClient) Get(ctx context.Context, filter map[string]interface{}) (result *v1alpha1.FreezeWindow, err error) {
	result = &v1alpha1.FreezeWindow{}
	err = c.collection.FindOne(ctx, filter).Decode(&result)
	return
}

func (c *FreezeWindowStoreClient) Update(ctx context.Context, filter map[string]interface{}, freezeUpdate *v1alpha1.FreezeWindow) (result *v1alpha1.FreezeWindow, err error) {
	result = &v1alpha1.FreezeWindow{}
	freezeUpdate.UpdatedAt = timestamppb.Now()
	updateFilter := bson.D{{Key: "$set", Value: freezeUpdate}}
	err = c.collection.FindOneAndUpdate(ctx, filter, updateFilter).Decode(&result)
	return
}

func (c *FreezeWindowStoreClient) Delete(ctx context.Context, filter map[string]interface{}) (count int64, err error) {
	cursor, err := c.collection.DeleteOne(ctx, filter)
	if err != nil {
		return
	}

	return cursor.DeletedCount, nil
}
