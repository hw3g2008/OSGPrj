# Acceptance Ticket Splitter Skill Implementation Plan

## Goal

实现一个项目内 skill：`acceptance-ticket-splitter`，用于当前这一轮五端课程申请 / 课程记录流转的 ticket 资产拆分。

第一版目标是：

- 输入当前五端 implementation plan + 新标准计划 + 指定 workstream
- 输出更细粒度的 ticket YAML 草案
- 输出验收级 `ticket.test_cases`
- 输出模块级 `tasks/testing/*` 资产条目
- 输出反假断言自检清单
- 维护本轮五端试点的本地进度状态文件
- 为生成后的 implementation ticket 明确挂接 `test-driven-development` 执行入口

第一版不负责：

- 自动执行 implementation
- 自动生成 verification evidence
- 自动改写全局 `osg-spec-docs/tasks/STATE.yaml`

## Workstream A: 建立 Skill 壳体

**Goal**

在项目内创建 skill 目录与基础元数据，使 Codex 可以识别并调用该 skill。

**Targets**

- `.codex/project-skills/acceptance-ticket-splitter/SKILL.md`
- `.codex/project-skills/acceptance-ticket-splitter/agents/openai.yaml`（如需）

**Tasks**

- 创建 skill 目录
- 编写 frontmatter：
  - `name: acceptance-ticket-splitter`
  - 明确 description，指向“当前轮次按新标准拆分可验收 ticket”
- 在 SKILL.md 中写清：
  - 适用范围
  - 输入
  - 输出
  - 反假断言门禁
  - 非目标边界

**Exit Criteria**

- skill 可以被项目识别
- 仅凭 metadata 就能判断何时使用

## Workstream B: 固化输入解析规则

**Goal**

让 skill 在运行前稳定读取正确输入，不走拍脑袋拆分。

**Targets**

- `.codex/project-skills/acceptance-ticket-splitter/SKILL.md`
- 如有需要：`references/inputs.md`

**Tasks**

- 明确必读输入：
  - `docs/plans/five-end-course-flow/STATE.yaml`
  - `2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md`
  - `2026-03-27-ticket落地新标准计划.md`
  - HTML 真源
  - 当前 workstream 对应实现文件
  - 现有 `ticket/testing` 资产
- 明确 workstream 选择规则
- 明确历史资产冲突与重复覆盖的检查规则
- 明确本地状态文件不存在时的初始化规则
- 明确本地状态文件与用户指定 workstream 冲突时的提示规则

**Exit Criteria**

- skill 在开始拆分前能列出完整输入清单
- 不会在缺少关键输入时继续生成资产
- 不会误读或污染全局 RPIV `STATE.yaml`

## Workstream C: 固化 Ticket 生成规则

**Goal**

让 skill 产出的 ticket 粒度符合“一个 ticket = 一个可验收行为单元”。

**Targets**

- `.codex/project-skills/acceptance-ticket-splitter/SKILL.md`
- 如有需要：`references/ticket-rules.md`

**Tasks**

- 固化单 ticket 覆盖边界
- 固化 `>2 AC` 必须继续拆分的硬门禁
- 对 `C1` 明确 `apply / progress / coaching` 不能在一张 implementation ticket 中回粗混合
- 固化 `test-design -> implementation -> acceptance/regression` 顺序
- 固化 ticket 必备信息字段解释
- 固化 ticket 反模式清单

**Exit Criteria**

- 生成结果不会再出现“大功能块 ticket”
- 每个 ticket 都能用一句完整业务话语描述其行为单元
- draft 资产不会再回退成 `3-4` 个 AC 的粗粒度票

## Workstream D: 固化 Test Case 生成规则

**Goal**

让 skill 产出的 `ticket.test_cases` 达到验收级细度。

**Targets**

- `.codex/project-skills/acceptance-ticket-splitter/SKILL.md`
- 如有需要：`references/test-case-schema.md`

**Tasks**

- 固化 test case 必填信息
- 固化 `execution_form` 结构，明确 `playwright / http / service` 三类可执行形态
- 固化 `fixture_ref / seed_ref / identity_ref / entity_ref` 的绑定规则
- 固化统一测试设计方法
- 固化最小覆盖维度
- 固化本轮必须覆盖的边界场景
- 说明如何映射到 `ticket.test_cases` 与模块级 `tasks/testing/*`
- 固化 `latest_result.status = draft|red|pass` 与真实证据回写规则
- 固化 implementation ticket 进入开发时必须切换到 `test-driven-development` 的交接规则

**Exit Criteria**

- skill 生成的 test case 不再只有标签
- test case 能直接承接人工验收
- test case 至少达到“接近可执行级”，而不是只剩人话步骤

## Workstream E: 固化反假断言门禁

**Goal**

把“AI 生成假断言”的风险压到最低。

**Targets**

- `.codex/project-skills/acceptance-ticket-splitter/SKILL.md`
- 如有需要：`references/anti-fake-assertions.md`

**Tasks**

- 固化“断言必须绑定真源”规则
- 固化“弱断言不可作主断言”规则
- 固化“预期结果 + 禁止结果”双写规则
- 固化 RED 证据要求
- 固化禁止 mock 核心边界规则
- 固化跨端 case 必须绑定具体实体规则
- 固化页面职责边界断言规则

**Exit Criteria**

- skill 输出带有反假断言自检清单
- 生成资产能主动暴露风险断言，而不是掩盖它们

## Workstream F: 试点验证

**Goal**

先拿 `Workstream C1` 做一轮真实试点，验证 skill 设计是否足够实用。

**Targets**

- `Workstream C1`
- skill 产出的首批 ticket/test 资产
- 对应人工 review 结果

**Tasks**

- 使用 skill 设计拆分 C1
- 人工 review 生成结果：
  - ticket 是否足够细
  - test case 是否足够细
  - 是否已经从设计级跨到可执行级
  - fixture / seed 绑定是否真实可用
  - evidence_ref 是否指向真实执行证据
  - 是否出现假断言
  - implementation ticket 是否仍需大量补解释
- 记录需要回调到 skill 的改进点

**Exit Criteria**

- 至少完成一轮 C1 试点
- 能明确回答“是否适合推广到 C2/C3/D/E/F”

## Workstream G: 本地状态文件接入

**Goal**

让当前五端试点在不碰全局框架状态机的前提下，具备稳定的上下文恢复能力。

**Targets**

- `docs/plans/five-end-course-flow/STATE.yaml`
- `docs/plans/five-end-course-flow/README.md`
- `docs/plans/five-end-course-flow/pilot-c1/README.md`
- `.codex/project-skills/acceptance-ticket-splitter/SKILL.md`

**Tasks**

- 定义本地状态文件最小字段集合
- 写清恢复上下文的固定读取顺序
- 要求 skill 在生成 / 推进 pilot 资产前先读取本地状态
- 要求 skill 在生成 / 推进 pilot 资产后回写本地状态
- 把当前 `C1` 已完成结果和下一步动作落入本地状态文件

**Exit Criteria**

- 新开 context 时只读本地 `STATE.yaml` 即可知道当前推进到哪一步
- pilot README 与 skill 规则对本地状态文件的用法保持一致
- 不需要触碰全局 `osg-spec-docs/tasks/STATE.yaml`

## Verification Plan

第一版 skill 的验证不看“是否写了很多内容”，而看以下结果：

1. skill 能清楚声明输入、输出和边界
2. skill 生成的 ticket 粒度明显细于现有粗粒度 ticket
3. skill 生成的 test case 达到验收级，不再只有标签
4. 反假断言规则能识别高风险断言
5. C1 试点能产出可供实现直接使用的 ticket/test 资产
6. 新开 context 时能通过本地 `STATE.yaml` 恢复当前 pilot 状态
7. 至少一批 pilot case 已绑定真实 fixture / seed 与真实执行证据
8. implementation ticket 的执行入口已明确指向 `test-driven-development`，并要求保留 `RED -> GREEN` 证据

## Delivery Notes

由于当前会话中 `writing-plans` skill 不可用，本文档作为等价 fallback implementation plan 使用。

后续若需要正式实现该 skill，应优先按本计划完成 `Workstream A -> G`，不要先写实现再倒推规则。
