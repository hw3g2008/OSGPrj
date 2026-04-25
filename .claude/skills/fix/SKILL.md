---
name: fix
description: "通用变更方案生成与执行 - 支持修复/重构/新功能/文档更新（含多轮校验）"
metadata:
  invoked-by: "/fix command, superpowers lightweight flow"
  auto-execute: "true"
  related-skills: debugging, verification-before-completion, when-stuck
---

# Fix Skill — 统一修复流程编排器

## 概览

`fix` 是 `/fix` 命令的主编排器，串联 `debugging`、`verification-before-completion`、`when-stuck` 三个子技能，提供统一的数据传递机制和结构化输出。

## ⚠️ 铁律

```
1. 不跳过确认门 — Phase 2 必须等用户同意后再实施
2. 不伪造证据 — 验证证据必须来自实际命令执行结果
3. 不按同思路盲改 — attempt_count ≥ 2 立即触发 when-stuck
4. 不带错误继续 — 验证失败必须修复后再收尾
```

## fix-context 状态追踪

每次 /fix 执行维护一个上下文文件，记录全局状态：

**路径**：`${config.fix.context_file}`（默认为 `.claude/tmp/fix-context.yaml`）

**格式**：
```yaml
session_id: "{uuid}"
started_at: "{iso_timestamp}"
problem_description: "{用户描述的问题或报错}"
attempt_count: 0   # 当前尝试次数
current_phase: null
attempts:
  - attempt_id: 1
    hypothesis: "{假设根因}"
    fix_plan: "{修复方案}"
    verification:
      command: "{执行的验证命令}"
      exit_code: 0
      output_summary: "{输出摘要}"
      passed: true
    result: "{成功/失败描述}"
    failed_evidence: null   # 失败时填写
```

**初始化**：首次调用时创建文件，`attempt_count = 0`。

**读取优先级**：
1. 优先从 `fix-context.yaml` 读取前两次记录
2. 仅当文件不存在时才要求人工输入前两次假设

## 五阶段流程

### Phase 1：诊断（Diagnose）

**目标**：定位根因，生成 Fix Plan。

**操作**：
1. 调用 `debugging` skill，走完 Phase 1-3（Reproduce / Investigate / Root Cause）
2. 从 debugging 输出中提取 `root_cause` / `fix_plan` / `impact` / `evidence`

**输出要求**：debugging 输出必须包含以下四个字段：
- `root_cause`：一句话说清根因，带代码位置和证据
- `fix_plan`：最小修改方案（改哪些文件 + 具体改什么）
- `impact`：影响范围（哪些功能可能受影响，如何防止回归）
- `evidence`：证据链（为什么这个是最小修改的理由）

**fix-context 更新**：在 `attempts[]` 中追加一条记录，`attempt_id = 当前 attempt_count + 1`。

**执行伪代码**：
```
attempt_count += 1
debugging_result = call debugging_skill(error_info)
extract(diagnosis = debugging_result, fields: [root_cause, fix_plan, impact, evidence])
append to fix-context.attempts[attempt_count - 1]:
  hypothesis = diagnosis.root_cause
  fix_plan = diagnosis.fix_plan
  verification = { pending }
```

---

### Phase 2：确认门（Confirm Gate）

**目标**：输出根因 + 方案，等用户同意。

**操作**：停止执行，向用户输出结构化报告：

```
## 根因
{diagnosis.root_cause}

## 修复方案
{diagnosis.fix_plan}

## 影响范围
{diagnosis.impact}

请确认是否同意此方案？
```

**硬约束**：
- **禁止**在用户回复"确认"之前调用 `edit` / `multi_edit` / `write_to_file`
- 必须等待用户明确同意

**用户拒绝**：如果用户拒绝方案，重新进入 Phase 1（diagnose），使用新的假设。

---

### Phase 3：实施（Implement）

**目标**：在用户确认后执行修复。

**操作**：
1. 如果有现成测试，**先跑一次确认红**（证明测试能捕捉此 bug）
2. 如果没有测试但值得加，调用 `tdd` skill 先写一个红测试
3. 改代码，让测试变绿
4. 如果是紧急修复不便加测试，明确告知用户"本次未加回归测试，建议后补"

**fix-context 更新**：将 `attempts[attempt_count-1].verification` 标记为待验证。

---

### Phase 4：验证（Verify）

**目标**：调用验证技能，确认修复有效。

**操作**：调用 `verification-before-completion` skill。

**必须提供**：至少一条实际验证证据：
- 跑了什么命令、退出码、关键输出
- 或：请用户执行的验证命令（当本地无法执行时）

**硬约束**：
- **禁止**只贴修改后的代码就说"完成"
- **禁止**跳过 verification-before-completion 直接进入收尾

**验证失败处理**：如果验证失败，记录到 `fix-context`，然后：
- `attempt_count < 2`：回到 Phase 1，使用新假设重新尝试
- `attempt_count ≥ 2`：触发 Phase 5（升级）

**fix-context 更新**：`attempts[attempt_count-1].verification` 填入实际结果，`passed = true/false`。

---

### Phase 5：收尾（Close）

**目标**：输出结构化总结，关闭本次 fix 流程。

**操作**：输出简短总结：
- 修了什么（1 句话）
- 改了哪些文件（列表）
- 验证证据（命令 + 结果）
- 是否加了回归测试
- 是否需要用户自测的额外场景

**fix-context 更新**：将 `fix-context` 标记为 `closed: true`，写入完成时间戳。

---

### 升级条件

**触发条件**：`attempt_count ≥ 2` 且验证仍然失败。

**操作**：停止当前流程，调用 `when-stuck` skill。

**when-stuck 输入**：
- 优先传递 `fix-context.yaml` 文件路径（when-stuck 自行读取前两次记录）
- 如果文件不存在，手动传递前两次的 hypothesis / fix_plan / result / failed_evidence

**when-stuck 输出分流选项**：
| 方向 | 适用场景 |
|------|---------|
| 调用 debugging skill 重新分析 | 假设错了，需要重新走根因调查 |
| 调用 verification-before-completion | 需要先确认修复到底有没有生效 |
| 多角度并行 Agent | 问题复杂，需要同时排查多个方向 |
| 请用户提供更多信息 | 缺少关键上下文（日志/截图/复现步骤） |
| 回滚变更 | 修复引入了新问题，应退回上一版本 |
| 转 RPIV | 问题范围超出 `/fix` 能力，需走完整流程 |

**RPIV 交接包**：当 when-stuck 建议转 RPIV 时，将 `fix-context.yaml` 内容转换为交接包写入约定位置：
- 路径：`${config.fix.escalation_log}`
- 内容：包含前两次失败记录 + 最后一次 diagnosis + 问题概述

---

## 与 debugging skill 的职责边界

| Phase | 执行者 | 说明 |
|-------|--------|------|
| Reproduce / Investigate / Root Cause | `debugging` | Phase 1 调用 |
| Fix Plan 生成 | `debugging` | Phase 1 输出的一部分 |
| **实施修复（写代码）** | `fix` Phase 3 | **不在 debugging Phase 4 中执行** |
| 验证 | `verification-before-completion` | Phase 4 调用 |
| 升级决策 | `when-stuck` | 升级时调用 |

**debugging 的三次失败升级**：是 debugging 内部的假设级别重试（同一 hypothesis 的不同验证路径），**不触发 when-stuck**。
**fix 的升级触发**：是 attempt_count 级别的全局重试（换 hypothesis），`attempt_count ≥ 2` 触发 when-stuck。

## 输出格式

### Phase 1 结束输出
```markdown
## 🔍 诊断完成

### 根因
{root_cause}

### 修复方案
{fix_plan}

### 影响范围
{impact}

### 证据
{evidence}
```

### Phase 5 结束输出
```markdown
## ✅ 修复完成

### 总结
{一句话描述修了什么}

### 变更文件
- {file_1}
- {file_2}

### 验证证据
**命令**: `{验证命令}`
**退出码**: {退出码}
**结果**: {通过/失败}

### 回归测试
{已加/未加（如未加，说明原因）}

### 额外验证
{需要用户自测的场景（如有）}
```

## 硬约束

- 禁止跳过 Phase 2 确认门
- 禁止伪造验证证据
- 禁止 attempt_count ≥ 2 后继续同思路修改
- 禁止跳过 verification-before-completion
- 所有 fix-context 更新必须同步写入文件

## 与 RPIV 的关系

| 场景 | 走哪个 |
|------|--------|
| 小 bug / 单文件修复 / 用户能描述症状 | `/fix`（本命令）|
| 跨多文件 / 跨模块 / 需追溯交付物 | `/brainstorm`（RPIV）|

**禁止**用 `/fix` 做本该走 RPIV 的大需求。如果发现问题范围超出 `/fix` 能力，立即转为 RPIV 交接包并提示用户。
