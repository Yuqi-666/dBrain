#!/bin/sh
set -eu
data_dir="${DBRAIN_PB_DATA_DIR:-/pb_data}"
run_dir="$data_dir/pb_migrations"
state_file="$run_dir/.dbrain-migration-origin"
mkdir -p "$run_dir"
if [ ! -f "$state_file" ]; then
  if [ -f "$data_dir/data.db" ]; then
    origin=legacy
    cutoff=0
    base_file=-
    base_sha=-
  else
    origin=base
    cutoff=0
    for file in /pb_migrations_changes/*.js; do
      [ -f "$file" ] || continue
      name="${file##*/}"
      number="${name%%_*}"
      [ "$number" -gt "$cutoff" ] && cutoff="$number"
    done
    set -- /pb_migrations_base/*.js
    [ "$#" -eq 1 ] && [ -f "$1" ] || { echo '[migrations] expected one base script' >&2; exit 1; }
    base_file="${1##*/}"
    base_sha="$(sha256sum "$1" | cut -d ' ' -f 1)"
    if [ -f "$run_dir/$base_file" ]; then
      [ "$(sha256sum "$run_dir/$base_file" | cut -d ' ' -f 1)" = "$base_sha" ] || exit 1
    else
      cp "$1" "$run_dir/$base_file"
    fi
  fi
  printf '%s %s %s %s\n' "$origin" "$cutoff" "$base_file" "$base_sha" > "$state_file.tmp"
  mv "$state_file.tmp" "$state_file"
fi
read -r origin cutoff base_file base_sha < "$state_file"
case "$origin" in base|legacy) ;; *) echo '[migrations] invalid origin' >&2; exit 1 ;; esac
if [ "$origin" = base ]; then
  [ "$(sha256sum "$run_dir/$base_file" | cut -d ' ' -f 1)" = "$base_sha" ] || { echo '[migrations] installed base changed' >&2; exit 1; }
fi
added=0
for file in /pb_migrations_changes/*.js; do
  [ -f "$file" ] || continue
  name="${file##*/}"
  number="${name%%_*}"
  [ "$number" -gt "$cutoff" ] || continue
  if [ -f "$run_dir/$name" ]; then
    cmp -s "$file" "$run_dir/$name" || { echo "[migrations] installed change differs: $name" >&2; exit 1; }
  else
    cp "$file" "$run_dir/$name"
    added=$((added + 1))
  fi
done
echo "[migrations] $origin database; $added change script(s) added"
