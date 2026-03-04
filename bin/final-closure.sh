#!/usr/bin/env bash
# Final Closure Orchestrator
# 用法:
#   bash bin/final-closure.sh [module] [--cc-mode optional|required|off] [--backend-policy auto|docker_only]
# 退出码:
#   0  = PASS / PARTIAL
#   10 = 前置状态不满足
#   11 = 环境准备失败（后端未就绪）
#   12 = final-gate 失败或命中业务 WARNING
#   13 = 审计校验失败
#   14 = CC 复核失败（required）
#   15 = 产物收集/报告失败
#   16 = module 参数无效或模块测试资产缺失
set -euo pipefail

STATE_FILE="osg-spec-docs/tasks/STATE.yaml"
AUDIT_DIR="osg-spec-docs/tasks/audit"
BACKEND_PORT="${BACKEND_PORT:-8080}"
HEALTH_PATH="${HEALTH_PATH:-/actuator/health}"
BASE_URL="${BASE_URL:-}"
BASE_HEALTH_URL="${BASE_HEALTH_URL:-}"
BACKEND_READY_TIMEOUT_SECONDS="${BACKEND_READY_TIMEOUT_SECONDS:-120}"
MYSQL_INIT_DIR="${MYSQL_INIT_DIR:-deploy/mysql-init}"

MODULE_INPUT=""
CC_MODE="optional"
BACKEND_POLICY="${BACKEND_POLICY:-auto}"

usage() {
  cat <<'EOF'
用法:
  bash bin/final-closure.sh [module] [--cc-mode optional|required|off] [--backend-policy auto|docker_only]

说明:
  - module 为空时回退 STATE.current_requirement
  - 默认 cc-mode=optional
  - 默认 backend-policy=auto（后端不可达时优先 Docker，失败再回退本地启动）
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --cc-mode)
      if [[ $# -lt 2 ]]; then
        echo "FAIL: --cc-mode 缺少参数"
        exit 16
      fi
      CC_MODE="$2"
      shift 2
      ;;
    --cc-mode=*)
      CC_MODE="${1#*=}"
      shift
      ;;
    --backend-policy)
      if [[ $# -lt 2 ]]; then
        echo "FAIL: --backend-policy 缺少参数"
        exit 16
      fi
      BACKEND_POLICY="$2"
      shift 2
      ;;
    --backend-policy=*)
      BACKEND_POLICY="${1#*=}"
      shift
      ;;
    *)
      if [[ -z "${MODULE_INPUT}" ]]; then
        MODULE_INPUT="$1"
        shift
      else
        echo "FAIL: 未识别参数 '$1'"
        exit 16
      fi
      ;;
  esac
done

case "${CC_MODE}" in
  optional|required|off) ;;
  *)
    echo "FAIL: --cc-mode 仅支持 optional|required|off，当前='${CC_MODE}'"
    exit 16
    ;;
esac

case "${BACKEND_POLICY}" in
  auto|docker_only) ;;
  *)
    echo "FAIL: --backend-policy 仅支持 auto|docker_only，当前='${BACKEND_POLICY}'"
    exit 16
    ;;
esac

BACKEND_MODE="external"
BACK_PID=""
CLEANUP_WARN=""
CC_STATUS="skipped"
FINAL_GATE_LOG=""
E2E_API_GATE_LOG=""
SECURITY_CONTRACT_LOG=""
UI_VISUAL_GATE_LOG=""
SECURITY_FIRST_FAILURE_EVIDENCE="none"
FINAL_CLOSURE_REPORT=""
DATE_STR="$(date +%Y-%m-%d)"
MODULE=""
DOCKER_RUN_CMD="${DOCKER_RUN_CMD:-}"
DOCKER_BOOT_LOG=""

cleanup_backend() {
  if [[ "${BACKEND_MODE}" == "managed" && -n "${BACK_PID}" ]]; then
    if kill "${BACK_PID}" >/dev/null 2>&1; then
      echo "INFO: 已停止托管后端进程 PID=${BACK_PID}"
    else
      CLEANUP_WARN="后端托管进程清理失败（PID=${BACK_PID}）"
      echo "WARNING: ${CLEANUP_WARN}"
    fi
  fi
}

write_failure_report() {
  local code="$1"
  local msg="$2"

  if [[ -z "${FINAL_CLOSURE_REPORT}" ]]; then
    return 0
  fi

  local failure_conclusion="FAIL"
  if [[ "${code}" == "10" || "${code}" == "11" ]]; then
    failure_conclusion="BLOCKED"
  fi

  local first_failure="none"
  local first_proxy="none"
  local security_first="none"
  local visual_first="none"
  if [[ -n "${FINAL_GATE_LOG}" && -f "${FINAL_GATE_LOG}" ]]; then
    first_failure="$(grep -m1 -E '^FAIL:' "${FINAL_GATE_LOG}" || true)"
    first_proxy="$(grep -m1 -Ei 'proxy error|connect ECONNREFUSED|ECONNREFUSED' "${FINAL_GATE_LOG}" || true)"
  fi
  if [[ -z "${first_failure}" && -n "${E2E_API_GATE_LOG}" && -f "${E2E_API_GATE_LOG}" ]]; then
    first_failure="$(grep -m1 -E '^FAIL:' "${E2E_API_GATE_LOG}" || true)"
  fi
  if [[ -z "${first_proxy}" && -n "${E2E_API_GATE_LOG}" && -f "${E2E_API_GATE_LOG}" ]]; then
    first_proxy="$(grep -m1 -Ei 'proxy error|connect ECONNREFUSED|ECONNREFUSED' "${E2E_API_GATE_LOG}" || true)"
  fi
  if [[ -z "${first_failure}" ]]; then
    first_failure="none"
  fi
  if [[ -z "${first_proxy}" ]]; then
    first_proxy="none"
  fi
  if [[ -n "${SECURITY_CONTRACT_LOG}" && -f "${SECURITY_CONTRACT_LOG}" ]]; then
    security_first="$(grep -m1 -E '^\d+\. \[(HIGH|MEDIUM|LOW)\]|^FAIL:' "${SECURITY_CONTRACT_LOG}" || true)"
    if [[ -z "${security_first}" ]]; then
      security_first="none"
    fi
  fi
  if [[ -n "${UI_VISUAL_GATE_LOG}" && -f "${UI_VISUAL_GATE_LOG}" ]]; then
    visual_first="$(grep -m1 -E '^VISUAL_FAIL:|^FAIL:' "${UI_VISUAL_GATE_LOG}" || true)"
    if [[ -z "${visual_first}" ]]; then
      visual_first="none"
    fi
  fi

  {
    echo "# Final Closure — ${MODULE:-unknown} ${DATE_STR}"
    echo
    echo "## 结论: ${failure_conclusion}"
    echo
    echo "## 失败原因"
    echo "- exit_code: ${code}"
    echo "- message: ${msg}"
    echo
    echo "## 审计字段"
    if [[ -n "${FINAL_GATE_LOG}" ]]; then
      echo "- final_gate_log: ${FINAL_GATE_LOG}"
    fi
    if [[ -n "${E2E_API_GATE_LOG}" ]]; then
      echo "- e2e_api_gate_log: ${E2E_API_GATE_LOG}"
    fi
    if [[ -n "${SECURITY_CONTRACT_LOG}" ]]; then
      echo "- security_contract_log: ${SECURITY_CONTRACT_LOG}"
      echo "- security_first_failure_evidence: ${security_first}"
    fi
    if [[ -n "${UI_VISUAL_GATE_LOG}" ]]; then
      echo "- ui_visual_gate_log: ${UI_VISUAL_GATE_LOG}"
      echo "- ui_visual_first_failure_evidence: ${visual_first}"
    fi
    echo "- first_failure_evidence: ${first_failure}"
    echo "- first_proxy_error_evidence: ${first_proxy}"
  } > "${FINAL_CLOSURE_REPORT}" 2>/dev/null || true
}

fail_exit() {
  local code="$1"
  local msg="$2"
  echo "FAIL: ${msg}"
  write_failure_report "${code}" "${msg}"
  cleanup_backend
  exit "${code}"
}

resolve_docker_run_cmd() {
  if [[ -n "${DOCKER_RUN_CMD}" ]]; then
    echo "${DOCKER_RUN_CMD}"
    return 0
  fi
  python3 - <<'PY'
import yaml
from pathlib import Path
p = Path(".claude/project/config.yaml")
if not p.exists():
    print("")
else:
    data = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    print((((data.get("commands") or {}).get("ops") or {}).get("docker_run")) or "")
PY
}

docker_backend_healthy() {
  local env_file="deploy/.env.test"
  if [[ ! -f "${env_file}" ]]; then
    env_file="deploy/.env.test.example"
  fi
  if [[ ! -f "${env_file}" ]]; then
    return 1
  fi

  local cid
  cid="$(docker compose \
    -f deploy/compose.base.yml \
    -f deploy/compose.test.yml \
    --env-file "${env_file}" \
    ps -q backend 2>/dev/null || true)"
  if [[ -z "${cid}" ]]; then
    return 1
  fi

  local status health
  status="$(docker inspect -f '{{.State.Status}}' "${cid}" 2>/dev/null || true)"
  health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "${cid}" 2>/dev/null || true)"
  if [[ "${status}" != "running" ]]; then
    return 1
  fi
  if [[ -n "${health}" && "${health}" != "healthy" ]]; then
    return 1
  fi
  return 0
}

check_mysql_init_dir() {
  if [[ ! -d "${MYSQL_INIT_DIR}" ]]; then
    echo "mysql-init 目录不存在: ${MYSQL_INIT_DIR}"
    return 1
  fi

  if [[ -z "$(find "${MYSQL_INIT_DIR}" -maxdepth 1 -type f -print -quit 2>/dev/null)" ]]; then
    echo "mysql-init 目录为空: ${MYSQL_INIT_DIR}"
    return 1
  fi
}

resolve_backend_urls() {
  local base_url_default="http://127.0.0.1:${BACKEND_PORT}"
  if [[ -n "${BASE_HEALTH_URL}" ]]; then
    if [[ -z "${BASE_URL}" ]]; then
      case "${BASE_HEALTH_URL}" in
        */actuator/health) BASE_URL="${BASE_HEALTH_URL%/actuator/health}" ;;
      esac
    fi
  elif [[ -n "${BASE_URL}" ]]; then
    BASE_HEALTH_URL="${BASE_URL}${HEALTH_PATH}"
  else
    local candidate_urls=(
      "http://127.0.0.1:28080${HEALTH_PATH}"
      "${base_url_default}${HEALTH_PATH}"
    )
    local candidate
    for candidate in "${candidate_urls[@]}"; do
      if curl -fsS --max-time 2 "${candidate}" >/dev/null 2>&1; then
        BASE_HEALTH_URL="${candidate}"
        break
      fi
    done
    if [[ -z "${BASE_HEALTH_URL}" ]]; then
      BASE_HEALTH_URL="${base_url_default}${HEALTH_PATH}"
    fi
    case "${BASE_HEALTH_URL}" in
      */actuator/health) BASE_URL="${BASE_HEALTH_URL%/actuator/health}" ;;
    esac
  fi

  if [[ -z "${BASE_URL}" ]]; then
    BASE_URL="${base_url_default}"
  fi
}

if [[ ! -f "${STATE_FILE}" ]]; then
  fail_exit 10 "STATE 文件不存在: ${STATE_FILE}"
fi

CURRENT_STEP="$(python3 - <<'PY'
import yaml
from pathlib import Path
p = Path("osg-spec-docs/tasks/STATE.yaml")
data = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
print((data.get("workflow", {}) or {}).get("current_step", ""))
PY
)"

CURRENT_REQUIREMENT="$(python3 - <<'PY'
import yaml
from pathlib import Path
p = Path("osg-spec-docs/tasks/STATE.yaml")
data = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
print(data.get("current_requirement", "") or "")
PY
)"

if [[ "${CURRENT_STEP}" != "all_stories_done" ]]; then
  fail_exit 10 "workflow.current_step='${CURRENT_STEP}'，非 all_stories_done"
fi

MODULE="${MODULE_INPUT:-${CURRENT_REQUIREMENT}}"
if [[ -z "${MODULE}" || "${MODULE}" == "null" ]]; then
  fail_exit 16 "module 为空，且 STATE.current_requirement 不可用"
fi

CASES_FILE="osg-spec-docs/tasks/testing/${MODULE}-test-cases.yaml"
MATRIX_FILE="osg-spec-docs/tasks/testing/${MODULE}-traceability-matrix.md"
if [[ ! -f "${CASES_FILE}" || ! -f "${MATRIX_FILE}" ]]; then
  fail_exit 16 "模块测试资产缺失: ${CASES_FILE} / ${MATRIX_FILE}"
fi

mkdir -p "${AUDIT_DIR}"
FINAL_GATE_LOG="${AUDIT_DIR}/final-gate-${MODULE}-${DATE_STR}.log"
E2E_API_GATE_LOG="${AUDIT_DIR}/e2e-api-gate-${MODULE}-${DATE_STR}.log"
SECURITY_CONTRACT_LOG="${AUDIT_DIR}/security-contract-${MODULE}-${DATE_STR}.md"
UI_VISUAL_GATE_LOG="${AUDIT_DIR}/ui-visual-gate-${MODULE}-${DATE_STR}.log"
FINAL_CLOSURE_REPORT="${AUDIT_DIR}/final-closure-${MODULE}-${DATE_STR}.md"
resolve_backend_urls

echo "=== Final Closure: module=${MODULE}, cc_mode=${CC_MODE} ==="
echo "INFO: backend base=${BASE_URL}, health=${BASE_HEALTH_URL}"

# Step 1: 环境准备
EXTERNAL_HEALTHY="no"
if curl -fsS --max-time 5 "${BASE_HEALTH_URL}" >/dev/null 2>&1; then
  EXTERNAL_HEALTHY="yes"
fi

if [[ "${BACKEND_POLICY}" != "docker_only" && "${EXTERNAL_HEALTHY}" == "yes" ]]; then
  BACKEND_MODE="external"
  echo "INFO: 复用外部后端 (${BASE_HEALTH_URL})"
else
  if [[ "${BACKEND_POLICY}" == "docker_only" && "${EXTERNAL_HEALTHY}" == "yes" ]]; then
    if docker_backend_healthy; then
      BACKEND_MODE="docker"
      echo "INFO: backend-policy=docker_only，检测到 Docker backend 已健康，复用现有 Docker 环境"
    else
      echo "INFO: backend-policy=docker_only，忽略外部后端探测结果，强制执行 Docker 启动路径"
    fi
  fi
  if [[ "${BACKEND_MODE}" != "docker" ]]; then
    DOCKER_CMD="$(resolve_docker_run_cmd)"
    DOCKER_AVAILABLE="yes"
    DOCKER_BLOCK_REASON=""
    if [[ -z "${DOCKER_CMD}" ]]; then
      DOCKER_AVAILABLE="no"
      DOCKER_BLOCK_REASON="未配置 Docker 启动命令（DOCKER_RUN_CMD 或 config.commands.ops.docker_run）"
    elif ! command -v docker >/dev/null 2>&1; then
      DOCKER_AVAILABLE="no"
      DOCKER_BLOCK_REASON="未检测到 docker 命令（要求 docker compose v2）"
    elif ! docker compose version >/dev/null 2>&1; then
      DOCKER_AVAILABLE="no"
      DOCKER_BLOCK_REASON="未检测到 Docker Compose Plugin v2（docker compose）"
    fi

    if [[ "${DOCKER_AVAILABLE}" == "yes" ]]; then
      MYSQL_INIT_PRECHECK_ERR=""
      if ! MYSQL_INIT_PRECHECK_ERR="$(check_mysql_init_dir)"; then
        if [[ "${BACKEND_POLICY}" == "docker_only" ]]; then
          fail_exit 11 "Docker preflight 失败（${MYSQL_INIT_PRECHECK_ERR}）"
        fi
        DOCKER_AVAILABLE="no"
        DOCKER_BLOCK_REASON="Docker preflight 未通过（${MYSQL_INIT_PRECHECK_ERR}）"
      fi
    fi

    if [[ "${DOCKER_AVAILABLE}" == "yes" ]]; then
      echo "INFO: 后端不可达，执行 Docker 启动命令: ${DOCKER_CMD}"
      DOCKER_BOOT_LOG="${AUDIT_DIR}/final-closure-docker-boot-${MODULE}-${DATE_STR}.log"
      set +e
      bash -lc "${DOCKER_CMD}" > "${DOCKER_BOOT_LOG}" 2>&1
      docker_rc=$?
      set -e
      if (( docker_rc != 0 )); then
        if [[ "${BACKEND_POLICY}" == "docker_only" ]]; then
          fail_exit 11 "Docker 启动命令失败（exit=${docker_rc}），日志: ${DOCKER_BOOT_LOG}"
        fi
        echo "WARNING: Docker 启动失败（exit=${docker_rc}），回退本地托管后端，日志: ${DOCKER_BOOT_LOG}"
        BACKEND_MODE="managed"
        echo "INFO: 启动托管后端..."
        mvn -pl ruoyi-admin -am spring-boot:run >/tmp/osg-backend.log 2>&1 &
        BACK_PID=$!
        echo "INFO: 后端 PID=${BACK_PID}，日志=/tmp/osg-backend.log"
      else
        BACKEND_MODE="docker"
        echo "INFO: Docker 启动命令执行成功，继续等待健康检查"
      fi
    else
      if [[ "${BACKEND_POLICY}" == "docker_only" ]]; then
        fail_exit 11 "backend-policy=docker_only 且 ${DOCKER_BLOCK_REASON}"
      fi
      echo "INFO: Docker 路径不可用（${DOCKER_BLOCK_REASON}），回退本地托管后端"
      BACKEND_MODE="managed"
      echo "INFO: 启动托管后端..."
      mvn -pl ruoyi-admin -am spring-boot:run >/tmp/osg-backend.log 2>&1 &
      BACK_PID=$!
      echo "INFO: 后端 PID=${BACK_PID}，日志=/tmp/osg-backend.log"
    fi
  fi
fi

start_ts="$(date +%s)"
while ! curl -fsS --max-time 5 "${BASE_HEALTH_URL}" >/dev/null 2>&1; do
  now_ts="$(date +%s)"
  if (( now_ts - start_ts >= BACKEND_READY_TIMEOUT_SECONDS )); then
    fail_exit 11 "后端健康检查超时（${BACKEND_READY_TIMEOUT_SECONDS}s）"
  fi
  sleep 2
done
echo "INFO: 后端健康检查通过"

# Step 2: 门禁执行 + WARNING 兜底
set +e
BASE_URL="${BASE_URL}" HEALTH_PATH="${HEALTH_PATH}" BASE_HEALTH_URL="${BASE_HEALTH_URL}" \
  E2E_API_GATE_LOG="${E2E_API_GATE_LOG}" \
  UI_VISUAL_GATE_LOG="${UI_VISUAL_GATE_LOG}" \
  CAPTCHA_EXPECTED="${CAPTCHA_EXPECTED:-}" \
  bash bin/final-gate.sh "${MODULE}" 2>&1 | tee "${FINAL_GATE_LOG}"
gate_rc=${PIPESTATUS[0]}
set -e

if (( gate_rc != 0 )); then
  fail_exit 12 "final-gate 失败（exit=${gate_rc}）"
fi

if grep -Eq '⚠️ WARNING: 后端未启动|⚠️ @api E2E 已跳过' "${FINAL_GATE_LOG}"; then
  fail_exit 12 "命中 final-gate 业务 WARNING（后端未启动或 @api E2E 跳过）"
fi

if grep -Eiq 'http proxy error|connect ECONNREFUSED|ECONNREFUSED|proxy error' "${FINAL_GATE_LOG}"; then
  fail_exit 12 "命中 final-gate 代理/后端连通性错误（proxy error / ECONNREFUSED）"
fi

echo "INFO: final-gate 通过且无业务 WARNING"

CAPTCHA_EVIDENCE="$(grep -E 'PASS: 验证码基线通过|INFO: captchaEnabled=.*CAPTCHA_EXPECTED|FAIL: 验证码基线不匹配|FAIL: /captchaImage 请求失败|FAIL: 无法从 /captchaImage 解析 captchaEnabled|WARNING: /captchaImage 请求失败|WARNING: 无法解析 /captchaImage.captchaEnabled' "${FINAL_GATE_LOG}" | tail -n 1 || true)"
if [[ -z "${CAPTCHA_EVIDENCE}" ]]; then
  CAPTCHA_EVIDENCE="none"
fi

FIRST_FAILURE_EVIDENCE="none"
FIRST_PROXY_ERROR_EVIDENCE="none"
if [[ -f "${FINAL_GATE_LOG}" ]]; then
  FIRST_FAILURE_EVIDENCE="$(grep -m1 -E '^FAIL:' "${FINAL_GATE_LOG}" || true)"
  FIRST_PROXY_ERROR_EVIDENCE="$(grep -m1 -Ei 'proxy error|connect ECONNREFUSED|ECONNREFUSED' "${FINAL_GATE_LOG}" || true)"
fi
if [[ -z "${FIRST_FAILURE_EVIDENCE}" && -f "${E2E_API_GATE_LOG}" ]]; then
  FIRST_FAILURE_EVIDENCE="$(grep -m1 -E '^FAIL:' "${E2E_API_GATE_LOG}" || true)"
fi
if [[ -z "${FIRST_PROXY_ERROR_EVIDENCE}" && -f "${E2E_API_GATE_LOG}" ]]; then
  FIRST_PROXY_ERROR_EVIDENCE="$(grep -m1 -Ei 'proxy error|connect ECONNREFUSED|ECONNREFUSED' "${E2E_API_GATE_LOG}" || true)"
fi
if [[ -z "${FIRST_FAILURE_EVIDENCE}" ]]; then
  FIRST_FAILURE_EVIDENCE="none"
fi
if [[ -z "${FIRST_PROXY_ERROR_EVIDENCE}" ]]; then
  FIRST_PROXY_ERROR_EVIDENCE="none"
fi

# Step 3: 审计校验
if ! python3 .claude/skills/workflow-engine/tests/traceability_guard.py \
  --cases "${CASES_FILE}" \
  --matrix "${MATRIX_FILE}"; then
  fail_exit 13 "traceability_guard 失败"
fi

if ! python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py; then
  fail_exit 13 "story_integration_assertions 失败"
fi

echo "INFO: 审计校验通过"

# Step 4: CC 复核（可选）
CC_LOG="${AUDIT_DIR}/final-closure-cc-${MODULE}-${DATE_STR}.log"
if [[ "${CC_MODE}" == "off" ]]; then
  CC_STATUS="skipped"
  echo "INFO: CC 复核已关闭（cc_mode=off）"
else
  if ! command -v claude >/dev/null 2>&1; then
    if [[ "${CC_MODE}" == "required" ]]; then
      fail_exit 14 "cc_mode=required 但未找到 claude 命令"
    fi
    CC_STATUS="optional_failed_no_claude"
    echo "WARNING: cc_mode=optional，未找到 claude 命令，继续执行"
  else
    read -r -d '' CC_PROMPT <<EOF || true
模块最终收尾复核：${MODULE}

请基于以下信息判断 PASS/PARTIAL/FAIL，并给出问题列表：
1) STATE:
$(cat "${STATE_FILE}")

2) Final Gate 末尾日志:
$(tail -n 80 "${FINAL_GATE_LOG}" 2>/dev/null || true)

3) 核对重点:
- 是否存在 WARNING/SKIP
- AC→TC 追踪是否完整
- 关键验证链路是否闭合
EOF

    set +e
    claude -p "${CC_PROMPT}" > "${CC_LOG}" 2>&1
    cc_rc=$?
    set -e
    if (( cc_rc != 0 )); then
      if [[ "${CC_MODE}" == "required" ]]; then
        fail_exit 14 "cc_mode=required 且 CC 复核失败（exit=${cc_rc}）"
      fi
      CC_STATUS="optional_failed"
      echo "WARNING: cc_mode=optional，CC 复核失败（exit=${cc_rc}）"
    else
      CC_STATUS="passed"
      echo "INFO: CC 复核完成"
    fi
  fi
fi

# Step 5: 产物收集检查
if [[ ! -f "${FINAL_GATE_LOG}" ]]; then
  fail_exit 15 "缺少 final-gate 日志产物: ${FINAL_GATE_LOG}"
fi

if [[ ! -f "${E2E_API_GATE_LOG}" ]]; then
  fail_exit 15 "缺少 e2e-api-gate 日志产物: ${E2E_API_GATE_LOG}"
fi

if [[ ! -f "${SECURITY_CONTRACT_LOG}" ]]; then
  fail_exit 15 "缺少 security-contract 审计产物: ${SECURITY_CONTRACT_LOG}"
fi

if [[ ! -f "${UI_VISUAL_GATE_LOG}" ]]; then
  fail_exit 15 "缺少 ui-visual-gate 审计产物: ${UI_VISUAL_GATE_LOG}"
fi

API_SMOKE_REPORT="$(ls -t ${AUDIT_DIR}/api-smoke-${MODULE}-*.md 2>/dev/null | head -n1 || true)"
if [[ -z "${API_SMOKE_REPORT}" ]]; then
  fail_exit 15 "缺少 api-smoke 审计产物（模块=${MODULE}）"
fi

PLAYWRIGHT_REPORT_DIR="osg-frontend/playwright-report"
if [[ ! -d "${PLAYWRIGHT_REPORT_DIR}" ]]; then
  fail_exit 15 "缺少 E2E 报告目录: ${PLAYWRIGHT_REPORT_DIR}"
fi

if [[ -n "${DOCKER_BOOT_LOG}" && ! -f "${DOCKER_BOOT_LOG}" ]]; then
  fail_exit 15 "缺少 Docker 启动日志产物: ${DOCKER_BOOT_LOG}"
fi

# Step 6: 环境清理
cleanup_backend

# Step 7: 输出结论与收尾报告
CONCLUSION="PASS"
if [[ "${CC_STATUS}" == optional_failed* || -n "${CLEANUP_WARN}" ]]; then
  CONCLUSION="PARTIAL"
fi

{
  echo "# Final Closure — ${MODULE} ${DATE_STR}"
  echo
  echo "## 结论: ${CONCLUSION}"
  echo
  echo "## 参数"
  echo "- module: ${MODULE}"
  echo "- cc_mode: ${CC_MODE}"
  echo "- backend_policy: ${BACKEND_POLICY}"
  echo "- backend_mode: ${BACKEND_MODE}"
  echo "- base_url: ${BASE_URL}"
  echo "- base_health_url: ${BASE_HEALTH_URL}"
  echo
  echo "## 关键产物"
  echo "- final_gate_log: ${FINAL_GATE_LOG}"
  echo "- e2e_api_gate_log: ${E2E_API_GATE_LOG}"
  echo "- security_contract_log: ${SECURITY_CONTRACT_LOG}"
  echo "- ui_visual_gate_log: ${UI_VISUAL_GATE_LOG}"
  echo "- api_smoke_report: ${API_SMOKE_REPORT}"
  echo "- playwright_report_dir: ${PLAYWRIGHT_REPORT_DIR}"
  if [[ -n "${DOCKER_BOOT_LOG}" ]]; then
    echo "- docker_boot_log: ${DOCKER_BOOT_LOG}"
  fi
  if [[ -f "${CC_LOG}" ]]; then
    echo "- cc_log: ${CC_LOG}"
  fi
  echo
  echo "## 状态"
  echo "- cc_status: ${CC_STATUS}"
  echo "- captcha_expected: ${CAPTCHA_EXPECTED:-none}"
  echo "- captcha_evidence: ${CAPTCHA_EVIDENCE}"
  if [[ -f "${SECURITY_CONTRACT_LOG}" ]]; then
    SECURITY_FIRST_FAILURE_EVIDENCE="$(grep -m1 -E '^\d+\. \[(HIGH|MEDIUM|LOW)\]|^FAIL:' "${SECURITY_CONTRACT_LOG}" || true)"
    if [[ -z "${SECURITY_FIRST_FAILURE_EVIDENCE}" ]]; then
      SECURITY_FIRST_FAILURE_EVIDENCE="none"
    fi
  fi
  UI_VISUAL_FIRST_FAILURE_EVIDENCE="none"
  if [[ -f "${UI_VISUAL_GATE_LOG}" ]]; then
    UI_VISUAL_FIRST_FAILURE_EVIDENCE="$(grep -m1 -E '^VISUAL_FAIL:|^FAIL:' "${UI_VISUAL_GATE_LOG}" || true)"
    if [[ -z "${UI_VISUAL_FIRST_FAILURE_EVIDENCE}" ]]; then
      UI_VISUAL_FIRST_FAILURE_EVIDENCE="none"
    fi
  fi
  echo "- security_first_failure_evidence: ${SECURITY_FIRST_FAILURE_EVIDENCE}"
  echo "- ui_visual_first_failure_evidence: ${UI_VISUAL_FIRST_FAILURE_EVIDENCE}"
  echo "- first_failure_evidence: ${FIRST_FAILURE_EVIDENCE}"
  echo "- first_proxy_error_evidence: ${FIRST_PROXY_ERROR_EVIDENCE}"
  if [[ -n "${CLEANUP_WARN}" ]]; then
    echo "- cleanup_warning: ${CLEANUP_WARN}"
  else
    echo "- cleanup_warning: none"
  fi
} > "${FINAL_CLOSURE_REPORT}" || fail_exit 15 "写入 final-closure 审计报告失败"

echo "INFO: 审计报告已生成: ${FINAL_CLOSURE_REPORT}"
echo "=== Final Closure 完成: ${CONCLUSION} ==="
exit 0
