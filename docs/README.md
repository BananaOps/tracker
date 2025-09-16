# Tracker API Documentation

Tracker est une API de gestion d'événements, de catalogues et de verrous (locks) construite avec gRPC et exposée via REST grâce à grpc-gateway.

## Architecture

- **gRPC Server**: Port 8765
- **HTTP/REST Server**: Port 8080  
- **Metrics Server**: Port 8081
- **Swagger UI**: http://localhost:8080/docs
- **OpenAPI Spec**: http://localhost:8080/swagger.json

## Services Disponibles

### 1. EventService
Gestion des événements (déploiements, opérations, incidents, etc.)

**Endpoints principaux:**
- `POST /api/v1alpha1/event` - Créer un événement
- `PUT /api/v1alpha1/event` - Mettre à jour un événement  
- `GET /api/v1alpha1/event/{id}` - Récupérer un événement
- `DELETE /api/v1alpha1/event/{id}` - Supprimer un événement
- `GET /api/v1alpha1/events/list` - Lister les événements
- `GET /api/v1alpha1/events/search` - Rechercher des événements
- `GET /api/v1alpha1/events/today` - Événements du jour

### 2. CatalogService  
Gestion du catalogue de modules, bibliothèques, projets, etc.

**Endpoints principaux:**
- `PUT /api/v1alpha1/catalog` - Créer/Mettre à jour un élément du catalogue
- `GET /api/v1alpha1/catalog` - Récupérer un élément du catalogue
- `DELETE /api/v1alpha1/catalog` - Supprimer un élément du catalogue
- `GET /api/v1alpha1/catalogs/list` - Lister les éléments du catalogue

### 3. LockService
Gestion des verrous pour la synchronisation de services

**Endpoints principaux:**
- `POST /api/v1alpha1/lock` - Créer un verrou
- `GET /api/v1alpha1/lock/{id}` - Récupérer un verrou
- `GET /api/v1alpha1/unlock/{id}` - Libérer un verrou
- `GET /api/v1alpha1/locks/list` - Lister les verrous

## Types et Énumérations

### Event Types
- `deployment` - Déploiement
- `operation` - Opération
- `drift` - Dérive de configuration
- `incident` - Incident

### Event Priority
- `P1` - Critique
- `P2` - Élevée
- `P3` - Moyenne
- `P4` - Faible
- `P5` - Très faible

### Event Status
- `start` - Démarré
- `success` - Succès
- `failure` - Échec
- `warning` - Avertissement
- `error` - Erreur
- `open` - Ouvert
- `close` - Fermé
- `done` - Terminé

### Catalog Types
- `module` - Module
- `library` - Bibliothèque
- `workflow` - Workflow
- `project` - Projet
- `chart` - Chart Helm
- `package` - Package
- `container` - Conteneur

### Languages
- `golang`, `java`, `kotlin`, `python`, `javascript`, `typescript`
- `terraform`, `helm`, `yaml`, `docker`
- `php`, `rust`, `groovy`

## Documentation Détaillée

- [Events API](./events.md) - Documentation complète de l'API Events
- [Catalog API](./catalog.md) - Documentation complète de l'API Catalog  
- [Locks API](./locks.md) - Documentation complète de l'API Locks

## Swagger UI

L'interface Swagger UI est disponible à l'adresse http://localhost:8080/docs pour explorer et tester l'API de manière interactive.

## Protobuf

Les définitions protobuf sont disponibles dans le dossier `proto/` :
- `proto/event/v1alpha1/event.proto`
- `proto/catalog/v1alpha1/catalog.proto`  
- `proto/lock/v1alpha1/lock.proto`

## Génération de Code

Le code est généré automatiquement à partir des fichiers protobuf via `buf generate`.
