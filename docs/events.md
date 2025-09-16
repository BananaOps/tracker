# Events API Documentation

L'API Events permet de gérer les événements du système (déploiements, incidents, opérations, etc.).

## Structure d'un Event

```json
{
  "title": "string",
  "attributes": {
    "message": "string",
    "source": "string", 
    "type": "deployment|operation|drift|incident",
    "priority": "P1|P2|P3|P4|P5",
    "relatedId": "uuid",
    "service": "string",
    "status": "start|success|failure|warning|error|open|close|done",
    "environment": "development|integration|TNR|UAT|recette|preproduction|production|mco",
    "impact": boolean,
    "startDate": "timestamp",
    "endDate": "timestamp", 
    "owner": "string",
    "stakeHolders": ["string"],
    "notification": boolean,
    "notifications": ["string"]
  },
  "links": {
    "pullRequestLink": "string",
    "ticket": "string"
  },
  "metadata": {
    "id": "uuid",
    "createdAt": "timestamp",
    "duration": "duration",
    "slackId": "string"
  }
}
```

## Endpoints REST

### Créer un Event
`POST /api/v1alpha1/event`

### Mettre à jour un Event  
`PUT /api/v1alpha1/event`

### Récupérer un Event
`GET /api/v1alpha1/event/{id}`

### Supprimer un Event
`DELETE /api/v1alpha1/event/{id}`

### Lister les Events
`GET /api/v1alpha1/events/list?per_page=10&page=1`

### Rechercher des Events
`GET /api/v1alpha1/events/search?priority=P1&service=my-service&start_date=2024-01-01`

### Events du jour
`GET /api/v1alpha1/events/today?per_page=10&page=1`

## Appels gRPC

Vous pouvez utiliser grpcurl pour appeler l'API gRPC directement :

### Create an Event

```bash
grpcurl --plaintext -d '{
  "attributes": {
    "message": "deployment service serverless version v0.0.1",
    "priority": "1",
    "service": "service-event",
    "source": "github_action",
    "status": "1",
    "type": "1",
    "start_date": "2024-12-20T09:00:00Z",
    "end_date": "2024-12-20T09:00:00Z"
  },
  "links": {
    "pull_request_link": "https://github.com/bananaops/tracker/pull/240"
  },
  "title": "Deployment service lambda"
}' localhost:8765 tracker.event.v1alpha1.EventService/CreateEvent

```

### List Events

```bash
grpcurl --plaintext localhost:8765 tracker.event.v1alpha1.EventService/ListEvents

```
### List Events Today

```bash
grpcurl --plaintext localhost:8765 tracker.event.v1alpha1.EventService/TodayEvents

```


### Get Event Id

```bash
grpcurl --plaintext -d '{
  "id": "3ac2d880-ad52-4d50-b60d-9b44f54ae58f"
}' localhost:8765 tracker.event.v1alpha1.EventService/GetEvent  

```

### Get Search Event

```bash
// With Priority P1
grpcurl --plaintext -d '{
  "priority": "1"
}' localhost:8765 tracker.event.v1alpha1.EventService/SearchEvents

// With Priority P1 and Start Date
grpcurl --plaintext -d '{
  "priority": "1",
  "start_date": "2024-02-27"
}' localhost:8765 tracker.event.v1alpha1.EventService/SearchEvents

// With Priority P1 and End Date
grpcurl --plaintext -d '{
  "priority": "1",
  "end_date": "2024-02-28T15:04:05-07:00"
}' localhost:8765 tracker.event.v1alpha1.EventService/SearchEvents

```

## Exemples d'appels REST

### Create an Event

```bash
curl -X POST localhost:8080/api/v1alpha1/event -d '
{
    "title": "Deployment service lambda",
    "attributes": {
      "message": "deployment service version v0.0.1",
      "source": "github_action",
      "type": 1,
      "priority": 1,
      "relatedId": "",
      "service": "service-event",
      "status": 1
    },
    "links": {
      "pullRequestLink": "https://github.com/bananaops/events-tracker/pull/240"
    }
}'
```


### List Events

```bash
curl "http://localhost:8080/api/v1alpha1/events/list"
```

### Get Event Id

```bash
curl "localhost:8080/api/v1alpha1/event/a5fa1d90-44c9-4d4a-a436-930a9ee37e79"
```

### Get Search Event

```bash
// With Priority P3
curl "localhost:8080/api/v1alpha1/events/search?priority=3"

// With Priority P1 and Start Date
curl "localhost:8080/api/v1alpha1/events/search?start_date=2024-03-01"

// With Priority P1 and End Date
curl "localhost:8080/api/v1alpha1/events/search?end_date=2024-03-01"

```
