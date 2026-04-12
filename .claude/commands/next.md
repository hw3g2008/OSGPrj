# /next 命令

## 用法

```
/next                     # 执行下一个 runnable Ticket
/next T-xxx               # 执行指定 Ticket
```

## 说明

执行下一个待处理的 Ticket，根据 Ticket.type 选择流程（TDD / UI 还原 / 前端功能含 E2E / 配置）。

`/next` 的命令面保持不变，但内部选择逻辑已升级为 **scheduler + execution backend**：
- `workflow.current_step / next_step` 仍由 `workflow-engine.transition()` 管理
- `STATE.current_story / current_ticket` 仍保留为 **materialized focus**，用于兼容现有命令面
- runnable set、lease、workspace/worktree 绑定属于 `STATE.execution.*`
- 默认配置仍是串行：`parallel_execution.enabled = false`

## 执行流程

```
1. 读取 STATE.yaml 与 config.yaml
2. 解析目标 Ticket
   - 显式传入 `T-xxx` → 直接使用该 Ticket
   - 否则若 `current_ticket` 非空 → 继续当前焦点 Ticket
   - 否则由 scheduler 在当前 Story 内选择下一个 runnable Ticket
     - 依赖满足
     - 不与现有 active lease / allowed_paths.modify 冲突
     - 符合 `parallel_execution.max_tickets_per_story`
   - 如果没有 runnable Ticket
     - 当前 Story 无 remaining Ticket → 停止，输出："当前 Story 所有 Tickets 已完成。请执行 /verify {story_id} 或 /approve {story_id}"
     - 否则 → 停止，输出："当前没有可认领的 runnable Ticket，请等待依赖解除或 lease 释放"
3. 根据 Ticket.type 选择 Agent
   - backend → backend-java Agent
   - frontend → frontend-vue Agent
   - frontend-ui → frontend-admin Agent
   - database → dba-mysql Agent
   - test / config → developer Agent
4. 触发 deliver-ticket Skill
   - backend / database / test / config → 直接进入既有实现流
   - frontend / frontend-ui → 先读取 config.frontend_preflight
     - disabled → 保持既有实现流
     - enabled + auto → 先执行 frontend-delivery-preflight，再进入既有实现流
     - enabled + manual → 停止并提示先做 frontend preflight
5. 执行单 Ticket 交付
   - TDD: Red → Green → Refactor
   - 自我审查 + 分层验证 + evidence guard
6. 更新状态
   - Ticket 状态与 verification_evidence 由 deliver-ticket 更新
   - workflow 只能经 `transition()` 推进
   - execution lease / workspace 只能写入 `STATE.execution.*`
7. 如果 `config.approval.ticket_done == "auto"`
   - 自动回到步骤 2，继续选择下一个 runnable Ticket
   - 默认仍受 `parallel_execution.max_stories = 1` 约束
```

## Scheduler 选择逻辑

```python
def resolve_next_ticket(state, config, explicit_ticket_id=None):
    if explicit_ticket_id:
        return explicit_ticket_id

    if state.current_ticket:
        return state.current_ticket

    execution = state.get("execution") or default_execution_projection(config)
    selection = scheduler_select_ticket(
        state=state,
        execution=execution,
        max_stories=(config.get("parallel_execution") or {}).get("max_stories", 1),
        max_tickets_per_story=(config.get("parallel_execution") or {}).get("max_tickets_per_story", 1),
    )

    return selection.ticket_id if selection else None
```

## 自动继续

如果 `config.approval.ticket_done == "auto"`，完成一个 Ticket 后会自动执行下一个 runnable Ticket，直到：

- 当前 Story 进入 Story barrier（`story_verified` / `verification_failed` / `story_done`）
- 没有可继续认领的 runnable Ticket
- 遇到错误需要人工介入
- 上下文接近满

## 完成判断

```python
def check_completion(state, config):
    summary = get_story_runnable_summary(state.current_story, state)

    if summary["remaining_count"] == 0:
        return "story_barrier"

    next_ticket = resolve_next_ticket(state, config)
    if next_ticket:
        return "continue"

    return "waiting_runnable"
```

## 示例

```
# 执行下一个 runnable Ticket
/next

# 执行指定 Ticket
/next T-003
```

## 输出

```markdown
## 🔄 执行 Ticket

**Ticket**: T-003 - 实现登录逻辑
**Agent**: backend-java
**Backend**: inline
**允许路径**: ruoyi-admin/src/main/java/**/controller/LoginController.java

### 进度
[████████░░░░░░░░] 50%

### 当前步骤
TDD: GREEN - 编写代码让测试通过

---

（执行完成后）

## ✅ Ticket 完成

**耗时**: 5 分钟

### 变更
- LoginController.java (+25, -3)

### 测试
✅ 3 passed, 0 failed

### ⏭️ 自动继续下一个 runnable Ticket...
```

## 下一步

- 自动模式：继续执行下一个 runnable Ticket
- 手动模式：等待 `/approve T-xxx` 或 `/next`
