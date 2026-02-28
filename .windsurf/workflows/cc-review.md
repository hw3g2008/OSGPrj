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

### 4. 最终交付审核（`/cc-review final`）

前置条件：`STATE.current_step == all_stories_done`

#### Step 1: 前置守卫（必须全通过）

```bash
python3 .claude/skills/workflow-engine/tests/story_runtime_guard.py \
  --state osg-spec-docs/tasks/STATE.yaml \
  --config .claude/project/config.yaml \
  --state-machine .claude/skills/workflow-engine/state-machine.yaml \
  --stories-dir osg-spec-docs/tasks/stories \
  --tickets-dir osg-spec-docs/tasks/tickets \
  --proofs-dir osg-spec-docs/tasks/proofs \
  --events osg-spec-docs/tasks/workflow-events.jsonl
python3 .claude/skills/workflow-engine/tests/story_event_log_check.py \
  --events osg-spec-docs/tasks/workflow-events.jsonl \
  --state osg-spec-docs/tasks/STATE.yaml
```
任一失败即停止，不进入后续步骤。

#### Step 2: 执行 Final Gate（一键脚本）

```bash
bash bin/final-gate.sh
```
包含 9 步：guard → event check → evidence guard(全 Story) → traceability → 前端 test → build → 后端 test → api-smoke → E2E。
后端未启动时 api-smoke 和 @api E2E 标 WARNING/SKIP（非 PASS）。

#### Step 3: TC 追踪链校验

```bash
python3 .claude/skills/workflow-engine/tests/traceability_guard.py \
  --cases osg-spec-docs/tasks/testing/{module}-test-cases.yaml \
  --matrix osg-spec-docs/tasks/testing/{module}-traceability-matrix.md
```
- 每个 AC 至少映射 1 条 TC
- 每条 TC 必须有 `automation.command`
- 已执行 TC 必须有 `latest_result.evidence_ref`
- `pending` 状态 TC = FAIL（`skip_no_backend` 允许但需标注原因）

#### Step 4: 集成断言

```bash
python3 .claude/skills/workflow-engine/tests/story_integration_assertions.py
```

#### Step 5: CC 整体审核（可选，推荐 P0 模块执行）

```bash
claude -p "整体审核：

项目状态：
$(cat osg-spec-docs/tasks/STATE.yaml)

Final Gate 结果：
$(cat osg-spec-docs/tasks/audit/final-gate-validation-*.md | tail -40)

检查项：
1. 所有 Stories 是否都已完成
2. Stories 之间的集成是否正确
3. Final Gate 是否有 WARNING/SKIP
4. 追踪矩阵 AC→TC 覆盖率是否 100%
5. 是否有遗漏的功能点

输出：通过/不通过 + 问题列表"
```

#### Step 6: 产出审计文档

创建 `osg-spec-docs/tasks/audit/cc-review-final-{date}.md`，包含：
- 每步命令 + exit_code + 结果
- 关键统计（tests/E2E pass 数、TC 覆盖率）
- WARNING/SKIP 项明细
- CC 审核结论（如执行）
- 最终判定：PASS / PARTIAL PASS / FAIL

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
