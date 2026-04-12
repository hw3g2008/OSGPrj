---
name: checkpoint-manager
description: "Use when saving/restoring state - manages checkpoints for session recovery"
metadata:
  invoked-by: "auto"
  auto-execute: "true"
---

# Checkpoint-Manager Skill

## 概览

检查点管理，支持状态保存和会话恢复。

## 何时使用

- Ticket 完成后自动创建
- 上下文接近满时
- 用户执行 `/checkpoint`
- 用户执行 `/restore`

## Checkpoint 内容

```yaml
# .claude/checkpoints/CP-{timestamp}.yaml

id: "CP-20260203T120000Z"
created_at: "2026-02-03T12:00:00Z"
trigger: "ticket_complete"  # | context_full | manual

# 状态快照
state_snapshot:
  current_story: "S-001"
  current_ticket: "T-003"
  execution:
    active_stories: ["S-001"]
    active_tickets: ["T-003"]
    ticket_leases: []
    workspaces: []
    scheduler:
      parallel_enabled: false
      max_stories: 1
      max_tickets_per_story: 1
  completed_tickets:
    - "T-001"
    - "T-002"

# 上下文摘要
context_summary:
  decisions:
    - "选择 Vue 3 Composition API"
    - "使用 Pinia 状态管理"
  current_task: "实现用户登录模块"
  blockers: []

# 工作记忆
working_memory:
  files_modified:
    - "src/views/Login.vue"
    - "src/api/auth.ts"
  test_status: "passed"
```

## 执行流程

### 创建 Checkpoint

```
[触发创建]
    │
    ▼
[读取当前状态]
    │ - osg-spec-docs/tasks/STATE.yaml
    │ - .claude/memory/decisions.yaml
    │
    ▼
[压缩上下文]
    │ - 提取关键决策
    │ - 记录当前任务
    │ - 保存阻塞项
    │
    ▼
[生成 Checkpoint 文件]
    │ - ID: CP-{timestamp}
    │ - 路径: .claude/checkpoints/
    │
    ▼
[更新 STATE.yaml]
    │ - last_checkpoint: {id}
```

### 恢复 Checkpoint

```
[指定 Checkpoint ID]
    │ - /restore CP-xxx
    │ - /restore latest
    │
    ▼
[读取 Checkpoint 文件]
    │
    ▼
[恢复状态]
    │ - 更新 STATE.yaml
    │ - 加载上下文摘要
    │ - 注入工作记忆
    │
    ▼
[输出恢复摘要]
```

## 执行伪代码

```python
def create_checkpoint(trigger="manual"):
    # 生成 ID
    checkpoint_id = f"CP-{now_iso8601()}"
    
    # 读取当前状态
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    decisions = read_yaml(".claude/memory/decisions.yaml")
    
    # 构建 Checkpoint
    checkpoint = {
        "id": checkpoint_id,
        "created_at": now_iso8601(),
        "trigger": trigger,
        "state_snapshot": {
            "current_story": state.current_story,
            "current_ticket": state.current_ticket,
            "current_requirement": state.current_requirement,
            "current_requirement_path": state.current_requirement_path,
            "workflow": {
                "current_step": state.workflow.current_step,
                "next_step": state.workflow.next_step,
                "next_requires_approval": state.workflow.next_requires_approval,
                "auto_continue": state.workflow.auto_continue,
                "brainstorm_version": state.workflow.brainstorm_version,
                "srs_path": state.workflow.srs_path,
                "decisions_path": state.workflow.decisions_path,
            },
            "execution": state.execution or {
                "backend": {
                    "workflow_backend": "yaml",
                    "execution_backend": "inline",
                },
                "active_stories": [],
                "active_tickets": [],
                "story_leases": [],
                "ticket_leases": [],
                "workspaces": [],
                "scheduler": {
                    "parallel_enabled": False,
                    "max_stories": 1,
                    "max_tickets_per_story": 1,
                    "last_tick_at": None,
                    "last_selected_story": None,
                    "last_runnable_tickets": [],
                },
            },
            "completed_stories": state.completed_stories,
            "completed_tickets": state.completed_tickets,
            "blocked_tickets": state.blocked_tickets,
            "blockers": state.blockers,
            "stats": state.stats,
        },
        "context_summary": {
            "decisions": decisions.recent[:10],
            "current_task": state.current_task_description,
            "blockers": state.blockers
        },
        "working_memory": {
            "files_modified": get_modified_files(),
            "test_status": get_test_status()
        }
    }
    
    # 保存
    write_yaml(f".claude/checkpoints/{checkpoint_id}.yaml", checkpoint)
    
    # 更新 STATE
    state.last_checkpoint = checkpoint_id
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
    
    return checkpoint_id


def restore_checkpoint(checkpoint_id):
    # 处理 "latest"
    if checkpoint_id == "latest":
        checkpoint_id = get_latest_checkpoint_id()
    
    # 读取 Checkpoint
    checkpoint = read_yaml(f".claude/checkpoints/{checkpoint_id}.yaml")
    
    # 恢复状态
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.current_story = checkpoint.state_snapshot.current_story
    state.current_ticket = checkpoint.state_snapshot.current_ticket
    state.current_requirement = checkpoint.state_snapshot.current_requirement
    state.current_requirement_path = checkpoint.state_snapshot.current_requirement_path
    state.workflow = checkpoint.state_snapshot.workflow
    state.execution = checkpoint.state_snapshot.execution or {
        "backend": {
            "workflow_backend": "yaml",
            "execution_backend": "inline",
        },
        "active_stories": [],
        "active_tickets": [],
        "story_leases": [],
        "ticket_leases": [],
        "workspaces": [],
        "scheduler": {
            "parallel_enabled": False,
            "max_stories": 1,
            "max_tickets_per_story": 1,
            "last_tick_at": None,
            "last_selected_story": None,
            "last_runnable_tickets": [],
        },
    }
    state.completed_stories = checkpoint.state_snapshot.completed_stories
    state.completed_tickets = checkpoint.state_snapshot.completed_tickets
    state.blocked_tickets = checkpoint.state_snapshot.blocked_tickets
    state.blockers = checkpoint.state_snapshot.blockers
    state.stats = checkpoint.state_snapshot.stats
    state.restored_from = checkpoint_id
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
    
    return {
        "restored_from": checkpoint_id,
        "state": checkpoint.state_snapshot,
        "context": checkpoint.context_summary
    }
```

## 输出格式

### 创建 Checkpoint

```markdown
## 💾 Checkpoint 已创建

**ID**: CP-20260203T120000Z
**触发**: ticket_complete

### 状态快照
- Story: S-001
- Ticket: T-003 (刚完成)
- 已完成: 2/5 Tickets

### 上下文摘要
- 关键决策: 2 条
- 当前任务: 实现用户登录模块
```

### 恢复 Checkpoint

```markdown
## 🔄 Checkpoint 已恢复

**来源**: CP-20260203T120000Z

### 恢复的状态
- Story: S-001
- Ticket: T-003
- 进度: 2/5 Tickets

### 上下文摘要
- 选择 Vue 3 Composition API
- 使用 Pinia 状态管理

### ⏭️ 继续执行
执行 `/next` 继续下一个 Ticket
```

## 硬约束

- 禁止覆盖已有 Checkpoint
- 必须包含状态快照
- 必须记录触发原因
- 恢复时必须验证 Checkpoint 存在
