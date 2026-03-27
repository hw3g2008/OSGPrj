# Acceptance Ticket Splitter Skill Design

## Overview

`acceptance-ticket-splitter` 是一个项目内 skill，用于当前这一轮 `五端课程申请 / 课程记录流转` 的 ticket 资产生成。

它的目标不是替代现有 `split-ticket`，而是在不改动现有 RPIV 主流程的前提下，为本轮 workstream 生成：

- 可验收行为单元级别的 ticket YAML 草案
- 足够细致的 `ticket.test_cases`
- 对应模块级 `osg-spec-docs/tasks/testing/*` 测试资产
- 反假断言自检清单

第一版 skill 只服务当前轮次，不作为全项目默认框架能力。

## Context

### Current Workflow Boundary

项目的正常需求开发仍遵循：

`brainstorm -> split-story -> split-ticket -> implement -> verify -> final-gate -> final-closure`

见 [32_项目机器真值.md](/Users/hw/workspace/OSGPrj/docs/%E4%B8%80%E4%BA%BA%E5%85%AC%E5%8F%B8%E6%A1%86%E6%9E%B6/32_%E9%A1%B9%E7%9B%AE%E6%9C%BA%E5%99%A8%E7%9C%9F%E5%80%BC.md#L47)。

### Current Problem

现有 ticket 模板与 `split-ticket` 流程已经具备 `allowed_paths / acceptance_criteria / test_cases` 等结构，但在当前仓库中的常见问题是：

- 单个 ticket 覆盖过多 AC
- ticket 标题与内容偏“功能块”，不是“可验收行为单元”
- `test_cases` 偏标签化，难以直接承接验收
- 验证命令偏故事级/模块级，ticket 级证据不足

这会导致“测试做了很多，但验收仍要大量人工补理解”。

### Pilot Scope

该 skill 只适用于：

- `Workstream C1` 学生端 `我的求职`
- `Workstream C2` 学生端 `模拟应聘`
- `Workstream C3` 学生端 `课程记录`
- `Workstream D` 导师提交与后台审核链
- `Workstream E` 助教端去误导
- `Workstream F` 跨端验证与验收

参考：

- [2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md)
- [2026-03-27-ticket落地新标准计划.md](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/2026-03-27-ticket%E8%90%BD%E5%9C%B0%E6%96%B0%E6%A0%87%E5%87%86%E8%AE%A1%E5%88%92.md)

## Chosen Approach

采用“试行执行标准型”方案：

- 不修改现有 `split-ticket / deliver-ticket / verify` 主流程
- 增加一个项目内 skill，为当前轮次生成更细粒度、更可验收的 ticket/test 资产
- 第一版同时生成：
  - ticket YAML 草案
  - `ticket.test_cases`
  - 模块级 testing 资产
- 第一版不生成：
  - `verification_evidence`
  - 最终 verify 命令
  - `STATE.yaml` 变更

这样既能服务当前开发，又不会把范围扩大成框架重构。

## Skill Responsibilities

### Primary Responsibility

按新标准将当前五端实现计划中的某个 workstream 拆成：

- `test-design ticket`
- `implementation ticket`
- `acceptance / regression ticket`

并为每个行为单元产出可直接执行的验收级 test case。

### Explicit Non-Goals

第一版 skill 不负责：

- 自动执行实现
- 自动运行 verify
- 自动补全 verification evidence
- 自动修改 workflow 状态
- retroactively 重写历史 ticket

## Ticket Standard Embedded in the Skill

skill 必须内置以下规则：

### 1. One Ticket = One Acceptance Behavior

一个 ticket 必须对应一个可验收行为单元，而不是一个大功能块或一段行级 patch。

### 2. Limited AC Coverage

一个 ticket 最多覆盖 `1-2` 个强相关 AC，不允许把“学生发起 / 分配导师 / 审核 / 回看”这类多阶段链路混在一个 ticket 中。

### 3. Ordered Ticket Structure

每个行为单元必须按以下顺序组织：

1. `test-design ticket`
2. `implementation ticket`
3. `acceptance / regression ticket`

### 4. Ticket Content Contract

每个生成 ticket 都必须明确：

- 行为单元
- 所属流转阶段
- 影响页面 / 接口 / 服务 / 读取链
- 上游输入
- 下游消费方
- 明确不负责什么

## Acceptance-Grade Test Case Standard

skill 生成的 test case 必须达到“别人拿到就能直接执行验收”的程度。

### Mandatory Fields

每个 test case 至少包含：

- 用例目标
- 前置条件
- 测试数据
- 操作步骤
- 预期结果
- 禁止结果
- 证据层级
- 分支覆盖
- 边界覆盖
- 验收判定

### Required Coverage Dimensions

每个核心行为单元至少覆盖：

- `happy path`
- `auth_or_data_boundary`
- `business_rule_reject`
- `state_transition`
- `persist_effect`
- `visibility_boundary`

### Required Design Methods

统一使用以下测试设计方法：

- 等价类划分
- 边界值分析
- 决策表
- 状态迁移
- 权限 / 数据边界测试
- 跨端流转断点验证

## Anti-Fake Assertion Guardrails

该 skill 必须将反假断言规则视为硬门禁，而不是建议。

### 1. Assertions Must Bind to Truth Sources

每个 test case 的主断言必须绑定真实来源，例如：

- HTML 真源
- 当前 implementation plan
- controller / service
- mapper / query
- 已落盘状态映射

没有真源依据的断言，不允许作为主断言进入资产。

### 2. Weak Assertions Cannot Be Primary

以下断言只能作辅助，不得作为验收结论：

- `toBeTruthy`
- `toBeDefined`
- `not.toBeNull`
- “列表长度大于 0”

主断言必须落到具体业务结果，例如具体状态值、具体字段值、具体按钮可见性、具体记录可见性。

### 3. Every Case Needs Expected and Forbidden Outcomes

每个 case 必须同时写出：

- 预期结果
- 禁止结果

不得只写“应该成功”或“应该展示正确状态”。

### 4. RED Evidence Is Mandatory

skill 生成的测试设计必须要求：

- 先看到失败
- 再允许进入实现

如果测试一开始就是绿的，只能判定为“已有行为”或“断言无效”，不能直接作为通过依据。

### 5. No Large-Scale Mocking of Core Boundaries

允许 mock 外部噪音依赖，但不得 mock 掉：

- 权限判断
- 状态流转
- 审核可见规则
- ownership 过滤

这些必须至少有一层真实 service/controller/e2e 覆盖。

### 6. Cross-End Cases Must Bind Concrete Entities

跨端 case 不得只写“另一端看到数据”，必须绑定：

- 哪个学生
- 哪个申请
- 哪个岗位或 mock 类型
- 哪个导师 / 课程记录
- 哪个状态

### 7. Page Assertions Must Respect Page Responsibility

- 申请页只断言申请追踪与摘要
- 课程记录页才断言详情与评价

跨越页面职责边界的断言直接判为无效。

### 8. No Invented Statuses or Text

skill 不得自行发明字段名、状态名、页面文案。所有这些内容必须来自真源或已落盘计划。

## Inputs

每次运行 skill 时，至少读取以下输入：

### Required Plan Inputs

- [2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md)
- [2026-03-27-ticket落地新标准计划.md](/Users/hw/workspace/OSGPrj/docs/plans/five-end-course-flow/2026-03-27-ticket%E8%90%BD%E5%9C%B0%E6%96%B0%E6%A0%87%E5%87%86%E8%AE%A1%E5%88%92.md)

### Required Scope Input

- 目标 workstream：`C1 / C2 / C3 / D / E / F`

### Required Truth Inputs

- HTML 真源
- 当前页面 / controller / service / mapper
- 已确认的状态映射和权限边界

### Required Repository Inputs

- 现有 `ticket` 资产
- 现有 `tasks/testing/*` 资产

这些输入用于避免重复编号、重复覆盖、重复造测试资产。

## Outputs

第一版 skill 产出以下内容：

### 1. Ticket YAML Drafts

按“一个 ticket = 一个可验收行为单元”生成候选 ticket。

### 2. Ticket-Level Test Cases

为每个 ticket 生成验收级 `ticket.test_cases`。

### 3. Module-Level Testing Assets

同步生成或追加对应模块的 `osg-spec-docs/tasks/testing/*` 条目。

### 4. Anti-Fake Assertion Self-Check

对每组产出附一份自检结论，至少回答：

- 主断言是否绑定真源
- 是否存在弱断言
- 是否包含禁止结果
- 是否要求 RED
- 是否覆盖关键分支
- 是否覆盖边界条件
- 是否绑定具体实体

### Explicitly Not Generated in V1

第一版不生成：

- `verification_evidence`
- 最终 verify 命令
- `STATE.yaml` 修改

## Triggering Model

建议的触发语句包括：

- `按新标准拆 C1`
- `用 acceptance-ticket-splitter 拆 C2`
- `为 Workstream D 生成可验收 ticket`
- `按 ticket落地新标准计划 拆学生端 C3`

该 skill 是当前轮次的专用拆分 skill，不是通用所有 story 的默认替代器。

## Success Criteria

该 skill 若满足以下条件，则视为设计成功：

- 生成的 ticket 不再是粗粒度一句话 ticket
- 生成的 test case 可直接承接人工验收
- implementation ticket 拿到后不需要再大量脑补业务边界
- 至少能在 `C1` 跑通一轮试点
- 产出的资产能稳定通过人工 review，不因假断言而失真

## Recommended Repository Location

建议放在项目内：

`/Users/hw/workspace/OSGPrj/.codex/project-skills/acceptance-ticket-splitter/`

这样可以作为当前仓库的专用能力，而不污染全局技能空间。
