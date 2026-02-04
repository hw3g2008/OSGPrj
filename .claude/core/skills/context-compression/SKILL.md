# Context-Compression Skill

---
name: context-compression
description: "Use when context is approaching limit - compresses context while preserving critical information"
invoked_by: auto
auto_execute: true
---

## 概览

上下文压缩，在接近上下文限制时保留关键信息。

## 何时使用

- 上下文使用率 > 80%
- 会话即将结束
- 需要创建 Checkpoint

## 压缩策略

```
优先级（从高到低）：
1. 当前任务状态 - 必须保留
2. 未完成的 Tickets - 必须保留
3. 关键决策 - 必须保留
4. 最近的代码变更 - 摘要保留
5. 对话历史 - 压缩保留
6. 已完成的 Tickets - 仅保留 ID
```

## 压缩输出格式

```yaml
# 压缩后的上下文摘要
compressed_context:
  # 当前状态（完整保留）
  current_state:
    story: "S-001"
    ticket: "T-003"
    phase: "implement"
  
  # 未完成任务（完整保留）
  pending_tasks:
    - id: "T-003"
      title: "实现登录逻辑"
      allowed_paths: ["**/LoginController.java"]
    - id: "T-004"
      title: "创建 LoginService"
  
  # 关键决策（完整保留）
  key_decisions:
    - "使用 JWT Token 认证"
    - "Vue 3 Composition API"
  
  # 代码变更摘要
  recent_changes:
    - file: "LoginController.java"
      summary: "添加了 /api/login 接口"
    - file: "Login.vue"
      summary: "创建登录页面骨架"
  
  # 已完成（仅 ID）
  completed_tickets: ["T-001", "T-002"]
```

## 执行伪代码

```python
def compress_context():
    # 收集当前上下文
    state = read_yaml("tasks/STATE.yaml")
    decisions = read_yaml(".claude/memory/decisions.yaml")
    
    # 按优先级压缩
    compressed = {
        "current_state": {
            "story": state.current_story,
            "ticket": state.current_ticket,
            "phase": state.phase
        },
        "pending_tasks": get_pending_tickets(state),
        "key_decisions": decisions.decisions[-5:],  # 最近 5 条
        "recent_changes": summarize_changes(),
        "completed_tickets": state.completed_tickets
    }
    
    return compressed


def summarize_changes():
    """将代码变更压缩为摘要"""
    changes = get_recent_changes()
    summaries = []
    
    for change in changes:
        summary = {
            "file": change.file,
            "summary": generate_summary(change.diff)  # 1-2 句话
        }
        summaries.append(summary)
    
    return summaries
```

## 触发条件

```python
def should_compress():
    # 检查上下文使用率
    usage = estimate_context_usage()
    
    if usage > 0.8:
        return True, "context_threshold"
    
    # 检查会话时长
    if session_duration() > 30 * 60:  # 30 分钟
        return True, "session_duration"
    
    return False, None
```

## 输出格式

```markdown
## 🗜️ 上下文已压缩

### 触发原因
上下文使用率: 85%

### 保留内容
| 类别 | 数量 | 状态 |
|------|------|------|
| 当前任务 | 1 | 完整保留 |
| 待办任务 | 3 | 完整保留 |
| 关键决策 | 5 | 完整保留 |
| 代码变更 | 4 | 摘要保留 |
| 已完成 | 2 | 仅保留 ID |

### 压缩后估算
~40% 上下文使用率

### ⚠️ 注意
如需恢复完整上下文，请使用 `/restore`
```

## 硬约束

- 当前任务状态必须完整保留
- 未完成 Tickets 必须完整保留
- 关键决策必须保留
- 压缩后必须可恢复工作
