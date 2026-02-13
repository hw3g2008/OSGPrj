---
description: 回滚当前 Ticket 或 Story 的变更
---

# 回滚变更

## 使用方式

```
/rollback [ticket|story]
```

## 执行步骤

1. **读取状态**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 确认当前 `current_ticket` 或 `current_story`

2. **确认回滚范围**

   ### Ticket 回滚（默认）
   - 回滚当前 Ticket 的代码变更
   - 将 Ticket 状态重置为 `pending`
   - 清除 `current_ticket`

   ### Story 回滚
   - 回滚当前 Story 的所有 Tickets 变更
   - 将所有 Tickets 状态重置为 `pending`
   - 将 Story 状态重置为 `approved`
   - 清除 `current_story` 和 `current_ticket`

3. **执行回滚**
   - 使用 `git revert` 或 `git checkout` 回滚代码
   - 更新 STATE.yaml
   - 更新 Ticket/Story YAML 文件

4. **输出确认**
   - 显示回滚了什么
   - 提示下一步操作
