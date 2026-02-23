# /approve 命令

## 用法

```
/approve brainstorm       # 产品确认决策日志后继续
/approve stories          # 审批 Story 拆分
/approve tickets          # 审批 Ticket 拆分
/approve S-xxx            # 审批 Story 完成
/approve T-xxx            # 审批 Ticket 完成
```

## /approve brainstorm

### 说明

根据 DECISIONS.md 中的来源（phase0/phase4）区分处理路径。

### 前提条件

- `workflow.current_step` = `brainstorm_pending_confirm`
- `{module}-DECISIONS.md` 存在

### 执行流程

```
1. 读取 STATE.yaml，确认 current_step = brainstorm_pending_confirm
2. 读取 config.yaml 获取 srs_dir
3. 读取 {module}-DECISIONS.md 中 pending 或 (resolved && 已应用=false) 的记录
4. Guard 检查：
   - 空集 → 失败（含 phase0 rejected 诊断）
   - source 缺失 → 失败
   - source 混合 → 失败
5a. source=phase0:
   - Guard: pending 存在 → 报错（PM 未裁决完）
   - 读取 resolved 裁决 → 更新 PRD → 标记已应用
   - 不写 STATE.yaml → 同步调用 /brainstorm {module}
5b. source=phase4:
   - Guard: resolved&&未应用 存在 → 报错（应走重新 /brainstorm）
   - 标记 pending 为 rejected（跳过语义）
   - 更新 workflow: brainstorm_done / split_story / auto_continue=true
```

### 下一步

- **phase0**: 同步执行 `/brainstorm {module}`（由 brainstorm 管理最终状态）
- **phase4**: 自动继续执行 `/split story`

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
   - current_step = "tickets_approved"
   - next_step = "next"
```

### 下一步

自动执行 `/next` 开始执行第一个 Ticket

---

## /approve S-xxx

### 说明

审批指定 Story 完成。

### 前提条件

- `workflow.current_step` = `story_verified`（/verify 通过）或 `story_done`（/cc-review 通过）
- Story 的所有 Tickets 已完成
- 所有验收标准已验证

### 执行流程

```
1. 显示 Story 验收报告摘要（来自 /verify 或 /cc-review 的结果）
2. 等待用户确认
3. 更新 Story 状态为 completed
4. 检查是否是最后一个 Story:
   - 如果还有 pending Stories → 设置 workflow.current_step = "story_approved"
   - 如果是最后一个 → 设置 workflow.current_step = "all_stories_done"
5. 更新 STATE.yaml
```

### 完成判断

```python
def check_story_completion(state):
    state_before = deep_copy(state)  # 事件写入失败时回滚用
    pending_stories = [s for s in state.stories if s.status == "pending"]
    
    if len(pending_stories) == 0:
        # 所有 Stories 完成
        state.workflow.current_step = "all_stories_done"
        state.workflow.next_step = None
        write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
        # 事件审计（W8a）
        append_workflow_event(build_event(command="/approve", state_from="story_verified", state_to="all_stories_done"))
        return "all_done"
    else:
        # 还有待处理的 Story
        state.workflow.current_step = "story_approved"
        state.workflow.next_step = "next_story"
        write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
        # 事件审计（W8a）
        append_workflow_event(build_event(command="/approve", state_from="story_verified", state_to="story_approved"))
        return "continue"
```

> 事件写入失败时回滚 STATE.yaml 并终止（见 workflow-engine/SKILL.md §6）。

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
