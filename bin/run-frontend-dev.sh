#!/usr/bin/env bash
set -euo pipefail

# ─── 前端开发服务器启动脚本 ───
# 用法: bash bin/run-frontend-dev.sh <app>
# app: admin | assistant | student | mentor | lead-mentor
#
# 行为:
#   1. 从 vite.config.ts 读取 server.port
#   2. 杀掉该端口上所有已有进程（强制清理）
#   3. 从正确的 package 目录启动 npx vite

VALID_APPS=("admin" "assistant" "student" "mentor" "lead-mentor")

usage() {
  cat <<'EOF'
Usage:
  bash bin/run-frontend-dev.sh <app>

Apps:
  admin        → port 3005
  assistant    → port 3004
  student      → port 3001
  mentor       → port 3002
  lead-mentor  → port 3003

Examples:
  bash bin/run-frontend-dev.sh assistant
  bash bin/run-frontend-dev.sh admin
EOF
}

if [[ $# -lt 1 ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
  usage
  exit 0
fi

APP="$1"

# 校验 app 名称
is_valid=0
for v in "${VALID_APPS[@]}"; do
  if [[ "$v" == "$APP" ]]; then
    is_valid=1
    break
  fi
done
if (( is_valid == 0 )); then
  echo "FAIL: unknown app '${APP}'. Valid: ${VALID_APPS[*]}" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_DIR="${REPO_ROOT}/osg-frontend/packages/${APP}"
VITE_CONFIG="${PKG_DIR}/vite.config.ts"

if [[ ! -f "${VITE_CONFIG}" ]]; then
  echo "FAIL: vite.config.ts not found: ${VITE_CONFIG}" >&2
  exit 1
fi

# 从 vite.config.ts 提取 server.port
PORT=$(grep -A5 'server:' "${VITE_CONFIG}" | grep 'port:' | head -1 | sed 's/[^0-9]//g')
if [[ -z "${PORT}" ]]; then
  echo "FAIL: cannot extract port from ${VITE_CONFIG}" >&2
  exit 1
fi

echo "=== run-frontend-dev ==="
echo "INFO: app=${APP}"
echo "INFO: package=${PKG_DIR}"
echo "INFO: port=${PORT}"

# ─── 杀掉该端口上所有已有进程 ───
EXISTING_PIDS=$(lsof -t -i ":${PORT}" 2>/dev/null || true)
if [[ -n "${EXISTING_PIDS}" ]]; then
  echo "INFO: killing existing processes on port ${PORT}: ${EXISTING_PIDS}"
  echo "${EXISTING_PIDS}" | xargs kill -9 2>/dev/null || true
  sleep 1
  # 二次确认
  REMAINING=$(lsof -t -i ":${PORT}" 2>/dev/null || true)
  if [[ -n "${REMAINING}" ]]; then
    echo "FAIL: port ${PORT} still occupied after kill: ${REMAINING}" >&2
    exit 1
  fi
  echo "INFO: port ${PORT} cleared"
else
  echo "INFO: port ${PORT} is free"
fi

# ─── 启动 Vite 开发服务器 ───
echo "INFO: starting vite dev server..."
cd "${PKG_DIR}"
exec npx vite --port "${PORT}"
