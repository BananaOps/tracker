# Catalogs Documentation

## Grpc Call

You can use Grpcurl to call grpc api

### Create an Catalog

```bash
grpcurl --plaintext -d '{
  "name": "module/context",
  "version": "2.1.0",
  "languages": 4,
  "type": 1,
  "description": "module with context variable",
  "owner": "devops",
  "links": "test",
}' localhost:8765 tracker.catalog.v1alpha1.CatalogService/CreateUpdateCatalog

```

### List Catalogs

```bash
grpcurl --plaintext localhost:8765 tracker.catalog.v1alpha1.CatalogService/ListCatalogs

```

### Get Catalog Name

```bash
grpcurl --plaintext -d '{
  "name": "lambda/zip"
}' localhost:8765 tracker.catalog.v1alpha1.CatalogService/GetCatalog  

```

## Rest Call

### Create an Catalog

```bash
curl -X PUT localhost:8080/api/v1alpha1/catalog -d '{
    "name": "module/context",
    "version": "2.1.0",
    "languages": 4,
    "type": 1,
    "description": "module with context variable",
    "owner": "devops",
    "links": "test"
}'
```

### List Catalogs

```bash
curl "http://localhost:8080/api/v1alpha1/catalogs/list"
```

### Get Catalog Name

```bash
curl "localhost:8080/api/v1alpha1/catalog/lambda/zip"
```

