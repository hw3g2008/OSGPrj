# Ticket-Splitter Skill

---
name: ticket-splitter
description: "Use when triggered by /split ticket S-xxx - breaks Story into micro-tasks (2-5 min each)"
invoked_by: user
auto_execute: true
---

## 概览

将 Story 拆解为微任务 Tickets，每个 Ticket 2-5 分钟可完成。

## 何时使用

- `/split ticket S-xxx` 命令
- Story 审批通过后
- 需要将 Story 拆分为可执行的最小单元

## 微任务原则

```
⚠️ 核心原则：
1. 每个 Ticket 2-5 分钟可完成
2. 每个 Ticket 只做一件事
3. 每个 Ticket 有明确的验收标准
4. 每个 Ticket 有严格的 allowed_paths
```

## Ticket 模板

```yaml
# osg-spec-docs/tasks/tickets/T-{number}.yaml

id: "T-001"
story_id: "S-001"
title: "创建登录 API 接口定义"
type: backend  # backend | frontend | database | test | config

status: pending  # pending | in_progress | completed | blocked
estimate: 5m     # 2-5 分钟

# 允许修改的文件路径（严格限制）
allowed_paths:
  - "ruoyi-admin/src/main/java/**/controller/LoginController.java"

# 验收标准
acceptance_criteria:
  - "创建 POST /api/login 接口"
  - "请求体包含 phone, password"
  - "返回 token 或错误信息"

# 依赖的 Tickets
dependencies: []

# 时间戳
created_at: "2026-02-03T12:00:00Z"
completed_at: null
```

## 执行流程

```
[读取 Story]
    │ - osg-spec-docs/tasks/stories/S-xxx.yaml
    │
    ▼
[分析验收标准]
    │ - 每个标准对应 1-N 个 Tickets
    │
    ▼
[识别工作类型]
    │ - backend / frontend / database / test
    │
    ▼
[拆分为微任务]
    │
    ▼
[分配 allowed_paths]
    │ - 每个 Ticket 严格限制
    │
    ▼
[依赖分析]
    │ - 确定执行顺序
    │
    ▼
[生成 Ticket YAML]
    │
    ▼
[更新 Story 和 STATE]
```

## 拆分示例

```yaml
# 输入：S-001 用户登录

# 输出 Tickets:
T-001:
  title: "创建 LoginController 类"
  type: backend
  estimate: 3m
  allowed_paths:
    - "ruoyi-admin/src/main/java/**/controller/LoginController.java"

T-002:
  title: "实现登录接口逻辑"
  type: backend
  estimate: 5m
  dependencies: [T-001]
  allowed_paths:
    - "ruoyi-admin/src/main/java/**/controller/LoginController.java"

T-003:
  title: "创建 LoginService 接口"
  type: backend
  estimate: 3m
  allowed_paths:
    - "ruoyi-system/src/main/java/**/service/ILoginService.java"

T-004:
  title: "实现 LoginService"
  type: backend
  estimate: 5m
  dependencies: [T-003]
  allowed_paths:
    - "ruoyi-system/src/main/java/**/service/impl/LoginServiceImpl.java"

T-005:
  title: "创建登录页面组件"
  type: frontend
  estimate: 5m
  allowed_paths:
    - "osg-frontend/packages/student/src/views/Login.vue"

T-006:
  title: "实现登录 API 调用"
  type: frontend
  estimate: 3m
  dependencies: [T-005]
  allowed_paths:
    - "osg-frontend/packages/shared/src/api/auth.ts"

T-007:
  title: "编写登录单元测试"
  type: test
  estimate: 5m
  dependencies: [T-002, T-004]
  allowed_paths:
    - "ruoyi-admin/src/test/java/**/controller/LoginControllerTest.java"
```

## 执行伪代码

```python
def split_tickets(story_id):
    story = read_yaml(f"osg-spec-docs/tasks/stories/{story_id}.yaml")
    config = read_yaml(".claude/project/config.yaml")
    
    tickets = []
    ticket_number = 1
    
    for criteria in story.acceptance_criteria:
        # 分析需要的工作
        work_items = analyze_work(criteria, config.paths)
        
        for item in work_items:
            ticket = {
                "id": f"T-{ticket_number:03d}",
                "story_id": story_id,
                "title": item.title,
                "type": item.type,
                "status": "pending",
                "estimate": estimate_time(item),
                "allowed_paths": item.paths,
                "acceptance_criteria": item.criteria,
                "dependencies": item.dependencies
            }
            
            # 验证估算时间
            if not is_micro_task(ticket):
                ticket = split_further(ticket)
            
            tickets.append(ticket)
            ticket_number += 1
    
    # 保存 Ticket 文件
    for ticket in tickets:
        write_yaml(f"osg-spec-docs/tasks/tickets/{ticket['id']}.yaml", ticket)
    
    # 更新 Story
    story.tickets = [t['id'] for t in tickets]
    write_yaml(f"osg-spec-docs/tasks/stories/{story_id}.yaml", story)
    
    # 更新 STATE
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    state.tickets.extend([t['id'] for t in tickets])
    state.phase = "ticket_split_pending_approval"
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
    
    return tickets
```

## 输出格式

```markdown
## 🎫 Ticket 拆分结果

**Story**: S-001 - 用户登录

### 统计
- 总 Tickets: 7
- Backend: 4
- Frontend: 2
- Test: 1

### Tickets 列表

| ID | 标题 | 类型 | 估算 | 依赖 |
|----|------|------|------|------|
| T-001 | 创建 LoginController | backend | 3m | - |
| T-002 | 实现登录逻辑 | backend | 5m | T-001 |
| T-003 | 创建 LoginService 接口 | backend | 3m | - |
| T-004 | 实现 LoginService | backend | 5m | T-003 |
| T-005 | 创建登录页面 | frontend | 5m | - |
| T-006 | 实现 API 调用 | frontend | 3m | T-005 |
| T-007 | 编写单元测试 | test | 5m | T-002, T-004 |

### 依赖图
```
T-001 ──→ T-002 ──┐
                   ├──→ T-007
T-003 ──→ T-004 ──┘

T-005 ──→ T-006
```

### ⏭️ 下一步
执行 `/approve tickets` 审批 Ticket 拆分
```

## 硬约束

- 每个 Ticket 必须 2-5 分钟
- 每个 Ticket 必须有 allowed_paths
- 依赖必须形成 DAG（无环）
- 必须覆盖所有验收标准
