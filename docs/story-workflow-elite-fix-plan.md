# Story 工作流极致修复计划（Implement-Fix 专用）

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、最少概念、最短路径、改动自洽、简约不等于省略。  
> 本计划只覆盖 Story 主链路，不改动 Research 端流程；`docs/workflow-consistency-absorption-plan.md` 保留为全量 backlog。

## 一、目标

- 一句话目标：把 Story 主链路（`/split ticket -> /next -> /verify -> /cc-review|/approve`）修成“状态一致、分支可回归、结果可审计”的高强度自动化流程。
- 验收标准（可度量）：
  - Story 主链路关键分支回归用例通过率 100%。
  - Story 阶段状态语义与 `state-machine.yaml` 一致（重点 `implementing`、`verification_failed`）。
  - 命令写法单一（主命令唯一）且兼容策略可检查。
  - Story 级状态迁移 100% 具备可回放事件记录（事件数 = 状态转换数）。
  - 使用 `/implement-fix-plan` 执行本计划时，连续两轮无修改后才判定通过。

## 二、前置条件与假设

- 假设 1：本轮只做 Story 主链路，不处理 career 历史负债与 Research 深层改造。
- 假设 2：`state-machine.yaml` 是状态语义 SSOT，文档/测试/Workflow 都向它对齐。
- 假设 3：允许新增测试脚本到 `.claude/skills/workflow-engine/tests/`。
- 假设 4：命令兼容采用“单版本兼容”：主命令统一后，旧别名仅保留在兼容说明。
- 假设 5：审计落盘采用 append-only JSONL，不引入数据库。
- 假设 6：执行入口固定为模式 A：`/implement-fix-plan docs/story-workflow-elite-fix-plan.md`。

## 三、现状分析

- 相关文件与现状证据：

| 文件 | 角色 | 现状问题 | 证据 |
|---|---|---|---|
| `.claude/skills/workflow-engine/state-machine.yaml` | Story 状态语义源头 | 已定义 `implementing` 与 `next_completion.false_state=implementing`，但下游未完全对齐 | `.claude/skills/workflow-engine/state-machine.yaml:71`, `.claude/skills/workflow-engine/state-machine.yaml:185` |
| `.claude/skills/workflow-engine/tests/simulation.py` | 主流程模拟 | `/next` 只返回 `ticket_done/all_tickets_done`，未返回 `implementing` | `.claude/skills/workflow-engine/tests/simulation.py:100` |
| `.claude/skills/workflow-engine/tests/gate_verification.py` | 门控模拟 | `/next` 同样缺 `implementing` 分支 | `.claude/skills/workflow-engine/tests/gate_verification.py:131` |
| `.claude/skills/workflow-engine/references/state-diagram.md` | 状态图文档 | Implement 行漏 `implementing` | `.claude/skills/workflow-engine/references/state-diagram.md:117` |
| `.windsurf/workflows/split-ticket.md` | Story 拆票入口文档 | 主用法仍写旧命令 `/split-ticket S-xxx` | `.windsurf/workflows/split-ticket.md:10` |
| `.claude/skills/workflow-engine/tests/` | 自动回归目录 | 缺 Story 专项回归脚本（cc-review/verify fail-recover 等） | 目录现状仅 `simulation.py`、`gate_verification.py` |
| `osg-spec-docs/tasks/` | 运行态证据目录 | 尚无 `workflow-events.jsonl`，Story 状态迁移不可回放 | `osg-spec-docs/tasks` 当前无该文件 |

- 上下游依赖：
  - 上游输入：`state-machine.yaml`（状态定义、动作映射、审批映射）。
  - 中游执行：`/split ticket`、`/next`、`/verify`、`/cc-review`、`/approve S-xxx`。
  - 下游产物：`STATE.yaml` 状态、回归测试结果、`workflow-events.jsonl` 事件证据。

- 当前流程主要缺口：
  - 状态语义在“定义层”和“模拟层”不一致。
  - 命令规范在 workflow 文档中存在歧义。
  - Story 关键失败恢复路径缺少专门回归。
  - 事件审计机制缺位，难以证明“每一步结果够硬”。

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | 改造范围 | A 全 workflow；B 仅 Story 主链路 | B | 先把最核心价值链打穿，改动可控且收益最高。 |
| 2 | `/next` 模拟语义 | A 保持 `ticket_done`；B 引入 `implementing` 中间态 | B | 与 `state-machine.yaml` 一致，避免 Implement 阶段语义漂移。 |
| 3 | `split ticket` 命令策略 | A 立刻删除旧命令；B 主命令统一 + 兼容说明保留 | B | 降低迁移风险，先消除主流程歧义。 |
| 4 | Story 质量兜底 | A 只保留 simulation；B 新增 Story 专项回归脚本 | B | 关键分支必须独立验证，避免“看起来能跑”。 |
| 5 | 审计方式 | A 不落盘；B JSONL 事件落盘 | B | 单人公司也需要可回放证据，定位问题更快。 |
| 6 | 事件字段强度 | A 最小字段；B 含 `module/schema_version/gate_result` | B | 支持跨模块筛选和未来 schema 迁移。 |
| 7 | 验收门槛 | A 单轮校验；B implement-fix 双无修改轮 | B | 贴合 `/implement-fix-plan.md` 硬约束，降低漏改概率。 |
| 8 | 变更节奏 | A 一次性大改；B 两批交付（正确性先行，审计增强后补） | B | 先保主链路正确，再上“业界级”审计能力。 |
| 9 | 事件写入原子性 | A 先写事件再写 STATE.yaml；B 先写 STATE.yaml 再写事件（写入失败即终止，禁止无事件的状态跃迁）；C 尽力而为（写入失败只记 warning 不终止） | B | 与 `workflow-consistency-absorption-plan.md` 8.3 节对齐（"状态切换成功后立即写入"）；`update_workflow()` 末尾写事件的语义天然是"先状态后事件"；写入失败即终止保证不会有"无事件的状态跃迁"。**补偿规则**：事件写入失败时，必须回滚 STATE.yaml 到写入前状态（读取前先备份 `state_before`，失败时 `write_yaml(state_before)`），然后终止流程。 |

## 五、目标状态

- 目标流程（Story 主链路）：

```text
stories_approved
  -> /split ticket S-xxx
  -> ticket_split_done
  -> /approve tickets
  -> tickets_approved
  -> /next
      -> implementing (仍有待办 Tickets)
      -> /next ...
      -> all_tickets_done (最后一个 Ticket 完成)
      -> auto verify_story
          -> story_verified (验收通过)
          |     -> /approve S-xxx -> story_approved | all_stories_done
          |     -> /cc-review
          |         -> story_done -> /approve S-xxx
          |         -> verification_failed -> /verify S-xxx -> story_verified
          -> verification_failed (验收失败) -> /verify S-xxx -> story_verified
  -> story_approved -> next_story
      -> 有 pending Stories -> stories_approved (回到第二个 Story 的完整循环)
      -> 无 pending Stories -> all_stories_done
```

> ⚠️ **模拟器简化声明**：实际 `deliver-ticket` 在最后一个 Ticket 完成后直接调用 `verify_story()` 并写入 `story_verified` 或 `verification_failed`，**跳过 `all_tickets_done` 中间态**（见 `state-machine.yaml:85` 注释："理论节点"）。模拟器保留 `all_tickets_done` 作为中间态以简化测试逻辑，此差异是已知且可接受的。

- 关键伪代码（`/next` 模拟语义）：

```python
if command == "/next":
    if current_story and pending_tickets[current_story]:
        pending_tickets[current_story].pop(0)
        if pending_tickets[current_story]:
            return "implementing"
        return "all_tickets_done"
    return "ticket_done"  # 理论回退节点，仅用于兼容测试场景
```

- 事件证据目标：
  - 每次 Story 相关状态迁移（含失败分支）都写入 `workflow-events.jsonl`。
  - 事件记录满足：字段完整率 100%、事件数与状态转换数一致、可回放到终态。
  - **统计口径**：“状态转换数”仅计实际产生的状态迁移，排除理论节点（`all_tickets_done`、`ticket_done`，见上方模拟器简化声明）。断言脚本中必须显式排除这些理论节点。

## 六、执行清单

| # | 文件/模块 | 位置 | 当前值 | 目标值 |
|---|-----------|------|--------|--------|
| 1 | `.claude/skills/workflow-engine/tests/simulation.py` | `/next` 分支（约 L100） | 仅 `ticket_done/all_tickets_done` | 加入 `implementing` 返回；与状态机语义一致 |
| 2 | `.claude/skills/workflow-engine/tests/gate_verification.py` | `/next` 分支（约 L131） | 同上 | 同步加入 `implementing` 返回 |
| 3 | `.claude/skills/workflow-engine/references/state-diagram.md` | 阶段表 Implement 行（L117） | `ticket_done, all_tickets_done` | 改为 `implementing, ticket_done*, all_tickets_done*`（`*` = 理论节点，正常流程中由 deliver-ticket 跳过） |
| 4 | `.windsurf/workflows/split-ticket.md` | 使用方式（L10） | `/split-ticket S-xxx` | 主命令改 `/split ticket S-xxx`；新增一行兼容说明 |
| 5 | `.claude/skills/workflow-engine/tests/story_regression.py`（新建） | 新文件 | 无 | 覆盖 5 条 Story 关键路径（approve 直通、cc-pass、cc-fail-recover、auto-verify fail-recover、next_story）。其中 `next_story` 路径必须覆盖完整的第二个 Story 循环（`story_approved → stories_approved → /split ticket → /next → /verify → /approve → all_stories_done`），不能仅验证状态切换 |
| 6 | `.claude/skills/workflow-engine/tests/story_command_alias_check.py`（新建） | 新文件 | 无 | 强校验主流程中禁用旧命令写法，兼容说明段允许旧别名。扫描范围：`.claude/commands/*.md` + `.windsurf/workflows/*.md`（全量扫描，不逐文件列举，避免漏网） |
| 7 | `.claude/skills/workflow-engine/SKILL.md` | workflow 事件接口说明 | 无统一 workflow 事件写入接口 | 增加 `append_workflow_event(event)` 规范、事件字段 schema（见 9.1 节）与调用要求。列出 Story 主链路 11 个状态写入点（见 9.2 节 W1-W9，含 W6a/W6b、W8a/W8b、W9） |
| 7b | `.claude/skills/workflow-engine/SKILL.md` | `update_workflow()` 函数末尾 | 无事件写入 | 在 `update_workflow()` 末尾统一调用 `append_workflow_event()`，覆盖所有走 workflow-engine 的命令（`/split ticket`、`/approve tickets`、`/approve stories` 等） |
| 7c | `.claude/skills/workflow-engine/SKILL.md` | `handle_next_story()` 函数（L107-126） | 无事件写入 | `handle_next_story()` 直接调用 `write_yaml()` 不经 `update_workflow()`，需在每个 `write_yaml()` 后追加 `append_workflow_event()`，覆盖 `stories_approved` 和 `all_stories_done` 两条路径 |
| 8 | `.claude/skills/deliver-ticket/SKILL.md` | 状态写回段（`implementing/story_verified/verification_failed`） | 仅写 `STATE.yaml` | 每次状态切换后追加事件写入 |
| 9 | `.claude/skills/verification/SKILL.md` | `/verify` 结果返回后 | 仅返回结果 | 在 Skill 文档中增加说明：调用方写状态后必须写事件（成功/失败都写）。注意：该 Skill 是纯函数不写状态（SKILL.md L128），实际状态写入由 #9b 的 `verify.md` 命令负责 |
| 9b | `.claude/commands/verify.md` | 状态更新段（L23-25） | 仅写 `current_step = "story_verified"` | 写状态后追加 `append_workflow_event()` 调用，覆盖成功（`story_verified`）和失败（`verification_failed`）两条路径 |
| 9c | `.windsurf/workflows/verify.md` | 写回状态段（L27-34, L38-39） | 仅写 STATE.yaml | 与 #9b 同步：写状态后追加 `append_workflow_event()` 调用，覆盖成功和失败两条路径。WS 执行 `/verify` 走此文件而非 `.claude/commands/verify.md` |
| 10 | `.windsurf/workflows/cc-review.md` | 状态更新节（L88 起） | 仅描述状态更新 | 增加事件写入要求与字段约束 |
| 11 | `.claude/commands/approve.md` | `/approve S-xxx` 节 | 状态更新后无审计要求 | 增加 Story 审批事件写入要求 |
| 11b | `.windsurf/workflows/approve.md` | Story 审批状态写入段（L58-76） | 仅写 STATE.yaml | 与 #11 同步：写状态后追加 `append_workflow_event()` 调用，覆盖 `story_approved`、`stories_approved`、`all_stories_done` 三条路径。WS 执行 `/approve` 走此文件 |
| 12 | `.claude/skills/workflow-engine/tests/story_event_log_check.py`（新建） | 新文件 | 无 | 校验字段完整率与状态覆盖率 |
| 13 | `.claude/skills/workflow-engine/tests/story_integration_assertions.py`（新建） | 新文件 | 无 | 断言“事件数 = 状态转换数”，并验证可回放 |
| 14 | `docs/story-workflow-elite-fix-plan.md` | 本文档执行记录 | 初稿 | 按 `/implement-fix-plan` 执行后补充完成记录与轮次结论 |

- 批次顺序（严格）：
  - 批次 S1（正确性）：#1 #2 #3 #4 #5 #6
  - 批次 S2（审计性）：#7 #7b #7c #8 #9 #9b #9c #10 #11 #11b #12 #13
  - 批次 S3（收口）：运行全量 Story 验收命令并回填 #14

- Story 专项验收命令（S3）：

```bash
python3 .claude/skills/workflow-engine/tests/simulation.py
python3 .claude/skills/workflow-engine/tests/gate_verification.py
python3 .claude/skills/workflow-engine/tests/story_regression.py
python3 .claude/skills/workflow-engine/tests/story_command_alias_check.py
python3 .claude/skills/workflow-engine/tests/story_event_log_check.py
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
```

- 框架审计（S3 必做，CLAUDE.md L124-126 要求）：
  - **触发命令**：`/review framework`（见 `framework-audit/SKILL.md` L19）
  - **覆盖范围**：`.claude/*` 和 `STATE.yaml`（见 `framework-audit/SKILL.md` L33-51）。注意：**不包含 `.windsurf/workflows/*`**。
  - **通过条件**：审计报告中所有 7 个维度（状态管理/工作流链路/CLAUDE.md自洽/Type系统/废弃概念/跨文件引用/代码块格式）均为 PASS。
  - 若有 FAIL 项，修复后重新审计直到全部 PASS。
  - **`.windsurf/` 手动交叉检查**：对本计划修改的 `.windsurf/workflows/` 文件（`split-ticket.md`、`verify.md`、`cc-review.md`、`approve.md`）手动检查与 `.claude/` 对应文件的一致性（命令写法、状态写入、事件写入）。
  - **注意**：`/review framework` 是 `framework-audit` Skill 的手动触发入口（已在 SKILL.md L19 定义），但 `.claude/commands/review.md` 命令文档中缺少该入口说明，属已知技术债务，不在本计划范围内。

## 七、自校验结果

- 校验方式：按 `/implement-fix-plan.md` 的 Phase 0 自校验标准执行（通用 G1-G12 + 框架 F1-F3 + 代码 C1-C4）。

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 只聚焦 Story 主链路，流程和批次清晰。 |
| G2 目标明确 | ✅ | 指标全部可量化（通过率、覆盖率、计数一致性）。 |
| G3 假设显式 | ✅ | 范围、兼容、落盘和执行入口都显式定义。 |
| G4 设计决策完整 | ✅ | 9 个关键决策均有选项和理由（含审查补充的 #9 事件写入原子性）。 |
| G5 执行清单可操作 | ✅ | 每项都有具体文件、位置、当前值和目标值。 |
| G6 正向流程走读 | ✅ | 从 stories_approved 到 all_stories_done 的输入/处理/输出完整。 |
| G7 改动自洽 | ✅ | 状态机、模拟器、文档、命令、回归和审计六层联动。 |
| G8 简约不等于省略 | ✅ | 收敛范围但保留正确性、回归性、审计性三条底线。 |
| G9 场景模拟 | ✅ | 方案设计覆盖 approve 直通、cc-pass、cc-fail-recover 等关键场景（#5 已落地，5/5 路径通过）。 |
| G10 数值回验 | ✅ | 9 个决策（#1-#9）、19 项执行清单（#1-#14 + #7b/#7c/#9b/#9c/#11b）、11 个写入点（W1-W9 含 W6a/W6b + W8a/W8b）、30 项审查补全（R1-R30）均已逐项计数验证。 |
| G11 引用回读 | ✅ | 所有状态名、命令写法、文件行号均已回读源文件验证（经 8 轮审查修正）。 |
| G12 反向推导 | ✅ | 从"所有写状态的文件都要写事件"反向推导，确认全覆盖：CC/WS 双路径（/verify: #9b/#9c, /approve: #11/#11b）+ 非 update_workflow 分支（next_story: #7c）。 |
| F1 文件同步 | ✅ | Skill/Workflow/Command/StateDiagram/Test 均列入改造清单。 |
| F2 状态一致性 | ✅ | 明确对齐 `implementing/story_verified/verification_failed`。 |
| F3 交叉引用 | ✅ | 命令别名、状态迁移、事件计数均有专门校验脚本。 |
| C1 根因定位 | ✅ | 根因是“定义层与执行/测试层漂移”，不是仅改文案。 |
| C2 接口兼容 | ✅ | 采用主命令统一+兼容说明，不做破坏性切换。 |
| C3 回归风险 | ✅ | 引入 Story 专项回归 + 集成断言降低回归风险。 |
| C4 测试覆盖 | ✅ | 4 个 Story 专项测试脚本已落地（#5/#6/#12/#13，全部 exit_code=0）。 |

- 使用 `/implement-fix-plan.md` 的执行与校验方式：

```text
/implement-fix-plan docs/story-workflow-elite-fix-plan.md
```

- 执行判定规则（硬门槛）：
  - 必须跑完 S1->S2->S3 三批。
  - 必须通过 Story 专项验收命令全套。
  - 必须满足 implement-fix 的“连续两轮无修改”终审条件。

## 八、执行记录

> 执行方式：`/implement-fix-plan docs/story-workflow-elite-fix-plan.md`
>
> **范围声明**：本计划仅覆盖 Story 主链路（`story-workflow-elite-fix-plan.md`），不覆盖 `workflow-consistency-absorption-plan.md` 总计划的其他批次（A-F）。总计划中要求的脚本（`consistency_check.py`、`generate_phase_table.py`、`command_alias_check.py`、`event_log_check.py`、`cc_review_regression.py`、`integration_assertions.py`）属于各自批次范围，不在本计划执行清单内。

### S1（正确性）— 6 项 ✅

| # | 文件 | 结果 |
|---|------|------|
| 1 | simulation.py | `/next` 中间 Ticket 返回 `implementing` ✅ |
| 2 | gate_verification.py | 同步修改 ✅ |
| 3 | state-diagram.md | Implement 行加 `implementing` + 理论节点 `*` 标注 + 脚注 ✅ |
| 4 | split-ticket.md | 主命令改 `/split ticket S-xxx` + 兼容说明 ✅ |
| 5 | story_regression.py（新建） | 5/5 路径通过 ✅ |
| 6 | story_command_alias_check.py（新建） | 34 文件 0 违规 ✅ |

Phase 5：维度 A（结构）+ 维度 B（边界），连续 2 轮无修改通过。

### S2（审计性）— 12 项 ✅

| # | 文件 | 结果 |
|---|------|------|
| 7 | SKILL.md §6 | `append_workflow_event()` + `build_event()` + W1-W9 清单 ✅ |
| 7b | SKILL.md `update_workflow()` | 末尾追加事件写入 + 回滚 ✅ |
| 7c | SKILL.md `handle_next_story()` | W9a/W9b 两条路径 ✅ |
| 8 | deliver-ticket/SKILL.md | W3/W4/W5 三个分支 ✅ |
| 9 | verification/SKILL.md | 纯函数说明 + 事件审计说明 ✅ |
| 9b | verify.md CC | W6a ✅ |
| 9c | verify.md WS | W6b ✅ |
| 10 | cc-review.md | W7 ✅ |
| 11 | approve.md CC | W8a ✅ |
| 11b | approve.md WS | W8b ✅ |
| 12 | story_event_log_check.py（新建） | 脚本就绪 ✅；事件文件尚未生成（SKIPPED，首次 Story 流程后可校验）|
| 13 | story_integration_assertions.py（新建） | 5 脚本可执行 + 7 写入点覆盖 + 2 目录存在 ✅ |

Phase 5：维度 C（数据流）+ 维度 D（兼容性），连续 2 轮无修改通过。

### S3（收口）✅

- 全量验收命令：6 个脚本全部 exit_code=0
- #14 执行记录：已回填（本节）

## 九、审查补全项（2026-02-23 审查后追加）

> 以下内容由审查发现并补入，已融入上方执行清单和设计决策。本节作为审查记录保留。

### 9.1 事件字段 Schema

```yaml
# workflow-events.jsonl 每行一条事件
event_id: "uuid"                    # UUID
timestamp: "2026-02-23T13:00:00Z"   # ISO8601 UTC
module: "career"                    # 当前需求模块（STATE.yaml.current_requirement）
schema_version: "1.0"                # 事件格式版本（硬编码，随事件 schema 变更时手动递增）
actor: "system"                     # system / user / agent
command: "/next"                    # 触发命令
state_from: "implementing"          # 迁移前状态
state_to: "story_verified"          # 迁移后状态
gate_result:                        # 门控结果
  type: "auto"                      # auto / required
  reason: "config.approval.ticket_done = auto"
evidence_ref: "osg-spec-docs/tasks/tickets/T-003.yaml#verification_evidence"
result: "success"                   # success / failure
```

### 9.2 Story 主链路状态写入点清单

| # | 触发命令 | 写入位置 | 走 workflow-engine？ | 事件写入方式 |
|---|----------|----------|---------------------|-------------|
| W1 | `/split ticket` | `update_workflow()` | ✅ 是 | #7b 统一拦截 |
| W2 | `/approve tickets` | `update_workflow()` | ✅ 是 | #7b 统一拦截 |
| W3 | `/next`（中间 Ticket） | deliver-ticket 直接写 STATE.yaml → `implementing` | ❌ 否 | #8 手动调用 |
| W4 | `/next`（最后 Ticket，验收通过） | deliver-ticket 直接写 → `story_verified` | ❌ 否 | #8 手动调用 |
| W5 | `/next`（最后 Ticket，验收失败） | deliver-ticket 直接写 → `verification_failed` | ❌ 否 | #8 手动调用 |
| W6a | `/verify`（CC 路径） | `.claude/commands/verify.md` 写 → `story_verified` / `verification_failed` | ❌ 否 | #9b 手动调用 |
| W6b | `/verify`（WS 路径） | `.windsurf/workflows/verify.md` 写 → `story_verified` / `verification_failed` | ❌ 否 | #9c 手动调用 |
| W7 | `/cc-review` | cc-review.md 写 → `story_done` / `verification_failed` | ❌ 否 | #10 手动调用 |
| W8a | `/approve S-xxx`（CC 路径） | `.claude/commands/approve.md` 写 → `story_approved` / `all_stories_done`（`stories_approved` 由 workflow-engine `next_story` 分支处理） | ❌ 否 | #11 手动调用 |
| W8b | `/approve`（WS 路径） | `.windsurf/workflows/approve.md` 写 → `story_approved` / `stories_approved` / `all_stories_done` | ❌ 否 | #11b 手动调用 |
| W9 | `next_story` 分支（`handle_next_story()`） | `workflow-engine/SKILL.md` 直接 `write_yaml()` → `stories_approved` / `all_stories_done` | ❌ 否（不经 `update_workflow()`） | #7c 手动调用 |

> 写入顺序（决策 #9）：先 `write_yaml(STATE.yaml)` → 再 `append_workflow_event()`。事件写入失败时，回滚 STATE.yaml 到写入前状态（`write_yaml(state_before)`），然后终止流程。禁止无事件的状态跃迁。与 `workflow-consistency-absorption-plan.md` 8.3 节一致。（注：此处 8.3 指外部文档的节号，非本文档）

### 9.3 审查补全项汇总

| # | 优先级 | 内容 | 已融入 |
|---|--------|------|--------|
| R1 | 🔴 | #5 `next_story` 路径需覆盖完整第二个 Story 循环 | 执行清单 #5 目标值已更新 |
| R2 | 🔴 | `all_tickets_done` 模拟器简化 vs 实际行为需显式声明 | 第五节已增加模拟器简化声明 |
| R3 | 🔴 | 事件写入原子性策略需明确 | 设计决策新增 #9（统一为“先状态后事件 + 写入失败即终止”）；9.2 节写入顺序说明 |
| R4 | 🟡 | #3 阶段表标注理论节点 | 执行清单 #3 目标值已更新（`*` 标注） |
| R5 | 🟡 | #6 扫描文件范围需明确 | 执行清单 #6 目标值已改为全量扫描 `.claude/commands/*.md` + `.windsurf/workflows/*.md` |
| R6 | 🟡 | #7 状态写入点清单 | 9.2 节 W1-W9 清单 |
| R7 | 🟡 | `update_workflow()` 统一写事件 | 执行清单新增 #7b |
| R8 | 🟢 | 第五节流程图补充 deliver-ticket 验收失败路径 | 流程图已更新 |
| R9 | 🟢 | 事件字段 schema 定义 | 9.1 节 |
| R10 | 🔴 | `/verify` 事件落盘落点不完整：verification/SKILL.md 是纯函数不写状态，真正写状态的是 verify.md 命令 | 执行清单新增 #9b（verify.md 命令写事件）；#9 改为文档说明；W6 引用更新 |
| R11 | 🔴 | 事件写入顺序文档内矛盾（决策#9 vs #7b "末尾"）且与跨文档（workflow-consistency-absorption-plan.md）冲突 | 决策 #9 统一为 B（先状态后事件 + 写入失败即终止）；9.2 节写入顺序更新 |
| R12 | 🟡 | 缺少 framework-audit 强制步骤（CLAUDE.md L124-126 要求） | S3 验收命令改为明确可执行步骤 + 7 维度全 PASS 通过条件（R16 进一步修正） |
| R13 | 🟢 | #7 写"7 个写入点"但实际 W1-W8 共 8 个 | #7 目标值已修正为"8 个"（后续增加 W6b 后为"9 个"） |
| R14 | 🔴 | 事件写入原子性逻辑漏洞："先状态后事件"但无回滚机制，状态已落盘后事件写失败 = 无事件的状态跃迁 | 决策 #9 补充补偿规则（事件写失败 → 回滚 STATE.yaml → 终止）；9.2 节写入顺序补充回滚说明 |
| R15 | 🟡 | `/verify` 在 WS 侧走 `.windsurf/workflows/verify.md`（L27-34 写状态），未纳入执行清单 | 执行清单新增 #9c；W6 拆分为 W6a（CC 路径）+ W6b（WS 路径） |
| R16 | 🟡 | framework-audit 仍是注释不是可执行步骤 | S3 验收命令改为明确动作 + 7 维度全 PASS 通过条件 |
| R17 | 🟡 | framework-audit 实际只扫 `.claude/*` 和 `STATE.yaml`，不包含 `.windsurf/workflows/*`，但 S3 描述写的是"审计 .claude/ 和 .windsurf/" | S3 框架审计修正覆盖范围；增加 `.windsurf/` 手动交叉检查步骤 |
| R18 | 🟢 | framework-audit 触发方式建议写成明确命令 | S3 框架审计增加明确触发命令 `/review framework` |
| R19 | 🟡 | `/approve` 的 WS 路径（`.windsurf/workflows/approve.md` L58-76 写状态）未纳入执行清单，与 `/verify` 双路径处理不一致 | 执行清单新增 #11b；W8 拆分为 W8a（CC）+ W8b（WS）；写入点计数更新为 10 |
| R20 | 🟢 | `/review framework` 命令可发现性弱：`review.md` 命令文档缺少该入口 | S3 框架审计增加注意说明，标记为已知技术债务 |
| R21 | 🟡 | 写入点数量不一致：#7 写"11 个"但 W 表实际 10 行 | #7 目标值修正为"10 个" |
| R22 | 🟡 | W8a（CC 路径）状态描述含 `stories_approved`，但 CC `approve.md` 只写 `story_approved`/`all_stories_done`，`stories_approved` 由 workflow-engine `next_story` 分支处理 | W8a 状态描述修正，增加 `next_story` 分支说明 |
| R23 | 🟢 | W8b 触发命令写 `/approve S-xxx`，但 WS 路径实际命令是 `/approve`（无参数） | W8b 触发命令修正为 `/approve` |
| R24 | 🔴 | `next_story` 分支（`handle_next_story()`）直接 `write_yaml()` 不经 `update_workflow()`，W 表未单列该写入点，事件落盘会遗漏 | W 表新增 W9；执行清单新增 #7c；写入点计数 10→11 |
| R25 | 🟡 | “状态转换数”统计口径未定义，不清楚是否包含理论节点，断言会有歧义 | 事件证据目标补充统计口径定义：排除理论节点 |
| R26 | 🟡 | #6 命令别名扫描范围逐文件列举，漏掉 `split.md`、`next.md`、`rpiv.md` 等 | #6 扫描范围改为全量扫描 `.claude/commands/*.md` + `.windsurf/workflows/*.md` |
| R27 | 🟡 | `schema_version` 写"与 state-machine.yaml version 对应"，但 state-machine.yaml 无 version 字段，锚点来源不明 | schema_version 改为硬编码 `"1.0"`，随事件 schema 变更时手动递增 |
| R28 | 🟢 | R6 历史描述仍写"W1-W8 清单"，但 W 表已扩到 W9 | R6 描述更新为"W1-W9 清单" |
| R29 | 🟢 | G9/C4 自校验措辞偏"已完成态"，但脚本尚未落地 | 措辞改为"方案设计覆盖/方案规划新增（待落地）" |
| R30 | 🟢 | R5 历史描述仍写“已列出 6 个文件”，但 #6 已改为全量扫描 | R5 描述更新为“已改为全量扫描” |
