# /verify 命令

## 用法

```
/verify S-xxx             # 验收指定 Story
/verify T-xxx             # 验证指定 Ticket
```

## 说明

触发测试验收，由 QA Agent 执行。

## 执行流程

```
1. 触发 QA Agent
2. 加载 verification Skill
3. 检查所有 Tickets 完成状态
4. 验证验收标准
5. 运行测试
6. 输出验证报告
```

## 输出示例

```markdown
## 📋 验证报告

**Story**: S-001 - 用户登录

### Tickets 状态
| ID | 标题 | 状态 |
|----|------|------|
| T-001 | 创建 LoginController | ✅ |
| T-002 | 实现登录逻辑 | ✅ |
| T-003 | 创建登录页面 | ✅ |

### 验收标准
| 标准 | 状态 | 证据 |
|------|------|------|
| 可以使用手机号登录 | ✅ | 测试通过 |
| 登录后跳转首页 | ✅ | E2E 测试通过 |

### 测试结果
- 单元测试: 15 passed
- 集成测试: 5 passed

### 结论
✅ 验证通过

### ⏭️ 下一步
执行 `/approve S-001` 完成 Story
```
