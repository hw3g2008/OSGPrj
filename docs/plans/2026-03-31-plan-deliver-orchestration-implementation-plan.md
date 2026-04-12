# Plan Deliver Orchestration Implementation Plan

Date: 2026-03-31
Status: Proposed
Owner: workflow-framework

## Scope

实现 `/plan-deliver` 的 v1 最小闭环：新增命令文档、skill 文档，并更新框架命令清单。

## Non-goal

- 不改状态机
- 不改 `workflow-engine` 逻辑
- 不改 `brainstorming` / `deliver-ticket` / `verification` 的内部实现
- 不新增复杂 flags

## Design Doc

- `docs/plans/2026-03-31-plan-deliver-orchestration-design.md`

## Execution Order

1. 新增 design / implementation plan 文档
2. 新增 `.claude/commands/plan-deliver.md`
3. 新增 `.claude/skills/plan-deliver/SKILL.md`
4. 更新 `.claude/CLAUDE.md` 命令清单
5. 运行框架级一致性审计

## Implementation steps

### 1. 新增命令文档

新增：
- `.claude/commands/plan-deliver.md`

内容要求：
- 用法
- 说明
- dispatch 规则
- stop/resume 规则
- 示例
- 与 `/brainstorm`、`/split`、`/next`、`/verify`、`/approve` 的边界关系

### 2. 新增 skill 文档

新增：
- `.claude/skills/plan-deliver/SKILL.md`

内容要求：
- frontmatter 与现有 skill 风格保持一致
- 强调这是薄编排层
- 伪代码中体现：
  - 先读状态与配置
  - 判断当前 state / next_step
  - 只分发规范命令
  - 调用后重新读取状态
  - 遇到 pause state 立即停止
- 不写项目专属硬编码

### 3. 更新命令总览

修改：
- `.claude/CLAUDE.md`

改动：
- 在核心命令表中加入 `/plan-deliver`
- 说明它是“从 brainstorm 到 ticket delivery 的简化入口”

## Files to modify

新增：
- `.claude/commands/plan-deliver.md`
- `.claude/skills/plan-deliver/SKILL.md`
- `docs/plans/2026-03-31-plan-deliver-orchestration-design.md`
- `docs/plans/2026-03-31-plan-deliver-orchestration-implementation-plan.md`

修改：
- `.claude/CLAUDE.md`

## Verification

### 1. 文档一致性

检查以下文件描述一致：
- `.claude/commands/plan-deliver.md`
- `.claude/skills/plan-deliver/SKILL.md`
- `.claude/CLAUDE.md`

### 2. 路由语义检查

确保以下状态下的行为正确：
- `not_started` -> `/brainstorm`
- `brainstorm_done` -> `/split story`
- `stories_approved` -> `/split ticket {current_story}`
- `tickets_approved` -> `/next`
- `story_verified` -> stop + `/approve {current_story}`
- `verification_failed` -> stop + `/verify {current_story}`
- `all_stories_done` -> stop + `/final-closure {module}`

### 3. 框架边界检查

确认 `/plan-deliver`：
- 不直接写 `STATE.yaml`
- 不复刻 `transition()`
- 不复刻 `verify_story()`
- 不绕过 `brainstorm_confirm`

### 4. Framework audit

实现完成后运行：
- `framework-audit`

## DoD

1. `/plan-deliver` 在命令清单中可发现
2. 新增的命令文档与 skill 文档完整可读
3. 行为边界与 pause state 规则明确
4. 未修改状态机文件
5. `framework-audit` 通过
