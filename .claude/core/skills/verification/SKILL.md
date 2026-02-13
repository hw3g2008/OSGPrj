# Verification Skill

---
name: verification
description: "Use when validating any output - ensures all claims are backed by evidence"
invoked_by: agent
auto_execute: true
---

## 概览

验证技能，确保所有声明都有证据支撑。

## ⚠️ 铁律

```
证据先于断言

任何"完成"声明必须有：
- 命令输出截图/日志
- 验证通过记录（测试结果 / lint+build 结果，取决于 Ticket type）
- 可复现的验证步骤
```

## 门控函数

```python
def can_claim_done(task):
    """在声明完成前必须通过此检查"""
    
    # 1. 必须有执行证据
    if not task.execution_log:
        return False, "缺少执行日志"
    
    # 2. 根据 type 选择验证策略
    if task.type in ("backend", "database"):
        # 后端/数据库：必须有测试结果且通过
        if not task.test_result:
            return False, "缺少测试结果"
        if task.test_result.status != "passed":
            return False, "测试未通过"
    
    elif task.type == "frontend-ui":
        # UI 还原：必须有 lint + build 结果
        if not task.lint_result or task.lint_result.status != "passed":
            return False, "Lint 检查未通过"
        if not task.build_result or task.build_result.status != "passed":
            return False, "构建检查未通过"
    
    elif task.type == "frontend":
        # 前端功能：lint + build（测试可选）
        if not task.lint_result or task.lint_result.status != "passed":
            return False, "Lint 检查未通过"
        if not task.build_result or task.build_result.status != "passed":
            return False, "构建检查未通过"

    elif task.type == "test":
        # 测试类：必须有测试结果且通过
        if not task.test_result:
            return False, "缺少测试结果"
        if task.test_result.status != "passed":
            return False, "测试未通过"

    elif task.type == "config":
        # 配置类：必须有执行证据（通用检查已在上方完成），无额外专属验证
        pass
    
    # 3. 所有验收标准必须满足（通用）
    for criteria in task.acceptance_criteria:
        if not criteria.verified:
            return False, f"验收标准未满足: {criteria}"
    
    return True, "可以声明完成"
```

## 校验维度矩阵

| 维度 | 检查项 | 检查方法 |
|------|--------|----------|
| **结构层** | 编号连续 | 逐个计数，N 开始到 N+k |
| | 导航完整 | 所有链接可点击 |
| | 目录匹配 | 目录结构与文件对应 |
| **格式层** | ID 格式 | 正则：`[A-Z]+-\d{3}` |
| | 时间格式 | ISO 8601 UTC |
| | 路径格式 | 相对路径，存在性检查 |
| | 代码块 | 开闭标签匹配 |
| **语义层** | 技术版本 | 与 config.yaml 一致 |
| | 配置值 | 与实际配置一致 |
| | 业务术语 | 使用项目定义的术语 |
| **逻辑层** | 流程完整 | 有明确的开始和结束 |
| | 依赖正确 | 依赖项存在且正确 |
| | 边界处理 | 错误/异常场景覆盖 |

## 常见失败对照表

| 陈述 | 实际证据 | 正确做法 |
|------|----------|----------|
| "构建成功" | 构建命令: exit 0 | Linter 通过不代表构建成功 |
| "Bug 修好了" | 测试原症状: 通过 | 代码改了不代表修好了 |
| "测试通过" | 测试框架输出 | 运行实际测试命令 |
| "文件已更新" | 文件时间戳 | 检查实际内容 |

## 反合理化表格

| 借口 | 现实检查 |
|------|----------|
| "应该工作了" | 运行验证命令 |
| "我确定没问题" | 信心 ≠ 证据 |
| "之前测过了" | 再测一次 |
| "变更太小" | 小变更也可能引入 bug |

## 红旗 - 立即停止

- ❌ 没有运行任何验证命令就说"完成"
- ❌ 测试失败但声称"应该是环境问题"
- ❌ 跳过验证因为"太简单了"
- ❌ 使用"根据我的理解"而非实际证据

---

## 🚨 Story 验收前置检查（不可跳过）

**在执行 `/verify S-xxx` 时，必须先检查所有 Tickets 的验证证据：**

```python
def pre_verify_check(story_id):
    story = read_yaml(f"osg-spec-docs/tasks/stories/{story_id}.yaml")
    missing_evidence = []

    for ticket_id in story.tickets:
        ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")

        # 检查 1: verification_evidence 字段必须存在
        if "verification_evidence" not in ticket:
            missing_evidence.append(f"{ticket_id}: 缺少 verification_evidence 字段")
            continue

        # 检查 2: exit_code 必须为 0
        if ticket.verification_evidence.get("exit_code") != 0:
            missing_evidence.append(f"{ticket_id}: 验证失败 (exit_code={ticket.verification_evidence.exit_code})")

    if missing_evidence:
        print("❌ 无法验收，以下 Tickets 缺少验证证据：")
        for msg in missing_evidence:
            print(f"  - {msg}")
        print("\n请先为这些 Tickets 补充验证证据（执行验证命令并记录结果）")
        return False

    return True
```

**如果前置检查失败：**
1. 停止验收流程
2. 输出缺少证据的 Tickets 列表
3. 提示用户补充证据（重新执行验证命令）
4. 不更新 workflow 状态

## 执行伪代码

```python
def verify(task):
    issues = []

    # 0. 前置检查：验证证据必须存在
    if task.type == "story":
        # Story 验收：检查所有 Tickets 的证据
        for ticket_id in task.tickets:
            ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
            if not ticket.get("verification_evidence"):
                issues.append(("evidence", ticket_id, "缺少 verification_evidence 字段"))
            elif ticket.verification_evidence.get("exit_code") != 0:
                issues.append(("evidence", ticket_id, f"验证命令失败: exit_code={ticket.verification_evidence.exit_code}"))

        if issues:
            return {"passed": False, "issues": issues, "reason": "Tickets 缺少验证证据，无法验收"}

    # 结构层校验
    for check in STRUCTURE_CHECKS:
        result = check.execute(task)
        if not result.passed:
            issues.append(("structure", check.name, result.issue))

    # 格式层校验
    for check in FORMAT_CHECKS:
        result = check.execute(task)
        if not result.passed:
            issues.append(("format", check.name, result.issue))

    # 语义层校验
    for check in SEMANTIC_CHECKS:
        result = check.execute(task)
        if not result.passed:
            issues.append(("semantic", check.name, result.issue))

    # 逻辑层校验
    for check in LOGIC_CHECKS:
        result = check.execute(task)
        if not result.passed:
            issues.append(("logic", check.name, result.issue))

    if issues:
        return {"passed": False, "issues": issues}

    # 验收通过 — 更新 workflow 触发审批
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.workflow.current_step = "story_done"
    state.workflow.next_step = "approve_story"
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)

    return {"passed": True}
```

## 输出格式

```markdown
## 🔍 验证结果

### 校验维度
| 维度 | 结果 | 详情 |
|------|------|------|
| 结构层 | ✅ | 3/3 通过 |
| 格式层 | ✅ | 4/4 通过 |
| 语义层 | ✅ | 3/3 通过 |
| 逻辑层 | ✅ | 4/4 通过 |

### 证据
{根据 Ticket type 不同，展示对应的验证证据}

#### 后端/数据库 Ticket:
- 测试命令: `{config.commands.test}`
- 退出码: 0
- 测试数量: 15 passed, 0 failed

#### 前端/UI 还原 Ticket:
- Lint 命令: `{config.commands.frontend.lint}` → 退出码: 0
- Build 命令: `{config.commands.frontend.build}` → 退出码: 0

### 结论
✅ 验证通过，可以声明完成
```

## 硬约束

- 禁止跳过任何校验维度
- 禁止没有证据就声明完成
- 禁止用假设替代验证
- 必须记录验证过程
