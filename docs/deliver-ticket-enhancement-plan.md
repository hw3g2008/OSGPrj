# deliver-ticket 严谨性增强方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、最少概念、最短路径、改动自洽、简约不等于省略

## 目标

对齐 deliver-ticket/SKILL.md 与 brainstorming/story-splitter/ticket-splitter 的严谨性结构，补充缺失的失败退出规则、迭代计数示例、前置检查、流程图增强终审步骤。

## 前置条件

- story-splitter 已完成增强（commit `0835d6b4`）
- ticket-splitter 已完成增强（commit `1fdf6427`）
- deliver-ticket/SKILL.md 当前 704 行

## 现状分析

| 维度 | 其他 Skill（修复后） | deliver-ticket（现状） | 差距 |
|------|---------------------|----------------------|------|
| 失败退出规则 | ✅ 独立段落 | ❌ 无独立段落（4 条失败路径分散在伪代码中） | 缺失 |
| 迭代计数示例 | ✅ 完整 | ❌ 无 | 缺失 |
| 前置检查 | ✅ 入口函数 | ❌ 直接 `deliver_ticket(ticket_id)` | 缺失 |
| 流程图增强终审 | ✅ 有 Phase 3 | ⚠️ 流程 A 只有"自我审查清单"，无增强终审 | 简化 |

## 设计决策

| ID | 决策 | 方案 | 理由 |
|----|------|------|------|
| D-1 | 失败退出规则位置 | 在"硬约束"段落之前插入 | 与其他 Skill 结构一致 |
| D-2 | 迭代计数示例位置 | 在输出格式段落之后插入 | 与其他 Skill 结构一致 |
| D-3 | 前置检查方式 | 在 `deliver_ticket()` 开头加检查，不新建入口函数 | deliver-ticket 被 /next workflow 调用，workflow 已做选取，入口函数过度设计 |
| D-4 | 流程图修改范围 | 仅修改流程 A（TDD），其他流程类似处理 | 流程 A 是最完整的参考，其他流程的"自我审查清单"同理 |

## 执行清单

### D-1: 补充"失败退出规则"独立段落（🔴高）

**文件**: `.claude/skills/deliver-ticket/SKILL.md`
**位置**: 第 596 行（输出格式 ``` 结束后）和第 598 行（硬约束段落前）之间
**操作**: 插入

```markdown
## 失败退出规则

` ` `
⚠️ 增强终审失败：当增强全局终审经过 max_review_retries+1（默认 10）轮后仍有问题：
1. 输出失败报告（列出最后一轮的所有未通过项，包括三维度终审和多维度旋转校验）
2. 不更新 Ticket 状态 — 保持 in_progress
3. 不写入 verification_evidence
4. 停止自动继续 — 提示用户人工介入
5. 用户可以修复后重新执行 /next

⚠️ Level 1 验证失败：验证命令 exit_code != 0：
1. 输出错误信息（验证命令 + stderr）
2. 不更新 Ticket 状态 — 保持 in_progress
3. 不写入 verification_evidence
4. 停止 — 提示修复后重新执行 /next

⚠️ Level 2 回归失败：全量测试发现回归：
1. 输出回归报告（列出失败的测试用例）
2. 不更新 Ticket 状态 — 保持 in_progress
3. 不写入 verification_evidence — 禁止写入不完整的证据
4. 停止 — 当前 Ticket 引入了回归，需修复

⚠️ Level 4 Story 验收失败：所有 Tickets 完成但 Story 验收未通过：
1. 输出验收失败报告
2. 设置 current_step = verification_failed
3. 停止自动继续 — 暂停等用户修复后执行 /verify
` ` `
```

### D-2: 补充迭代计数示例（🟡中）

**文件**: `.claude/skills/deliver-ticket/SKILL.md`
**位置**: D-1 插入的失败退出规则之后、硬约束段落之前
**操作**: 插入

```markdown
## 迭代计数强制规则

每轮增强终审和验证步骤必须输出进度，格式如下：

` ` `
=== 增强全局终审 ===
🔍 终审轮次 1/10 (维度 E — 异常路径)
  三维度终审:
    上游一致性: ✅ Ticket AC 全满足
    下游可行性: ✅ 全量测试通过
    全局完整性: ❌ 修改了 allowed_paths 之外的文件
  多维度校验 (E): ✅ 无问题

🔍 终审轮次 2/10 (维度 H — 交叉影响)
  三维度终审: ✅ 3/3
  多维度校验 (H): ✅ 无问题

🔍 终审轮次 3/10 (维度 I — 命名一致性)
  三维度终审: ✅ 3/3
  多维度校验 (I): ✅ 无问题

🎉 连续 2 轮无修改，终审通过

=== Level 1 单元验证 ===
🔄 验证命令: mvn test -Dtest=SysLoginControllerTest
  exit_code: 0
  结果: Tests run: 5, Failures: 0

=== Level 2 回归验证 ===
🔄 全量测试: mvn test
  exit_code: 0
  结果: ✅ 全量测试通过

=== Level 3 增量 Story 验证 ===
  Story AC 进度: 3/8 = 37%
  当前 Ticket 覆盖 AC: 1 个
  偏差检测: ✅ 无偏差
` ` `
```

### D-3: 伪代码开头加前置检查（🟢低）

**文件**: `.claude/skills/deliver-ticket/SKILL.md`
**位置**: 第 266-271 行
**操作**: 替换

```python
def deliver_ticket(ticket_id):
    config = load_yaml(".claude/project/config.yaml")
    ticket_path = f"{config.paths.tasks.tickets}{ticket_id}.yaml"

    # Step 1: 读取 Ticket
    ticket = read_yaml(ticket_path)
```
→
```python
def deliver_ticket(ticket_id):
    config = load_yaml(".claude/project/config.yaml")
    ticket_path = f"{config.paths.tasks.tickets}{ticket_id}.yaml"

    # Step 0: 前置检查
    if not exists(ticket_path):
        return failed(f"Ticket 文件不存在: {ticket_path}")

    # Step 1: 读取 Ticket
    ticket = read_yaml(ticket_path)

    if ticket.status not in ["pending", "in_progress"]:
        return failed(f"Ticket {ticket_id} 状态为 {ticket.status}，需要 pending 或 in_progress")
```

### D-4: 流程 A 流程图补充增强终审（🟢低）

**文件**: `.claude/skills/deliver-ticket/SKILL.md`
**位置**: 第 124-136 行
**操作**: 替换

```
  ▼ 通过
[自我审查清单]
  │
  ├── 有问题 ──→ 修复
  │
  ▼ 全部通过
[记录验证证据] ─→ 写入 verification_evidence
  │
  ▼
[更新状态] ─→ ticket.status = completed
  │
  ▼
[输出结果]
```
→
```
  ▼ 通过
┌─ 增强全局终审（max 10 轮）──────────────────────────┐
│ [自我审查清单] ── 有问题？──→ 修复                    │
│  ✅                                                   │
│ [三维度终审 + 多维度旋转校验（A~I）]                   │
│  退出条件：连续两轮无修改                              │
│  达到上限 → 失败退出                                   │
└────────────────────────────────────────────────────────┘
  │ ✅ 连续两轮无修改
  ▼
[Level 1 单元验证] ─→ 验证命令 exit_code = 0
  │
  ├── 失败 ──→ 修复（最多重试 3 次）
  │
  ▼ 通过
[Level 2 回归验证] ─→ 全量测试
  │
  ├── 失败 ──→ 停止（回归检测）
  │
  ▼ 通过
[记录验证证据] ─→ 写入 verification_evidence
  │
  ▼
[更新状态] ─→ ticket.status = completed
  │
  ▼
[Level 3 增量 Story 验证]
  │
  ▼
[输出结果]
```

## 执行顺序

从文件末尾到开头，避免行号偏移：
1. D-1 + D-2（第 596-598 行之间插入）
2. D-3（第 266-271 行替换）
3. D-4（第 124-136 行替换）

## 自校验结果

### 第 1 轮（通用 G1-G9）

| ID | 校验项 | 结果 | 说明 |
|----|--------|------|------|
| G1 | 目标明确？ | ✅ | 4 项修改，每项有明确位置和内容 |
| G2 | 影响范围完整？ | ✅ | 仅 1 个文件，无下游影响 |
| G3 | 执行清单可操作？ | ✅ | 每项有文件、行号、操作类型、具体内容 |
| G4 | 设计决策有理由？ | ✅ | 4 个决策都有理由 |
| G5 | 前置条件满足？ | ✅ | story-splitter + ticket-splitter 已修复 |
| G6 | 违反设计原则？ | ✅ | 无 ask_user，自动检查 |
| G7 | 执行顺序正确？ | ✅ | 从末尾到开头 |
| G8 | 遗漏修改项？ | ✅ | 对比其他 Skill 的修复模式，4 项覆盖完整 |
| G9 | 自洽？ | ✅ | D-1 失败路径与伪代码 return 语句一致，D-4 流程图与伪代码步骤一致 |

### 第 2 轮（文件同步 F1 + 交叉引用 F3）

| ID | 校验项 | 结果 | 说明 |
|----|--------|------|------|
| F1 | workflow 文件需要更新？ | ✅ | next.md 步骤描述已包含分层验证，无需更新 |
| F3 | 硬约束节需要更新？ | ✅ | 已有完整的硬约束和红旗规则，无需新增 |

全部通过。
