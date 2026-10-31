# newapi-infrlo-launcher
Pinned New API release launcher for Infrlo

The repository includes a pinned Mozilla CA bundle in `cacert.pem`. `start.sh`
exports it through `SSL_CERT_FILE` so New API can verify HTTPS upstream
certificates even when the runtime does not provide a system trust store.
