package server

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	v1alpha1 "github.com/bananaops/tracker/generated/proto/catalog/v1alpha1"
	"github.com/bananaops/tracker/internal/config"
	store "github.com/bananaops/tracker/internal/stores"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Catalog struct {
	v1alpha1.UnimplementedCatalogServiceServer
	store  *store.CatalogStoreClient
	logger *slog.Logger
}

func NewCatalog() *Catalog {
	return &Catalog{
		UnimplementedCatalogServiceServer: v1alpha1.UnimplementedCatalogServiceServer{},
		store:                             store.NewStoreCatalog(config.ConfigDatabase.CatalogCollection),
		logger:                            slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

func (e *Catalog) CreateUpdateCatalog(
	ctx context.Context,
	i *v1alpha1.CreateUpdateCatalogRequest,
) (*v1alpha1.CreateUpdateCatalogResponse, error) {

	var catalog = &v1alpha1.Catalog{
		Name:        i.Name,
		Type:        i.Type,
		Languages:   i.Languages,
		Owner:       i.Owner,
		Version:     i.Version,
		Link:        i.Link,
		Description: i.Description,
		Repository:  i.Repository,
	}

	catalog.UpdatedAt = timestamppb.Now()

	var catalogResult = &v1alpha1.CreateUpdateCatalogResponse{}
	var err error
	var logMessage  = "catalog updated"

	// check entry exist in catalog colection
	_, err = e.store.Get(context.Background(), map[string]interface{}{"name": &i.Name})
	if err != nil {
		catalog.CreatedAt = timestamppb.Now()
		logMessage = "catalog created"
	}

	catalogResult.Catalog, err = e.store.Update(context.Background(), map[string]interface{}{"name": i.Name}, catalog)
	if err != nil {
		return nil, err
	}

	// log catalog to json format
	e.logger.Info(logMessage,
		"name", catalogResult.Catalog.Name,
		"type", catalogResult.Catalog.Type.String(),
		"languages", catalogResult.Catalog.Languages.String(),
		"owner", catalogResult.Catalog.Owner,
		"version", catalogResult.Catalog.Version,
		"link", catalogResult.Catalog.Link,
		"description", catalogResult.Catalog.Description,
		"repository", catalogResult.Catalog.Repository,
		"created_at", catalogResult.Catalog.CreatedAt.AsTime(),
		"updated_at", catalogResult.Catalog.UpdatedAt.AsTime(),
	)

	return catalogResult, nil
}

func (e *Catalog) GetCatalog(
	ctx context.Context,
	i *v1alpha1.GetCatalogRequest,
) (*v1alpha1.GetCatalogResponse, error) {

	var catalogResult = &v1alpha1.GetCatalogResponse{}
	var err error

	catalogResult.Catalog, err = e.store.Get(context.Background(), map[string]interface{}{"name": i.Name})
	if err != nil {
		return nil, fmt.Errorf("no catalog found in tracker for id %s", i.Name)
	}
	return catalogResult, nil
}

func (e *Catalog) ListCatalogs(
	ctx context.Context,
	i *v1alpha1.ListCatalogsRequest,
) (*v1alpha1.ListCatalogsResponse, error) {

	var catalogsResult = &v1alpha1.ListCatalogsResponse{}
	var err error

	catalogsResult.Catalogs, err = e.store.List(context.Background())
	if err != nil {
		return nil, err
	}
	catalogsResult.TotalCount = uint32(len(catalogsResult.Catalogs))

	return catalogsResult, nil
}

func (e *Catalog) DeleteCatalog(
	ctx context.Context,
	i *v1alpha1.DeleteCatalogRequest,
) (*v1alpha1.DeleteCatalogResponse, error) {

	var catalogResult = &v1alpha1.DeleteCatalogResponse{}

	err := e.store.Delete(context.Background(), map[string]interface{}{"name": i.Name})
	if err != nil {
		return nil, err
	}

	return catalogResult, nil
}
