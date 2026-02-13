# 一人公司 AI 开发框架

> 基于 RPIV 工作流（Research → Plan → Implement → Validate）的 AI 自主开发框架。

## 禁止行为

1. **不要停下来问用户** - Skills 自动迭代执行，直到完成或需要审批
2. **不要凭记忆** - 每次必须读取 STATE.yaml 和 config.yaml
3. **不要假设** - 所有信息从文件中读取
4. **不要硬编码** - 技术栈、路径、命令从 config.yaml 读取
5. **不要跳过验证** - Ticket 完成前必须执行验证命令并记录证据
6. **不要伪造证据** - verification_evidence 必须来自实际命令执行结果

## 会话启动

每次会话开始时，读取状态并输出摘要：

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

每个命令完成后，自动检查是否继续执行下一步。

## 核心命令

| 命令 | 说明 |
|------|------|
| `/brainstorm` | 需求分析 |
| `/split story` | 拆解为 Stories |
| `/split ticket S-xxx` | 拆解为 Tickets |
| `/approve` | 审批 |
| `/next` | 执行下一个 Ticket |
| `/verify S-xxx` | 验收 Story |
| `/status` | 查看当前状态 |
| `/checkpoint` | 保存检查点 |
| `/save` | 保存进度 |
| `/restore` | 恢复检查点 |
| `/rollback` | 回滚变更 |

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
- Skills: `.claude/skills/`
- Agents: `.claude/agents/`

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

### 修改后强制审计

任何框架文件修改完成后，必须执行 `framework-audit` Skill 进行全局一致性审计。
