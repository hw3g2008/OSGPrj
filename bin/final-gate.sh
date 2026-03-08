#!/usr/bin/env bash
# Final Gate — 统一门禁脚本（严格顺序执行）
# 用法: bash bin/final-gate.sh [module]
# 任一步骤失败即整体 FAIL（set -euo pipefail）
set -euo pipefail

MODULE="${1:-}"
if [[ -z "${MODULE}" ]]; then
  MODULE="$(python3 - <<'PY'
import yaml
from pathlib import Path
p = Path("osg-spec-docs/tasks/STATE.yaml")
if p.exists():
    data = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    print(data.get("current_requirement", "") or "")
else:
    print("")
PY
)"
fi
if [[ -z "${MODULE}" ]]; then
  MODULE="permission"
fi
DATE_STR="$(date +%Y-%m-%d)"
AUDIT_DIR="osg-spec-docs/tasks/audit"
mkdir -p "${AUDIT_DIR}"

DEV_ENV_FILE="${DEV_ENV_FILE:-deploy/.env.dev}"
if [[ -f "${DEV_ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${DEV_ENV_FILE}"
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-8080}"
BACKEND_BASE_URL="${BACKEND_BASE_URL:-}"
HEALTH_PATH="${HEALTH_PATH:-/actuator/health}"
BASE_URL_DEFAULT="http://127.0.0.1:${BACKEND_PORT}"
BASE_URL="${BASE_URL:-}"
HEALTH_URL="${BASE_HEALTH_URL:-}"
CAPTCHA_EXPECTED="${CAPTCHA_EXPECTED:-}"
E2E_ADMIN_USERNAME="${E2E_ADMIN_USERNAME:-admin}"
E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-Osg@2025}"
LOGIN_PATH="${LOGIN_PATH:-/login}"
REDIS_HOST="${REDIS_HOST:-${SPRING_DATA_REDIS_HOST:-127.0.0.1}}"
REDIS_PORT="${REDIS_PORT:-${SPRING_DATA_REDIS_PORT:-6379}}"
REDIS_DB="${REDIS_DB:-0}"
REDIS_PASSWORD="${REDIS_PASSWORD:-${SPRING_DATA_REDIS_PASSWORD:-}}"
E2E_API_GATE_LOG="${E2E_API_GATE_LOG:-${AUDIT_DIR}/e2e-api-gate-${MODULE}-${DATE_STR}.log}"
SECURITY_CONTRACT_LOG="${SECURITY_CONTRACT_LOG:-${AUDIT_DIR}/security-contract-${MODULE}-${DATE_STR}.md}"
UI_VISUAL_GATE_LOG="${UI_VISUAL_GATE_LOG:-${AUDIT_DIR}/ui-visual-gate-${MODULE}-${DATE_STR}.log}"
UI_VISUAL_PAGE_REPORT="${AUDIT_DIR}/ui-visual-page-report-${MODULE}-${DATE_STR}.json"
BEHAVIOR_CONTRACT_REPORT="${BEHAVIOR_CONTRACT_REPORT:-${AUDIT_DIR}/behavior-contract-${MODULE}-${DATE_STR}.json}"
BACKEND_READY_TIMEOUT_SECONDS="${BACKEND_READY_TIMEOUT_SECONDS:-120}"
BACKEND_HEALTH_TIMEOUT_SECONDS="${BACKEND_HEALTH_TIMEOUT_SECONDS:-15}"
BACKEND_BOOT_LOG="${BACKEND_BOOT_LOG:-${AUDIT_DIR}/final-gate-backend-boot-${MODULE}-${DATE_STR}.log}"
BACK_PID="${BACK_PID:-}"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "FAIL: 缺少依赖命令 '${cmd}'（请先安装后重试）"
    exit 21
  fi
}

write_visual_baseline_fingerprint() {
  local outfile="$1"
  python3 - <<PY > "${outfile}"
import hashlib
from pathlib import Path

root = Path("osg-frontend/tests/e2e/visual-baseline")
if not root.exists():
    raise SystemExit(0)

for path in sorted(p for p in root.rglob("*") if p.is_file()):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    rel = path.as_posix()
    print(f"{digest}  {rel}")
PY
}

resolve_backend_urls() {
  if [[ -z "${BASE_URL}" && -n "${BACKEND_BASE_URL}" ]]; then
    export BASE_URL="${BACKEND_BASE_URL}"
  fi
  if [[ -n "${HEALTH_URL}" ]]; then
    export BASE_HEALTH_URL="${HEALTH_URL}"
  fi
  eval "$(bash bin/resolve-runtime-contract.sh)"
  BACKEND_PORT="${RESOLVED_BACKEND_PORT}"
  BASE_URL_DEFAULT="http://127.0.0.1:${BACKEND_PORT}"
  BASE_URL="${RESOLVED_BASE_URL}"
  HEALTH_URL="${RESOLVED_BASE_HEALTH_URL}"
}

backend_healthy() {
  curl -fsS --max-time "${BACKEND_HEALTH_TIMEOUT_SECONDS}" "${HEALTH_URL}" >/dev/null 2>&1
}

ensure_backend_startable() {
  if bash bin/runtime-port-guard.sh --mode require-free --port "${BACKEND_PORT}" --context final-gate-backend-start; then
    return 0
  fi
  echo "FAIL: 后端端口 ${BACKEND_PORT} 已被占用，但健康检查未通过。请先处理占用进程，再重试 final-gate。"
  echo "INFO: target base=${BASE_URL} health=${HEALTH_URL} log=${BACKEND_BOOT_LOG}"
  return 1
}

ensure_backend_ready() {
  if backend_healthy; then
    return 0
  fi
  ensure_backend_startable
  echo "INFO: 后端不可达，按 runtime contract 启动本地托管后端"
  nohup bash bin/run-backend-dev.sh "${DEV_ENV_FILE}" > "${BACKEND_BOOT_LOG}" 2>&1 &
  BACK_PID=$!
  echo "INFO: 后端 PID=${BACK_PID}，日志=${BACKEND_BOOT_LOG}"
  local start_ts now_ts
  start_ts="$(date +%s)"
  while ! backend_healthy; do
    now_ts="$(date +%s)"
    if (( now_ts - start_ts >= BACKEND_READY_TIMEOUT_SECONDS )); then
      echo "FAIL: 后端健康检查超时（${BACKEND_READY_TIMEOUT_SECONDS}s），日志=${BACKEND_BOOT_LOG}"
      return 1
    fi
    sleep 2
  done
  echo "INFO: 后端健康检查通过"
}

build_redis_cmd() {
  REDIS_CMD=(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -n "${REDIS_DB}" --raw)
  REDIS_ENV=()
  if [[ -n "${REDIS_PASSWORD}" ]]; then
    REDIS_ENV+=(REDISCLI_AUTH="${REDIS_PASSWORD}")
  fi
}

redis_raw() {
  if [[ ${#REDIS_ENV[@]} -gt 0 ]]; then
    env "${REDIS_ENV[@]}" "${REDIS_CMD[@]}" "$@"
  else
    "${REDIS_CMD[@]}" "$@"
  fi
}

normalize_redis_value() {
  local raw="${1:-}"
  raw="$(printf '%s' "${raw}" | tr -d '\r')"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  if [[ -z "${raw}" || "${raw}" == "(nil)" ]]; then
    return 1
  fi
  if [[ "${raw}" == \"*\" && "${raw}" == *\" ]]; then
    raw="${raw:1:${#raw}-2}"
  fi
  printf '%s' "${raw}"
}

echo "=== Final Gate: 开始（module=${MODULE}） ==="

echo "--- 0. toolchain_preflight ---"
require_cmd python3
require_cmd node
require_cmd pnpm
require_cmd mvn
require_cmd curl
require_cmd jq
resolve_backend_urls
echo "INFO: backend base=${BASE_URL}, health=${HEALTH_URL}"

if [[ ! -f "osg-frontend/playwright.config.ts" ]]; then
  echo "FAIL: 缺少 Playwright 配置文件 osg-frontend/playwright.config.ts"
  exit 22
fi

if ! grep -Eq "webServer\\s*:" "osg-frontend/playwright.config.ts"; then
  echo "FAIL: Playwright webServer 未配置，无法自动拉起前端执行 E2E"
  exit 22
fi

echo "INFO: E2E 前端启动策略=Playwright webServer（Option B），不依赖 Docker frontends(3001-3005)"

echo "--- 0.1 plan_standard_guard ---"
python3 .claude/skills/workflow-engine/tests/plan_standard_guard.py

echo "--- 0.15 runtime_contract_guard ---"
python3 .claude/skills/workflow-engine/tests/runtime_contract_guard.py \
  --contract deploy/runtime-contract.dev.yaml

echo "--- 0.16 delivery_truth_guard ---"
python3 .claude/skills/workflow-engine/tests/delivery_truth_guard.py \
  --module "${MODULE}" \
  --stage final-gate

echo "--- 0.16b delivery_content_guard ---"
python3 .claude/skills/workflow-engine/tests/delivery_content_guard.py \
  --contract "osg-spec-docs/docs/01-product/prd/${MODULE}/DELIVERY-CONTRACT.yaml" \
  --runtime-contract deploy/runtime-contract.dev.yaml \
  --stage final-gate

echo "--- 0.2 srs_guard ---"
python3 .claude/skills/workflow-engine/tests/srs_guard.py \
  --module "${MODULE}"

echo "--- 0.3 decisions_guard ---"
python3 .claude/skills/workflow-engine/tests/decisions_guard.py \
  --module "${MODULE}" \
  --allow-missing

echo "--- 0.4 requirements_coverage_guard ---"
python3 .claude/skills/workflow-engine/tests/requirements_coverage_guard.py \
  --module "${MODULE}" \
  --mode requirements_to_story_tests

echo "--- 0.4b story_ticket_coverage_guard ---"
python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py \
  --module "${MODULE}"

echo "--- 0.5 menu_route_view_guard ---"
python3 .claude/skills/workflow-engine/tests/menu_route_view_guard.py \
  --module "${MODULE}"

echo "--- 0.6 permission_code_consistency_guard ---"
python3 .claude/skills/workflow-engine/tests/permission_code_consistency_guard.py \
  --module "${MODULE}"

echo "--- 1. story_runtime_guard ---"
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py \
  --state osg-spec-docs/tasks/STATE.yaml \
  --config .claude/project/config.yaml \
  --state-machine .claude/skills/workflow-engine/state-machine.yaml \
  --stories-dir osg-spec-docs/tasks/stories \
  --tickets-dir osg-spec-docs/tasks/tickets \
  --proofs-dir osg-spec-docs/tasks/proofs \
  --events osg-spec-docs/tasks/workflow-events.jsonl

echo "--- 2. story_event_log_check ---"
python3 .claude/skills/workflow-engine/tests/story_event_log_check.py \
  --events osg-spec-docs/tasks/workflow-events.jsonl \
  --state osg-spec-docs/tasks/STATE.yaml

echo "--- 3. done_ticket_evidence_guard (全 Story 循环) ---"
python3 - <<'PY'
import subprocess, sys, yaml
state = yaml.safe_load(open("osg-spec-docs/tasks/STATE.yaml", "r", encoding="utf-8"))
stories = state.get("stories", [])
if not stories:
    print("FAIL: STATE.stories 为空，无法执行全量证据校验")
    sys.exit(1)
for sid in stories:
    cmd = [
        "python3",
        ".claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py",
        "--state", "osg-spec-docs/tasks/STATE.yaml",
        "--stories-dir", "osg-spec-docs/tasks/stories",
        "--tickets-dir", "osg-spec-docs/tasks/tickets",
        "--story-id", sid,
    ]
    rc = subprocess.run(cmd).returncode
    if rc != 0:
        print(f"FAIL: done_ticket_evidence_guard 未通过，story={sid}")
        sys.exit(rc)
print("PASS: 全 Story done_ticket_evidence_guard 通过")
PY

echo "--- 4. traceability_guard ---"
python3 .claude/skills/workflow-engine/tests/traceability_guard.py \
  --cases "osg-spec-docs/tasks/testing/${MODULE}-test-cases.yaml" \
  --matrix "osg-spec-docs/tasks/testing/${MODULE}-traceability-matrix.md"

echo "--- 4.5 ui_visual_gate ---"
ensure_backend_ready
pre_visual_fp="$(mktemp)"
post_visual_fp="$(mktemp)"
write_visual_baseline_fingerprint "${pre_visual_fp}"
set +e
UI_VISUAL_GATE_LOG="${UI_VISUAL_GATE_LOG}" \
  E2E_API_PROXY_TARGET="${BASE_URL}" \
  E2E_BACKEND_URL="${BASE_URL}" \
  BACKEND_BASE_URL="${BASE_URL}" \
  BASE_URL="${BASE_URL}" \
  BASE_HEALTH_URL="${HEALTH_URL}" \
  E2E_ADMIN_USERNAME="${E2E_ADMIN_USERNAME}" \
  E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD}" \
  E2E_REDIS_HOST="${REDIS_HOST}" \
  E2E_REDIS_PORT="${REDIS_PORT}" \
  E2E_REDIS_PASSWORD="${REDIS_PASSWORD}" \
  REDIS_HOST="${REDIS_HOST}" \
  REDIS_PORT="${REDIS_PORT}" \
  REDIS_PASSWORD="${REDIS_PASSWORD}" \
  bash bin/ui-visual-gate.sh "${MODULE}"
ui_visual_gate_rc=$?
set -e
write_visual_baseline_fingerprint "${post_visual_fp}"

if [[ ! -f "${UI_VISUAL_PAGE_REPORT}" ]]; then
  echo "FAIL: 缺少 ui-visual 页面报告产物: ${UI_VISUAL_PAGE_REPORT}"
  rm -f "${pre_visual_fp}" "${post_visual_fp}"
  exit 12
fi

echo "--- 4.6 ui_critical_evidence_guard ---"
python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py \
  --contract "osg-spec-docs/docs/01-product/prd/${MODULE}/UI-VISUAL-CONTRACT.yaml" \
  --page-report "${UI_VISUAL_PAGE_REPORT}" \
  --stage final-gate

read -r visual_total visual_pass visual_fail visual_not_run style_passed style_failed state_executed state_failed critical_total critical_failed <<EOF
$(python3 - <<PY
import json
from pathlib import Path
report = json.loads(Path("${UI_VISUAL_PAGE_REPORT}").read_text(encoding="utf-8"))
print(
    report.get("total_pages", 0),
    report.get("pass_pages", 0),
    report.get("fail_pages", 0),
    report.get("not_run_pages", 0),
    report.get("style_assertions_passed", 0),
    report.get("style_assertions_failed", 0),
    report.get("state_cases_executed", 0),
    report.get("state_cases_failed", 0),
    report.get("critical_surfaces_total", 0),
    report.get("critical_surfaces_failed", 0),
)
PY
)
EOF
echo "INFO: ui_visual_summary total=${visual_total} pass=${visual_pass} fail=${visual_fail} not_run=${visual_not_run} style_passed=${style_passed} style_failed=${style_failed} state_executed=${state_executed} state_failed=${state_failed} critical_total=${critical_total} critical_failed=${critical_failed}"

if (( ui_visual_gate_rc != 0 )); then
  echo "FAIL: ui-visual-gate failed (exit=${ui_visual_gate_rc})"
  rm -f "${pre_visual_fp}" "${post_visual_fp}"
  exit 12
fi

if ! diff -q "${pre_visual_fp}" "${post_visual_fp}" >/dev/null 2>&1; then
  echo "FAIL: visual baseline mutated during final-gate run (rule=BASELINE_MUTATED_DURING_GATE)"
  echo "INFO: baseline path=osg-frontend/tests/e2e/visual-baseline"
  diff -u "${pre_visual_fp}" "${post_visual_fp}" | head -n 80 || true
  rm -f "${pre_visual_fp}" "${post_visual_fp}"
  exit 12
fi
rm -f "${pre_visual_fp}" "${post_visual_fp}"

echo "--- 5. 前端单测 ---"
pnpm --dir osg-frontend/packages/admin test

echo "--- 6. 前端构建 ---"
pnpm --dir osg-frontend/packages/admin build

echo "--- 7. 后端测试 ---"
mvn test -pl ruoyi-admin -am

echo "--- 8. API 冒烟 ---"
ensure_backend_ready
BASE_URL="${BASE_URL}" HEALTH_PATH="${HEALTH_PATH}" BASE_HEALTH_URL="${HEALTH_URL}" \
  bash bin/api-smoke.sh "${MODULE}"

echo "--- 8.1 登录契约预检 ---"
ensure_backend_ready
if [[ "${LOGIN_PATH}" != /* ]]; then
  LOGIN_PATH="/${LOGIN_PATH}"
fi
login_url="${BASE_URL}${LOGIN_PATH}"
captcha_resp="$(curl -sS --max-time 10 "${BASE_URL}/captchaImage")"
captcha_enabled="$(echo "${captcha_resp}" | jq -r '.captchaEnabled // false' 2>/dev/null || true)"
captcha_uuid="$(echo "${captcha_resp}" | jq -r '.uuid // empty' 2>/dev/null || true)"
build_redis_cmd
if [[ "${captcha_enabled}" == "true" ]]; then
  if ! command -v redis-cli >/dev/null 2>&1; then
    echo "FAIL: 环境缺失 redis-cli，无法解析登录验证码"
    exit 11
  fi
  if [[ -z "${captcha_uuid}" ]]; then
    preview="$(echo "${captcha_resp}" | head -c 200)"
    echo "FAIL: /captchaImage 缺少 uuid，无法执行登录契约预检 response_snippet=${preview}"
    exit 12
  fi
  login_code_value_raw="$(redis_raw GET "captcha_codes:${captcha_uuid}" 2>/dev/null || true)"
  login_code_value="$(normalize_redis_value "${login_code_value_raw}" || true)"
  if [[ -z "${login_code_value}" ]]; then
    echo "FAIL: 无法从 Redis 解析登录验证码（uuid=${captcha_uuid}）"
    exit 12
  fi
  login_payload="$(jq -cn \
    --arg username "${E2E_ADMIN_USERNAME}" \
    --arg password "${E2E_ADMIN_PASSWORD}" \
    --arg code "${login_code_value}" \
    --arg uuid "${captcha_uuid}" \
    '{username:$username,password:$password,code:$code,uuid:$uuid}')"
else
  login_payload="$(jq -cn --arg username "${E2E_ADMIN_USERNAME}" --arg password "${E2E_ADMIN_PASSWORD}" '{username:$username,password:$password}')"
fi
login_resp_file="$(mktemp)"
set +e
login_http_code="$(curl -sS --max-time 10 -o "${login_resp_file}" -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -X POST "${login_url}" \
  -d "${login_payload}" 2>&1)"
login_curl_rc=$?
set -e
login_resp_body="$(cat "${login_resp_file}" 2>/dev/null || true)"
rm -f "${login_resp_file}"

if (( login_curl_rc != 0 )); then
  preview="$(echo "${login_http_code}" | head -c 200)"
  echo "FAIL: LOGIN_HTTP_REQUEST_FAILED http_status=unknown rule=LOGIN_HTTP_REQUEST_FAILED response_snippet=${preview}"
  exit 12
fi

if [[ ! "${login_http_code}" =~ ^2[0-9]{2}$ ]]; then
  preview="$(echo "${login_resp_body}" | head -c 200)"
  echo "FAIL: LOGIN_HTTP_NOT_2XX http_status=${login_http_code} rule=LOGIN_HTTP_NOT_2XX response_snippet=${preview}"
  exit 12
fi

login_code="$(echo "${login_resp_body}" | jq -r '.code // empty' 2>/dev/null || true)"
if [[ "${login_code}" != "200" ]]; then
  preview="$(echo "${login_resp_body}" | head -c 200)"
  echo "FAIL: LOGIN_CODE_NOT_200 http_status=${login_http_code} rule=LOGIN_CODE_NOT_200 response_snippet=${preview}"
  exit 12
fi

login_token="$(echo "${login_resp_body}" | jq -r '.token // .data.token // empty' 2>/dev/null || true)"
if [[ -z "${login_token}" ]]; then
  preview="$(echo "${login_resp_body}" | head -c 200)"
  echo "FAIL: LOGIN_TOKEN_MISSING http_status=${login_http_code} rule=LOGIN_TOKEN_MISSING response_snippet=${preview}"
  exit 12
fi

echo "PASS: 登录契约预检通过（token 字段存在）"

echo "--- 8.2 登录锁预检 ---"
ensure_backend_ready
if ! command -v redis-cli >/dev/null 2>&1; then
  echo "FAIL: 环境缺失 redis-cli，无法执行登录锁预检"
  exit 11
fi

build_redis_cmd
unlock_cmd="redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -n ${REDIS_DB}"
if [[ -n "${REDIS_PASSWORD}" ]]; then
  unlock_cmd+=" -a ***"
fi

set +e
redis_ping="$(redis_raw PING 2>&1)"
redis_ping_rc=$?
set -e
if (( redis_ping_rc != 0 )) || [[ "${redis_ping}" != "PONG" ]]; then
  preview="$(echo "${redis_ping}" | head -c 200)"
  echo "FAIL: Redis 不可达或鉴权失败（host=${REDIS_HOST} port=${REDIS_PORT} db=${REDIS_DB}）response_snippet=${preview}"
  exit 11
fi

lock_key="pwd_err_cnt:${E2E_ADMIN_USERNAME}"
set +e
lock_value="$(redis_raw GET "${lock_key}" 2>&1)"
lock_rc=$?
set -e
if (( lock_rc != 0 )); then
  preview="$(echo "${lock_value}" | head -c 200)"
  echo "FAIL: 读取登录锁失败（key=${lock_key}）response_snippet=${preview}"
  exit 11
fi

if [[ -z "${lock_value}" || "${lock_value}" == "(nil)" ]]; then
  lock_value="0"
fi

if [[ "${lock_value}" =~ ^[0-9]+$ ]] && (( lock_value >= 1 )); then
  echo "FAIL: 登录锁命中（key=${lock_key} value=${lock_value}）rule=PWD_ERR_LOCK_HIT"
  echo "INFO: 解锁命令模板: ${unlock_cmd} DEL ${lock_key}"
  exit 12
fi

if [[ ! "${lock_value}" =~ ^[0-9]+$ ]]; then
  echo "FAIL: 登录锁值格式异常（key=${lock_key} value=${lock_value}）"
  exit 12
fi

echo "PASS: 登录锁预检通过（key=${lock_key} value=${lock_value}）"

echo "--- 8.25 安全契约守卫 ---"
set +e
security_guard_output="$(python3 .claude/skills/workflow-engine/tests/security_contract_guard.py \
  --contract contracts/security-contract.yaml \
  --stage final-gate \
  --audit "${SECURITY_CONTRACT_LOG}" 2>&1)"
security_guard_rc=$?
set -e

if (( security_guard_rc != 0 )); then
  first_finding="$(echo "${security_guard_output}" | grep -m1 -E '^\[|^FAIL:' || true)"
  if [[ -z "${first_finding}" ]]; then
    first_finding="$(echo "${security_guard_output}" | head -n1)"
  fi
  echo "FAIL: SECURITY_CONTRACT_GUARD rule=SECURITY_CONTRACT_GUARD ${first_finding}"
  exit 12
fi
echo "PASS: 安全契约守卫通过，审计产物=${SECURITY_CONTRACT_LOG}"

echo "--- 8.3 验证码基线守卫 ---"
ensure_backend_ready
captcha_resp=""
if ! captcha_resp="$(curl -sS --max-time 10 "${BASE_URL}/captchaImage" 2>&1)"; then
  if [[ -n "${CAPTCHA_EXPECTED}" ]]; then
    echo "FAIL: /captchaImage 请求失败，且设置了 CAPTCHA_EXPECTED=${CAPTCHA_EXPECTED}: ${captcha_resp}"
    exit 23
  fi
  echo "WARNING: /captchaImage 请求失败（未设置 CAPTCHA_EXPECTED，跳过强校验）: ${captcha_resp}"
  captcha_resp=""
fi
captcha_enabled="$(echo "${captcha_resp}" | jq -r 'if has("captchaEnabled") then (.captchaEnabled|tostring) else empty end' 2>/dev/null || true)"
if [[ -z "${captcha_enabled}" ]]; then
  if [[ -n "${CAPTCHA_EXPECTED}" ]]; then
    preview="$(echo "${captcha_resp}" | head -c 200)"
    echo "FAIL: 无法从 /captchaImage 解析 captchaEnabled，且设置了 CAPTCHA_EXPECTED=${CAPTCHA_EXPECTED}，响应片段=${preview}"
    exit 23
  fi
  echo "WARNING: 无法解析 /captchaImage.captchaEnabled（未设置 CAPTCHA_EXPECTED，跳过强校验）"
else
  if [[ -z "${CAPTCHA_EXPECTED}" ]]; then
    echo "INFO: captchaEnabled=${captcha_enabled}（CAPTCHA_EXPECTED 未设置，跳过强校验）"
  else
    if [[ "${CAPTCHA_EXPECTED}" != "true" && "${CAPTCHA_EXPECTED}" != "false" ]]; then
      echo "FAIL: CAPTCHA_EXPECTED 仅允许 true|false，当前=${CAPTCHA_EXPECTED}"
      exit 23
    fi
    if [[ "${captcha_enabled}" != "${CAPTCHA_EXPECTED}" ]]; then
      echo "FAIL: 验证码基线不匹配，expected=${CAPTCHA_EXPECTED} actual=${captcha_enabled}"
      exit 23
    fi
    echo "PASS: 验证码基线通过，captchaEnabled=${captcha_enabled}"
  fi
fi

echo "--- 9. E2E 全量 ---"
ensure_backend_ready
BASE_URL="${BASE_URL}" E2E_API_GATE_LOG="${E2E_API_GATE_LOG}" \
  bash bin/e2e-api-gate.sh "${MODULE}" "full"

echo "--- 9.1 behavior_contract_guard ---"
python3 .claude/skills/workflow-engine/tests/behavior_contract_guard.py \
  --contract "osg-spec-docs/docs/01-product/prd/${MODULE}/DELIVERY-CONTRACT.yaml" \
  --report "${BEHAVIOR_CONTRACT_REPORT}" \
  --stage final-gate

echo "=== Final Gate: 完成（检查上方是否有 WARNING 标记） ==="
