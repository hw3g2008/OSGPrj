# Windsurf Story 执行防掉步修复计划（Implement-Fix 专用）

> 设计原则：执行路径唯一、状态更新原子化、门控不可绕过、失败即停、证据可回放。

## 一、目标

- 一句话目标：让 Windsurf 在 Story 主链路执行时无法跳过质量门、审批门和审计门。
- 验收标准（可度量）：
  - 所有会推进 `workflow.current_step` 的动作都走统一状态入口。
  - `next_requires_approval` 不允许手写，必须由状态机+配置实时推导。
  - `workflow-events.jsonl` 缺失或写入失败时，流程失败，不允许 SKIP。
  - Story/Ticket 状态枚举统一，无 `done/completed` 混用。
  - Story 关键回归路径通过率 100%（含 fail-recover）。

## 二、前置条件与假设

- 假设 1：本轮只覆盖 Story 主链路（`/split story -> /approve(Stories阶段) -> /split ticket -> /approve(Tickets阶段) -> /next -> /verify -> /cc-review|/approve`）。
- 假设 2：`.claude/skills/workflow-engine/state-machine.yaml` 是状态语义 SSOT。
- 假设 3：允许新增守护脚本到 `.claude/skills/workflow-engine/tests/`。
- 假设 4：允许调整 Windsurf workflow 文档，使其显式调用统一守护入口。

## 三、现状分析

- 当前保障强在“校验层”（simulation/regression），弱在“执行层硬约束”。
- 现有关键问题：
  - 状态写入分散，多处直接写 `STATE.yaml`，容易漏字段或写错值。
  - `next_requires_approval` 没有统一重算入口，可能与 `config.approval` 漂移。
  - 事件日志缺失仍可 SKIP，导致“流程通过但审计为空”。
  - 枚举混用（`done/completed`）导致统计和门控口径不一致。

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|---|---|---|---|
| 1 | `transition()` 与 `update_workflow()` 关系 | A 并存双入口；B 直接替换；C `update_workflow` 包装 `transition` | C | 兼容现有调用，避免一次性断裂，同时保证单一落地入口。 |
| 2 | Guard 机制 | A 仅文档约定；B 强制 `preflight/postcheck` | B | 防掉步必须在执行时阻断，不依赖“自觉”。 |
| 3 | Phase 证明 | A 只打印日志；B 落盘 `phase-proof` 并强校验 | B | 让 Windsurf 的 `/approve` 在 Stories/Tickets 阶段有硬前提。 |
| 4 | 事件日志策略 | A 缺失 SKIP；B 缺失 FAIL | B | 审计是硬门槛。 |
| 5 | Bootstrap 策略 | A 永远允许临时放行；B 仅严格首轮条件允许 | B | 兼顾首次引导与后续强约束。 |
| 6 | 事件文件初始化 | A 额外初始化步骤；B 首次 `transition` 自动创建 | B | 去掉双重机制，避免与“缺失即 FAIL”冲突。 |
| 7 | 状态枚举 | A 兼容多值；B 定义单一枚举并迁移 | B | 统一统计、验收、回归口径。 |
| 8 | 新旧脚本边界 | A 职责重叠；B 明确分工 | B | 避免重复检查和结果互相覆盖。 |

## 五、目标状态（硬约束定义）

### 5.1 单一状态入口

```text
任何会推进 workflow.current_step 的命令
  -> preflight_guard(command, state, artifacts)
  -> transition(command, state_from, state_to, meta)
  -> postcheck_guard(state_after, event_after, artifacts)
```

`update_workflow` 关系定义（必须落文档并实现）：
- `update_workflow()` 不再直接写 `STATE.yaml`，仅作为兼容包装层调用 `transition()`。
- 新增命令路径（Windsurf workflow）直接调用 `transition()`。
- 禁止出现第二套能独立推进 `current_step` 的写入逻辑。

### 5.2 Guard 职责

`preflight_guard` 必查项：
- 当前 `workflow.current_step` 是否允许执行该命令（基于 state-machine）。
- 上游产物是否存在（SRS、Story、Ticket、phase-proof）。
- 审批门是否满足（需审批时必须有裁决或 proof）。
- 审批判断来源必须复用 `state-machine.yaml` 的 `states[*].approval_required` 与 `approval_key`，再结合 `config.approval` 得出最终门控结果。

`postcheck_guard` 必查项：
- `current_step/next_step/next_requires_approval` 三元组一致。
- `next_requires_approval == requires_approval(next_step, config)`。
- 最新事件落盘成功，且 `state_from/state_to` 与本次迁移一致。
- 关键产物计数一致（STATE 与 stories/tickets 文件一致）。

### 5.3 Phase-proof 协议

- 路径：
  - Story 拆分：`osg-spec-docs/tasks/proofs/{module}/story_split_phase_proof.json`
  - Ticket 拆分：`osg-spec-docs/tasks/proofs/{module}/{story_id}_ticket_split_phase_proof.json`
- 写入方：
  - `story-splitter` 在 Phase 2+3 全通过后写入 Story proof。
  - `ticket-splitter` 在 Phase 2+3 全通过后写入 Ticket proof。
- 校验方：
  - Windsurf 的 `/approve`（`current_step=story_split_done` 或 `ticket_split_done`）在 `preflight_guard` 必须校验对应 proof。
  - `story_runtime_guard.py` 做二次一致性校验。
- JSON schema（最小字段）：
  - `schema_version`
  - `module`
  - `phase`（`story_split` / `ticket_split`）
  - `target_id`（`module` 或 `story_id`）
  - `rounds`
  - `issues_count`
  - `coverage`
  - `generated_at`
  - `source_hash`
  - `status`（`passed`）
- `source_hash` 定义（必须统一）：
  - 算法：`sha256`。
  - `phase=story_split`：哈希源为 `osg-spec-docs/docs/02-requirements/srs/{module}.md` 的规范化文本（统一 LF、去除行尾空白）。
  - `phase=ticket_split`：哈希源为 `osg-spec-docs/tasks/stories/{story_id}.yaml` 的规范化文本（统一 LF、去除行尾空白）。
  - 审批侧校验：`preflight_guard` 重新计算哈希；若与 proof 的 `source_hash` 不一致则拒绝推进并要求重新拆分。

### 5.4 Bootstrap 边界（`--allow-bootstrap`）

仅当以下条件同时满足才允许：
- `workflow-events.jsonl` 不存在。
- `workflow.current_step` 属于 `{story_split_done, stories_approved}`（尚未进入 ticket 执行环）。
- `osg-spec-docs/tasks/tickets/` 下无任何 Ticket 文件。

否则事件日志缺失一律 `FAIL`。

### 5.5 状态枚举 SSOT

- Story YAML 状态枚举：`pending | approved | done | blocked`
- Ticket YAML 状态枚举：`pending | in_progress | done | blocked`
- 迁移映射：`completed -> done`（一次性迁移脚本执行后禁止再出现）
- Story 不定义 `in_progress`：Story 执行进度由 `workflow.current_step` 表达（`stories_approved`/`tickets_approved`/`implementing`/`story_verified`），Story YAML 只记录业务审批与完成状态。
- 模板一致性要求：`.claude/templates/story.yaml` 与 `.claude/templates/ticket.yaml` 必须与本节枚举完全一致，禁止保留 `completed`。

### 5.6 脚本职责边界

- `story_integration_assertions.py`：检查“脚本存在性/可执行性/事件写入点覆盖/事件数对账”。
- `story_runtime_guard.py`：检查“运行态 STATE 一致性、proof 存在性、审批标记一致性、文件计数一致性”。
- 两者都失败时，统一视为阻断，不允许推进下一步。

### 5.7 枚举迁移脚本时机（`normalize_status_enum.py`）

- 角色定位：一次性迁移脚本 + 持续校验脚本（同一文件双模式）。
- 执行模式：
  - `--apply`：只允许在批次 D 首次执行一次，负责把 `completed` 迁移为 `done` 并输出迁移报告。
  - `--check`：用于后续验收/CI，若仍发现 `completed` 直接失败。
- 审计产物：输出 `osg-spec-docs/tasks/audit/enum-migration-report.json`（包含修改文件数、字段数、执行时间、执行人）。
- 约束：批次 D 后禁止再次使用 `--apply`（除非显式回滚并重开变更）。

## 六、执行清单

| # | 文件/模块 | 位置 | 当前值 | 目标值 |
|---|---|---|---|---|
| 1 | `.claude/skills/workflow-engine/SKILL.md` | 状态更新章节 | `update_workflow` 可直接写状态 | 明确 `update_workflow -> transition` 包装关系；`transition` 为唯一推进入口 |
| 2 | `.claude/skills/workflow-engine/SKILL.md` | Guard 章节 | 无明确契约 | 增加 `preflight_guard/postcheck_guard` 伪代码与必查项 |
| 3 | `.claude/skills/story-splitter/SKILL.md` | `/split story` 写状态段 | 直接写 `current_step/next_step` | 改为写 proof + 调用 `transition("/split story")`；同步更新 SKILL.md 内嵌模板注释的 Story 状态枚举（去掉 `completed`） |
| 4 | `.claude/skills/ticket-splitter/SKILL.md` | `/split ticket` 写状态段 | 直接写 `current_step/next_step` | 改为写 proof + 调用 `transition("/split ticket")`；同步更新 SKILL.md 内嵌模板注释的 Ticket 状态枚举（`completed -> done`） |
| 5 | `.windsurf/workflows/approve.md` | Stories/Tickets 审批 | 直接写状态 | 改为 `preflight -> transition -> postcheck`；强校验 proof |
| 6 | `.windsurf/workflows/next.md` + `.claude/skills/deliver-ticket/SKILL.md` | 执行后状态更新（含 W3/W4/W5） | next.md 描述级约束；deliver-ticket 三处 `append_workflow_event` 未检查返回值/未回滚 | 统一改为经 `transition` 写入；事件失败即回滚+终止 |
| 7 | `.windsurf/workflows/verify.md` | 验收写回 | 描述级约束 | 明确无事件记录即失败；不得保留 SKIP 语义 |
| 8 | `.windsurf/workflows/cc-review.md` | CC 审核后状态写回 | 直接写状态 | 改为 `preflight -> transition -> postcheck`；失败路径必须落事件并保持 `verification_failed + next_step=null` |
| 9 | `.claude/skills/workflow-engine/tests/story_event_log_check.py` | 缺失事件分支 | SKIPPED + exit 0 | 按第 5.4 条：仅 bootstrap 放行，否则 FAIL |
| 10 | `.claude/skills/workflow-engine/tests/story_integration_assertions.py` | 事件缺失处理 | 模拟通过 | 默认严格 FAIL；仅 `--allow-bootstrap` 且满足边界才放行 |
| 11 | `.claude/skills/workflow-engine/tests/story_runtime_guard.py`（新建） | 新文件 | 无 | 校验 STATE/proof/approval/计数一致性 |
| 12 | `.claude/skills/workflow-engine/tests/ticket_status_enum_check.py`（新建） | 新文件 | 无 | 强制 Story/Ticket 状态枚举符合第 5.5 条 |
| 13 | `.claude/skills/workflow-engine/tests/normalize_status_enum.py`（新建） | 新文件 | 无 | 支持 `--apply/--check` 双模式；批次 D 执行一次 `--apply` |
| 14 | `.claude/templates/story.yaml` | `status` 注释枚举 | `completed` | 改为 `pending | approved | done | blocked` |
| 15 | `.claude/templates/ticket.yaml` | `status` 注释枚举 | `completed` | 改为 `pending | in_progress | done | blocked` |
| 16 | `docs/windsurf-story-no-skip-fix-plan.md` | 执行记录 | 初稿 | 回填批次执行与双轮无修改结论 |

## 七、分批实施

- 批次 A（入口收敛）：#1 #2  
目标：消除双入口，明确 Guard 合同。

- 批次 B（拆分环节补齐）：#3 #4 #5  
目标：把 `/split story`、`/split ticket`、`/approve` 纳入硬门禁。

- 批次 C（执行与验收环节补齐）：#6 #7 #8  
目标：`/next`（含 `deliver-ticket` W3/W4/W5 回滚补齐）、`/verify`、`/cc-review` 不可绕过事件与状态一致性。

- 批次 D（审计与守护脚本）：#9 #10 #11 #12 #13 #14 #15  
目标：把“发现问题”升级成“阻断推进”，并完成状态枚举与模板的一次性收敛。

- 批次 E（收口）：#16  
目标：全量验收 + 两轮无修改结论。

## 八、验收命令

首次落地（含一次性迁移）：

```bash
python3 .claude/skills/workflow-engine/tests/normalize_status_enum.py --apply
python3 .claude/skills/workflow-engine/tests/normalize_status_enum.py --check
python3 .claude/skills/workflow-engine/tests/simulation.py
python3 .claude/skills/workflow-engine/tests/gate_verification.py
python3 .claude/skills/workflow-engine/tests/story_regression.py
python3 .claude/skills/workflow-engine/tests/story_command_alias_check.py
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py
python3 .claude/skills/workflow-engine/tests/ticket_status_enum_check.py
python3 .claude/skills/workflow-engine/tests/story_event_log_check.py
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
```

后续日常/CI（禁止再次迁移）：

```bash
python3 .claude/skills/workflow-engine/tests/normalize_status_enum.py --check
python3 .claude/skills/workflow-engine/tests/simulation.py
python3 .claude/skills/workflow-engine/tests/gate_verification.py
python3 .claude/skills/workflow-engine/tests/story_regression.py
python3 .claude/skills/workflow-engine/tests/story_command_alias_check.py
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py
python3 .claude/skills/workflow-engine/tests/ticket_status_enum_check.py
python3 .claude/skills/workflow-engine/tests/story_event_log_check.py
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
```

通过标准：
- 全部返回码为 0。
- 默认模式不允许 `SKIPPED: event log missing`。
- `--allow-bootstrap` 只能在第 5.4 条定义边界内使用。
- `story_runtime_guard.py` 报告 `next_requires_approval` 与 `config.approval` 一致。
- `normalize_status_enum.py --apply` 仅执行一次，且产出 `enum-migration-report.json`。
- `.claude/templates/story.yaml` 与 `.claude/templates/ticket.yaml` 不再出现 `completed`。

## 九、自校验结果

| 校验项 | 通过？ | 说明 |
|---|---|---|
| G1 一看就懂 | ✅ | 目标只聚焦 Story 防掉步。 |
| G2 目标明确 | ✅ | 每条验收标准可脚本化。 |
| G3 假设显式 | ✅ | 范围、边界、bootstrap 条件已写清。 |
| G4 设计决策完整 | ✅ | 覆盖 8 个关键决策含双入口关系。 |
| G5 执行清单可操作 | ✅ | 文件、位置、当前值、目标值齐全。 |
| F2 状态一致性 | ✅ | 通过单入口+postcheck+枚举校验落实。 |
| C1 根因定位 | ✅ | 从“校验层软约束”升级为“执行层硬阻断”。 |

## 十、执行记录

| 批次 | 条目 | 修改文件 | 状态 |
|------|------|----------|------|
| A | #1 transition() 定义 | `workflow-engine/SKILL.md` §5a | ✅ |
| A | #2 preflight/postcheck guard | `workflow-engine/SKILL.md` §5b §5c | ✅ |
| B | #3 story-splitter proof+transition | `story-splitter/SKILL.md` line 287-309 | ✅ |
| B | #4 ticket-splitter proof+transition | `ticket-splitter/SKILL.md` line 400-430 | ✅ |
| B | #5 approve.md preflight→transition→postcheck | `.windsurf/workflows/approve.md` line 40-79 | ✅ |
| C | #6 next.md + deliver-ticket W3/W4/W5 | `next.md` line 34-42 + `deliver-ticket/SKILL.md` line 465-485 | ✅ |
| C | #7 verify.md transition | `.windsurf/workflows/verify.md` line 25-36 | ✅ |
| C | #8 cc-review.md transition | `.windsurf/workflows/cc-review.md` line 88-101 | ✅ |
| D | #9 event_log FAIL+bootstrap | `story_event_log_check.py` line 136-169 | ✅ |
| D | #10 integration 严格模式 | `story_integration_assertions.py` line 24-46, 63-85, 138-187 | ✅ |
| D | #11 runtime_guard 新建 | `story_runtime_guard.py`（230 行） | ✅ |
| D | #12 enum_check 新建 | `ticket_status_enum_check.py`（120 行） | ✅ |
| D | #13 normalize 新建 | `normalize_status_enum.py`（150 行） | ✅ |
| D | #14 story.yaml 模板 | `.claude/templates/story.yaml` line 11 | ✅ |
| D | #15 ticket.yaml 模板 | `.claude/templates/ticket.yaml` line 10 | ✅ |
| E | #16 全量验收+回填 | 本节 | ✅ |

### 验收结果（bootstrap 模式，`--allow-bootstrap`）

| 脚本 | 结果 |
|------|------|
| `normalize_status_enum.py --check` | PASS |
| `simulation.py` | PASS |
| `gate_verification.py` | PASS |
| `story_regression.py` | PASS |
| `story_command_alias_check.py` | PASS |
| `story_runtime_guard.py` | PASS |
| `ticket_status_enum_check.py` | PASS |
| `story_event_log_check.py --allow-bootstrap` | BOOTSTRAP（首轮允许） |
| `story_integration_assertions.py --allow-bootstrap` | PASS（8/8 脚本通过） |

### 严格模式验证

| 脚本 | 结果 | 说明 |
|------|------|------|
| `story_event_log_check.py`（无参数） | FAIL exit=1 | 正确行为：事件文件不存在时硬阻断 |

## 十一、执行入口

```text
/implement-fix-plan docs/windsurf-story-no-skip-fix-plan.md
```
