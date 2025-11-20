package store

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log"
	"os"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/bananaops/tracker/internal/config"
)

// MongoClient is used to interact with features
type MongoClient struct {
	collection *mongo.Collection
}

var caCertPool *x509.CertPool
var cert tls.Certificate
var mongoClient *mongo.Client
var mongoDatabase *mongo.Database

func NewClient(collection string) (c *mongo.Collection) {

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

	// Stocker le client et la database pour l'initialisation des index
	mongoClient = m
	mongoDatabase = m.Database(config.Name)

	// init client collection
	err = mongoDatabase.CreateCollection(ctx, collection)
	if err != nil {
		// Ignorer l'erreur si la collection existe déjà
		log.Printf("collection %s may already exist: %v", collection, err)
	}

	return mongoDatabase.Collection(collection)
}

// GetDatabase retourne l'instance de la base de données MongoDB
// Utilisé pour l'initialisation des index
func GetDatabase() *mongo.Database {
	return mongoDatabase
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
