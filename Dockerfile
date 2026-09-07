# Stage 1: Build frontend
FROM --platform=$BUILDPLATFORM node:25-alpine AS frontend-builder

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
FROM --platform=$BUILDPLATFORM golang:1.26.1-alpine AS backend-builder

# Build arguments for cross-compilation
ARG TARGETOS
ARG TARGETARCH

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

# Build the Go application for target platform
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -ldflags="-w -s" -o tracker .

# Normalize permissions of the static assets so they are world-readable regardless of
# the umask of the build host (the runtime image runs as a non-root user)
RUN chmod -R a+rX web/dist generated/openapiv2

# Stage 3: Final runtime image
FROM alpine:3.24

# Dedicated unprivileged runtime user (UID/GID 65532, same convention as distroless "nonroot")
RUN apk --no-cache add ca-certificates \
    && addgroup -S -g 65532 tracker \
    && adduser -S -D -H -u 65532 -G tracker -s /sbin/nologin tracker

WORKDIR /app

# Copy the binary and static assets.
# Files stay owned by root and world-readable: the runtime user can read and execute
# them but cannot tamper with them, and the image works with readOnlyRootFilesystem.
COPY --from=backend-builder --chmod=0755 /app/tracker ./tracker
COPY --from=backend-builder /app/web/dist ./web/dist
COPY --from=backend-builder /app/generated/openapiv2 ./generated/openapiv2

# Expose ports
EXPOSE 8080 8081 8765

# Numeric UID:GID so Kubernetes can enforce runAsNonRoot without resolving the user name
USER 65532:65532

# Run the application
CMD ["./tracker", "serv"]
