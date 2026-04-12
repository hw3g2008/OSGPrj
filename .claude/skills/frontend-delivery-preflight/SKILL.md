---
name: frontend-delivery-preflight
description: Prepare RPIV frontend/frontend-ui tickets for implementation by turning ticket contract data into a focused frontend preflight brief before the normal delivery flow continues.
metadata:
  invoked-by: "agent"
  auto-execute: "true"
---

# Frontend-Delivery-Preflight Skill

## 概览

这是一个很薄的 RPIV 前端实现前置 skill。

它的职责不是替代：
- `deliver-ticket`
- 现有前端 Agent
- 现有验证 / 审批 / 状态机
- 通用 `frontend-design`

而是：
- 读取当前 Ticket 的结构化契约
- 将前端实现必须消费的信息收束成一份实现前 brief
- 在 `frontend` / `frontend-ui` Ticket 进入正常实现流之前，明确页面、能力、交互、状态与验证边界

## 何时使用

- `deliver-ticket` 正在执行 `frontend` Ticket，且 `${config.frontend_preflight.enabled}` = true
- `deliver-ticket` 正在执行 `frontend-ui` Ticket，且 `${config.frontend_preflight.apply_to.frontend-ui}` = true
- 需要在不新增 workflow state 的前提下，对前端实现做一次 contract-driven preflight

## 输入

至少读取：
- 当前 Ticket YAML
- `${config.paths.tasks.state}`
- 与 Ticket 相关的 `contract_refs`
- `test_cases`

`frontend-ui` 场景额外读取：
- `prototype_refs`
- `visual_checklist`
- `style_contracts`
- `state_cases`

## 输出目标

输出一份面向实现的前端 brief，至少包含：

### 对 `frontend` Ticket
- 目标页面 / 模块
- 需要落地的 capability / critical surface
- 需要覆盖的 AC 与 test case 映射
- 关键 API / view-model / state-change 提醒
- 错误处理与副作用边界提醒
- 必须保留给正常交付流的验证动作（test/build/e2e/truth guard）

### 对 `frontend-ui` Ticket
- 目标页面 / surface
- prototype anchor 与组件映射提醒
- visual/style/state contract 提醒
- 关键视觉禁止项（相似替代 / 结构漂移 / state 缺失）
- 必须保留给正常交付流的验证动作（build/e2e/ui evidence guard）

## 执行流程

```text
1. 读取 Ticket 与 STATE
2. 校验这是 frontend 或 frontend-ui Ticket
3. 汇总 covers_ac_refs / contract_refs / test_cases
4. 若是 frontend-ui，再汇总 prototype_refs / visual_checklist / style_contracts / state_cases
5. 生成 implementation brief
6. 返回给 deliver-ticket，继续既有实现流程
```

## Guardrails

- 不新增 workflow state
- 不写 `STATE.yaml`
- 不修改 Ticket 状态
- 不替代验证命令
- 不把通用 frontend skill 的创意输出当作完成证据
- 只做实现前置整理，不直接宣称 Ticket 完成

## 与主链的关系

- 主链仍是 `/plan-deliver -> /next -> deliver-ticket`
- Agent 分派仍由 `/next` 决定：`frontend -> frontend-vue`、`frontend-ui -> frontend-admin`
- 本 skill 只是 `deliver-ticket` 内部可选前置步骤
- `mode=manual` 时，`deliver-ticket` 应停止并提示先执行 frontend preflight
- `mode=auto` 时，`deliver-ticket` 自动执行本 skill，再继续既有流程
