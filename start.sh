#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -x ./new-api ]]; then
  bash ./prepare.sh
fi

mkdir -p ./logs
PORT="${PORT:-5000}"

# Infrlo's minimal runtime may not expose a system CA bundle to Go binaries.
if [[ -r ./cacert.pem ]]; then
  export SSL_CERT_FILE="$PWD/cacert.pem"
fi

echo "Starting New API on port ${PORT}"
exec ./new-api --port "$PORT" --log-dir ./logs
