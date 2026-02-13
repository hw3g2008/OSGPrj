---
description: 将需求文档拆分为 User Stories（INVEST 原则）- 对应 CC 命令 /split story
---

# 拆分 Stories

## 前置条件

- 需求分析已完成（`workflow.current_step` 为 `brainstorm_done`）
- `osg-spec-docs/tasks/` 下存在 brainstorm 文档

## 执行步骤

1. **读取需求文档**
   - 读取 `osg-spec-docs/tasks/STATE.yaml` 获取当前需求
   - 读取对应的 brainstorm 文档

2. **拆分 Stories**
   - 调用 story-splitter skill
   - 按 INVEST 原则拆分为 User Stories
   - 每个 Story 包含：标题、描述（As a...I want...So that...）、验收标准、优先级

3. **创建 Story 文件**
   - 在 `osg-spec-docs/tasks/stories/` 下创建 `S-xxx.yaml`
   - 更新 `STATE.yaml` 的 stories 列表

4. **输出摘要**
   - 列出所有 Stories 的编号、标题、优先级
   - 等待用户审批

5. **更新状态**
   - 更新 `workflow.current_step` 为 `stories_pending_approval`
   - 用户审批后更新为 `stories_approved`
