# scripts/AGENTS.md

Scope: the `scripts/` directory.
Parent map: [../AGENTS.md](../AGENTS.md).

This directory holds development and release automation.
The JavaScript files use the `.mjs` suffix and run directly, so no build step exists.
The `operations/` directory also holds a shell script and two systemd unit files.

## Map

| Path | Purpose |
| --- | --- |
| `dev-pocketbase.mjs` | Starts the local PocketBase with fixed data, migration, and hook directories. |
| `dev-pocketbase-admin.mjs` | Applies the operator account to the local database. The root script `pnpm pb:admin` calls it. |
| `lib/` | Shared modules. Examples: PocketBase download and checksum checks, runtime bundling, child-process shutdown, macOS library rewriting, Windows signing. |
| `operations/` | Host-side deployment for the production machine. Not a CI path. |
| `release/` | Version, check, build, signing, and release scripts. Many scripts have a `.test.mjs` neighbour. |

## Release scripts

`release/check.mjs` verifies version and lock consistency.
`release/ci-scope.mjs` selects CI jobs from the changed paths.
`release/lint-gate.mjs` fails on new lint diagnostics against `release/lint-baseline.json`.
`release/server-smoke.mjs` starts a server against a fresh database and checks user isolation.
`release/download-pocketbase.mjs` fetches the pinned binary from `release/pocketbase-lock.json` and verifies its checksum.
`release/version.mjs` synchronizes the version in `release/release.json`, `apps/desktop/package.json`, and `apps/desktop/src-tauri/tauri.conf.json`.
`release/candidate.mjs` assembles, approves, and prepares release assets.
`release/validate-run.mjs` accepts or rejects a workflow run before release.
`release/container-images.mjs` builds and pushes the container images.

Read a script before you run it.
Several scripts publish images or change a live host.

## Rules

1. Never run `operations/auto-deploy.sh`. It stops the production service, uses `sudo docker`, and can wipe the data directory on rollback.
2. Never run `release/container-images.mjs` or a release publish step unless the task asks for a release.
3. Keep the version equal in `release/release.json`, the Git tag, `apps/desktop/package.json`, and `tauri.conf.json`.
4. Keep the PocketBase version and checksums equal in `release/pocketbase-lock.json`, `deploy/pocketbase/Dockerfile`, and the documentation.
5. Shrink `release/lint-baseline.json` only after you fix the diagnostics. Use `node scripts/release/lint-gate.mjs --update-baseline`.
6. Add a test as a `.test.mjs` file next to the script. The root command `pnpm test:release` collects them.
7. Never print a secret. The local `.env` file and `pb/pb_data/.superuser-credentials.txt` hold real credentials.
