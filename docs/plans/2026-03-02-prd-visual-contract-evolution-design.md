# PRD Visual Contract Evolution Design

Date: 2026-03-02  
Status: Draft for Review  
Owner: workflow-framework

## 1. 背景

当前 `ui-only` 以可达性/可见性为主，缺少“页面视觉一致性”硬约束。  
需求来源为 HTML 原型时，仍可能出现“功能通过但视觉偏移”。

## 2. 设计目标

1. 把 PRD 从描述型升级为可执行视觉契约。
2. 让视觉验收进入门禁主链路（而非人工主观判断）。
3. 保持与运行态门禁分层：视觉问题与运行态稳定性问题分别治理、联合验收。

## 3. 非目标

1. 不替代 Anti-False-Green 的运行态门禁。
2. 不把具体业务页面细节硬编码到 workflow 引擎。
3. 不在本阶段引入复杂视觉平台（先落地可执行最小闭环）。

## 4. 核心设计决策

### D1. 视觉契约作为 PRD 产物

引入 `UI-VISUAL-CONTRACT.yaml`（模块级）作为机器可读标准，约束每个页面的：
1. 路由
2. 视口
3. 原型锚点
4. 基线图引用
5. 差异阈值
6. 必要锚点
7. 锚点质量约束（每页至少 3 个，且不能全是弱锚点）

### D2. 视觉裁决文件分层

1. 主审批链仍以 `{module}-DECISIONS.md` 为准。
2. `UI-VISUAL-DECISIONS.md` 仅做视觉可读投影，便于 UI 审查。

### D3. 分层测试标签

1. `@ui-smoke`：页面可达与关键元素存在。
2. `@ui-visual`：视觉基线对照（截图比对）。  
禁止用 `@ui-smoke` 结果替代视觉一致性结论。

### D4. 视觉门禁双脚本

1. `ui-visual-baseline`：基线生成与维护。
2. `ui-visual-gate`：按契约执行视觉比对并输出差异证据。

### D5. 与最终门禁集成

`final-gate` 在运行态前置守卫通过后执行视觉 gate；  
视觉 gate 与 `e2e-api-gate` 并列为硬门禁，任一失败即阻断。

## 5. 目标链路（目标态）

HTML SSOT -> PRD + `UI-VISUAL-CONTRACT.yaml` -> Brainstorm 回源校验 -> `@ui-visual` 执行 -> final-gate/final-closure 审计落盘

## 6. 验收标准

1. 每个页面有契约条目和基线引用。
2. 视觉比对可重复执行且产物可追溯。
3. 视觉漂移有明确裁决记录，不再靠口头确认。
4. final 级报告可同时呈现运行态和视觉态结论。

## 7. 与配套计划的关系

对应实施文档：`docs/plans/2026-03-02-prd-visual-contract-evolution-plan.md`  
本设计定义架构边界与关键决策；计划负责批次执行与落地步骤。
