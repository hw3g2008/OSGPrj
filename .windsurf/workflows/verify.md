---
description: 验收当前 Story - 检查所有 Tickets 完成情况和集成质量
---

# 验收 Story

## 前置条件

- 当前 Story 的所有 Tickets 状态为 `done`

## 执行步骤

1. **读取 Story 和 Tickets**
   - 读取 `osg-spec-docs/tasks/STATE.yaml` 获取 `current_story`
   - 读取 Story 定义和所有关联 Tickets

2. **执行验收检查**
   - 调用 verification skill
   - 检查项：
     - 所有 acceptance_criteria 是否满足
     - Tickets 之间的集成是否正确
     - 代码质量（无明显 bug、安全问题）
     - 测试覆盖率是否达标

3. **输出验收报告**
   - 通过/不通过
   - 每个验收标准的检查结果
   - 发现的问题列表（如有）

4. **如果需要 CC 审核**
   - 对于关键 Story（P0 优先级），建议执行 `/cc-review`
   - CC 审核是可选的，用户可以跳过

5. **更新状态**
   - 验收通过：更新 Story 状态为 `done`，加入 `completed_stories`
   - 验收不通过：列出需要修复的问题，保持 `implementing` 状态
   - 检查是否还有下一个 Story
     - 有 → 设置 `current_story` 为下一个，提示 `/split-tickets`
     - 没有 → 更新 `workflow.current_step` 为 `all_stories_done`
