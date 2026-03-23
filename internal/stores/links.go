package store

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// LinkItem represents a single link stored in MongoDB
type LinkItem struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Group       string             `bson:"group" json:"group"`
	Name        string             `bson:"name" json:"name"`
	URL         string             `bson:"url" json:"url"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Icon        string             `bson:"icon,omitempty" json:"icon,omitempty"`
	Color       string             `bson:"color,omitempty" json:"color,omitempty"`
	Logo        string             `bson:"logo,omitempty" json:"logo,omitempty"`
	CreatedAt   int64              `bson:"created_at" json:"created_at"`
	UpdatedAt   int64              `bson:"updated_at" json:"updated_at"`
}

type LinksStoreClient struct {
	collection *mongo.Collection
}

func NewStoreLinks(collection string) *LinksStoreClient {
	return &LinksStoreClient{
		collection: NewClient(collection),
	}
}

func (c *LinksStoreClient) List(ctx context.Context) ([]*LinkItem, error) {
	opts := options.Find().SetSort(bson.D{{Key: "group", Value: 1}, {Key: "name", Value: 1}})
	cursor, err := c.collection.Find(ctx, bson.D{}, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list links: %w", err)
	}
	var results []*LinkItem
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("failed to decode links: %w", err)
	}
	return results, nil
}

func (c *LinksStoreClient) Create(ctx context.Context, item *LinkItem) (*LinkItem, error) {
	now := time.Now().Unix()
	item.ID = primitive.NewObjectID()
	item.CreatedAt = now
	item.UpdatedAt = now
	_, err := c.collection.InsertOne(ctx, item)
	if err != nil {
		return nil, fmt.Errorf("failed to create link: %w", err)
	}
	return item, nil
}

func (c *LinksStoreClient) Update(ctx context.Context, id string, item *LinkItem) (*LinkItem, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid link id %s: %w", id, err)
	}
	item.UpdatedAt = time.Now().Unix()
	filter := bson.D{{Key: "_id", Value: oid}}
	update := bson.D{{Key: "$set", Value: bson.D{
		{Key: "group", Value: item.Group},
		{Key: "name", Value: item.Name},
		{Key: "url", Value: item.URL},
		{Key: "description", Value: item.Description},
		{Key: "icon", Value: item.Icon},
		{Key: "color", Value: item.Color},
		{Key: "logo", Value: item.Logo},
		{Key: "updated_at", Value: item.UpdatedAt},
	}}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var result LinkItem
	if err := c.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to update link %s: %w", id, err)
	}
	return &result, nil
}

func (c *LinksStoreClient) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return fmt.Errorf("invalid link id %s: %w", id, err)
	}
	filter := bson.D{{Key: "_id", Value: oid}}
	_, err = c.collection.DeleteOne(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete link %s: %w", id, err)
	}
	return nil
}
