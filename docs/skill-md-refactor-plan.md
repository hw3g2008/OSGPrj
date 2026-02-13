# SKILL.md 格式改造方案

> 将所有 SKILL.md 统一为 Agent Skills 开放标准格式，使 Windsurf 和 Claude Code 都能正确注册和调用。

**状态**：已通过 3 轮校验（正向 + 反向 + 最终确认），待执行。

## 1. 背景

### 1.1 问题现象

`.claude/skills/` 下共 20 个 SKILL.md，但 Windsurf 只成功注册了 **1 个**（`workflow-engine`），其余 19 个均未被识别。

### 1.2 根本原因

**YAML frontmatter 不在文件第一行。**

19 个 SKILL.md 的格式为：

```markdown
# Brainstorming Skill        ← 第 1 行是标题（错误）

---                           ← 第 3 行才是 frontmatter 开始
name: brainstorming
description: "..."
invoked_by: user
auto_execute: true
---
```

而 `workflow-engine`（唯一被注册的）格式为：

```markdown
---                           ← 第 1 行就是 frontmatter（正确）
name: workflow-engine
description: ...
user-invocable: false
---

# Workflow Engine
```

根据 [Agent Skills 规范](https://agentskills.io/specification)，YAML frontmatter **必须从文件第一行开始**（即第一行必须是 `---`），否则解析器无法识别。

### 1.3 Agent Skills 标准来源

- **规范制定者**：Anthropic（Claude 的开发公司）
- **规范网站**：[agentskills.io](https://agentskills.io/specification)
- **性质**：开放标准，已被 Claude Code、Windsurf 等多个 Agent 产品采用
- **GitHub**：[agentskills/agentskills](https://github.com/agentskills/agentskills)

### 1.4 Windsurf 扫描 `.claude/skills/` 的证据

通过调用 Windsurf 的 `skill` 工具验证，`workflow-engine` 的 Base Directory 为：

```
file:///Users/hw/workspace/OSGPrj/.claude/skills/workflow-engine (4 supporting files)
```

这证明 **Windsurf 确实扫描了 `.claude/skills/` 目录**，尽管官方文档只列出了 `.windsurf/skills/`。

> 注意：这可能是 Windsurf 对 Agent Skills 标准的兼容实现（因为 Claude Code 使用 `.claude/skills/`）。为防止未来版本移除此兼容，方案包含创建 `.windsurf/skills/` 符号链接作为保险。

### 1.5 Skills 目录层级

| 层级 | 目录 | 说明 |
|------|------|------|
| 项目级（主） | `.claude/skills/` | 框架 Skills 的唯一源，两个平台共用 |
| 项目级（链接） | `.windsurf/skills/` | 符号链接指向 `.claude/skills/` 下的各 Skill 目录 |
| 全局级 | `~/.codeium/windsurf/skills/` | Windsurf 全局 Skills（已清空，未来手动管理） |

---

## 2. Agent Skills 官方规范摘要

### 2.1 目录结构

```
skill-name/
├── SKILL.md          # 必需
├── scripts/          # 可选 - 脚本
├── references/       # 可选 - 参考文档
└── assets/           # 可选 - 模板、图片、数据
```

### 2.2 SKILL.md 格式

```markdown
---
name: skill-name
description: What this skill does and when to use it
---

# Skill Title

## Instructions
...
```

### 2.3 Frontmatter 字段

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | ✅ | 唯一标识符，必须与父目录名一致。1-64 字符，只允许小写字母、数字、连字符 |
| `description` | ✅ | 1-1024 字符，描述做什么 + 何时使用 |
| `license` | ❌ | 许可证 |
| `compatibility` | ❌ | 环境要求（1-500 字符） |
| `metadata` | ❌ | 自定义键值对（string → string），用于存储标准未定义的属性 |
| `allowed-tools` | ❌ | 预批准的工具列表（实验性） |

### 2.4 `name` 字段规则

- 只允许：小写字母 `a-z`、数字 `0-9`、连字符 `-`
- 不能以 `-` 开头或结尾
- 不能有连续 `--`
- **必须与父目录名一致**

### 2.5 `metadata` 字段规则

- 键值对，值必须是 **string** 类型（如 `"true"` 而非 `true`）
- 用于存储标准未定义的自定义属性
- 建议键名具有合理唯一性以避免冲突
- **键名风格**：与 Agent Skills 标准一致，使用连字符（如 `invoked-by`，不用 `invoked_by`）

> **关于 string 类型约束**：`"true"` 与 `true` 的区别对 AI 行为无影响——AI 能正确理解字符串 `"true"` 的布尔语义。使用 string 是为了符合 metadata 字段的规范要求。

---

## 3. 当前自定义字段分析

### 3.1 `invoked_by` → `invoked-by` — 调用方式

标注 Skill 由谁触发，对 AI Agent 的行为决策有指导意义。

| 值 | 含义 | 对应的 Skills |
|---|------|--------------|
| `user` | 用户通过命令触发（如 `/brainstorm`、`/split`） | brainstorming, story-splitter, ticket-splitter, ralph-loop, using-git-worktrees |
| `agent` | 其他 Skill/Agent 在执行过程中自动调用 | deliver-ticket, tdd, code-review, verification, debugging, memory-bank, subagent-dispatch, progress-tracker, test-design, test-execution |
| `auto` | 系统自动触发（生命周期事件、阈值触发） | checkpoint-manager, context-compression, hooks-manager, framework-audit |

> 部分 Skills 支持多种调用方式，如 `deliver-ticket` 可以是 `user, agent`。

### 3.2 `auto_execute` → `auto-execute` — 自动执行模式

标注 Skill 被调用后是否自动执行，不等待用户确认。

| 值 | 含义 | 对应的 Skills |
|---|------|--------------|
| `true`（默认） | 自动执行，不等待用户确认 | 大部分 Skills |
| `false` | 需要用户确认后才执行 | using-git-worktrees |

### 3.3 `user-invocable`（仅 workflow-engine 使用）

| 值 | 含义 |
|---|------|
| `false` | 不允许用户直接调用，只能被框架内部调用 |

### 3.4 这些字段的作用

虽然框架中没有代码直接 `parse` 这些字段做程序化判断，但它们对 **AI Agent 的行为决策** 有重要指导意义：

1. AI 读取 SKILL.md 时，`invoked-by` 告诉它“这个 Skill 应该在什么场景下被调用”
2. `auto-execute` 告诉它“调用后是否需要等用户确认”
3. `user-invocable` 告诉它“用户能否直接 @mention 这个 Skill”

---

## 4. 改造方案

### 4.1 核心变更

| # | 变更 | 原因 |
|---|------|------|
| 1 | frontmatter 移到文件第一行 | 符合标准，解决 Windsurf 注册问题 |
| 2 | `invoked_by` → `metadata.invoked-by` | 保留语义，符合标准，键名用连字符 |
| 3 | `auto_execute` → `metadata.auto-execute` | 保留语义，符合标准，键名用连字符 |
| 4 | `user-invocable` → `metadata.user-invocable` | 统一处理 |
| 5 | 标题移到 frontmatter 之后 | 标准格式 |
| 6 | `metadata` 值统一为 string | 规范要求 |
| 7 | 创建 `.windsurf/skills/` 符号链接 | 防止 Windsurf 未来移除 `.claude/skills/` 兼容 |
| 8 | 更新 6 个设计文档中的旧格式示例 | 保持全局一致性 |

### 4.2 格式对照

#### Before（19 个 SKILL.md 的当前格式）

```markdown
# Brainstorming Skill

---
name: brainstorming
description: "Use when user triggers /brainstorm - performs requirement analysis with automatic multi-round validation"
invoked_by: user
auto_execute: true
---

## 概览
...
```

#### After（改造后的标准格式）

```markdown
---
name: brainstorming
description: "Use when user triggers /brainstorm - performs requirement analysis with automatic multi-round validation"
metadata:
  invoked-by: "user"
  auto-execute: "true"
---

# Brainstorming Skill

## 概览
...
```

#### Before（workflow-engine 的当前格式）

```markdown
---
name: workflow-engine
description: RPIV 工作流状态机引擎。管理状态转换、自动继续逻辑、审批门控。当需要判断下一步操作或更新工作流状态时使用。
user-invocable: false
---

# Workflow Engine
...
```

#### After（workflow-engine 改造后）

```markdown
---
name: workflow-engine
description: RPIV 工作流状态机引擎。管理状态转换、自动继续逻辑、审批门控。当需要判断下一步操作或更新工作流状态时使用。
metadata:
  invoked-by: "auto"
  auto-execute: "true"
  user-invocable: "false"
---

# Workflow Engine
...
```

### 4.3 完整改造清单

#### 19 个需要修改 frontmatter 位置的 SKILL.md

| # | Skill | invoked-by（metadata） | auto-execute（metadata） |
|---|-------|----------------------|------------------------|
| 1 | brainstorming | user | true |
| 2 | checkpoint-manager | auto | true |
| 3 | code-review | agent | true |
| 4 | context-compression | auto | true |
| 5 | debugging | agent | true |
| 6 | deliver-ticket | agent | true |
| 7 | framework-audit | auto | true |
| 8 | hooks-manager | auto | true |
| 9 | memory-bank | agent | true |
| 10 | progress-tracker | agent | true |
| 11 | ralph-loop | user | true |
| 12 | story-splitter | user | true |
| 13 | subagent-dispatch | agent | true |
| 14 | tdd | agent | true |
| 15 | test-design | agent | true |
| 16 | test-execution | agent | true |
| 17 | ticket-splitter | user | true |
| 18 | using-git-worktrees | user | false |
| 19 | verification | agent | true |

#### 1 个需要补充 metadata 的 SKILL.md

| # | Skill | 变更 |
|---|-------|------|
| 20 | workflow-engine | `user-invocable: false` → `metadata.user-invocable: "false"` + 补充 `invoked-by` 和 `auto-execute` |

#### 创建 `.windsurf/skills/` 符号链接

为每个 Skill 创建符号链接，指向 `.claude/skills/` 下的对应目录：

```bash
mkdir -p .windsurf/skills
for skill in .claude/skills/*/; do
  name=$(basename "$skill")
  ln -sf "../../.claude/skills/$name" ".windsurf/skills/$name"
done
```

这样 `.windsurf/skills/brainstorming/` → `../../.claude/skills/brainstorming/`，两个平台读取同一份文件。

#### 6 个需要更新的设计文档

| 文件 | 变更 |
|------|------|
| `docs/一人公司框架/42_实现细节.md` | 更新 SKILL.md 格式模板（第 1181-1191 行） |
| `docs/一人公司框架/10_Skills_记忆管理.md` | 更新 frontmatter 示例 |
| `docs/一人公司框架/11_Skills_工作流.md` | 更新 frontmatter 示例 |
| `docs/一人公司框架/12_Skills_质量.md` | 更新 frontmatter 示例 |
| `docs/一人公司框架/13_Skills_自动化.md` | 更新 frontmatter 示例 |
| `docs/一人公司框架/45_平台适配与Hooks机制.md` | 更新 frontmatter 示例 |

---

## 5. 影响分析

### 5.1 Windsurf

| 项目 | 改造前 | 改造后 |
|------|--------|--------|
| 注册的 Skills 数量 | 1（workflow-engine） | 20（全部） |
| 自动调用 | 仅 workflow-engine | 所有 Skills 根据 description 自动匹配 |
| @mention 调用 | 仅 @workflow-engine | 所有 @skill-name 都可用 |

### 5.2 Claude Code

| 项目 | 改造前 | 改造后 |
|------|--------|--------|
| Skills 识别 | 正常（CC 可能更宽容） | 正常 |
| `metadata` 中的自定义字段 | N/A | CC 会忽略不认识的字段，不影响功能 |

### 5.3 AI 行为

| 项目 | 改造前 | 改造后 |
|------|--------|--------|
| `invoked-by` 可见性 | frontmatter 顶层（下划线命名） | `metadata` 下（连字符命名），AI 仍可读取 |
| `auto-execute` 可见性 | frontmatter 顶层（下划线命名） | `metadata` 下（连字符命名），AI 仍可读取 |
| 行为决策 | 不变 | 不变 |

### 5.4 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Windsurf 不识别 `.claude/skills/` 目录 | 低 | 高 | 已验证 workflow-engine 从此目录注册成功 + `.windsurf/skills/` 符号链接保险 |
| `metadata` 中的字段被 AI 忽略 | 低 | 中 | metadata 仍在 frontmatter 中，AI 会读取 |
| 改造过程中引入格式错误 | 中 | 低 | 逐个文件验证 YAML 格式 |
| Windsurf 未来移除 `.claude/skills/` 兼容 | 低 | 中 | `.windsurf/skills/` 符号链接作为 fallback |

---

## 6. 执行步骤

### Phase 1: 批量修改 SKILL.md（19 个文件）

对每个文件执行：
1. 删除第一行的 `# Title`（和空行）
2. 将 `invoked_by` → `metadata.invoked-by`，`auto_execute` → `metadata.auto-execute`
3. `metadata` 值加引号（string 类型）
4. 将标题移到 frontmatter 结束标记 `---` 之后

### Phase 2: 统一 workflow-engine

1. 将 `user-invocable: false` → `metadata.user-invocable: "false"`
2. 补充 `metadata.invoked-by` 和 `metadata.auto-execute`

### Phase 3: 创建 `.windsurf/skills/` 符号链接

```bash
mkdir -p .windsurf/skills
for skill in .claude/skills/*/; do
  name=$(basename "$skill")
  ln -sf "../../.claude/skills/$name" ".windsurf/skills/$name"
done
```

并在 `.gitignore` 中添加：
```
# Windsurf skills 符号链接（指向 .claude/skills/）
# .windsurf/skills/
```

> 注意：符号链接是否加入 git 需要讨论。如果加入，其他开发者 clone 后自动可用；如果不加入，每个开发者需要手动执行上述脚本。

### Phase 4: 更新设计文档（6 个文件）

更新以下文档中的 SKILL.md frontmatter 示例为新格式：
1. `docs/一人公司框架/42_实现细节.md` — 标准模板
2. `docs/一人公司框架/10_Skills_记忆管理.md` — memory-bank, context-compression, checkpoint-manager
3. `docs/一人公司框架/11_Skills_工作流.md` — brainstorming, story-splitter, ticket-splitter, deliver-ticket, using-git-worktrees
4. `docs/一人公司框架/12_Skills_质量.md` — verification, tdd, code-review, debugging
5. `docs/一人公司框架/13_Skills_自动化.md` — ralph-loop, progress-tracker
6. `docs/一人公司框架/45_平台适配与Hooks机制.md` — subagent-dispatch, hooks-manager

### Phase 5: 验证

1. 重启 Windsurf
2. 检查所有 20 个 Skills 是否出现在 Cascade Skills 列表中
3. 测试 @mention 调用
4. 测试自动调用（通过 description 匹配）

---

## 7. 新的 SKILL.md 格式模板

后续创建新 Skill 时，使用以下模板：

```markdown
---
name: {skill-name}
description: "Use when {触发条件} - {功能描述}"
metadata:
  invoked-by: "{user | agent | auto}"
  auto-execute: "{true | false}"
---

# {Skill 名称}

## 概览

{简要描述}

## 触发条件

{描述何时触发此 Skill}

## 执行流程

### Step 1: {步骤名}
{具体操作}

### Step 2: {步骤名}
{具体操作}

## 输入规范

{输入要求}

## 输出格式

{输出模板}
```

---

## 8. 参考资料

- [Agent Skills 规范](https://agentskills.io/specification)
- [Agent Skills 概览](https://agentskills.io/home)
- [Windsurf Skills 文档](https://docs.windsurf.com/windsurf/cascade/skills)
- [Anthropic Skills 示例](https://github.com/anthropics/skills)
