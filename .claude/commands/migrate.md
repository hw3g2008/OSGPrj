# /migrate 命令

## 用法

```bash
/migrate test-assets permission
/migrate test-assets permission S-001
```

## 说明

对历史 Story / Ticket / module test-case 资产做无状态 schema 迁移。

- 不调用 `transition()`
- 不写 `osg-spec-docs/tasks/STATE.yaml`
- 允许在 `all_stories_done` 这类终态模块上执行

## 执行流程

```text
1. 读取模块名与可选 story_id
2. 运行 python3 bin/sync-test-assets.py --module {module} [--story-id {story_id}]
3. 重建 {module}-test-cases.yaml 与 {module}-traceability-matrix.md
4. 运行 test_asset_completeness_guard.py 做 schema / obligation 校验
5. 输出迁移摘要与剩余真实 coverage gap
```

## 必跑命令

```bash
python3 bin/sync-test-assets.py --module {module}
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module {module}
```

Story 级局部迁移时：

```bash
python3 bin/sync-test-assets.py --module {module} --story-id {story_id}
python3 .claude/skills/workflow-engine/tests/test_asset_completeness_guard.py --module {module} --story-id {story_id}
```

## 结果解释

- 若报 `missing both category and scenario_obligation`：说明 schema 迁移还没生效或推导失败
- 若只剩 `scenario obligation gap`：说明 schema 已迁完，剩下是真实测试覆盖缺口

## 输出示例

```markdown
## 🔄 迁移完成

**Module**: permission
**Scope**: S-001

### 资产更新
- Story required_test_obligations 已补齐
- Ticket test_cases.category/scenario_obligation 已补齐
- module test-cases 已按 tc_id upsert
- traceability matrix 已重建

### Guard
PASS: schema migration complete
```
