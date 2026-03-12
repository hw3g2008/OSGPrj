---
description: 迁移模块测试资产到 scenario-obligation 新 schema（无状态，不推进 RPIV 状态机）
---

# 迁移测试资产

## 使用方式

```bash
/migrate test-assets permission
/migrate test-assets permission S-001
```

## 执行步骤

1. **读取参数**
   - `module`
   - 可选 `story_id`

2. **执行迁移脚本**
   - 运行：
     - `python3 bin/sync-test-assets.py --module {module}`
   - 若指定 `story_id`：
     - `python3 bin/sync-test-assets.py --module {module} --story-id {story_id}`

3. **执行迁移后守卫**
   - 全模块：
     - `python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module {module}`
   - 单 Story：
     - `python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module {module} --story-id {story_id}`

4. **输出结果**
   - 迁移成功的 Story / Ticket / TC 数量
   - 是否仍存在 `scenario obligation gap`

## 约束

- 不调用 `transition()`
- 不写 `STATE.yaml`
- 不要求当前模块处于 planning 阶段
- 只允许更新：
  - `osg-spec-docs/tasks/stories/*.yaml`
  - `osg-spec-docs/tasks/tickets/*.yaml`
  - `osg-spec-docs/tasks/testing/{module}-test-cases.yaml`
  - `osg-spec-docs/tasks/testing/{module}-traceability-matrix.md`
