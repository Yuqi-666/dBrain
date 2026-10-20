# Operations manual

## Deployment model and accounts

A web deployment has four parts: PocketBase, the Node server, the web app, and the nginx gateway. PocketBase stores the database and the attachments in the `pb_data` volume. Only the gateway publishes a host port, and the default is `127.0.0.1:3000`. The other services stay in the container network.

`DBRAIN_ADMIN_EMAIL` and the password belong to the PocketBase operator superuser. They are not a user login account. The app reads the database with an end-user token. The container creates or updates the operator account from the configuration before the start. To change the password for the long term, change the deployment configuration and restart the service.

## Media runtime dependencies

The server uses FFmpeg for the media functions and yt-dlp for the media import (video and audio). Both are in the server image, so a container deployment needs no extra package. The image installs the current self-contained yt-dlp release binary at `/usr/local/bin/yt-dlp` and checks it during the build, because the extractors of a media site change often.

The server spawns `yt-dlp` from PATH. Set `YT_DLP_PATH` in the environment of the server process to use another binary or an absolute path. In a container deployment, set it in the deployment `.env`; the source Compose file forwards it to the `server` service. A server outside the container, or a custom image, must install yt-dlp (`pipx install yt-dlp` or the package of the distribution) and keep it current. The import also needs outbound network access from the server to the media site.

Development does not use that image. The first `pnpm dev` downloads a current yt-dlp release into `.cache/yt-dlp/`. `YT_DLP_DOWNLOAD_BASE` points that download at a mirror of the release directory. The server container does not read this variable.

## Media import

The server imports a video or an audio track from a pasted site address. It downloads with yt-dlp, stores the source file as a resource, and packages a video as HLS. The saved logins and the temporary downloads need configuration and disk space.

### Import configuration

`DBRAIN_MEDIA_COOKIE_SECRET` encrypts the saved site logins with AES-256-GCM, using a key derived from the value. A deployment must set a long random value and keep it stable: a new value makes every saved login unreadable. Generate it once with `openssl rand -base64 32`. When the value is empty, the server generates a random per-machine secret and persists it at `<repo>/.cache/media-cookie-secret`. A bundled server or a container has no writable repository directory, so it persists the secret in the system temporary directory instead. The server does not refuse to start with an empty value. A deployment must still set the variable: a generated secret belongs to one container, so a restart or a second replica would invalidate the saved logins.

`DBRAIN_MEDIA_IMPORT_DIR` is the root of the import job directories. The default is `<system temp>/dbrain-media-imports`. The source Compose file mounts the named volume `media_imports` at `/var/lib/dbrain/media-imports` and uses that path. Keep the value and the mount equal. A container start without the volume loses an interrupted job that it could resume.

The login method A (read a browser on this machine) is available only when the server runs as a local backend. The server is a local backend when `DBRAIN_LOCAL_MODE` is `1` or `true`, or when `DBRAIN_DESKTOP` is `1` (the desktop app sets it), or when `NODE_ENV` is not `production`. A remote or production deployment leaves `DBRAIN_LOCAL_MODE` and `DBRAIN_DESKTOP` empty and runs with `NODE_ENV=production`, so the login area shows method B only.

### Job lifecycle and limits

The server keeps one directory per import. A `running` job and an `interrupted` job keep the partial download. A `completed` job keeps its result until the client writes it onto the node and confirms it. A failed or a cancelled job is deleted at once. At startup, the server marks every `running` job as `interrupted`, because its process is gone. A sweep runs every hour and deletes `interrupted` and `completed` jobs older than 24 hours, and a directory without a session file.

The server runs at most two imports for one user and four in total. One node runs one import at a time. A request above the limit reports that the server is busy. These limits are not configurable.

Size the import directory for four downloads. Each download is bounded by the category limit (2 GiB for a video and 512 MiB for an audio file by default) and by the user quota. The directory also holds the partial download of an interrupted job for up to 24 hours. The stored resources and the HLS package go to the PocketBase volume, not to this directory.

### Cookies and privacy

A cookies-file login is encrypted before the server stores it. The plaintext exists only while one download or one verification runs, in `<jobDir>/download/cookies.txt` with mode `0600`, and is removed with that directory. The server keeps only the cookies whose domain matches a listed site; it discards every other domain before it stores anything. A browser login stores only the browser name. The API never returns a cookie to a client and never writes one to a log. The `media_site_auths` PocketBase collection is scoped to its owner: every list, view, create, update, and delete requires the record owner.

Back up the secret with the deployment configuration. The saved logins are in the `pb_data` volume and are part of its backup; a restored backup needs the matching secret.

## Build a self-hosted environment from the source

Configure and start the stack in the repository root.

```bash
cp .env.example .env
# Edit .env and set DBRAIN_ADMIN_EMAIL and DBRAIN_ADMIN_PASSWORD
# Keep one private Compose project name in all later commands
docker compose -p dbrain config --quiet
docker compose -p dbrain up --build --wait
docker compose -p dbrain ps
```

Local Docker reuses the layers of the same builder. The GHA cache belongs to the remote workflows, and the local Compose does not download it. This build uses the current source. It is not a published release image. Open `http://localhost:3000` and check the pages, the user login, and the file functions.

## Use a candidate or a release image

For releases after v0.1.3, download `dbrain-deploy-vVERSION.tar.gz` and `SHA256SUMS` from the matching release. Check the archive hash, then extract it into the deployment directory. The archive holds `docker-compose.yml`, `nginx.conf`, `update.sh`, `.env.example`, `compose.release.yml`, and `container-report.json` at its root. Newer archives also include `compose.updater.yml` and `deploy/updater/`. Keep these files together.

v0.1.3 published the same deployment files as separate assets. Download them individually and rename `default.env.example` to `.env.example`. Check the source commit and image digests in the container report.

For a published release, the following manual commands use its fixed digest overlay. Run them in that deployment directory.

```bash
cp .env.example .env
# Set the operator email and password
# For a private GHCR image, log in first: docker login ghcr.io
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml config --quiet
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml pull
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml up --no-build --wait
```

Use the same digest overlay for later Compose commands: `compose.release.yml` for this manual release setup, or `compose.current.yml` after running `update.sh`. Keep the deployment directory and the project name stable. A change creates a new volume by accident. Complete a deployment verification before important data goes on an internal candidate.

## Update with one command

Keep `docker-compose.yml`, `nginx.conf`, `update.sh`, and `.env` in one deployment directory. The candidate contains the first three files. Releases after v0.1.3 put them in the deployment archive. Run the script from that directory. For a private GHCR package, log in to `ghcr.io` first with a token that can read packages.

```bash
sh update.sh candidate-RUN_ID-ATTEMPT
sh update.sh vVERSION
```

The argument selects exactly one tested image set. The script pulls the three images and resolves their registry digests. It stops the stack, copies the complete PocketBase volume to `backups/`, writes `compose.current.yml`, starts the stack, and waits until every service is healthy. PocketBase prepares its migration run directory before opening the database. Keep `compose.current.yml` with the deployment. Use it for later manual Compose commands.

If startup fails, the script leaves the stack stopped and prints the backup location. Restore the matching database backup before you start an older image. An old image alone cannot reverse a migration. The script uses the fixed Compose project `dbrain`.

## Automatic candidate updates

Set `DBRAIN_AUTO_UPDATE=true` in the deployment `.env`, then start the separate updater project from that directory:

```bash
docker compose -f compose.updater.yml up -d --build
docker compose -f compose.updater.yml logs -f updater
```

The updater checks the latest successful tag-triggered `release-candidate.yml` run every 15 seconds. It ignores older run IDs and calls `update.sh` for a new candidate. That script backs up the database and waits until all application services are healthy.

If an update fails, automatic attempts pause and `.auto-update-failed` records the target. Inspect the application and restore the matching backup if needed. Remove that marker only after recovery.

Edit `.env` to set `DBRAIN_AUTO_UPDATE=false` to pause the update checks without restarting the updater. The updater runs in a separate Compose project so application restarts do not stop it. It needs the Docker socket and write access to the deployment directory. Give that access only to a trusted host.

The GitHub API allows 60 requests per hour without authentication. Set `DBRAIN_GITHUB_TOKEN` in `.env` to a GitHub token to raise that limit to 5000. The updater sends a conditional request, so an unchanged result costs no body. After a failed request, it waits for the hourly reset when the remaining quota is almost zero. The interval and the token handling live in the updater image.

Rebuild that container after a change to `deploy/updater/watch.sh`: `docker compose -f compose.updater.yml up -d --build`. Stop it with `docker compose -f compose.updater.yml down`.

The updater calls Compose inside a container that mounts the deployment directory at `/deployment`. Compose resolves a relative path of a Compose file against its project directory. `update.sh` therefore passes the host path of the deployment directory as that project directory, so the `nginx.conf` bind mount stays on the host. It reads the path from the mount table of its own container. Set `DBRAIN_DEPLOYMENT_DIR` in `.env` to an absolute path only when that detection has no answer, for example with a named volume. A project directory inside the container makes the daemon create an empty directory on the host and the gateway then fails to start.

## PocketBase schema updates

`pb/pb_migrations_base/0000000001_base_schema.js` is the genesis schema for a new database. The change directory starts empty. Future scripts there are immutable upgrades for databases created from this baseline. `pb_migrations/` beside the database is the durable run directory. On first start, a new database receives only the base script.

On later starts, PocketBase copies only the changes that are newer than that database's starting point into its run directory. Keep that directory with the database and attachments in every backup. The project does not support a database from before this baseline, and startup refuses it. Preserve a backup if you need to migrate that data separately.

For each future schema change, edit the base script and add a new higher numbered change script. Test both a new database and an upgrade from the previous supported version.

## Environment configuration

| Variable | Purpose |
| --- | --- |
| `DBRAIN_ADMIN_EMAIL` | Required. The operator email address. |
| `DBRAIN_ADMIN_PASSWORD` | The operator password. Do not commit it to Git. |
| `DBRAIN_ADMIN_PASSWORD_FILE` | The password file has priority. The container needs a mount for that file. |
| `DBRAIN_BIND_HOST` | The gateway host address. The default is `127.0.0.1`. |
| `DBRAIN_PORT` | The gateway host port. The default is `3000`. |
| `DBRAIN_AUTO_UPDATE` | `true` enables the separate updater. `false` pauses it. The default is `false`. |
| `DBRAIN_GITHUB_TOKEN` | Optional token for the updater. It raises the GitHub API limit from 60 to 5000 requests per hour. A token for this public repository needs no scope. |
| `DBRAIN_DEPLOYMENT_DIR` | The absolute host path of the deployment directory. It overrides the path that the updater detects. Usually empty. |
| `DBRAIN_PUBLIC_ORIGIN` | Usually empty. Set it to the exact browser origin when a front proxy rewrites the Host header. |
| `YT_DLP_PATH` | Optional. The path or binary name of yt-dlp for the media import. The default is `yt-dlp` from PATH. |
| `YT_DLP_DOWNLOAD_BASE` | Optional. A mirror of the yt-dlp release download directory for the first development download. The server container does not read it. |
| `DBRAIN_MEDIA_COOKIE_SECRET` | Required in a deployment. Encrypts the saved media-site logins. Keep it stable; a new value makes them unreadable. Empty generates a per-machine secret in `<repo>/.cache/media-cookie-secret`, or in the system temporary directory when the repository directory is not writable. |
| `DBRAIN_MEDIA_IMPORT_DIR` | Root directory of the import jobs. The default is `<system temp>/dbrain-media-imports`; the container uses `/var/lib/dbrain/media-imports` on the `media_imports` volume. |
| `DBRAIN_LOCAL_MODE` | `1` or `true` marks the server as a local backend, which offers login method A. Leave it empty on a web deployment. The desktop app sets `DBRAIN_DESKTOP=1` instead; `NODE_ENV` not `production` also counts as local. |
| `DBRAIN_IMAGE_PREFIX` / `DBRAIN_VERSION` | The image name and tag of the source Compose. A release uses the digest overlay. |
| `DBRAIN_STORAGE_USER_QUOTA_BYTES` | Total bytes one user may store. `0` disables the quota. The default is `10737418240` (10 GiB). |
| `DBRAIN_STORAGE_MAX_IMAGE_BYTES` | Largest single image, in bytes. The default is `33554432` (32 MiB). |
| `DBRAIN_STORAGE_MAX_VIDEO_BYTES` | Largest single video, in bytes. The default is `2147483648` (2 GiB). |
| `DBRAIN_STORAGE_MAX_AUDIO_BYTES` | Largest single audio file, in bytes. The default is `536870912` (512 MiB). |
| `DBRAIN_STORAGE_MAX_PDF_BYTES` | Largest single PDF, in bytes. The default is `536870912` (512 MiB). |
| `DBRAIN_STORAGE_MAX_WEBPAGE_BYTES` | Largest single web page, in bytes. The default is `16777216` (16 MiB). |
| `DBRAIN_STORAGE_MAX_OTHER_BYTES` | Largest single file of the other category, in bytes. The default is `268435456` (256 MiB). |

For a password file, add a Compose override that mounts the file into the PocketBase service only. Mount the file read-only at a path in the container, for example `/run/secrets/pb-admin-password`. Set the variable to that container path. A host path alone does not create a mount. Limit the read permission of `.env` and of the password file.

### Storage policy

Seven variables control the storage that a user may occupy. `DBRAIN_STORAGE_USER_QUOTA_BYTES` is one budget per user and covers the whole account, so it also counts the artifacts the server derives from a resource: a PDF cover, an HLS playlist and its segments. Those rows are kept out of the library cards, and deleting the resource deletes them with it, so the bytes the library reports as freed are the bytes the quota charged. The six category variables cap one file each. A category is chosen by the MIME type that the browser reports, then by the file extension: image, video, audio, PDF, web page, and other.

Write the values as whole bytes. There is no unit suffix, so `10737418240` is 10 GiB. An empty or invalid value falls back to the built-in default; a typo never locks the storage. Only `DBRAIN_STORAGE_USER_QUOTA_BYTES` accepts `0`, which disables the total quota. A category cap must be positive. A cap above the upload transport ceiling of 2 GiB has no additional effect, because the transport refuses a bigger file first.

Both the API and PocketBase enforce the values, so `docker-compose.yml` passes them to both services from the same `.env`. The API rejects a large file before it spools the chunks, and the PocketBase hook rejects every write, including the direct browser upload and the server's own derived files. Keep the two copies of the configuration equal; the compose file already does this.

When an existing database first receives the media-library change, the migration records the size of every stored file it can reach in local storage. A deployment whose files live in S3 cannot read them there, so it keeps those old rows at 0 bytes and the quota counts only new files. A size of 0 never blocks a new upload.

The values are read when a service starts. Edit `.env` and restart the stack (recreate the containers with `docker compose up -d`); nothing is written to the database, so this is not a migration. The used bytes are always recomputed from the stored records, and a lower quota takes effect on the next upload. A quota change never deletes existing files. The resource library shows the usage, and deleting a resource there is what frees the bytes; deleting a node does not delete its attachment.

## Select the deployment port

Set the gateway host port in the `.env` file of the deployment directory.

```dotenv
DBRAIN_BIND_HOST=127.0.0.1
DBRAIN_PORT=18080
```

For a source deployment, run `docker compose -p dbrain up --build --wait`. For a manually installed release, run this command. After `update.sh`, replace `compose.release.yml` with `compose.current.yml`.

```bash
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml up --no-build --wait
```

Open `http://127.0.0.1:18080` on the host. A host HTTPS reverse proxy can forward to that address. Run up again after a change to rebuild the port mapping. A restart does not apply a new mapping.

The ports 3001 and 8090 are internal container ports. Do not change them with the host port and do not publish them. The browser uses `/trpc` and `/pb/` on the gateway for the API and the files.

To connect to a host port directly, set `DBRAIN_BIND_HOST` to a named interface or to `0.0.0.0` under your network policy. The default loopback serves a proxy on the same host. A shell variable of the same name has priority over `.env`. If a port is in use, change `DBRAIN_PORT` and run up again. Use a different project name and different ports for a separate instance. Check the data volume of each instance.

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

For a deployment managed by `update.sh`, add `-f docker-compose.yml -f compose.current.yml` to these commands. For a manually installed release, use `compose.release.yml` as the second file. The same configuration must apply. The health endpoint shows only that the service is reachable. Check the login, the workspace, the attachments, and the media too.

| Symptom | First check |
| --- | --- |
| Compose does not render | The `.env` file exists and the configuration holds the operator email. |
| PocketBase restarts in a loop | The password, the mount of the password file and its permission, the volume permission, the start log. |
| A page opens but loads without an end, or the API returns 403 | The proxy Host, the Origin, the WebSocket forwarding, and `DBRAIN_PUBLIC_ORIGIN`. |
| pull reports a permission error | The private GHCR login and the package read permission. |
| The upgrade looks like a new installation | The project name, the deployment directory, and the real `pb_data` volume. |
| An automatic update stops the gateway | The project directory of the updater and a stray `/deployment` path on the host. |
| A video or a PDF fails | The related backend log, the attachment access permission, and the runtime dependencies. |
| A media import fails | The backend log; yt-dlp is installed and current; the site is supported; the server can reach the site; the storage quota has room. |
| A media import asks for a login, or reports a login error | The site capsule; connect the site with method B, or with method A in the desktop app; then parse the address again. |
| A media import reports that the server is busy | Two imports already run for this user, or four on the server. Wait for one import to finish. |
| A media import reports a size or quota error | The category limit and the owner quota. Select a lower quality, or delete resources. |
| A saved site login stopped working | The cookie expired, `DBRAIN_MEDIA_COOKIE_SECRET` changed, or the server used a generated secret before a restart. Set a stable secret, then connect the site again. |
| The import directory fills the disk | The space of `DBRAIN_MEDIA_IMPORT_DIR`. Four downloads can run at once, and an interrupted job stays 24 hours. |

Logs can contain business information. Remove private data before you share a log. Point the admin CLI at the data directory, `/pb_data` in the container. A wrong directory creates an empty database by accident.

## Backup and restore

Stop the writes first, then stop the full service group. Back up the complete `pb_data` volume in the stopped state. The volume holds the SQLite database and the attachments. Record the real volume name.

Keep the deployment configuration of the same version, the image digests, and the secret configuration. Limit the access to the backup. Check a restore regularly.

The next example backs up the files of a source deployment. For an image deployment, add `-f docker-compose.yml` and the matching digest overlay to every Compose command.

```bash
docker compose -p dbrain stop
backup_dir="backups/pb-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
pb_container=$(docker compose -p dbrain ps -aq pocketbase)
test -n "$pb_container"
docker cp "$pb_container:/pb_data/." "$backup_dir/"
# Check the copy, the database, and the attachments. Save the deployment configuration, then start the stack.
docker compose -p dbrain start
```

The directory name uses UTC time. Do not put a backup in Git. Move the copy to a backup storage with limited access.

Before a restore, check the source volume, the target volume, and the backup version. Restore the complete backup to a dedicated target volume in the stopped state. Do not mix an old backup with a directory that holds newer data. Do not run `down -v`. That command removes the data volume.

The upgrade sequence has six steps.

1. Stop the writes.
2. Make a full backup.
3. Test the migration and the permissions of the new version on an isolated copy.
4. Switch to the new release overlay.
5. Start the stack and check the users, the attachments, and the media.
6. Restore the traffic.

A rollback needs the old data and the old image digest. An old image alone does not undo a database migration. Run a restore test with a separate project and volume. Operate on the production data after the test checks the data and the attachments.

For the backup and the restore of the desktop personal data, see the [usage manual](usage.md). For the release and the acceptance process, see the [CI/CD pipeline](ci-cd.md).
