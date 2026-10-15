#!/bin/sh
set -eu

cd /deployment
interval=300
api='https://api.github.com/repos/Yuqi-666/dBrain/actions/workflows/gate.yml/runs?branch=main&event=push&status=success&per_page=1'

enabled() {
  value="$(sed -n 's/^DBRAIN_AUTO_UPDATE=//p' .env | tail -n 1 | tr -d '\r')"
  case "$value" in
    true) return 0 ;;
    false|'') return 1 ;;
    *) echo '[updater] DBRAIN_AUTO_UPDATE must be true or false' >&2; return 1 ;;
  esac
}

candidate_number() {
  case "$1" in
    candidate-[0-9]*-[0-9]*)
      printf '%s\n' "$1" | sed -n 's/^candidate-\([0-9][0-9]*\)-\([0-9][0-9]*\)$/\1 \2/p'
      ;;
  esac
}

check_once() {
  [ ! -f .auto-update-failed ] || return 0
  response="$(curl -fsSL --connect-timeout 10 --max-time 30 --retry 2 -H 'Accept: application/vnd.github+json' "$api")" || return 1
  result="$(printf '%s' "$response" | jq -er '.workflow_runs[0] | select(.conclusion == "success" and .head_branch == "main" and .event == "push") | "\(.id) \(.run_attempt)"')" || return 1
  read -r run attempt <<EOF
$result
EOF
  case "$run:$attempt" in
    *[!0-9:]*|:*|*:) echo '[updater] invalid Gate run identity' >&2; return 1 ;;
  esac
  target="candidate-$run-$attempt"
  current="$(cat .current-version 2>/dev/null || true)"
  [ "$current" != "$target" ] || return 0

  previous="$(candidate_number "$current")"
  if [ -z "$previous" ] && [ -f .auto-update-last-run ]; then
    previous="$(candidate_number "$(cat .auto-update-last-run)")"
  fi
  if [ -n "$previous" ]; then
    read -r old_run old_attempt <<EOF
$previous
EOF
    if [ "$run" -lt "$old_run" ] || { [ "$run" -eq "$old_run" ] && [ "$attempt" -le "$old_attempt" ]; }; then
      return 0
    fi
  elif [ -n "$current" ]; then
    # A manual release has no candidate run ID. Record the current Gate run as
    # the starting point so that the watcher cannot replace it with an older candidate.
    printf '%s\n' "$target" > .auto-update-last-run
    echo "[updater] tracking from $target; waiting for a newer run"
    return 0
  fi

  echo "[updater] new successful main candidate: $target"
  if sh update.sh "$target"; then
    printf '%s\n' "$target" > .auto-update-last-run
    echo "[updater] deployed $target"
  else
    printf '%s\n' "$target" > .auto-update-failed
    echo "[updater] update failed; automatic updates paused. Recover the application and remove .auto-update-failed to resume" >&2
    return 1
  fi
}

[ -f .env ] && [ -f update.sh ] || { echo '[updater] deployment files missing' >&2; exit 1; }
if [ "${1:-}" = '--once' ]; then
  if enabled; then check_once; fi
  exit 0
fi
echo "[updater] watching successful main candidates every ${interval}s"
last_state=''
while :; do
  if enabled; then
    if [ "$last_state" != enabled ]; then echo '[updater] automatic updates enabled'; fi
    last_state=enabled
    check_once || echo '[updater] check failed; will retry' >&2
  else
    if [ "$last_state" != disabled ]; then echo '[updater] automatic updates disabled'; fi
    last_state=disabled
  fi
  sleep "$interval"
done
