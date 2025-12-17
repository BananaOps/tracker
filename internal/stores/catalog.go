package store

import (
	"context"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CatalogStoreClient struct {
	collection *mongo.Collection
}

func NewStoreCatalog(collection string) (c *CatalogStoreClient) {
	return &CatalogStoreClient{
		collection: NewClient(collection),
	}
}

// List takes label and field selectors, and returns the list of Catalogs that match those selectors.
func (c *CatalogStoreClient) List(ctx context.Context) (results []*v1alpha1.Catalog, err error) {
	cursor, err := c.collection.Find(context.TODO(), bson.D{})
	if err != nil {
		return nil, err
	}
	if err = cursor.All(context.TODO(), &results); err != nil {
		return
	}

	return
}

// Get an Catalog and creates it.  Returns the server's representation of the Catalog, and an error, if there is any.
func (c *CatalogStoreClient) Get(ctx context.Context, filter map[string]interface{}) (result *v1alpha1.Catalog, err error) {
	result = &v1alpha1.Catalog{}

	err = c.collection.FindOne(context.TODO(), filter).Decode(&result)
	return
}

func (c *CatalogStoreClient) Update(ctx context.Context, filter map[string]interface{}, catalogUpdate *v1alpha1.Catalog) (result *v1alpha1.Catalog, err error) {
	result = &v1alpha1.Catalog{}
	updateFilter := bson.D{{Key: "$set", Value: catalogUpdate}}
	// Options to enable upsert and return the document after update
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	err = c.collection.FindOneAndUpdate(ctx, filter, updateFilter, opts).Decode(&result)
	return
}

func (c *CatalogStoreClient) Delete(ctx context.Context, filter map[string]interface{}) (err error) {
	_, err = c.collection.DeleteOne(context.TODO(), filter)
	return
}

/*
// Fonction pour construire dynamiquement bson.D en fonction des champs non vides
func buildBsonUpdateCatalog(catalog *v1alpha1.Catalog) bson.D {
	update := bson.D{}

	// Vérifier chaque champ de la structure Catalog
	if catalog.Title != "" {
		update = append(update, bson.E{Key: "title", Value: catalog.Title})
	}

	// Vérifier les champs de Attributes s'ils ne sont pas nil et non vides
	if catalog.Attributes != nil {
		attributes := bson.D{}
		v := reflect.ValueOf(catalog.Attributes).Elem()
		t := reflect.TypeOf(catalog.Attributes).Elem()
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
	if catalog.Links != nil {
		links := bson.D{}
		v := reflect.ValueOf(catalog.Links).Elem()
		t := reflect.TypeOf(catalog.Links).Elem()
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
	if catalog.Metadata != nil {
		metadata := bson.D{}
		v := reflect.ValueOf(catalog.Metadata).Elem()
		t := reflect.TypeOf(catalog.Metadata).Elem()
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
