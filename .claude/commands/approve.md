# /approve 命令

## 用法

```
/approve brainstorm       # 产品确认需求疑问清单后继续
/approve stories          # 审批 Story 拆分
/approve tickets          # 审批 Ticket 拆分
/approve S-xxx            # 审批 Story 完成
/approve T-xxx            # 审批 Ticket 完成
```

## /approve brainstorm

### 说明

产品确认问题清单后，进入 split story。

### 前提条件

- `workflow.current_step` = `brainstorm_pending_confirm`
- `{module}-open-questions.md` 存在

### 执行流程

```
1. 读取 STATE.yaml，确认 current_step = brainstorm_pending_confirm
2. 读取 {module}-open-questions.md，逐项展示
3. PM 逐项裁决（C/D/B 类按类型处理）
4. 更新 workflow:
   - current_step = "brainstorm_done"
   - next_step = "split_story"
   - auto_continue = true
5. 更新 STATE.yaml
```

### 下一步

自动继续执行 `/split story`

---

## /approve stories

### 说明

审批 Story 拆分结果，确认可以开始 Ticket 拆分。

### 执行流程

```
1. 显示所有 Stories 摘要
2. 等待用户确认
3. 更新 workflow:
   - current_step = "stories_approved"
   - next_step = "split_ticket"
4. 设置 current_story = 第一个 Story ID
```

### 下一步

自动执行 `/split ticket S-001` 拆分第一个 Story

---

## /approve tickets

### 说明

审批 Ticket 拆分结果，确认可以开始执行。

### 执行流程

```
1. 显示所有 Tickets 摘要
2. 显示依赖图
3. 等待用户确认
4. 更新 workflow:
   - current_step = "ticket_approved"
   - next_step = "next"
```

### 下一步

自动执行 `/next` 开始执行第一个 Ticket

---

## /approve S-xxx

### 说明

审批指定 Story 完成。

### 前提条件

- Story 的所有 Tickets 已完成
- 所有验收标准已验证

### 执行流程

```
1. 触发 QA Agent 验证
2. 显示验证报告
3. 等待用户确认
4. 更新 Story 状态为 completed
5. 检查是否是最后一个 Story:
   - 如果还有 pending Stories → 设置 workflow.current_step = "story_approved"
   - 如果是最后一个 → 设置 workflow.current_step = "all_stories_done"
6. 更新 STATE.yaml
```

### 完成判断

```python
def check_story_completion(state):
    pending_stories = [s for s in state.stories if s.status == "pending"]
    
    if len(pending_stories) == 0:
        # 所有 Stories 完成
        state.workflow.current_step = "all_stories_done"
        state.workflow.next_step = None
        return "all_done"
    else:
        # 还有待处理的 Story
        state.workflow.current_step = "story_approved"
        state.workflow.next_step = "next_story"
        return "continue"
```

---

## /approve T-xxx

### 说明

审批指定 Ticket 完成（当 config.approval.ticket_done != "auto" 时需要）。

### 执行流程

```
1. 显示 Ticket 完成摘要
2. 显示代码审查结果
3. 等待用户确认
4. 更新 Ticket 状态为 completed
5. 更新 STATE.yaml
```

---

## 示例

```
# 审批 Stories
/approve stories

# 审批 Tickets
/approve tickets

# 审批 Story 完成
/approve S-001

# 审批 Ticket 完成
/approve T-003
```
