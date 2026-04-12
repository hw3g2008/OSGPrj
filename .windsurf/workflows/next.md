---
description: 执行下一个待办 Ticket - 自动选取并实现
---

# 执行下一个 Ticket

## 执行步骤

1. **查找下一个 Ticket**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`
   - 如果显式传入 `T-xxx`，直接以该 Ticket 为目标
   - 否则，如果 `current_ticket` 不为 null，继续执行该 Ticket
   - 否则，由 scheduler 在当前 Story 中选择一个 **runnable Ticket**：
     - `status: pending`
     - 依赖已满足
     - 不与 `STATE.execution.ticket_leases` / `allowed_paths.modify` 冲突
     - 不超过 `parallel_execution.max_tickets_per_story`
   - 如果找不到 runnable Ticket：
     - 若当前 Story 已无 remaining Ticket → **停止**，输出："当前 Story 所有 Tickets 已完成。请执行 `/verify {story_id}` 验收或 `/approve {story_id}` 审批。" 不调用 deliver-ticket
     - 若仍有 remaining Ticket 但都不可执行 → **停止**，输出："当前没有可认领的 runnable Ticket，请等待依赖解除、lease 释放或冲突消失。" 不调用 deliver-ticket

2. **读取 Ticket 定义**
   - 读取 `osg-spec-docs/tasks/tickets/T-xxx.yaml`
   - 确认 Ticket 的 type、allowed_paths、acceptance_criteria

3. **Executable-ticket preflight（进入开发前硬门槛）**
   - 校验 `covers_ac_refs` 非空
   - 校验 `contract_refs` 字段存在
   - 校验 `test_cases` 非空
   - 校验每条 `test_case` 均具备：`ac_ref`、`category`、`scenario_obligation`、`operation`
   - 校验 `covers_ac_refs` 中每一项至少被 1 条 `test_case` 承接
   - 任一校验失败 → **停止**，输出："当前 Ticket 缺少可执行测试契约，先回到 `/split ticket` / reconcile 补齐，再执行 `/next`。" 不调用 deliver-ticket

4. **执行实现**
   - 调用 deliver-ticket skill
   - 该 skill 会根据 Ticket type 选择对应流程：
     - `backend` / `database` / `test` → TDD 流程（先写测试再写代码）
     - `frontend-ui` → UI 还原流程（按 config 可选 frontend preflight）
     - `frontend` → 前端功能流程（含 E2E 验证: bash bin/e2e-api-gate.sh {module} full；按 config 可选 frontend preflight）
     - `config` → 配置变更流程
   - 若命中 `config.frontend_preflight`：
     - `mode=auto` → 先执行 `frontend-delivery-preflight`
     - `mode=manual` → 停止并提示先执行 frontend preflight

5. **分层验证**
   - deliver-ticket skill 自动执行：
     - **自我审查 + 增强全局终审**（三维度终审 + A~I 多维度旋转校验，重试循环最多 10 次，参见 quality-gate/SKILL.md）
     - **Level 1 单元验证**：当前 Ticket 的验证命令
     - **Level 2 回归验证**：全量测试，确保不破坏已完成功能
     - **真实性守卫**：`python3 .claude/skills/workflow-engine/tests/delivery_truth_guard.py --module {current_requirement} --stage next`
     - **关键 UI 证据守卫**：`python3 .claude/skills/workflow-engine/tests/ui_critical_evidence_guard.py --contract osg-spec-docs/docs/01-product/prd/{current_requirement}/UI-VISUAL-CONTRACT.yaml --page-report osg-spec-docs/tasks/audit/ui-visual-page-report-{current_requirement}-{today}.json --stage next`
   - 确认 verification_evidence 存在且 exit_code = 0
   - 若 `delivery_truth_guard` 失败（降级实现 / 缺失 provider 声明 / 缺失 evidence runtime 声明），禁止将 Ticket 标记为 `done`
   - 若 `ui_critical_evidence_guard` 失败（关键 surface 被 mask / 关键 UI 证据包缺失），禁止将 Ticket 标记为 `done`

6. **TC 资产更新（D6 挂点）**
   - 完成对应 TC 的 `automation.script` 与 `automation.command`
   - 执行结果回填 `latest_result`（`status` + `evidence_ref`）
   - 若仅写"code review/manual check"，直接 FAIL

7. **更新状态（必须经 transition() 统一入口）**
   - 更新 Ticket 状态为 `done`
   - 更新 `STATE.yaml` 的 `completed_tickets` 列表
   - execution plane 只允许更新到 `STATE.execution.*`
     - `active_tickets`
     - `ticket_leases`
     - `workspaces`
     - `scheduler`
   - 检查当前 Story 是否所有 Tickets 都已完成
     - 否 → `transition("/next", state, "implementing")`（W5），**自动回到步骤 1 继续执行下一个 runnable Ticket**（无需手动触发）
     - 是 → **自动执行 Story 验收**（Level 4，调用 verification skill 的 verify_story）
       - 验收通过：`transition("/next", state, "story_verified")`（W6），用户选择 `/cc-review` 或 `/approve`
       - 验收失败：`transition("/next", state, "verification_failed", meta={"result":"failure"})`（W7），暂停等用户修复后执行 `/verify`
   - ⚠️ 禁止直接写 `STATE.yaml` 的 `workflow.current_step`，必须经 `transition()` 推进（含事件写入+回滚保障）

8. **自动循环安全保护**
   - 单次 `/next` 调用最多执行 **20 个 Tickets**（`config.limits.max_iterations`）
   - 连续失败 **3 次** → 停止，等待人工介入
   - 检测到**相同错误**连续出现 2 次 → 停止，避免无限循环
   - 每完成 10 个 Ticket 自动保存一次 checkpoint

## ⛔ 禁止行为（硬约束）

| # | 禁止行为 | 正确做法 | 根因 |
|---|---------|---------|------|
| F1 | 用 "code review" / "UI review" / "manual check" 作为 `verification_evidence.command` | 必须是可执行的 shell 命令（mvn/pnpm/npm/npx 等） | CC-Review S-001 发现此类证据无法复现验证 |
| F2 | 直接写 `STATE.yaml` 的 `workflow.current_step` | 必须经 `transition()` 推进 | 直接写会跳过事件审计，导致 workflow-events.jsonl 链路断裂 |
| F3 | 声明 Ticket done 时不运行验证命令 | 必须先执行验证命令且 exit_code=0，再写证据，最后更新状态 | 证据先于断言 |
| F4 | 在前端项目中使用 `pnpm lint`（无 lint 脚本时） | 检查 package.json scripts，使用实际存在的命令（如 `pnpm test && pnpm build`） | 不存在的脚本会导致验证卡死 |
| F5 | 批量修改 Ticket status 为 done 时不写 verification_evidence | 每个 Ticket 必须单独走 deliver-ticket 流程，逐个写入 evidence 后再标记 done | CC-Review S-002 发现批量脚本遗漏 evidence 导致验收失败 |
| F6 | 把 scheduler / lease / workspace 直接写成新的 workflow state | 并行与执行运行态只能写到 `STATE.execution.*` 投影 | control plane 与 execution plane 混淆会破坏状态机单一 authority |
