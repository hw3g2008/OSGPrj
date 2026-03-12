#!/usr/bin/env bash
# API 冒烟测试 — 单入口脚本
# 用法: bash bin/api-smoke.sh <module> [story]
# 退出码: 0=全通过, 2=参数错误, 3=依赖缺失, 4=HTTP状态码失败, 5=业务字段失败
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE="${1:-}"
STORY="${2:-all}"
BACKEND_PORT="${BACKEND_PORT:-}"
HEALTH_PATH="${HEALTH_PATH:-/actuator/health}"
BASE_URL="${BASE_URL:-}"
BASE_HEALTH_URL="${BASE_HEALTH_URL:-}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
SMOKE_EXIT=0
SMOKE_DETAIL=""

load_runtime_contract() {
  local resolved_contract_file="${RUNTIME_CONTRACT_FILE:-}"
  local resolved_scan_dir="${RUNTIME_CONTRACT_SCAN_DIR:-deploy}"
  local resolved_output

  resolved_output="$(
    RUNTIME_CONTRACT_SCAN_DIR="${resolved_scan_dir}" \
    bash "${SCRIPT_DIR}/resolve-runtime-contract.sh" "${resolved_contract_file}" 2>/dev/null
  )" || return 1

  eval "${resolved_output}"

  BACKEND_PORT="${BACKEND_PORT:-${RESOLVED_BACKEND_PORT:-}}"
  BASE_URL="${BASE_URL:-${RESOLVED_BASE_URL:-}}"
  BASE_HEALTH_URL="${BASE_HEALTH_URL:-${RESOLVED_BASE_HEALTH_URL:-}}"
}

load_runtime_contract || true
BACKEND_PORT="${BACKEND_PORT:-8080}"

if [[ -z "${BASE_URL}" ]]; then
  if [[ -n "${BASE_HEALTH_URL}" ]]; then
    case "${BASE_HEALTH_URL}" in
      */actuator/health) BASE_URL="${BASE_HEALTH_URL%/actuator/health}" ;;
      *) BASE_URL="http://127.0.0.1:${BACKEND_PORT}" ;;
    esac
  else
    BASE_URL="http://127.0.0.1:${BACKEND_PORT}"
  fi
fi

HEALTH_URL="${BASE_HEALTH_URL:-${BASE_URL}${HEALTH_PATH}}"

# --- 审计报告 trap（成功/失败都落盘）---
REPORT_DIR="osg-spec-docs/tasks/audit"
REPORT="${REPORT_DIR}/api-smoke-${MODULE:-unknown}-${STORY}-$(date +%Y-%m-%d).md"

finalize_report() {
  local status="PASS"
  [[ "${SMOKE_EXIT}" -ne 0 ]] && status="FAIL(exit=${SMOKE_EXIT})"
  mkdir -p "${REPORT_DIR}"
  cat > "${REPORT}" << REOF
# API Smoke — ${MODULE:-unknown} ${STORY} $(date +%Y-%m-%d)

> 生成时间: $(date +%Y-%m-%dT%H:%M:%S%z)

## 结果: ${status}

## 参数
- module: ${MODULE:-unknown}
- story: ${STORY}
- base_url: ${BASE_URL}
- health_path: ${HEALTH_PATH}

## 详情
${SMOKE_DETAIL}
REOF
  echo "审计报告已生成: ${REPORT}"
}
trap finalize_report EXIT

# --- 参数校验 ---
if [[ -z "${MODULE}" ]]; then
  SMOKE_DETAIL="参数错误: module 未指定"
  SMOKE_EXIT=2
  echo "usage: bash bin/api-smoke.sh <module> [story]"
  exit 2
fi

# --- 依赖检查 ---
command -v curl >/dev/null || { SMOKE_DETAIL="依赖缺失: curl"; SMOKE_EXIT=3; exit 3; }
command -v jq >/dev/null || { SMOKE_DETAIL="依赖缺失: jq"; SMOKE_EXIT=3; exit 3; }

echo "=== API Smoke: module=${MODULE}, story=${STORY}, base=${BASE_URL} ==="

# --- 健康检查 ---
resp="$(curl -sS -w '\n%{http_code}' "${HEALTH_URL}" 2>/dev/null || true)"
body="$(echo "${resp}" | head -n1)"
code="$(echo "${resp}" | tail -n1)"

if [[ "${code}" != "200" ]]; then
  SMOKE_DETAIL="$(printf "健康检查失败\n- endpoint: ${HEALTH_PATH}\n- expected: 200\n- actual: ${code}\n- body: ${body}")"
  SMOKE_EXIT=4
  echo "FAIL: ${HEALTH_PATH} 返回 ${code}（期望 200）"
  exit 4
fi

SMOKE_DETAIL="$(printf "健康检查通过\n- ${HEALTH_PATH} = 200")"
echo "PASS: ${HEALTH_PATH} = 200"

# TODO: 按 module/story 分发具体 API 检查项（后续扩展为用例清单驱动）

echo "=== API Smoke: 通过 ==="
exit 0
