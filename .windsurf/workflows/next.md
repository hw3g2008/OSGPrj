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

4. **分层验证**
   - deliver-ticket skill 自动执行：
     - **自我审查 + 增强全局终审**（三维度终审 + A~I 多维度旋转校验，重试循环最多 10 次，参见 quality-gate/SKILL.md）
     - **Level 1 单元验证**：当前 Ticket 的验证命令
     - **Level 2 回归验证**：全量测试，确保不破坏已完成功能
   - 确认 verification_evidence 存在且 exit_code = 0

5. **更新状态**
   - 更新 Ticket 状态为 `done`
   - 更新 `STATE.yaml` 的 `completed_tickets` 列表
   - 检查当前 Story 是否所有 Tickets 都已完成
     - 否 → 设置 `current_step = implementing`，提示继续执行 `/next`
     - 是 → **自动执行 Story 验收**（Level 4，调用 verification skill 的 verify_story）
       - 验收通过：设置 `current_step = story_verified`，用户选择 `/cc-review` 或 `/approve`
       - 验收失败：设置 `current_step = verification_failed`，暂停等用户修复后执行 `/verify`
