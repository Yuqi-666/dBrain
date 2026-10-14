# CI/CD pipeline

The pipeline runs in two places. The local workspace checks a change and pushes it. GitHub verifies the work, builds the products, and publishes an accepted release.

The pipeline has three gates.

1. The local gate runs in the workspace. One command checks the change, commits it, and pushes the branch.
2. The GitHub gate reads the trailer of that commit. It runs no check again. It accepts the commit or rejects it.
3. The build gates make the products on a clean runner and publish an accepted release.

The manual has two parts. The section "Push gate" describes the local entry and the verifier. The sections from "The stages after the merge" describe the build and the release.

## Push gate

The pipeline starts in the local workspace. One command runs the checks, commits the change, and pushes the branch.

```bash
pnpm gate -m "feat(graph): add a density slider"
```

This command is the only entry. It reads the check list from `scripts/gate/checks.mjs`. It writes a trailer into the commit message. Then it pushes the branch and opens a pull request.

The workflow `gate.yml` is the second gate. It answers one question. Did the author use the local entry on the tree that the change merges? It does not run a check again.

### The gate command

| Option             | Effect                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `-m "text"`        | The commit subject. Repeat the option for a body paragraph.          |
| `--base BRANCH`    | The pull request base branch. The default is `main`.                 |
| `--full`           | Run every local check, not only the checks in scope.                 |
| `--release`        | The same full run, before a release tag.                             |
| `--no-push`        | Check and commit, but do not push.                                   |
| `--no-sign`        | Do not sign the commit. The verifier rejects an unsigned commit.     |
| `--no-auto-merge`  | Do not ask GitHub to merge the pull request.                         |
| `--allow-protected`| Allow a local run on `main` or `develop`.                            |
| `--dry-run`        | Print the check plan and the trailer. Change nothing.                |

The command stops before the commit when a check fails. It never forces a push.

The command commits every change in the workspace. Commit or stash unrelated work first.

The command signs the commit with an SSH key. Set the key once. Add the same key to GitHub as a signing key.

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

### The trailer

The gate writes one trailer block into the commit message.

```text
Gate-Version: 1
Gate-Tree: 9a1c4f2e...b7
Gate-Checks: release-check,typecheck,lint-gate,unit,build
Gate-Env: node=24.15.0 pnpm=9.0.0 os=linux arch=x64
Gate-Report: sha256:3f9d...21
Gate-Run: 2026-05-05T09:12:44Z
```

`Gate-Tree` is the Git tree hash of the checked content. The trailer names a tree, not a commit. A rebase and an earlier commit by an editor therefore keep the binding. A change to the content after the gate breaks the binding.

`Gate-Env` records the toolchain of the run. The verifier copies it into the report.

The gate writes the complete report to `.gate/last-run.json`. The file stays out of Git.

### The check list

The file `scripts/gate/checks.mjs` holds every check. It is the single source of truth.

| Check           | Runner | Content                                              |
| --------------- | ------ | ---------------------------------------------------- |
| `release-check` | Local  | The version and the lock files agree.                |
| `syntax`        | Local  | Every automation script parses.                      |
| `workflow-lint` | Local  | actionlint accepts every workflow file.              |
| `typecheck`     | Local  | The TypeScript type checker accepts the workspace.   |
| `lint-gate`     | Local  | No new lint diagnostic appears.                      |
| `unit`          | Local  | The release and library tests pass.                  |
| `build`         | Local  | The server and the web app build.                    |
| `smoke-server`  | Local  | The server answers against an isolated database.     |
| `container`     | GitHub | The container stack builds and answers on `main`.    |
| `desktop`       | GitHub | The desktop installers build on `main` and a tag.    |

Each check has a path scope. The gate runs a local check only when the change touches its scope. The option `--full` runs every local check.

A check with the runner `GitHub` never enters the trailer. Only a clean GitHub runner can run it. The job `build` of `gate.yml` and the release candidate are those checks.

### The verifier

The jobs `verify` and `merged` copy `checks.mjs`, `scope.mjs`, `attest.mjs`, and `verify.mjs` from a trusted commit and run that copy. A change therefore cannot weaken the judge that reads it.

- The job `verify` reads the base commit of the pull request.
- The job `merged` reads the previous tip of `main`.

The verifier takes about 30 seconds. It installs no dependency. It makes these decisions.

1. The head commit holds a trailer, and the protocol version is known.
2. The tree of the head commit equals `Gate-Tree`.
3. The trailer lists every check that the changed paths require.
4. No tracked file is on the deny list. The deny list holds a local `.env` file, a dependency, a local database, a build output, and a key file.
5. A change to `scripts/gate/**`, `scripts/gate.mjs`, or `.github/workflows/gate.yml` needs the label `gate-change` and a review.
6. The commit signature is valid. The verifier reads the result from the GitHub API.

A rejected commit fails the job. The ruleset makes the job `verify` a required status check, so the merge is blocked.

Rule 6 keeps the identity of the author. A signature proves a claim. It does not prove that a command ran. An author can write a false trailer. The branch ruleset and the review of the gate files are the defence against that.

### The merge gate

Every change reaches `main` as a merge commit. The job `merged` reads that commit.

The commit must have two parents. The first parent is the previous tip of `main`, which an earlier run accepted. The second parent is the head of the pull request. The job makes these decisions about every parent after the first.

1. The parent holds a trailer, and the protocol version is known.
2. The tree of the parent equals `Gate-Tree`.
3. The commit signature is valid.

A push that is not a merge commit fails. A direct push to `main` cannot pass the ruleset.

## The stages after the merge

| Stage      | Workflow and job                                | Trigger                    | Product                                                |
| ---------- | ----------------------------------------------- | -------------------------- | ------------------------------------------------------ |
| Verify     | `gate.yml`, job `verify`                        | A pull request to `main`   | The gate verdict on the trailer                        |
| Merge      | `gate.yml`, job `merged`                        | A push to `main`           | The gate verdict on the merge                          |
| Main build | `gate.yml`, job `build`                         | A push to `main`           | Three images and the container smoke test               |
| Tag        | `gate.yml`, job `tag`                           | A push to `main`           | The version tag, for a new version                      |
| Candidate  | `gate.yml`, job `release` → `release-candidate.yml` | A new tag              | Four installers, two architectures, and one candidate   |
| Publication| `release.yml`                                   | A manual start             | A draft release, or a published release                 |

The old workflows `ci.yml` and `release-candidate.yml` retired with this design. The job `containers` of `ci.yml` became the job `build` of `gate.yml`. A pull request therefore builds no container.

The job `build` has a limit of 40 minutes. It builds three images for `linux/amd64`: PocketBase, server, and web. Each build reads a Docker cache and writes it.

The job then starts the stack with the CI overlay `deploy/compose.test.yml`. The overlay publishes three loopback ports.

| Port  | Service    |
| ----- | ---------- |
| 13080 | Gateway    |
| 13081 | Server     |
| 13090 | PocketBase |

The job runs `scripts/release/server-smoke.mjs` against these ports. On a failure, the job prints the last 60 log lines. The job always removes the stack and its volumes.

The stack uses a disposable operator account. The account email is `ci@dbrain.invalid`. The password is a fixed test value. The stack and its data are throwaway.

The job `build` is the last quality check on a clean machine. A change that a contaminated workspace hid fails here.

### The tag

The job `tag` reads the version from `scripts/release/release.json`. A version bump is the release signal.

- The version did not change in this merge: the job stops. No release starts.
- The tag exists: the job reports it and stops.
- The tag is missing: the job creates `vVERSION` at the pushed commit and pushes the tag.

The job `release` then calls `release-candidate.yml` when the tag is new. A manual start of `gate.yml` with `release=true` repeats the candidate for an existing tag, for example after a failed platform build.

## Release candidate

`release-candidate.yml` starts from the job `release` of `gate.yml`. It also starts from a manual start.

| Input    | Meaning                                              | Default |
| -------- | ---------------------------------------------------- | ------- |
| `tag`    | The version tag, for example `v0.1.1`                | None    |
| `signed` | Verify Windows and macOS signatures and notarization | `true`  |

The job `verify-tag` accepts the tag or rejects it. It checks these items.

1. The version in the release files equals the tag. The script `scripts/release/check.mjs` makes this decision.
2. The commit of the tag is on the default branch.

The job `desktop` then builds four targets. Each matrix job has a limit of 90 minutes.

| Runner             | Target        |
| ------------------ | ------------- |
| `ubuntu-22.04`     | `linux-x64`   |
| `windows-2022`     | `win32-x64`   |
| `macos-15-intel`   | `darwin-x64`  |
| `macos-15`         | `darwin-arm64`|

Each desktop job runs these steps.

1. Install FFmpeg for the platform.
2. Restore the Rust dependency cache.
3. Download the pinned PocketBase binary.
4. Prepare the desktop runtime.
5. Run the desktop backend smoke test.
6. Run the Rust library tests with `cargo test --locked --release --lib`.
7. Build the installer with `pnpm --filter desktop tauri build --ci`.
8. Verify the Linux package.
9. Verify the macOS signature with `codesign` and `spctl`.
10. Verify the Windows signature with `Get-AuthenticodeSignature`.
11. Collect the installers, the runtime manifest, and the hashes.
12. Upload the artifact `desktop-TARGET-RUN_ID-ATTEMPT`.

Steps 9 and 10 run only when the input `signed` is `true`.

A signed build uses the environment `release`. An unsigned build uses the environment `candidate`. A signed job removes the temporary signing key at the end.

The job `containers` builds the two architectures.

| Runner             | Architecture |
| ------------------ | ------------ |
| `ubuntu-22.04`     | amd64        |
| `ubuntu-24.04-arm` | arm64        |

Each matrix job has a limit of 60 minutes. It builds the three images, starts the test stack, and runs the smoke client. The job pushes the images to GHCR only after the smoke test passes.

Each job uploads an artifact with the name `container-ARCH-RUN_ID-ATTEMPT`. The artifact holds the digest report of one architecture.

The job `merge` downloads both reports. It then creates one multi-architecture digest for each service. The final artifact `containers-RUN_ID-ATTEMPT` holds `container-report.json`.

The environment of the jobs is `candidate`.

## Candidate assembly

The job `assemble` waits for the jobs `desktop` and `containers`. It downloads the artifacts of one run ID and one attempt. The script `scripts/release/candidate.mjs` then assembles the candidate. The script verifies these items.

- The version, the commit, the run ID, and the attempt are equal in every report.
- Each desktop target holds the expected installer formats.
- Each `SHA256SUMS` file matches the files in its directory.
- Each container image reference holds a digest.
- The smoke test passed for every image.

The candidate artifact has the name `candidate-RUN_ID-ATTEMPT`. The retention period is 30 days. The candidate holds these files.

| Path                                                       | Content                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `linux-x64/`, `win32-x64/`, `darwin-x64/`, `darwin-arm64/` | Installers, build report, runtime manifest, hashes       |
| `containers/container-report.json`                         | Image digests for three services and two architectures   |
| `deployment/`                                              | `docker-compose.yml`, `nginx.conf`, and `.env.example`   |
| `candidate-index.json`                                     | The identity of the candidate and a SHA256 for each file |
| `acceptance-template.json`                                 | The empty acceptance record                              |

Do not mix artifacts from different attempts. After a failure, use "Re-run all jobs". A re-run of one job only creates a new attempt, and the assembler then rejects the mix.

## Acceptance gate

A person downloads the candidate and tests it. The person then copies `acceptance-template.json` to `docs/release-acceptance/vVERSION.json`. Create the directory on the first record.

The record must contain these values.

- `reviewer`: a non-empty name.
- `reviewedAt`: a date that the parser accepts.
- `checks`: every item has the status `passed` and at least 10 characters of evidence.
- `thirdPartyMaterials`: a public HTTPS address and a SHA256 value.
- `candidateIndexSha256`: the hash of the candidate index.

The acceptance items are these.

| Group               | Items                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Each desktop target | `installation`, `uninstall`, `csp`, `media`, `upgrade`, `process-exit`                    |
| The product         | `third-party-materials`, `historical-data-migration`, `backup-restore`, `known-lint-debt` |

The gate rejects a pending item, an empty evidence field, and a changed candidate. The value `candidateIndexSha256` binds the record to one candidate.

## Publication gate

`release.yml` runs only from the default branch. The job uses the environment `release`.

The job verifies the run and the tag in this order.

1. The run ID is a number.
2. The tag matches the pattern `vMAJOR.MINOR.PATCH`.
3. The current ref is the default branch.
4. The candidate run is a successful run of `gate.yml` in this repository, on the default branch. The script `scripts/release/validate-run.mjs` makes this decision.
5. The commit of the tag equals the head SHA of the candidate run.
6. The head SHA is an ancestor of the current commit.
7. The version is equal in the release files and the tag. The script `scripts/release/check.mjs` makes this decision. The version at the source commit is also equal to the tag.
8. Every acceptance item passed. The script `scripts/release/candidate.mjs approve` makes this decision.
9. A signed build with a verified signature exists for `win32-x64`, `darwin-x64`, and `darwin-arm64`.
10. Every image digest in the report is valid. The script `scripts/release/verify-images.mjs` makes this decision.

The job refuses to replace an existing release. It creates a draft, and a person publishes the draft. The input `publish` can publish the release in the same run.

A tag with a suffix, for example `v0.1.0-rc.1`, creates a prerelease.

## Repository policy

The gate needs five repository settings. The script `scripts/gate/apply-ruleset.mjs` prints the plan. With `--apply`, it writes the settings.

```bash
pnpm gate:policy
pnpm gate:policy --apply
```

| Setting                        | Value                                                    | Reason                                                       |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------ |
| Auto-merge                     | On                                                       | The local gate asks GitHub to merge the pull request.        |
| Merge methods                  | Merge commit only                                        | The job `merged` reads the second parent of the merge commit.|
| Pull request                   | Required for `main`                                      | A direct push to `main` cannot bypass the gate.              |
| Status checks                  | `verify`, from GitHub Actions, and the branch must be current | The gate must pass before the merge.                    |
| Force push and branch deletion | Blocked                                                  | A gated commit cannot leave the history.                     |

The owner needs a `gh` login with admin access. The token of a workflow cannot change a ruleset.

Two items are manual.

1. Register an SSH signing key on each author account. The verifier rejects an unsigned commit.
2. Keep `open-pull-requests-limit` at `0` in `.github/dependabot.yml`. A bot pull request carries no local trailer, and the verifier rejects it. A dependency update arrives through the local gate.

## Security controls

Every workflow limits its permissions. The jobs `verify`, `merged`, and `build` request read access only. The job `tag` adds `contents: write` to push the tag. The release candidate adds `packages: write`. The publish job adds `contents: write` to create the release.

The checkout step of a read-only job does not keep the credentials. Each action step uses a full commit SHA, not a version tag.

A job logs in to GHCR only to push an image or to read a digest. The job logs out at the end.

The release job uses the environment `release`. The container candidate jobs and the unsigned desktop jobs use the environment `candidate`. A protected environment can hold secrets and require an approval.

## Caches

| Cache           | Key parts                                            | Writer                       |
| --------------- | ---------------------------------------------------- | ---------------------------- |
| pnpm store      | Operating system, architecture, lock file            | Every job with `setup-node`  |
| Desktop Next.js | Operating system, target, Node version, lock file    | Default branch only          |
| Rust            | Target, signing mode, compiler, lock file, environment | Default branch only        |
| Docker          | Service and architecture                             | Default branch only          |

The job `build` of `gate.yml` writes the amd64 Docker cache. The release candidate restores that cache and writes the arm64 cache. A pull request writes no cache.

A cold build runs every step. A failed Docker cache export does not fail the build.

## Reproduce the pipeline locally

The push gate reproduces the checks in one command. It writes the trailer and commits the change. The option `--dry-run` changes nothing.

```bash
pnpm gate --dry-run -m "chore: inspect the gate"
```

Run these commands from the repository root. Use them for a diagnosis of one check.

```bash
pnpm install --frozen-lockfile
pnpm release:check
pnpm check-types
pnpm lint:gate
pnpm test:release
pnpm build
```

The container test needs an isolated project. Do not use real data.

```bash
export DBRAIN_ADMIN_EMAIL=ci@dbrain.invalid
export DBRAIN_ADMIN_PASSWORD=ci-operator-password
export DBRAIN_IMAGE_PREFIX=dbrain-ci
export DBRAIN_VERSION=test
export DBRAIN_PORT=13080
docker compose -p dbrain-ci -f docker-compose.yml -f deploy/compose.test.yml up --build --wait
export DBRAIN_SMOKE_SERVER_URL=http://127.0.0.1:13081
export DBRAIN_SMOKE_PB_URL=http://127.0.0.1:13090
export DBRAIN_SMOKE_WEB_URL=http://127.0.0.1:13080
export DBRAIN_SMOKE_ADMIN_EMAIL=ci@dbrain.invalid
export DBRAIN_SMOKE_ADMIN_PASSWORD=ci-operator-password
node scripts/release/server-smoke.mjs
docker compose -p dbrain-ci -f docker-compose.yml -f deploy/compose.test.yml down -v
```

The smoke client needs FFmpeg on the host. The client creates the media fixtures.

The file `deploy/compose.test.yml` is a CI artifact. Do not use it on a host with important data.

## Start a workflow by hand

```bash
gh workflow run gate.yml --ref main -f release=true
gh run list --workflow gate.yml
gh run watch RUN_ID
gh run download RUN_ID --name candidate-RUN_ID-ATTEMPT --dir candidate
gh workflow run release.yml --ref main -f candidate_run_id=RUN_ID -f tag=v0.1.1 -f publish=false
```

## Rules for the pipeline

1. Put reusable logic in `scripts/release/` or `scripts/gate/` and call it from a workflow. Keep a workflow step short.
2. Keep `scripts/release/check-workflows.sh` green. It runs actionlint over every workflow file.
3. Do not change a trigger path without a review. A new path filter changes the jobs of other people.
4. Do not start a publish or a signed build unless the task asks for a release.
5. Update `.github/pull_request_template.md` when a new release gate appears.
6. Keep the check list in `scripts/gate/checks.mjs`. Never add a check to a workflow only. The verifier reads the list at the base commit.
7. Change `scripts/gate/**` with the label `gate-change` and a review. The verifier rejects a change to the judge without one.

## Related manuals

- `docs/development.md` describes the environment, the quality gates, and the maintenance.
- `docs/operations.md` describes the deployment of the images, the backup, and the restore.
- `docs/usage.md` describes the installation, the upgrade, and the desktop data.
- `.github/AGENTS.md` holds the rules for the workflow directory.
