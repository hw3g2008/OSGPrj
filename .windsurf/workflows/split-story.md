---
description: 将需求文档拆分为 User Stories（INVEST 原则）- 对应 CC 命令 /split story
---

# 拆分 Stories

## 前置条件

- 需求分析已完成（`workflow.current_step` 为 `brainstorm_done`）
- `osg-spec-docs/docs/02-requirements/srs/{module}.md` SRS 文档已存在（brainstorm 产物）
- 必须先通过独立守卫（硬门禁）：
  - `python3 .claude/skills/workflow-engine/tests/srs_guard.py --module {module}`
  - `python3 .claude/skills/workflow-engine/tests/decisions_guard.py --module {module} --allow-missing`
  - 任一失败即停止拆分（先修复 SRS/DECISIONS）

## 执行步骤

1. **读取 SRS 文档**
   - 读取 `osg-spec-docs/tasks/STATE.yaml` 获取当前需求模块
   - 读取对应的 SRS 文档（`osg-spec-docs/docs/02-requirements/srs/{module}.md`，brainstorm 产物，SSOT）

2. **执行前置守卫**
   - 执行 `srs_guard.py` 校验 SRS 结构与关键章节
   - 执行 `decisions_guard.py` 校验无未裁决决策
   - 任一失败立即停止，不进入拆分阶段

3. **拆分 Stories**
   - 调用 story-splitter skill
   - 按 INVEST 原则拆分为 User Stories
   - 每个 Story 包含：标题、描述（As a...I want...So that...）、验收标准、优先级
   - 该 skill 会自动进行多轮 INVEST/FR覆盖率校验（Phase 2）+ 增强全局终审（Phase 3：三维度终审 + A~I 多维度旋转校验，参见 quality-gate/SKILL.md）

4. **创建 Story 文件**
   - 在 `osg-spec-docs/tasks/stories/` 下创建 `S-xxx.yaml`
   - 更新 `STATE.yaml` 的 stories 列表

5. **输出摘要**
   - 列出所有 Stories 的编号、标题、优先级
   - 等待用户审批

6. **更新状态**
   - 更新 `workflow.current_step` 为 `story_split_done`
   - 等待用户审批（`/approve`）
