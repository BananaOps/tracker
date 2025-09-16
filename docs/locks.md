# Locks API Documentation

L'API Locks permet de gérer des verrous distribués pour la synchronisation entre services.

## Structure d'un Lock

```json
{
  "id": "uuid",
  "service": "string", 
  "who": "string",
  "createdAt": "timestamp"
}
```

## Endpoints REST

### Créer un Lock
`POST /api/v1alpha1/lock`

### Récupérer un Lock
`GET /api/v1alpha1/lock/{id}`

### Libérer un Lock  
`GET /api/v1alpha1/unlock/{id}`

### Lister les Locks
`GET /api/v1alpha1/locks/list?per_page=10&page=1`

## Cas d'usage

Les locks sont utilisés pour :
- Synchroniser les déploiements
- Éviter les opérations concurrentes
- Gérer l'accès exclusif à des ressources
- Coordonner les tâches entre services

## Appels gRPC

Vous pouvez utiliser grpcurl pour appeler l'API gRPC directement :


### Create Lock

```bash
grpcurl --plaintext -d '{
  "service": "tracker-service",
  "who": "jplanckeel"
}' localhost:8765 tracker.lock.v1alpha1.LockService/CreateLock
```

### List Locks

```bash
grpcurl --plaintext localhost:8765 tracker.lock.v1alpha1.LockService/ListLocks
```

### Get Lock

```bash
grpcurl --plaintext -d '{
  "id": "2db91b8b-84ab-4e20-86e0-2104366bec5e"
}' localhost:8765 tracker.lock.v1alpha1.LockService/GetLock
```

### Delete Lock

```bash
grpcurl --plaintext -d '{
  "id": "2db91b8b-84ab-4e20-86e0-2104366bec5e"
}' localhost:8765 tracker.lock.v1alpha1.LockService/UnLock
```

## Exemples d'appels REST


### Create Lock

```bash
curl -X POST localhost:8080/api/v1alpha1/lock -d '
{
  "service": "tracker-service",
  "who": "jplanckeel"
}'
```

### List Locks

```bash
curl "localhost:8080/api/v1alpha1/locks/list"
```

### Get Lock

```bash
curl "localhost:8080/api/v1alpha1/lock/57fcab51-c8ab-4f92-8d10-b41e456e8354"
```

### Delete Lock

```bash
curl -X DELETE "localhost:8080/api/v1alpha1/unlock/e8ac122e-13cb-4abe-a127-98ec87acfb77"
```
