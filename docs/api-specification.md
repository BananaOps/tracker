# API Specification

## OpenAPI / Swagger

L'API Tracker est documentée via OpenAPI 2.0 (Swagger). La spécification complète est générée automatiquement à partir des fichiers protobuf.

### Accès à la documentation

- **Swagger UI interactif** : http://localhost:8080/docs
- **Spécification JSON** : http://localhost:8080/swagger.json
- **Fichier généré** : `generated/openapiv2/apidocs.swagger.json`

### Génération automatique

La documentation OpenAPI est générée via `buf generate` à partir des annotations `google.api.http` dans les fichiers protobuf.

## Protobuf Definitions

### Structure des fichiers

```
proto/
├── catalog/v1alpha1/catalog.proto
├── event/v1alpha1/event.proto  
└── lock/v1alpha1/lock.proto
```

### Services définis

#### EventService
- **Package** : `tracker.event.v1alpha1`
- **Go Package** : `proto/event/v1alpha1`
- **Méthodes** : CreateEvent, UpdateEvent, DeleteEvents, GetEvent, SearchEvents, ListEvents, TodayEvents

#### CatalogService  
- **Package** : `tracker.catalog.v1alpha1`
- **Go Package** : `proto/catalog/v1alpha1`
- **Méthodes** : CreateUpdateCatalog, GetCatalog, DeleteCatalog, ListCatalogs

#### LockService
- **Package** : `tracker.lock.v1alpha1` 
- **Go Package** : `proto/lock/v1alpha1`
- **Méthodes** : CreateLock, GetLock, UnLock, ListLocks

### Annotations HTTP

Chaque méthode gRPC est annotée avec `google.api.http` pour définir les endpoints REST correspondants :

```protobuf
rpc CreateEvent(CreateEventRequest) returns (CreateEventResponse) {
  option (google.api.http) = {
    post: "/api/v1alpha1/event"
    body: "*"
  };
}
```

### Validation

Les messages utilisent `validate/validate.proto` pour la validation des données :

```protobuf
string id = 1 [(validate.rules).string = {uuid: true}];
```

## Génération de code

### Configuration buf.gen.yaml

Le fichier `buf.gen.yaml` configure la génération de code :

```yaml
version: v2
managed:
  enabled: true
plugins:
  - local: protoc-gen-go
    out: generated
    opt: paths=source_relative
  - local: protoc-gen-go-grpc  
    out: generated
    opt: paths=source_relative
  - local: protoc-gen-grpc-gateway
    out: generated
    opt: paths=source_relative
  - local: protoc-gen-openapiv2
    out: generated
```

### Commandes de génération

```bash
# Générer tout le code
buf generate

# Générer seulement Go
buf generate --template buf.gen.go.yaml

# Générer seulement OpenAPI
buf generate --template buf.gen.openapi.yaml
```

### Fichiers générés

```
generated/
├── proto/
│   ├── catalog/v1alpha1/
│   ├── event/v1alpha1/
│   └── lock/v1alpha1/
└── openapiv2/
    └── apidocs.swagger.json
```

## Intégration dans le serveur

Le serveur HTTP intègre automatiquement :
- Les handlers REST générés par grpc-gateway
- La documentation Swagger UI via go-swagger
- Le fichier de spécification OpenAPI

```go
// Swagger UI disponible sur /docs
opts := middleware.SwaggerUIOpts{SpecURL: "/swagger.json"}
sh := middleware.SwaggerUI(opts, nil)
```
