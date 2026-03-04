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

BACKEND_PORT="${BACKEND_PORT:-8080}"
HEALTH_PATH="${HEALTH_PATH:-/actuator/health}"
BASE_URL_DEFAULT="http://127.0.0.1:${BACKEND_PORT}"
BASE_URL="${BASE_URL:-}"
HEALTH_URL="${BASE_HEALTH_URL:-}"
CAPTCHA_EXPECTED="${CAPTCHA_EXPECTED:-}"
E2E_ADMIN_USERNAME="${E2E_ADMIN_USERNAME:-admin}"
E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-admin123}"
LOGIN_PATH="${LOGIN_PATH:-/login}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_DB="${REDIS_DB:-0}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
E2E_API_GATE_LOG="${E2E_API_GATE_LOG:-${AUDIT_DIR}/e2e-api-gate-${MODULE}-${DATE_STR}.log}"
SECURITY_CONTRACT_LOG="${SECURITY_CONTRACT_LOG:-${AUDIT_DIR}/security-contract-${MODULE}-${DATE_STR}.md}"
UI_VISUAL_GATE_LOG="${UI_VISUAL_GATE_LOG:-${AUDIT_DIR}/ui-visual-gate-${MODULE}-${DATE_STR}.log}"
UI_VISUAL_PAGE_REPORT="${UI_VISUAL_PAGE_REPORT:-${AUDIT_DIR}/ui-visual-page-report-${MODULE}-${DATE_STR}.json}"

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
  if [[ -n "${HEALTH_URL}" ]]; then
    if [[ -z "${BASE_URL}" ]]; then
      case "${HEALTH_URL}" in
        */actuator/health) BASE_URL="${HEALTH_URL%/actuator/health}" ;;
      esac
    fi
  elif [[ -n "${BASE_URL}" ]]; then
    HEALTH_URL="${BASE_URL}${HEALTH_PATH}"
  else
    local candidate_urls=(
      "http://127.0.0.1:28080${HEALTH_PATH}"
      "${BASE_URL_DEFAULT}${HEALTH_PATH}"
    )
    local candidate
    for candidate in "${candidate_urls[@]}"; do
      if curl -fsS --max-time 2 "${candidate}" >/dev/null 2>&1; then
        HEALTH_URL="${candidate}"
        break
      fi
    done
    if [[ -z "${HEALTH_URL}" ]]; then
      HEALTH_URL="${BASE_URL_DEFAULT}${HEALTH_PATH}"
    fi
    case "${HEALTH_URL}" in
      */actuator/health) BASE_URL="${HEALTH_URL%/actuator/health}" ;;
    esac
  fi

  if [[ -z "${BASE_URL}" ]]; then
    BASE_URL="${BASE_URL_DEFAULT}"
  fi
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
pre_visual_fp="$(mktemp)"
post_visual_fp="$(mktemp)"
write_visual_baseline_fingerprint "${pre_visual_fp}"
UI_VISUAL_GATE_LOG="${UI_VISUAL_GATE_LOG}" \
  bash bin/ui-visual-gate.sh "${MODULE}"
write_visual_baseline_fingerprint "${post_visual_fp}"

if ! diff -q "${pre_visual_fp}" "${post_visual_fp}" >/dev/null 2>&1; then
  echo "FAIL: visual baseline mutated during final-gate run (rule=BASELINE_MUTATED_DURING_GATE)"
  echo "INFO: baseline path=osg-frontend/tests/e2e/visual-baseline"
  diff -u "${pre_visual_fp}" "${post_visual_fp}" | head -n 80 || true
  rm -f "${pre_visual_fp}" "${post_visual_fp}"
  exit 12
fi
rm -f "${pre_visual_fp}" "${post_visual_fp}"

if [[ -f "${UI_VISUAL_PAGE_REPORT}" ]]; then
  python3 - <<PY
import json
from pathlib import Path
report = json.loads(Path("${UI_VISUAL_PAGE_REPORT}").read_text(encoding="utf-8"))
print(
    "INFO: ui_visual_summary "
    f"total={report.get('total_pages', 0)} "
    f"pass={report.get('pass_pages', 0)} "
    f"fail={report.get('fail_pages', 0)} "
    f"style_assertions_passed={report.get('style_assertions_passed', 0)} "
    f"style_assertions_failed={report.get('style_assertions_failed', 0)} "
    f"state_cases_executed={report.get('state_cases_executed', 0)} "
    f"state_cases_failed={report.get('state_cases_failed', 0)}"
)
PY
else
  echo "WARNING: missing ui visual page report: ${UI_VISUAL_PAGE_REPORT}"
fi

echo "--- 5. 前端单测 ---"
pnpm --dir osg-frontend/packages/admin test

echo "--- 6. 前端构建 ---"
pnpm --dir osg-frontend/packages/admin build

echo "--- 7. 后端测试 ---"
mvn test -pl ruoyi-admin -am

echo "--- 8. API 冒烟 ---"
if curl -sS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
  BASE_URL="${BASE_URL}" HEALTH_PATH="${HEALTH_PATH}" BASE_HEALTH_URL="${HEALTH_URL}" \
    bash bin/api-smoke.sh "${MODULE}"
else
  echo "⚠️ WARNING: 后端未启动（${HEALTH_URL} 不可达），跳过 api-smoke"
  echo "⚠️ 此步骤为 SKIP，非 PASS — Final gate 未完整通过"
fi

echo "--- 8.1 登录契约预检 ---"
if curl -sS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
  if [[ "${LOGIN_PATH}" != /* ]]; then
    LOGIN_PATH="/${LOGIN_PATH}"
  fi
  login_url="${BASE_URL}${LOGIN_PATH}"
  login_payload="$(jq -cn --arg username "${E2E_ADMIN_USERNAME}" --arg password "${E2E_ADMIN_PASSWORD}" '{username:$username,password:$password}')"
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
else
  echo "⚠️ WARNING: 后端未启动，跳过登录契约预检"
fi

echo "--- 8.2 登录锁预检 ---"
if curl -sS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
  if ! command -v redis-cli >/dev/null 2>&1; then
    echo "FAIL: 环境缺失 redis-cli，无法执行登录锁预检"
    exit 11
  fi

  redis_cmd=(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -n "${REDIS_DB}" --raw)
  redis_env=()
  unlock_cmd="redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -n ${REDIS_DB}"
  if [[ -n "${REDIS_PASSWORD}" ]]; then
    redis_env+=(REDISCLI_AUTH="${REDIS_PASSWORD}")
    unlock_cmd+=" -a ***"
  fi

  set +e
  if [[ ${#redis_env[@]} -gt 0 ]]; then
    redis_ping="$(env "${redis_env[@]}" "${redis_cmd[@]}" PING 2>&1)"
  else
    redis_ping="$("${redis_cmd[@]}" PING 2>&1)"
  fi
  redis_ping_rc=$?
  set -e
  if (( redis_ping_rc != 0 )) || [[ "${redis_ping}" != "PONG" ]]; then
    preview="$(echo "${redis_ping}" | head -c 200)"
    echo "FAIL: Redis 不可达或鉴权失败（host=${REDIS_HOST} port=${REDIS_PORT} db=${REDIS_DB}）response_snippet=${preview}"
    exit 11
  fi

  lock_key="pwd_err_cnt:${E2E_ADMIN_USERNAME}"
  set +e
  if [[ ${#redis_env[@]} -gt 0 ]]; then
    lock_value="$(env "${redis_env[@]}" "${redis_cmd[@]}" GET "${lock_key}" 2>&1)"
  else
    lock_value="$("${redis_cmd[@]}" GET "${lock_key}" 2>&1)"
  fi
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
else
  echo "⚠️ WARNING: 后端未启动，跳过登录锁预检"
fi

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
if curl -sS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
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
else
  echo "⚠️ WARNING: 后端未启动，跳过验证码基线守卫"
fi

echo "--- 9. E2E 全量 ---"
if curl -sS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
  BASE_URL="${BASE_URL}" E2E_API_GATE_LOG="${E2E_API_GATE_LOG}" \
    bash bin/e2e-api-gate.sh "${MODULE}" "full"
else
  echo "⚠️ WARNING: 后端未启动，仅运行 @ui-only E2E"
  BASE_URL="${BASE_URL}" E2E_API_GATE_LOG="${E2E_API_GATE_LOG}" \
    bash bin/e2e-api-gate.sh "${MODULE}" "ui-only"
  echo "⚠️ @api E2E 已跳过 — Final gate 未完整通过"
fi

echo "=== Final Gate: 完成（检查上方是否有 WARNING 标记） ==="
