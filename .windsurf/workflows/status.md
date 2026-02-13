---
description: 查看项目当前进度和状态
---

# 查看项目状态

1. 读取状态文件：
```
cat osg-spec-docs/tasks/STATE.yaml
```

2. 汇总输出以下信息：
   - **当前阶段**：workflow.current_step 的值
   - **当前需求**：current_requirement
   - **Stories 进度**：completed_stories 数量 / total_stories
   - **Tickets 进度**：completed_tickets 数量 / total_tickets
   - **当前任务**：current_story + current_ticket（如果有）
   - **阻塞项**：blockers（如果有）

3. 如果有未完成的 Stories，列出每个 Story 的状态：
```
cat osg-spec-docs/tasks/stories/S-*.yaml | grep -E "^(id|title|status):"
```

4. 如果有当前 Story 的未完成 Tickets，列出：
```
cat osg-spec-docs/tasks/tickets/T-*.yaml | grep -E "^(id|title|status):"
```

5. 以表格形式输出进度摘要。
