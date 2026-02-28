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

2. 运行前置守卫（必须通过）：
```bash
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py --state osg-spec-docs/tasks/STATE.yaml --config .claude/project/config.yaml --state-machine .claude/skills/workflow-engine/state-machine.yaml --stories-dir osg-spec-docs/tasks/stories --tickets-dir osg-spec-docs/tasks/tickets --proofs-dir osg-spec-docs/tasks/proofs
python3 .claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py --state osg-spec-docs/tasks/STATE.yaml --stories-dir osg-spec-docs/tasks/stories --tickets-dir osg-spec-docs/tasks/tickets --story-id "$STORY"
```

3. 执行 CC 审核：
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

## TC 资产校验（D6 挂点 — `/cc-review final` 专用）

当执行 `/cc-review final` 时，必须：
- 强制读取追踪矩阵与最终审计报告
- 运行 `traceability_guard.py` 校验追踪链完整性
- 任一 Story 缺少 `ticket/story/final` 三层证据即 FAIL

## 状态更新（必须经 transition() 统一入口）

Story 完成审核（类型 1）执行后，根据 CC 审核结果更新状态：

- **CC 审核通过**：
  - 调用 `transition("/cc-review", state, "story_done")`（W9）
  - 提示执行 `/approve` 完成 Story 审批

- **CC 审核不通过**：
  - 调用 `transition("/cc-review", state, "verification_failed", meta={"result":"failure"})`（W9）
  - 输出 CC 发现的问题列表
  - 提示修复后执行 `/verify` 重新验收

`transition()` 内部自动：写状态 → 推导审批标记 → 写事件 → postcheck。事件写入失败时自动回滚 STATE.yaml 并终止（见 workflow-engine/SKILL.md §5a）。

## 注意事项

- CC 审核是**可选的**，不是必须步骤
- 建议在 P0 Story 完成后和最终交付时使用
- CC 审核结果仅供参考，最终决策权在用户
