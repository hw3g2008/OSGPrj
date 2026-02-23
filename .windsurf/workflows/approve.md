---
description: 审批当前待审批项（Stories 或 Tickets 或 Story 验收）
---

# 审批

## 使用方式

```
/approve
```

## 执行步骤

1. **读取状态**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 读取 `.claude/project/config.yaml` 的审批配置
   - 检查 `workflow.current_step` 判断当前待审批项

2. **根据阶段审批**

   ### Brainstorm 需求确认
   - 条件：`current_step` 为 `brainstorm_pending_confirm`
   - 读取 STATE.yaml 获取 `decisions_path`，读取 config.yaml 获取 `srs_dir`
   - 读取 `{module}-DECISIONS.md` 中 `status=pending` 或 `(status=resolved && 已应用=false)` 的记录
   - **Guard 1（空集）**：若无记录 → 失败（含 phase0 rejected 诊断）
   - **Guard 2（source 必填）**：缺失 → 失败，提示重新 /brainstorm
   - **Guard 3（source 单一性）**：混合来源 → 失败
   - **source: phase0 路径**：
     - Guard：若存在 pending 记录 → 报错（PM 未裁决完）
     - 读取 resolved 裁决 → 更新 PRD → 标记已应用
     - **不写 STATE.yaml** → 同步调用 `/brainstorm {module}`（由 brainstorm 管理最终状态）
   - **source: phase4 路径**：
     - Guard：若存在 resolved&&未应用 → 报错（应走重新 /brainstorm）
     - "跳过"语义：标记 pending 为 rejected
     - 更新 `workflow.current_step` 为 `brainstorm_done`
     - 更新 `workflow.next_step` 为 `split_story`
     - 更新 `workflow.auto_continue` 为 `true`

   ### Stories 审批
   - 条件：`current_step` 为 `story_split_done`
   - 读取 `config.yaml` 的 `approval.story_split` 配置
     - 如果 `required`：列出所有待审批 Stories 的摘要，等待用户确认
     - 如果 `auto`：自动审批，直接更新状态
   - 用户确认后：
     - 更新每个 Story 状态为 `approved`
     - **设置 `current_story` 为第一个 Story（按优先级排序）**
     - 更新 `workflow.current_step` 为 `stories_approved`

   ### Tickets 审批
   - 条件：`current_step` 为 `ticket_split_done`
   - 读取 `config.yaml` 的 `approval.ticket_split` 配置
     - 如果 `required`：列出所有待审批 Tickets 的摘要，等待用户确认
     - 如果 `auto`：自动审批，直接更新状态
   - 更新每个 Ticket 状态为 `pending`（可执行）
   - 更新 `workflow.current_step` 为 `tickets_approved`

   ### Story 验收审批（跳过 CC）
   - 条件：`current_step` 为 `story_verified`
   - 列出 Story 验收报告摘要
   - 用户确认后：
     - 更新 Story 状态为 `done`
     - 更新 `workflow.current_step` 为 `story_approved`（直接跳到 approved，不经过 story_done）
     - 检查是否有下一个 pending Story
       - 有 → 设置 `current_story` 为下一个 Story，设置 `current_step` 为 `stories_approved`
       - 没有 → 设置 `current_step` 为 `all_stories_done`

   ### Story 完成审批（CC 审核后）
   - 条件：`current_step` 为 `story_done`
   - 读取 `config.yaml` 的 `approval.story_done` 配置
     - 如果 `required`：等待用户确认
     - 如果 `auto`：自动审批
   - 更新 `workflow.current_step` 为 `story_approved`
   - 检查是否有下一个 pending Story
     - 有 → 设置 `current_story` 为下一个 Story，设置 `current_step` 为 `stories_approved`
     - 没有 → 设置 `current_step` 为 `all_stories_done`

3. **事件审计（W8b）**
   - 状态更新后，调用 `append_workflow_event(build_event(command="/approve", state_from=old_step, state_to=new_step))`
   - 写入失败时回滚 STATE.yaml 并终止（见 workflow-engine/SKILL.md §6）

4. **输出确认**
   - 显示审批结果
   - 提示下一步操作
