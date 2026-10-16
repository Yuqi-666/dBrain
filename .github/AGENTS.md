# .github/AGENTS.md

Scope: `.github/`. Parent: [AGENTS.md](../AGENTS.md).

`ci.yml` checks pushes to develop/main and same-repository PRs with a read-only token. Its `checks` job is required for promotion to main. Fork PRs are not accepted and do not run checks. `release-candidate.yml` builds declared containers and desktop targets with available signing secrets on a version tag push from develop. A successful tag candidate triggers `release.yml` to create a draft. Publishing the draft requires a manual run from main and approval in the `release` environment. `desktop-build.yml` and `container-build.yml` are reusable build workflows.

Keep action references pinned to full commits. Run `bash scripts/release/check-workflows.sh` after workflow edits. Keep `scripts/gate/apply-ruleset.mjs` and `docs/ci-cd.md` in sync. Do not start a publish or signed build unless the task asks for a release. Signing secrets belong in the `candidate` environment so tag-triggered builds can run automatically. The `release` environment gates publication.
