#!/usr/bin/env bash
# API 冒烟测试 — 单入口脚本
# 用法: bash bin/api-smoke.sh <module> [story]
# 退出码: 0=全通过, 2=参数错误, 3=依赖缺失, 4=HTTP状态码失败, 5=业务字段失败
set -euo pipefail

MODULE="${1:-}"
STORY="${2:-all}"
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

if [[ -z "${MODULE}" ]]; then
  echo "usage: bash bin/api-smoke.sh <module> [story]"
  exit 2
fi

command -v curl >/dev/null || { echo "FAIL: curl not found"; exit 3; }
command -v jq >/dev/null || { echo "FAIL: jq not found"; exit 3; }

echo "=== API Smoke: module=${MODULE}, story=${STORY}, base=${BASE_URL} ==="

# 健康检查
resp="$(curl -sS -w '\n%{http_code}' "${BASE_URL}/health" 2>/dev/null || true)"
body="$(echo "${resp}" | head -n1)"
code="$(echo "${resp}" | tail -n1)"

if [[ "${code}" != "200" ]]; then
  echo "FAIL: /health 返回 ${code}（期望 200）"
  exit 4
fi

echo "PASS: /health = 200"

# TODO: 按 module/story 分发具体 API 检查项（后续扩展为用例清单驱动）

echo "=== API Smoke: 通过 ==="
exit 0
