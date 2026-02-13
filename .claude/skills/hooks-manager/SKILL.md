---
name: hooks-manager
description: "Use when lifecycle events occur - manages framework hooks for session/task events"
metadata:
  invoked-by: "auto"
  auto-execute: "true"
---

# Hooks-Manager Skill

## 概览

生命周期钩子管理，在关键事件发生时自动触发预定义操作。

## Hook 类型

| Hook | 触发时机 | 默认操作 |
|------|----------|----------|
| SessionStart | 会话开始 | 加载状态、注入框架、输出摘要 |
| SessionEnd | 会话结束 | 保存 checkpoint、压缩上下文 |
| TicketStart | Ticket 开始 | 创建 checkpoint、加载上下文 |
| TicketComplete | Ticket 完成 | 更新状态、触发审查 |
| StoryComplete | Story 完成 | 验证验收标准、更新进度 |
| ErrorOccur | 错误发生 | 记录日志、触发调试流程 |

## Hook 实现

### SessionStart

```python
def hook_session_start():
    """会话开始钩子"""
    
    # 1. 检查 STATE.yaml
    if not file_exists("osg-spec-docs/tasks/STATE.yaml"):
        return {
            "action": "prompt_init",
            "message": "请执行 /init-project 初始化项目"
        }
    
    # 2. 加载状态
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    
    # 3. 检查 config.yaml
    if not file_exists(".claude/project/config.yaml"):
        return {
            "action": "prompt_config",
            "message": "请创建 .claude/project/config.yaml"
        }
    
    config = read_yaml(".claude/project/config.yaml")
    
    # 4. 检查是否从 checkpoint 恢复
    if state.get("restored_from"):
        checkpoint = read_yaml(f".claude/checkpoints/{state.restored_from}.yaml")
        return {
            "action": "resume",
            "state": state,
            "context": checkpoint.context_summary
        }
    
    # 5. 输出状态摘要
    return {
        "action": "normal",
        "state": state,
        "config": config
    }
```

### SessionEnd

```python
def hook_session_end():
    """会话结束钩子"""
    
    # 1. 保存 checkpoint
    checkpoint_id = create_checkpoint(trigger="session_end")
    
    # 2. 压缩上下文
    compressed = compress_context()
    
    # 3. 更新 STATE.yaml
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.last_checkpoint = checkpoint_id
    state.last_session_end = now_iso8601()
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
    
    return {
        "checkpoint": checkpoint_id,
        "compressed_context": compressed
    }
```

### TicketComplete

```python
def hook_ticket_complete(ticket_id):
    """Ticket 完成钩子"""
    
    # 1. 创建 checkpoint
    checkpoint_id = create_checkpoint(trigger="ticket_complete")
    
    # 2. 更新 STATE.yaml
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.completed_tickets.append(ticket_id)
    state.current_ticket = None
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
    
    # 3. 触发代码审查
    review_result = code_review(get_ticket_changes(ticket_id))
    
    # 4. 检查是否自动继续
    config = read_yaml(".claude/project/config.yaml")
    if config.approval.ticket_done == "auto":
        return {
            "action": "continue",
            "next_ticket": get_next_pending_ticket(state)
        }
    
    return {
        "action": "wait_approval",
        "review": review_result
    }
```

### ErrorOccur

```python
def hook_error_occur(error):
    """错误发生钩子"""
    
    # 1. 记录日志
    log_error(error)
    
    # 2. 检查是否是已知错误
    known_error = match_known_error(error)
    if known_error:
        return {
            "action": "auto_fix",
            "fix": known_error.fix
        }
    
    # 3. 触发调试流程
    return {
        "action": "debug",
        "error": error,
        "skill": "debugging"
    }
```

## 平台适配

### Cursor

```python
# Cursor 没有原生 hooks，通过 CLAUDE.md 入口模拟
# SessionStart: CLAUDE.md 中的首次响应规则
# SessionEnd: 检测到 "结束会话" 关键词时触发
# 其他: 在相应 Skill 中嵌入 hook 调用
```

### Claude CLI

```python
# Claude CLI 可以使用 YAML 配置文件定义 hooks
# .claude/hooks.yaml
hooks:
  on_session_start:
    - load_state
    - inject_framework
  on_session_end:
    - save_checkpoint
```

## 输出格式

### SessionStart

```markdown
## 📊 会话状态

**项目**: osg-platform
**上次活动**: 2026-02-03T10:00:00Z

### 当前进度
- Story: S-001 - 用户登录
- Ticket: T-003 - 实现登录逻辑
- 进度: 2/7 (28%)

### ⏭️ 继续
执行 `/next` 继续当前 Ticket
```

### TicketComplete

```markdown
## ✅ Ticket T-003 完成

**耗时**: 5 分钟
**Checkpoint**: CP-20260203T123000Z

### 代码审查
- 正确性: ✅
- 安全性: ✅
- 性能: ✅

### ⏭️ 自动继续
正在执行下一个 Ticket: T-004...
```

## 硬约束

- SessionStart 必须检查初始化状态
- SessionEnd 必须保存 checkpoint
- TicketComplete 必须触发审查
- ErrorOccur 必须记录日志
