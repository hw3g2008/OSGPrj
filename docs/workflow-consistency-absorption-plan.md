# workflow-consistency 统一修复与吸收计划（唯一执行文档）

> 文档定位：workflow consistency 的唯一事实源（SSOT）。后续仅维护本文件。  
> 目标：在保持“一人公司默认自动跑”的前提下，让状态一致性与结果证据达到可审计、可复现、可回归。

## 1. 文档元信息

- 快照时间：2026-02-23
- 适用范围：`.claude/skills/workflow-engine/*`、`.claude/commands/*`、`.windsurf/workflows/*`
- 成功标准：本文件第 11 节“领先判定标准”全部通过

## 2. 目标与范围

一句话目标：消除 `state-machine.yaml` 与衍生文件之间的手动同步负担，防止状态名漂移。

本轮包含：
- workflow 状态一致性（状态名、命令映射、分支语义）
- 测试模拟器与状态机对齐
- 状态图阶段表与状态机对齐
- 一致性自动守护脚本
- workflow 结果证据协议（“每步结果够硬”）

本轮不包含：
- 全状态图自动生成（仅阶段表自动生成）
- 引入新的业务流程节点

## 3. 当前结论快照

- 症状层修复：9/9 已完成（历史漂移项已落地）。
- 根因层修复：5/5 未完成（动态映射、一致性脚本、阶段表自动生成、workflow 事件落盘、命令统一）。
- 总体判断：流程已可跑通，但“防漂移底座 + 证据落盘”尚未完成。

## 4. 历史漂移项复核（已完成）

| # | 漂移项 | 现状 | 证据 |
|---|---|---|---|
| 1 | `ticket_approved` -> `tickets_approved` | 已修复 | `.claude/commands/approve.md:87` |
| 2 | `/verify` 状态应为 `story_verified` | 已修复 | `.claude/commands/verify.md:24` |
| 3 | context-compression 示例状态 | 已修复 | `.claude/skills/context-compression/SKILL.md:42` |
| 4 | state-diagram 节点 `story_done` 漂移 | 已修复 | `.claude/skills/workflow-engine/references/state-diagram.md:68` |
| 5 | state-diagram 缺失 `story_verified/verification_failed` | 已修复 | `.claude/skills/workflow-engine/references/state-diagram.md:118` |
| 6 | simulation `/verify` 返回值漂移 | 已修复 | `.claude/skills/workflow-engine/tests/simulation.py:108` |
| 7 | gate_verification 同上 | 已修复 | `.claude/skills/workflow-engine/tests/gate_verification.py:138` |
| 8 | approve 旧文案（触发 QA） | 已修复 | `.claude/commands/approve.md:112` |
| 9 | verify 缺 `/cc-review` 选项 | 已修复 | `.claude/commands/verify.md:56` |

## 5. 未完成缺口（必须补齐）

| 缺口 | 现状证据 | 风险 |
|---|---|---|
| `/next` 模拟未返回 `implementing` | simulation/gate 仅返回 `ticket_done` 或 `all_tickets_done` | Implement 阶段语义与状态机不一致 |
| 模拟器仍有硬编码状态返回 | `.claude/skills/workflow-engine/tests/simulation.py:89`、`.claude/skills/workflow-engine/tests/gate_verification.py:121` | 状态机变更后测试漂移 |
| 缺少一致性守护脚本 | `.claude/skills/workflow-engine/tests` 无 `consistency_check.py` | 只能人工巡检 |
| 阶段表无自动生成链路 | `.claude/skills/workflow-engine/references/state-diagram.md:112` | 文档长期漂移 |
| 缺少 workflow 级证据落盘协议 | 存在 ticket 日志模板（`.claude/templates/log.yaml`），但无 workflow 级事件落盘机制 | 无法做状态级审计与回放 |
| `split ticket` 命令写法不统一 | `/split-ticket` 与 `/split ticket` 并存 | 执行歧义 |

## 6. 设计决策

| 决策点 | 选项 | 采用 | 理由 |
|---|---|---|---|
| `execute_command` 改造方式 | A 全量 YAML；B 特殊分支 + YAML 兜底 | B | `/brainstorm`、`/next`、`/approve S-*` 存在复杂语义 |
| 状态图自动化范围 | A 全图；B 仅阶段表 | B | 主图含大量语义注释，阶段表是纯数据 |
| 一致性检查范围 | A 仅 `.py`；B `.py + .md` | B | 漂移高发在文档层 |
| 一致性运行方式 | A pre-commit；B 手动命令 | B（当前） | 先降低改造复杂度，后续再接 CI |
| 命令兼容策略 | A 立刻删旧命令；B 单版本兼容后移除 | B | 降低现网执行风险 |
| 状态机版本化 | A 不加版本；B 增加 `version` 字段 | B | 为未来迁移和事件 schema 对齐提供锚点 |

## 7. 详细实施规范

### 7.1 批次 A：模拟器动态映射兜底

目标文件：
- `.claude/skills/workflow-engine/tests/simulation.py`
- `.claude/skills/workflow-engine/tests/gate_verification.py`
- `.claude/skills/workflow-engine/state-machine.yaml`

执行规则：
1. 保留复杂分支命令：
   - `/brainstorm`
   - `/approve brainstorm`
   - `/next`
   - `/split ticket`（会写 `pending_tickets`）
   - `/approve stories`（会写 `current_story`）
   - `/approve S-*`
2. 其余命令统一走 `command_to_state` 动态匹配。
3. 若无匹配，返回 `None` 并记录到执行日志（禁止静默吞掉）。
4. `/next` 状态语义修正：
   - 当前 Story 仍有待办 ticket -> 返回 `implementing`
   - 当前 Story 刚完成最后一个 ticket -> 返回 `all_tickets_done`
5. 在 `state-machine.yaml` 顶部增加 `version: 1`（状态机 schema 版本）。

### 7.2 批次 B：一致性守护脚本 `consistency_check.py`

新增文件：
- `.claude/skills/workflow-engine/tests/consistency_check.py`

输入：
- 状态源：`.claude/skills/workflow-engine/state-machine.yaml`
- 扫描文件：
  - `.claude/commands/*.md`
  - `.claude/skills/workflow-engine/references/state-diagram.md`
  - `.claude/skills/workflow-engine/tests/*.py`
  - `.windsurf/workflows/*.md`

提取规则：
1. Python：提取字符串字面量中的状态名（精确匹配 `S` 中成员）。
2. Markdown：提取反引号与表格单元中的状态候选词。
3. 忽略注释中带 `consistency-ignore:state` 的行。

白名单（非状态机状态但允许出现）：
- `idle`
- `requirement_analysis`

动作白名单（非状态，允许在文档中出现）：
- `brainstorm`
- `approve_brainstorm`
- `split_story`
- `approve_stories`
- `split_ticket`
- `approve_tickets`
- `next`
- `verify`
- `approve_story`
- `next_story`

来源说明：
- 以上两个状态仅用于 Workflow 入口触发条件，不是状态机状态。
- 依据：`.windsurf/workflows/rpiv.md:20`

判定规则：
1. 引用不在状态集合 `S`，且不在状态白名单/动作白名单 -> `FAIL`。
2. `S` 中状态未出现在关键衍生文件 -> `WARN`（可配置升为 `FAIL`）。
3. `approval_config_keys` 的 value 必须存在于 `.claude/project/config.yaml` 的 `approval.*` 键中；缺失 -> `FAIL`。
4. 结果输出结构化摘要（`errors`、`warnings`、`scanned_files`、`timestamp`）。

### 7.3 批次 C：阶段表自动生成 `generate_phase_table.py`

新增文件：
- `.claude/skills/workflow-engine/tests/generate_phase_table.py`

修改文件：
- `.claude/skills/workflow-engine/references/state-diagram.md`

标记区块规范：
```markdown
<!-- PHASE_TABLE:BEGIN -->
... auto-generated ...
<!-- PHASE_TABLE:END -->
```

生成规则：
1. 从 `states[*].phase` 聚合状态列表。
2. 输出固定列：`阶段 | 状态 | 触发命令`。
3. 仅覆盖 marker 区块内容，不改动其他段落。

幂等要求：
1. 连续执行两次 `--write` 不产生 diff。
2. `--check` 在无差异时返回 0，有差异时返回非 0。
3. 生成后的 Implement 行必须包含：`implementing`、`ticket_done`、`all_tickets_done`。

### 7.4 批次 D：命令统一与兼容

目标文件：
- `.windsurf/workflows/split-ticket.md`
- `.claude/skills/workflow-engine/tests/command_alias_check.py`（新建）

规则：
1. 文档主命令统一为 `/split ticket S-xxx`。
2. 兼容说明保留：`/split-ticket S-xxx` 为历史别名。
3. 移除窗口：完成一个稳定迭代后删除历史别名描述。
4. `command_alias_check.py` 强校验：
   - `/split-ticket S-xxx` 只能出现在“历史别名/兼容说明”段落。
   - 主流程步骤中出现 `/split-ticket S-xxx` 直接 `FAIL`。
5. 参数化命令映射规则（避免误报）：
   - `/approve S-xxx` 视为 `/approve story` 参数化形式
   - `/verify S-xxx` 视为 `/verify` 参数化形式
   - `/split ticket S-xxx` 视为 `/split ticket` 参数化形式

### 7.5 批次 E：workflow 事件落盘（支撑可审计）

目标文件：
- `.claude/skills/workflow-engine/SKILL.md`
- `.claude/skills/brainstorming/SKILL.md`
- `.windsurf/workflows/approve.md`
- `.claude/skills/deliver-ticket/SKILL.md`
- `.claude/skills/verification/SKILL.md`
- `.windsurf/workflows/cc-review.md`
- `.claude/skills/workflow-engine/tests/event_log_check.py`（新建）

规则：
1. 新增 `append_workflow_event(event)` 统一写入 `osg-spec-docs/tasks/workflow-events.jsonl`。
2. 所有状态跃迁都必须调用事件写入：
   - 通过 workflow-engine 更新的命令：在 `update_workflow` 后写入。
   - 绕过 workflow-engine 的命令（`/brainstorm`、`/approve brainstorm`、`/next`、`/verify`）：由对应 Skill 在写 `STATE.yaml` 后写入。
   - `cc-review` 结果写状态后必须写入事件（pass/fail 均写）。
3. 写入失败即终止流程，禁止“状态已更新但无事件”的中间态。

### 7.6 批次 F：关键分支回归（支撑健壮性）

目标文件：
- `.claude/skills/workflow-engine/tests/simulation.py`
- `.claude/skills/workflow-engine/tests/gate_verification.py`
- `.claude/skills/workflow-engine/tests/cc_review_regression.py`（新建）

覆盖范围：
1. `story_verified -> /approve -> story_approved/all_stories_done`
2. `story_verified -> /cc-review (pass) -> story_done -> /approve`
3. `story_verified -> /cc-review (fail) -> verification_failed -> /verify -> story_verified`
4. `implementing -> /next (all tickets done + auto-verify fail) -> verification_failed -> /verify -> story_verified`
5. `not_started -> /brainstorm -> brainstorm_pending_confirm -> /approve brainstorm (phase0) -> /brainstorm -> brainstorm_done`

### 7.7 批次 H：Windsurf Story 防掉步硬约束（执行层）

目标文件：
- `.claude/skills/workflow-engine/SKILL.md`
- `.claude/skills/story-splitter/SKILL.md`
- `.claude/skills/ticket-splitter/SKILL.md`
- `.windsurf/workflows/approve.md`
- `.windsurf/workflows/next.md`
- `.windsurf/workflows/verify.md`
- `.claude/skills/workflow-engine/tests/story_event_log_check.py`
- `.claude/skills/workflow-engine/tests/story_integration_assertions.py`
- `.claude/skills/workflow-engine/tests/story_runtime_guard.py`（新建）
- `.claude/skills/workflow-engine/tests/ticket_status_enum_check.py`（新建）
- `.claude/skills/workflow-engine/tests/normalize_status_enum.py`（新建）

执行规则：
1. `transition()` 成为唯一状态推进入口；`update_workflow()` 仅作为兼容包装层调用 `transition()`，禁止双入口并存。
2. 强制引入 Guard：
   - `preflight_guard`：校验当前状态是否合法、上游产物存在、审批前置满足。
   - `postcheck_guard`：校验状态三元组一致、`next_requires_approval` 与配置一致、事件与状态迁移一致。
3. 定义 `phase-proof` 协议并落盘：
   - Story proof: `osg-spec-docs/tasks/proofs/{module}/story_split_phase_proof.json`
   - Ticket proof: `osg-spec-docs/tasks/proofs/{module}/{story_id}_ticket_split_phase_proof.json`
   - `/approve stories`、`/approve tickets` 必须校验 proof，否则 `FAIL`。
4. `--allow-bootstrap` 仅允许在以下条件同时满足时放行：
   - `workflow-events.jsonl` 不存在；
   - `workflow.current_step` 在 `{story_split_done, stories_approved}`；
   - `osg-spec-docs/tasks/tickets/` 无 ticket 文件。
5. 事件文件初始化由首次 `transition()` 自动创建，不再采用独立初始化流程；除 bootstrap 场景外，事件文件缺失一律 `FAIL`。
6. 状态枚举 SSOT：
   - Story: `pending|approved|done|blocked`
   - Ticket: `pending|in_progress|done|blocked`
   - 一次性迁移 `completed -> done`，迁移后禁止旧值。
7. `/split story` 与 `/split ticket` 也必须走 `transition()`，不允许直接写 `STATE.yaml` 推进状态。
8. 脚本边界明确：
   - `story_integration_assertions.py`：脚本可执行性 + 事件写入点 + 事件对账。
   - `story_runtime_guard.py`：STATE/proof/审批标记/计数一致性。

## 8. “每步结果够硬”证据协议（DoD）

### 8.1 落盘位置与格式

- 路径：`osg-spec-docs/tasks/workflow-events.jsonl`
- 格式：JSON Lines（每次状态转换追加一行）
- 原则：append-only，禁止原地修改历史事件

### 8.2 必填字段

- `event_id`（UUID）
- `schema_version`（事件 schema 版本）
- `timestamp`（ISO8601 UTC）
- `actor`（`system` / `user` / `agent`）
- `module`（`STATE.yaml.current_requirement`）
- `command`
- `state_from`
- `state_to`
- `gate_result`（`auto` / `required` + `reason`）
- `evidence_ref`（测试输出路径、报告路径、日志路径）
- `result`（`success` / `failure`）

### 8.3 写入时机与失败策略

1. 每次状态切换成功后立即写入一条事件。
2. 若事件写入失败，当前流程视为失败并停止自动继续。
3. 禁止无事件落盘的状态跃迁。

### 8.4 回放要求

基于 `workflow-events.jsonl` 可重建：
- 完整状态路径
- 每次门控决策原因
- 每次失败点与对应证据

## 9. 分阶段验收门槛（避免执行中卡住）

### 9.1 A 批次验收

```bash
python3 .claude/skills/workflow-engine/tests/simulation.py
python3 .claude/skills/workflow-engine/tests/gate_verification.py
```

通过条件：
1. 两条命令返回 0。
2. 简单命令已改为 YAML 兜底（代码审查可见）。
3. `/next` 中间态可返回 `implementing`（不再只返回 `ticket_done`）。

### 9.2 B 批次验收

```bash
python3 .claude/skills/workflow-engine/tests/consistency_check.py
```

通过条件：
1. 返回 0。
2. `errors=0`。
3. `warnings=0`（严格模式，无告警放行）。
4. `.windsurf/workflows/*.md` 被纳入扫描。
5. `approval_config_keys -> config.approval` 映射校验通过。

### 9.3 C 批次验收

```bash
python3 .claude/skills/workflow-engine/tests/generate_phase_table.py --write
python3 .claude/skills/workflow-engine/tests/generate_phase_table.py --check
```

通过条件：
1. `--check` 返回 0。
2. 连续执行 `--write` 两次无新增 diff。
3. Implement 行包含 `implementing`、`ticket_done`、`all_tickets_done`。

### 9.4 D 批次验收

```bash
python3 .claude/skills/workflow-engine/tests/command_alias_check.py
```

通过条件：
1. 返回 0。
2. 主流程步骤中无 `/split-ticket S-xxx`。
3. 历史别名仅在兼容说明段出现。
4. 参数化命令映射规则校验通过（`/approve S-xxx`、`/verify S-xxx`、`/split ticket S-xxx`）。

### 9.5 E 批次验收（可审计）

```bash
python3 .claude/skills/workflow-engine/tests/event_log_check.py
```

通过条件：
1. 返回 0。
2. 事件字段完整率 100%（第 8.2 节全部必填字段都存在）。
3. 状态转换覆盖率 100%（每次状态跃迁都有对应 event）。
4. `module` 与 `schema_version` 字段完整率 100%。

### 9.6 F 批次验收（健壮性）

```bash
python3 .claude/skills/workflow-engine/tests/cc_review_regression.py
```

通过条件：
1. 返回 0。
2. `/approve` 直通分支通过。
3. `/cc-review pass` 分支通过。
4. `/cc-review fail -> /verify` 恢复分支通过。
5. `implementing -> verification_failed -> recover` 路径通过。
6. `brainstorm_pending_confirm phase0 重跑` 路径通过。

### 9.7 G 批次验收（跨批次集成断言）

```bash
python3 .claude/skills/workflow-engine/tests/integration_assertions.py
```

通过条件：
1. 返回 0。
2. 全量模拟运行后：`workflow-events.jsonl` 事件数 = 模拟日志中的状态转换次数。
3. 事件序列可完整回放到最终状态。

### 9.8 H 批次验收（Windsurf Story 防掉步）

```bash
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py
python3 .claude/skills/workflow-engine/tests/ticket_status_enum_check.py
python3 .claude/skills/workflow-engine/tests/story_event_log_check.py
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
```

通过条件：
1. 四条命令返回 0。
2. 默认模式不允许 `SKIPPED: event log missing`。
3. `--allow-bootstrap` 仅在 7.7 节定义边界内允许放行。
4. `story_runtime_guard.py` 校验通过：
   - `next_requires_approval == requires_approval(next_step, config)`；
   - `phase-proof` 存在且 schema 合法；
   - STATE 与 stories/tickets 文件计数一致。
5. 枚举校验通过：迁移后无 `completed` 残留值。

### 9.9 全量验收

```bash
python3 .claude/skills/workflow-engine/tests/simulation.py
python3 .claude/skills/workflow-engine/tests/gate_verification.py
python3 .claude/skills/workflow-engine/tests/consistency_check.py
python3 .claude/skills/workflow-engine/tests/generate_phase_table.py --check
python3 .claude/skills/workflow-engine/tests/command_alias_check.py
python3 .claude/skills/workflow-engine/tests/event_log_check.py
python3 .claude/skills/workflow-engine/tests/cc_review_regression.py
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py
python3 .claude/skills/workflow-engine/tests/ticket_status_enum_check.py
python3 .claude/skills/workflow-engine/tests/story_event_log_check.py
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
python3 .claude/skills/workflow-engine/tests/integration_assertions.py
```

## 10. 执行顺序

1. 先做 A（先消除硬编码漂移源）。
2. 再做 B（建立自动守护）。
3. 再做 C（文档自动化）。
4. 再做 D（命令一致性补齐）。
5. 再做 E（落地可审计事件流）。
6. 再做 F（补齐关键分支回归）。
7. 再做 H（Windsurf Story 防掉步硬约束）。
8. 再做 G（跨批次集成断言）。
9. 完成后执行全量验收。

## 11. 领先判定标准（对标业界优秀方案）

说明：无法对“全行业全部方案”做绝对保证；本项目采用可量化判定。满足以下全部条件，即认定在“单人自动化工作流”场景达到业界优秀线以上。

| 维度 | 判定项 | 通过阈值 |
|---|---|---|
| 一致性 | 状态引用漂移 | `consistency_check` 无 error |
| 自动化 | 主流程自动跑通 | `simulation` + `gate_verification` 全通过 |
| 可审计 | 状态事件可回放 | 100% 状态转换有事件记录 |
| 事件完整性 | 字段与计数一致 | 字段完整率 100% + 事件数 = 状态转换数 |
| 可复现 | 阶段表生成幂等 | `generate_phase_table --check` 持续通过 |
| 健壮性 | 关键分支覆盖 | `/approve` 与 `/cc-review` 分支均有回归用例 |
| 错误恢复 | fail->recover 可恢复 | `verification_failed` 可通过 `/verify` 恢复并有回归用例 |
| 变更安全 | 命令歧义控制 | 主命令唯一，旧命令仅兼容声明 |
| 防掉步 | 执行层硬门禁生效 | `story_runtime_guard` + `story_event_log_check` 全通过且无越权状态推进 |

最终判定：
1. 上表 9/9 通过 -> `PASS`（达到“业界优秀线以上”的项目内定义）。
2. 任一失败 -> `FAIL`（不得宣称领先）。

## 12. 执行记录（模板）

| 日期 | 批次 | 变更文件 | 验收结果 | 备注 |
|---|---|---|---|---|
| YYYY-MM-DD | A/B/C/D/E/F/H/G | path1, path2 | pass/fail | - |
