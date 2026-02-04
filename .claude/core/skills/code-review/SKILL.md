# Code-Review Skill

---
name: code-review
description: "Use when reviewing code changes - systematic review following checklist"
invoked_by: agent
auto_execute: true
---

## 概览

代码审查技能，遵循检查清单进行系统化审查。

## 何时使用

- Ticket 完成后自动触发
- Story 完成前验收
- `/review` 命令

## 审查维度

### 1. 正确性

| 检查项 | 说明 |
|--------|------|
| 逻辑正确 | 代码是否实现了预期功能？ |
| 边界处理 | 是否处理了边界情况？ |
| 错误处理 | 是否有适当的错误处理？ |
| 空值检查 | 是否检查了可能的空值？ |

### 2. 安全性

| 检查项 | 说明 |
|--------|------|
| 输入验证 | 是否验证了用户输入？ |
| SQL 注入 | 是否使用参数化查询？ |
| XSS 防护 | 是否转义了输出？ |
| 权限检查 | 是否验证了用户权限？ |

### 3. 性能

| 检查项 | 说明 |
|--------|------|
| N+1 查询 | 是否避免了 N+1 查询？ |
| 缓存使用 | 是否合理使用缓存？ |
| 大数据处理 | 是否考虑了大数据量？ |

### 4. 可维护性

| 检查项 | 说明 |
|--------|------|
| 命名清晰 | 变量/函数命名是否清晰？ |
| 注释充分 | 复杂逻辑是否有注释？ |
| 代码重复 | 是否有可提取的重复代码？ |
| 单一职责 | 函数是否只做一件事？ |

### 5. 测试覆盖

| 检查项 | 说明 |
|--------|------|
| 单元测试 | 是否有单元测试？ |
| 边界测试 | 是否测试了边界情况？ |
| 错误路径 | 是否测试了错误路径？ |

## 执行伪代码

```python
def code_review(changes):
    issues = []
    
    for file in changes.files:
        # 正确性检查
        correctness = check_correctness(file)
        if correctness.issues:
            issues.extend(correctness.issues)
        
        # 安全性检查
        security = check_security(file)
        if security.issues:
            issues.extend(security.issues)
        
        # 性能检查
        performance = check_performance(file)
        if performance.issues:
            issues.extend(performance.issues)
        
        # 可维护性检查
        maintainability = check_maintainability(file)
        if maintainability.issues:
            issues.extend(maintainability.issues)
        
        # 测试检查
        testing = check_testing(file)
        if testing.issues:
            issues.extend(testing.issues)
    
    # 分类问题
    critical = [i for i in issues if i.severity == "critical"]
    warnings = [i for i in issues if i.severity == "warning"]
    suggestions = [i for i in issues if i.severity == "suggestion"]
    
    return {
        "passed": len(critical) == 0,
        "critical": critical,
        "warnings": warnings,
        "suggestions": suggestions
    }
```

## 输出格式

```markdown
## 📝 代码审查报告

### 变更概览
- 文件数: {file_count}
- 新增行: +{added}
- 删除行: -{removed}

### 审查结果

#### ❌ 严重问题 (必须修复)
| 文件 | 行号 | 问题 |
|------|------|------|
| LoginController.java | 45 | SQL 注入风险 |

#### ⚠️ 警告 (建议修复)
| 文件 | 行号 | 问题 |
|------|------|------|
| Login.vue | 23 | 缺少空值检查 |

#### 💡 建议 (可选)
- 考虑提取重复的验证逻辑

### 结论
{passed ? "✅ 审查通过" : "❌ 需要修复严重问题"}
```

## 硬约束

- 严重问题必须阻止合并
- 安全问题必须标记为严重
- 必须检查所有维度
- 必须给出具体行号
