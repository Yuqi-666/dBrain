#!/usr/bin/env bash
set -euo pipefail
# Version and digest come from the official rhysd/actionlint release assets.
# Linux amd64 validation tool; container arm64 jobs do not invoke it.
tools=$(mktemp -d)
trap 'rm -rf "$tools"' EXIT
curl -fsSL --retry 3 https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz -o "$tools/actionlint.tar.gz"
printf '%s  %s\n' 8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 "$tools/actionlint.tar.gz" | sha256sum --check --status
tar -xzf "$tools/actionlint.tar.gz" -C "$tools" actionlint
"$tools/actionlint" -shellcheck="" .github/workflows/*.yml
