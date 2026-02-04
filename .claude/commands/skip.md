# /skip 命令

## 用法

```
/skip T-xxx               # 跳过指定 Ticket
/skip T-xxx "依赖外部 API 未就绪"  # 带原因的跳过
```

## 说明

跳过 Ticket，标记为 blocked 状态。

## 执行流程

```
1. 更新 Ticket 状态为 blocked
2. 记录跳过原因
3. 检查依赖关系（级联阻塞）
4. 更新 STATE.yaml
5. 输出跳过报告
```

## 级联阻塞

如果其他 Ticket 依赖被跳过的 Ticket，它们也会被标记为 blocked。

## 输出示例

```markdown
## ⏭️ Ticket 已跳过

**Ticket**: T-003
**原因**: 依赖外部 API 未就绪
**状态**: blocked

### 级联影响
以下 Tickets 因依赖关系被阻塞：
- T-004 (依赖 T-003)
- T-005 (依赖 T-003)

### ⏭️ 下一步
- 执行 `/next` 跳过阻塞，执行其他 Ticket
- 执行 `/unblock T-003` 解除阻塞后继续
```

## 相关命令

- `/unblock T-xxx` - 解除阻塞
- `/retry T-xxx` - 重试 Ticket
