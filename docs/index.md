# Documentation Tracker API

## Vue d'ensemble

Tracker est une API de gestion d'événements, de catalogues et de verrous construite avec gRPC et exposée via REST.

## Navigation

### 📚 Documentation générale
- [README](./README.md) - Vue d'ensemble et architecture
- [Spécification API](./api-specification.md) - OpenAPI et Protobuf

### 🔧 APIs par service  
- [Events API](./events.md) - Gestion des événements
- [Catalog API](./catalog.md) - Gestion du catalogue
- [Locks API](./locks.md) - Gestion des verrous

### 🌐 Accès rapide
- **Swagger UI** : http://localhost:8080/docs
- **API REST** : http://localhost:8080/api/v1alpha1/
- **gRPC** : localhost:8765
- **Métriques** : http://localhost:8081/metrics

## Démarrage rapide

1. **Démarrer le serveur**
   ```bash
   go run main.go serv
   ```

2. **Tester l'API**
   ```bash
   # Via REST
   curl http://localhost:8080/api/v1alpha1/events/list
   
   # Via gRPC  
   grpcurl --plaintext localhost:8765 tracker.event.v1alpha1.EventService/ListEvents
   ```

3. **Explorer avec Swagger UI**
   
   Ouvrir http://localhost:8080/docs dans votre navigateur

## Structure du projet

```
├── cmd/serv.go              # Serveur principal
├── proto/                   # Définitions protobuf
│   ├── catalog/v1alpha1/
│   ├── event/v1alpha1/
│   └── lock/v1alpha1/
├── generated/               # Code généré
│   ├── proto/
│   └── openapiv2/
├── server/                  # Implémentations des services
└── docs/                    # Documentation
```

## Génération de code

```bash
# Générer le code à partir des protobuf
buf generate

# Linter les protobuf
buf lint

# Formater les protobuf  
buf format -w
```
