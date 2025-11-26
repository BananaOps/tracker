# Development Guide

This guide helps you set up a development environment for Tracker and contribute to the project.

## Prerequisites

- **Go 1.25+** - [Install Go](https://go.dev/doc/install)
- **Node.js 23+** and **npm** - [Install Node.js](https://nodejs.org/)
- **MongoDB 7+** - [Install MongoDB](https://www.mongodb.com/docs/manual/installation/)
- **Protocol Buffers Compiler** - [Install buf](https://buf.build/docs/cli/quickstart/)
- **Task** (optional) - [Install Task](https://taskfile.dev/installation/)
- **Git** - [Install Git](https://git-scm.com/downloads)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/BananaOps/tracker.git
cd tracker

# Start MongoDB (if not running)
docker run -d -p 27017:27017 --name tracker-mongo mongo:7

# Run backend
go run main.go serv

# In another terminal, run frontend
cd web
npm install
npm run dev
```

Access the application at http://localhost:5173

## Project Structure

```
tracker/
├── cmd/                    # Command-line entry points
├── internal/               # Private application code
│   ├── api/               # API handlers
│   ├── db/                # Database layer
│   ├── models/            # Data models
│   └── services/          # Business logic
├── proto/                  # Protocol buffer definitions
├── generated/              # Generated code (gRPC, OpenAPI)
├── server/                 # Server implementation
├── web/                    # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
│   └── public/            # Static assets
├── helm/                   # Kubernetes Helm charts
├── docs/                   # Documentation
└── scripts/                # Build and utility scripts
```

## Backend Development

### Setup

```bash
# Install Go dependencies
go mod download

# Install development tools
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
go install github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@latest
go install github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2@latest
```

### Running the Backend

```bash
# Run with hot reload (using air)
go install github.com/air-verse/air@latest
air

# Or run directly
go run main.go serv

# With custom configuration
DB_HOST=localhost DB_PORT=27017 go run main.go serv
```

### Generating Protocol Buffers

When you modify `.proto` files:

```bash
# Using Task (recommended)
task generate

# Or using buf
buf generate

# Or manually
protoc --go_out=. --go-grpc_out=. proto/**/*.proto
```

### Running Tests

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with verbose output
go test -v ./...

# Run specific package tests
go test ./internal/services/...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Linting

```bash
# Install golangci-lint
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run linter
golangci-lint run

# Auto-fix issues
golangci-lint run --fix
```

### Building

```bash
# Build binary
go build -o tracker main.go

# Build with version info
go build -ldflags "-X main.Version=1.0.0" -o tracker main.go

# Build for different platforms
GOOS=linux GOARCH=amd64 go build -o tracker-linux-amd64 main.go
GOOS=darwin GOARCH=arm64 go build -o tracker-darwin-arm64 main.go
```

## Frontend Development

### Setup

```bash
cd web

# Install dependencies
npm install

# Install development tools globally (optional)
npm install -g typescript vite
```

### Running the Frontend

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run build:check
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint -- --fix

# Format code with Prettier (if configured)
npm run format
```

### Testing

```bash
# Run tests (if configured)
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage
npm test -- --coverage
```

## Using Task (Taskfile)

The project includes a Taskfile for common development tasks:

```bash
# List available tasks
task --list

# Generate protocol buffers
task generate

# Run backend
task dev:backend

# Run frontend
task dev:frontend

# Run both backend and frontend
task dev:all

# Build Docker image
task docker:build

# Run tests
task test

# Run linter
task lint
```

## Database Development

### MongoDB Shell

```bash
# Connect to local MongoDB
mongosh tracker

# View collections
show collections

# Query events
db.events.find().limit(10)

# Create index
db.events.createIndex({ "attributes.service": 1 })

# View indexes
db.events.getIndexes()
```

### Database Migrations

Tracker uses automatic index creation. Indexes are defined in code and created on startup.

To add a new index:

1. Edit `internal/db/indexes.go`
2. Add index definition
3. Restart the application

## Docker Development

### Building Docker Image

```bash
# Build image
docker build -t tracker:dev .

# Build with specific tag
docker build -t tracker:1.0.0 .

# Build without cache
docker build --no-cache -t tracker:dev .
```

### Running with Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f tracker

# Rebuild and restart
docker-compose up -d --build

# Stop services
docker-compose down
```

## Debugging

### Backend Debugging

Using Delve debugger:

```bash
# Install Delve
go install github.com/go-delve/delve/cmd/dlv@latest

# Debug the application
dlv debug main.go -- serv

# Set breakpoints in code
(dlv) break main.main
(dlv) continue
```

### Frontend Debugging

1. Open browser DevTools (F12)
2. Use React DevTools extension
3. Check console for errors
4. Use breakpoints in Sources tab

### Logging

Enable debug logging:

```bash
LOG_LEVEL=debug go run main.go serv
```

## Contributing Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/tracker.git
cd tracker

# Add upstream remote
git remote add upstream https://github.com/BananaOps/tracker.git
```

### 2. Create a Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-new-feature

# Or bugfix branch
git checkout -b fix/bug-description
```

### 3. Make Changes

```bash
# Make your changes
# Add tests for new features
# Update documentation

# Run tests
go test ./...
cd web && npm test

# Run linters
golangci-lint run
cd web && npm run lint
```

### 4. Commit Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature description"

# Follow conventional commits
# feat: new feature
# fix: bug fix
# docs: documentation
# test: tests
# refactor: code refactoring
# chore: maintenance
```

### 5. Push and Create PR

```bash
# Push to your fork
git push origin feature/my-new-feature

# Create Pull Request on GitHub
# Fill in the PR template
# Link related issues
```

### 6. Code Review

- Address review comments
- Push additional commits
- Keep PR focused and small
- Be responsive to feedback

## Code Style

### Go

- Follow [Effective Go](https://go.dev/doc/effective_go)
- Use `go fmt` for formatting
- Follow project conventions
- Write clear comments
- Keep functions small and focused

### TypeScript/React

- Use TypeScript for type safety
- Follow React best practices
- Use functional components and hooks
- Keep components small and reusable
- Use Tailwind CSS for styling

## Performance Testing

### Load Testing

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Test API endpoint
hey -n 1000 -c 10 http://localhost:8080/api/v1alpha1/events

# Test with POST
hey -n 1000 -c 10 -m POST \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}' \
  http://localhost:8080/api/v1alpha1/event
```

### Profiling

```bash
# CPU profiling
go test -cpuprofile=cpu.prof -bench=.
go tool pprof cpu.prof

# Memory profiling
go test -memprofile=mem.prof -bench=.
go tool pprof mem.prof
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>
```

### Module Issues

```bash
# Clean module cache
go clean -modcache

# Tidy dependencies
go mod tidy

# Verify dependencies
go mod verify
```

### Frontend Build Issues

```bash
# Clear node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Clear Vite cache
rm -rf web/.vite
```

## Resources

- [Go Documentation](https://go.dev/doc/)
- [gRPC Documentation](https://grpc.io/docs/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Getting Help

- 🐛 [Report Issues](https://github.com/BananaOps/tracker/issues)
- 💬 [Discussions](https://github.com/BananaOps/tracker/discussions)
- 📖 [Documentation](https://github.com/BananaOps/tracker/tree/main/docs)

## Next Steps

- [Installation Guide](./INSTALLATION.md) - Install Tracker
- [Configuration Guide](./CONFIGURATION.md) - Configure Tracker
- [Contributing Guidelines](../CONTRIBUTING.md) - Contribution process
