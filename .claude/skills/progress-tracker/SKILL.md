---
name: progress-tracker
description: "Use when checking or updating progress - tracks and reports project progress"
metadata:
  invoked-by: "agent"
  auto-execute: "true"
---

# Progress-Tracker Skill

## 概览

跟踪和报告项目进度，提供可视化状态概览。

## 何时使用

- `/status` 命令
- 每个 Ticket 完成后
- 会话开始时

## 进度计算

```python
def calculate_progress(state):
    stories = state.stories
    
    total_tickets = 0
    completed_tickets = 0
    
    for story_id in stories:
        story = read_yaml(f"osg-spec-docs/tasks/stories/{story_id}.yaml")
        for ticket_id in story.tickets:
            total_tickets += 1
            ticket = read_yaml(f"osg-spec-docs/tasks/tickets/{ticket_id}.yaml")
            if ticket.status == "completed":
                completed_tickets += 1
    
    return {
        "total": total_tickets,
        "completed": completed_tickets,
        "percentage": (completed_tickets / total_tickets * 100) if total_tickets > 0 else 0
    }
```

## 状态可视化

```
Story 进度条:
[████████░░░░░░░░] 50% (2/4 Tickets)

整体进度:
██████████████████████░░░░░░░░ 70%
```

## 输出格式

```markdown
## 📊 项目状态

### 当前位置
- **Story**: S-001 - 用户登录模块
- **Ticket**: T-003 - 实现登录逻辑
- **阶段**: Implement

### 进度概览

#### Stories
| ID | 标题 | 进度 | 状态 |
|----|------|------|------|
| S-001 | 用户登录 | 2/7 | 🔵 进行中 |
| S-002 | 用户注册 | 0/5 | ⚪ 待开始 |

#### 当前 Story 详情

```
S-001 用户登录
├── ✅ T-001 创建 LoginController
├── ✅ T-002 实现登录接口
├── 🔵 T-003 创建 LoginService ◄ 当前
├── ⚪ T-004 实现 LoginService
├── ⚪ T-005 创建登录页面
├── ⚪ T-006 实现 API 调用
└── ⚪ T-007 编写单元测试
```

### 时间统计
- 已用时间: 45 分钟
- 预估剩余: 2 小时

### 阻塞项
{blockers.length > 0 ? blockers : "无"}

### ⏭️ 下一步
执行 `/next` 继续下一个 Ticket
```

## 状态图标

| 图标 | 状态 |
|------|------|
| ✅ | completed |
| 🔵 | in_progress |
| ⚪ | pending |
| 🔴 | blocked |
| ⏸️ | paused |

## 硬约束

- 进度必须实时计算
- 必须显示当前位置
- 必须显示下一步操作
- 阻塞项必须突出显示
