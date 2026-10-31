#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -x ./axonhub ]]; then
  bash ./prepare.sh
fi

if [[ -z "${AXONHUB_DB_DSN:-}" ]]; then
  echo "AXONHUB_DB_DSN is required; refusing to start with an ephemeral SQLite database" >&2
  exit 1
fi

export AXONHUB_DB_DIALECT="${AXONHUB_DB_DIALECT:-postgres}"
export AXONHUB_SERVER_PORT="${PORT:-3000}"
export AXONHUB_LOG_OUTPUT="${AXONHUB_LOG_OUTPUT:-stdio}"
export SSL_CERT_FILE="${SSL_CERT_FILE:-$PWD/cacert.pem}"

echo "Starting AxonHub on port ${AXONHUB_SERVER_PORT}"
exec ./axonhub
