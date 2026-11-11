#!/bin/sh
# cloudflared/xray 走 Go 的证书池,Infrlo 镜像里没有系统 CA,必须显式指定
export SSL_CERT_FILE="$PWD/cacert.pem"
exec node index.js
