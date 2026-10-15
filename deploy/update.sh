#!/bin/sh
# Run in the directory containing docker-compose.yml and .env.
set -eu
umask 077
target="${1:-}"
case "$target" in
  candidate-*) echo "$target" | grep -Eq '^candidate-[0-9]+-[0-9]+$' || exit 2 ;;
  v*) echo "$target" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$' || exit 2 ;;
  *) echo 'Usage: sh update.sh candidate-RUN-ATTEMPT | vVERSION' >&2; exit 2 ;;
esac
[ -f docker-compose.yml ] && [ -f .env ] || { echo 'Run from the deployment directory with docker-compose.yml and .env' >&2; exit 2; }
mkdir -p backups
exec 9> .update.lock
flock -n 9 || { echo 'Another update is running' >&2; exit 1; }
prefix="$(sed -n 's/^DBRAIN_IMAGE_PREFIX=//p' .env | tail -n 1)"
prefix="${prefix:-ghcr.io/yuqi-666/dbrain}"
echo "$prefix" | grep -Eq '^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+$' || { echo 'Invalid DBRAIN_IMAGE_PREFIX' >&2; exit 2; }
echo "[update] selecting $target"
overlay="compose.current.yml"
tmp="$overlay.tmp.$$"
trap 'rm -f "$tmp"' EXIT HUP INT TERM
printf 'services:\n' > "$tmp"
for service in pocketbase server web; do
  image="$prefix-$service:$target"
  echo "[update] pulling $service"
  docker pull "$image"
  digest="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$image" | grep -E "^$prefix-$service@sha256:[a-f0-9]{64}$" | head -n 1)"
  [ -n "$digest" ] || { echo "No registry digest for $image" >&2; exit 1; }
  printf '  %s:\n    image: %s\n' "$service" "$digest" >> "$tmp"
done
docker compose -p dbrain -f docker-compose.yml -f "$tmp" config --quiet
echo '[update] stopping writes'
docker compose -p dbrain -f docker-compose.yml stop
pb_container="$(docker compose -p dbrain -f docker-compose.yml ps -aq pocketbase)"
if docker volume inspect dbrain_pb_data >/dev/null 2>&1; then
  if [ -z "$pb_container" ]; then
    docker compose -p dbrain -f docker-compose.yml -f "$tmp" create --no-recreate pocketbase
    pb_container="$(docker compose -p dbrain -f docker-compose.yml ps -aq pocketbase)"
  fi
  [ -n "$pb_container" ] || { echo 'Could not inspect the existing database volume' >&2; exit 1; }
  backup="backups/before-$target-$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p "$backup/pb_data"
  docker cp "$pb_container:/pb_data/." "$backup/pb_data/"
  [ -f "$backup/pb_data/data.db" ] || { echo 'Backup has no data.db; update stopped' >&2; exit 1; }
  [ ! -f "$overlay" ] || cp "$overlay" "$backup/compose.current.yml"
  echo "[update] database and files backed up to $backup"
fi
mv "$tmp" "$overlay"
echo '[update] starting selected images; PocketBase applies pending migrations first'
if ! docker compose -p dbrain -f docker-compose.yml -f "$overlay" up --no-build -d --wait --wait-timeout 180; then
  echo '[update] start failed. Keep the stack stopped and restore the matching backup before rollback.' >&2
  docker compose -p dbrain -f docker-compose.yml -f "$overlay" stop || true
  exit 1
fi
printf '%s\n' "$target" > .current-version
echo "[update] $target is healthy"
