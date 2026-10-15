# .github/AGENTS.md

Scope: the `.github/` directory.
Parent map: [../AGENTS.md](../AGENTS.md).

This directory holds the CI and release workflows.
The workflows call the scripts in `scripts/release/` and `scripts/gate/`.

## Map

| Workflow | Trigger | Product |
| --- | --- | --- |
| `workflows/gate.yml` | A pull request or push to `main` or `develop`, or a manual start | The gate verdict, main tag, and main candidate |
| `workflows/release-candidate.yml` | A call from `gate.yml`, or a manual start | The products of the declared platforms, and one candidate |
| `workflows/container-build.yml` | A call from another workflow | Images in GHCR for the declared platforms and a digest report |
| `workflows/desktop-build.yml` | A call from another workflow, or a manual start | Desktop installers for the declared targets and their hashes |
| `workflows/release.yml` | Manual start | A draft GitHub release from an accepted candidate |

`gate.yml` holds the whole push gate.

| Job | Function |
| --- | --- |
| `verify` | Reads the trailer of a pull request head. It runs on a pull request. |
| `merged` | Reads the parents of a merge commit on `main` or `develop`. |
| `tag` | Creates or verifies the version tag on every main push. |
| `release` | Calls `release-candidate.yml` on every main push. |

The jobs `verify` and `merged` copy the verifier from a trusted commit and run the copy.
During the first develop bootstrap, they use the protected main commit if develop has no verifier.
They fail when neither trusted source has one. A change cannot weaken its own judge.

`release-candidate.yml` is a reusable workflow now. The job `release` of `gate.yml`
calls it. The job `verify-tag` reads the platforms from `scripts/release/release.json`
at that tag. A manual start repeats a failed platform build for an existing tag, and
it may narrow the declaration of that file.

`release.yml` reads a Gate run, compares the tag with the version, and creates a draft release.
A person publishes the draft.
After container candidates pass, `release-candidate.yml` runs `deploy/update.sh` over SSH for registered production targets. `release.yml` tags accepted images when a release is published.

A pull request builds no product. The release candidate is the only clean-machine build.

## Auxiliary files

`pull_request_template.md` asks for the problem, the result, the verification, and the release impact.
`ISSUE_TEMPLATE/bug_report.yml` asks for the version, the commit, the platform, and the reproduction steps.
`dependabot.yml` covers npm, Cargo, and GitHub Actions. The pull-request limit stays at zero. A bot pull request carries no gate trailer, so a dependency update arrives through the local gate.

## Rules

1. Put reusable logic in `scripts/release/` or `scripts/gate/` and call it from the workflow. Keep a workflow step short.
2. Keep `release/check-workflows.sh` green. It runs actionlint over every workflow file.
3. Do not add a job that runs the quality checks again. The local gate owns them. Read `docs/ci-cd.md`.
4. Do not start a publish or a signed build unless the task asks for a release.
5. Update `pull_request_template.md` when a new release gate appears.
6. Keep the check list in `scripts/gate/checks.mjs`. A new check belongs there first. The verifier reads the list at the base commit.
7. Read the verifier inputs from a trusted commit in `gate.yml`. A step that reads the head copy lets a change weaken its own judge.
8. Keep the name of the job `verify`. The branch ruleset requires that status check.
9. Keep the branch ruleset and the repository settings in `scripts/gate/apply-ruleset.mjs`. Do not change them in the GitHub interface only.
10. Declare the platforms of a release in `scripts/release/release.json`. The runner table in `scripts/release/platforms.mjs` holds every name that exists. A start may narrow the declaration and cannot extend it.
