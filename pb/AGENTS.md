# pb/AGENTS.md

Scope: the `pb/` directory.
Parent map: [../AGENTS.md](../AGENTS.md).

This directory holds the PocketBase server for development and for the container image.
PocketBase stores records, files, and user identity.
It is the only data store in the project.

## Map

| Path | Content | Tracked in Git |
| --- | --- | --- |
| `pb_hooks/` | JavaScript hooks for edge and file requests | Yes |
| `pb_migrations_base/` | Complete schema for a new database | Yes |
| `pb_migrations_changes/` | Immutable incremental migrations for existing databases | Yes |
| `pb_data/pb_migrations/` | Default local run directory prepared before PocketBase starts | No |
| `pb_data/` | The local database, attachments, and generated types | No |

`pb_data/` holds live local state.
It also holds `.superuser-credentials.txt`.
Never commit, print, or copy that file.

## Mechanisms

`pb_hooks/edges.pb.js` calls `pb_hooks/lib/edge.js`.
It rejects an edge when the endpoints or the semantic link belong to another workspace.

`pb_hooks/files.pb.js` calls `pb_hooks/lib/storage-limits.js` for every create request.
The module sets the file owner from the authenticated user, enforces the per-category file ceiling and the per-user storage quota, and stamps the `size`, `mimeType`, and default `displayName` that the resource library reads.
The same file authorizes a download for the file owner, the workspace owner, or a workspace member.
It also accepts a `pb_token` cookie, because media elements cannot send an authorization header.

`0000000001_base_schema.js` is the genesis migration. Future changes use higher numbers and are immutable after release; `0000000003_media_library.js` adds the media metadata fields, the owner update rule, and the size backfill.
Databases created before this baseline are unsupported. The launcher refuses them instead of silently skipping schema work.
The `files.file` cap is 2 GiB, which must stay equal to `MAX_UPLOAD_BYTES` in `packages/utils/src/upload.ts`.

The development launcher `scripts/dev-pocketbase.mjs` prepares the run directory inside the selected data directory before creating the operator account.
It passes `--dir`, `--migrationsDir`, and `--hooksDir`, and it sets `--automigrate=0`.
The working directory of the shell therefore does not change the target database.

## Rules

1. Never edit an applied change migration. For each schema change, update the base script and add one new change script with a higher timestamp.
2. Test an upgrade against a copy of old data before you release the new migration.
3. Write a hook change in `pb_hooks/` and test it with `scripts/release/edge-hook.test.mjs`.
4. Keep the collection rules in the migration. Do not change rules by hand in the admin UI.
5. Remember that ESLint ignores `pb/`. A hook change needs a manual review.
