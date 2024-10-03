<p align="center" style="margin-top: 120px">

  <h3 align="center">Tracker</h3>

  <p align="center">
    An Open-Source monitoring events tracking solution.
    <br />
  </p>
</p>


## About Tracker 
 
Tracker is open-source alternative to Datadog events or Newrelic custom events. The solution is composed of an api and a cli that enable the creation and retrieval of events in a Mongo or FeretDB database.

The idea behind this solution is to provide a simple way of keeping track of everything that happens on your platform, especially in a world of distributed services. Track the start and end of a deployment incident or the opening of an incident.

Each time an event is created, we create a log in json format, which enables tracker to be coupled with a logging solution such as Opensearch or Loki to correlate with logs and metrics.  

## Features

- [x] Grpc Server
- [x] Rest Server
- [ ] Option to start server
- [x] Linked event in attributes
- [x] Link a pull_request to an event
- [x] Calculates the time between two linked events
- [ ] Cli to create and search event
- [ ] Lock deployment endpoint
- [ ] Add to cli lock and unlock function
- [ ] Config file for cli
- [ ] function search event of the day on cli
- [ ] Github Action to add event in CD pipeline
- [ ] Gitlab example to add event in CD pipeline

## Getting Started 🚀

### Requirements

- [golang](https://go.dev/) >= 1.21
- [buf](https://buf.build/explore)

### Build 

To compile tracker run this command, output a binnary in bin/event

```bash
make build
```

### Update Protobuf Files

To updates protobuf files : 

```bash
make generate
```

### Test

To run test: 

```bash
make test
```


## Grpc Call

You can use Grpcurl to call grpc api

### Create an Event

```bash
grpcurl --plaintext -d '{
  "attributes": {
    "message": "deployment service serverless version v0.0.1",
    "priority": "4",
    "service": "service-event",
    "source": "github_action",
    "status": "1",
    "type": "1"
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

### Create Lock

```bash
grpcurl --plaintext -d '{
  "service": "tracker-service",
  "who": "jplanckeel"
}' localhost:8765 tracker.lock.v1alpha1.LockService/CreateLock
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

### List Locks

```bash
grpcurl --plaintext localhost:8765 tracker.lock.v1alpha1.LockService/ListLocks
```

## Contributing

Please see the [contribution guidelines](https://github.com/BananaOps/tracker/blob/main/CONTRIBUTING.md) and our [code of conduct](https://github.com/BananaOps/tracker/blob/main/CODE_OF_CONDUCT.md). All contributions are subject to the [Apache 2.0 open source license](https://github.com/BananaOps/tracker/blob/main/LICENSE).

`help wanted` issues:
- [Tracker](https://github.com/BananaOps/tracker/labels/help%20wanted)
