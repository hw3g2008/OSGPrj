---
description: 薄编排执行标准 RPIV 主链 - 对应 CC 命令 /plan-deliver
---

# Plan Deliver

## 执行目标

在不重写状态机、不直接写 `STATE.yaml` 的前提下，根据当前工作流状态分发到现有 RPIV 规范命令，或在既有暂停点停下。

## 执行步骤

1. **读取状态与配置**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 读取 `.claude/project/config.yaml`
   - 读取 `.claude/skills/workflow-engine/state-machine.yaml`
   - 解析：
     - `workflow.current_step`
     - `workflow.next_step`
     - `workflow.next_requires_approval`
     - `current_story`
     - `current_requirement`

2. **解析 module / requirement 参数**
   - 若用户传入参数，优先使用该参数
   - 若未传入参数，回退 `STATE.current_requirement`
   - 若当前状态为 `not_started` 且仍无法解析模块 → 停止，输出：`缺少 module 参数，无法开始 /brainstorm`

3. **先检查既有暂停点（命中即停）**

   ### `brainstorm_pending_confirm`
   - 停止
   - 输出：先处理 `DECISIONS.md`，然后执行 `/approve brainstorm`

   ### `story_verified`
   - 若 `config.approval.story_done == required` 或 `workflow.next_requires_approval == true`
     - 停止
     - 输出：当前 Story 已通过验收，下一步执行 `/approve {current_story}`
   - 否则分发：`/approve {current_story}`

   ### `verification_failed`
   - 停止
   - 输出：当前 Story 验收失败，先修复，再执行 `/verify {current_story}`

   ### `all_stories_done`
   - 停止
   - 输出：主链完成，下一步执行 `/final-closure {module}`

4. **根据当前状态分发既有命令**

   ### `not_started`
   - 分发：`/brainstorm {module}`

   ### `brainstorm_done`
   - 分发：`/split story`

   ### `story_split_done`
   - 若 `config.approval.story_split == required` 或 `workflow.next_requires_approval == true`
     - 停止，输出：`Story 拆分待审批，请执行 /approve stories`
   - 否则分发：`/approve stories`

   ### `stories_approved`
   - 分发：`/split ticket {current_story}`

   ### `ticket_split_done`
   - 若 `config.approval.ticket_split == required` 或 `workflow.next_requires_approval == true`
     - 停止，输出：`Ticket 拆分待审批，请执行 /approve tickets`
   - 否则分发：`/approve tickets`

   ### `tickets_approved`
   - 分发：`/next`

   ### `implementing`
   - 分发：`/next`

   ### `story_approved`
   - 停止
   - 输出：当前 Story 已审批，交给既有 next-story / auto-continue 机制继续

5. **未覆盖状态处理**
   - 若当前状态不在上述规则中 → 停止并输出：`未覆盖状态: {current_step}`

## 命令分发表

| Current state | Action |
|---|---|
| `not_started` | `/brainstorm {module}` |
| `brainstorm_done` | `/split story` |
| `story_split_done` | `/approve stories`（仅当无需人工审批时） |
| `stories_approved` | `/split ticket {current_story}` |
| `ticket_split_done` | `/approve tickets`（仅当无需人工审批时） |
| `tickets_approved` | `/next` |
| `implementing` | `/next` |

## 暂停点

| Current state | Why stop | Next action |
|---|---|---|
| `brainstorm_pending_confirm` | 有待裁决项 | `/approve brainstorm` |
| `story_verified` | Story 已验收通过，等待审批 | `/approve {current_story}` |
| `verification_failed` | Story 验收失败，等待修复 | 修复后 `/verify {current_story}` |
| `all_stories_done` | 主链完成 | `/final-closure {module}` |

## 硬约束

- 不直接写 `STATE.yaml`
- 不复制 `transition()` 逻辑
- 不复制 `/next` 的自动连续推进逻辑
- 不复制 `/verify` 的 pass/fail 分支
- 不绕过审批门
- 不越过现有 pause state
