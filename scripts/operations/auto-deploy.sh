#!/usr/bin/env bash
# Trusted host-side supervisor. Never run deployment scripts from the fetched tree.
set -Eeuo pipefail
umask 077
config=${DBRAIN_AUTO_DEPLOY_CONFIG:-/etc/dbrain/auto-deploy.env}
source "$config"
: "${DEPLOY_ROOT:?}" "${STATE_ROOT:?}" "${REPOSITORY:?}" "${PUBLIC_ORIGIN:?}"
mkdir -p "$STATE_ROOT"
exec 9>"$STATE_ROOT/deploy.lock"
flock -n 9 || exit 0
if [[ -f "$STATE_ROOT/HALTED" ]]; then
  echo "HALTED: rollback needs operator recovery; see journal and backups" >&2
  exit 1
fi
export GIT_TERMINAL_PROMPT=0
export HTTPS_PROXY=${GIT_PROXY:-}
export HTTP_PROXY=${GIT_PROXY:-}
git_command() { timeout 120 git -c credential.helper=store "$@"; }
docker_command() { sudo -n docker "$@"; }
mirror="$STATE_ROOT/repository.git"
if [[ ! -d "$mirror" ]]; then
  git init --bare "$mirror"
  git --git-dir="$mirror" remote add origin "$REPOSITORY"
fi
git_command --git-dir="$mirror" fetch --quiet origin +refs/heads/main:refs/heads/main
commit=$(git --git-dir="$mirror" rev-parse refs/heads/main)
old=$(cat "$DEPLOY_ROOT/DEPLOYED_COMMIT")
if [[ "$commit" == "$old" ]]; then
  if [[ -f "$STATE_ROOT/needs-ingress" ]]; then
    (cd "$DEPLOY_ROOT" && docker_command compose -p dbrain -f docker-compose.yml -f compose.host.yml up -d --no-build --wait --wait-timeout 180 gateway)
    docker_command exec dbrain-gateway-1 nginx -t
    docker_command exec dbrain-gateway-1 nginx -s reload
    curl --fail --silent --show-error --max-time 20 "$PUBLIC_ORIGIN/health" >/dev/null
    rm -f "$STATE_ROOT/needs-ingress"
    echo "INGRESS_RECOVERED $commit"
  fi
  echo "UNCHANGED main=$commit"
  exit 0
fi
if [[ -f "$STATE_ROOT/failed-commit" && "$(cat "$STATE_ROOT/failed-commit")" == "$commit" ]]; then
  echo "BLOCKED failed candidate=$commit; push a fix or remove failed-commit to retry"
  exit 0
fi
mark_failure() {
  printf '%s\n' "$commit" > "$STATE_ROOT/failed-commit"
}
trap 'result=$?; if (( result )); then mark_failure; fi; exit "$result"' EXIT
[[ "$commit" =~ ^[0-9a-f]{40}$ ]] && [[ "$old" =~ ^[0-9a-f]{40}$ ]]
# Refuse automatic force-push/downgrade deployment.
git --git-dir="$mirror" merge-base --is-ancestor "$old" "$commit"
for protected in .env .pb-admin-password compose.host.yml OPERATIONS.local.md DEPLOYED_COMMIT DEPLOYMENT_IMAGES.txt backups; do
  if [[ -n "$(git --git-dir="$mirror" ls-tree --name-only "$commit" -- "$protected")" ]]; then
    echo "Refusing source that overwrites host-owned path: $protected" >&2
    exit 1
  fi
done
tag="auto-$commit"
source_dir="$STATE_ROOT/build-$commit"
mkdir -p "$source_dir"
git --git-dir="$mirror" archive "$commit" | tar -xf - -C "$source_dir"
echo "BUILD old=$old candidate=$commit"
for service in pocketbase server web; do
  case "$service" in
    pocketbase) dockerfile=deploy/pocketbase/Dockerfile ;;
    server) dockerfile=apps/server/Dockerfile ;;
    web) dockerfile=apps/web/Dockerfile ;;
  esac
  timeout --kill-after=30 1800 sudo -n docker build \
    -f "$source_dir/$dockerfile" -t "dbrain-local-$service:$tag" "$source_dir"
done
git_command --git-dir="$mirror" fetch --quiet origin +refs/heads/main:refs/heads/main
if [[ "$(git --git-dir="$mirror" rev-parse refs/heads/main)" != "$commit" ]]; then
  rm -rf -- "$source_dir"
  echo "SUPERSEDED $commit; next run will build latest main"
  exit 0
fi
cd "$DEPLOY_ROOT"
backup="$DEPLOY_ROOT/backups/auto-$(date -u +%Y%m%dT%H%M%SZ)-${commit:0:12}"
mkdir -p "$backup"
cp compose.host.yml docker-compose.yml DEPLOYED_COMMIT DEPLOYMENT_IMAGES.txt "$backup/"
# The archive is only source. Credentials, data and host configuration stay local.
git --git-dir="$mirror" archive "$old" > "$backup/source-before.tar"
volume=$(docker_command inspect dbrain-pocketbase-1 --format '{{range .Mounts}}{{if eq .Destination "/pb_data"}}{{.Name}}{{end}}{{end}}')
[[ -n "$volume" ]]
# Fail before downtime if the rollback images or Docker copy operations are unavailable.
for service in pocketbase server web; do
  docker_command inspect "dbrain-$service-1" --format '{{.Image}}'
done > "$backup/old-images.txt"
compose() { docker_command compose -p dbrain -f docker-compose.yml -f compose.host.yml "$@"; }
switching=0
stopped=0
apply_source() {
  # Remove files deleted by the new commit; never delete host secrets/backups.
  while IFS= read -r -d '' path; do
    rm -f -- "$DEPLOY_ROOT/$path"
  done < <(git --git-dir="$mirror" diff --name-only --diff-filter=D -z "$1" "$2")
  git --git-dir="$mirror" archive "$2" | tar -xf - -C "$DEPLOY_ROOT"
}
rollback() {
  echo "ROLLBACK candidate=$commit restoring=$old"
  compose stop || return 1
  # The old image is available locally and is only used to mount the stopped volume.
  rollback_image=$(head -1 "$backup/old-images.txt")
  docker_command run --rm --network none --user 0 --entrypoint sh \
    -v "$volume:/pb_data" -v "$backup/data:/restore:ro" "$rollback_image" \
    -c 'set -e; find /pb_data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; cp -a /restore/. /pb_data/' || return 1
  apply_source "$commit" "$old" || return 1
  cp "$backup/compose.host.yml" "$backup/docker-compose.yml" "$backup/DEPLOYED_COMMIT" "$backup/DEPLOYMENT_IMAGES.txt" "$DEPLOY_ROOT/" || return 1
  compose up -d --no-build --wait --wait-timeout 180 || return 1
  docker_command exec dbrain-gateway-1 nginx -t || return 1
  docker_command exec dbrain-gateway-1 nginx -s reload || return 1
  echo "ROLLBACK_COMPLETE $old"
}
finish() {
  result=$?
  trap - EXIT
  if (( switching )); then
    if ! rollback; then
      touch "$STATE_ROOT/HALTED"
      mark_failure
      echo "ROLLBACK_FAILED backup=$backup" >&2
      exit 1
    fi
  elif (( stopped )); then
    compose up -d --no-build --wait --wait-timeout 180 || exit 1
  fi
  if (( result )); then mark_failure; fi
  exit "$result"
}
trap finish EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
# Block public writes before making a consistent database+attachments snapshot.
stopped=1
compose stop
# If backup fails, restart the old services; no source or database was changed.
if ! docker_command cp dbrain-pocketbase-1:/pb_data/. "$backup/data"; then
  compose up -d --no-build --wait --wait-timeout 180
  stopped=0
  exit 1
fi
switching=1
apply_source "$old" "$commit"
cat > compose.host.yml <<COMPOSE
services:
  pocketbase:
    image: dbrain-local-pocketbase:$tag
    volumes:
      - ./.pb-admin-password:/run/secrets/pb-admin-password:ro
  server:
    image: dbrain-local-server:$tag
  web:
    image: dbrain-local-web:$tag
COMPOSE
# Keep ingress stopped until all app services pass health checks.
compose up -d --no-build --wait --wait-timeout 180 pocketbase server web
new_volume=$(docker_command inspect dbrain-pocketbase-1 --format '{{range .Mounts}}{{if eq .Destination "/pb_data"}}{{.Name}}{{end}}{{end}}')
[[ "$new_volume" == "$volume" ]]
# Probe the private service network before allowing public traffic.
docker_command run --rm --network dbrain_frontend --entrypoint node \
  "dbrain-local-server:$tag" --input-type=module -e '
for (const url of ["http://server:3001/health", "http://web:3000/", "http://web:3000/login"]) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw Error("Deployment probe failed: " + url + " " + r.status);
}'
# No destructive DB rollback after ingress opens: real user writes may have resumed.
switching=0
stopped=0
touch "$STATE_ROOT/needs-ingress"
printf '%s\n' "$commit" > DEPLOYED_COMMIT.tmp
mv DEPLOYED_COMMIT.tmp DEPLOYED_COMMIT
docker_command inspect dbrain-pocketbase-1 dbrain-server-1 dbrain-web-1 dbrain-gateway-1 \
  --format '{{.Name}} {{.Config.Image}} {{.Image}} {{if .State.Health}}{{.State.Health.Status}}{{end}} {{.HostConfig.RestartPolicy.Name}}' > DEPLOYMENT_IMAGES.txt
printf '\nAuto-deployed %s UTC: %s; backup: %s\n' "$(date -u +%FT%TZ)" "$commit" "$backup" >> OPERATIONS.local.md
printf '%s\n' "$commit" > "$STATE_ROOT/last-success"
rm -f "$STATE_ROOT/failed-commit"
compose up -d --no-build --wait --wait-timeout 180 gateway
docker_command exec dbrain-gateway-1 nginx -t
docker_command exec dbrain-gateway-1 nginx -s reload
# An external TLS failure is reported for investigation, without discarding new user writes.
curl --fail --silent --show-error --max-time 20 "$PUBLIC_ORIGIN/health" >/dev/null
rm -f "$STATE_ROOT/needs-ingress"
rm -rf -- "$source_dir"
echo "DEPLOYED $commit backup=$backup"
