package store

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log"
	"os"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/event/v1alpha1"
	"google.golang.org/protobuf/types/known/timestamppb"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/bananaops/tracker/internal/config"
	"github.com/google/uuid"
)

// MongoClient is used to interact with features
type MongoClient struct {
	collection *mongo.Collection
}

var caCertPool *x509.CertPool
var cert tls.Certificate

func NewClient() (client MongoClient) {

	config := config.ConfigDatabase
	var m *mongo.Client
	var err error

	uri := createMongoUri(config)
	ctx := context.Background()

	if config.CAFile != "" {
		tlsConfig := loadTlsCerts(config)
		m, err = mongo.Connect(ctx, options.Client().ApplyURI(uri).SetTLSConfig(tlsConfig))
		if err != nil {
			log.Fatalf("error connect db %s", err)
		}
	} else {
		m, err = mongo.Connect(ctx, options.Client().ApplyURI(uri))
		if err != nil {
			log.Fatalf("error connect db %s", err)
		}
	}

	// init client collection
	db := m.Database(config.Name)
	err = db.CreateCollection(ctx, config.Collection)
	if err != nil {
		log.Fatalf("error create collection %s", err)
	}
	client.collection = db.Collection(config.Collection)

	return client
}

func loadTlsCerts(config config.Database) (tlsConfig *tls.Config) {

	// Loads CA certificate file
	caCert, err := os.ReadFile(config.CAFile)
	if err != nil {
		panic(err)
	}
	caCertPool = x509.NewCertPool()
	if ok := caCertPool.AppendCertsFromPEM(caCert); !ok {
		panic("Error: CA file must be in PEM format")
	}

	// Loads client certificate files
	if config.CertFile != "" && config.KeyFile != "" {
		cert, err = tls.LoadX509KeyPair(config.CertFile, config.KeyFile)
		if err != nil {
			panic(err)
		}
	}

	return &tls.Config{
		RootCAs:      caCertPool,
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS13,
	}

}

func createMongoUri(config config.Database) (uri string) {
	// prepare the uri for the connection
	if config.Username != "" && config.Password != "" {
		return fmt.Sprintf(
			"mongodb://%s:%s@%s:%s/%s?maxPoolSize=20&tls=true&authMechanism=PLAIN",
			config.Username,
			config.Password,
			config.Host,
			config.Port,
			config.Name,
		)
	} else {
		return fmt.Sprintf(
			"mongodb://%s:%s/%s?maxPoolSize=20",
			config.Host,
			config.Port,
			config.Name,
		)
	}

}

// List takes label and field selectors, and returns the list of Events that match those selectors.
func (c *MongoClient) List(ctx context.Context) (results []*v1alpha1.Event, err error) {
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
func (c *MongoClient) Create(ctx context.Context, eventInsert *v1alpha1.Event) (result *v1alpha1.Event, err error) {
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
func (c *MongoClient) Get(ctx context.Context, filter map[string]interface{}) (result *v1alpha1.Event, err error) {
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
func (c *MongoClient) Search(ctx context.Context, filter map[string]interface{}) (results []*v1alpha1.Event, err error) {

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
