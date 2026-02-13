# Windsurf + Claude Code 混合执行方案

> Windsurf 执行 + Claude Code 质检 — 一人公司 AI 开发框架的最优运行方案
> 
> **状态**: 最终方案确定 | **更新日期**: 2026-02-13

---

## 1. 背景与目标

### 1.1 现状

- **一人公司框架**基于 Claude Code 的原生能力（CLAUDE.md、/commands、Skills、Agents）
- **Claude Code 成本高**，需要优化 token 消耗
- **Windsurf** 已付费，提供 IDE 体验，但不原生支持 `.claude/` 框架
- Claude Code v2.1.39 已支持 **`/ide for Windsurf`** 集成

### 1.2 目标

1. 在 Windsurf IDE 中流畅运行一人公司 RPIV 工作流
2. 尽可能降低 Claude Code 的 token 消耗
3. 实现自动化工作流链（减少人工确认）
4. 保持框架的完整性，不做破坏性改造

### 1.3 已验证结论

| 验证项 | 结果 | 说明 |
|--------|------|------|
| `/ide for Windsurf` 连接 | ✅ 成功 | 在 Windsurf 内置终端中 `claude` → `/ide` → `Connected to Windsurf.` |
| `claude -p` 非交互模式 | ✅ 成功 | Windsurf 可通过 `claude -p "/status"` 调用 Claude Code，自动加载 CLAUDE.md |
| Windsurf 编辑器集成 | ✅ 成功 | Claude Code 修改文件后 Windsurf 显示 `Review N files >` |
| 中转 API 稳定性 | ⚠️ 偶发 529 | 中转站偶尔过载，需关注 |

---

## 2. 最终方案：Windsurf 执行 + Claude Code 质检

### 2.1 核心理念

```
Windsurf（Opus 4.6 1M）= 工人 — 写代码、测试、拆分、审批展示
Claude Code             = 质检员 — 关键节点交叉验证，避免"自己骗自己"
```

**为什么需要双 AI**：单一 AI 执行+自检容易产生盲区。让不同 AI 分别执行和检查，形成交叉验证，质量更高。

### 2.2 分工矩阵

| RPIV 阶段 | 执行者 | 质检者 | 说明 |
|-----------|--------|--------|------|
| **Research** brainstorm | Windsurf | Claude Code | Windsurf 读 SKILL.md 分析需求，Claude Code 检查覆盖度 |
| **Plan** split story | Windsurf | Claude Code | Windsurf 拆分，Claude Code 检查 INVEST 原则 |
| **Plan** split ticket | Windsurf | Claude Code | Windsurf 拆分，Claude Code 检查完整性和依赖 |
| **Plan** approve | Windsurf + 用户 | — | 用户在 Windsurf Chat 中审批 |
| **Implement** next | Windsurf | Claude Code | Windsurf 写代码+测试，Claude Code 检查 acceptance_criteria |
| **Validate** verify | Windsurf | Claude Code | Windsurf 运行测试，Claude Code 检查集成正确性 |
| **通用** status | Windsurf | — | 读取 STATE.yaml，无需质检 |

### 2.3 关键节点 Check 清单

| 节点 | Claude Code Check 内容 | 预估 Token |
|------|----------------------|-----------|
| brainstorm 完成后 | 是否覆盖所有 PRD 需求，有无遗漏 | ~2K |
| Story 拆分后 | 是否符合 INVEST 原则，有无重叠或遗漏 | ~2K |
| Ticket 拆分后 | acceptance_criteria 是否完整，依赖关系是否正确 | ~2K |
| 每个 Ticket 完成后 | 代码是否满足 acceptance_criteria，测试是否充分 | ~3K |
| Story 验证 | 所有 Tickets 是否全部通过，集成是否正确 | ~3K |

### 2.4 成本对比

| 方案 | Claude Code 消耗/Story | Windsurf 消耗 | 总成本 |
|------|----------------------|--------------|--------|
| 纯 Claude Code | ~80K tokens | 0 | 高 |
| 方案 A：CC 执行 + WS 审批 | ~66K tokens | 已付费 | 中 |
| **方案 D：WS 执行 + CC 质检** | **~24K tokens** | **已付费** | **低** |

> 方案 D（5 Tickets/Story）：brainstorm check 2K + story check 2K + ticket check 2K + ticket done check×5 15K + verify 3K = **~24K tokens**，**节省 64%**

### 2.5 完整工作流

```
用户: "开始 brainstorm 用户登录"

[R] Step 1: Windsurf 执行 brainstorm
    → 读取 .claude/core/skills/brainstorming/SKILL.md
    → 按流程分析需求，输出 brainstorm.md
    
[R] Step 2: Claude Code Check ✓
    → claude -p "检查 brainstorm 结果是否覆盖所有 PRD 需求"
    → 输出 check 结果（通过/不通过+修改建议）
    → 不通过则 Windsurf 修改后重新 check

[P] Step 3: Windsurf 执行 split story → Claude Code Check ✓

[P] Step 4: 用户审批 Stories（Windsurf Chat）

[P] Step 5: Windsurf 执行 split ticket → Claude Code Check ✓

[P] Step 6: 用户审批 Tickets（Windsurf Chat）

[I] Step 7: Windsurf 执行 /next（写代码+测试）
    → 每个 Ticket 完成后 Claude Code Check ✓
    → ticket_done: auto → 自动继续下一个

[V] Step 8: Windsurf 执行 verify → Claude Code Check ✓

[V] Step 9: 用户审批 Story 完成（Windsurf Chat）
```

### 2.6 框架自检 vs Claude Code 质检（互补设计）

框架已有 **52+ 项自检机制**，Claude Code 不重复这些检查，而是做**自检做不到的事**：

| 环节 | 框架自检（Windsurf 执行） | Claude Code 质检（互补） |
|------|-------------------------|------------------------|
| **brainstorming** | 5 正向 + 6 反向 + 5 UI 专项 + 4 维度矩阵 = **16 项** | PRD 原文 vs 需求文档的**语义一致性**：是否真正理解了 PRD 意图 |
| **story-splitter** | 6 INVEST + FR↔Story 覆盖率 + 矩阵 = **8 项** | Stories 之间的**业务逻辑连贯性**：是否有业务流程断裂 |
| **ticket-splitter** | 6 质量 + AC↔Ticket 覆盖率 + DAG = **8 项** | Tickets 的**技术可行性**：allowed_paths 是否正确、技术方案是否合理 |
| **deliver-ticket** | TDD + 5 测试方法 + 审查清单 + 强制验证 + 证据 = **12+ 项** | 代码的**业务正确性**和**安全性**：业务逻辑是否正确、有无安全漏洞 |
| **verification** | 前置检查 + 4 层校验 + 反合理化 + 红旗 = **8 项** | **端到端集成**：所有 Tickets 组合后整体是否正确 |

### 2.7 Claude Code 质检 Prompt 模板

每个节点的 `claude -p` 调用模板：

#### Check 1: brainstorm 完成后

```bash
claude -p "你是质检员。请对比以下两份文档：
1. PRD 原文：$(cat osg-spec-docs/docs/01-product/prd/admin/*.md)
2. 需求分析结果：$(cat osg-spec-docs/tasks/brainstorm-*.md)

检查项：
- PRD 中的每个功能点是否都在需求分析中体现？
- 需求分析是否有超出 PRD 范围的内容？
- 业务术语是否一致？
- 输出：通过/不通过 + 具体问题列表" --output-format text
```

#### Check 2: Story 拆分后

```bash
claude -p "你是质检员。请检查以下 Story 拆分结果：
$(for f in osg-spec-docs/tasks/stories/S-*.yaml; do echo '---'; cat \$f; done)

对照需求文档：$(cat osg-spec-docs/tasks/brainstorm-*.md)

检查项：
- Stories 之间是否有业务流程断裂（用户操作路径是否连贯）？
- 是否有功能被拆到多个 Story 导致无法独立交付？
- 优先级排序是否符合业务价值？
- 输出：通过/不通过 + 具体问题列表" --output-format text
```

#### Check 3: Ticket 拆分后

```bash
claude -p "你是质检员。请检查以下 Ticket 拆分结果：
$(for f in osg-spec-docs/tasks/tickets/T-*.yaml; do echo '---'; cat \$f; done)

对照项目结构：$(find ruoyi-admin ruoyi-system osg-frontend -name '*.java' -o -name '*.vue' -o -name '*.ts' | head -50)

检查项：
- allowed_paths 中的文件路径是否存在或合理？
- 技术方案是否可行（如依赖的类/接口是否存在）？
- 依赖顺序是否正确（不会出现先用后建的情况）？
- 输出：通过/不通过 + 具体问题列表" --output-format text
```

#### Check 4: Ticket 完成后

```bash
claude -p "你是质检员。请检查 Ticket T-xxx 的实现：
Ticket 定义：$(cat osg-spec-docs/tasks/tickets/T-xxx.yaml)
变更文件：$(git diff --name-only HEAD~1)
变更内容：$(git diff HEAD~1)

检查项：
- 代码是否满足所有 acceptance_criteria？
- 是否有明显的业务逻辑错误？
- 是否有安全漏洞（SQL注入、XSS、硬编码密码等）？
- 是否只修改了 allowed_paths 范围内的文件？
- 输出：通过/不通过 + 具体问题列表" --output-format text
```

#### Check 5: Story 验证

```bash
claude -p "你是质检员。请检查 Story S-xxx 的整体完成情况：
Story 定义：$(cat osg-spec-docs/tasks/stories/S-xxx.yaml)
所有 Tickets：$(for f in osg-spec-docs/tasks/tickets/T-*.yaml; do echo '---'; cat \$f; done)

检查项：
- 所有 Tickets 的 verification_evidence 是否都存在且 exit_code=0？
- 各 Ticket 的代码组合后，端到端业务流程是否完整？
- 是否有遗漏的集成点（如前后端接口对接）？
- 输出：通过/不通过 + 具体问题列表" --output-format text
```

### 2.8 质检失败处理流程

```
Claude Code Check 结果
    │
    ├── ✅ 通过 → Windsurf 更新 STATE.yaml，继续下一步
    │
    └── ❌ 不通过
         │
         ▼
    [Windsurf 读取问题列表]
         │
         ▼
    [Windsurf 自动修复] ← 根据 Claude Code 的具体建议
         │
         ▼
    [重新提交 Claude Code Check]（最多 3 次）
         │
         ├── ✅ 通过 → 继续
         │
         └── ❌ 连续 3 次不通过 → 停下，提示用户人工介入
```

### 2.9 STATE.yaml 管理

**Windsurf 是 STATE.yaml 的唯一写入者，Claude Code 只读。**

新增 `*_checked` 状态，确保每个环节经过质检：

```
init → brainstorm_done → brainstorm_checked → split_story
  → story_split_done → stories_checked → approve_stories (required)
  → stories_approved → split_ticket
  → ticket_split_done → tickets_checked → approve_tickets (required)
  → tickets_approved → next
  → ticket_done → ticket_checked → next (auto, 循环)
  → all_tickets_done → verify
  → story_verified → story_checked → approve_story (required)
  → story_approved → next_story / all_stories_done
```

---

## 3. 技术基础（已验证）

### 3.1 `/ide for Windsurf`

Claude Code 在 Windsurf 终端中运行时，自动检测到 Windsurf IDE，通过 `/ide` 命令连接后获得：

| 功能 | 说明 |
|------|------|
| **Selection context sharing** | Windsurf 中当前选中的代码/打开的文件自动共享给 Claude Code |
| **Diff viewing in IDE** | Claude Code 的代码修改以 diff 形式在 Windsurf 编辑器中展示 |
| **File reference shortcuts** | `Cmd+Option+K` 快速插入文件引用 `@File#L1-99` |
| **Automatic diagnostic sharing** | Windsurf 的 lint/语法错误自动共享给 Claude Code |

### 3.2 两种使用模式

#### 模式 A：交互式（终端 TUI）

在 Windsurf 内置终端中运行 `claude`，进入交互式 TUI，手动输入框架命令。`/ide` 自动连接后，代码修改在 Windsurf 编辑器中实时展示。

```bash
# Windsurf 内置终端
cd /Users/hw/workspace/OSGPrj
claude          # 启动交互式 TUI
/ide            # 连接 Windsurf（如未自动连接）
/brainstorm 用户登录   # 手动输入命令
```

**优点**: 完整的框架体验，自动工作流链
**缺点**: 需要手动在终端和 Chat 之间切换

#### 模式 B：非交互式（`claude -p`）— ✅ 已验证

Windsurf Cascade 通过 `claude -p` 调用 Claude Code 执行命令，读取输出后继续调度。

```bash
# Windsurf Cascade 通过 run_command 调用
claude -p "/status" --output-format text
# → Claude Code 自动加载 CLAUDE.md，执行命令，输出结果，退出
```

**优点**: Windsurf 可自动调度，无需手动切换
**缺点**: 无 `/ide` 集成（非交互模式不连接 IDE），每次调用有冷启动开销
**注意**: `claude -p` 不支持 `--cwd`，需通过 Windsurf 的工作目录参数指定

### 3.3 推荐组合

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| `/next`（写代码） | 模式 A（交互式） | 需要 `/ide` 集成看 diff，且可能多轮迭代 |
| `/brainstorm`、`/split` | 模式 A 或 B 均可 | 不涉及文件修改，两种都行 |
| `/status`、`/approve` | 模式 B 或 Windsurf workflow | 简单操作，Windsurf 自己做最省钱 |
| 日常讨论、代码审查 | Windsurf Chat | 免费，IDE 体验好 |

---

## 4. 架构概览：三层架构

```
┌─────────────────────────────────────────────────────────┐
│                    Layer 1: Windsurf IDE                  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  代码编辑器   │  │  文件浏览器   │  │  Diff 视图   │   │
│  │  (实时查看    │  │  (STATE.yaml │  │  (Claude Code │   │
│  │   代码变化)   │  │   Tickets)   │  │   修改可视化) │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Windsurf Chat (Cascade)                         │    │
│  │  - 需求讨论、方案分析                             │    │
│  │  - 审批操作（/approve → Windsurf workflow）       │    │
│  │  - 状态查看（/status → Windsurf workflow）        │    │
│  │  - 代码审查、问题排查                             │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Layer 2: Windsurf 内置终端                       │    │
│  │                                                   │    │
│  │  $ claude                                         │    │
│  │  → /ide for Windsurf (自动连接)                   │    │
│  │  → /brainstorm 用户登录                           │    │
│  │  → /split story                                   │    │
│  │  → /next                                          │    │
│  │  → /verify S-001                                  │    │
│  │                                                   │    │
│  │  ┌────────────────────────────────────────────┐   │    │
│  │  │  Layer 3: Claude Code (RPIV 框架引擎)      │   │    │
│  │  │  - 自动加载 CLAUDE.md                      │   │    │
│  │  │  - 自动加载 Skills + Agents                │   │    │
│  │  │  - 执行 TDD / UI 还原 / 需求分析          │   │    │
│  │  │  - 更新 STATE.yaml                         │   │    │
│  │  │  - 代码修改在 Windsurf 中可视化            │   │    │
│  │  └────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## 5. 详细分工策略（参考）

### 4.1 Windsurf Cascade 负责（免费）

| 任务 | 实现方式 | 说明 |
|------|---------|------|
| 需求讨论 | 直接对话 | 和 AI 聊需求、分析方案 |
| `/status` | Windsurf workflow | 读取 STATE.yaml 格式化输出 |
| `/approve stories` | Windsurf workflow | 展示 Stories + 更新 STATE.yaml |
| `/approve tickets` | Windsurf workflow | 展示 Tickets + 更新 STATE.yaml |
| `/approve S-xxx` | Windsurf workflow | 展示验证报告 + 更新状态 |
| 代码审查 | 直接对话 | 在 IDE 中查看代码、讨论问题 |
| 日常小改动 | 直接编辑 | 不走框架的小修改 |

### 4.2 Claude Code 负责（按量付费）

| 任务 | 调用方式 | 说明 |
|------|---------|------|
| `/brainstorm` | 终端交互 | 需求分析 + 多轮校验 |
| `/split story` | 终端交互 | 拆分 Stories + INVEST 校验 |
| `/split ticket S-xxx` | 终端交互 | 拆分 Tickets + 分配路径 |
| `/next` | 终端交互 | **核心编码**，TDD/UI还原 |
| `/verify S-xxx` | 终端交互 | 运行测试 + 验收 |
| `/review` | 终端交互 | 代码审查 |

### 4.3 省钱效果

以一个完整 Story（5 个 Tickets）为例：

| 步骤 | 执行者 | Claude Token |
|------|--------|-------------|
| brainstorm | Claude Code | ~5K |
| split story | Claude Code | ~3K |
| **approve stories** | **Windsurf** | **0** |
| split ticket | Claude Code | ~5K |
| **approve tickets** | **Windsurf** | **0** |
| next × 5 | Claude Code | ~50K |
| verify | Claude Code | ~3K |
| **approve story** | **Windsurf** | **0** |
| **status × N** | **Windsurf** | **0** |
| **总计** | | **~66K** |

对比纯 Claude Code ~80K tokens，**节省约 17%**。主要价值在 IDE 体验和审批零成本。

---

## 6. 自动化工作流链

### 5.1 审批配置（config.yaml）

```yaml
approval:
  story_split: required      # → 停下，Windsurf 展示结果等审批
  ticket_split: required     # → 停下，Windsurf 展示结果等审批
  ticket_done: auto          # → Claude Code 自动继续下一个 Ticket
  story_done: required       # → 停下，等审批
```

### 5.2 自动执行流程

```
用户在 Windsurf 终端输入: claude → /brainstorm 用户登录
  │
  ▼ Claude Code 自动执行
  brainstorm_done → split_story (auto) → story_split_done
  │
  ▼ next_step = approve_stories (required)
  Claude Code 停下，输出 Stories 摘要
  │
  用户在 Windsurf Chat 中: /approve stories
  ▼ Windsurf workflow 更新 STATE.yaml
  │
  用户回到终端: /split ticket S-001
  ▼ Claude Code 执行
  ticket_split_done
  │
  ▼ next_step = approve_tickets (required)
  Claude Code 停下
  │
  用户在 Windsurf Chat 中: /approve tickets
  ▼ Windsurf workflow 更新 STATE.yaml
  │
  用户回到终端: /next
  ▼ Claude Code 自动链式执行（ticket_done: auto）
  T-001 done → T-002 done → T-003 done → ... → all_tickets_done
  │
  ▼ next_step = verify (auto)
  Claude Code 自动执行 /verify S-001 → story_done
  │
  ▼ next_step = approve_story (required)
  Claude Code 停下
  │
  用户在 Windsurf Chat 中: /approve S-001
  ▼ Windsurf workflow 更新 STATE.yaml
  │
  ▼ 检查是否有下一个 Story → 继续或结束
```

### 5.3 关键：Claude Code 的 `--permission-mode`

```bash
# 需求分析和拆分（只读+生成文档，安全）
claude -p "/brainstorm 用户登录" --permission-mode plan

# 写代码（需要修改文件，自动批准）
claude -p "/next" --permission-mode bypassPermissions

# 交互式（推荐日常使用）
claude
# 然后在交互模式中输入 /brainstorm、/next 等
```

---

## 7. 需要创建的 Windsurf Workflows

### 6.1 文件清单

```
.windsurf/workflows/
├── status.md          # 查看项目状态
├── approve.md         # 审批操作
├── rpiv.md            # RPIV 工作流说明（非执行）
└── README.md          # 使用说明
```

### 6.2 workflow: status

```markdown
---
description: 查看一人公司框架的项目状态
---
1. 读取 `osg-spec-docs/tasks/STATE.yaml`
2. 读取 `.claude/project/config.yaml`
3. 读取当前 Story 和 Ticket 的 YAML 文件
4. 输出状态报告，格式参考 `.claude/commands/status.md`
```

### 6.3 workflow: approve

```markdown
---
description: 审批 Stories/Tickets/Story 完成
---
1. 读取 `osg-spec-docs/tasks/STATE.yaml` 获取当前 workflow 状态
2. 根据参数判断审批类型：
   - "stories" → 展示所有 Stories，更新 workflow.current_step = "stories_approved"
   - "tickets" → 展示所有 Tickets，更新 workflow.current_step = "ticket_approved"
   - "S-xxx" → 展示 Story 验证报告，更新 Story 状态为 completed
3. 更新 STATE.yaml 的 workflow.next_step
4. 输出审批结果和下一步提示
```

---

## 8. 日常使用流程

### 7.1 启动工作

```bash
# 1. 打开 Windsurf，进入项目目录
# 2. 打开内置终端 (Cmd+`)
# 3. 启动 Claude Code
claude
# 4. Claude Code 自动连接 Windsurf（右下角显示 /ide for Windsurf）
```

### 7.2 执行 RPIV 工作流

```
# 在 Claude Code 终端中：
/brainstorm 权限管理模块     # Research
/split story                 # Plan
# → Claude Code 停下等审批

# 切到 Windsurf Chat：
/approve stories             # Windsurf workflow 执行审批

# 回到 Claude Code 终端：
/split ticket S-001          # Plan
# → Claude Code 停下等审批

# 切到 Windsurf Chat：
/approve tickets             # Windsurf workflow 执行审批

# 回到 Claude Code 终端：
/next                        # Implement（自动链式执行所有 Tickets）
# → 代码修改在 Windsurf 编辑器中实时展示
# → 自动执行 /verify
# → 停下等审批

# 切到 Windsurf Chat：
/approve S-001               # Validate
```

### 7.3 随时查看状态

```
# 在 Windsurf Chat 中（免费）：
/status
```

---

## 9. 进一步省钱方案（可选）

### 8.1 brainstorm/split 用 Windsurf 执行

如果愿意接受略低的质量，可以让 Windsurf 直接执行 brainstorm 和 split：

```
# 在 Windsurf Chat 中：
"请读取 .claude/core/skills/brainstorming/SKILL.md，
 按其中的流程对'权限管理模块'进行需求分析"
```

这样只有 `/next`（写代码）才需要 Claude Code，token 消耗可再降 ~15%。

### 8.2 调整审批配置

```yaml
# 如果信任 Claude Code 的拆分质量，可以改为 auto
approval:
  story_split: auto          # 自动继续，不等审批
  ticket_split: auto         # 自动继续，不等审批
  ticket_done: auto          # 已经是 auto
  story_done: required       # 保留最终审批
```

这样整个流程只在 Story 完成时停下一次，其余全部自动执行。

---

## 10. 实施步骤

### Phase 0：环境验证 ✅ 已完成（2026-02-13）

- [x] Claude Code v2.1.39 已安装
- [x] `/ide` 连接 Windsurf 成功（`Connected to Windsurf.`）
- [x] `claude -p "/status"` 非交互模式验证成功
- [x] PRD 路径批量修改完成（19 个文件，零残留）
- [x] Windsurf 编辑器集成确认（`Review N files >` 正常显示）

### Phase 1：创建 Windsurf Workflows（30分钟）

- [ ] 创建 `.windsurf/workflows/status.md`
- [ ] 创建 `.windsurf/workflows/approve.md`
- [ ] 创建 `.windsurf/workflows/rpiv.md`（说明文档）
- [ ] 在 Windsurf Chat 中测试 `/status` workflow
- [ ] 在 Windsurf Chat 中测试 `/approve` workflow

### Phase 2：实战测试（按需）

- [ ] 用完整 RPIV 流程跑一个小需求
- [ ] 验证模式 A（交互式）的 `/next` 体验
- [ ] 验证模式 B（`claude -p`）的 `/brainstorm` 体验
- [ ] 根据实际体验调整分工策略和审批配置

---

## 11. 技术限制（已验证）

| 限制 | 说明 | 影响 |
|------|------|------|
| Windsurf 无法操作交互式 TUI | `claude` 启动后接管终端，Windsurf 无法向其输入命令 | 模式 A 必须用户手动操作 |
| `claude -p` 不支持 `--cwd` | 需通过 Windsurf `run_command` 的 `Cwd` 参数指定工作目录 | 模式 B 调用时注意 |
| Claude Code 不能调用 Windsurf AI | `/ide` 只连接编辑器界面，不能调用 Cascade | 无法实现 Claude Code → Windsurf 的自动审批 |
| 两个 AI 之间无消息通道 | 只能通过文件系统（STATE.yaml）间接通信 | 审批需要用户手动触发 |

## 12. 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| Claude Code `/ide` 连接不稳定 | 回退到纯终端模式，不影响框架执行 |
| Windsurf workflow 执行 approve 时更新 STATE.yaml 格式错误 | 在 workflow 中加入格式校验步骤 |
| Claude Code 自动链式执行时上下文溢出 | 框架已有 context-compression Skill 和 checkpoint 机制 |
| 终端和 Chat 之间切换繁琐 | 可以全部在终端中完成，Windsurf Chat 只做辅助 |
| 中转 API 529 过载 | 等待重试，或切换中转站 |

---

## 附录：兼容性对照表

| 框架功能 | Claude Code | Windsurf | 本方案 |
|---------|------------|----------|--------|
| CLAUDE.md 自动加载 | ✅ | ❌ | Claude Code 负责 |
| /commands 系统 | ✅ | ❌ (用 workflows) | Claude Code 负责核心命令 |
| Skills 加载 | ✅ | ❌ | Claude Code 负责 |
| Agent 角色切换 | ✅ | ❌ | Claude Code 负责 |
| 自动工作流链 | ✅ | ⚠️ (Infinite WF) | Claude Code 自动链 + Windsurf 审批 |
| 状态查看 | ✅ | ✅ (workflow) | Windsurf 负责（免费） |
| 审批操作 | ✅ | ✅ (workflow) | Windsurf 负责（免费） |
| 代码可视化 | ❌ (终端) | ✅ | Windsurf 提供（/ide 集成） |
| Lint/诊断共享 | ⚠️ | ✅ | /ide 自动共享 |
| Diff 视图 | ❌ (终端) | ✅ | /ide 自动展示 |
