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

	// init client collection
	db := m.Database(config.Name)
	err = db.CreateCollection(ctx, collection)
	if err != nil {
		log.Fatalf("error create collection %s", err)
	}

	return db.Collection(collection)
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
