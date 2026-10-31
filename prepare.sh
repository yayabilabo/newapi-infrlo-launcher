#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

VERSION="v1.0.0-beta11"
RELEASE_VERSION="1.0.0-beta11"

case "$(uname -m)" in
  x86_64|amd64)
    ARCH="amd64"
    ZIP_SHA256="f4bc60c868d794d476e5854eb6352ca1eaf284fd031c529feb60b14e4eaf81c4"
    BINARY_SHA256="390ee8d9e997cdae594e6ed1596ea0792797b8092fe98e073fa3ee5af78ee13b"
    ;;
  aarch64|arm64)
    ARCH="arm64"
    ZIP_SHA256="aa302891e14e557a3abe41cb6b3cc99126d4829699d1fe16c898e961aa682df8"
    BINARY_SHA256="008ac177bd89fc5e09b0d2fc8c3d16cdbba6c4dcf6e7d5b92183ff67a10a6d78"
    ;;
  *)
    echo "Unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

ASSET="axonhub_${RELEASE_VERSION}_linux_${ARCH}.zip"
URL="https://github.com/looplj/axonhub/releases/download/${VERSION}/${ASSET}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to download and extract AxonHub" >&2
  exit 1
fi

export NODE_EXTRA_CA_CERTS="$PWD/cacert.pem"
echo "Preparing AxonHub ${VERSION} for ${ARCH}"
node ./download.mjs "$URL" ./axonhub "$ZIP_SHA256" axonhub "$BINARY_SHA256"
chmod 0755 ./axonhub

echo "Prepared AxonHub ${VERSION}"
