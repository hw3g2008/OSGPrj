---
description: 调用 Claude Code 进行交叉审核
---

# CC 交叉审核

## 使用方式

```
/cc-review [story|decision|issue|final]
```

## 审核类型

### 1. Story 完成审核（默认）

当前 Story 验收通过后，调用 CC 进行交叉验证：

1. 先检查 current_story 是否存在：
```bash
STORY=$(grep current_story osg-spec-docs/tasks/STATE.yaml | awk '{print $2}')
if [ "$STORY" = "null" ] || [ -z "$STORY" ]; then
  echo "错误：当前没有活跃的 Story，无法执行审核"
  exit 1
fi
```

2. 执行 CC 审核：
```bash
claude -p "审核 Story $STORY：

Story 定义：
$(cat osg-spec-docs/tasks/stories/$STORY.yaml)

检查项：
1. 所有 acceptance_criteria 是否满足
2. Tickets 之间的集成是否正确
3. 是否有安全问题或明显 bug

输出：通过/不通过 + 问题列表"
```

### 2. 设计决策仲裁

```bash
claude -p "设计决策：

背景：{问题描述}

方案 A：{描述}
方案 B：{描述}

请分析各方案优劣，给出推荐"
```

### 3. 异常问题分析

```bash
claude -p "问题分析：

现象：{错误描述}

已尝试：
1. {尝试 1}
2. {尝试 2}

请帮我分析可能的原因和解决方案"
```

### 4. 最终交付审核

当所有 Stories 完成后：

```bash
claude -p "整体审核：

项目状态：
$(cat osg-spec-docs/tasks/STATE.yaml)

检查项：
1. 所有 Stories 是否都已完成
2. Stories 之间的集成是否正确
3. 是否有遗漏的功能点

输出：通过/不通过 + 问题列表"
```

## 状态更新

Story 完成审核（类型 1）执行后，根据 CC 审核结果更新状态：

- **CC 审核通过**：
  - 设置 `workflow.current_step = story_done`
  - 设置 `workflow.next_step = approve_story`
  - 提示执行 `/approve` 完成 Story 审批

- **CC 审核不通过**：
  - 设置 `workflow.current_step = verification_failed`
  - 设置 `workflow.next_step = null`（暂停等用户修复）
  - 输出 CC 发现的问题列表
  - 提示修复后执行 `/verify` 重新验收

### 事件审计（W7）

状态更新后，调用 `append_workflow_event(build_event(command="/cc-review", state_from=old_step, state_to=new_step))`。写入失败时回滚 STATE.yaml 并终止（见 workflow-engine/SKILL.md §6）。

## 注意事项

- CC 审核是**可选的**，不是必须步骤
- 建议在 P0 Story 完成后和最终交付时使用
- CC 审核结果仅供参考，最终决策权在用户
