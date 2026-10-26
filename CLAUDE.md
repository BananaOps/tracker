# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Tracker is an event-tracking platform (deployments, incidents, drifts, RPA usage), service catalog and distributed lock service. Go backend (gRPC + grpc-gateway REST) backed by MongoDB (or FerretDB), with a React 19 / TypeScript / Vite / Tailwind 4 SPA in `web/`. A Python MCP server for AI agents lives in `mcp-server/` (uses `uv`).

## Commands

Tasks are defined in `Taskfile.yml` (`task --list`).

```bash
# Backend (needs MongoDB on 127.0.0.1:27017: docker run -d -p 27017:27017 mongo:7)
go run . serv                 # HTTP :8080 (REST, SPA, /docs Swagger), gRPC :8765, metrics :8081
task generate                 # buf dep update && buf generate (after editing proto/)
task lint                     # buf lint + golangci-lint run ./...
go test ./...                 # unit tests
go test ./internal/auth/... -run TestName -v      # single test
MONGO_TEST_URI=mongodb://127.0.0.1:27017 go test ./...   # also run Mongo-backed tests (skipped otherwise)

# Frontend (web/)
npm run dev                   # Vite on :3000, proxies /api to VITE_BACKEND_URL (default http://localhost:8080)
npm run build                 # outputs web/dist, which `serv` serves if present
npm run build:check           # tsc + build (type check)
npm run lint
npm run build:static          # demo build with VITE_STATIC_MODE=true (GitHub Pages), see web/README.static.md

task dev:all                  # backend + frontend together
```

CI (`.github/workflows/go-test.yml`) runs golangci-lint, gosec (`-exclude=G103,G115 -exclude-generated`), and `go test` with a Mongo service and `MONGO_TEST_URI` set. Proto changes are checked with `buf lint`.

## Architecture

**Request flow.** `main.go` → `cmd/serv.go` (cobra `serv` command) wires everything: auth config/stores, the gRPC server, and a grpc-gateway `runtime.ServeMux`. The gateway uses `Register*HandlerServer` (in-process, not a proxy to the gRPC port), so REST requests call the same `server.*` structs directly **without going through gRPC interceptors**. The HTTP handler stack is: `auth.HTTPMiddleware` → SPA file server for `web/dist` (falls back to `index.html`; `/api/`, `/docs`, `/swagger.json`, `/config.js` go to the mux). Ports are hardcoded in `serv.go` even though `internal/config` reads `GRPC_PORT`/`HTTP_PORT`.

**Layers.**
- `proto/<domain>/v1alpha1/*.proto` — source of truth for the API (event, catalog, lock, auth). REST routes come from `google.api.http` options under `/api/v1alpha1/...`.
- `generated/` — buf output (Go, gRPC, gateway, protoc-gen-validate, merged OpenAPI at `generated/openapiv2/apidocs.swagger.json`). Committed; never hand-edit, regenerate with `task generate`.
- `server/` — gRPC service implementations (`Event`, `Catalog`, `Lock`, `Auth`) plus plain HTTP handlers registered on the gateway mux via `HandlePath` (cookie login `auth_http.go`, OIDC `auth_oidc.go`, Homer proxy, custom links).
- `internal/stores/` — MongoDB access. A single package-level `*mongo.Database` is lazily created by the first `NewClient(collection)` call; indexes are set up in `indexes.go` via `EnsureIndexes`.
- `internal/config/` — DB/server settings from env vars (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_CA_FILE`, …) read in `init()`.
- `internal/auth/` — principals, permissions, sessions, API keys, CSRF, rate limiting, env config (`AUTH_*`). Subpackages: `identity` (resolve principal from session/API key/anonymous, admin bootstrap, OIDC user mapping), `sso` (OIDC provider, transaction codec; `ssotest` is a fake IdP for tests), `authz` (permission decisions).

**Authorization — required when adding an RPC.**
1. Every service method must call `authz.Authorize(ctx)` as its first statement (the gateway bypasses interceptors, so this is the only check on the REST path).
2. Add the RPC's full name to `authz.MethodPermissions` in `internal/auth/authz/methods.go`. Unlisted methods are denied, and `methods_test.go` fails if any RPC declared in the protos is missing.
3. Custom `HandlePath` handlers are guarded with `authz.RequireHTTP(perm, handler)`.

**Frontend (`web/src`).** `lib/api.ts` is the single API client (axios, base `/api/v1alpha1`); it swaps in `lib/staticApi.ts` when `VITE_STATIC_MODE=true`. The backend returns proto enums as numbers; `lib/apiConverters.ts` maps them to/from the string enums in `types/api.ts`. Runtime config (Jira, Slack, demo mode, Homer URL, Clarity ID) is injected by the backend's `/config.js` as `window.TRACKER_CONFIG` and read in `src/config.ts`. Data fetching uses TanStack Query; routes are in `App.tsx`; pages under `pages/` are large single-file components. `@/` aliases `src/`.

## Conventions

- Conventional Commits (enforced by a CI workflow); releases and `CHANGELOG.md` are managed by release-please, so don't edit the changelog or versions by hand.
- Many code comments and log messages are in French; match the surrounding file.
- Docker image (`Dockerfile`) bundles frontend + backend; Helm chart in `helm/`, Skaffold configs for k8s dev.
