# 📚 Tracker Documentation

Welcome to the Tracker documentation! This guide will help you get started, deploy, and contribute to the project.

---

## 🚀 Getting Started

### Quick Start Guides
- [**Deployment Guide**](./DEPLOYMENT.md) - All deployment methods (Docker, Kubernetes, local)
- [**Docker Build Guide**](./DOCKER_BUILD.md) - Build and run with Docker
- [**Skaffold Guide**](./SKAFFOLD.md) - Deploy to Kubernetes with Skaffold

### First Steps
1. Choose your deployment method (Docker recommended)
2. Start the application
3. Access the web UI at http://localhost:8080
4. Explore the Swagger UI at http://localhost:8080/docs

---

## 📖 User Guides

### Core Features
- **Events Management** - Track deployments, incidents, operations, and drifts
- **Service Catalog** - Maintain inventory of services and components
- **Timeline View** - Visualize events chronologically
- **Calendar View** - See events in calendar format
- **Dashboard** - Overview and statistics

### Event Types
- **Deployments** 🚀 - Track service deployments
- **Operations** 🔧 - Monitor operational tasks
- **Drifts** 🔀 - Detect configuration drifts
- **Incidents** 🔥 - Manage incidents
- **RPA Usage** 🤖 - Track automation executions

---

## 🔧 Development

### Setup & Build
- [**Build Fixes**](./BUILD_FIXES.md) - Solutions to common build issues
- [**Integration Summary**](./INTEGRATION_SUMMARY.md) - Frontend/Backend integration details
- [**Changes Summary**](./CHANGES_SUMMARY.md) - Complete list of modifications

### Technical Guides
- [**API Enum Conversion**](./API_ENUM_CONVERSION.md) - How enums are converted between frontend and backend
- [**Catalog UI Improvements**](./CATALOG_UI_IMPROVEMENTS.md) - UI enhancements documentation

### Frontend
- [**Web Frontend README**](../web/README.md) - React/TypeScript frontend documentation
- [**Open Source Banner**](./OPEN_SOURCE_BANNER.md) - Banner component documentation

---

## 🐳 Deployment

### Docker
- [**Docker Build Guide**](./DOCKER_BUILD.md)
  - Multi-stage build process
  - Frontend + Backend integration
  - Troubleshooting

### Kubernetes
- [**Skaffold Guide**](./SKAFFOLD.md)
  - Production deployment
  - Development with hot-reload
  - CI/CD integration

### Deployment Options
- [**Deployment Guide**](./DEPLOYMENT.md)
  - Docker
  - Docker Compose
  - Kubernetes (Skaffold)
  - Kubernetes (Helm)
  - Local development

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Tracker Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │   REST API   │  │  Swagger UI  │      │
│  │  (Port 8080) │  │  (Port 8080) │  │  (Port 8080) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  grpc-gateway   │                        │
│                  │  (REST → gRPC)  │                        │
│                  └────────┬────────┘                        │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         │                 │                 │              │
│    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐         │
│    │ Event   │      │Catalog  │      │  Lock   │         │
│    │ Service │      │Service  │      │ Service │         │
│    └────┬────┘      └────┬────┘      └────┬────┘         │
│         │                │                 │              │
│         └────────────────┼─────────────────┘              │
│                          │                                │
│                   ┌──────▼──────┐                         │
│                   │   MongoDB   │                         │
│                   │  / FeretDB  │                         │
│                   └─────────────┘                         │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │         Prometheus Metrics (Port 8081)           │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │         gRPC API (Port 8765)                     │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### Backend (Go)
- **gRPC Server** - Native high-performance API
- **REST Gateway** - HTTP/JSON endpoints
- **Event Service** - Event management
- **Catalog Service** - Service inventory
- **Lock Service** - Distributed locking

#### Frontend (React)
- **Dashboard** - Overview and statistics
- **Timeline** - Chronological event view
- **Calendar** - Monthly calendar view
- **Forms** - Create events, drifts, RPA operations
- **Catalog** - Service inventory table

#### Storage
- **MongoDB** - Primary data store
- **FeretDB** - PostgreSQL-compatible alternative

---

## 📊 API Reference

### Endpoints

#### Events API
- `POST /api/v1alpha1/event` - Create event
- `PUT /api/v1alpha1/event` - Update event
- `GET /api/v1alpha1/event/{id}` - Get event
- `DELETE /api/v1alpha1/event/{id}` - Delete event
- `GET /api/v1alpha1/events/list` - List events
- `GET /api/v1alpha1/events/search` - Search events
- `GET /api/v1alpha1/events/today` - Today's events

#### Catalog API
- `PUT /api/v1alpha1/catalog` - Create/Update catalog entry
- `GET /api/v1alpha1/catalog` - Get catalog entry
- `DELETE /api/v1alpha1/catalog` - Delete catalog entry
- `GET /api/v1alpha1/catalogs/list` - List catalog entries

#### Lock API
- `POST /api/v1alpha1/lock` - Acquire lock
- `DELETE /api/v1alpha1/lock` - Release lock
- `GET /api/v1alpha1/locks` - List locks

### Interactive Documentation
- **Swagger UI**: http://localhost:8080/docs
- **OpenAPI Spec**: http://localhost:8080/swagger.json

---

## 🔍 Troubleshooting

### Common Issues

#### Build Errors
See [Build Fixes](./BUILD_FIXES.md) for solutions to:
- TypeScript errors
- Go module issues
- Docker build failures
- npm build errors

#### Deployment Issues
See [Deployment Guide](./DEPLOYMENT.md) for:
- Docker container issues
- Kubernetes pod failures
- Port conflicts
- Database connection errors

#### Frontend Issues
- Clear browser cache
- Check console for errors
- Verify API connectivity
- Check dark mode compatibility

---

## 🤝 Contributing

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

### Development Setup
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/tracker.git
cd tracker

# Backend
go run main.go serv

# Frontend (in another terminal)
cd web
npm install
npm run dev
```

### Code Style
- **Go**: Follow standard Go conventions
- **TypeScript**: Use ESLint configuration
- **Commits**: Use conventional commits

---

## 📝 Documentation Index

### Getting Started
- [Deployment Guide](./DEPLOYMENT.md)
- [Docker Build Guide](./DOCKER_BUILD.md)
- [Skaffold Guide](./SKAFFOLD.md)

### Development
- [Build Fixes](./BUILD_FIXES.md)
- [API Enum Conversion](./API_ENUM_CONVERSION.md)
- [Integration Summary](./INTEGRATION_SUMMARY.md)
- [Changes Summary](./CHANGES_SUMMARY.md)

### UI/UX
- [Catalog UI Improvements](./CATALOG_UI_IMPROVEMENTS.md)
- [Open Source Banner](./OPEN_SOURCE_BANNER.md)

### Frontend
- [Web Frontend README](../web/README.md)

---

## 📞 Support

### Get Help
- **GitHub Issues**: [Report bugs](https://github.com/BananaOps/tracker/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/BananaOps/tracker/discussions)
- **Documentation**: You're reading it! 📖

### Useful Links
- [Main README](../README.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [License](../LICENSE)

---

<p align="center">
  <strong>Happy Tracking! 🚀</strong>
</p>

<p align="center">
  <a href="https://github.com/BananaOps/tracker">⭐ Star us on GitHub</a>
  •
  <a href="https://github.com/BananaOps/tracker/issues">🐛 Report Issues</a>
  •
  <a href="https://github.com/BananaOps/tracker/discussions">💬 Discussions</a>
</p>
