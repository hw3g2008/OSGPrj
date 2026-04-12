---
name: plan-deliver
description: "Use when the user wants one simple entrypoint to start or resume the standard RPIV delivery chain by delegating to existing commands and stopping at existing pause gates"
metadata:
  invoked-by: "user"
  auto-execute: "true"
---

# Plan-Deliver Skill

## 概览

`/plan-deliver` 是标准 RPIV 主流程的**薄编排层**。

它的职责不是替代：
- `workflow-engine`
- `brainstorming`
- `story-splitter`
- `ticket-splitter`
- `deliver-ticket`
- `verification`

而是：
- 读取当前工作流状态
- 判断现在应该继续哪条规范命令
- 在现有暂停点停下

## 何时使用

- 用户不想记忆多条 RPIV 命令
- 需要从当前 `STATE.yaml` 继续标准交付链
- 需要从模块入口开始，自动跳到正确的第一步

## ⚠️ 执行模式

```
⚠️ 铁律：
1. 每次进入先读取状态文件和项目配置
2. 只调用已有规范命令，不重写主流程逻辑
3. 不直接写 STATE.yaml
4. 不复制 transition() / verify_story() / 最后一票自动验收逻辑
5. 遇到既有 pause state 必须停止
6. 不绕过审批门
```

## 标准暂停点

以下状态是 `/plan-deliver` 的正常停止点：

- `brainstorm_pending_confirm`
- `verification_failed`
- `all_stories_done`

`story_verified` 需要额外看 `config.approval.story_done`：
- `required` → 仍是暂停点
- `auto` → 自动分发 `/approve {current_story}`，不固定停下

## 命令分发表

| Current state | Dispatch |
|---|---|
| `not_started` | `/brainstorm {module}` |
| `brainstorm_done` | `/split story` |
| `story_split_done` | `/approve stories`（仅当无需人工审批时） |
| `stories_approved` | `/split ticket {current_story}` |
| `ticket_split_done` | `/approve tickets`（仅当无需人工审批时） |
| `tickets_approved` | `/next` |
| `implementing` | `/next` |

## 停止点处理

### 1. brainstorm_pending_confirm

停止，并提示：
- 先处理 `DECISIONS.md`
- 然后执行 `/approve brainstorm`

### 2. story_verified

停止，并提示：
- `/approve {current_story}`

### 3. verification_failed

停止，并提示：
- 先修复
- 再执行 `/verify {current_story}`

### 4. all_stories_done

停止，并提示：
- `/final-closure {module}`

## 执行流程

```
开始
  │
  ▼
[读取 STATE.yaml + config.yaml]
  │
  ▼
[解析 module 参数]
  │
  ├── 无参数 → 使用 STATE.current_requirement
  └── 有参数 → 优先使用用户输入（主要用于 brainstorm 场景）
  │
  ▼
[检查 current_step]
  │
  ├── 命中 pause state ──→ 输出停止原因 + 下一步建议
  │
  └── 非 pause state
         │
         ▼
    [推导规范命令]
         │
         ├── 需要 brainstorm → `/brainstorm {module}`
         ├── brainstorm_done → `/split story`
         ├── stories_approved → `/split ticket {current_story}`
         ├── tickets_approved / implementing → `/next`
         └── 其他状态 → 按审批规则停下或提示下一步
```

## 执行伪代码

```python
def plan_deliver(module_arg=None):
    config = read_yaml(".claude/project/config.yaml")
    state = read_yaml(config.paths.tasks.state)

    current_step = state.workflow.current_step if state.get("workflow") else "not_started"
    current_story = state.get("current_story")
    current_requirement = state.get("current_requirement")
    module = module_arg or current_requirement

    pause_states = {
        "brainstorm_pending_confirm",
        "verification_failed",
        "all_stories_done",
    }

    if current_step == "story_verified":
        if requires_approval("approve_story", config) or state.workflow.next_requires_approval:
            return stop_with_guidance(current_step, state, module)
        return dispatch(f"/approve {current_story}")

    if current_step in pause_states:
        return stop_with_guidance(current_step, state, module)

    if current_step in (None, "not_started"):
        if not module:
            return stop("缺少 module 参数，无法开始 /brainstorm")
        return dispatch(f"/brainstorm {module}")

    if current_step == "brainstorm_done":
        return dispatch("/split story")

    if current_step == "story_split_done":
        if requires_approval("approve_stories", config):
            return stop("Story 拆分待审批，请执行 /approve stories")
        return dispatch("/approve stories")

    if current_step == "stories_approved":
        return dispatch(f"/split ticket {current_story}")

    if current_step == "ticket_split_done":
        if requires_approval("approve_tickets", config):
            return stop("Ticket 拆分待审批，请执行 /approve tickets")
        return dispatch("/approve tickets")

    if current_step in ("tickets_approved", "implementing"):
        return dispatch("/next")

    if current_step == "story_approved":
        return stop("当前 Story 已审批，交给既有 next-story / auto-continue 机制继续")

    return stop(f"未覆盖状态: {current_step}")
```

## 验证要求

实现该 skill 后，至少要验证：

1. `not_started` 时能走到 `/brainstorm`
2. `brainstorm_done` 时能走到 `/split story`
3. `stories_approved` 时能走到 `/split ticket {current_story}`
4. `tickets_approved` 时能走到 `/next`
5. `story_verified` / `verification_failed` / `all_stories_done` 时不会越过暂停点

## 非目标

v1 不负责：
- 修改状态机
- 自动执行 `/approve {current_story}`
- 自动执行 `/final-closure`
- 添加 `--through verify` / `--approve-story` 等增强参数
