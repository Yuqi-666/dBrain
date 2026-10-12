# apps/server/AGENTS.md

Scope: the `apps/server` package.
Parent map: [../AGENTS.md](../AGENTS.md).

This package is the long-running server process.
It hosts the tRPC router from `backend/adapter-front`.
It also serves an authenticated PocketBase file gateway.
It contains no business logic.

## Entry points

`src/index.ts`, `src/origin.ts`, `scripts/build.mjs`, and `Dockerfile`.

## Map

| Path | Content |
| --- | --- |
| `src/index.ts` | The HTTP and WebSocket server |
| `src/origin.ts` | The same-origin check |
| `src/desktop/` | The local mode for the desktop app: `runtime.ts`, `security.ts`, `upgrade-backup.ts`, and `pb_hooks/local.pb.js` |
| `src/*.test.ts` | Tests for the origin check and the desktop security rules |
| `scripts/build.mjs` | The esbuild bundle step |

## Mechanisms

`src/index.ts` creates a `node:http` server.
It answers `/health`.
It forwards `/pb/*` only after `allowedFileRequest`, `sameOrigin`, and `verifyToken` all pass.
It serves the tRPC WebSocket at `/trpc` through `createWSServer` in `noServer` mode.

At start the server waits up to 30 seconds for `PB_URL/api/health`.
Then it calls `AppContainer.initialize(PB_URL)`.
It shuts down on `SIGINT` or `SIGTERM`.

Environment variables: `PORT` defaults to 3001. `PB_URL` defaults to `127.0.0.1:8090`. Set `DBRAIN_PUBLIC_ORIGIN` only when a proxy rewrites the Host header.

The same source produces the desktop backend bundle through `src/desktop/runtime.ts`.

## Commands

| Command | Action |
| --- | --- |
| `pnpm dev` | `tsx watch src/index.ts` |
| `pnpm dev:pb` | Start the local PocketBase through `scripts/dev-pocketbase.mjs` |
| `pnpm build` | esbuild to `dist/index.mjs` |
| `pnpm start` | Run the built bundle |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |

## Rules

1. Put business behavior in `backend/`. This package only hosts it.
2. Keep the same-origin check and the token check on the file gateway. Both protect an attachment.
3. Remember that `apps/server` is the only process with a public port. Route a new endpoint through this file.
4. Do not commit `dist/`.
5. Point the smoke test at an isolated database only. Never run `scripts/release/server-smoke.mjs` against a live service.
