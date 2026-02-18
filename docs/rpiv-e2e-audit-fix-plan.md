# RPIV 端到端审计修复方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- **一句话**：修复 RPIV 流程端到端审计发现的问题（本次执行 9 项修改，5 项暂缓记录）
- **关键发现**：`gate_verification.py` 当前已经失败（`approve_brainstorm` 未覆盖），必须修复模拟器分支逻辑
- **本次验收标准**：
  1. `gate_verification.py` 运行通过（当前已失败，修复后应通过）
  2. `simulation.py` 运行通过，测试用例覆盖全部 15 个状态/5 条审批映射/11 条命令映射
  3. rpiv.md 覆盖 `brainstorm_pending_confirm` 阶段
  4. `ticket_done`/`all_tickets_done` 有注释说明理论节点用途

## 二、前置条件与假设

- 假设 1: state-machine.yaml 是 SSOT，所有其他文件向它对齐
- 假设 2: deliver-ticket 直接管理分支状态（`implementing`/`story_verified`/`verification_failed`）是**设计意图**，不是 bug
- 假设 3: `ticket_done` 和 `all_tickets_done` 在 state-machine.yaml 中保留作为"理论节点"（供 workflow-engine 自动继续循环使用），但 deliver-ticket 实际绕过它们
- 假设 4: `/approve`（跳过 CC）直接到 `story_approved` 是设计意图

## 三、现状分析

### 相关文件清单

| 文件 | 角色 | 问题 |
|------|------|------|
| `workflow-engine/references/state-diagram.md` | 状态转换图（文档） | 缺 5 个状态，审批表缺 1 行 |
| `workflow-engine/tests/gate_verification.py` | 门控验证测试 | MOCK_CONFIG 缺 `brainstorm_confirm` |
| `workflow-engine/tests/simulation.py` | 模拟测试 | MOCK_CONFIG 缺 `brainstorm_confirm`，3 个测试用例不完整 |
| `.windsurf/workflows/rollback.md` | 回滚工作流 | 不引用 state-machine.yaml 回滚规则 |
| `.windsurf/workflows/rpiv.md` | 主流程调度 | 缺 `brainstorm_pending_confirm` 阶段 |
| `.claude/CLAUDE.md` | 框架入口 | 命令表 `/approve` 不够精确 |
| `.claude/skills/ticket-splitter/SKILL.md` | Ticket 拆分 | 硬编码路径 |
| `workflow-engine/state-machine.yaml` | SSOT | 回滚规则引用了从未写入的状态 |

### 上下游依赖

```
state-machine.yaml (SSOT)
  ├── state-diagram.md (文档，必须同步)
  ├── SKILL.md 伪代码 (已同步 ✅)
  ├── tests/*.py (测试，必须同步)
  ├── rollback.md (引用回滚规则)
  └── rpiv.md (引用状态名)
```

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| D1 | `ticket_done`/`all_tickets_done` 如何处理 | A: 让 deliver-ticket 先写这两个状态再由 engine 继续<br>B: 保留定义但标注"理论节点"<br>C: 从 state-machine.yaml 移除 | **B** | A 需要大改 deliver-ticket 逻辑；C 会破坏回滚规则的完整性；B 最小改动，只需在注释中说明 |
| D2 | 回滚规则中 `from: [ticket_done, all_tickets_done]` 怎么办 | A: 改为 `from: [implementing]`<br>B: 同时包含两者 `from: [implementing, ticket_done, all_tickets_done]` | **B** | 防御性设计，覆盖理论和实际两种情况 |
| D3 | `/approve`（跳过 CC）绕过 `story_done` 怎么办 | A: 不改，在 approve.md 中加注释说明<br>B: 让跳过 CC 也经过 `story_done` | **A** | 跳过 CC 是用户主动选择的快捷路径，不需要经过 `story_done` 审批 |
| D4 | state-diagram.md 重写范围 | A: 只补缺失的状态<br>B: 完全重写对齐 state-machine.yaml | **B** | 图已经严重过时，补丁式修改容易遗漏 |

## 五、目标状态

### state-diagram.md 目标流程图

```
                              RPIV 工作流状态机
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────┐                                                            │
│  │ not_started │  ← 项目初始化后的状态                                       │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         │ /brainstorm                                                       │
│         ▼                                                                   │
│   ┌───────────┐                                                             │
│   │ 有待确认  │                                                             │
│   │ 疑问项？  │                                                             │
│   └─────┬─────┘                                                             │
│    是   │    否                                                              │
│    ▼    │                                                                   │
│  ┌──────────────────────┐                                                   │
│  │brainstorm_pending_   │  ← 有待产品确认的疑问项                            │
│  │confirm               │                                                   │
│  └──────────┬───────────┘                                                   │
│             │ /approve brainstorm                                           │
│             ▼                                                               │
│  ┌─────────────────┐  ◄────────────────────────────────────────────┐        │
│  │ brainstorm_done │  ← 需求分析完成                                │        │
│  └────────┬────────┘                                               │        │
│           │ auto: /split story                                     │        │
│           ▼                                                        │        │
│  ┌─────────────────┐                                               │        │
│  │ story_split_done│  ← Story 拆分完成                              │        │
│  └────────┬────────┘                                               │        │
│           │ ⚠️ 需要审批 (config.approval.story_split)               │        │
│           │ /approve stories                                       │        │
│           ▼                                                        │        │
│  ┌─────────────────┐  ◄──────────────────────────────────┐         │        │
│  │ stories_approved│  ← Stories 审批通过                   │         │        │
│  └────────┬────────┘                                     │         │        │
│           │ auto: /split ticket {story_id}               │         │        │
│           ▼                                              │         │        │
│  ┌─────────────────┐                                     │         │        │
│  │ticket_split_done│  ← Ticket 拆分完成                   │         │        │
│  └────────┬────────┘                                     │         │        │
│           │ ⚠️ 需要审批 (config.approval.ticket_split)    │         │        │
│           │ /approve tickets                             │         │        │
│           ▼                                              │         │        │
│  ┌─────────────────┐                                     │         │        │
│  │ tickets_approved│  ← Tickets 审批通过                  │         │        │
│  └────────┬────────┘                                     │         │        │
│           │ auto: /next                                  │         │        │
│           ▼                                              │         │        │
│  ┌─────────────────┐ ◄──────────────────┐                │         │        │
│  │  implementing   │  ← 正在实现 Tickets │                │         │        │
│  └────────┬────────┘                    │                │         │        │
│           │ /next 完成一个 Ticket        │                │         │        │
│           ▼                             │                │         │        │
│     ┌───────────┐                       │                │         │        │
│     │ 还有      │                       │                │         │        │
│     │ pending   │───── 是 ──────────────┘                │         │        │
│     │ Tickets?  │                                        │         │        │
│     └─────┬─────┘                                        │         │        │
│           │ 否（自动执行 Story 验收）                      │         │        │
│           ▼                                              │         │        │
│     ┌───────────┐                                        │         │        │
│     │ 验收      │                                        │         │        │
│     │ 通过？    │                                        │         │        │
│     └─────┬─────┘                                        │         │        │
│      是   │    否                                        │         │        │
│      ▼    ▼                                              │         │        │
│  ┌────────────────┐  ┌─────────────────────┐             │         │        │
│  │ story_verified │  │ verification_failed │             │         │        │
│  └────────┬───────┘  └──────────┬──────────┘             │         │        │
│           │                     │ /verify（手动重试）      │         │        │
│           │                     └──────► story_verified   │         │        │
│           │                              或保持 failed    │         │        │
│           │                                              │         │        │
│     ┌─────┴─────┐                                        │         │        │
│     │ 用户选择  │                                        │         │        │
│     └─────┬─────┘                                        │         │        │
│      CC   │   跳过CC                                     │         │        │
│      ▼    ▼                                              │         │        │
│  ┌────────────┐  ┌──────────────┐                        │         │        │
│  │ /cc-review │  │ /approve     │                        │         │        │
│  └──────┬─────┘  │（跳过CC）    │                        │         │        │
│         │        └──────┬───────┘                        │         │        │
│         ▼               │                                │         │        │
│  ┌─────────────┐        │                                │         │        │
│  │ story_done  │        │                                │         │        │
│  └──────┬──────┘        │                                │         │        │
│         │ /approve      │                                │         │        │
│         ▼               ▼                                │         │        │
│  ┌─────────────────┐ ◄──┘                                │         │        │
│  │  story_approved │  ← Story 审批通过                    │         │        │
│  └────────┬────────┘                                     │         │        │
│           │                                              │         │        │
│           ▼                                              │         │        │
│     ┌───────────┐                                        │         │        │
│     │ 还有      │                                        │         │        │
│     │ pending   │───── 是 ───► 回到 stories_approved ────┘         │        │
│     │ Stories?  │              (处理下一个 Story)                   │        │
│     └─────┬─────┘                                                  │        │
│           │ 否                                                     │        │
│           ▼                                                        │        │
│  ┌─────────────────┐                                               │        │
│  │all_stories_done │  ← 所有 Stories 完成，工作流结束               │        │
│  └─────────────────┘                                               │        │
│                                                                    │        │
│  注：ticket_done / all_tickets_done 是 state-machine.yaml 中的     │        │
│  理论节点，deliver-ticket 实际直接写 implementing/story_verified/   │        │
│  verification_failed，绕过这两个状态。                              │        │
│                                                                    │        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 六、执行清单

### ✅ 本次执行（9 项修改，+25 行，4 个文件）

| # | 文件 | 位置 | 当前值 | 目标值 | 解决什么 |
|---|------|------|--------|--------|----------|
| F2-1 | `gate_verification.py` | 第 307 行后 | MOCK_CONFIG 缺 `brainstorm_confirm` | 新增 `"brainstorm_confirm": "required"` | 对齐 config.yaml |
| F2-2 | `simulation.py` | 第 28 行后 | MOCK_CONFIG 缺 `brainstorm_confirm` | 新增 `"brainstorm_confirm": "required"` | 对齐 config.yaml |
| F2-3 | `simulation.py` | 第 242 行后 | `test_approval_config` 缺 `approve_brainstorm` | 新增 `"approve_brainstorm": "brainstorm_confirm"` | 测试覆盖审批映射 |
| F2-4 | `simulation.py` | 第 270 行后 | `test_command_mapping` 缺 `approve_brainstorm` | 新增 `"approve_brainstorm": "/approve brainstorm"` | 测试覆盖命令映射 |
| F2-5 | `simulation.py` | 第 209-219 行 | `test_state_transitions` 缺 4 个状态 | 新增 4 个状态转换元组 | 测试覆盖全部 15 个状态 |
| F2-6 | `simulation.py` | 第 70-71 行 | `/brainstorm` 总返回 `brainstorm_done` | 加分支 + `/approve brainstorm` 处理 | 修复模拟器不走分支路径 |
| F2-7 | `gate_verification.py` | 第 103-104 行 | 同 F2-6 | 同 F2-6 | 修复门控覆盖率验证失败（当前已失败） |
| F3-3 | `rpiv.md` | 第 22-23 行之间 | 阶段 R 不处理 `brainstorm_pending_confirm` | 新增阶段 R-2 | rpiv 缺阶段说明 |
| F4-3 | `state-machine.yaml` | 第 77、84 行上方 | `ticket_done`/`all_tickets_done` 无注释 | 添加理论节点注释 | 帮助维护者理解 |

### ⏸️ 暂缓记录（5 项，后续有需要时再做）

| # | 文件 | 问题 | 暂缓原因 |
|---|------|------|----------|
| F1-1/2/3 | `state-diagram.md` | 缺 5 个状态 + 审批表缺 1 行 + 阶段表不全 | 图很大，画错比不画更糟，需要单独认真重写 |
| F3-2 | `rollback.md` | 不引用 state-machine.yaml 回滚规则 | 需要精确描述，待单独处理 |
| F3-1 | `state-machine.yaml` | 回滚规则 1 缺 `implementing` | 规则 4（第 229 行）已覆盖 `implementing` 回滚，规则 1 是防御性设计 |
| F4-2 | `ticket-splitter/SKILL.md` | 硬编码路径 | 路径短期不会变，风险低 |

## 七、自校验结果

### 本次 9 项修改的最终校验

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 每项 1~5 行，有精确行号和目标值 |
| G2 目标明确 | ✅ | 4 条验收标准可度量，其中第 1 条可通过运行测试验证 |
| G5 执行清单可操作 | ✅ | 每项都是加 1~5 行，直接可执行 |
| G7 改动自洽 | ✅ | 测试文件对齐 state-machine.yaml + config.yaml |
| 实际运行验证 | ✅ | 已运行两个测试文件，确认 gate_verification.py 当前已失败 |
| 根因分析 | ✅ | F2-6/F2-7 是 gate_verification.py 失败的根因，不是 F2-1 |
| 最小化原则 | ✅ | 每项都是必要的，F2-6/F2-7 是修复已有 bug 的最小改动 |
