<p align="center" style="margin-top: 120px">

  <h3 align="center">EventsTracker</h3>

  <p align="center">
    An Open-Source monitoring events solution.
    <br />
  </p>
</p>


## About EventsTracker 
 
EventsTracker is open-source alternative to Datadog events or Newrelic custom events. The solution is composed of an api and a cli that enable the creation and retrieval of events in a Mongo or FeretDB database.

The idea behind this solution is to provide a simple way of keeping track of everything that happens on your platform, especially in a world of distributed services. Track the start and end of a deployment incident or the opening of an incident.

Each time an event is created, we create a log in json format, which enables EventsTracker to be coupled with a logging solution such as Opensearch or Loki to correlate with logs and metrics.  

## Getting Started 🚀

### Requirements

- [golang](https://go.dev/) >= 1.21
- [buf](https://buf.build/explore)

### Build 

To compile EventsTracker run this command, output a binnary in bin/event

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
