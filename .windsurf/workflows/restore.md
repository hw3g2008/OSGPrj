---
description: 恢复到之前保存的检查点
---

# 恢复检查点

## 使用方式

```
/restore [检查点ID]
```

## 执行步骤

1. **读取状态**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 获取 `last_checkpoint` 信息

2. **确认恢复**
   - 显示检查点信息（时间、描述、状态）
   - 等待用户确认

3. **执行恢复**
   - 如果有 git 检查点，执行 `git checkout` 恢复
   - 恢复 STATE.yaml 到检查点状态
   - 恢复 Stories/Tickets 状态

4. **输出确认**
   - 显示恢复后的状态
   - 提示使用 `/status` 确认
