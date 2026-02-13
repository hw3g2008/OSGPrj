---
description: 审批当前待审批项（Stories 或 Tickets）
---

# 审批

## 使用方式

```
/approve
```

## 执行步骤

1. **读取状态**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 检查 `workflow.current_step` 判断当前待审批项

2. **根据阶段审批**

   ### Stories 审批
   - 条件：`current_step` 为 `stories_pending_approval`
   - 列出所有待审批 Stories 的摘要
   - 用户确认后，更新每个 Story 状态为 `approved`
   - 更新 `workflow.current_step` 为 `stories_approved`

   ### Tickets 审批
   - 条件：`current_step` 为 `tickets_pending_approval`
   - 列出所有待审批 Tickets 的摘要
   - 用户确认后，更新每个 Ticket 状态为 `pending`（可执行）
   - 更新 `workflow.current_step` 为 `implementing`
   - 设置 `current_story` 为当前 Story

3. **输出确认**
   - 显示审批结果
   - 提示下一步操作
