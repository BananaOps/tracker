<p align="center" style="margin-top: 120px">

  <h3 align="center">Tracker</h3>

  <p align="center">
    An Open-Source monitoring events tracking solution.
    <br />
  </p>
</p>

<p align="center">
  <a href="https://github.com/BananaOps/tracker/actions/workflows/ci.yml">
    <img src="https://github.com/BananaOps/tracker/workflows/CI/badge.svg" alt="CI Status">
  </a>
  <a href="https://github.com/BananaOps/tracker/releases">
    <img src="https://img.shields.io/github/v/release/BananaOps/tracker?include_prereleases" alt="Latest Release">
  </a>
  <a href="https://github.com/BananaOps/tracker/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/BananaOps/tracker" alt="License">
  </a>
  <a href="https://goreportcard.com/report/github.com/BananaOps/tracker">
    <img src="https://goreportcard.com/badge/github.com/BananaOps/tracker" alt="Go Report Card">
  </a>
  <a href="https://pkg.go.dev/github.com/BananaOps/tracker">
    <img src="https://pkg.go.dev/badge/github.com/BananaOps/tracker.svg" alt="Go Reference">
  </a>
</p>

<p align="center">
  <a href="https://github.com/BananaOps/tracker/issues">
    <img src="https://img.shields.io/github/issues/BananaOps/tracker" alt="Issues">
  </a>
  <a href="https://github.com/BananaOps/tracker/pulls">
    <img src="https://img.shields.io/github/issues-pr/BananaOps/tracker" alt="Pull Requests">
  </a>
  <a href="https://github.com/BananaOps/tracker/stargazers">
    <img src="https://img.shields.io/github/stars/BananaOps/tracker?style=social" alt="GitHub Stars">
  </a>
  <a href="https://github.com/BananaOps/tracker/network/members">
    <img src="https://img.shields.io/github/forks/BananaOps/tracker?style=social" alt="GitHub Forks">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go&logoColor=white" alt="Go Version">
  <img src="https://img.shields.io/badge/gRPC-1.71+-4285F4?style=flat&logo=grpc&logoColor=white" alt="gRPC">
  <img src="https://img.shields.io/badge/Protocol_Buffers-3.0+-4285F4?style=flat&logo=protocolbuffers&logoColor=white" alt="Protocol Buffers">
  <img src="https://img.shields.io/badge/MongoDB-Compatible-47A248?style=flat&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/Swagger-OpenAPI_2.0-85EA2D?style=flat&logo=swagger&logoColor=black" alt="Swagger">
</p>


## About Tracker 
 
Tracker is an open-source alternative to Datadog events or New Relic custom events. The solution provides a comprehensive API for tracking events, managing catalogs, and handling distributed locks across your infrastructure.

Built with gRPC and exposed via REST endpoints, Tracker enables you to keep track of everything happening on your platform in a distributed services world. Monitor deployments, incidents, operations, and maintain a catalog of your infrastructure components.

Key capabilities:
- **Events tracking** - Monitor deployments, incidents, operations with rich metadata
- **Catalog management** - Maintain an inventory of modules, libraries, projects, and containers  
- **Distributed locks** - Coordinate operations across services with distributed locking
- **Multi-protocol** - Native gRPC API with REST endpoints via grpc-gateway
- **Interactive documentation** - Built-in Swagger UI for API exploration
- **Observability** - Prometheus metrics and structured logging  

## Features

![gRPC](https://img.shields.io/badge/gRPC-Server-4285F4?style=for-the-badge&logo=grpc&logoColor=white)
![REST](https://img.shields.io/badge/REST-API-FF6B35?style=for-the-badge&logo=fastapi&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-UI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![Prometheus](https://img.shields.io/badge/Prometheus-Metrics-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)

### Core Services
- [x] **EventService** - Create, update, search, and manage events
- [x] **CatalogService** - Manage inventory of modules, libraries, and projects  
- [x] **LockService** - Distributed locking for service coordination

### API & Documentation
- [x] gRPC Server (port 8765)
- [x] REST Server via grpc-gateway (port 8080)
- [x] Swagger UI integration (`/docs`)
- [x] OpenAPI specification (`/swagger.json`)
- [x] Prometheus metrics (port 8081)

### Event Management
- [x] Rich event attributes (priority, status, environment, impact)
- [x] Event linking and relationships
- [x] Pull request and ticket linking
- [x] Duration calculation between linked events
- [x] Search and filtering capabilities
- [x] Today's events endpoint

### Infrastructure
- [x] Structured JSON logging
- [x] Graceful shutdown handling
- [x] MongoDB/FeretDB storage
- [x] Protocol buffer definitions
- [x] Automatic code generation

### Roadmap
- [ ] CLI tool for event management
- [ ] Configuration file support
- [ ] GitHub Actions integration
- [ ] GitLab CI/CD examples
- [ ] Advanced search capabilities

## Getting Started 🚀

### Requirements

![Go](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat-square&logo=go&logoColor=white)
![Buf](https://img.shields.io/badge/Buf-CLI-40E0D0?style=flat-square&logo=buffer&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Compatible-47A248?style=flat-square&logo=mongodb&logoColor=white)

- [Go](https://go.dev/) >= 1.23
- [buf](https://buf.build/explore) for protobuf management
- MongoDB or FeretDB for data storage

### Quick Start

1. **Clone and build**
   ```bash
   git clone https://github.com/BananaOps/tracker.git
   cd tracker
   make build
   ```

2. **Start the server**
   ```bash
   ./bin/tracker serv
   ```

3. **Access the API**
   - **Swagger UI**: http://localhost:8080/docs
   - **REST API**: http://localhost:8080/api/v1alpha1/
   - **gRPC**: localhost:8765
   - **Metrics**: http://localhost:8081/metrics

### Development

#### Generate code from protobuf
```bash
make generate
# or directly with buf
buf generate
```

#### Run tests
```bash
make test
```

#### Lint protobuf files
```bash
buf lint
```

### API Examples

#### Create an event (REST)
```bash
curl -X POST http://localhost:8080/api/v1alpha1/event \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deployment completed",
    "attributes": {
      "message": "Service deployed successfully",
      "source": "github_actions",
      "type": 1,
      "priority": 2,
      "service": "my-service",
      "status": 3,
      "environment": 7
    }
  }'
```

#### List events (REST)
```bash
curl http://localhost:8080/api/v1alpha1/events/list
```

#### Create an event (gRPC)
```bash
grpcurl --plaintext -d '{
  "title": "Deployment completed",
  "attributes": {
    "message": "Service deployed successfully",
    "source": "github_actions",
    "type": 1,
    "priority": 2,
    "service": "my-service", 
    "status": 3
  }
}' localhost:8765 tracker.event.v1alpha1.EventService/CreateEvent
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   gRPC Client   │    │   REST Client   │    │  Swagger UI     │
│   (port 8765)   │    │   (port 8080)   │    │   (/docs)       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │              ┌───────▼──────────────────────▼───────┐
          │              │         grpc-gateway                 │
          │              │      (REST → gRPC proxy)             │
          │              └───────┬──────────────────────────────┘
          │                      │
          └──────────────────────▼──────────────────────────────┐
                                 │                              │
                         ┌───────▼───────┐              ┌──────▼──────┐
                         │  gRPC Server  │              │  Prometheus │
                         │               │              │   Metrics   │
                         │ ┌───────────┐ │              │ (port 8081) │
                         │ │EventSvc   │ │              └─────────────┘
                         │ │CatalogSvc │ │
                         │ │LockSvc    │ │
                         │ └───────────┘ │
                         └───────┬───────┘
                                 │
                         ┌───────▼───────┐
                         │   MongoDB/    │
                         │   FeretDB     │
                         └───────────────┘
```

## Services

### EventService
![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=flat-square)
![Port](https://img.shields.io/badge/gRPC-8765-blue?style=flat-square)
![REST](https://img.shields.io/badge/REST-8080-green?style=flat-square)
Manage events across your infrastructure:
- **Types**: deployment, operation, drift, incident
- **Priorities**: P1 (critical) to P5 (low)
- **Statuses**: start, success, failure, warning, error, open, close, done
- **Environments**: development, integration, UAT, production, etc.

### CatalogService
![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=flat-square)
![Port](https://img.shields.io/badge/gRPC-8765-blue?style=flat-square)
![REST](https://img.shields.io/badge/REST-8080-green?style=flat-square)

Maintain an inventory of your components:
- **Types**: module, library, workflow, project, chart, package, container
- **Languages**: Go, Java, Python, JavaScript, Terraform, Helm, etc.
- **Metadata**: version, owner, repository, description

### LockService
![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=flat-square)
![Port](https://img.shields.io/badge/gRPC-8765-blue?style=flat-square)
![REST](https://img.shields.io/badge/REST-8080-green?style=flat-square)

Coordinate distributed operations:
- Create exclusive locks for deployments
- Prevent concurrent operations
- Track lock ownership and timing

## Documentation

- [📖 Complete API Documentation](./docs/) 
- [🔧 Events API](./docs/events.md)
- [📦 Catalog API](./docs/catalog.md) 
- [🔒 Locks API](./docs/locks.md)
- [⚙️ API Specification](./docs/api-specification.md)


## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GRPC_PORT` | `8765` | gRPC server port |
| `HTTP_PORT` | `8080` | REST server port |  
| `METRICS_PORT` | `8081` | Prometheus metrics port |
| `MONGO_URI` | - | MongoDB connection string |
| `LOG_LEVEL` | `info` | Logging level |

### Server Ports

- **gRPC API**: `:8765`
- **REST API**: `:8080` 
- **Swagger UI**: `:8080/docs`
- **OpenAPI Spec**: `:8080/swagger.json`
- **Prometheus Metrics**: `:8081/metrics`

## Deployment

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tracker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tracker
  template:
    metadata:
      labels:
        app: tracker
    spec:
      containers:
      - name: tracker
        image: tracker:latest
        ports:
        - containerPort: 8080
        - containerPort: 8765
        - containerPort: 8081
```

## Contributing

Please see the [contribution guidelines](https://github.com/BananaOps/tracker/blob/main/CONTRIBUTING.md) and our [code of conduct](https://github.com/BananaOps/tracker/blob/main/CODE_OF_CONDUCT.md). All contributions are subject to the [Apache 2.0 open source license](https://github.com/BananaOps/tracker/blob/main/LICENSE).

`help wanted` issues:
- [Tracker](https://github.com/BananaOps/tracker/labels/help%20wanted)

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
