# 一人公司 AI 开发框架

> 本框架基于 RPIV 工作流（Research → Plan → Implement → Validate），实现 AI 自主开发。

---

## ⚠️ 首次响应规则（SessionStart Hook）

**每次会话开始时，必须执行以下检查：**

```
1. 读取 osg-spec-docs/tasks/STATE.yaml
   - 如果不存在 → 提示执行 /init-project
   - 如果存在 → 读取当前状态

2. 读取 .claude/project/config.yaml
   - 如果不存在 → 提示创建项目配置
   - 如果存在 → 加载项目配置

3. 输出当前状态摘要：
   ## 📊 当前状态
   - 项目: {state.project}
   - 当前 Story: {state.current_story}
   - 当前 Ticket: {state.current_ticket}
   - 工作流: {state.workflow.current_step} → {state.workflow.next_step}
   - 进度: {state.stats.completed_tickets}/{state.stats.total_tickets} Tickets
```

---

## 🚫 禁止行为

1. **不要停下来问用户** - Skills 自动迭代执行，直到完成
2. **不要凭记忆** - 每次必须读取 STATE.yaml 和 config.yaml
3. **不要假设** - 所有信息从文件中读取
4. **不要硬编码** - 技术栈、路径、命令从 config.yaml 读取
5. **不要跳过验证** - Ticket 完成前必须执行验证命令并记录证据
6. **不要伪造证据** - verification_evidence 必须来自实际命令执行结果

---

## ⚡ 响应结束规则（自动继续）

**每次响应结束前，必须执行以下检查：**

```
0. 判断当前执行的命令类型：
   - 每个命令对应的 Skill 在完成后会自行更新 workflow.current_step 和 workflow.next_step
   - 此处不需要重复写入，只需在步骤 1 读取最新的 workflow 状态即可
   - 命令与完成步骤的对应关系参见下方「命令到步骤名称映射表」

1. 读取 osg-spec-docs/tasks/STATE.yaml 的 workflow 字段
   - 如果 workflow 不存在 → 创建 workflow 字段，设置初始状态
   - 如果存在 → 获取 current_step 和 next_step

2. 如果 next_step 为空 → 停止（工作流结束）

3. 根据 next_step 查找审批配置键（使用映射表）：
   - next_step = "approve_stories" → config.approval.story_split
   - next_step = "approve_tickets" → config.approval.ticket_split
   - next_step = "approve_story" → config.approval.story_done
   - next_step = "next" → config.approval.ticket_done
   - next_step = "null" → 工作流结束，停止
   - 其他（split_story, split_ticket, verify, next_story）→ 不需要审批（auto）

4. 判断是否自动继续：
   - 如果审批配置值为 "auto" 或不存在 → next_requires_approval = false
   - 如果审批配置值为 "required" → next_requires_approval = true

5. 如果 next_requires_approval == false：
   a. **执行命令**：
      - 根据"步骤名称到命令映射表"找到 next_step 对应的命令
      - 如果是 `/split ticket`，需要从 STATE.current_story 获取 Story ID
      - 执行命令（调用对应的 Agent 和 Skill）
      - 等待命令执行完成
      - 注意：Skill 在完成后会自行更新 workflow.current_step 和 workflow.next_step

   b. **检查执行结果**：
      - 如果命令失败，停止并输出错误（Skill 不会更新 workflow）
      - 如果命令成功，Skill 已经更新了 workflow

   c. **继续循环**：
      - 重复步骤 1-5，读取 Skill 写入的最新 workflow 状态
      - 直到遇到需要审批的步骤或工作流结束

6. 如果 next_requires_approval == true：
   - 输出清晰的审批提示："等待审批: /approve {对应的审批命令}"
   - 注意：不需要手动更新 workflow，Skill 已在执行时更新
   - 停止响应
```

**工作流转换表：**

| 当前步骤 | 下一步 | 审批配置键 | 默认行为 | 说明 |
|----------|--------|------------|----------|------|
| `brainstorm_done` | `split_story` | - | auto | 需求分析完成后自动拆分 Stories |
| `story_split_done` | `approve_stories` | `story_split` | required | Story 拆分后需要审批 |
| `stories_approved` | `split_ticket` | - | auto | Stories 审批后自动拆第一个 Story 的 Tickets |
| `ticket_split_done` | `approve_tickets` | `ticket_split` | required | Ticket 拆分后需要审批 |
| `ticket_approved` | `next` | - | auto | 审批通过后自动执行第一个 Ticket |
| `ticket_done` | `next` (循环) | `ticket_done` | auto | Ticket 完成后自动执行下一个 |
| `all_tickets_done` | `verify` | - | auto | 所有 Tickets 完成后自动验收 |
| `story_done` | `approve_story` | `story_done` | required | Story 完成后需要审批 |
| `story_approved` | `next_story` | - | auto | Story 审批后检查是否有下一个 Story |
| `all_stories_done` | `null` | - | - | 所有 Stories 完成，工作流结束 |

**步骤名称到命令映射表：**

| 步骤名称 | 实际命令 | 参数来源 |
|----------|----------|----------|
| `split_story` | `/split story` | - |
| `approve_stories` | `/approve stories` | - |
| `split_ticket` | `/split ticket {story_id}` | STATE.current_story |
| `approve_tickets` | `/approve tickets` | - |
| `next` | `/next` | - |
| `verify` | `/verify {story_id}` | STATE.current_story |
| `approve_story` | `/approve {story_id}` | STATE.current_story |
| `next_story` | 检查下一个 Story（见下方逻辑） | STATE.stories |
| `null` | 无（工作流结束） | - |

**`next_story` 分支逻辑：**

```
if 存在 pending Story:
    current_story = 下一个 pending Story ID
    current_step = "stories_approved"  # 回到拆 Ticket 阶段
    next_step = "split_ticket"
    执行 /split ticket {story_id}
else:
    current_step = "all_stories_done"
    next_step = null
    输出 "所有 Stories 已完成"
```

**命令到步骤名称映射表：**

| 命令 | 完成后的步骤名称 | 说明 |
|------|----------------|------|
| `/brainstorm` | `brainstorm_done` | 需求分析完成 |
| `/split story` | `story_split_done` | Story 拆分完成 |
| `/split ticket S-xxx` | `ticket_split_done` | Ticket 拆分完成 |
| `/next` | `ticket_done` 或 `all_tickets_done` | Ticket 执行完成（如果是最后一个则为 all_tickets_done） |
| `/verify S-xxx` | `story_done` | Story 验收完成 |
| `/approve stories` | `stories_approved` | Stories 审批通过（开始拆 Tickets） |
| `/approve tickets` | `ticket_approved` | Tickets 审批通过 |
| `/approve S-xxx` | `story_approved` 或 `all_stories_done` | Story 审批通过（如果是最后一个则为 all_stories_done） |

**边界情况处理：**

| 情况 | 处理方式 |
|------|----------|
| workflow 字段不存在 | 创建 workflow 字段，设置 current_step = 当前命令对应的步骤名 |
| next_step 为空 | 停止，输出"工作流已完成" |
| 审批配置键不存在 | 视为 "auto"，自动继续 |
| 转换表中找不到 next_step | 停止，输出"未知步骤: {next_step}" |
| split_ticket 需要 Story ID 但不存在 | 停止，输出"需要先选择 Story" |
| 命令执行失败 | 不更新 workflow，停止并输出错误 |
| Ticket 依赖未满足 | 跳过该 Ticket，选择下一个无依赖的 pending Ticket |
| Story 的 tickets 列表为空时执行 /verify | 停止，输出"Story 没有 Tickets，无法验收" |
| Ticket 的 allowed_paths 为空 | 停止，输出"Ticket 缺少 allowed_paths 配置" |
| **Ticket 完成时缺少 verification_evidence** | **停止，不更新状态，提示执行验证命令** |
| **/verify 时 Ticket 缺少 verification_evidence** | **停止验收，列出缺少证据的 Tickets** |

---

## 📁 框架结构

```
.claude/
├── CLAUDE.md                    # 本文件（入口）
├── core/                        # 核心框架（通用，可复制）
│   ├── skills/                  # 19 个 Skills
│   ├── agents/                  # 6 个 Agent 模板（通用角色）
│   ├── docs/                    # 核心文档（如 testing-methodology.md）
│   ├── workflows/               # 工作流定义
│   ├── platform/                # 平台适配层
│   └── templates/               # YAML 模板
├── project/                     # 项目配置（项目特定）
│   ├── config.yaml              # ⚠️ 核心配置文件
│   ├── agents/                  # 4 个项目 Agent 实例（技术栈特定）
│   └── rules/                   # 项目代码规范
├── commands/                    # 快捷命令
├── memory/                      # 工作记忆
└── checkpoints/                 # 检查点

osg-spec-docs/tasks/
├── STATE.yaml                   # 当前状态
├── stories/                     # Story 文件
└── tickets/                     # Ticket 文件
```

---

## 🔧 框架修改规则

修改 `.claude/` 下的框架文件时，必须遵守：

1. **core/ 禁止项目专属内容** -- core 层的 Skills、Agents、Templates 中不得出现项目名称、具体技术框架名、具体文件路径。使用 `${config.*}` 引用或通用描述代替。
2. **新增概念必须全局传播** -- 新增 type / Agent / config 路径后，搜索全部 `.claude/` 和 `docs/一人公司框架/` 更新所有引用点（type 枚举、Agent 映射表、模板示例、验证逻辑、本文件角色表）。
3. **模板与示例必须同步** -- 修改 `core/templates/*.yaml` 的字段结构后，同步更新 Skills 中引用该模板的内联示例代码。
4. **兄弟文件风格统一** -- 同目录下的同类文件（如 `project/agents/*.md`）的 frontmatter 字段、变量引用方式、章节结构必须一致。新建文件前先读取已有文件作为模板。
5. **Skill 描述与实现同步** -- 修改 Skill 内部流程（如新增分支）后，同步更新该 Skill 的 frontmatter `description`、概览段落、以及引用该 Skill 的文档描述。

### 修改后必查清单

**新增 type 时**（grep `type` 枚举，逐个确认）:
- [ ] `core/templates/ticket.yaml` -- type 注释枚举
- [ ] `core/skills/ticket-splitter/SKILL.md` -- type 枚举 + 流程图 + 拆分示例
- [ ] `core/skills/deliver-ticket/SKILL.md` -- 概览 + frontmatter + 流程分支 + 铁律适用范围 + 伪代码
- [ ] `core/skills/verification/SKILL.md` -- `can_claim_done` 门控分支
- [ ] `core/templates/log.yaml` -- 阶段注释
- [ ] `docs/一人公司框架/42_实现细节.md` -- type → Agent 映射表（4.5 节）
- [ ] `CLAUDE.md` -- 角色表

**修改模板字段结构时**（grep 字段名，逐个确认）:
- [ ] 对应 Skill 中的内联模板和示例代码（如 `allowed_paths` 嵌套格式）
- [ ] `docs/一人公司框架/42_实现细节.md` -- 引用该字段的伪代码

**新增 Agent 时**:
- [ ] 先读取同目录已有 Agent 文件，统一 frontmatter 格式（skills / rules / extends）
- [ ] `project/config.yaml` -- developers 列表
- [ ] `CLAUDE.md` -- 角色表
- [ ] `docs/一人公司框架/42_实现细节.md` -- type → Agent 映射

### ⚠️ 修改后强制全局终审

**任何框架文件修改完成后，必须执行 `framework-audit` Skill（7 维度全局一致性审计）。**

```
执行流程：
1. 完成所有局部修改
2. 执行 framework-audit — 以「全新 session 视角」审计全部框架文件
3. 如果 7/7 维度全部 ✅ → 修改完成
4. 如果有任何 ❌ → 执行局部修复 → 回到步骤 2 重新执行完整审计
5. 循环直到一次性全部通过（最多 5 轮）

⚠️ 禁止只验证上一轮修复的内容 — 每轮必须完整执行所有 7 个维度
⚠️ 禁止在任何维度 ❌ 时声明修改完成
```

**审计维度（详见 `core/skills/framework-audit/SKILL.md`）：**
1. 状态管理一致性（phase 清理、workflow 写入统一）
2. 工作流链路完整性（10 个转换节点无断裂）
3. CLAUDE.md 自洽性（步骤职责、字段引用、边界表）
4. Type 系统一致性（6 种 type 在 5 个位置一致）
5. 废弃概念清理（5 个模式在 `.claude/` 中 0 匹配）
6. 跨文件引用一致性（数量、配置键、恢复能力）
7. 代码块格式完整性（开闭匹配）

---

## 🎯 核心命令

| 命令 | 说明 | 阶段 |
|------|------|------|
| `/init-project` | 初始化项目 | 准备 |
| `/brainstorm` | 需求分析（自动迭代） | Research |
| `/add-requirement` | 追加需求 | Research |
| `/split story` | 拆解为 Stories | Plan |
| `/split ticket S-xxx` | 拆解为 Tickets | Plan |
| `/approve` | 审批 Stories/Tickets/完成 | Plan |
| `/next` | 执行下一个 Ticket | Implement |
| `/skip` | 跳过当前 Ticket | Implement |
| `/unblock` | 解除依赖阻塞 | Implement |
| `/verify S-xxx` | 验收 Story | Validate |
| `/review` | 代码审查 | Validate |
| `/status` | 查看当前状态 | 任意 |
| `/checkpoint` | 保存检查点 | 任意 |
| `/save` | 保存进度 | 任意 |
| `/restore` | 恢复检查点 | 任意 |
| `/rollback` | 回滚变更 | 任意 |
| `/retry` | 重试失败任务 | 任意 |
| `/compress` | 压缩上下文 | 任意 |
| `/ralph-loop` | 启动 RALPH 循环 | Implement |
| `/worktree` | Git 工作树管理 | 任意 |

---

## 🔄 标准工作流

```
/brainstorm {模块名}     # 1. 需求分析（自动迭代校验）
     ↓
/split story             # 2. 拆解为 Stories
     ↓
/approve stories         # 3. 审批 Stories
     ↓
/split ticket S-001      # 4. 拆解为 Tickets
     ↓
/approve tickets         # 5. 审批 Tickets
     ↓
/next                    # 6. 执行 Ticket（自动继续）
     ↓
/verify S-001            # 7. 验收 Story
     ↓
/approve S-001           # 8. 完成 Story
```

---

## 📂 加载配置

- 核心框架: `.claude/core/`
- 项目配置: `.claude/project/config.yaml`
- 当前状态: `osg-spec-docs/tasks/STATE.yaml`

---

## 👤 当前角色

根据 Ticket 类型自动分派：

| Ticket 类型 | 分派 Agent | 配置来源 |
|-------------|------------|----------|
| backend | backend-java Agent | `project/agents/backend-java.md` |
| frontend | frontend-vue Agent | `project/agents/frontend-vue.md` |
| frontend-ui | frontend-admin Agent | `project/agents/frontend-admin.md` |
| database | dba-mysql Agent | `project/agents/dba-mysql.md` |
| test | backend-java Agent | `project/agents/backend-java.md`（后端测试）或 frontend-vue Agent（前端测试），根据关联 Story 判断 |
| config | backend-java Agent | 配置类任务默认由 backend-java 处理 |

---

## 🧠 记忆管理

- **上下文阈值**: 70%（超过自动触发 context-compression）
- **检查点**: 每个 Ticket 完成后自动保存
- **决策记录**: `.claude/memory/decisions.yaml`
- **会话状态**: `.claude/memory/session.yaml`
- **工程审计**: `.claude/memory/project-audit.yaml`

---

## 📏 规范引用

| 技术 | 规范 |
|------|------|
| Java | 阿里巴巴 Java 开发手册 |
| Vue | Vue 官方风格指南 |
| SQL | 项目规范 `project/rules/sql.md` |
| 测试 | 测试方法论 `core/docs/testing-methodology.md` |

---

## 🧪 测试要求（重中之重）

### 覆盖率门槛

| 类型 | 分支覆盖率 | 行覆盖率 | 说明 |
|------|-----------|---------|------|
| backend | **100%** | ≥ 90% | 后端代码必须 100% 分支覆盖 |
| database | **100%** | ≥ 90% | 数据库相关代码必须 100% 分支覆盖 |
| test | **100%** | ≥ 90% | 测试代码本身必须 100% 分支覆盖 |
| frontend | ≥ 90% | ≥ 80% | 前端功能代码 |
| frontend-ui | ≥ 80% | ≥ 70% | UI 还原代码 |

### 测试用例设计方法（必须应用）

1. **等价类划分** (Equivalence Partitioning) - 划分有效/无效输入类
2. **边界值分析** (Boundary Value Analysis) - 测试边界条件
3. **决策表测试** (Decision Table Testing) - 覆盖条件组合

### 测试类型（必须覆盖）

- ✅ 正向测试 (Happy Path)
- ✅ 负向测试 (Negative Testing)
- ✅ 边界测试 (Boundary Testing)
- ✅ 异常测试 (Exception Testing)
- ✅ null/空值测试

### 相关 Skills

- `test-design`: 测试用例设计，确保 100% 分支覆盖
- `test-execution`: 测试执行与覆盖率验证
- `tdd`: TDD 开发流程（Red-Green-Refactor）

---

## 📖 详细文档

- 框架设计：`docs/一人公司框架/`
- 概览：`docs/一人公司框架/00_概览.md`
- 低智商模型指南：`docs/一人公司框架/44_低智商模型执行指南.md`
