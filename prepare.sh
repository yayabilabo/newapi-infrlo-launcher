#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

VERSION="v1.0.0-rc.47"

case "$(uname -m)" in
  x86_64|amd64)
    ASSET="new-api-${VERSION}"
    SHA256="9862deb72e9567fad943d0efadc22067f48b36c30bf93536874c0976467c534c"
    ;;
  aarch64|arm64)
    ASSET="new-api-arm64-${VERSION}"
    SHA256="cf667b6b82d405adf8c51ae5b0b3c17a5fb0c9943fbc53cdfd1685b517c2a98c"
    ;;
  *)
    echo "Unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

URL="https://github.com/QuantumNous/new-api/releases/download/${VERSION}/${ASSET}"
TMP=".new-api.download.$$"

cleanup() {
  if [[ -f "$TMP" ]]; then
    rm -f "$TMP"
  fi
}
trap cleanup EXIT

echo "Downloading New API ${VERSION} for $(uname -m)"
if command -v node >/dev/null 2>&1; then
  node ./download.mjs "$URL" "$TMP" "$SHA256"
elif command -v curl >/dev/null 2>&1; then
  curl --fail --location --retry 3 --connect-timeout 20 --output "$TMP" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget --tries=3 --timeout=30 --output-document="$TMP" "$URL"
else
  echo "No supported downloader is available" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s  %s\n' "$SHA256" "$TMP" | sha256sum --check -
  elif command -v shasum >/dev/null 2>&1; then
    printf '%s  %s\n' "$SHA256" "$TMP" | shasum -a 256 --check -
  else
    echo "No SHA-256 verifier is available" >&2
    exit 1
  fi
fi

chmod 0755 "$TMP"
mv -f "$TMP" ./new-api
mkdir -p ./logs
echo "Prepared New API ${VERSION}"
