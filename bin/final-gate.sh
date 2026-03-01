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

HEALTH_URL="${BASE_HEALTH_URL:-http://127.0.0.1:8080/actuator/health}"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "FAIL: 缺少依赖命令 '${cmd}'（请先安装后重试）"
    exit 21
  fi
}

echo "=== Final Gate: 开始（module=${MODULE}） ==="

echo "--- 0. toolchain_preflight ---"
require_cmd python3
require_cmd node
require_cmd pnpm
require_cmd mvn

if [[ ! -f "osg-frontend/playwright.config.ts" ]]; then
  echo "FAIL: 缺少 Playwright 配置文件 osg-frontend/playwright.config.ts"
  exit 22
fi

if ! grep -Eq "webServer\\s*:" "osg-frontend/playwright.config.ts"; then
  echo "FAIL: Playwright webServer 未配置，无法自动拉起前端执行 E2E"
  exit 22
fi

echo "INFO: E2E 前端启动策略=Playwright webServer（Option B），不依赖 Docker frontends(3001-3005)"

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

echo "--- 5. 前端单测 ---"
pnpm --dir osg-frontend/packages/admin test

echo "--- 6. 前端构建 ---"
pnpm --dir osg-frontend/packages/admin build

echo "--- 7. 后端测试 ---"
mvn test -pl ruoyi-admin -am

echo "--- 8. API 冒烟 ---"
if curl -sS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
  bash bin/api-smoke.sh "${MODULE}"
else
  echo "⚠️ WARNING: 后端未启动（${HEALTH_URL} 不可达），跳过 api-smoke"
  echo "⚠️ 此步骤为 SKIP，非 PASS — Final gate 未完整通过"
fi

echo "--- 9. E2E 全量 ---"
if curl -sS --max-time 5 "${HEALTH_URL}" >/dev/null 2>&1; then
  pnpm --dir osg-frontend test:e2e
else
  echo "⚠️ WARNING: 后端未启动，仅运行 @ui-only E2E"
  pnpm --dir osg-frontend test:e2e:ui-only
  echo "⚠️ @api E2E 已跳过 — Final gate 未完整通过"
fi

echo "=== Final Gate: 完成（检查上方是否有 WARNING 标记） ==="
