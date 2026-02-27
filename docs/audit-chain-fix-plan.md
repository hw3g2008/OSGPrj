# 审计链修复 + 守卫增强方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- **修复 3 个真实问题**：审计链断裂（S-003~S-005）、T-034 证据强度不符、守卫覆盖盲区
- 验收标准：
  1. `workflow-events.jsonl` 最后一条 `state_to` = STATE.yaml `current_step`（= `story_verified`）
  2. T-034 的 `verification_evidence.command` 包含 `test && build`
  3. `story_runtime_guard.py` 新增 events↔STATE 一致性检查，能拦住"只更新 STATE 不写 events"的情况
  4. 所有守卫脚本 exit_code=0

## 二、前置条件与假设

- 假设 1: `workflow-events.jsonl` 支持手动追加 backfill 事件（已在 S-001 验证）
- 假设 2: backfill 事件使用 `actor: "windsurf/event-backfill"` 标识，与正常事件区分
- 假设 3: backfill 时间戳基于 STATE.yaml changelog 日期，保持单调递增
- 假设 4: 守卫脚本可直接修改（`.claude/skills/workflow-engine/tests/`）

## 三、现状分析

### 相关文件

| 文件 | 角色 |
|------|------|
| `osg-spec-docs/tasks/workflow-events.jsonl` | 事件审计日志（当前 20 条，止于 S-002 approve） |
| `osg-spec-docs/tasks/STATE.yaml` | 项目状态（current_story=S-005, current_step=story_verified） |
| `osg-spec-docs/tasks/tickets/T-034.yaml` | 证据不符的 Ticket |
| `.claude/skills/workflow-engine/tests/story_runtime_guard.py` | 运行态守卫（检查三元组+proof+计数） |
| `.claude/skills/workflow-engine/tests/story_event_log_check.py` | 事件日志守卫（检查字段完整+链连续） |

### 问题 1 (High): 审计链断裂

- **现象**: `workflow-events.jsonl` line 20 止于 `/approve S-002 → stories_approved`，S-003~S-005 约 17 个状态转换事件全部缺失
- **根因**: Windsurf 执行 S-003~S-005 时只更新 STATE.yaml（changelog + workflow 字段），绕过了 `transition()` 规定的事件写入步骤
- **影响**: 审计不可回放、postcheck_guard 从未执行、回滚依据不完整

### 问题 2 (Medium): T-034 证据强度不符

- **现象**: T-034.yaml type=`frontend`，但 `verification_evidence.command` 只有 `pnpm build`
- **根因**: deliver-ticket SKILL.md line 740 要求 frontend 类型必须 `test && build`，执行时疏忽
- **影响**: 单 Ticket 验证强度不足（全局测试已通过但证据记录不合规）

### 问题 3 (Medium): 守卫覆盖盲区

- **现象**: `story_runtime_guard.py` 检查三元组/proof/计数，`story_event_log_check.py` 检查事件内部连续性，但二者都**不检查 events.jsonl 最后一条 state_to 是否等于 STATE.yaml current_step**
- **根因**: 守卫设计时没有考虑到"事件日志和状态文件可能脱节"这个故障模式
- **影响**: 即使审计链断裂，守卫仍报 PASS

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | events↔STATE 检查放哪个脚本 | A: `story_runtime_guard.py` / B: `story_event_log_check.py` / C: 新建脚本 | A | runtime guard 已负责 STATE 一致性，加一个 events 维度最自然；不增加新概念 |
| 2 | 检查强度 | A: 仅最后一条 state_to / B: 完整链回放 | A | 最小改动，足以拦住"只更新 STATE 不写 events"；完整回放已有 event_log_check |
| 3 | backfill 事件数 | 17 条（完整还原每个状态转换） | — | 与 STATE.yaml changelog 对照可审计，时间戳单调递增 |
| 4 | T-034 修复方式 | A: 只改 evidence / B: 重跑 test && build 再改 evidence | B | "证据先于断言"（next.md F3）：必须先执行命令，用真实结果更新 evidence（含 command/output_summary/timestamp） |

## 五、目标状态

### Backfill 事件链（17 条）

从 `workflow-events.jsonl` line 20（S-002 → stories_approved）之后，按实际执行顺序补录：

| # | command | state_from | state_to | note |
|---|---------|------------|----------|------|
| 21 | /split ticket | stories_approved | ticket_split_done | S-003 T-024~T-029 |
| 22 | /approve tickets | ticket_split_done | tickets_approved | S-003 auto |
| 23 | /next | tickets_approved | implementing | S-003 开始实现 |
| 24 | /verify S-003 | implementing | story_verified | S-003 验收通过 |
| 25 | /approve S-003 | story_verified | story_approved | S-003 审批 |
| 26 | /approve S-003 (handle_next_story) | story_approved | stories_approved | 切换到 S-004 |
| 27 | /split ticket | stories_approved | ticket_split_done | S-004 T-030~T-033 |
| 28 | /approve tickets | ticket_split_done | tickets_approved | S-004 auto |
| 29 | /next | tickets_approved | implementing | S-004 开始实现 |
| 30 | /verify S-004 | implementing | story_verified | S-004 验收通过 |
| 31 | /cc-review S-004 | story_verified | story_done | S-004 CC review 通过 |
| 32 | /approve S-004 | story_done | story_approved | S-004 审批 |
| 33 | /approve S-004 (handle_next_story) | story_approved | stories_approved | 切换到 S-005 |
| 34 | /split ticket | stories_approved | ticket_split_done | S-005 T-034~T-038 |
| 35 | /approve tickets | ticket_split_done | tickets_approved | S-005 auto |
| 36 | /next | tickets_approved | implementing | S-005 开始实现 |
| 37 | /verify S-005 | implementing | story_verified | S-005 验收通过（当前） |

### 守卫增强：events↔STATE 一致性检查

在 `story_runtime_guard.py` 新增第 4 项检查：

```python
def check_events_state_consistency(state, allow_bootstrap=False):
    """检查 workflow-events.jsonl 最后一条 state_to 是否等于 STATE.yaml current_step"""
    events_path = EVENT_LOG_PATH  # 全局常量，可被 --events CLI 参数覆盖
    current_step = (state.get("workflow") or {}).get("current_step")

    if not events_path.exists():
        # bootstrap 边界：与 story_event_log_check.py 一致
        if allow_bootstrap:
            has_tickets = TICKETS_DIR.exists() and any(TICKETS_DIR.glob("T-*.yaml"))
            if current_step in ("story_split_done", "stories_approved") and not has_tickets:
                return []  # bootstrap 阶段允许跳过
        return [f"workflow-events.jsonl 不存在，无法校验 events↔STATE 一致性"]

    # 读取最后一行
    last_event = None
    with open(events_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    last_event = json.loads(line)
                except json.JSONDecodeError:
                    pass

    if not last_event:
        return ["workflow-events.jsonl 为空或无有效事件"]

    last_state_to = last_event.get("state_to")
    if last_state_to != current_step:
        return [
            f"events↔STATE 不一致: events 最后一条 state_to='{last_state_to}', "
            f"但 STATE.yaml current_step='{current_step}'"
        ]
    return []
```

## 六、执行清单

### 批次 A: Backfill 事件（High）

| # | 文件 | 修改 | 严重度 |
|---|------|------|--------|
| A1 | `osg-spec-docs/tasks/workflow-events.jsonl` | 追加 17 条 backfill 事件（#21~#37），actor=`windsurf/event-backfill`，时间戳基于 2026-02-26 单调递增 | High |

### 批次 B: 修复 T-034 证据（Medium）

| # | 文件 | 位置 | 当前值 | 目标值 | 严重度 |
|---|------|------|--------|--------|--------|
| B0 | 执行命令 | — | — | 先执行 `pnpm --dir osg-frontend/packages/admin test && pnpm --dir osg-frontend/packages/admin build`（从项目根目录），记录真实输出 | High |
| B1 | `osg-spec-docs/tasks/tickets/T-034.yaml` | line 37 `verification_evidence.command` | `"pnpm --dir osg-frontend/packages/admin build"` | `"pnpm --dir osg-frontend/packages/admin test && pnpm --dir osg-frontend/packages/admin build"` | Medium |
| B2 | `osg-spec-docs/tasks/tickets/T-034.yaml` | line 39 `output_summary` | `"Build success, user.ts compiled with 6 API functions"` | 用 B0 的真实输出替换 | Medium |
| B3 | `osg-spec-docs/tasks/tickets/T-034.yaml` | line 40 `timestamp` | `"2026-02-26T09:10:00Z"` | 用 B0 的实际执行时间替换 | Low |

### 批次 C: 守卫增强（Medium）

| # | 文件 | 修改 | 严重度 |
|---|------|------|--------|
| C1 | `.claude/skills/workflow-engine/tests/story_runtime_guard.py` | 文件顶部新增 `EVENT_LOG_PATH` 全局常量 | Low |
| C2 | `.claude/skills/workflow-engine/tests/story_runtime_guard.py` | 新增 `check_events_state_consistency(state, allow_bootstrap)` 函数（使用 `EVENT_LOG_PATH`） | Medium |
| C3 | `.claude/skills/workflow-engine/tests/story_runtime_guard.py` | `parse_args()` 新增 `--allow-bootstrap` 和 `--events` 参数（与其他守卫脚本一致） | Medium |
| C4 | `.claude/skills/workflow-engine/tests/story_runtime_guard.py` | `main()` 中用 `args.events` 覆盖 `EVENT_LOG_PATH`，调用 `check_events_state_consistency(state, allow_bootstrap=args.allow_bootstrap)` 并加入 `all_issues` | Medium |

## 七、自校验结果

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 三批次（A: backfill → B: T-034 → C: 守卫），每批独立 |
| G2 目标明确 | ✅ | 4 条验收标准可度量 |
| G3 假设显式 | ✅ | 4 条假设全部列出 |
| G4 设计决策完整 | ✅ | 4 个决策点，每个有理由 |
| G5 执行清单可操作 | ✅ | A1 有完整事件表，B0~B3 有精确位置/值，C1~C4 有完整伪代码 + CLI 参数设计 |
| G6 正向走读 | ✅ | A(补事件) → B(补证据) → C(加守卫) → 验证(跑守卫) |
| G7 改动自洽 | ✅ | backfill 后 events 最后 state_to = story_verified = STATE current_step |
| G8 简约不省略 | ✅ | 17 条事件完整覆盖 S-003~S-005 |
| G9 场景模拟 | ✅ | 修复后跑 `story_runtime_guard.py`：三元组 ✅ + proof ✅ + 计数 ✅ + events↔STATE ✅ |
| G10 数值回验 | ✅ | 17 条事件 = 表格 17 行（#21~#37） |
| G11 引用回读 | ✅ | state_from/state_to 链与 state-machine.yaml 对照一致 |
| F1 文件同步 | ✅ | 只改守卫脚本（执行层），不改 SKILL.md（概念层） |
| C1 根因定位 | ✅ | 根因：transition() 伪代码无强制执行。当前方案：补数据 + 加守卫（治标+兜底），transition.py 真实脚本排后续 |
