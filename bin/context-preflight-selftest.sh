#!/usr/bin/env bash
set -euo pipefail

# Cross-platform Python 3 (python3 | py -3 | python)
source "$(dirname "${BASH_SOURCE[0]}")/lib-python.sh"
require_py3

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

CONFIG_FILE="${TMP_DIR}/config.yaml"
DEV_CONTRACT="${TMP_DIR}/runtime-dev.yaml"
TEST_CONTRACT="${TMP_DIR}/runtime-test.yaml"
DEV_ENV="${TMP_DIR}/dev.env"
TEST_ENV="${TMP_DIR}/test.env"

cat >"${CONFIG_FILE}" <<'YAML'
runtime_model:
  dev:
    backend:
      port: 28080
      base_url: http://127.0.0.1:28080
    dependencies:
      runtime_contract: RUNTIME_DEV
      env_file: ENV_DEV
  test:
    backend:
      port: 28080
      base_url: http://127.0.0.1:28080
    dependencies:
      runtime_contract: RUNTIME_TEST
      env_file: ENV_TEST
environment_identity:
  local_host:
    docker_context_must_not_be_remote_test_truth: true
  shared_remote_deps:
    host: 47.94.213.128
    mysql:
      port: 23306
    redis:
      port: 26379
  remote_test_stack:
    host: 47.94.213.128
    ports:
      backend: 28080
      admin: 3005
YAML

py3 - "${CONFIG_FILE}" "${DEV_CONTRACT}" "${TEST_CONTRACT}" "${DEV_ENV}" "${TEST_ENV}" <<'PY'
import pathlib
import sys

config = pathlib.Path(sys.argv[1])
text = config.read_text(encoding="utf-8")
text = text.replace("RUNTIME_DEV", sys.argv[2])
text = text.replace("RUNTIME_TEST", sys.argv[3])
text = text.replace("ENV_DEV", sys.argv[4])
text = text.replace("ENV_TEST", sys.argv[5])
config.write_text(text, encoding="utf-8")
PY

cat >"${DEV_CONTRACT}" <<'YAML'
mode: local-backend-remote-deps
stack: springboot-vue
classpath_mode: workspace-reactor
env_file: DEV_ENV
run_command: bash bin/run-backend-dev.sh DEV_ENV
port: 28080
base_url: http://127.0.0.1:28080
health_url: http://127.0.0.1:28080/actuator/health
proxy_target: http://127.0.0.1:28080
deps:
  mysql: remote
  redis: remote
providers:
  smtp:
    provider_class: smtp
    truth_mode: real
    config_env:
      host: SPRING_MAIL_HOST
      port: SPRING_MAIL_PORT
      username: SPRING_MAIL_USERNAME
      password: SPRING_MAIL_PASSWORD
      from: SPRING_MAIL_FROM
      auth: SPRING_MAIL_SMTP_AUTH
      starttls: SPRING_MAIL_SMTP_STARTTLS_ENABLE
      ssl: SPRING_MAIL_SMTP_SSL_ENABLE
evidence_sinks:
  mailbox:
    sink_type: mailbox
    provider: smtp
evidence_paths:
  mailbox:
    mailbox_target_env: PASSWORD_RESET_MAILBOX
    provider_log_path_env: PASSWORD_RESET_PROVIDER_LOG_PATH
YAML

cat >"${TEST_CONTRACT}" <<'YAML'
mode: docker-backend-shared-deps
stack: springboot-vue
classpath_mode: container-image
env_file: TEST_ENV
run_command: bash bin/deploy-server-docker.sh TEST_ENV test
port: 28080
base_url: http://127.0.0.1:28080
health_url: http://127.0.0.1:28080/actuator/health
proxy_target: http://127.0.0.1:28080
deps:
  mysql: remote
  redis: remote
providers:
  smtp:
    provider_class: smtp
    truth_mode: real
    config_env:
      host: SPRING_MAIL_HOST
      port: SPRING_MAIL_PORT
      username: SPRING_MAIL_USERNAME
      password: SPRING_MAIL_PASSWORD
      from: SPRING_MAIL_FROM
      auth: SPRING_MAIL_SMTP_AUTH
      starttls: SPRING_MAIL_SMTP_STARTTLS_ENABLE
      ssl: SPRING_MAIL_SMTP_SSL_ENABLE
evidence_sinks:
  mailbox:
    sink_type: mailbox
    provider: smtp
evidence_paths:
  mailbox:
    mailbox_target_env: PASSWORD_RESET_MAILBOX
    provider_log_path_env: PASSWORD_RESET_PROVIDER_LOG_PATH
YAML

py3 - "${DEV_CONTRACT}" "${TEST_CONTRACT}" "${DEV_ENV}" "${TEST_ENV}" <<'PY'
import pathlib
import sys
for path, env in [(sys.argv[1], sys.argv[3]), (sys.argv[2], sys.argv[4])]:
    p = pathlib.Path(path)
    p.write_text(p.read_text(encoding="utf-8").replace("DEV_ENV", sys.argv[3]).replace("TEST_ENV", sys.argv[4]), encoding="utf-8")
PY

cat >"${DEV_ENV}" <<'EOF'
SPRING_PROFILES_ACTIVE=druid,docker
SERVER_PORT=28080
SPRING_DATASOURCE_DRUID_MASTER_URL='jdbc:mysql://47.94.213.128:23306/ry-vue?useUnicode=true&characterEncoding=utf8'
SPRING_DATASOURCE_DRUID_MASTER_USERNAME=ruoyi
SPRING_DATASOURCE_DRUID_MASTER_PASSWORD=app123456
SPRING_DATA_REDIS_HOST=47.94.213.128
SPRING_DATA_REDIS_PORT=26379
SPRING_DATA_REDIS_PASSWORD=redis123456
SPRING_MAIL_HOST=smtp.example.com
SPRING_MAIL_PORT=465
SPRING_MAIL_USERNAME=noreply@example.com
SPRING_MAIL_PASSWORD=secret-token
SPRING_MAIL_FROM=noreply@example.com
SPRING_MAIL_SMTP_AUTH=true
SPRING_MAIL_SMTP_STARTTLS_ENABLE=false
SPRING_MAIL_SMTP_SSL_ENABLE=true
PASSWORD_RESET_MAILBOX=qa@example.com
PASSWORD_RESET_PROVIDER_LOG_PATH=osg-spec-docs/tasks/audit/password-reset-mailbox.log
TOKEN_SECRET=test
EOF

cat >"${TEST_ENV}" <<'EOF'
TEST_DEPENDENCY_MODE=shared
BACKEND_PORT=28080
MYSQL_SHARED_HOST=host.docker.internal
MYSQL_SHARED_PORT=23306
REDIS_SHARED_HOST=host.docker.internal
REDIS_SHARED_PORT=26379
ADMIN_PORT=3005
SPRING_MAIL_HOST=smtp.example.com
SPRING_MAIL_PORT=465
SPRING_MAIL_USERNAME=noreply@example.com
SPRING_MAIL_PASSWORD=secret-token
SPRING_MAIL_FROM=noreply@example.com
SPRING_MAIL_SMTP_AUTH=true
SPRING_MAIL_SMTP_STARTTLS_ENABLE=false
SPRING_MAIL_SMTP_SSL_ENABLE=true
PASSWORD_RESET_MAILBOX=qa@example.com
PASSWORD_RESET_PROVIDER_LOG_PATH=osg-spec-docs/tasks/audit/password-reset-mailbox.log
EOF

bash bin/context-preflight.sh dev \
  --config "${CONFIG_FILE}" \
  --runtime-contract "${DEV_CONTRACT}" \
  --env-file "${DEV_ENV}" \
  --entrypoint selftest-dev >/dev/null

bash bin/context-preflight.sh test \
  --config "${CONFIG_FILE}" \
  --runtime-contract "${TEST_CONTRACT}" \
  --env-file "${TEST_ENV}" \
  --entrypoint selftest-test \
  --remote-host 47.94.213.128 >/dev/null

if bash bin/context-preflight.sh test \
  --config "${CONFIG_FILE}" \
  --runtime-contract "${TEST_CONTRACT}" \
  --env-file "${TEST_ENV}" \
  --entrypoint selftest-test-bad-host \
  --remote-host 1.2.3.4 >/dev/null 2>&1; then
  echo "FAIL: expected remote-host mismatch to fail" >&2
  exit 1
fi

BAD_DEV_ENV="${TMP_DIR}/dev-bad.env"
cp "${DEV_ENV}" "${BAD_DEV_ENV}"
py3 - "${BAD_DEV_ENV}" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
text = text.replace("47.94.213.128:23306", "127.0.0.1:3306")
path.write_text(text, encoding="utf-8")
PY
if bash bin/context-preflight.sh dev \
  --config "${CONFIG_FILE}" \
  --runtime-contract "${DEV_CONTRACT}" \
  --env-file "${BAD_DEV_ENV}" \
  --entrypoint selftest-dev-bad >/dev/null 2>&1; then
  echo "FAIL: expected dev mysql mismatch to fail" >&2
  exit 1
fi

echo "PASS: context-preflight-selftest"
