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

2. **调用统一验收引擎**
   - 调用 verification skill 的 `verify_story(story_id)`
   - 验收逻辑包含：
     - Phase 1：前置检查（Tickets done + evidence + exit_code=0）
     - Phase 2：功能验收（全量测试 + AC 覆盖率 + 覆盖率门槛）
     - Phase 3：增强全局终审（三维度终审 + A~I 多维度旋转校验，参见 quality-gate/SKILL.md）

3. **处理结果**
   - 如果 `passed = true`：
     - 设置 `workflow.current_step = story_verified`
     - 设置 `workflow.next_step = null`（用户自行选择）
     - 输出两个选项：
       - `/cc-review` — CC 交叉验证（二次校验）
       - `/approve` — 跳过 CC，直接审批
   - 如果 `passed = false`：
     - 设置 `workflow.current_step = verification_failed`
     - 设置 `workflow.next_step = null`（暂停等用户修复）
     - 输出失败原因和问题列表
     - 提示修复后手动执行 `/verify` 重新验收

4. **写回状态**
   - 将更新后的 `STATE.yaml` 写回磁盘

5. **事件审计（W6b）**
   - 调用 `append_workflow_event(build_event(command="/verify", state_from=old_step, state_to=new_step))`
   - 写入失败时回滚 STATE.yaml 并终止（见 workflow-engine/SKILL.md §6）
