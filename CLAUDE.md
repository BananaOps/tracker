# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Task runner is [Taskfile](Taskfile.yml) (`task --list` for all targets).

```bash
# Backend
task dev:backend                 # go run . serv  (needs MongoDB on 127.0.0.1:27017)
go test ./...                    # all Go tests
go test ./internal/config -run TestDefaultConfigValues   # single test
task lint                        # buf lint + golangci-lint run ./...
task fmt                         # buf format -w + go fmt ./...
task test                        # go test -v -race -coverprofile=coverage.out ./...
task generate                    # buf dep update + buf generate (regenerate generated/**)

# Frontend (from web/)
npm run dev                      # Vite dev server on :3000, proxies /api to VITE_BACKEND_URL (default http://localhost:8080)
npm run lint                     # eslint, --max-warnings 0
npm run build:check              # tsc && vite build  (type check)
npm run build                    # production build into web/dist
npm run build:static             # demo build, VITE_STATIC_MODE=true

# Full stack
task dev:all                     # backend + frontend together
task build:all                   # frontend then Go binary into bin/
docker run -d -p 27017:27017 --name tracker-mongo mongo:7   # local DB
```

There is **no frontend test runner configured** — `web/src/**/__tests__/` directories exist but are empty and no vitest/jest dependency is installed. Do not invent `npm test`. Load tests live in `tests/k6/` (`task k6:generate`, `task k6:test-locks`).

Note: `task dev:all` prints "Frontend sur http://localhost:5173" but `web/vite.config.ts` sets port **3000**.

## Architecture

Single Go binary + React SPA, MongoDB persistence.

**Proto is the source of truth.** `proto/{event,lock,catalog}/v1alpha1/*.proto` define the three gRPC services and their REST routes (`google.api.http` options, all under `/api/v1alpha1/...`). `buf generate` emits checked-in code into `generated/**` (Go structs, gRPC, grpc-gateway, protoc-gen-validate, and the merged OpenAPI spec at `generated/openapiv2/apidocs.swagger.json`). Never hand-edit `generated/**`; change the proto and regenerate.

**`cmd/serv.go` is the wiring hub.** One process serves everything:
- gRPC on `:8765` (with reflection), HTTP on `:8080`, Prometheus on `:8081/metrics` — these ports are **hardcoded in `serv.go`**, not read from `internal/config` (which has its own defaults used elsewhere).
- grpc-gateway `runtime.ServeMux` handles `/api/v1alpha1/*`; Swagger UI at `/docs`, spec at `/swagger.json` (served from the file on disk, so run from the repo root).
- Serves the built SPA from `web/dist` when present, falling back to `index.html` for unknown paths (SPA routing). If `web/dist` is missing it serves API only.
- Generates `/config.js` at request time, injecting `window.TRACKER_CONFIG` from env vars (`JIRA_*`, `SLACK_*`, `DEMO_MODE`, `HOMER_URL`, `BUY_ME_COFFEE_URL`, `CLARITY_PROJECT_ID`). Runtime frontend config goes here, **not** into Vite build-time env; the shape is mirrored in `web/src/config.ts`.
- Calls `server.EnsureIndexes` before serving.

**Not everything is proto-backed.** `server/links.go` (`/api/links` CRUD) and `server/homer.go` (Homer dashboard proxy) are hand-written handlers registered on the same mux via `mux.HandlePath`. Follow that pattern for non-gRPC endpoints rather than adding a new server.

**Backend layering:** `cmd/` (cobra CLI only) → `server/` (gRPC service impls, Prometheus metrics, business rules — e.g. `server/event.go` consults the lock service and writes changelog entries) → `internal/stores/` (MongoDB repository per collection; `NewClient(collection)` creates/returns the collection, `indexes.go` creates indexes at startup) → `internal/config/config.go` (env-var driven, read once in `init()`).

**Frontend:** routes in `web/src/App.tsx`, chrome/navigation in `web/src/components/Layout.tsx` — keep both in sync when adding a page. `web/src/lib/api.ts` is the single axios client (base `/api/v1alpha1`); `web/src/lib/apiConverters.ts` translates between protobuf snake_case payloads and camelCase frontend types. API enums (type, priority, status, environment) travel as **numbers**. Data fetching is React Query; UI primitives in `web/src/components/ui/` are shadcn-style, icons from lucide-react plus custom SVGs in `components/icons/`.

**Static/demo mode:** with `VITE_STATIC_MODE=true`, `api.ts` swaps every real call for `web/src/lib/staticApi.ts`, which reads pre-generated JSON from `web/public/static-data/`. Any new endpoint added to `api.ts` needs a matching static implementation or demo mode breaks.

## Conventions

- **UI work: read `design.md` first** — it is the source of truth for palette, tokens, density, and component behavior (light and dark are designed together, never retrofitted).
- Additional agent rules live in `.github/copilot-instructions.md` and `.kiro/steering/*.md` (architecture, code-quality, testing, git-workflow, design-system — written in French).
- Go: wrap errors with `fmt.Errorf("context: %w", err)`, `context.Context` first, dependencies via constructors, all Mongo access through `internal/stores/`.
- TypeScript: strict, no `any`, explicit prop interfaces.
- Conventional commits enforced on PR titles by `.github/workflows/conventional-commit.yml`: `feat`, `fix`, `docs`, `test`, `ci`, `refactor`, `perf`, `chore`, `revert`. Releases and CHANGELOG are automated by release-please.
- When `.proto` changes: `task generate`, then commit the regenerated Go and OpenAPI output alongside.
