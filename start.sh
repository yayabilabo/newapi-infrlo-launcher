#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -x ./new-api ]]; then
  bash ./prepare.sh
fi

mkdir -p ./logs
PORT="${PORT:-3000}"
echo "Starting New API on port ${PORT}"
exec ./new-api --port "$PORT" --log-dir ./logs
