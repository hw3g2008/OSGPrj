#!/usr/bin/env sh
set -eu

TEMPLATE_PATH="${TEMPLATE_PATH:-/opt/osg/default.conf.template}"
OUTPUT_PATH="${OUTPUT_PATH:-/etc/nginx/conf.d/default.conf}"
API_PROXY_TARGET="${API_PROXY_TARGET:-http://backend:8080}"

# Normalize the base URL so the nginx template can always append a single slash.
API_PROXY_TARGET="${API_PROXY_TARGET%/}"

mkdir -p "$(dirname "${OUTPUT_PATH}")"
sed "s|__API_PROXY_TARGET__|${API_PROXY_TARGET}|g" "${TEMPLATE_PATH}" > "${OUTPUT_PATH}"

if [ "${RENDER_ONLY:-0}" = "1" ]; then
  exit 0
fi

exec nginx -g 'daemon off;'
