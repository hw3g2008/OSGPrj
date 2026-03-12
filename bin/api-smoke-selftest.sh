#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/api-smoke-selftest.XXXXXX")"
PORT=38123
REPORT_DATE="$(date +%Y-%m-%d)"
REPORT_PATH="${TMP_DIR}/osg-spec-docs/tasks/audit/api-smoke-permission-all-${REPORT_DATE}.md"
SERVER_LOG="${TMP_DIR}/health-server.log"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

mkdir -p "${TMP_DIR}/deploy" "${TMP_DIR}/osg-spec-docs/tasks/audit"

cat > "${TMP_DIR}/deploy/runtime-contract.dev.yaml" <<YAML
mode: local-backend-remote-deps
stack: springboot-vue
selection:
  priority: 100
  default: true
env_file: deploy/.env.dev
run_command: bash bin/run-backend-dev.sh deploy/.env.dev
port: ${PORT}
base_url: http://127.0.0.1:${PORT}
health_url: http://127.0.0.1:${PORT}/actuator/health
proxy_target: http://127.0.0.1:${PORT}
tool_env: {}
YAML

python3 - <<'PY' > "${SERVER_LOG}" 2>&1 &
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/actuator/health":
            body = b'{"status":"UP"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, fmt, *args):
        return


HTTPServer(("127.0.0.1", 38123), Handler).serve_forever()
PY
SERVER_PID="$!"

for _ in {1..30}; do
  if curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/actuator/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

pushd "${TMP_DIR}" >/dev/null

set +e
RUNTIME_CONTRACT_SCAN_DIR=deploy \
PATH="${PATH}" \
bash "${ROOT_DIR}/bin/api-smoke.sh" permission > "${TMP_DIR}/api-smoke.out" 2>&1
RC=$?
set -e

if [[ "${RC}" -ne 0 ]]; then
  cat "${TMP_DIR}/api-smoke.out"
  echo "FAIL: api-smoke should pass when runtime contract health endpoint is healthy"
  exit 1
fi

grep -q "base=http://127.0.0.1:${PORT}" "${TMP_DIR}/api-smoke.out" || {
  cat "${TMP_DIR}/api-smoke.out"
  echo "FAIL: api-smoke did not use runtime contract base_url"
  exit 1
}

grep -q "base_url: http://127.0.0.1:${PORT}" "${REPORT_PATH}" || {
  cat "${REPORT_PATH}"
  echo "FAIL: api-smoke report did not persist runtime contract base_url"
  exit 1
}

popd >/dev/null

echo "PASS: api-smoke-selftest"
