# AGENTS.md

Scope: the whole dBrain repository.
Read this file first.
Then read the `AGENTS.md` file in the directory that you will change.

This file is a map and a rule set.
It is not a manual.
Keep this file shallow.
Put new detail in the nearest child file.

## What dBrain is

dBrain is a knowledge workspace.
A user records content in nodes and connects nodes with edges.
The user reads and edits the result as a graph, a data view, or a dashboard.
The web app talks to a self-hosted server.
The desktop app runs the full backend and PocketBase on the local machine.
The product version is 0.1.0 and the project is in internal test.

## Repository map

| Directory | Content | Read next |
| --- | --- | --- |
| `apps/` | The web, desktop, and server programs | [apps/AGENTS.md](apps/AGENTS.md) |
| `packages/` | Shared UI, editor, graph, data view, state, client | [packages/AGENTS.md](packages/AGENTS.md) |
| `backend/` | Domain model, use cases, storage, adapters | [backend/AGENTS.md](backend/AGENTS.md) |
| `scripts/` | Development and release automation | [scripts/AGENTS.md](scripts/AGENTS.md) |
| `pb/` | PocketBase hooks and migrations | [pb/AGENTS.md](pb/AGENTS.md) |
| `deploy/` | Container, gateway, and deployment templates | [deploy/AGENTS.md](deploy/AGENTS.md) |
| `docs/` | User, developer, and operator manuals: English in the tree root, Chinese in `docs/zh/` | [docs/AGENTS.md](docs/AGENTS.md) |
| `.github/` | CI, desktop, container, and release workflows | [.github/AGENTS.md](.github/AGENTS.md) |

## How the parts connect

```text
apps/web, apps/desktop  ->  packages/*      shared UI, state, and client code
apps/web, apps/desktop  ->  apps/server     business calls over tRPC
apps/server             ->  backend/*       domain, use cases, adapters
backend/infrastructure  ->  PocketBase      records, files, and identity
```

- `apps/web` and `apps/desktop` share `packages/`. Change shared behavior once, then check both apps.
- `backend/` uses inward dependencies. The domain layer depends on no other backend layer.
- `backend/adapter-front` owns the tRPC router and the composition root. Start there to trace a request.
- PocketBase is the server data store. The desktop local mode keeps entity records in IndexedDB and uses a local PocketBase for identity and files.

## Commands

Prerequisites: Node 24.15.0, pnpm 9.0.0, and FFmpeg with FFprobe.

```bash
pnpm install --frozen-lockfile
node scripts/release/download-pocketbase.mjs
cp .env.example .env          # then set the admin email and password
pnpm dev                      # starts PocketBase, web, and server in development
pnpm dev:remote               # the same, behind the development gateway
```

Development addresses: web `http://localhost:3000`, server `http://localhost:3001`, PocketBase `http://127.0.0.1:8090`. The ports come from `.env` (`DBRAIN_WEB_PORT`, `DBRAIN_SERVER_PORT`, `DBRAIN_PB_HTTP`).

```bash
pnpm check-types
pnpm lint:gate
pnpm test:release
pnpm build                    # builds the server and the web app
pnpm gate --dry-run -m "chore: check"   # runs the checks and writes the push gate trailer
pnpm gate:policy              # prints the GitHub policy of the push gate
pnpm dev:desktop              # needs Rust and the native libraries
```

## Repository rules

1. Do not commit `node_modules`, build output, runtime resources, a real `.env`, or a local database.
2. Do not edit a released PocketBase migration. Add a new migration file instead.
3. Change business behavior in `backend/domain` or `backend/application` first. Then update the adapters and the UI.
4. Add a JavaScript dependency in the correct workspace package and update `pnpm-lock.yaml`. Add a Rust dependency and update `Cargo.lock`.
5. Write a user-facing manual in `docs/` and its Chinese version in `docs/zh/`. Keep the two files in step.
6. Use Conventional Commits. Example: `fix(server): reject a stale token`.
7. Do not point a smoke test at a live service. The server smoke test needs an isolated test database.

## Before you finish

1. Run `pnpm release:check`.
2. Run `pnpm check-types`.
3. Run `pnpm lint:gate`. The gate compares your work against a stored baseline. It blocks new diagnostics only.
4. Run `pnpm test:release`.
5. Run `pnpm build`.
6. If you changed the desktop app, also run the desktop checks in [apps/desktop/AGENTS.md](apps/desktop/AGENTS.md).
7. To push the work, run `pnpm gate -m "type(scope): subject"`. It runs the checks, commits the change, and pushes it. Read [docs/ci-cd.md](docs/ci-cd.md) first.
