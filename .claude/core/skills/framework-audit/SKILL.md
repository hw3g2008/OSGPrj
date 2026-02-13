# Framework-Audit Skill

---
name: framework-audit
description: "Use after any framework modification - performs global consistency audit with 7 dimensions, loops until all pass"
invoked_by: auto
auto_execute: true
---

## 概览

框架全局一致性终审。在任何 `.claude/` 框架文件被修改后自动触发，执行 7 个维度的完整审计，循环迭代直到一次性全部通过。

## 何时使用

- 任何 `.claude/core/`、`.claude/project/`、`.claude/commands/` 下的文件被修改后
- `osg-spec-docs/tasks/STATE.yaml` 的结构（非数据）被修改后
- 手动执行 `/review framework`

## ⚠️ 执行模式

```
⚠️ 铁律：
1. 必须以「全新 session 视角」审计 — 不假设任何修改是正确的
2. 全局终审必须一次性全部通过 — 任何一个维度 ❌ 则整体不通过
3. 不通过则打回局部修复 → 修复后必须重新执行完整全局终审（不是只验上一轮改的）
4. 循环直到 7/7 维度一次性全部 ✅ 才结束
```

## 审计范围

```yaml
audit_files:
  core_config:
    - ".claude/CLAUDE.md"
    - ".claude/project/config.yaml"
    - "osg-spec-docs/tasks/STATE.yaml"
  templates:
    - ".claude/core/templates/state.yaml"
    - ".claude/core/templates/checkpoint.yaml"
    - ".claude/core/templates/ticket.yaml"
    - ".claude/core/templates/story.yaml"
    - ".claude/core/templates/log.yaml"
  skills:
    - ".claude/core/skills/*/SKILL.md"  # 所有 Skill 文件
  commands:
    - ".claude/commands/*.md"           # 所有命令文件
  agents:
    - ".claude/core/agents/*.md"        # 所有核心 Agent
    - ".claude/project/agents/*.md"     # 所有项目 Agent
```

## 7 个审计维度

### 维度 1：状态管理一致性

| 检查项 | 通过条件 | 检查方法 |
|--------|----------|----------|
| phase 字段清理 | `.claude/` 目录中 `state.phase` 出现 0 次（log.yaml execution_log.phase 除外） | grep 搜索 |
| workflow 写入统一 | 所有写入 STATE.yaml 的伪代码统一使用 `workflow.current_step` 和 `workflow.next_step` | 逐文件检查 |
| state 模板无 phase | state.yaml 模板不定义 phase 字段 | 读取模板 |
| checkpoint 结构一致 | checkpoint.yaml 的 state_snapshot.workflow 结构与 STATE.yaml 一致 | 字段对比 |
| STATE 文件无 phase | STATE.yaml 实际文件中无 phase 字段 | 读取文件 |

### 维度 2：工作流链路完整性

验证 10 个转换节点是否形成无断裂的状态机：

```
brainstorm_done → split_story → story_split_done → approve_stories →
stories_approved → split_ticket → ticket_split_done → approve_tickets →
ticket_approved → next → ticket_done/all_tickets_done → verify →
story_done → approve_story → story_approved → next_story → [循环或结束]
```

| 检查项 | 通过条件 | 检查方法 |
|--------|----------|----------|
| 每个节点有写入方 | 10 个节点各有明确的 Skill/Command 负责写入 | 逐节点追踪 |
| 写入值精确匹配 | 每个 Skill 写入的 current_step 和 next_step 与 CLAUDE.md 转换表精确匹配 | 字符串对比 |
| 无重复写入冲突 | 同一节点不被多个 Skill 无条件写入（兜底逻辑除外） | 逻辑分析 |

### 维度 3：CLAUDE.md 自洽性

| 检查项 | 通过条件 | 检查方法 |
|--------|----------|----------|
| 步骤 0 职责清晰 | 明确说明"Skill 自行更新，此处不重复写入" | 读取文本 |
| 步骤 5 不写 workflow | 步骤 5 只执行命令，不包含"更新 STATE.yaml: workflow" 语句 | 读取文本 |
| SessionStart 字段有效 | 输出模板中引用的所有字段在 STATE.yaml 中存在 | 字段交叉验证 |
| 边界情况表完整 | 至少 9 项 | 计数 |
| 角色表覆盖完整 | 覆盖 ticket.yaml 模板中的所有 type 枚举 | 枚举对比 |

### 维度 4：Type 系统一致性

在以下 5 个位置验证 type 枚举完全一致：

1. `core/templates/ticket.yaml` — type 注释枚举
2. `core/skills/ticket-splitter/SKILL.md` — 概览或流程中的枚举
3. `core/skills/deliver-ticket/SKILL.md` — 流程分支覆盖
4. `core/skills/verification/SKILL.md` — `can_claim_done()` 分支覆盖
5. `CLAUDE.md` — 角色表

### 维度 5：废弃概念清理

在 `.claude/` 目录中搜索以下模式，全部应为 0 结果：

| 模式 | 说明 |
|------|------|
| `state.phase` | 旧状态字段（log.yaml execution_log.phase 除外） |
| `estimate_context_usage` | Cursor 专属 API |
| `dispatch_openai` | OpenAI 专属调度 |
| `OPENAI_API_KEY` | OpenAI 专属环境变量 |
| `\|\| true` | lint 错误吞掉 |

### 维度 6：跨文件引用一致性

| 检查项 | 通过条件 | 检查方法 |
|--------|----------|----------|
| Skills 数量 | CLAUDE.md 声称的数量与实际 `core/skills/*/SKILL.md` 文件数一致 | glob 计数 |
| Agents 数量 | CLAUDE.md 声称的数量与实际 `core/agents/*.md` 文件数一致 | glob 计数 |
| approval 配置键 | config.yaml 的 4 个键与 CLAUDE.md 审批映射表一致 | 逐项对比 |
| checkpoint 恢复能力 | checkpoint.yaml 能完整恢复 STATE.yaml 的关键字段 | 字段覆盖检查 |

### 维度 7：代码块格式完整性

所有 Markdown 文件的代码块开闭标签匹配（即三个反引号标记数量为偶数）。

## 执行流程

```
[触发审计]
    │
    ▼
[读取所有审计范围文件]
    │
    ▼
[执行 7 个维度审计] ──→ 全部 ✅？──→ 输出通过报告，结束
    │                              │
    │ 有 ❌                        │
    ▼                              │
[输出失败报告]                     │
    │ - 列出所有 ❌ 的维度          │
    │ - 给出具体文件/行号/问题      │
    │                              │
    ▼                              │
[局部修复]                         │
    │                              │
    ▼                              │
[重新执行完整 7 维度审计] ─────────┘
    │ ⚠️ 不是只验上一轮改的！
    │ ⚠️ 必须从头完整跑一遍！
```

## 执行伪代码

```python
def framework_audit():
    max_iterations = 5
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        # 读取所有审计范围文件
        files = load_audit_files()

        # 执行 7 个维度审计
        results = {}
        results["state_mgmt"] = audit_state_management(files)
        results["workflow"] = audit_workflow_integrity(files)
        results["claude_md"] = audit_claude_md_consistency(files)
        results["type_system"] = audit_type_system(files)
        results["deprecated"] = audit_deprecated_cleanup(files)
        results["cross_ref"] = audit_cross_references(files)
        results["format"] = audit_code_block_format(files)

        # 统计通过率
        passed = [k for k, v in results.items() if v.passed]
        failed = [k for k, v in results.items() if not v.passed]

        if len(failed) == 0:
            # 7/7 全部通过 — 输出通过报告
            output_pass_report(iteration, results)
            return {"passed": True, "iterations": iteration}

        # 有失败项 — 输出失败报告，执行局部修复
        output_fail_report(iteration, results, failed)
        fix_issues(failed, results)

        # ⚠️ 循环回到顶部，重新执行完整 7 维度审计
        # ⚠️ 不是只验上一轮改的，是全部重新来
        continue

    # 达到最大迭代 — 强制停止，人工介入
    raise AuditFailure(
        f"经过 {max_iterations} 轮审计仍有 {len(failed)} 个维度未通过，"
        "请人工检查框架一致性"
    )
```

## 输出格式

### 通过报告

```markdown
## ✅ 框架全局一致性审计通过

### 审计轮次: {iteration}

| 维度 | 结果 |
|------|------|
| 1. 状态管理一致性 | ✅ |
| 2. 工作流链路完整性 | ✅ |
| 3. CLAUDE.md 自洽性 | ✅ |
| 4. Type 系统一致性 | ✅ |
| 5. 废弃概念清理 | ✅ |
| 6. 跨文件引用一致性 | ✅ |
| 7. 代码块格式完整性 | ✅ |

通过率: 7/7
可以安全开启新 session: ✅
```

### 失败报告

```markdown
## ❌ 框架全局一致性审计未通过（第 {iteration} 轮）

### 通过: {passed_count}/7
### 未通过: {failed_count}/7

| 维度 | 结果 | 问题 |
|------|------|------|
| 1. 状态管理一致性 | ✅ | - |
| 2. 工作流链路完整性 | ❌ | ralph-loop L99 缺失 workflow 写入 |
| ... | ... | ... |

### 需要修复的问题
{逐个列出文件、行号、期望值、实际值}

### ⚠️ 修复后将自动重新执行完整 7 维度审计
```

## 硬约束

- 禁止只验证上一轮修复的内容 — 每轮必须完整执行所有 7 个维度
- 禁止在任何维度 ❌ 时声明通过
- 禁止跳过任何审计文件
- 必须以「全新 session 视角」审计 — 不信任任何历史修复结论
- 最大迭代 5 次 — 超过则强制停止，人工介入
