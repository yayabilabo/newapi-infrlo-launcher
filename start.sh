#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -x ./new-api ]]; then
  bash ./prepare.sh
fi

mkdir -p ./logs
exec ./new-api --log-dir ./logs
