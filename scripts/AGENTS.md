# scripts/AGENTS.md

Scope: the `scripts/` directory.
Parent map: [../AGENTS.md](../AGENTS.md).

This directory holds development and release automation.
The JavaScript files use the `.mjs` suffix and run directly, so no build step exists.

## Map

| Path | Purpose |
| --- | --- |
| `dev-pocketbase.mjs` | Starts the local PocketBase with fixed data, migration, and hook directories. |
| `dev-pocketbase-admin.mjs` | Applies the operator account to the local database. The root script `pnpm pb:admin` calls it. |
| `dev-run.mjs` | Starts the development stack from the root `.env`. The root scripts `pnpm dev` and `pnpm dev:remote` call it. |
| `dev-gateway.mjs` | One-port entry for remote development. It routes `/trpc` and `/pb/api/*` to the backends, `/pb/upload/*` to the API, and everything else to Next, and forwards the browser Host unchanged. The root script `pnpm dev:remote` calls it. |
| `gate.mjs` | The one entry of the push gate. The root script `pnpm gate` calls it. |
| `gate/` | The push gate. `checks.mjs` holds the check list, `scope.mjs` holds the path policy, `attest.mjs` holds the trailer, `run.mjs` is the local runner, `verify.mjs` is the CI verifier, `hook.mjs` is the local pre-push brake, `hooks/` holds the hook script, and `apply-ruleset.mjs` holds the GitHub policy. |
| `lib/` | Shared modules. Examples: PocketBase download and checksum checks, runtime bundling, development port resolution, development gateway routing, child-process shutdown, macOS library rewriting, Windows signing. |
| `release/` | Version, check, build, signing, and release scripts. Many scripts have a `.test.mjs` neighbour. |

## Release scripts

`release/check.mjs` verifies version and lock consistency.
`release/lint-gate.mjs` fails on new lint diagnostics against `release/lint-baseline.json`.
`release/server-smoke.mjs` starts a server against a fresh database and checks user isolation.
`release/download-pocketbase.mjs` fetches the pinned binary from `release/pocketbase-lock.json` and verifies its checksum.
`release/version.mjs` synchronizes the version in `release/release.json`, `apps/desktop/package.json`, and `apps/desktop/src-tauri/tauri.conf.json`.
`release/candidate.mjs` assembles, approves, and prepares release assets.
`release/platforms.mjs` reads the declared platforms of a release candidate and holds the runner of each platform.
`release/validate-run.mjs` accepts or rejects a Gate run before release.
`release/container-images.mjs` builds and pushes the container images.

Read a script before you run it.
Several scripts publish images or change a live host.

## Push gate

`gate.mjs` is the one local entry. The root script `pnpm gate` calls it.
`gate/checks.mjs` holds the check list. It is the single source of truth.
`gate/scope.mjs` maps a changed path to a check.
`gate/attest.mjs` builds and reads the commit trailer.
`gate/run.mjs` runs the stages from plan through merge. With no arguments it prompts a person; automation sets `--until` and the required inputs. `gate/branches.mjs` routes ordinary branches to develop, hotfix branches to main and develop, and develop to main. Release branches synchronize the version and platform declaration before checks. The runner refuses a version that does not advance or whose remote tag already exists.
`gate/verify.mjs` is the CI verifier. The workflow copies the base-commit file and runs the copy.
`gate/apply-ruleset.mjs` prints the GitHub policy of the gate. The flag `--apply` writes it.
`gate/hook.mjs` is the local brake. It runs as a `pre-push` hook. The root script `pnpm gate:hooks` installs the hook into `.git/hooks`.
`gate/hooks/pre-push` is the tracked hook script. It keeps the executable bit. Git skips a hook without it.

The gate writes its report to `.gate/last-run.json`. The file stays out of Git.

## Rules

1. Never run `release/container-images.mjs` or a release publish step unless the task asks for a release.
2. Keep the version equal in `release/release.json`, the Git tag, `apps/desktop/package.json`, and `tauri.conf.json`.
3. Keep the PocketBase version and checksums equal in `release/pocketbase-lock.json`, `deploy/pocketbase/Dockerfile`, and the documentation.
4. Shrink `release/lint-baseline.json` only after you fix the diagnostics. Use `node scripts/release/lint-gate.mjs --update-baseline`.
5. Add a test as a `.test.mjs` file next to the script. The root command `pnpm test:release` collects them.
6. Never print a secret. The local `.env` file and `pb/pb_data/.superuser-credentials.txt` hold real credentials.
7. Keep `gate/checks.mjs` as data and `gate/scope.mjs`, `gate/attest.mjs`, and `gate/branches.mjs` free of imports except Node.js built-ins. The CI verifier loads those files from the base commit.
8. Add a check to `gate/checks.mjs` first. Never add a check to a workflow only. Add the test as a `.test.mjs` file next to the module.
