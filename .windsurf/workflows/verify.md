---
description: 手动重试 Story 验收 - 调用统一验收引擎 verify_story()
---

# 手动重试 Story 验收

## 使用场景

- `workflow.current_step = verification_failed`
- 已修复验收失败的问题，需要手动重试

## 执行步骤

1. **读取状态与目标 Story**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 获取 `current_story`

2. **前置守卫（必须通过）**
   - 运行：
     - `python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py --state osg-spec-docs/tasks/STATE.yaml --config .claude/project/config.yaml --state-machine .claude/skills/workflow-engine/state-machine.yaml --stories-dir osg-spec-docs/tasks/stories --tickets-dir osg-spec-docs/tasks/tickets --proofs-dir osg-spec-docs/tasks/proofs`
     - `python3 .claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py --state osg-spec-docs/tasks/STATE.yaml --stories-dir osg-spec-docs/tasks/stories --tickets-dir osg-spec-docs/tasks/tickets`
   - 任一失败即停止 `/verify`，先修复状态/证据再重试

3. **调用统一验收引擎**
   - 调用 verification skill 的 `verify_story(story_id)`
   - 验收逻辑包含：
     - Phase 1：前置检查（Tickets done + evidence + exit_code=0）
     - Phase 2：功能验收（全量测试 + AC 覆盖率 + 覆盖率门槛）
     - Phase 3：增强全局终审（三维度终审 + A~I 多维度旋转校验，参见 quality-gate/SKILL.md）

4. **TC 资产回填（D6 挂点）**
   - 回填 Story 级集成验证结果到追踪矩阵 `Latest Result`
   - 对 API Story 强制执行 `@SpringBootTest` 集成命令并写入 evidence
   - 若矩阵未更新，直接 FAIL

5. **处理结果（必须经 transition() 统一入口）**
   - 如果 `passed = true`：
     - 调用 `transition("/verify", state, "story_verified")`（W8）
     - 输出两个选项：
       - `/cc-review` — CC 交叉验证（二次校验）
       - `/approve` — 跳过 CC，直接审批
   - 如果 `passed = false`：
     - 调用 `transition("/verify", state, "verification_failed", meta={"result":"failure"})`（W8）
     - 输出失败原因和问题列表
     - 提示修复后手动执行 `/verify` 重新验收
   - ⚠️ `transition()` 内部自动：写状态 → 推导审批标记 → 写事件 → postcheck
   - ⚠️ 事件写入失败时自动回滚 STATE.yaml 并终止（见 workflow-engine/SKILL.md §5a）
