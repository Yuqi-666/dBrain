# Operations manual

## Deployment model and accounts

A web deployment has four parts: PocketBase, the Node server, the web app, and the nginx gateway. PocketBase stores the database and the attachments in the `pb_data` volume. Only the gateway publishes a host port, and the default is `127.0.0.1:3000`. The other services stay in the container network.

`DBRAIN_ADMIN_EMAIL` and the password belong to the PocketBase operator superuser. They are not a user login account. The app reads the database with an end-user token. The container creates or updates the operator account from the configuration before the start. To change the password for the long term, change the deployment configuration and restart the service.

## Build an internal test environment from the source

Configure and start the stack in the repository root.

```bash
cp .env.example .env
# Edit .env and set DBRAIN_ADMIN_EMAIL and DBRAIN_ADMIN_PASSWORD
# Keep one private Compose project name in all later commands
docker compose -p dbrain config --quiet
docker compose -p dbrain up --build --wait
docker compose -p dbrain ps
```

Local Docker reuses the layers of the same builder. The GHA cache belongs to the remote workflows, and the local Compose does not download it. This build uses the current source. It is not an accepted release image. Open `http://localhost:3000` and verify the pages, the user login, and the file functions.

## Use a candidate or a release image

Get the deployment directory from the matching candidate or release. Keep these files in the same directory: `docker-compose.yml`, `compose.release.yml`, `nginx.conf`, and `.env.example`. **The candidate assembly creates `compose.release.yml`. The file does not exist in the `deploy` directory.** Verify the source commit, the `SHA256SUMS` file, and the digests in the container report.

Run these commands in that deployment directory.

```bash
cp .env.example .env
# Set the operator email and password
# For a private GHCR image, log in first: docker login ghcr.io
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml config --quiet
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml pull
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml up --no-build --wait
```

Add the release overlay to every pull and up command. The overlay pins the verified image digests. Do not rely on a mutable version tag only. Keep the deployment directory and the project name stable. A change creates a new volume by accident. No public release exists at this time. Complete a deployment verification before important data goes on an internal candidate.

## Environment configuration

| Variable | Purpose |
| --- | --- |
| `DBRAIN_ADMIN_EMAIL` | Required. The operator email address. |
| `DBRAIN_ADMIN_PASSWORD` | The operator password. Do not commit it to Git. |
| `DBRAIN_ADMIN_PASSWORD_FILE` | The password file has priority. The container needs a mount for that file. |
| `DBRAIN_BIND_HOST` | The gateway host address. The default is `127.0.0.1`. |
| `DBRAIN_PORT` | The gateway host port. The default is `3000`. |
| `DBRAIN_PUBLIC_ORIGIN` | Usually empty. Set it to the exact browser origin when a front proxy rewrites the Host header. |
| `DBRAIN_IMAGE_PREFIX` / `DBRAIN_VERSION` | The image name and tag of the source Compose. A release uses the digest overlay. |

For a password file, add a Compose override that mounts the file into the PocketBase service only. Mount the file read-only at a path in the container, for example `/run/secrets/pb-admin-password`. Set the variable to that container path. A host path alone does not create a mount. Limit the read permission of `.env` and of the password file.

## Select the deployment port

Set the gateway host port in the `.env` file of the deployment directory.

```dotenv
DBRAIN_BIND_HOST=127.0.0.1
DBRAIN_PORT=18080
```

For a source deployment, run `docker compose -p dbrain up --build --wait`. For a release deployment, run this command.

```bash
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml up --no-build --wait
```

Open `http://127.0.0.1:18080` on the host. A host HTTPS reverse proxy can forward to that address. Run up again after a change to rebuild the port mapping. A restart does not apply a new mapping. The ports 3001 and 8090 are internal container ports. Do not change them with the host port and do not publish them. The browser uses `/trpc` and `/pb/` on the gateway for the API and the files.

To connect to a host port directly, set `DBRAIN_BIND_HOST` to a named interface or to `0.0.0.0` under your network policy. The default loopback serves a proxy on the same host. A shell variable of the same name has priority over `.env`. If a port is in use, change `DBRAIN_PORT` and run up again. Use a different project name and different ports for a separate instance. Verify the data volume of each instance.

## External access and HTTPS

Deploy a TLS reverse proxy on the host or at a controlled entry point. Forward the traffic to the gateway. Keep the original Host header. Support WebSocket. Set the upload limit from the real attachment size. The gateway listens on loopback only, so a remote browser cannot reach it directly.

Set `DBRAIN_PUBLIC_ORIGIN` only when a proxy rewrites the Host header. Use the exact browser origin, for example `https://dbrain.example.com`, with the scheme and a non-default port. Do not add a trailing slash. The value is an exact replacement rule. A wrong value fails the origin verification of the API and the WebSocket. The workspace then loads without an end.

Do not publish the PocketBase admin interface to the internet. For temporary admin access, add an override that maps 8090 to a host loopback address. Use an SSH tunnel. Remove the port mapping after the operation.

## Daily observation and troubleshooting

```bash
docker compose -p dbrain ps
docker compose -p dbrain logs --tail=100 pocketbase server web gateway
curl -fsS http://127.0.0.1:3000/health
```

Add the two `-f` arguments to these commands in a release deployment. The same configuration must apply. The health endpoint shows only that the service is reachable. Verify the login, the workspace, the attachments, and the media too.

| Symptom | First verify |
| --- | --- |
| Compose does not render | The `.env` file exists and the configuration holds the operator email. |
| PocketBase restarts in a loop | The password, the mount of the password file and its permission, the volume permission, the start log. |
| A page opens but loads without an end, or the API returns 403 | The proxy Host, the Origin, the WebSocket forwarding, and `DBRAIN_PUBLIC_ORIGIN`. |
| pull reports a permission error | The private GHCR login and the package read permission. |
| The upgrade looks like a new installation | The project name, the deployment directory, and the real `pb_data` volume. |
| A video or a PDF fails | The related backend log, the attachment access permission, and the runtime dependencies. |

Logs can contain business information. Remove private data before you share a log. The admin CLI needs the correct data directory, `/pb_data` in the container. A wrong directory creates an empty database by accident.

## Backup and restore

Stop the writes first, then stop the full service group. Back up the complete `pb_data` volume in the stopped state. The volume holds the SQLite database and the attachments. Record the real volume name. Keep the deployment configuration of the same version, the image digests, and the secret configuration. Limit the access to the backup. Verify a restore regularly.

The next example backs up the files of a source deployment. Add the two `-f` arguments to every Compose command in a release deployment.

```bash
docker compose -p dbrain stop
backup_dir="backups/pb-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
pb_container=$(docker compose -p dbrain ps -aq pocketbase)
test -n "$pb_container"
docker cp "$pb_container:/pb_data/." "$backup_dir/"
# Verify the copy, the database, and the attachments. Save the deployment configuration, then start the stack.
docker compose -p dbrain start
```

The directory name uses UTC time. Do not put a backup in Git. Move the copy to a backup storage with limited access. Before a restore, verify the source volume, the target volume, and the backup version. Restore the complete backup to a dedicated target volume in the stopped state. Do not mix an old backup with a directory that holds newer data. Do not run `down -v`. That command removes the data volume.

The upgrade sequence has six steps.

1. Stop the writes.
2. Make a full backup.
3. Test the migration and the permissions of the new version on an isolated copy.
4. Switch to the new release overlay.
5. Start the stack and verify the users, the attachments, and the media.
6. Restore the traffic.

A rollback needs the old data and the old image digest. An old image alone does not undo a database migration. Run a restore test with a separate project and volume. Operate on the production data after the test verifies the data and the attachments.

For the backup and the restore of the desktop personal data, see the [usage manual](usage.md). For the release and the acceptance process, see the [CI/CD pipeline](ci-cd.md).
