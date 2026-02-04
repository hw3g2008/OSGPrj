# /review 命令

## 用法

```
/review T-xxx             # 代码评审指定 Ticket
/review                   # 评审当前 Ticket
```

## 说明

触发代码评审，由 Reviewer Agent 执行。

## 执行流程

```
1. 触发 Reviewer Agent
2. 加载 code-review Skill
3. 获取 Ticket 变更文件
4. 执行多维度审查
5. 输出审查报告
```

## 审查维度

- 正确性
- 安全性
- 性能
- 可维护性
- 测试覆盖

## 输出示例

```markdown
## 📝 代码审查报告

**Ticket**: T-003

### 严重问题
无

### 警告
| 文件 | 行号 | 问题 |
|------|------|------|
| LoginService.java | 45 | 缺少空值检查 |

### 建议
- 考虑提取公共验证逻辑

### 结论
✅ 审查通过（有 1 个警告）
```
