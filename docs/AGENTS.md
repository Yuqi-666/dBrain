# docs/AGENTS.md

Scope: the `docs/` directory, including the `zh/` subtree.
Parent map: [../AGENTS.md](../AGENTS.md).

This directory holds the project manuals.
The root of this tree holds the English manuals.
The `zh/` subtree holds the Chinese version of each manual.
The two trees address three reader groups: the user, the developer, and the operator.

## Map

| Path | Content |
| --- | --- |
| `README.md` | The index of the English tree. |
| `development.md` | Environment, project layout, web and desktop development, quality gates, and maintenance. |
| `operations.md` | Source and image deployment, access configuration, backup and restore, and troubleshooting. |
| `usage.md` | Install, accounts, workspaces, graph, dashboard, and upgrade steps. |
| `ci-cd.md` | The push gate, the trailer, the verifier, the merge gate, the tag, the platform selection, the release candidate, the acceptance gate, the publication gate, the repository policy, and caches. |
| `zh/README.md` | The index of the Chinese tree. |
| `zh/development.md` | The Chinese `development.md`. |
| `zh/operations.md` | The Chinese `operations.md`. |
| `zh/usage.md` | The Chinese `usage.md`. |
| `zh/ci-cd.md` | The Chinese `ci-cd.md`. |

## Conventions

Write new prose in English in this tree and in Chinese in `zh/`. Match the tone of the existing manual.
Keep the two trees in step. Change a manual and its translation in the same pull request.
Keep the code blocks, the numbers, and the links equal in a manual and its translation.
The short sentences and the lists are deliberate. They follow ASD-STE100. Keep them.
Run every command from the repository root, unless a section states another directory.
Treat `RUN_ID`, `ATTEMPT`, `SOURCE_COMMIT`, and `VERSION` as placeholders that the reader replaces.
Read the real variable list from the root `.env.example`, `deploy/.env.example`, and the named script.

Release acceptance uses `docs/release-acceptance/vVERSION.json`.
Create the directory on the first real acceptance record.
The release gate rejects an empty or pending evidence field.
Third-party material needs a public HTTPS address and a SHA256 value.

## Rules

1. Add a new manual to the table in `docs/README.md` and to the table in `docs/zh/README.md` in the same change.
2. Never commit credentials, personal data, or a full production log.
3. Do not add a release report or a verification log to this tree. The release gate reads the acceptance file only.
4. Read old reports from Git history. This tree holds current documents only.
5. Keep a changed behavior and its manual in the same pull request.
