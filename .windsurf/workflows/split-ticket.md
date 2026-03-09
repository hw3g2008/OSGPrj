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
   - 每个 Ticket 若承接契约项，必须显式写出 `contract_refs.capabilities` / `contract_refs.critical_surfaces`
   - 每个 Ticket 必须显式写出 `covers_ac_refs`

4. **输出摘要**
   - 列出所有 Tickets 的编号、标题、类型、估时
   - 等待用户审批

5. **TC 资产更新（D6 挂点）**
   - 为当前 Story 生成/更新三层测试资产：
     - ticket 级：`ticket_id + ac_ref`
     - story 级：`story_id + ac_ref`
     - final 级：`story_id + ac_ref`
   - 每个 Ticket 必须同步生成 `test_cases` skeleton；至少包含：
     - `test_case_id`
     - `ac_ref`
     - `case_kind`
     - `surface_id`（overlay / critical surface 场景时必填）
     - `state_variant`
     - `viewport_variant`
   - 若 Ticket 承接 overlay / critical surface：
     - 至少生成 1 条 `case_kind=critical_surface` 的 ticket test skeleton
     - 若 surface 声明 `state_variants`，ticket `test_cases` 必须覆盖全部 `state_variant`
     - 若 surface 声明 `viewport_variants`，ticket `test_cases` 必须覆盖全部 `viewport_variant`
   - 同步更新 `{module}-traceability-matrix.md`
   - 初始写入 `latest_result.status: pending`
   - 若 `covers_ac_refs` 缺失、TC 未绑定 `ticket_id`、matrix 未同步、或 overlay ticket 缺少 `test_cases` / state / viewport skeleton，直接 FAIL

6. **更新状态**
   - 由 ticket-splitter 内部调用 `transition()` 推进到 `ticket_split_done`
   - 等待用户审批（`/approve`）
   - 输出门禁（硬门禁）：
     - `python3 .claude/skills/workflow-engine/tests/story_ticket_coverage_guard.py --story-id {story_id}`
     - `python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module {module} --story-id {story_id}`
   - 上述 guard 现在同时校验：
     - Story 的 `contract_refs` 是否全部拆到 Tickets
     - `external` capability 是否同时具备实现 Ticket 和验证 Ticket
     - `critical_surface` 是否具备 `frontend-ui` Ticket
     - overlay / critical surface 是否具备 story-level `critical_surface` skeleton
     - overlay `frontend-ui` Ticket 是否具备 `test_cases` skeleton
     - overlay surface 的 `state_variant` / `viewport_variant` 是否已拆到 ticket-level skeleton
     - Story/Ticket/TestCase/Traceability 是否同步完整
