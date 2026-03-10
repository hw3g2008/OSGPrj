#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${ADMIN_PREVIEW_SELFTEST_PORT:-41731}"
BASE_URL="http://127.0.0.1:${PORT}"
PID_FILE="/tmp/osg-admin-preview-${PORT}.pid"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/admin-preview-selftest.XXXXXX")"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${PID_FILE}"
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

cat > "${TMP_DIR}/login" <<'EOF'
ok
EOF

python3 -m http.server "${PORT}" --bind 127.0.0.1 --directory "${TMP_DIR}" >/dev/null 2>&1 &
SERVER_PID=$!

for _ in {1..50}; do
  if curl -fsS --max-time 1 "${BASE_URL}/login" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

if ! curl -fsS --max-time 1 "${BASE_URL}/login" >/dev/null 2>&1; then
  echo "FAIL: selftest server did not start"
  exit 1
fi

rm -f "${PID_FILE}"

status_output="$(ADMIN_PREVIEW_PORT="${PORT}" bash "${ROOT_DIR}/bin/admin-preview-server.sh" status 2>&1)" || {
  printf '%s\n' "${status_output}"
  echo "FAIL: status should adopt healthy listener without pid file"
  exit 1
}
printf '%s\n' "${status_output}" | grep -q "PASS: admin preview running" || {
  printf '%s\n' "${status_output}"
  echo "FAIL: status output missing PASS marker"
  exit 1
}

[[ -f "${PID_FILE}" ]] || {
  echo "FAIL: status should recreate pid file after adoption"
  exit 1
}

stop_output="$(ADMIN_PREVIEW_PORT="${PORT}" bash "${ROOT_DIR}/bin/admin-preview-server.sh" stop 2>&1)" || {
  printf '%s\n' "${stop_output}"
  echo "FAIL: stop should stop adopted listener"
  exit 1
}
printf '%s\n' "${stop_output}" | grep -q "PASS: admin preview stopped" || {
  printf '%s\n' "${stop_output}"
  echo "FAIL: stop output missing PASS marker"
  exit 1
}

if curl -fsS --max-time 1 "${BASE_URL}/login" >/dev/null 2>&1; then
  echo "FAIL: adopted listener still reachable after stop"
  exit 1
fi

echo "PASS: admin-preview-server-selftest"
