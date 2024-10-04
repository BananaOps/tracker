# Lock Documentation

## Grpc Call

You can use Grpcurl to call grpc api


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

## Rest Call


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
