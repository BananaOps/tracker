# Installation Guide

This guide covers all methods to install and run Tracker.

## Prerequisites

- **Docker** (recommended) or
- **Go 1.25+** and **Node.js 23+** (for source installation)
- **MongoDB 7** or compatible database

## Quick Start with Docker

The fastest way to get started is using Docker:

```bash
# Pull the latest image
docker pull bananaops/tracker:latest

# Run the container MongoDB
docker run -d \
  --name tracker-mongodb \
  -p 27017:27017 \
  mongo:latest

# Run the container Tracker
docker run -d \
  --name tracker \
  -p 8080:8080 \
  -p 8081:8081 \
  -p 8765:8765 \
  bananaops/tracker:latest
```

**Access the application:**
- 🌐 **Web UI**: http://localhost:8080
- 📚 **API Documentation**: http://localhost:8080/docs
- 📊 **Metrics**: http://localhost:8081/metrics
- 🔌 **gRPC**: localhost:8765



## Docker Compose (Recommended for Production)

Docker Compose provides a complete setup with MongoDB:

### 1. Create docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:8
    container_name: tracker-mongodb
    restart: unless-stopped
    volumes:
      - mongodb_data:/data/db
    networks:
      - tracker-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  tracker:
    image: bananaops/tracker:latest
    container_name: tracker-app
    restart: unless-stopped
    environment:
      DB_HOST: mongodb
      DB_PORT: 27017
      DB_NAME: tracker
      HTTP_PORT: 8080
      GRPC_PORT: 8765
      DEMO_MODE: "false"
      # Optional parameters
      #JIRA_DOMAIN: "https://jira.example.com"
      #JIRA_PROJECT_KEY: "PROJECT"
      #SLACK_WORKSPACE: "workspace"
      #SLACK_EVENTS_CHANNEL: "events"
    ports:
      - "8080:8080"
      - "8081:8081"
      - "8765:8765"
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - tracker-network

networks:
  tracker-network:
    driver: bridge

volumes:
  mongodb_data:
    driver: local
```

### 2. Start the services

```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f tracker

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Installation from Source

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/BananaOps/tracker.git
cd tracker

# Install Go dependencies
go mod download

# Run the server
go run main.go serv
```

The backend will start on:
- gRPC: `localhost:8765`
- HTTP/REST: `localhost:8080`
- Metrics: `localhost:8081`

### Frontend Setup

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:5173`

### Build for Production

**Backend:**
```bash
# Build binary
go build -o tracker main.go

# Run
./tracker serv
```

**Frontend:**
```bash
cd web
npm run build
```

The built files will be in `web/dist/`

## Kubernetes Deployment

### Using Helm

```bash
# Add the Helm repository (if available)
helm repo add bananaops https://bananaops.github.io/tracker
helm repo update

# Install Tracker
helm install tracker bananaops/tracker \
  --set mongodb.enabled=true \
  --set ingress.enabled=true \
  --set ingress.host=tracker.example.com
```

## Environment Variables

See [CONFIGURATION.md](./CONFIGURATION.md) for a complete list of environment variables.

### Essential Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | MongoDB host |
| `DB_PORT` | `27017` | MongoDB port |
| `DB_NAME` | `tracker` | Database name |
| `HTTP_PORT` | `8080` | HTTP server port |
| `GRPC_PORT` | `8765` | gRPC server port |
| `DEMO_MODE` | `false` | Enable demo mode banner |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JIRA_DOMAIN` | `""` | Jira domain |
| `JIRA_PROJECT_KEY` | `""` | Jira project key |
| `SLACK_WORKSPACE` | `""` | Slack workspace |
| `SLACK_EVENTS_CHANNEL` | `""` | Slack events channel |

## Troubleshooting

### Port Already in Use

If ports 8080, 8081, or 8765 are already in use:

```bash
# Change ports in docker-compose.yml
ports:
  - "9080:8080"  # Use port 9080 instead
  - "9081:8081"
  - "9765:8765"
```

### MongoDB Connection Issues

Check MongoDB is running:
```bash
docker-compose logs mongodb
```

Verify connection:
```bash
docker exec -it tracker-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Frontend Not Loading

1. Check backend is running: `curl http://localhost:8080/api/health`
2. Clear browser cache
3. Check browser console for errors

### Permission Denied

If you get permission errors with Docker:
```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then test
docker ps
```

## Next Steps

- [Configuration Guide](./CONFIGURATION.md) - Configure Tracker for your environment
- [Development Guide](./DEVELOPMENT.md) - Set up development environment
- [User Guide](./USER_GUIDE.md) - Learn how to use Tracker
- [API Documentation](./api-specification.md) - Explore the API

## Getting Help

- 🐛 [Report Issues](https://github.com/BananaOps/tracker/issues)
- 💬 [Discussions](https://github.com/BananaOps/tracker/discussions)
- 📖 [Documentation](https://github.com/BananaOps/tracker/tree/main/docs)
