package store

import (
	"context"
	"log"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	"google.golang.org/protobuf/types/known/timestamppb"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/google/uuid"
)

type EventStoreClient struct {
	collection *mongo.Collection
}

func NewStoreEvent(collection string) (c *EventStoreClient) {
	return &EventStoreClient{
		collection: NewClient(collection),
	}
}

// List takes label and field selectors, and returns the list of Events that match those selectors.
func (c *EventStoreClient) List(ctx context.Context) (results []*v1alpha1.Event, err error) {
	cursor, err := c.collection.Find(context.TODO(), bson.D{})
	if err != nil {
		return nil, err
	}
	if err = cursor.All(context.TODO(), &results); err != nil {
		return
	}

	return
}

// Create takes the representation of an Event and creates it.  Returns the server's representation of the Event, and an error, if there is any.
func (c *EventStoreClient) Create(ctx context.Context, eventInsert *v1alpha1.Event) (result *v1alpha1.Event, err error) {
	result = &v1alpha1.Event{}
	id := uuid.New()
	eventInsert.Metadata.Id = id.String()
	eventInsert.Metadata.CreatedAt = timestamppb.Now()

	_, err = c.collection.InsertOne(context.TODO(), eventInsert)
	if err != nil {
		log.Fatalln("Error Inserting Document", err)
	}

	err = c.collection.FindOne(context.TODO(), map[string]interface{}{"metadata.id": &eventInsert.Metadata.Id}).Decode(&result)
	if err != nil {
		return
	}

	return
}

// Get an Event and creates it.  Returns the server's representation of the Event, and an error, if there is any.
func (c *EventStoreClient) Get(ctx context.Context, filter map[string]interface{}) (result *v1alpha1.Event, err error) {
	result = &v1alpha1.Event{}

	err = c.collection.FindOne(context.TODO(), filter).Decode(&result)
	return
}

// Get an Event and creates it.  Returns the server's representation of the Event, and an error, if there is any.
func (c *MongoClient) Count(ctx context.Context) (count int64, err error) {
	opts := options.Count().SetHint("_id_")
	count, err = c.collection.CountDocuments(context.TODO(), bson.D{}, opts)
	return
}

// Search and returns the list of Events that match those selectors.
func (c *EventStoreClient) Search(ctx context.Context, filter map[string]interface{}) (results []*v1alpha1.Event, err error) {

	cursor, err := c.collection.Find(context.TODO(), filter)
	if err != nil {
		return
	}
	if err = cursor.All(context.TODO(), &results); err != nil {
		return
	}
	defer cursor.Close(context.Background())

	return
}

func (c *EventStoreClient) Update(ctx context.Context, filter map[string]interface{}, eventUpdate *v1alpha1.Event) (result *v1alpha1.Event, err error) {
	result = &v1alpha1.Event{}
	updateFilter := bson.D{{Key: "$set", Value: eventUpdate}}
	err = c.collection.FindOneAndUpdate(context.TODO(), filter, updateFilter).Decode(&result)
	return
}

func (c *EventStoreClient) Delete(ctx context.Context, filter map[string]interface{}) (err error) {
	_, err = c.collection.DeleteOne(context.TODO(), filter)
	return
}

// CountWithFilter counts events matching the given filter
func (c *EventStoreClient) CountWithFilter(ctx context.Context, filter bson.D) (int64, error) {
	return c.collection.CountDocuments(ctx, filter)
}

// MonthlyStatsResult represents a single month's statistics
type MonthlyStatsResult struct {
	Year    int32  `bson:"year"`
	Month   int32  `bson:"month"`
	Service string `bson:"service,omitempty"`
	Count   int64  `bson:"count"`
}

// AggregateByMonth aggregates events by month with optional service grouping
func (c *EventStoreClient) AggregateByMonth(ctx context.Context, matchFilter bson.D, groupByService bool) ([]MonthlyStatsResult, error) {
	// Build the group stage
	groupID := bson.D{
		{Key: "year", Value: bson.D{{Key: "$year", Value: bson.D{{Key: "$toDate", Value: bson.D{{Key: "$multiply", Value: bson.A{"$metadata.createdat.seconds", 1000}}}}}}}},
		{Key: "month", Value: bson.D{{Key: "$month", Value: bson.D{{Key: "$toDate", Value: bson.D{{Key: "$multiply", Value: bson.A{"$metadata.createdat.seconds", 1000}}}}}}}},
	}

	if groupByService {
		groupID = append(groupID, bson.E{Key: "service", Value: "$attributes.service"})
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchFilter}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: groupID},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
		{{Key: "$project", Value: bson.D{
			{Key: "_id", Value: 0},
			{Key: "year", Value: "$_id.year"},
			{Key: "month", Value: "$_id.month"},
			{Key: "service", Value: "$_id.service"},
			{Key: "count", Value: 1},
		}}},
		{{Key: "$sort", Value: bson.D{
			{Key: "year", Value: 1},
			{Key: "month", Value: 1},
			{Key: "service", Value: 1},
		}}},
	}

	cursor, err := c.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []MonthlyStatsResult
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}

/*
// Fonction pour construire dynamiquement bson.D en fonction des champs non vides
func buildBsonUpdate(event *v1alpha1.Event) bson.D {
	update := bson.D{}

	// Vérifier chaque champ de la structure Event
	if event.Title != "" {
		update = append(update, bson.E{Key: "title", Value: event.Title})
	}

	// Vérifier les champs de Attributes s'ils ne sont pas nil et non vides
	if event.Attributes != nil {
		attributes := bson.D{}
		v := reflect.ValueOf(event.Attributes).Elem()
		t := reflect.TypeOf(event.Attributes).Elem()
		for i := 0; i < v.NumField(); i++ {
			field := v.Field(i)
			if !field.IsZero() { // Si le champ n'est pas vide
				attributes = append(attributes, bson.E{t.Field(i).Tag.Get("json"), field.Interface()})
			}
		}
		if len(attributes) > 0 {
			update = append(update, bson.E{"attributes", attributes})
		}
	}

	// Vérifier les champs de Links s'ils ne sont pas nil et non vides
	if event.Links != nil {
		links := bson.D{}
		v := reflect.ValueOf(event.Links).Elem()
		t := reflect.TypeOf(event.Links).Elem()
		for i := 0; i < v.NumField(); i++ {
			field := v.Field(i)
			if !field.IsZero() { // Si le champ n'est pas vide
				links = append(links, bson.E{t.Field(i).Tag.Get("json"), field.Interface()})
			}
		}
		if len(links) > 0 {
			update = append(update, bson.E{"links", links})
		}
	}

	// Vérifier les champs de Metadata s'ils ne sont pas nil et non vides
	if event.Metadata != nil {
		metadata := bson.D{}
		v := reflect.ValueOf(event.Metadata).Elem()
		t := reflect.TypeOf(event.Metadata).Elem()
		for i := 0; i < v.NumField(); i++ {
			field := v.Field(i)
			if !field.IsZero() { // Si le champ n'est pas vide
				metadata = append(metadata, bson.E{t.Field(i).Tag.Get("json"), field.Interface()})
			}
		}
		if len(metadata) > 0 {
			update = append(update, bson.E{"metadata", metadata})
		}
	}

	return update
}
*/
