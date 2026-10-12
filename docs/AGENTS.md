# docs/AGENTS.md

Scope: the `docs/` directory.
Parent map: [../AGENTS.md](../AGENTS.md).

This directory holds the project manuals.
The manuals are in Chinese and address three reader groups: users, developers, and operators.

## Map

| Document | Content |
| --- | --- |
| `README.md` | The index of this directory. |
| `usage.md` | Install, accounts, workspaces, graph, dashboard, and upgrade steps. |
| `development.md` | Environment, project structure, web and desktop development, checks, and maintenance. |
| `operations.md` | Source and image deployment, access configuration, backup and restore, and troubleshooting. |
| `release-workflow.md` | CI scope, per-platform diagnostics, the unified candidate, signing, and publication. |
| `release-readiness.md` | The verified boundary and the open items before a public release. |
| `pocketbase-connections.md` | Connection entry points, identity, and the file path for each client. |

## Conventions

Write new prose in Chinese. Match the tone of the existing manual.
Run every command from the repository root, unless a section states another directory.
Treat `RUN_ID`, `ATTEMPT`, `SOURCE_COMMIT`, and `VERSION` as placeholders that the reader replaces.
Read the real variable list from the root `.env.example`, `deploy/.env.example`, and the named script.

Release acceptance uses `docs/release-acceptance/vVERSION.json`.
Create the directory on the first real acceptance record.
The release gate rejects an empty or pending evidence field.
Third-party material needs a public HTTPS address and a SHA256 value.

## Rules

1. Add a new manual to the table in `docs/README.md` in the same change.
2. Never commit credentials, personal data, or a full production log.
3. Do not add a release report or a verification log to this tree. The release gate reads the acceptance file only.
4. Read old reports from Git history. This tree holds current documents only.
5. Keep a changed behavior and its manual in the same pull request.
