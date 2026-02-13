# Windsurf 主控 + Claude Code 顾问 集成方案

> WS 通过 Slash Command 驱动 RPIV 流程，CC 作为顾问在关键节点提供交叉验证。
>
> 最后更新：2026-02-13

---

## 1. 核心原则

1. **Skills 共享** — Windsurf 自动扫描 `.claude/skills/` 目录（Agent Skills 开放标准），两个 IDE 共享同一套 Skills，无需重复配置
2. **Workflow 驱动** — 用户通过 `/slash-command` 触发 `.windsurf/workflows/`，Workflow 编排流程，Skills 定义执行逻辑
3. **WS 是主力** — 写代码、写测试、自审、更新 STATE.yaml
4. **CC 是顾问** — 只在关键节点被调用（`/cc-review`），提供交叉验证

---

## 2. 架构总览

```
用户输入 /rpiv
    │
    ▼
┌─────────────────────────────────┐
│  .windsurf/workflows/rpiv.md   │  ← Workflow（调度器）
│  读取 STATE.yaml → 判断阶段    │
│  → 调用对应 Workflow            │
└──────────┬──────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
/brainstorm    /next        ...
    │             │
    ▼             ▼
┌─────────┐  ┌──────────────┐
│ Skills  │  │   Skills     │  ← .claude/skills/（执行引擎）
│ brain-  │  │ deliver-     │
│ storming│  │ ticket       │
└─────────┘  └──────────────┘
                   │
              ┌────┴────┐
              ▼         ▼
         test-design  test-execution  ← Skill 互相调用
```

**三层架构**：
- **Workflow 层**（`.windsurf/workflows/`）— 流程编排，用户通过 slash command 触发
- **Skill 层**（`.claude/skills/`）— 执行逻辑，Cascade 自动匹配 description 调用
- **状态层**（`osg-spec-docs/tasks/STATE.yaml`）— 持久化状态，驱动流程流转

---

## 3. 分工

| 角色 | 职责 | 触发方式 |
|------|------|---------|
| **Windsurf** | 主力执行：调用 Skills、写代码、写测试、自审、更新 STATE.yaml | `/slash-command` |
| **Claude Code** | 顾问审核：交叉验证、设计决策仲裁、异常问题分析 | `/cc-review` → `claude -p` |
| **用户** | 审批门控：Stories 审批、Tickets 审批、Story 验收确认 | 手动确认 |

---

## 4. Workflow 清单

所有 Workflow 存放在 `.windsurf/workflows/`，通过 `/name` 触发。
命令名称与 CC 端（CLAUDE.md）保持一致：

| Slash Command | 文件 | 功能 | 对应 Skill |
|--------------|------|------|-----------|
| `/brainstorm {模块}` | brainstorm.md | 需求分析，多轮正向/反向校验 | brainstorming |
| `/split-story` | split-story.md | 拆分 User Stories（INVEST 原则） | story-splitter |
| `/split-ticket S-xxx` | split-ticket.md | 拆分微任务 Tickets（2-5 分钟粒度） | ticket-splitter |
| `/approve` | approve.md | 审批 Stories 或 Tickets | — |
| `/next` | next.md | 执行下一个待办 Ticket | deliver-ticket |
| `/verify` | verify.md | 验收当前 Story | verification |
| `/status` | status.md | 查看项目进度 | — |
| `/checkpoint` | checkpoint.md | 保存工作检查点 | checkpoint-manager |
| `/save` | save.md | 保存进度到 STATE.yaml | — |
| `/restore` | restore.md | 恢复到之前的检查点 | — |
| `/rollback` | rollback.md | 回滚 Ticket/Story 变更 | — |
| `/rpiv` | rpiv.md | 主流程调度（WS 独有） | — |
| `/cc-review` | cc-review.md | CC 交叉审核（WS 独有） | — |

---

## 5. 完整 RPIV 链路

### 阶段 R — 需求分析（Requirement）

```
用户: /brainstorm admin-permission
  │
  ▼ Cascade 自动调用 brainstorming skill
  │
  ├── 读取 PRD 文档（current_requirement_path）
  ├── 多轮正向/反向校验（自动迭代）
  ├── 输出 brainstorm-{模块名}.md
  └── 更新 STATE.yaml → current_step: brainstorm_done
  │
  ▼
用户审阅需求文档 ← 【审批门控】
```

### 阶段 P — 拆分计划（Plan）

```
用户: /split-story
  │
  ▼ Cascade 自动调用 story-splitter skill
  │
  ├── 按 INVEST 原则拆分 Stories
  ├── 创建 S-xxx.yaml 文件
  └── 更新 STATE.yaml → stories 列表
  │
  ▼
用户: /approve ← 【审批门控】
  │
  ▼
用户: /split-ticket S-006
  │
  ▼ Cascade 自动调用 ticket-splitter skill
  │
  ├── 拆分为 2-5 分钟粒度的 Tickets
  ├── 创建 T-xxx.yaml 文件
  └── 更新 STATE.yaml → tickets 列表
  │
  ▼
用户: /approve ← 【审批门控】
```

### 阶段 I — 实现（Implement）

```
用户: /next
  │
  ▼ Cascade 自动调用 deliver-ticket skill
  │
  ├── 读取 T-xxx.yaml（type, allowed_paths, acceptance_criteria）
  ├── 根据 type 选择流程：
  │   ├── backend/database/test → TDD（先写测试再写代码）
  │   ├── frontend-ui → UI 还原
  │   ├── frontend → 前端功能
  │   └── config → 配置变更
  ├── 自动调用 test-design + test-execution skills
  ├── 自审清单 + verification_evidence
  └── 更新 STATE.yaml → completed_tickets
  │
  ▼
还有未完成 Tickets？
  ├── 是 → 用户: /next（继续）
  └── 否 → 进入阶段 V
```

### 阶段 V — 验收（Verify）

```
用户: /verify
  │
  ▼ Cascade 自动调用 verification skill
  │
  ├── 检查所有 acceptance_criteria
  ├── 检查 Tickets 集成质量
  ├── 输出验收报告
  └── 更新 STATE.yaml → completed_stories
  │
  ▼
用户: /cc-review（可选，建议 P0 Story）
  │
  ▼ 执行 claude -p 交叉审核
  │
  ▼
还有下一个 Story？
  ├── 是 → 回到阶段 P（/split-ticket）
  └── 否 → /cc-review final（最终交付审核）
```

### 快捷方式：/rpiv

```
用户: /rpiv
  │
  ▼ 读取 STATE.yaml
  │
  ├── idle / requirement_analysis → 提示 /brainstorm
  ├── brainstorm_done / planning → 提示 /split-story
  ├── stories_approved / implementing → 提示 /next
  ├── story_tickets_done → 提示 /verify
  └── all_stories_done → 输出完成摘要
```

---

## 6. CC 调用时机

| 时机 | Slash Command | 说明 |
|------|--------------|------|
| **Story 完成** | `/cc-review` | 验收通过后交叉验证（建议 P0） |
| **设计决策** | `/cc-review decision` | 多方案拿不定时让 CC 分析 |
| **异常问题** | `/cc-review issue` | 测试反复失败、依赖冲突 |
| **最终交付** | `/cc-review final` | 所有 Stories 完成后整体审核 |

### CC 审核 Prompt 模板

#### Story 完成审核

```bash
claude -p "审核 Story S-xxx：
$(cat osg-spec-docs/tasks/stories/S-xxx.yaml)

检查项：
1. 所有 acceptance_criteria 是否满足
2. Tickets 之间的集成是否正确
3. 是否有安全问题或明显 bug

输出：通过/不通过 + 问题列表"
```

#### 设计决策仲裁

```bash
claude -p "设计决策：
背景：{问题描述}
方案 A：{描述}
方案 B：{描述}
请分析各方案优劣，给出推荐"
```

#### 最终交付审核

```bash
claude -p "整体审核：
$(cat osg-spec-docs/tasks/STATE.yaml)
$(ls osg-spec-docs/tasks/stories/*.yaml | xargs cat)

检查项：
1. 所有 Stories 是否都已完成
2. Stories 之间的集成是否正确
3. 是否有遗漏的功能点

输出：通过/不通过 + 问题列表"
```

---

## 7. Token 消耗估算

以权限模块（5 Stories, 31 Tickets）为例：

| 环节 | CC 调用次数 | Token/次 | 总 Token |
|------|------------|----------|----------|
| Story 完成审核 | 5 | ~3K | 15K |
| 设计决策（估） | 2 | ~2K | 4K |
| 异常分析（估） | 3 | ~2K | 6K |
| 最终交付审核 | 1 | ~3K | 3K |
| **总计** | | | **~28K** |

对比纯 CC 执行 ~150K，**节省约 80%**。

---

## 8. 文件结构

```
OSGPrj/
├── .claude/
│   ├── skills/                  ← Skills 执行引擎（WS + CC 共享）
│   │   ├── brainstorming/SKILL.md
│   │   ├── story-splitter/SKILL.md
│   │   ├── ticket-splitter/SKILL.md
│   │   ├── deliver-ticket/SKILL.md
│   │   ├── verification/SKILL.md
│   │   ├── test-design/SKILL.md
│   │   ├── test-execution/SKILL.md
│   │   ├── tdd/SKILL.md
│   │   ├── code-review/SKILL.md
│   │   ├── debugging/SKILL.md
│   │   └── ... (20 个 Skills)
│   ├── project/config.yaml
│   └── CLAUDE.md
├── .windsurf/
│   └── workflows/               ← Workflow 调度层（仅 WS）
│       ├── brainstorm.md        → /brainstorm
│       ├── split-story.md       → /split-story
│       ├── split-ticket.md      → /split-ticket
│       ├── approve.md           → /approve
│       ├── next.md              → /next
│       ├── verify.md            → /verify
│       ├── status.md            → /status
│       ├── checkpoint.md        → /checkpoint
│       ├── save.md              → /save
│       ├── restore.md           → /restore
│       ├── rollback.md          → /rollback
│       ├── rpiv.md              → /rpiv (WS 独有)
│       └── cc-review.md         → /cc-review (WS 独有)
├── .windsurfrules               ← WS 全局规则
└── osg-spec-docs/tasks/
    ├── STATE.yaml               ← 状态持久化
    ├── stories/S-xxx.yaml       ← Story 定义
    ├── tickets/T-xxx.yaml       ← Ticket 定义
    └── brainstorm-*.md          ← 需求分析产物
```

---

## 9. 关键发现（2026-02-13 验证）

1. **Windsurf 支持 Agent Skills 开放标准** — 自动扫描 `.claude/skills/` 目录，不需要在 `.windsurf/skills/` 创建符号链接
2. **Workflows 只从 `.windsurf/workflows/` 加载** — 没有其他发现路径
3. **Skills 自动匹配** — Cascade 根据 SKILL.md 的 `description` 字段自动决定何时调用，不需要手动说"请读取 SKILL.md"
4. **Workflows 可互相调用** — `/rpiv` 内部可以引导执行 `/brainstorm`、`/next` 等

---

## 10. 统一门控模式 v2（改进方向）

> 状态：待实施。以下为分析结论和改进设计，需授权后修改 `.claude/skills/` 中的 Skill 文件。

### 10.1 当前门控现状

每个环节的 Skill 内置校验：

| 环节 | 质量校验 | 覆盖率校验 | 多轮迭代 | 失败退出 | 全局终审 | 审批门控 |
|------|---------|-----------|---------|---------|---------|---------|
| /brainstorm | ✅ 5正+6反 | ❌ 缺失 | ✅ 10轮 | ✅ | ❌ 缺失 | auto |
| /split story | ✅ INVEST 6项 | ✅ FR↔Story 100% | ✅ 5轮 | ✅ | ❌ 缺失 | **required** |
| /split ticket | ✅ 6项质量 | ✅ AC↔Ticket 100% | ✅ 有循环 | ⚠️ 不明确 | ❌ 缺失 | auto |
| /next (deliver) | ✅ 4层门控 | ✅ 覆盖率门槛 | ✅ 3次重试 | ✅ | ❌ 缺失 | auto |
| /verify | ✅ 3项检查 | ❌ 缺失 | ⚠️ 不明确 | ⚠️ 不明确 | ❌ 缺失 | auto |

审批配置（`config.yaml`）：
- `story_split: required` — 唯一强制用户审批点
- `ticket_split: auto`
- `ticket_done: auto`
- `story_done: auto`

### 10.2 发现的问题

1. **`/brainstorm` 缺覆盖率校验** — 没有检查需求是否覆盖 PRD 所有功能点
2. **`/split ticket` 失败退出规则不明确** — 缺少 max_iterations 和失败退出逻辑
3. **`/verify` 缺多轮迭代和失败退出** — 验收不通过时处理逻辑不够明确
4. **所有环节缺少 Phase 3（全局终审）** — 修复后只重跑检查项，没有从全局角度重新审视

### 10.3 统一门控模式 v2 设计

每个环节必须经过 5 个 Phase：

```
Phase 1: 生成产物
    │
    ▼
Phase 2: 逐项校验 + 修复循环
    │  while (iteration < max_iterations):
    │    ├── 跑所有检查项（环节专属）
    │    ├── 有问题 → 修复 → continue（回到循环开头全部重跑）
    │    └── 全 ✅ → 进入 Phase 3
    │
    ▼
Phase 3: 全局终审（Final Review）  ← 新增
    │  修复完所有问题后，从不同角度重新审视整个产物：
    │    ├── 上游一致性：和上一环节的产物对齐吗？
    │    ├── 下游可行性：下一环节能顺利执行吗？
    │    └── 全局完整性：有没有遗漏或冲突？
    │  ├── 全 ✅ → Phase 4
    │  └── 有 ❌ → 回到 Phase 2
    │
    ▼
Phase 4: 输出产物 + 更新 STATE.yaml（仅 Phase 3 通过后）
    │
    ▼
Phase 5: 审批门控（根据 config.approval 决定 auto 或 required）
```

### 10.4 每个环节的全局终审（Phase 3）检查项

| 环节 | 上游一致性 | 下游可行性 | 全局完整性 |
|------|-----------|-----------|-----------|
| /brainstorm | PRD 功能点 100% 覆盖？ | 可拆分为 Stories？ | 需求之间无矛盾？ |
| /split story | 需求文档 FR 100% 覆盖？ | 每个 Story 可拆为 Tickets？ | Stories 之间无重叠？ |
| /split ticket | Story AC 100% 覆盖？ | 每个 Ticket 可独立执行？ | Tickets 依赖链完整无环？ |
| /next | Ticket AC 全满足？ | 不破坏其他 Ticket 代码？ | 测试全通过 + 覆盖率达标？ |
| /verify | 所有 Tickets 有证据？ | 和其他 Stories 集成无冲突？ | 所有 AC 满足？ |

### 10.5 待实施清单

- [ ] 补充 `/brainstorm` 的 PRD 覆盖率校验
- [ ] 补充 `/split ticket` 的 max_iterations 和失败退出逻辑
- [ ] 补充 `/verify` 的多轮迭代和失败退出逻辑
- [ ] 为所有 5 个环节添加 Phase 3（全局终审）
- [ ] 考虑是否将 `ticket_split` 或 `story_done` 改为 `required`
