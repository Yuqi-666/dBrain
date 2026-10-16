# CI/CD and releases

## Ownership and branches

The repository is public source, but development and release decisions belong to the owner. External pull requests are not accepted. GitHub still lets people open a pull request against a public repository; the owner closes unsolicited PRs. Security reports use the private process in [SECURITY.md](../SECURITY.md). Dependency updates are selected and committed by the owner; Dependabot version-update PRs are disabled.

`develop` is the daily development branch. The owner may commit directly to it, or merge an internal `feature/*` or `fix/*` branch into it. Keep Conventional Commits. CI runs on each push to `develop` and `main`, and on same-repository PRs to either branch. Fork PRs do not run the `checks` job. `main` is the promoted release history. Promote `develop` to `main` with an internal PR and a **merge commit** after CI passes; a squash or rebase would remove the tagged commit from `main` history. The owner may create a release tag on `develop` before this promotion.

Bootstrap this workflow by merging its files into `main` before pushing the first new version tag. GitHub runs `workflow_run` using the workflow file on the default branch.

The `checks` job installs from the lockfile and runs `release:check`, type checking, the lint baseline, release tests, the web/server build, and actionlint. It uses a read-only token. A push to `develop` does not create a release. A push to `main` does not create a release.

## Version and candidate

Use semantic versions. `fix` usually advances PATCH, a compatible `feat` advances MINOR, and a breaking change advances MAJOR. In `0.x`, a breaking change may advance MINOR if the release notes say so. Run `pnpm release:version VERSION` on `develop` to synchronize `scripts/release/release.json`, desktop package metadata, and Tauri configuration. Declare all intended desktop targets and container platforms in `release.json`. Enable the products to ship. Run `pnpm release:check` and the relevant tests.

After the version commit reaches `develop`, create and push `vVERSION` at that commit yourself. Check that it is newer than every existing version tag. A tag push starts `release-candidate.yml`. That workflow verifies the tag is in `develop` history, builds all declared container platforms and the desktop targets whose signing secrets are present on clean runners, and assembles `candidate-RUN_ID-ATTEMPT`. A manual workflow dispatch from the **tag ref** remains available for a targeted retry; it does not automatically create a draft. Tags cannot be moved or deleted under the tag ruleset.

After a successful tag-triggered candidate run, `release.yml` runs automatically via `workflow_run`. It validates the completed run, tag, version, assets, signatures, and image digests, then creates a **draft** GitHub Release. The draft is not public. It never overwrites an existing release. Candidate container images use digest references until publication.

Promote `develop` to `main` using an internal PR with a merge commit. The tag must remain an ancestor of `main`. Inspect the draft and perform product acceptance. When ready, manually run `release.yml` from `main` with the candidate run ID, tag, and `publish=true`. The protected `release` environment requires the owner's review. Publication promotes container tags and makes the draft public. No tag push or merge publishes a release without this manual step.

```bash
pnpm release:version VERSION
pnpm release:check
node scripts/release/assert-next-version.mjs
git tag vVERSION
git push origin vVERSION
# After the candidate succeeds, merge develop into main with a merge commit.
gh run list --workflow release-candidate.yml
gh workflow run release.yml --ref main -f candidate_run_id=RUN_ID -f tag=vVERSION -f publish=true
```

The optional deployment updater watches successful tag-triggered candidates when enabled. It may deploy a candidate before `main` promotion, so enable it only on a test host that accepts that timing.

## Repository policy

`pnpm gate:policy --repo Yuqi-666/dBrain` prints the plan. After these workflows are merged and `checks` has appeared on GitHub, the owner runs `pnpm gate:policy --apply --repo Yuqi-666/dBrain`. The script configures merge commits and keeps the long-lived develop branch; enables Issues; keeps Discussions disabled; sets default `GITHUB_TOKEN` permissions to read-only; and prevents Actions from approving PRs. The `develop` ruleset allows direct owner pushes while blocking force pushes and deletion. The `main` ruleset requires an internal PR, current `checks`, and resolved conversations, and blocks force pushes and deletion. The `v*` tag ruleset blocks tag rewrites and deletion. The script assigns the owner as reviewer of the `release` environment. Keep signing secrets in the unprotected `candidate` environment so tag builds can start automatically; the `release` environment gates only publication. Private vulnerability reporting and Dependabot security alerts/fixes remain enabled.

To include every desktop target, configure `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`, `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_PRIVATE_KEY`, `APPLE_API_KEY`, and `APPLE_API_ISSUER` as `candidate` environment secrets. If a target lacks any required signing secret, that desktop build is skipped and named in the job summary. The other desktop targets and container builds continue. If no product remains, the candidate fails with a clear message. The current repository has no signing secrets, so tag candidates currently contain containers only.

GitHub rulesets cannot express “only accept PRs from this owner” for a public repository. The owner controls which PRs merge and closes unsolicited PRs. Check for old rulesets whose requirements may still apply; rules are cumulative. The old local gate and pre-push hook are optional legacy tools and are not part of this flow.

## Safety and repeatability

Actions use pinned commits. Candidate and publication jobs have separate write permissions. Server smoke tests use isolated data. See [Operations](operations.md) for deployment and [Development](development.md) for desktop checks.
