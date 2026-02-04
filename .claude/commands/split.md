# /split 命令

## 用法

```
/split story              # 将需求拆解为 Stories
/split ticket S-xxx       # 将 Story 拆解为 Tickets
```

## /split story

### 说明

将需求文档拆解为符合 INVEST 原则的 User Stories。

### 执行流程

```
1. 触发 Planner Agent
2. 加载 story-splitter Skill
3. 读取需求文档
4. 按功能模块拆分
5. INVEST 原则校验
6. 生成 Story YAML 文件
7. 更新 STATE.yaml
8. 更新 workflow:
   - current_step = "story_split_done"
   - next_step = "approve_stories"
```

### 输出

- `osg-spec-docs/tasks/stories/S-001.yaml`
- `osg-spec-docs/tasks/stories/S-002.yaml`
- ...

### 下一步

等待审批：`/approve stories`

---

## /split ticket S-xxx

### 说明

将指定 Story 拆解为 2-5 分钟的微任务 Tickets。

### 执行流程

```
1. 触发 Planner Agent
2. 加载 ticket-splitter Skill
3. 读取 Story 定义
4. 拆解为微任务
5. 分配 allowed_paths
6. 分析依赖关系
7. 生成 Ticket YAML 文件
8. 更新 STATE.yaml
9. 更新 workflow:
   - current_step = "ticket_split_done"
   - next_step = "approve_tickets"
```

### 输出

- `osg-spec-docs/tasks/tickets/T-001.yaml`
- `osg-spec-docs/tasks/tickets/T-002.yaml`
- ...

### 下一步

等待审批：`/approve tickets`

---

## 示例

```
# 拆分 Stories
/split story

# 拆分指定 Story 的 Tickets
/split ticket S-001
```
