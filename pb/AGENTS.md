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
| `pb_migrations/` | Schema and API-rule migrations | Yes |
| `pb_data/` | The local database, attachments, and generated types | No |

`pb_data/` holds live local state.
It also holds `.superuser-credentials.txt`.
Never commit, print, or copy that file.

## Mechanisms

`pb_hooks/edges.pb.js` calls `pb_hooks/lib/edge.js`.
It rejects an edge when the endpoints or the semantic link belong to another workspace.

`pb_hooks/files.pb.js` sets the file owner from the authenticated user.
It authorizes a download for the file owner, the workspace owner, or a workspace member.
It also accepts a `pb_token` cookie, because media elements cannot send an authorization header.

The two migrations are `1700000000_initial_schema.js` and `1800000000_release_access.js`.
The second migration tightens the collection API rules.
Its downgrade path throws an error, because the change needs a restored backup.

The development launcher `scripts/dev-pocketbase.mjs` pins the directories.
It passes `--dir`, `--migrationsDir`, and `--hooksDir`, and it sets `--automigrate=0`.
The working directory of the shell therefore does not change the target database.

## Rules

1. Never edit an applied migration. Add a new migration with a higher timestamp instead.
2. Test an upgrade against a copy of old data before you release the new migration.
3. Write a hook change in `pb_hooks/` and test it with `scripts/release/edge-hook.test.mjs`.
4. Keep the collection rules in the migration. Do not change rules by hand in the admin UI.
5. Remember that ESLint ignores `pb/`. A hook change needs a manual review.
