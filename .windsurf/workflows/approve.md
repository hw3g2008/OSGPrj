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
   - 读取 `{module}-open-questions.md`，逐项展示
   - PM 逐项裁决（C/D/B 类按类型处理）
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

3. **输出确认**
   - 显示审批结果
   - 提示下一步操作
