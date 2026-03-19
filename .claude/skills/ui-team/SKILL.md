---
name: ui-team
description: "并行 Agent Team 编排器 — 将模块按子区域分派给多个 frontend-admin Agent 并行执行 UI 还原，完成后统一收口"
metadata:
  invoked-by: "command"
  auto-execute: "true"
---

# UI Team Skill

## 概览

将一个前端模块的 UI 还原工作按**子区域**拆分为 N 个独立任务，分派给 N 个并行 Agent 同时执行，完成后执行统一收口验证。

**核心价值**：将串行的逐页面还原改为并行，速度提升 N 倍，同时保持 RPIV 的 UI 收口标准。

## 何时使用

- 模块已完成 RPIV 全流程（`all_stories_done`）
- 需要对多个子区域同时进行 UI 还原或修复
- 用户执行 `/ui-team [module]` 命令

## 架构

```
┌─────────────────────────────────────────────────┐
│                  UI Team 编排器                    │
│  1. 读取 prototype-map（原型行号映射）              │
│  2. 读取当前 Vue 文件清单                          │
│  3. 并行分派 N 个 Agent（各带独立 zone）            │
│  4. 等待全部完成                                   │
│  5. Build 验证                                    │
│  6. /final-closure 收口                           │
└──────────┬──────────┬──────────┬──────────┬──────┘
           │          │          │          │
     ┌─────▼────┐┌────▼─────┐┌──▼───────┐┌▼────────┐
     │ Agent 1  ││ Agent 2  ││ Agent 3  ││ Agent 4  │
     │ Zone A   ││ Zone B   ││ Zone C   ││ Zone D   │
     │(独立目录) ││(独立目录) ││(独立目录) ││(独立目录) │
     └──────────┘└──────────┘└──────────┘└──────────┘
```

## 前置条件

1. STATE.yaml 的 `workflow.current_step` = `all_stories_done`
2. 目标模块在 `config.yaml` 的 `prd_process.module_prototype_map` 中有定义
3. 原型文件存在于 `${config.paths.docs.prototypes}`

## Zone 定义

每个 Zone 是一组**文件路径不重叠**的页面集合。Zone 定义存储在 `ui-closure/zones/` 目录下（由 ui-closure 引擎统一管理），按模块命名。

### Zone 文件格式

```yaml
# zones/{module}.yaml
module: admin
prototype_file: "osg-spec-docs/source/prototype/admin.html"

zones:
  - name: "用户中心"
    id: users
    vue_dir: "osg-frontend/packages/admin/src/views/users/"
    pages:
      - page_id: page-students
        prototype_lines: [502, 832]
        vue_files:
          - "students/index.vue"
          - "students/components/*.vue"
      # ... more pages
    modals:
      - modal_id: modal-status-change
        prototype_lines: [1338, 1375]
      # ... more modals

  - name: "求职中心"
    id: career
    # ...
```

## 执行流程

```python
def ui_team(module):
    # ─── Phase 0: 前置校验 ───
    state = load_yaml("osg-spec-docs/tasks/STATE.yaml")
    config = load_yaml(".claude/project/config.yaml")

    if state.workflow.current_step != "all_stories_done":
        warn("当前状态非 all_stories_done，UI Team 仅用于收口阶段")

    # ─── Phase 1: 加载 Zone 映射 ───
    zone_file = f".claude/skills/ui-closure/zones/{module}.yaml"
    zones = load_yaml(zone_file)
    prototype_file = zones.prototype_file

    # ─── Phase 2: 并行分派（调用 ui-closure 引擎） ───
    # 使用 Agent tool 并行分派，每个 Agent 执行 /ui-closure {module} --zone {zone_id}
    agents = []
    for zone in zones.zones:
        agent = Agent(
            subagent_type="developer",
            description=f"UI closure: {zone.id}",
            prompt=f"/ui-closure {module} --zone {zone.id}",
            run_in_background=True
        )
        agents.append(agent)

    # ─── Phase 3: 等待全部完成 ───
    results = []
    for agent in agents:
        result = TaskOutput(task_id=agent.id, block=True)
        results.append(result)

    # ─── Phase 4: 汇总变更 ───
    summary = aggregate_changes(results)
    report_to_user(summary)

    # ─── Phase 5-6: 模块级收口（委托 ui-closure 引擎） ───
    # Build + Visual Gate + Guards 由 ui-closure 统一执行
    run("/ui-closure {module} --mode module")

    # 全部通过后提示用户：可选执行 /final-closure 做全量验收
```

## Agent Prompt 模板

每个 Agent 收到的 prompt 委托给 ui-closure 引擎：

```markdown
执行 /ui-closure {module} --zone {zone.id}

Zone 定义文件: .claude/skills/ui-closure/zones/{module}.yaml
```

ui-closure 引擎会自动加载 zone 定义、原型文件、CONTRACT，并执行完整的 5-Phase 收口流程。
详见 `.claude/skills/ui-closure/SKILL.md`。

## 收口标准

UI Team 的收口委托给 ui-closure 引擎执行。详见 `.claude/skills/ui-closure/SKILL.md` Layer 3。

ui-closure 继承 RPIV final-gate 中的 UI 相关 gate：
- Build
- ui-visual-gate.sh（CONTRACT 存在时）
- ui_critical_evidence_guard（CONTRACT 存在时）
- delivery_truth_guard（DELIVERY-CONTRACT 存在时）
- delivery_content_guard（DELIVERY-CONTRACT 存在时）
- Lint

**推荐工作流**：`/ui-team` → ui-closure 快速迭代 → `/final-closure` 全量验收

## 禁止行为

1. **不得跨 zone 修改文件** — 每个 Agent 只改自己 zone 内的文件
2. **不得修改共享组件** — `shared/src/components/` 等公共文件需要单独处理
3. **不得修改路由/权限** — 只改 UI 呈现层
4. **不得新建文件** — 只修改现有 Vue 文件
5. **不得伪造对齐** — 所有修改必须有原型行号出处

## 失败处理

| 失败类型 | 处理方式 |
|----------|----------|
| Agent 执行失败 | 记录失败 zone，其他 zone 继续；完成后报告失败清单 |
| Build 失败 | 分析错误，定位到具体 zone，通知对应 Agent 修复 |
| Final-closure 失败 | 根据审计报告定位具体页面/检查项，返回给用户决策 |
| 文件冲突 | Zone 定义保证不重叠，如发现冲突立即停止报告 |
