# Plan Deliver Orchestration Design

Date: 2026-03-31
Status: Proposed
Owner: workflow-framework

## Scope

新增一个用户可调用的 `/plan-deliver` 入口，用来复用现有 RPIV 主链命令，降低“从需求到 Ticket 落地”时的命令记忆成本。

它的目标是：
- 读取当前工作流状态
- 判断此刻应该继续哪个**既有命令**
- 在现有审批/失败/收尾暂停点停下

## Non-goals

`/plan-deliver` 不负责：
- 取代 `workflow-engine`
- 直接写 `STATE.yaml`
- 自己实现 `transition()`
- 改写 `brainstorming`、`deliver-ticket`、`verification` 的分支逻辑
- 绕过 `brainstorm_confirm`
- 新增状态机节点

## Problem

当前仓库已有完整主流程：

`/brainstorm -> /split story -> /split ticket -> /next -> /verify -> /approve`

问题不在于能力缺失，而在于用户需要记住多个命令和暂停点：
- 什么时候该跑 `/split story`
- 什么时候该跑 `/split ticket {current_story}`
- 什么时候 `/next` 会自动验收
- 什么时候应该停在 `/approve` 或 `/final-closure`

这类“下一步该跑什么”判断适合由一个薄编排层承担。

## Chosen approach

采用“薄编排器”方案：

- `/plan-deliver` 只读取：
  - `${config.paths.tasks.state}`
  - `.claude/project/config.yaml`
- 根据 `workflow.current_step` / `workflow.next_step` 决定下一条规范命令
- 调用后重新读取状态
- 真正的状态推进仍由现有命令/skill 完成

即：
- 研究分支由 `brainstorming` 负责
- 规划资产由 `story-splitter` / `ticket-splitter` 负责
- Ticket 执行与“最后一票自动验收”由 `deliver-ticket` 负责
- Story 验收判断由 `verification` 负责
- 状态机与审批推导由 `workflow-engine` 负责

## UX

v1 仅支持两个入口：

```bash
/plan-deliver
/plan-deliver <module-or-requirement>
```

约定：
- 有参数：用于尚未开始或需要重新进入 brainstorm 的场景
- 无参数：默认从当前 `STATE.yaml` 继续
- 不在 v1 引入额外 flags

## Dispatch contract

### Continue states

| Current state | Action |
|---|---|
| `not_started` | `/brainstorm {arg or current_requirement}` |
| `brainstorm_done` | `/split story` |
| `story_split_done` | 若审批必需则停下，否则 `/approve stories` |
| `stories_approved` | `/split ticket {current_story}` |
| `ticket_split_done` | 若审批必需则停下，否则 `/approve tickets` |
| `tickets_approved` | `/next` |
| `implementing` | `/next` |
| `story_approved` | 交给既有 next-story/auto-continue 机制处理 |

### Pause states

| Current state | Why stop | Next action |
|---|---|---|
| `brainstorm_pending_confirm` | 有待裁决项 | `/approve brainstorm` |
| `story_verified` | Story 已验收通过，等待审批决策 | `/approve {current_story}` |
| `verification_failed` | Story 验收失败，等待修复 | 修复后 `/verify {current_story}` |
| `all_stories_done` | 主链完成 | `/final-closure {module}` |

## Boundaries

### Must do

1. 每次进入先读取状态与配置
2. 只分发既有规范命令
3. 调用后重新读取状态
4. 尊重 `next_requires_approval`
5. 把现有 pause state 当成正常停止点

### Must not do

1. 不直接更新 `workflow.current_step`
2. 不实现第二套 `next_step` 推导逻辑
3. 不复制 `/next` 的最后一票自动验收逻辑
4. 不复制 `/verify` 的 pass/fail 分支
5. 不跨过审批门继续推进

## State-machine decision

v1 不修改：
- `.claude/skills/workflow-engine/state-machine.yaml`
- `.claude/skills/workflow-engine/SKILL.md`
- `.claude/skills/workflow-engine/references/state-diagram.md`

原因：
- `/plan-deliver` 是便利入口，不是新状态节点
- 现有状态已足够表达继续/暂停行为
- 先以最小代价验证 UX 价值

## Risks

1. 风险：编排器与现有 auto-continue 责任重叠
   - 缓解：只负责“起跳”，真正连续推进仍交给既有命令链
2. 风险：误绕过 pause state
   - 缓解：在 skill 中把 `brainstorm_pending_confirm`、`story_verified`、`verification_failed`、`all_stories_done` 定义为硬停止点
3. 风险：后续想做更多 flags，导致再次变胖
   - 缓解：v1 明确不加 `--through` / `--approve-story` 等扩展参数

## Acceptance criteria

1. 用户可通过 `/plan-deliver` 启动或恢复标准交付链
2. `/plan-deliver` 不引入新的状态推进逻辑
3. 在至少 5 个代表性 workflow 状态下，分发结果与现有命令语义一致
4. 到达现有 pause state 时会停止，而不是越过
5. 不修改状态机文件也能完成 v1 闭环
