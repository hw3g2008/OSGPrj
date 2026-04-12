# 一人公司 AI 开发框架

> 基于 RPIV 工作流（Research → Plan → Implement → Validate）的 AI 自主开发框架。

## 设计原则

1. **一看就懂** — 流程图画出来，5 秒内能理解走向
2. **每个节点只做一件事** — 不混合多种职责
3. **出口统一** — 同类结果走同一条路，不搞特殊分支
4. **上游有问题就停** — 不带着错误往下跑，不浪费后续环节
5. **最少概念** — 能用一个状态解决的不用两个，能用一个文件解决的不用两个
6. **最短路径** — 不过度设计，先跑通再优化
7. **改动自洽** — 改了 A 就检查所有引用 A 的地方
8. **简约不等于省略** — 逻辑要简单清晰，但每个必要步骤和输出都不能省。不加假条件、不跳过校验、不吞掉产物

## 禁止行为

1. **不要停下来问用户** - Skills 自动迭代执行，直到完成或需要审批
2. **不要凭记忆** - 每次必须读取 STATE.yaml 和 config.yaml
3. **不要假设** - 所有信息从文件中读取
4. **不要硬编码** - 技术栈、路径、命令从 config.yaml 读取
5. **不要跳过验证** - Ticket 完成前必须执行验证命令并记录证据
6. **不要伪造证据** - verification_evidence 必须来自实际命令执行结果

## 会话启动

每次会话开始时，先读取 `osg-spec-docs/tasks/STATE.yaml` 与 `.claude/project/config.yaml`。状态推进由对应 Skill 自行更新，此处只负责读取和输出摘要，不重复写入 `workflow`。

```
1. 读取 osg-spec-docs/tasks/STATE.yaml
2. 读取 .claude/project/config.yaml
3. 输出当前状态摘要：
   - 项目: {state.project}
   - 当前 Story: {state.current_story}
   - 当前 Ticket: {state.current_ticket}
   - 工作流: {state.workflow.current_step} → {state.workflow.next_step}
```

## 工作流引擎

状态机逻辑由 `workflow-engine` skill 管理：
- `.claude/skills/workflow-engine/SKILL.md` - 核心逻辑
- `.claude/skills/workflow-engine/state-machine.yaml` - 状态定义（单一来源）
- `.claude/skills/workflow-engine/references/state-diagram.md` - 状态转换图

控制面 / 执行面分层：
- `workflow.*` 是 **control plane** 真源，只描述 Story 生命周期与审批门控
- `execution.*` 是 **execution plane** 投影，只描述 runnable set、lease、workspace/worktree、scheduler 运行态
- `current_story / current_ticket` 保留为 **materialized focus**，用于兼容现有命令面
- workflow 只能通过 `workflow-engine.transition()` 推进，禁止出现第二套状态推进逻辑

审批映射由 `config.approval` 驱动：
- `story_split` → `approve_stories`
- `ticket_split` → `approve_tickets`
- `story_done` → `approve_story`
- `ticket_done` → `next`

后端与并发能力由 `config.yaml` 驱动：
- `workflow_backend.type`：`yaml | git`
- `execution_backend.type`：`inline | git_worktree`
- `parallel_execution.enabled`
- `parallel_execution.max_stories`
- `parallel_execution.max_tickets_per_story`

每个命令完成后，自动检查是否继续执行下一步。

## 核心命令

| 命令 | 说明 |
|------|------|
| `/brainstorm` | 需求分析 |
| `/plan-deliver` | 从 brainstorm 到 ticket delivery 的简化入口 |
| `/split story` | 拆解为 Stories |
| `/split ticket S-xxx` | 拆解为 Tickets |
| `/approve` | 审批 |
| `/next` | 执行下一个 runnable Ticket |
| `/verify S-xxx` | 验收 Story |
| `/status` | 查看当前状态 |
| `/checkpoint` | 保存检查点 |
| `/save` | 保存进度 |
| `/restore` | 恢复检查点 |
| `/rollback` | 回滚变更 |
| `/ui-closure` | 独立 UI 收口引擎（不依赖 RPIV） |

## 边界情况

| 场景 | 正确处理 |
|------|----------|
| `brainstorm_pending_confirm` | 停下并执行 `/approve brainstorm` |
| `story_split_done` 且 `approval.story_split=required` | 停下并执行 `/approve stories` |
| `story_split_done` 且 `approval.story_split=auto` | 自动继续到 `/approve stories` |
| `ticket_split_done` 且 `approval.ticket_split=required` | 停下并执行 `/approve tickets` |
| `ticket_split_done` 且 `approval.ticket_split=auto` | 自动继续到 `/approve tickets` |
| `story_verified` 且 `approval.story_done=required` | 停下并执行 `/approve {current_story}` |
| `story_verified` 且 `approval.story_done=auto` | 自动分发 `/approve {current_story}` |
| 当前 Story 无 remaining Ticket | 停下并执行 `/verify {current_story}` 或 `/approve {current_story}` |
| 当前 Story 有 remaining Ticket 但无 runnable Ticket | 停下并等待依赖解除、lease 释放或冲突消失 |
| 所有 Stories 完成 | 停下并执行 `/final-closure {module}` |
| 前端 Ticket 命中 `frontend_preflight.mode=manual` | 停下并先执行 frontend preflight |

## Agent 分派

根据 Ticket 类型自动分派：

| 类型 | Agent |
|------|-------|
| backend | backend-java |
| frontend | frontend-vue |
| frontend-ui | frontend-admin |
| database | dba-mysql |
| test | 根据关联 Story 判断 |
| config | backend-java |

> 说明：前端专门化仍由 Agent 分派负责；当 `config.frontend_preflight` 启用时，`deliver-ticket` 会在 `frontend` / `frontend-ui` 的既有实现流之前，追加一个可选的 `frontend-delivery-preflight` 前置步骤。该步骤不是新的 workflow state。

## 调度与并行语义

`/next` 与 `ralph-loop` 的外部命令面保持稳定，但内部已升级为 scheduler + backend dispatch：
- scheduler 负责选择 runnable Ticket
- execution backend 负责 inline workspace 或 git worktree 执行位点
- 默认仍是串行兼容模式：
  - `parallel_execution.enabled = false`
  - `parallel_execution.max_stories = 1`
  - `parallel_execution.max_tickets_per_story = 1`
- 首轮并行能力只建议用于**同一 Story 内 Ticket 并行**
- multi-story parallel 仍需受 `story_parallel_mode` 与 lease / barrier / restore 能力约束

## 测试要求

详见 `.claude/rules/testing.md`

| 类型 | 分支覆盖率 | 行覆盖率 |
|------|-----------|---------|
| backend / database / test | **100%** | ≥ 90% |
| frontend | ≥ 90% | ≥ 80% |
| frontend-ui | ≥ 80% | ≥ 70% |

## 规范引用

| 技术 | 规范 |
|------|------|
| Java | 阿里巴巴 Java 开发手册 + `.claude/project/rules/java.md` |
| Vue | Vue 官方风格指南 + `.claude/project/rules/vue.md` |
| SQL | `.claude/project/rules/sql.md` |
| 测试 | `.claude/rules/testing.md` |

## 配置文件

- 项目配置: `.claude/project/config.yaml`
- 当前状态: `osg-spec-docs/tasks/STATE.yaml`
- Skills: `.claude/skills/`（当前 32 个）
- Agents: `.claude/agents/`（当前 10 个）

---

## 框架修改规则

修改 `.claude/` 下的框架文件时，必须遵守：

1. **skills/ 禁止项目专属内容** - Skills 中不得出现项目名称、具体技术框架名、具体文件路径。使用 `${config.*}` 引用或通用描述代替。
2. **新增概念必须全局传播** - 新增 type / Agent / config 路径后，更新所有引用点。
3. **状态机修改必须同步** - 修改 `state-machine.yaml` 后，同步更新 SKILL.md 中的伪代码和 references/state-diagram.md。

### 修改后必查清单

**新增 Ticket type 时**：
- [ ] `skills/workflow-engine/state-machine.yaml` - 如果影响状态转换
- [ ] `project/config.yaml` - developers 列表
- [ ] `CLAUDE.md` - Agent 分派表

**修改状态机时**：
- [ ] `skills/workflow-engine/state-machine.yaml` - 状态定义
- [ ] `skills/workflow-engine/SKILL.md` - 伪代码
- [ ] `skills/workflow-engine/references/state-diagram.md` - 状态图

**修改 backend / execution / parallel 模型时**：
- [ ] `project/config.yaml` - backend / parallel 配置
- [ ] `templates/state.yaml` - execution projection
- [ ] `templates/checkpoint.yaml` - execution projection snapshot
- [ ] `commands/next.md` - scheduler 语义
- [ ] `skills/ralph-loop/SKILL.md` - execution coordinator 语义
- [ ] `skills/checkpoint-manager/SKILL.md` - restore projection

### 修改后强制审计

任何框架文件修改完成后，必须执行 `framework-audit` Skill 进行全局一致性审计。
