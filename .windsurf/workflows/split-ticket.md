---
description: 将 Story 拆分为微任务 Tickets（2-5 分钟粒度）- 对应 CC 命令 /split ticket S-xxx
---

# 拆分 Tickets

## 使用方式

```
/split ticket S-xxx
```

> 兼容说明：Windsurf 工作流别名 `/split-ticket S-xxx` 仍可触发本流程，但主命令统一为 `/split ticket S-xxx`，与 CC 命令一致。

## 前置条件

- Stories 已审批通过
- 指定的 Story 状态为 `approved` 或 `pending`

## 执行步骤

1. **读取 Story**
   - 读取 `osg-spec-docs/tasks/stories/S-xxx.yaml`
   - 理解 Story 的功能需求和验收标准

2. **拆分 Tickets**
   - 调用 ticket-splitter skill
   - 每个 Ticket 粒度为 2-5 分钟
   - 包含：标题、类型（backend/frontend/frontend-ui/test/config）、allowed_paths、验收标准
   - 该 skill 会自动进行多轮质量/覆盖率校验（Phase 2）+ 增强全局终审（Phase 3：三维度终审 + A~I 多维度旋转校验，参见 quality-gate/SKILL.md）

3. **创建 Ticket 文件**
   - 在 `osg-spec-docs/tasks/tickets/` 下创建 `T-xxx.yaml`
   - 更新 `STATE.yaml` 的 tickets 列表

4. **输出摘要**
   - 列出所有 Tickets 的编号、标题、类型、估时
   - 等待用户审批

5. **更新状态**
   - 由 ticket-splitter 内部调用 `transition()` 推进到 `ticket_split_done`
   - 等待用户审批（`/approve`）
