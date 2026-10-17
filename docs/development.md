# Development manual

## Environment

| Tool | Requirement |
| --- | --- |
| Node | The version in `.node-version`, currently 24.15.0 |
| pnpm | 9.0.0, see the root `package.json` |
| Rust | The version in `rust-toolchain.toml`, currently 1.99.0. Desktop development needs it. |
| PocketBase | Use the repository download script. It gets the pinned version for the current platform. |
| FFmpeg / FFprobe | Necessary for the media functions and for the desktop runtime preparation |
| Docker Compose | Necessary for container development, tests, and deployment |

Install from the lock file with `pnpm install --frozen-lockfile`. Do not commit `node_modules`, build output, runtime resources, a real `.env`, or a local database.

## Project layout

| Directory | Responsibility |
| --- | --- |
| `apps/web` | Next.js web app, login, registration, and the workspace entry |
| `apps/desktop` | Next.js static frontend, Tauri native program, and the runtime bundle |
| `apps/server` | Node server entry and the desktop local mode |
| `backend/domain` | Domain model |
| `backend/application` | Application use cases |
| `backend/infrastructure` | Database and storage implementations |
| `backend/adapter-front`, `adapter-back`, `adapter-tauri` | Boundary adapters |
| `packages` | Shared UI, editor, graph, data view, state, API, and client |
| `pb` | Development PocketBase and data. The start script sets the migration and hook directories. |
| `deploy` | Dockerfiles, gateway configuration, and the deployment environment templates |
| `scripts/release` | Version, workflow validation, package verification, candidate, and release scripts |
| `.github/workflows` | CI, desktop, container, candidate, and release workflows |

Change the business behavior in the shared domain and application layers first. Then change the platform adapters and the UI. Do not spread platform details into the domain model.

## Web and backend development

```bash
pnpm install --frozen-lockfile
node scripts/release/download-pocketbase.mjs
cp .env.example .env
# Set the operator email and password, and change the development ports if necessary
pnpm dev
```

Only two development commands exist. `pnpm dev` starts PocketBase, the web app, and the server on this machine. `pnpm dev:remote` adds the gateway `scripts/dev-gateway.mjs` for a remote domain. Both commands start the child processes in parallel. The exit of one process stops the group.

The ports come from the root `.env`. A shell variable of the same name has priority.

| Service | Variable | Default | Address |
| --- | --- | --- | --- |
| Web | `DBRAIN_WEB_PORT` | 3000 | <http://localhost:3000> |
| Server | `DBRAIN_SERVER_PORT` | 3001 | <http://localhost:3001> |
| PocketBase | `DBRAIN_PB_HTTP` | 127.0.0.1:8090 | <http://127.0.0.1:8090> |
| Gateway (`dev:remote` only) | `DBRAIN_GATEWAY_PORT` | 8080 | <https://p8080>.<development domain> |

Two services on the same port fail at the start with an error. PocketBase does not wait in a loop.

Development data goes to the repository directory `pb/pb_data` by default, with its migration run directory at `pb/pb_data/pb_migrations`. The PocketBase launcher prepares that directory before creating the operator account and sets the data, migration, and hook directories explicitly. The current shell directory does not change them. When you set `DBRAIN_PB_DATA_DIR`, the run directory moves with it. When you change the PocketBase address, check the backend `PB_URL` too. The launcher rejects a database from before the `0000000001_base_schema.js` baseline.

`DBRAIN_ADMIN_EMAIL` and the password in `.env` belong to the operator account. The app identity uses the normal `users` collection. A shell variable of the same name has priority over the file. After an admin configuration change, run `pnpm pb:admin` to synchronize the development database account.

Run one package with `pnpm --filter <package> <script>`, or run the full stack with `pnpm dev`.

## Remote development with a public domain

`pnpm dev:remote` is `pnpm dev` plus the gateway process `scripts/dev-gateway.mjs`. It lets the browser reach the local development stack through the domain.

The gateway takes all requests on one port and routes them by path.

| Path | Upstream |
| --- | --- |
| `/trpc` | Server, with the WebSocket upgrade |
| `/pb/api/*` | Development PocketBase: registration, login, and attachments |
| `/pb/upload/*` | Server: the chunked upload session. The server writes the chunks to the local disk and stores the file in PocketBase after the assembly. |
| `/pb/*` | 404. The production file gateway is not used. |
| All other paths, including `/_next/webpack-hmr` | Next |

The gateway keeps the browser Host header. The server compares the Host header with the browser `Origin` for the same-origin decision in `apps/server/src/origin.ts`. A rewrite to an upstream address makes every API call return 403.

The gateway is necessary because the client uses only `/trpc` and `/pb` on the same domain. It does not connect to 3001 or 8090 on the browser machine. See `packages/api-client/src/backend-urls.ts`. The same-domain entry must accept these two paths.

All ports come from the root `.env`. `DBRAIN_GATEWAY_PORT` (default 8080) is the gateway and the port in the address `https://p<DBRAIN_GATEWAY_PORT>.<DBRAIN_DEV_DOMAIN>`. `DBRAIN_WEB_PORT`, `DBRAIN_SERVER_PORT`, and `DBRAIN_PB_HTTP` are the three upstreams.

In the remote form, Next binds to loopback only. Only the gateway listens externally (`DBRAIN_GATEWAY_HOST`, default 0.0.0.0). `DBRAIN_DEV_DOMAIN` only prints the address at the start. It does not control a listener.

The command sets the upstream addresses itself (`DBRAIN_WEB_URL`, `DBRAIN_SERVER_URL`, `DBRAIN_PB_URL`). Do not set them by hand. `DBRAIN_GATEWAY_LOG=1` prints every request. By default, the gateway prints only `/trpc`, `/pb`, and the upgrade requests.

## Desktop development

The desktop frontend reuses the web app. Tauri starts the Node backend and PocketBase. The desktop app does not need the development web stack. It does not read the operator account from the root `.env`.

A native build needs the runtime for the OS and the architecture.

| Platform | Extra dependencies |
| --- | --- |
| Linux | WebKitGTK 4.1, GTK 3, OpenSSL, librsvg, and the C/C++ toolchain. The AppImage also needs patchelf, GStreamer tools, and the base, good, and libav plugins. |
| Windows | Rust MSVC, Visual Studio C++ Build Tools, Windows SDK, WebView2 |
| macOS | Xcode Command Line Tools and the runtime and media dependencies for the architecture |

Ubuntu can use the dependency list of the workflow.

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libssl-dev librsvg2-dev build-essential patchelf ffmpeg gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-libav
```

PocketBase uses `pb/pocketbase` by default (`.exe` on Windows). The app finds FFmpeg and FFprobe in PATH. You can set `DBRAIN_POCKETBASE_PATH`, `FFMPEG_PATH`, and `FFPROBE_PATH`.

```bash
pnpm dev:desktop
# Or build an installer for the current target platform
pnpm build:desktop
```

The Tauri `beforeDevCommand` and `beforeBuildCommand` prepare the runtime, then start or build the frontend. `pnpm --filter desktop build` creates the static frontend only. It does not replace a native app verification. The generated resources are in `apps/desktop/src-tauri/runtime`. The installers are usually in `apps/desktop/src-tauri/target/release/bundle`.

The current release targets are Linux x64, Windows x64, and macOS x64 / arm64. There is no Linux or Windows ARM desktop target and no macOS universal package. Test the Linux compatibility of each distribution on the real target system.

## Before you commit

The owner commits directly to `develop` or merges an internal `feature/*` or `fix/*` branch. External PRs are not accepted. Run relevant checks locally:

```bash
pnpm release:check
pnpm check-types
pnpm lint:gate
pnpm test:release
pnpm build
pnpm smoke:server
```

For desktop changes, also prepare the runtime, run the backend smoke test, and run the Rust library tests as described in [the desktop instructions](../apps/desktop/AGENTS.md). Use only isolated test data for server smoke tests. `pnpm lint:gate` blocks new diagnostics against the stored baseline.

## CI/CD operations

CI runs on pushes to `develop` and `main` and internal PRs. The owner tags a version commit on `develop`; the tag builds declared containers and desktop targets with available signing secrets and creates a draft release after a successful candidate. Promote `develop` to `main` using a merge commit, then manually publish the draft. See [CI/CD and releases](ci-cd.md).

The commands above are the ones the `checks` job runs, so a green local run predicts a green pull request. Keep this list and [CI/CD and releases](ci-cd.md) in step with `.github/workflows/ci.yml`.

## Daily maintenance

Update the correct workspace package and lockfile when changing dependencies. Add a new migration for schema changes; do not edit a released migration. Test native runtime and backup/restore behavior when an affected platform changes. The owner selects and commits dependency updates.
