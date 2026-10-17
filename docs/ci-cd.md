# CI/CD and releases

## Ownership and branches

The repository is public source, but development and release decisions belong to the owner. External pull requests are not accepted. GitHub still lets people open a pull request against a public repository; the owner closes unsolicited PRs. Security reports use the private process in [SECURITY.md](../SECURITY.md). Dependency updates are selected and committed by the owner; Dependabot version-update PRs are disabled.

`develop` is the daily development branch. The owner may commit directly to it, or merge an internal `feature/*` or `fix/*` branch into it. Keep Conventional Commits. CI runs on each push to `develop` and `main`, and on same-repository PRs to either branch. Fork PRs do not run the `checks` job. `main` is the promoted release history. Promote `develop` to `main` with an internal PR and a **merge commit** after CI passes; a squash or rebase would remove the tagged commit from `main` history. The owner may create a release tag on `develop` before this promotion. An urgent fix uses a `hotfix/*` branch and the flow in [Patch release](#patch-release-hotfix).

Bootstrap this workflow by merging its files into `main` before pushing the first new version tag. GitHub runs `workflow_run` using the workflow file on the default branch.

## Checks

The `checks` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) is the only check pipeline. The repository keeps no second local gate. It installs from the lockfile, then runs `release:check`, type checking, the lint baseline, release tests, the web/server build, the server smoke test, and actionlint. It uses a read-only token. A push to `develop` does not create a release. A push to `main` does not create a release.

Run the same commands locally before you push. The smoke test needs the built server, so build first. It uses an isolated database and never a live service.

```bash
pnpm install --frozen-lockfile
pnpm release:check
pnpm check-types
pnpm lint:gate
pnpm test:release
pnpm build
pnpm smoke:server
bash scripts/release/check-workflows.sh
```

## Version and candidate

Use semantic versions. `fix` usually advances PATCH, a compatible `feat` advances MINOR, and a breaking change advances MAJOR. In `0.x`, a breaking change may advance MINOR if the release notes say so. Run `pnpm release:version VERSION` on `develop`. It synchronizes `scripts/release/release.json`, the desktop package metadata, the Tauri configuration and lockfile, `docker-compose.yml`, and `deploy/.env.example`. Declare all intended desktop targets and container platforms in `release.json`. Enable the products to ship. Run `pnpm release:check` and the relevant tests.

After the version commit reaches `develop`, create and push `vVERSION` at that commit yourself. Use an annotated tag. Check that the version is newer than every existing version tag. A tag push starts `release-candidate.yml`. That workflow verifies the tag is in `develop` history, builds all declared container platforms and the desktop targets whose signing secrets are present on clean runners, and assembles `candidate-RUN_ID-ATTEMPT`. A manual workflow dispatch from the **tag ref** remains available for a targeted retry; it does not automatically create a draft. Tags cannot be moved or deleted under the tag ruleset.

After a successful tag-triggered candidate run, `release.yml` runs automatically via `workflow_run`. It validates the completed run, tag, version, assets, signatures, and image digests, then creates a **draft** GitHub Release. The draft is not public. It never overwrites an existing release. Candidate container images use digest references until publication.

Promote `develop` to `main` using an internal PR with a merge commit. The tag must remain an ancestor of `main`. Inspect the draft and perform product acceptance. When ready, manually run `release.yml` from `main` with the candidate run ID, tag, and `publish=true`. The protected `release` environment names the owner as reviewer, so publication is a deliberate owner decision. Publication promotes container tags and makes the draft public. No tag push and no merge publishes a release without this manual step.

```bash
pnpm release:version VERSION
pnpm release:check
node scripts/release/assert-next-version.mjs
git add -A && git commit -m "chore(release): vVERSION"
git push origin develop
git tag -a vVERSION -m "dBrain vVERSION"
git push origin vVERSION
# After the candidate succeeds, merge develop into main with a merge commit.
gh run list --workflow release-candidate.yml
gh workflow run release.yml --ref main -f candidate_run_id=RUN_ID -f tag=vVERSION -f publish=true
```

## Patch release (hotfix)

A hotfix ships one urgent fix on top of the current `main`. It is the only flow that does not start from `develop`, and the only flow where the tag is created **after** the first merge.

1. Branch from the latest `main`.
2. Make the smallest fix. Keep it in `develop` as well, or the next promotion drops it.
3. Advance the version by one PATCH with `pnpm release:version VERSION`. A hotfix keeps the platform declaration of `main`; do not re-declare the platforms.
4. Run the full check list above.
5. Commit, push, and open a pull request to **both** `main` and `develop`.
6. Merge the `develop` pull request **before** you tag. `release-candidate.yml` refuses a tag that is not in `develop` history.
7. Tag, then merge the `main` pull request. The candidate needs the tag in `develop`; publication needs it in `main`.

```bash
git fetch origin
git checkout -b hotfix/NAME origin/main
# Make the fix, then advance the version.
pnpm release:version VERSION
pnpm release:check && pnpm check-types && pnpm lint:gate && pnpm test:release && pnpm build && pnpm smoke:server
git add -A && git commit -m "fix(scope): what changed"
git push --set-upstream origin hotfix/NAME
gh pr create --base develop --head hotfix/NAME --title "fix(scope): what changed" --body "What changed and how it was checked."
gh pr create --base main --head hotfix/NAME --title "fix(scope): what changed" --body "What changed and how it was checked."
# Merge the develop pull request first: the tag must be in develop history.
gh pr merge --merge
node scripts/release/assert-next-version.mjs
git tag -a vVERSION -m "dBrain vVERSION"
git push origin vVERSION
# After the candidate succeeds, merge the main pull request and publish.
gh workflow run release.yml --ref main -f candidate_run_id=RUN_ID -f tag=vVERSION -f publish=true
```

The optional deployment updater watches successful tag-triggered candidates when enabled. It may deploy a candidate before `main` promotion, so enable it only on a test host that accepts that timing.

## Repository policy

`pnpm policy --repo Yuqi-666/dBrain` prints the plan. After these workflows are merged and `checks` has appeared on GitHub, the owner runs `pnpm policy --apply --repo Yuqi-666/dBrain`. The script allows only merge commits, deletes a branch after its pull request merges, and keeps the long-lived develop branch; enables Issues; keeps Discussions disabled; sets default `GITHUB_TOKEN` permissions to read-only; and prevents Actions from approving PRs. The `develop` ruleset allows direct owner pushes while blocking force pushes and deletion. The `main` ruleset requires an internal PR, current `checks`, and resolved conversations, and blocks force pushes and deletion. The `v*` tag ruleset blocks tag rewrites and deletion. The script assigns the owner as reviewer of the `release` environment. Keep signing secrets in the unprotected `candidate` environment so tag builds can start automatically; the `release` environment gates only publication. Private vulnerability reporting and Dependabot security alerts/fixes remain enabled.

To include every desktop target, configure `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`, `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_PRIVATE_KEY`, `APPLE_API_KEY`, and `APPLE_API_ISSUER` as `candidate` environment secrets. If a target lacks any required signing secret, that desktop build is skipped and named in the job summary. The other desktop targets and container builds continue. If no product remains, the candidate fails with a clear message. The current repository has no signing secrets, so tag candidates currently contain containers only. `desktopEnabled` stays `true` in `release.json` to keep the declared targets ready for the day the secrets exist.

GitHub rulesets cannot express “only accept PRs from this owner” for a public repository. The owner controls which PRs merge and closes unsolicited PRs. Check for old rulesets whose requirements may still apply; rules are cumulative.

## Safety and repeatability

Actions use pinned commits. Candidate and publication jobs have separate write permissions. Server smoke tests use isolated data. Do not start a publish or a signed build unless the task asks for a release, or the owner asks for it directly. See [Operations](operations.md) for deployment and [Development](development.md) for desktop checks.
