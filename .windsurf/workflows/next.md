---
description: 执行下一个待办 Ticket - 自动选取并实现
---

# 执行下一个 Ticket

## 执行步骤

1. **查找下一个 Ticket**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 如果 `current_ticket` 不为 null，继续执行该 Ticket
   - 否则，在当前 Story 的 Tickets 中找到第一个 `status: pending` 的 Ticket
   - 如果找不到 pending Ticket → **停止**，输出："当前 Story 所有 Tickets 已完成。请执行 `/verify {story_id}` 验收或 `/approve {story_id}` 审批。" 不调用 deliver-ticket

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

5. **更新状态（必须经 transition() 统一入口）**
   - 更新 Ticket 状态为 `done`
   - 更新 `STATE.yaml` 的 `completed_tickets` 列表
   - 检查当前 Story 是否所有 Tickets 都已完成
     - 否 → `transition("/next", state, "implementing")`（W5），提示继续执行 `/next`
     - 是 → **自动执行 Story 验收**（Level 4，调用 verification skill 的 verify_story）
       - 验收通过：`transition("/next", state, "story_verified")`（W6），用户选择 `/cc-review` 或 `/approve`
       - 验收失败：`transition("/next", state, "verification_failed", meta={"result":"failure"})`（W7），暂停等用户修复后执行 `/verify`
   - ⚠️ 禁止直接写 `STATE.yaml` 的 `workflow.current_step`，必须经 `transition()` 推进（含事件写入+回滚保障）

## ⛔ 禁止行为（硬约束）

| # | 禁止行为 | 正确做法 | 根因 |
|---|---------|---------|------|
| F1 | 用 "code review" / "UI review" / "manual check" 作为 `verification_evidence.command` | 必须是可执行的 shell 命令（mvn/pnpm/npm/npx 等） | CC-Review S-001 发现此类证据无法复现验证 |
| F2 | 直接写 `STATE.yaml` 的 `workflow.current_step` | 必须经 `transition()` 推进 | 直接写会跳过事件审计，导致 workflow-events.jsonl 链路断裂 |
| F3 | 声明 Ticket done 时不运行验证命令 | 必须先执行验证命令且 exit_code=0，再写证据，最后更新状态 | 证据先于断言 |
| F4 | 在前端项目中使用 `pnpm lint`（无 lint 脚本时） | 检查 package.json scripts，使用实际存在的命令（如 `pnpm test && pnpm build`） | 不存在的脚本会导致验证卡死 |
