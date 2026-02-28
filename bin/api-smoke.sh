#!/usr/bin/env bash
# API 冒烟测试 — 单入口脚本
# 用法: bash bin/api-smoke.sh <module> [story]
# 退出码: 0=全通过, 2=参数错误, 3=依赖缺失, 4=HTTP状态码失败, 5=业务字段失败
set -uo pipefail

MODULE="${1:-}"
STORY="${2:-all}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
SMOKE_EXIT=0
SMOKE_DETAIL=""

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
resp="$(curl -sS -w '\n%{http_code}' "${BASE_URL}/health" 2>/dev/null || true)"
body="$(echo "${resp}" | head -n1)"
code="$(echo "${resp}" | tail -n1)"

if [[ "${code}" != "200" ]]; then
  SMOKE_DETAIL="$(printf "健康检查失败\n- endpoint: /health\n- expected: 200\n- actual: ${code}\n- body: ${body}")"
  SMOKE_EXIT=4
  echo "FAIL: /health 返回 ${code}（期望 200）"
  exit 4
fi

SMOKE_DETAIL="$(printf "健康检查通过\n- /health = 200")"
echo "PASS: /health = 200"

# TODO: 按 module/story 分发具体 API 检查项（后续扩展为用例清单驱动）

echo "=== API Smoke: 通过 ==="
exit 0
