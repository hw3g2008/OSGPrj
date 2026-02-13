---
description: 执行下一个待办 Ticket - 自动选取并实现
---

# 执行下一个 Ticket

## 执行步骤

1. **查找下一个 Ticket**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 如果 `current_ticket` 不为 null，继续执行该 Ticket
   - 否则，在当前 Story 的 Tickets 中找到第一个 `status: pending` 的 Ticket

2. **读取 Ticket 定义**
   - 读取 `osg-spec-docs/tasks/tickets/T-xxx.yaml`
   - 确认 Ticket 的 type、allowed_paths、acceptance_criteria

3. **执行实现**
   - 调用 deliver-ticket skill
   - 该 skill 会根据 Ticket type 选择对应流程：
     - `backend` / `database` / `test` → TDD 流程（先写测试再写代码）
     - `frontend-ui` → UI 还原流程
     - `frontend` → 前端功能流程
     - `config` → 配置变更流程

4. **验证完成**
   - deliver-ticket skill 会自动执行自审清单
   - 确认 verification_evidence 存在且 exit_code = 0

5. **更新状态**
   - 更新 Ticket 状态为 `done`
   - 更新 `STATE.yaml` 的 `completed_tickets` 列表
   - 检查当前 Story 是否所有 Tickets 都已完成
     - 是 → 提示执行 `/verify` 验收
     - 否 → 提示继续执行 `/next`
