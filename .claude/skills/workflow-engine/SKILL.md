---
name: workflow-engine
description: RPIV 工作流状态机引擎。管理状态转换、自动继续逻辑、审批门控。当需要判断下一步操作或更新工作流状态时使用。
metadata:
  invoked-by: "auto"
  auto-execute: "true"
  user-invocable: "false"
---

# Workflow Engine

## 概览

本 Skill 是一人公司框架的核心引擎，负责：
1. 读取当前工作流状态
2. 判断下一步操作
3. 决定是否需要审批
4. 自动执行下一个命令（如果配置为 auto）

## 术语说明

- **状态 (state)**：工作流当前所处的位置，如 `brainstorm_done`、`story_split_done`
- **动作 (action)**：下一步要执行的操作，如 `split_story`、`approve_stories`
- `current_step`：当前状态
- `next_step`：下一个动作

## 状态机定义

状态机定义见 [state-machine.yaml](state-machine.yaml)。

## 核心流程

### 1. 读取状态

```python
def get_workflow_state():
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    config = read_yaml(".claude/project/config.yaml")

    if not state.workflow:
        return {"current_step": None, "next_step": None}

    return {
        "current_step": state.workflow.current_step,
        "next_step": state.workflow.next_step,
        "current_story": state.current_story,
        "current_ticket": state.current_ticket
    }
```

### 2. 判断是否需要审批

```python
def requires_approval(next_step, config):
    """
    根据 next_step 和 config.approval 判断是否需要审批
    """
    # 从 state-machine.yaml 读取映射
    approval_config_keys = {
        "approve_brainstorm": "brainstorm_confirm",
        "approve_stories": "story_split",
        "approve_tickets": "ticket_split",
        "approve_story": "story_done",
        "next": "ticket_done"
    }

    # 不在映射表中的动作不需要审批
    if next_step not in approval_config_keys:
        return False

    config_key = approval_config_keys[next_step]
    approval_value = config.approval.get(config_key, "auto")

    return approval_value == "required"
```

### 3. 获取下一个命令

```python
def get_next_command(next_step, state):
    """
    根据 next_step（动作）返回要执行的命令
    """
    # 从 state-machine.yaml 读取映射
    action_to_command = {
        "brainstorm": "/brainstorm",
        "approve_brainstorm": "/approve brainstorm",
        "split_story": "/split story",
        "approve_stories": "/approve stories",
        "split_ticket": f"/split ticket {state.current_story}",
        "approve_tickets": "/approve tickets",
        "next": "/next",
        "verify": f"/verify {state.current_story}",
        "approve_story": f"/approve {state.current_story}",
        "next_story": None  # 特殊处理
    }

    if next_step == "next_story":
        return handle_next_story(state)

    return action_to_command.get(next_step)
```

### 4. 处理 next_story 分支

```python
def handle_next_story(state):
    """
    检查是否有下一个 pending Story。
    通过 transition() 推进状态（W9）。
    """
    pending_stories = get_pending_stories(state)

    if pending_stories:
        next_story = pending_stories[0]
        state.current_story = next_story
        # W9a: 通过 transition() 推进
        transition("next_story", state, "stories_approved")
        return f"/split ticket {next_story}"
    else:
        # W9b: 所有 Stories 完成
        transition("next_story", state, "all_stories_done")
        return None  # 工作流结束
```

### 5. 统一状态推进入口（transition）

> ⚠️ **唯一规则**：任何会推进 `workflow.current_step` 的动作都必须经过 `transition()`。
> 禁止出现第二套能独立推进 `current_step` 的写入逻辑。

#### 5a. transition()（唯一推进入口）

```python
def transition(command, state, state_to, meta=None):
    """
    唯一的状态推进入口。
    所有会改变 workflow.current_step 的操作必须调用此函数。
    
    流程：preflight_guard → 写状态 → 推导审批标记 → 写事件 → postcheck_guard
    失败时回滚 STATE.yaml 并终止。
    """
    sm = load_yaml(".claude/skills/workflow-engine/state-machine.yaml")
    config = load_yaml(".claude/project/config.yaml")

    state_from = state.workflow.current_step

    # --- 1. preflight_guard ---
    preflight_guard(command, state, sm, config)

    # --- 2. 写入状态 ---
    state_before = deep_copy(state)
    next_action = sm.states[state_to].next_action
    state.workflow.current_step = state_to
    state.workflow.next_step = next_action

    # --- 3. 推导 next_requires_approval（禁止手写）---
    state.workflow.next_requires_approval = requires_approval(next_action, config)

    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)

    # --- 4. 写事件（open("a") 模式自动创建文件）---
    event = build_event(
        command=command,
        state_from=state_from,
        state_to=state_to,
        gate_result=meta.get("gate_result") if meta else None,
        evidence_ref=meta.get("evidence_ref") if meta else None,
        result=meta.get("result", "success") if meta else "success",
    )
    if not append_workflow_event(event):
        write_yaml("osg-spec-docs/tasks/STATE.yaml", state_before)  # 回滚
        raise EventWriteError("事件写入失败，已回滚状态")

    # --- 5. postcheck_guard ---
    postcheck_guard(state, event, sm, config)
```

#### 5b. preflight_guard()

```python
def preflight_guard(command, state, sm, config):
    """
    状态推进前的硬性检查。任一项不通过则终止流程。
    """
    current_step = state.workflow.current_step

    # 1. 当前 current_step 是否允许执行该命令
    #    基于 state-machine 的 command_to_state / special_branches 校验
    allowed_commands = get_allowed_commands(current_step, sm)
    if command not in allowed_commands and command != "next_story":
        raise GuardError(f"当前状态 {current_step} 不允许执行 {command}")

    # 2. 上游产物是否存在
    if command == "/approve stories":
        # 必须有 story_split phase-proof
        module = state.current_requirement
        proof_path = f"osg-spec-docs/tasks/proofs/{module}/story_split_phase_proof.json"
        if not exists(proof_path):
            raise GuardError(f"缺少 phase-proof: {proof_path}，请先执行 /split story")
        # 校验 source_hash
        verify_source_hash(proof_path, f"osg-spec-docs/docs/02-requirements/srs/{module}.md")

    if command == "/approve tickets":
        story_id = state.current_story
        module = state.current_requirement
        proof_path = f"osg-spec-docs/tasks/proofs/{module}/{story_id}_ticket_split_phase_proof.json"
        if not exists(proof_path):
            raise GuardError(f"缺少 phase-proof: {proof_path}，请先执行 /split ticket {story_id}")
        verify_source_hash(proof_path, f"osg-spec-docs/tasks/stories/{story_id}.yaml")

    # 3. 审批门是否满足
    #    从 state-machine.yaml 的 states[current_step].approval_required + approval_key
    #    结合 config.approval 推导
    step_def = sm.states.get(current_step, {})
    if step_def.get("approval_required"):
        approval_key = step_def.get("approval_key")
        if config.approval.get(approval_key) == "required":
            # 需要人工审批 — preflight 不阻断，但 next_requires_approval 必须为 true
            pass  # 审批门在自动继续循环中检查
```

#### 5c. postcheck_guard()

```python
def postcheck_guard(state, event, sm, config):
    """
    状态推进后的一致性检查。任一项不通过则报警（不回滚，因为状态已写入）。
    """
    current_step = state.workflow.current_step
    next_step = state.workflow.next_step

    # 1. 三元组一致性
    expected_next = sm.states[current_step].next_action
    if next_step != expected_next:
        raise PostcheckError(f"next_step 不一致: 期望 {expected_next}，实际 {next_step}")

    # 2. next_requires_approval 一致性
    expected_approval = requires_approval(next_step, config)
    if state.workflow.next_requires_approval != expected_approval:
        raise PostcheckError(
            f"next_requires_approval 不一致: 期望 {expected_approval}，实际 {state.workflow.next_requires_approval}"
        )

    # 3. 最新事件与本次迁移一致
    if event["state_from"] != event.get("_expected_from") if "_expected_from" in event else True:
        pass  # event 是我们刚构建的，天然一致
    if event["state_to"] != current_step:
        raise PostcheckError(f"事件 state_to ({event['state_to']}) 与 current_step ({current_step}) 不一致")

    # 4. 产物计数一致（STATE.stories 与 stories/ 文件数）
    stories_in_state = len(state.stories or [])
    stories_on_disk = len(glob("osg-spec-docs/tasks/stories/S-*.yaml"))
    if stories_in_state != stories_on_disk:
        raise PostcheckError(f"Stories 计数不一致: STATE={stories_in_state}, disk={stories_on_disk}")

    tickets_in_state = len(state.tickets or [])
    tickets_on_disk = len(glob("osg-spec-docs/tasks/tickets/T-*.yaml"))
    if tickets_in_state != tickets_on_disk:
        raise PostcheckError(f"Tickets 计数不一致: STATE={tickets_in_state}, disk={tickets_on_disk}")
```

#### 5d. update_workflow()（兼容包装层）

```python
def update_workflow(command_completed, state):
    """
    兼容包装层 — 内部调用 transition()。
    保留此函数是为了兼容现有 Skill 的调用方式。
    新增的 Windsurf workflow 应直接调用 transition()。
    """
    sm = load_yaml(".claude/skills/workflow-engine/state-machine.yaml")

    # ⚠️ 以下命令自己管理状态，直接调用 transition()
    if command_completed in ("/brainstorm", "/next", "/verify", "/approve brainstorm"):
        return  # 状态已由对应 Skill/Workflow 通过 transition() 写入

    # 根据完成的命令查找目标状态
    state_to = sm.command_to_state[command_completed]

    # 特殊处理：判断是否是最后一个 Story
    if command_completed.startswith("/approve S-"):
        if no_pending_stories(state):
            state_to = "all_stories_done"

    # 委托给 transition()
    transition(command_completed, state, state_to)
```

### 6. 事件审计接口

> Story 主链路所有状态写入点都必须写事件。写入顺序：先 `write_yaml(STATE.yaml)` → 再 `append_workflow_event()`。事件写入失败时回滚 STATE.yaml 并终止流程。

```python
def append_workflow_event(event):
    """
    追加一条工作流事件到 workflow-events.jsonl
    返回 True 成功 / False 失败
    """
    import json, uuid
    from datetime import datetime, timezone

    event_path = "osg-spec-docs/tasks/workflow-events.jsonl"
    try:
        with open(event_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
        return True
    except Exception as e:
        print(f"⚠️ 事件写入失败: {e}")
        return False

def build_event(command, state_from, state_to, actor="system", gate_result=None, evidence_ref=None, result="success"):
    """
    构建事件对象
    """
    import uuid
    from datetime import datetime, timezone

    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "module": get_current_module(),  # 从 STATE.yaml.current_requirement 读取
        "schema_version": "1.0",
        "actor": actor,
        "command": command,
        "state_from": state_from,
        "state_to": state_to,
        "gate_result": gate_result,
        "evidence_ref": evidence_ref,
        "result": result,
    }
```

#### Story 主链路状态写入点清单（11 个）

> 全部通过 `transition()` 推进，事件写入由 `transition()` 内部统一处理。

| # | 触发命令 | 调用方式 | state_to |
|---|----------|----------|----------|
| W1 | `/split story` | `transition("/split story", state, "story_split_done")` | `story_split_done` |
| W2 | `/split ticket` | `transition("/split ticket", state, "ticket_split_done")` | `ticket_split_done` |
| W3 | `/approve stories` | `transition("/approve stories", state, "stories_approved")` | `stories_approved` |
| W4 | `/approve tickets` | `transition("/approve tickets", state, "tickets_approved")` | `tickets_approved` |
| W5 | `/next`（中间 Ticket） | `transition("/next", state, "implementing")` | `implementing` |
| W6 | `/next`（最后 Ticket，验收通过） | `transition("/next", state, "story_verified")` | `story_verified` |
| W7 | `/next`（最后 Ticket，验收失败） | `transition("/next", state, "verification_failed", meta={"result":"failure"})` | `verification_failed` |
| W8 | `/verify` | `transition("/verify", state, "story_verified" or "verification_failed")` | `story_verified` / `verification_failed` |
| W9 | `/cc-review` | `transition("/cc-review", state, "story_done" or "verification_failed")` | `story_done` / `verification_failed` |
| W10 | `/approve` (Story) | `transition("/approve story", state, "story_approved" or "all_stories_done")` | `story_approved` / `all_stories_done` |
| W11 | `next_story` 分支 | `transition("next_story", state, "stories_approved" or "all_stories_done")` | `stories_approved` / `all_stories_done` |

## 自动继续循环

当一个命令完成后，框架会自动执行以下循环：

```
┌─────────────────────────────────────────────────────────────┐
│                    自动继续循环                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                           │
│  │ 读取 STATE   │                                           │
│  └──────┬───────┘                                           │
│         ▼                                                   │
│  ┌──────────────┐     是                                    │
│  │ next_step    ├────────────► 停止（工作流结束）            │
│  │ 为空？       │                                           │
│  └──────┬───────┘                                           │
│         │ 否                                                │
│         ▼                                                   │
│  ┌──────────────┐     否                                    │
│  │auto_continue ├────────────► 停止，输出"自动继续已禁用"   │
│  │ 为 true？    │             + 下一步命令提示              │
│  └──────┬───────┘                                           │
│         │ 是                                                │
│         ▼                                                   │
│  ┌──────────────┐     是                                    │
│  │ 需要审批？   ├────────────► 停止，输出审批提示            │
│  └──────┬───────┘                                           │
│         │ 否                                                │
│         ▼                                                   │
│  ┌──────────────┐                                           │
│  │ 执行命令     │                                           │
│  └──────┬───────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐     失败                                  │
│  │ 命令结果？   ├────────────► 停止，输出错误                │
│  └──────┬───────┘                                           │
│         │ 成功                                              │
│         │                                                   │
│         └────────────────────► 回到「读取 STATE」           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 边界情况处理

| 情况 | 处理方式 |
|------|----------|
| workflow 字段不存在 | 创建 workflow 字段，设置 current_step = "not_started" |
| next_step 为空 | 停止，输出"工作流已完成" |
| 审批配置键不存在 | 视为 "auto"，自动继续 |
| 转换表中找不到 next_step | 停止，输出"未知步骤: {next_step}" |
| split_ticket 需要 Story ID 但不存在 | 停止，输出"需要先选择 Story" |
| 命令执行失败 | 不更新 workflow，停止并输出错误 |
| Ticket 依赖未满足 | 跳过该 Ticket，选择下一个无依赖的 pending Ticket |
| Story 的 tickets 列表为空时执行 /verify | 停止，输出"Story 没有 Tickets，无法验收" |
| Ticket 的 allowed_paths 为空 | 停止，输出"Ticket 缺少 allowed_paths 配置" |
| Ticket 完成时缺少 verification_evidence | 停止，不更新状态，提示执行验证命令 |
| /verify 时 Ticket 缺少 verification_evidence | 停止验收，列出缺少证据的 Tickets |
| auto_continue 为 False | 停止，输出"自动继续已禁用"和下一步命令提示 |

## 供其他 Skill 调用的接口

### 命令完成时调用

每个命令对应的 Skill 在完成时，应调用 workflow-engine 更新状态：

```python
# 在 brainstorming skill 完成时
update_workflow("/brainstorm", state)

# 在 story-splitter skill 完成时
update_workflow("/split story", state)

# ⚠️ deliver-ticket 和 verify 不调用 update_workflow
# 它们直接写 STATE.yaml（因为有复杂的分支逻辑：
#   /next → implementing / story_verified / verification_failed
#   /verify → story_verified / verification_failed
# ）
```

### 获取当前状态

```python
workflow_state = get_workflow_state()
print(f"当前状态: {workflow_state.current_step}")
print(f"下一动作: {workflow_state.next_step}")
```
