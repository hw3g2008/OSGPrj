# /rollback 命令

## 用法

```
/rollback T-xxx           # 回滚单个 Ticket
/rollback S-xxx           # 回滚整个 Story
/rollback CP-xxx          # 回滚到指定检查点
/rollback --last          # 回滚到上一个检查点
```

## 说明

回滚变更到指定状态。

## 执行流程

```
1. 加载 checkpoint-manager Skill
2. 查找目标检查点
3. 恢复文件状态
4. 更新 STATE.yaml
5. 输出回滚报告
```

## 回滚类型

### Ticket 回滚
回滚单个 Ticket 的所有变更。

### Story 回滚
回滚整个 Story 及其所有 Tickets 的变更。

### Checkpoint 回滚
恢复到指定检查点的完整状态。

## 输出示例

```markdown
## ↩️ 回滚完成

**回滚目标**: T-003
**回滚类型**: Ticket

### 恢复的文件
- LoginController.java (恢复到 Ticket 开始前)
- LoginService.java (恢复到 Ticket 开始前)

### 状态更新
- T-003: completed → pending

### ⏭️ 下一步
执行 `/next` 重新执行 T-003
```

## 注意事项

- 回滚是破坏性操作，会丢失变更
- 建议先 `/checkpoint` 再回滚
