# /next 命令

## 用法

```
/next                     # 执行下一个 Ticket
/next T-xxx               # 执行指定 Ticket
```

## 说明

执行下一个待处理的 Ticket，根据 Ticket.type 选择流程（TDD / UI 还原 / 前端功能含 E2E / 配置）。

## 执行流程

```
1. 读取 STATE.yaml
2. 查找下一个 pending Ticket（考虑依赖）
   - 如果找不到 pending Ticket → 停止，输出："当前 Story 所有 Tickets 已完成。请执行 /verify {story_id} 或 /approve {story_id}"
3. 根据 Ticket.type 选择 Agent
   - backend → backend-java Agent
   - frontend → frontend-vue Agent
   - database → dba-mysql Agent
   - test → Developer Agent
4. 触发 deliver-ticket Skill
5. TDD: Red → Green → Refactor
6. 自我审查
7. 更新状态
8. 如果 config.approval.ticket_done == "auto"，自动执行下一个
```

## Agent 选择逻辑

```python
def select_agent(ticket):
    # 读取项目配置
    config = read_yaml(".claude/project/config.yaml")
    
    # 根据 Ticket 类型选择
    agent_map = {
        "backend": "backend-java",   # 或从 config.developers 获取
        "frontend": "frontend-vue",
        "frontend-ui": "frontend-admin",
        "database": "dba-mysql",
        "test": "developer",
        "config": "developer"
    }
    
    return agent_map.get(ticket.type, "developer")
```

## 自动继续

如果 `config.approval.ticket_done == "auto"`，完成一个 Ticket 后会自动执行下一个，直到：

- 所有 Tickets 完成 → 由 deliver-ticket 内部调用 `transition()` 推进到 `all_tickets_done`，自动执行 `/verify`
- 遇到错误需要人工介入
- 上下文接近满

## 完成判断

```python
def check_completion(state):
    pending_tickets = [t for t in state.tickets if t.status == "pending"]
    
    if len(pending_tickets) == 0:
        # 所有 Tickets 完成 — 由 deliver-ticket 内部调用 transition()
        # 参见 deliver-ticket/SKILL.md Step 9 (W6/W7)
        return "all_done"
    else:
        # 还有待处理的 Ticket — 由 deliver-ticket 内部调用 transition()
        # 参见 deliver-ticket/SKILL.md Step 9 (W5)
        return "continue"
```

## 示例

```
# 执行下一个 Ticket
/next

# 执行指定 Ticket
/next T-003
```

## 输出

```markdown
## 🔄 执行 Ticket

**Ticket**: T-003 - 实现登录逻辑
**Agent**: backend-java
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

### ⏭️ 自动继续下一个 Ticket...
```

## 下一步

- 自动模式：继续执行下一个 Ticket
- 手动模式：等待 `/approve T-xxx` 或 `/next`
