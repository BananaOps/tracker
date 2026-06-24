# Copilot Instructions for Tracker

## Build, test, and lint

- Backend tests: `go test ./...`
- Single Go test: `go test ./internal/config -run TestDefaultConfigValues`
- Backend lint: `golangci-lint run ./...` or `task lint`
- Backend format: `go fmt ./...` or `task fmt`
- Proto lint/generate: `buf lint`, `buf generate`, or `task generate`
- Frontend lint: `cd web && npm run lint`
- Frontend type/build check: `cd web && npm run build:check`
- Frontend production build: `cd web && npm run build`
- Repo build: `task build`, `task build:frontend`, or `task build:all`
- Full backend test run with coverage: `task test`
- Local run: `go run main.go serv` or `task dev:backend`; frontend dev is `cd web && npm run dev`

## High-level architecture

Tracker is a Go backend plus a React/Vite frontend, with a small Python MCP server in `mcp-server/` and Helm/Kubernetes assets under `helm/`.

The backend exposes three gRPC services: events, catalog, and locks. `cmd/serv.go` wires them into both gRPC and grpc-gateway HTTP endpoints, serves Swagger UI and `/swagger.json`, exposes Prometheus on `:8081`, and serves the built frontend from `web/dist` when present. It also injects runtime frontend config via `/config.js`.

Proto files in `proto/**` are the source of truth for API definitions. `buf generate` produces checked-in code under `generated/**` including gRPC, grpc-gateway, validation, and OpenAPI output.

The frontend is route-driven in `web/src/App.tsx` and wrapped by `web/src/components/Layout.tsx`. It talks to the API through `web/src/lib/api.ts`, which normalizes protobuf-style snake_case payloads and camelCase frontend types, and switches to static JSON data when `VITE_STATIC_MODE=true`.

MongoDB is the persistence layer. `internal/stores/` holds collection-specific clients, and `internal/stores/indexes.go` creates indexes on startup before the servers begin handling requests.

## Key conventions

- For any frontend, UI, styling, layout, or design change, read and follow `/design.md` first; treat it as the source of truth for visual decisions and component behavior.
- Treat `proto/**` as the source of truth; do not hand-edit `generated/**`.
- When `.proto` files change, regenerate with `task generate` and keep the generated OpenAPI and Go code in sync.
- Backend config is loaded from environment variables in `internal/config/config.go`; the runtime config served to the browser comes from `/config.js`.
- Preserve the API shape normalization in `web/src/lib/api.ts` and `web/src/lib/apiConverters.ts` when changing endpoints or payloads.
- Keep route additions in sync between `web/src/App.tsx` and `web/src/components/Layout.tsx`.
- Release automation expects conventional commits (`feat`, `fix`, `docs`, `test`, `ci`, `refactor`, `perf`, `chore`, `revert`), and PR titles are validated the same way.
- Prefer the existing store/server patterns in `internal/stores/` and `server/` instead of introducing new persistence abstractions.
