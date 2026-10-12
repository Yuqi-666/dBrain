# .github/AGENTS.md

Scope: the `.github/` directory.
Parent map: [../AGENTS.md](../AGENTS.md).

This directory holds the CI and release workflows.
The workflows call the scripts in `scripts/release/`.

## Map

| Workflow | Trigger | Product |
| --- | --- | --- |
| `workflows/ci.yml` | Pull request to `main` or `develop`, push to `main`, or manual start | Checks, server smoke test, and container smoke test |
| `workflows/container-build.yml` | Call from another workflow | Multi-architecture images in GHCR and a digest report |
| `workflows/desktop-build.yml` | Manual start or call | Desktop installers for four targets and their hashes |
| `workflows/release-candidate.yml` | Manual start | One candidate that joins the checks with the desktop and container builds |
| `workflows/release.yml` | Manual start | A draft GitHub release from an accepted candidate |

`ci.yml` selects its jobs from the changed paths.
The script `scripts/release/ci-scope.mjs` makes that selection.
A documentation-only change therefore skips the container build.

The release flow has three stages.
`release-candidate.yml` calls the other three workflows and assembles a candidate.
`release.yml` reads a candidate run, compares the tag with the version, and creates a draft release.
A person publishes the draft.

## Auxiliary files

`pull_request_template.md` asks for the problem, the result, the verification, and the release impact.
`ISSUE_TEMPLATE/bug_report.yml` asks for the version, the commit, the platform, and the reproduction steps.
`dependabot.yml` covers npm, Cargo, and GitHub Actions. The pull-request limit is zero during the first release.

## Rules

1. Put reusable logic in `scripts/release/` and call it from the workflow. Keep a workflow step short.
2. Keep `release/check-workflows.sh` green. It runs actionlint over every workflow file.
3. Preserve the existing trigger paths. A new path filter changes which jobs run for other people.
4. Do not start a publish or a signed build unless the task asks for a release.
5. Update `pull_request_template.md` when a new release gate appears.
