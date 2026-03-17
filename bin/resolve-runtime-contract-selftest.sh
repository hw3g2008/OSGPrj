#!/usr/bin/env bash
set -euo pipefail

# Cross-platform Python 3 (python3 | py -3 | python)
source "$(dirname "${BASH_SOURCE[0]}")/lib-python.sh"
require_py3

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

mkdir -p "${TMP_DIR}/deploy"

cat > "${TMP_DIR}/deploy/runtime-contract.dev.yaml" <<'YAML'
mode: local-backend-remote-deps
stack: springboot-vue
classpath_mode: workspace-reactor
selection:
  priority: 100
  default: true
env_file: deploy/.env.dev
run_command: bash bin/run-backend-dev.sh deploy/.env.dev
port: 28080
base_url: http://127.0.0.1:28080
health_url: http://127.0.0.1:28080/actuator/health
proxy_target: http://127.0.0.1:28080
deps:
  mysql: remote
  redis: remote
providers: {}
evidence_sinks: {}
evidence_paths: {}
YAML

cat > "${TMP_DIR}/deploy/runtime-contract.test.yaml" <<'YAML'
mode: docker-backend-shared-deps
stack: springboot-vue
classpath_mode: container-image
selection:
  priority: 200
  probes:
    - type: env_equals
      name: RUNTIME_STACK_TEST_MODE
      value: "1"
env_file: deploy/.env.test
run_command: bash bin/deploy-server-docker.sh up test
port: 28080
base_url: http://127.0.0.1:28080
health_url: http://127.0.0.1:28080/actuator/health
proxy_target: http://127.0.0.1:28080
tool_env:
  E2E_REDIS_HOST: 127.0.0.1
deps:
  mysql: remote
  redis: remote
providers: {}
evidence_sinks: {}
evidence_paths: {}
YAML

cat > "${TMP_DIR}/deploy/.env.dev" <<'EOF'
SPRING_DATA_REDIS_HOST=47.94.213.128
EOF

cat > "${TMP_DIR}/deploy/.env.test" <<'EOF'
SPRING_DATA_REDIS_HOST=host.docker.internal
EOF

pushd "${TMP_DIR}" >/dev/null

no_probe_output="$(RUNTIME_CONTRACT_SCAN_DIR=deploy bash "${ROOT}/bin/resolve-runtime-contract.sh")"
printf '%s\n' "${no_probe_output}" | grep -q "RESOLVED_RUNTIME_CONTRACT_FILE=.*runtime-contract.dev.yaml"

probe_output="$(RUNTIME_CONTRACT_SCAN_DIR=deploy RUNTIME_STACK_TEST_MODE=1 bash "${ROOT}/bin/resolve-runtime-contract.sh")"
printf '%s\n' "${probe_output}" | grep -q "RESOLVED_RUNTIME_CONTRACT_FILE=.*runtime-contract.test.yaml"
printf '%s\n' "${probe_output}" | grep -q "RESOLVED_RUNTIME_TOOL_ENV_JSON="

popd >/dev/null

echo "PASS: resolve-runtime-contract-selftest"
