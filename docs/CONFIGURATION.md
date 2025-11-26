# Configuration Guide

This guide covers all configuration options for Tracker.

## Environment Variables

Tracker is configured primarily through environment variables. Below is a complete reference.

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | MongoDB hostname or IP address |
| `DB_PORT` | `27017` | MongoDB port |
| `DB_NAME` | `tracker` | Database name |
| `DB_USER` | - | MongoDB username (optional) |
| `DB_PASSWORD` | - | MongoDB password (optional) |
| `DB_AUTH_SOURCE` | `admin` | MongoDB authentication database |
| `DB_TIMEOUT` | `10s` | Connection timeout |

**Example:**
```bash
DB_HOST=mongodb.example.com
DB_PORT=27017
DB_NAME=tracker_prod
DB_USER=tracker_user
DB_PASSWORD=secure_password
```

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | `8080` | HTTP/REST API and Web UI port |
| `GRPC_PORT` | `8765` | gRPC API port |
| `METRICS_PORT` | `8081` | Prometheus metrics port |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | `json` | Log format: `json` or `text` |

**Example:**
```bash
HTTP_PORT=9080
GRPC_PORT=9765
METRICS_PORT=9081
LOG_LEVEL=debug
```

### Demo Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `DEMO_MODE` | `false` | Enable demo mode banner |
| `BUY_ME_COFFEE_URL` | - | Buy Me a Coffee link for demo banner |

**Example:**
```bash
DEMO_MODE=true
BUY_ME_COFFEE_URL=https://www.buymeacoffee.com/yourname
```

### Slack Integration

| Variable | Default | Description |
|----------|---------|-------------|
| `SLACK_EVENTS_CHANNEL_URL` | - | Slack channel URL for events |

**Example:**
```bash
SLACK_EVENTS_CHANNEL_URL=https://yourworkspace.slack.com/archives/C123456
```

### Frontend Configuration

Frontend configuration is done through environment variables prefixed with `VITE_`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api` | API base URL |
| `VITE_GRPC_WEB_URL` | - | gRPC-Web endpoint (if using) |

**Example (.env.local):**
```bash
VITE_API_BASE_URL=https://api.tracker.example.com/api
```

## Configuration Files

### Docker Compose

Create a `.env` file in the same directory as `docker-compose.yml`:

```bash
# .env
DEMO_MODE=false
DB_NAME=tracker_production
SLACK_EVENTS_CHANNEL_URL=https://yourworkspace.slack.com/archives/C123456
```

Then reference in `docker-compose.yml`:

```yaml
services:
  tracker:
    env_file:
      - .env
    environment:
      DB_HOST: mongodb
      DB_PORT: 27017
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tracker-config
data:
  DB_HOST: "mongodb-service"
  DB_PORT: "27017"
  DB_NAME: "tracker"
  HTTP_PORT: "8080"
  GRPC_PORT: "8765"
  LOG_LEVEL: "info"
```

### Kubernetes Secret

For sensitive data:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tracker-secrets
type: Opaque
stringData:
  DB_USER: "tracker_user"
  DB_PASSWORD: "secure_password"
```

Apply to deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tracker
spec:
  template:
    spec:
      containers:
      - name: tracker
        envFrom:
        - configMapRef:
            name: tracker-config
        - secretRef:
            name: tracker-secrets
```

## MongoDB Configuration

### Connection String

Tracker supports MongoDB connection strings:

```bash
DB_CONNECTION_STRING=mongodb://user:password@host1:27017,host2:27017/tracker?replicaSet=rs0
```

### Replica Set

For high availability:

```bash
DB_HOST=mongo1:27017,mongo2:27017,mongo3:27017
DB_REPLICA_SET=rs0
DB_NAME=tracker
```

### Authentication

With authentication enabled:

```bash
DB_HOST=mongodb.example.com
DB_PORT=27017
DB_NAME=tracker
DB_USER=tracker_user
DB_PASSWORD=secure_password
DB_AUTH_SOURCE=admin
```

### TLS/SSL

For secure connections:

```bash
DB_TLS_ENABLED=true
DB_TLS_CA_FILE=/path/to/ca.pem
DB_TLS_CERT_FILE=/path/to/cert.pem
DB_TLS_KEY_FILE=/path/to/key.pem
```

## Logging Configuration

### Log Levels

- `debug`: Detailed debugging information
- `info`: General informational messages (default)
- `warn`: Warning messages
- `error`: Error messages only

```bash
LOG_LEVEL=info
```

### Log Format

**JSON (recommended for production):**
```bash
LOG_FORMAT=json
```

**Text (human-readable for development):**
```bash
LOG_FORMAT=text
```

## Metrics Configuration

Tracker exposes Prometheus metrics on the metrics port.

**Access metrics:**
```bash
curl http://localhost:8081/metrics
```

**Prometheus scrape config:**
```yaml
scrape_configs:
  - job_name: 'tracker'
    static_configs:
      - targets: ['tracker:8081']
```

## Performance Tuning

### Database Indexes

Tracker automatically creates indexes on startup. Monitor index usage:

```bash
# Connect to MongoDB
mongosh tracker

# Check indexes
db.events.getIndexes()
db.catalog.getIndexes()
```

### Connection Pooling

Configure MongoDB connection pool:

```bash
DB_MAX_POOL_SIZE=100
DB_MIN_POOL_SIZE=10
```

### Request Timeouts

```bash
HTTP_READ_TIMEOUT=30s
HTTP_WRITE_TIMEOUT=30s
GRPC_TIMEOUT=30s
```

## Security

### CORS Configuration

```bash
CORS_ALLOWED_ORIGINS=https://tracker.example.com,https://app.example.com
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE
CORS_ALLOWED_HEADERS=Content-Type,Authorization
```

### Rate Limiting

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_SECOND=100
```

## Example Configurations

### Development

```bash
# .env.development
DB_HOST=localhost
DB_PORT=27017
DB_NAME=tracker_dev
HTTP_PORT=8080
GRPC_PORT=8765
LOG_LEVEL=debug
LOG_FORMAT=text
DEMO_MODE=true
```

### Production

```bash
# .env.production
DB_HOST=mongodb-prod.example.com
DB_PORT=27017
DB_NAME=tracker
DB_USER=tracker_prod
DB_PASSWORD=${DB_PASSWORD}  # From secrets manager
HTTP_PORT=8080
GRPC_PORT=8765
LOG_LEVEL=info
LOG_FORMAT=json
DEMO_MODE=false
CORS_ALLOWED_ORIGINS=https://tracker.example.com
RATE_LIMIT_ENABLED=true
```

### Docker Compose Production

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:8
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - tracker-network

  tracker:
    image: bananaops/tracker:latest
    restart: always
    environment:
      DB_HOST: mongodb
      DB_PORT: 27017
      DB_NAME: tracker
      DB_USER: admin
      DB_PASSWORD: ${MONGO_PASSWORD}
      DB_AUTH_SOURCE: admin
      LOG_LEVEL: info
      LOG_FORMAT: json
      DEMO_MODE: false
    ports:
      - "8080:8080"
      - "8081:8081"
      - "8765:8765"
    depends_on:
      - mongodb
    networks:
      - tracker-network

networks:
  tracker-network:
    driver: bridge

volumes:
  mongodb_data:
```

## Troubleshooting

### Configuration Not Applied

1. Check environment variables are set:
   ```bash
   docker exec tracker env | grep DB_
   ```

2. Restart the service:
   ```bash
   docker-compose restart tracker
   ```

### Database Connection Failed

1. Verify MongoDB is accessible:
   ```bash
   telnet mongodb.example.com 27017
   ```

2. Check credentials:
   ```bash
   mongosh "mongodb://user:password@host:27017/tracker"
   ```

### Port Conflicts

Change ports in configuration:
```bash
HTTP_PORT=9080
GRPC_PORT=9765
METRICS_PORT=9081
```

## Next Steps

- [Installation Guide](./INSTALLATION.md) - Install Tracker
- [Development Guide](./DEVELOPMENT.md) - Set up development environment
- [User Guide](./USER_GUIDE.md) - Learn how to use Tracker

## Getting Help

- 🐛 [Report Issues](https://github.com/BananaOps/tracker/issues)
- 💬 [Discussions](https://github.com/BananaOps/tracker/discussions)
