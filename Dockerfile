# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web

# Copy package files
COPY web/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY web/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM golang:1.23-alpine AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies with retry and verbose output
RUN go env -w GOPROXY=https://proxy.golang.org,direct && \
    go mod download -x

# Copy source code
COPY . .

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/web/dist ./web/dist

# Build the Go application
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o tracker .

# Stage 3: Final runtime image
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder
COPY --from=backend-builder /app/tracker .

# Copy frontend build
COPY --from=frontend-builder /app/web/dist ./web/dist

# Copy swagger documentation
COPY --from=backend-builder /app/generated/openapiv2 ./generated/openapiv2

# Expose ports
EXPOSE 8080 8081 8765

# Run the application
CMD ["./tracker", "serv"]
