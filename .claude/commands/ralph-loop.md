# /ralph-loop 命令

## 用法

```
/ralph-loop "完成 S-001 所有 Ticket"
/ralph-loop "完成 S-001" --max-iterations 50
/ralph-loop "完成 S-001" --verify "mvn test"
```

## 说明

自主循环执行，直到完成承诺达成或达到限制。

## 参数

- `--completion-promise`: 完成标志
- `--max-iterations`: 最大迭代次数（默认 20）
- `--verify`: 验证命令

## 执行流程

```
1. 触发 Coordinator + Developer
2. 加载 ralph-loop Skill
3. 循环执行：
   - 获取下一个 pending Ticket
   - 执行 Ticket
   - 检查完成承诺
   - 检查安全限制
4. 输出执行报告
```

## 安全机制

- 最大迭代限制（默认 20）
- 连续失败 3 次停止
- 相同错误检测
- 上下文满时自动 checkpoint

## 输出示例

```markdown
## 🔄 Ralph Loop 执行报告

### 统计
- 总迭代: 15
- 完成 Tickets: 7
- 失败 Tickets: 0

### 完成的 Tickets
| ID | 名称 | 耗时 |
|----|------|------|
| T-001 | 创建 LoginController | 2m |
| T-002 | 实现登录逻辑 | 5m |
| ... | ... | ... |

### 停止原因
✅ 完成承诺达成：S-001 所有 Tickets 完成

### ⏭️ 下一步
执行 `/verify S-001` 验收 Story
```
