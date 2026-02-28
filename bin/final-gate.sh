#!/usr/bin/env bash
# Final Gate — 统一门禁脚本（严格顺序执行）
# 用法: bash bin/final-gate.sh
# 任一步骤失败即整体 FAIL（set -euo pipefail）
set -euo pipefail

echo "=== Final Gate: 开始 ==="

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

echo "--- 4. 前端单测 ---"
pnpm --dir osg-frontend/packages/admin test

echo "--- 5. 前端构建 ---"
pnpm --dir osg-frontend/packages/admin build

echo "--- 6. 后端测试 ---"
mvn test -pl ruoyi-admin -am

echo "=== Final Gate: 全部通过 ==="
