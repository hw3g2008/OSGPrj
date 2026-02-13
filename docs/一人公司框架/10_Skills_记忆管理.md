# Skills - 记忆管理类

本文档包含 3 个记忆管理相关的 Skills：
- memory-bank
- context-compression
- checkpoint-manager

---

## 1. memory-bank

**来源**：claude-memory-bank、TÂCHES

```yaml
---
name: memory-bank
description: "Use when making important decisions, at session start, or when saving state - manages working and long-term memory"
metadata:
  invoked-by: "agent"
  auto-execute: "true"
---
```

### 核心功能

- 保存重要决策到 `memory/decisions.yaml`
- 读取历史摘要恢复上下文
- 追踪当前会话状态

### 触发条件

- 做出重要技术决策时
- 会话开始时（加载历史）
- 用户执行 `/checkpoint` 或 `/save` 时（保存摘要）
- Story 完成时（自动保存摘要）

> **注意**：由于 Cursor 中没有明确的"会话结束"事件，建议用户在结束工作前手动执行 `/checkpoint` 保存状态。

### Prompt 模板

```markdown
# Memory Bank Skill

## 职责
管理工作记忆和长期记忆的读写。

## 会话开始时
1. 读取 `memory/session.yaml` 获取上次状态
2. 读取 `memory/decisions.yaml` 获取历史决策
3. 如有必要，读取 `memory/summaries/` 中的最近摘要
4. 输出恢复报告

## 做出重要决策时
1. 记录决策到 `memory/decisions.yaml`
2. 格式：
   ```yaml
   - id: D-{序号}
     date: "{日期}"
     context: "{决策背景}"
     decision: "{决策内容}"
     rationale: "{决策理由}"
     impact: "{影响范围}"
   ```

## 保存记忆时（用户执行 `/checkpoint` 或 `/save`）
1. 更新 `memory/session.yaml`
2. 如果有重要内容，创建摘要到 `memory/summaries/{date}.md`
3. 输出保存确认

> **提醒用户**：Cursor 没有自动触发"会话结束"的能力，建议在结束工作前执行 `/checkpoint` 保存状态。

## 输出格式
"""
### 📝 决策记录
- **ID**: D-001
- **背景**: {context}
- **决策**: {decision}
- **理由**: {rationale}

已保存到 memory/decisions.yaml
"""
```

---

## 2. context-compression

**来源**：ACON、ReSum、CaT 论文

```yaml
---
name: context-compression
description: "Use when context usage exceeds 70% or manually triggered with /compress - compresses conversation history to save tokens"
metadata:
  invoked-by: "auto"
  auto-execute: "true"
---
```

### 核心功能

1. 监控 token 使用率
2. 达到阈值（70%）时触发压缩
3. 提取关键信息，生成摘要
4. 清除旧上下文，保留摘要
5. 保存摘要到 `memory/summaries/`

### 压缩策略

| 保留 | 压缩 | 丢弃 |
|------|------|------|
| 当前任务 | 已完成任务详情 | 重复信息 |
| 未完成 Ticket | 中间探索过程 | 冗余对话 |
| 重要决策 | | |

### Prompt 模板

```markdown
# Context Compression Skill

## 触发条件
- 上下文使用率 > 70%
- 用户执行 `/compress` 命令

## 压缩流程

### Step 1: 识别关键信息
"""
## 🔍 上下文分析
- 当前使用率: {usage}%
- 当前任务: {current_ticket}
- 未完成 Tickets: {pending_tickets}
- 重要决策数: {decision_count}
"""

### Step 2: 生成压缩摘要
"""
## 📋 压缩摘要

### 当前状态
- Phase: {phase}
- Story: {story_id}
- Ticket: {ticket_id} ({ticket_status})

### 已完成工作
{completed_work_summary}

### 关键决策
{key_decisions}

### 待处理
{pending_items}
"""

### Step 3: 保存并清理
1. 保存摘要到 `memory/summaries/{timestamp}.md`
2. 更新 `memory/session.yaml`
3. 报告压缩结果

## 输出格式
"""
### ✅ 上下文压缩完成
- 压缩前: {before}%
- 压缩后: {after}%
- 节省: {saved}%
- 摘要已保存: memory/summaries/{filename}

可继续执行任务。
"""

## 硬性约束
1. 绝不丢失当前任务状态
2. 绝不丢失重要决策
3. 压缩后必须能恢复工作
```

---

## 3. checkpoint-manager

**来源**：LangGraph 生产级特性、Claude 官方 checkpointing

```yaml
---
name: checkpoint-manager
description: "Use after completing a Ticket, making important decisions, or when triggered with /checkpoint - saves and restores task state for long-running tasks"
metadata:
  invoked-by: "auto"
  auto-execute: "true"
---
```

### 检查点时机

- 每个 Ticket 完成后
- 重要决策做出后
- 手动触发 `/checkpoint`

### 检查点内容

```yaml
# checkpoints/CP-20260201-100500.yaml
id: "CP-20260201-100500"
created_at: "2026-02-01T10:05:00Z"
phase: "implement"
story: "S-001"
ticket: "T-002"
status: "completed"
files_changed:
  - "ruoyi-admin/src/main/java/.../UserController.java"
  - "ruoyi-system/src/main/java/.../UserService.java"
git_commit: "abc1234"
context_summary: |
  完成用户列表 API，下一步是 T-003 用户详情 API
```

### Prompt 模板

```markdown
# Checkpoint Manager Skill

## 创建检查点

### 触发条件
- Ticket 完成后（自动）
- 用户执行 `/checkpoint`
- 重要决策后

### 创建流程
1. 收集当前状态
2. 记录文件变更
3. 创建 Git commit（如配置）
4. 写入检查点文件
5. 更新 STATE.yaml

### 输出格式
"""
### ✅ 检查点已创建
- **ID**: CP-{timestamp}
- **阶段**: {phase}
- **任务**: {story_id} / {ticket_id}
- **文件变更**: {file_count} 个文件
- **Git Commit**: {commit_hash}

可使用 `/restore CP-{timestamp}` 恢复到此状态。
"""

## 恢复检查点

### 命令
- `/restore CP-xxx` - 恢复到指定检查点
- `/restore --last` - 恢复到最近检查点

### 恢复流程
1. 读取检查点文件
2. 恢复 Git 状态（如有）
3. 更新 STATE.yaml
4. 加载上下文摘要
5. 输出恢复报告

### 输出格式
"""
### 🔄 已恢复到检查点
- **ID**: CP-{timestamp}
- **创建时间**: {created_at}
- **阶段**: {phase}
- **任务**: {story_id} / {ticket_id}

### 恢复的状态
{context_summary}

### 下一步
- 继续执行: `/next`
- 查看状态: `/status`
"""

## 硬性约束
1. 检查点必须包含完整恢复信息
2. 恢复前必须确认当前工作已保存
3. 恢复后必须验证状态一致性
```

---

## 相关文档

- [00_概览](00_概览.md) - 返回概览
- [02_错误处理](02_错误处理.md) - 记忆管理架构
- [11_Skills_工作流](11_Skills_工作流.md) - 工作流 Skills
