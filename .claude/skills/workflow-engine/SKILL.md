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
    检查是否有下一个 pending Story
    """
    pending_stories = get_pending_stories(state)

    if pending_stories:
        next_story = pending_stories[0]
        # 更新状态
        state.current_story = next_story
        state.workflow.current_step = "stories_approved"
        state.workflow.next_step = "split_ticket"
        write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
        return f"/split ticket {next_story}"
    else:
        # 所有 Stories 完成
        state.workflow.current_step = "all_stories_done"
        state.workflow.next_step = None
        write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
        return None  # 工作流结束
```

### 5. 更新工作流状态

```python
def update_workflow(command_completed, state):
    """
    命令完成后更新工作流状态
    由各个 Skill 在完成时调用
    """
    sm = load_yaml(".claude/skills/workflow-engine/state-machine.yaml")

    # ⚠️ deliver-ticket 和 verify 自己管理状态，不需要 update_workflow
    # 它们直接写 STATE.yaml（因为有复杂的分支逻辑）
    if command_completed in ("/next", "/verify"):
        return  # 状态已由对应 Skill/Workflow 直接写入 STATE.yaml

    # 根据完成的命令查找新状态
    new_state = sm.command_to_state[command_completed]

    # 特殊处理：判断是否是最后一个
    if command_completed.startswith("/approve S-"):
        if no_pending_stories(state):
            new_state = "all_stories_done"

    # 查找下一个动作
    next_action = sm.states[new_state].next_action

    # 写入状态
    state.workflow.current_step = new_state
    state.workflow.next_step = next_action
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
```

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
