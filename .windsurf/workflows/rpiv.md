---
description: RPIV 主流程调度 - 读取 STATE.yaml 判断当前阶段并执行对应流程
---

# RPIV 主流程调度

## 第一步：读取当前状态

读取 `osg-spec-docs/tasks/STATE.yaml`，关注以下字段：
- `workflow.current_step` — 当前阶段
- `current_story` / `current_ticket` — 当前任务
- `current_requirement` — 当前需求模块

## 第二步：根据阶段执行

根据 `workflow.current_step` 的值，执行对应流程：

### 阶段 R（Requirement）— 需求分析

**触发条件**：`current_step` 为 `idle` 或 `requirement_analysis` 且没有 Stories

执行 `/brainstorm`

### 阶段 P（Plan）— 拆分计划

**触发条件**：`current_step` 为 `brainstorm_done` 或 `planning`

1. 先执行 `/split-story` 拆分 Stories
2. 等待用户审批 Stories（`/approve`）
3. 对每个 Story 执行 `/split-ticket S-xxx` 拆分 Tickets
4. 等待用户审批 Tickets（`/approve`）

### 阶段 I（Implement）— 实现

**触发条件**：`current_step` 为 `stories_approved` 或 `implementing`，且有未完成的 Tickets

执行 `/next` 实现下一个 Ticket

### 阶段 V（Verify）— 验收

**触发条件**：当前 Story 的所有 Tickets 都已完成

1. 执行 `/verify` 验收当前 Story
2. 如果需要 CC 交叉审核，执行 `/cc-review`
3. 验收通过后，检查是否还有下一个 Story
   - 有 → 回到阶段 I
   - 没有 → 所有 Stories 完成，执行最终交付审核

### 全部完成

**触发条件**：`current_step` 为 `all_stories_done`

输出完成摘要，提示用户是否需要开始新的需求模块。

## 第三步：更新状态

每次阶段转换后，更新 `osg-spec-docs/tasks/STATE.yaml` 中的：
- `workflow.current_step`
- `workflow.next_step`
- `current_story` / `current_ticket`
