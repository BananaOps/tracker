# Catalog API Documentation

L'API Catalog permet de gérer un catalogue de modules, bibliothèques, projets et autres ressources.

## Structure d'un Catalog

```json
{
  "name": "string",
  "type": "module|library|workflow|project|chart|package|container",
  "languages": "golang|java|kotlin|python|javascript|typescript|terraform|helm|yaml|docker|php|rust|groovy",
  "owner": "string",
  "version": "string",
  "link": "string",
  "description": "string", 
  "repository": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Endpoints REST

### Créer/Mettre à jour un élément du Catalog
`PUT /api/v1alpha1/catalog`

### Récupérer un élément du Catalog  
`GET /api/v1alpha1/catalog?name=module-name`

### Supprimer un élément du Catalog
`DELETE /api/v1alpha1/catalog?name=module-name`

### Lister les éléments du Catalog
`GET /api/v1alpha1/catalogs/list?per_page=10&page=1`

## Types disponibles

- **module** - Module réutilisable
- **library** - Bibliothèque de code
- **workflow** - Workflow CI/CD
- **project** - Projet complet
- **chart** - Chart Helm
- **package** - Package distribué
- **container** - Image de conteneur

## Langages supportés

golang, java, kotlin, python, javascript, typescript, terraform, helm, yaml, docker, php, rust, groovy

## Appels gRPC

Vous pouvez utiliser grpcurl pour appeler l'API gRPC directement :

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

## Exemples d'appels REST

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

