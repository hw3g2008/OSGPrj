# Brainstorm Approve 流程修复方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- **一句话**：修复 `/approve brainstorm` 流程——Phase 0 安全阀触发后 approve 不能直接 brainstorm_done（SRS 还没生成），必须重新执行 /brainstorm
- **验收标准**：
  1. Phase 0 安全阀触发后，`/approve brainstorm` 裁决完成后重新执行 /brainstorm（PRD 已存在 → Phase 1~4 生成 SRS），不跳过 SRS 生成
  2. Phase 4 B/C/D 类触发后，`/approve brainstorm` 保持现有“跳过”语义（PM 认为不影响），直接 brainstorm_done
  3. DECISIONS.md 中标注来源（Phase 0 或 Phase 4），approve 流程据此选择处理路径

## 二、前置条件与假设

- 假设 1: Phase 0 安全阀和 Phase 4 B/C/D 不会同时产生待决策记录——**结构性保证**：Phase 0 安全阀触发后 `return` 停止，不执行 Phase 1~4
- 假设 2: 用 DECISIONS.md 替代 open-questions.md 作为单一事实源。每条记录必填 `source`（phase0/phase4）、`status`（pending/resolved/rejected）。全新框架无历史产物，不需要向后兼容
- 假设 3: Phase 0 approve 后重新执行 brainstorming 时，PRD 已经存在（Phase 0 至少跑过一轮），所以 Phase 0 会走"使用已有 PRD"分支
- 假设 4: Phase 0 发现问题后写入 DECISIONS.md 并停下来等 PM 裁决（PM 直接编辑文件），不再走命令行同步裁决
- **命名硬规则**: 决策日志文件统一命名为 `{module}-DECISIONS.md`，存放在 SRS 目录（`config.paths.docs.srs`）。STATE.yaml 中用 `decisions_path` 字段存储完整模块化路径。文档中泛指概念时可简写为"DECISIONS.md"，但代码和流程图中必须使用 `{module}-DECISIONS.md`。**补充**：(a) brainstorm 首次执行时始终创建空的 `{module}-DECISIONS.md`（含表头，无记录），确保文件始终存在；(b) 所有用户提示必须输出完整路径（含目录前缀），避免与 PRD 目录下的 DECISIONS.md 混淆。下文 `{srs_dir}` 即 `config.paths.docs.srs`

## 三、现状分析

### 相关文件

| 文件　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| 当前职责　　　　　　　　　　　　　　　　　　　　　　　 | 问题　　　　　　　　　　　　　　　　　　　　　　　　　　|
| ---------------------------------------------------------------------------| --------------------------------------------------------| ---------------------------------------------------------|
| `.claude/skills/brainstorming/SKILL.md` 伪代码第 209 行　　　　　　　　　 | Phase 0 安全阀：写 open-questions.md → pending_confirm | 应改为写 DECISIONS.md，未标注来源　　　　　　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 伪代码第 218-221 行　　　　　　　 | Phase 0 未达安全阀时的同步裁决　　　　　　　　　　　　 | 命令行同步裁决，PM 无法直接编辑文件　　　　　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 伪代码第 500 行　　　　　　　　　 | Phase 4 B/C/D：写 open-questions.md → pending_confirm　| 应改为写 DECISIONS.md，未标注来源　　　　　　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 失败退出规则第 526 行　　　　　　 | Phase 0 安全阀后续描述　　　　　　　　　　　　　　　　 | 错误描述"approve 后 → brainstorm_done → split story"　　|
| `.claude/skills/brainstorming/SKILL.md` 失败退出规则第 540-544 行　　　　 | Phase 4 阻塞后续描述　　　　　　　　　　　　　　　　　 | "输出需求疑问清单（open-questions.md）"　　　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 输出格式第 589 行　　　　　　　　 | Phase 4 校验结果输出　　　　　　　　　　　　　　　　　 | "疑问清单: open-questions.md"　　　　　　　　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 输出格式第 593 行　　　　　　　　 | 下一步提示　　　　　　　　　　　　　　　　　　　　　　 | 未提及 /approve brainstorm 选项　　　　　　　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 硬约束第 600 行　　　　　　　　　 | "禁止停下来等待用户确认"　　　　　　　　　　　　　　　 | 与 D7 Phase 0 文件裁决流程冲突　　　　　　　　　　　　　|
| `.claude/skills/brainstorming/SKILL.md` 硬约束第 616-621 行　　　　　　　 | 强制规则　　　　　　　　　　　　　　　　　　　　　　　 | "open-questions.md" / "open_questions" 引用　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 输出格式节（547 行附近）　　　　　| 无 DECISIONS.md 格式规范　　　　　　　　　　　　　　　 | 需新增格式规范节　　　　　　　　　　　　　　　　　　　　|
| `.claude/skills/brainstorming/SKILL.md` 伪代码第 251 行　　　　　　　　　 | generate_srs() 中 SRS §9 开放问题　　　　　　　　　　　| 内联问题表格，应改为引用 DECISIONS.md　　　　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 伪代码 Phase 0 起始（约 180 行）　| 无创建空 DECISIONS.md 逻辑　　　　　　　　　　　　　　 | 命名规则(a)要求始终创建，但无对应代码　　　　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 伪代码 Phase 4（435~505 行）　　　| `open_questions` 变量名　　　　　　　　　　　　　　　　| 语义不一致：变量名仍为旧名，写入目标已改为 DECISIONS　　|
| `.windsurf/workflows/approve.md` 第 22-28 行　　　　　　　　　　　　　　　| Brainstorm 需求确认　　　　　　　　　　　　　　　　　　| 直接 brainstorm_done，未区分来源　　　　　　　　　　　　|
| `.claude/commands/approve.md` 第 17、24-35、39 行　　　　　　　　　　　　 | /approve brainstorm 说明+执行流程+下一步　　　　　　　 | 直接 brainstorm_done / "进入 split story"，未区分来源　 |
| `.windsurf/workflows/brainstorm.md` 第 58-62 行　　　　　　　　　　　　　 | 更新状态描述　　　　　　　　　　　　　　　　　　　　　 | "或 /approve 跳过确认"对 Phase 0 来源不适用　　　　　　 |
| `.claude/skills/workflow-engine/state-machine.yaml` 第 130 行　　　　　　 | 命令到状态映射　　　　　　　　　　　　　　　　　　　　 | `/approve brainstorm` 硬编码 → brainstorm_done　　　　　|
| `.claude/skills/workflow-engine/SKILL.md` 第 141 行　　　　　　　　　　　 | update_workflow 排除列表　　　　　　　　　　　　　　　 | `/approve brainstorm` 不在排除列表，会被覆写　　　　　　|
| `.claude/skills/workflow-engine/tests/simulation.py` 第 76-77 行　　　　　| 模拟测试　　　　　　　　　　　　　　　　　　　　　　　 | 硬编码返回 brainstorm_done　　　　　　　　　　　　　　　|
| `.claude/skills/workflow-engine/tests/gate_verification.py` 第 108-109 行 | 门控测试　　　　　　　　　　　　　　　　　　　　　　　 | 硬编码返回 brainstorm_done　　　　　　　　　　　　　　　|
| `.claude/commands/brainstorm.md` 第 55-57 行　　　　　　　　　　　　　　　| "下一步"描述　　　　　　　　　　　　　　　　　　　　　 | 固定写"执行 /split story"，未区分 pending 场景　　　　　|
| `.claude/skills/workflow-engine/references/state-diagram.md` 第 10-16 行　| 参考状态图　　　　　　　　　　　　　　　　　　　　　　 | 简化主线图未体现 brainstorm_pending_confirm 分支　　　　|
| `.claude/skills/workflow-engine/state-machine.yaml` 第 173 行　　　　　　 | brainstorm 完成后的分支条件　　　　　　　　　　　　　　| `has_open_questions()` 应改为 `has_pending_decisions()` |
| `osg-spec-docs/tasks/STATE.yaml` 第 53 行　　　　　　　　　　　　　　　　 | 工作流状态存储　　　　　　　　　　　　　　　　　　　　 | `open_questions_path` 应改为 `decisions_path`　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 铁律第 25 行　　　　　　　　　　　| "不等待用户确认 - 自动继续执行"　　　　　　　　　　　　| 与 D7 Phase 0 文件裁决冲突（同 line 600）　　　　　　　 |
| `.claude/skills/brainstorming/SKILL.md` 流程图第 47-50 行　　　　　　　　 | Phase 0 闭环流程图　　　　　　　　　　　　　　　　　　 | "同步询问PM裁决" / "open-questions.md"　　　　　　　　　|
| `.claude/skills/brainstorming/SKILL.md` 流程图第 100 行　　　　　　　　　 | Phase 4 结果分支　　　　　　　　　　　　　　　　　　　 | "疑问清单" 应改为 "{module}-DECISIONS.md"　　　　　　　 |
| `.windsurf/workflows/brainstorm.md` 第 21-24 行　　　　　　　　　　　　　 | Phase 0 闭环正文描述　　　　　　　　　　　　　　　　　 | "同步询问 PM" / "open-questions.md"　　　　　　　　　　 |
| `.windsurf/workflows/brainstorm.md` 第 52 行　　　　　　　　　　　　　　　| 输出产物描述　　　　　　　　　　　　　　　　　　　　　 | "open-questions.md" 应改为 "DECISIONS.md"　　　　　　　 |
| `.claude/commands/brainstorm.md` 第 21-22、27 行　　　　　　　　　　　　　| Phase 0 正文 + 输出产物描述　　　　　　　　　　　　　　| "同步询问 PM" / "open-questions.md" / "问题确认清单"　　|
| `.windsurf/workflows/rpiv.md` 第 28 行　　　　　　　　　　　　　　　　　　| RPIV 调度 brainstorm_pending_confirm　　　　　　　　　 | 未提示 PM 先裁决，直接执行 /approve　　　　　　　　　　 |
| `osg-spec-docs/docs/_sidebar.md` 第 35、38 行　　　　　　　　　　　　　　 | 文档站点导航　　　　　　　　　　　　　　　　　　　　　 | 指向 *-open-questions.md，应改为 *-DECISIONS.md　　　　 |

### 问题本质

Brainstorming 有两个地方会产生待决策记录然后停下来等 `/approve brainstorm`：

| 产生点 | 什么时候 | SRS 存在吗？ | approve 后应该做什么 |
|--------|---------|-------------|---------------------|
| **Phase 0 安全阀** | PRD 生成阶段，HTML 有问题 3 轮没解决 | **❌ 不存在** | 裁决 → 更新 PRD → **重新执行 /brainstorm** |
| **Phase 4 B/C/D** | SRS 已生成，最后校验发现差异 | **✅ 已存在** | "跳过"（PM 认为不影响）→ **brainstorm_done** |

当前 `/approve brainstorm` 不管来源，统一 brainstorm_done → /split story。**Phase 0 来源时 SRS 不存在，split story 会失败。**

### 额外问题：信息三处重复

当前同一份问题信息分散在三个地方：

| #   | 位置　　　　　　　　　　　　　| 内容　　　　　　　　　　　　　　　 | 问题　　　　　　　　　　　　　　　 |
| -----| -------------------------------| ------------------------------------| ------------------------------------|
| 1   | `{module}-open-questions.md`　| 待确认问题详情（Q-001~Q-004 格式） | 主要载体，但无 status 字段　　　　 |
| 2   | SRS `{module}.md` §9 开放问题 | 问题表格（ID/问题/来源/严重度）　　| 与 open-questions 重复，需手动同步 |
| 3   | `open-questions.md` 已确认项　| 已处理记录（G1~G8）　　　　　　　　| 与待确认项在同一文件但格式不统一　 |

这导致：修改一处必须同步另外两处，容易遗漏。应收敛为单一事实源（DECISIONS.md）。

### 当前流程（有问题）

```
Phase 0 安全阀 → open-questions.md → brainstorm_pending_confirm
                                          │
Phase 4 B/C/D  → open-questions.md → brainstorm_pending_confirm
                                          │
                                          ▼
                              /approve brainstorm
                                          │
                                PM 逐项裁决
                                          │
                                          ▼
                              brainstorm_done → /split story
                              ↑
                              ❌ Phase 0 来源时 SRS 还没生成！
                              ✅ Phase 4 来源时是“跳过”语义，正确
```

### 目标流程

```
Phase 0 安全阀 → {module}-DECISIONS.md (source: phase0, status: pending) → brainstorm_pending_confirm
Phase 4 B/C/D  → {module}-DECISIONS.md (source: phase4, status: pending) → brainstorm_pending_confirm
                                          │
                                          ▼
                              /approve brainstorm
                                          │
                                读取 {module}-DECISIONS.md
                                检查 source 字段
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
              source: phase0                              source: phase4
                    │                                           │
              PM 裁决 html_issues                         PM 裁决 B/C/D 类
              更新 PRD                                    （“跳过”语义，PM 认为不影响）
                    │                                           │
                    ▼                                           ▼
              重新执行 /brainstorm                        brainstorm_done
              （PRD 已存在，走 Phase 1~4）                → /split story

注意：Phase 4 如果 PM 认为需要修改，应走“重新执行 /brainstorm”路径（已有增量更新逻辑），不走 approve。

Phase 0 未达安全阀时的裁决流程（修复后）：
  Phase 0 每轮发现问题 → 写入 {module}-DECISIONS.md (pending)
  → 提示 PM 裁决 → PM 编辑 {module}-DECISIONS.md (resolved)
  → PM 回复"继续" → AI 读取 resolved 记录 → apply_decisions → 下一轮
```

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| D1 | Phase 0 approve 后怎么继续 | A: 重新执行 `/brainstorm`（完整流程）/ B: 只执行 Phase 1~4（跳过 Phase 0） | **A** | 最简单。重新执行 /brainstorm 时 PRD 已存在，Phase 0 会走"使用已有"分支，用户选"使用已有"就直接进入 Phase 1。不需要特殊逻辑 |
| D2 | 如何区分两种来源 | A: DECISIONS.md 中用 source 字段 / B: 用不同文件名 / C: 根据 SRS 是否存在判断 | **A** | 最显式。一个文件，一个字段。C 方案依赖隐含假设 |
| D3 | Phase 4 approve 的语义 | A: approve = “跳过”（PM 认为不影响） / B: approve = “裁决后更新文档” | **A** | SKILL.md 第 544 行已明确说“产品确认后重新执行 /brainstorm 或 /approve brainstorm”——需要修改走重新执行，approve 就是“跳过” |
| D4 | /approve brainstorm 状态管理方式 | A: 加入 workflow-engine 排除列表，由 approve 流程自管理状态 / B: 保留 command_to_state 映射但改为条件映射 | **A** | 复用已有模式（/next、/verify 同模式）；B 需要扩展 state-machine.yaml 格式，违反最少概念原则 |
| D5 | Phase 0 approve 后谁管理状态 | A: approve 不写状态，同步调用 /brainstorm，由 /brainstorm 管理最终状态 / B: approve 写中间状态再触发 /brainstorm | **A** | 最简单。避免 pending_confirm 死循环风险。/brainstorm 已有完整的状态管理逻辑 |
| D6 | 问题记录载体 | A: 收敛为 DECISIONS.md 单一事实源 / B: 保留 open-questions.md + SRS §9 双文档 | **A** | 消除三处重复（open-questions / SRS §9 / 已确认项）。单文件带 status 字段天然支持生命周期管理（pending→resolved/rejected）。SRS §9 改为引用 DECISIONS.md |
| D7 | Phase 0 裁决方式 | A: 写 DECISIONS.md + PM 直接编辑文件裁决 / B: 命令行同步裁决（现有） | **A** | PM 无法直接在命令行裁决，需要复制出来给 PM 看。文件裁决更直接，PM 可直接编辑 DECISIONS.md |

## 五、目标状态

### /approve brainstorm 流程（修复后）

```
/approve brainstorm
  │
  ▼
[读取 {module}-DECISIONS.md 中 status=pending 或 (status=resolved && 已应用=false) 的记录]
  │ 若读取结果为空集 → 直接失败："❌ {srs_dir}/{module}-DECISIONS.md 中无待处理的决策记录。"
  │   补充诊断：检查是否存在 rejected 记录；若有 phase0 来源的 rejected →
  │   "⚠️ {srs_dir}/{module}-DECISIONS.md 中 phase0 记录不支持 rejected，请改为 resolved 并填写裁决内容"
  │ 检查 source 字段（必填；缺失则直接失败，提示重新执行 /brainstorm）
  │ 检查 source 单一性：所有未处理记录的 source 必须一致；若混合 →
  │   直接失败："❌ {srs_dir}/{module}-DECISIONS.md 中存在混合来源的未处理记录，请检查文件或重新执行 /brainstorm"
  │
  ├─ source: phase0
  │   │ ⛔ Guard: 若存在 status=pending 的记录 → 直接报错
  │   │   "❌ 仍有未裁决的记录，请 PM 先在 {srs_dir}/{module}-DECISIONS.md 中裁决后再执行 /approve"
  │   │ 筛选 status=resolved && 已应用=false 的记录
  │   │ AI 读取裁决结果，更新 PRD，标记 已应用=true
  │   │
  │   │ ⚠️ 不写 STATE.yaml（不设置任何状态）
  │   │ 同步调用 /brainstorm {module}
  │   │ /brainstorm 自己管理最终状态（done 或再次 pending_confirm）
  │   │ （PRD 已存在 → 用户选"使用已有" → Phase 1~4）
  │   ▼
  │   同步执行 /brainstorm {module}（approve 流程内部直接调用，不返回状态机调度）
  │
  └─ source: phase4
      │ ⛔ Guard: 若存在 status=resolved && 已应用=false 的记录 → 直接报错
      │   "❌ {srs_dir}/{module}-DECISIONS.md 中 phase4 存在已裁决但未应用的记录，请走重新 /brainstorm 路径而非 /approve"
      │ "跳过"语义：PM 认为这些 B/C/D 类问题不影响，直接继续
      │ 将 pending 记录标记为 rejected（PM 选择跳过）
      │ （如果 PM 认为需要修改，应走"重新执行 /brainstorm"路径）
      │
      │ 设置 workflow:
      │   current_step = "brainstorm_done"
      │   next_step = "split_story"
      │   auto_continue = true
      ▼
      /split story（自动继续）
```

### Phase 0 未达安全阀时的裁决流程（修复后）

```
Phase 0 每轮闭环：
  1. 跑 prototype-extraction
  2. 发现 html_issues → 写入 {module}-DECISIONS.md（status=pending, source=phase0）
  3. 提示 PM：“请在 {srs_dir}/{module}-DECISIONS.md 中裁决后回复'继续'”
  4. PM 编辑 {module}-DECISIONS.md（填写裁决内容，改 status=resolved）
  5. PM 回复"继续"
  6. AI 读取 resolved && 已应用=false 的记录 → apply_decisions_to_prd() → 标记 已应用=true → 回到循环顶部
```

### DECISIONS.md 格式规范

```markdown
# {module} 模块 — 决策日志

> 模块: {module}

---

## DEC-001

- **状态**: pending
- **已应用**: false
- **来源**: phase0
- **类型**: C

**问题**: 登录页面按钮文案矛盾——HTML 中“登录”按钮在 A 页面显示“Login”，B 页面显示“登录”

**裁决**: （PM 填写：统一使用“登录”）

**影响**: （AI 应用后填写：更新 PRD §2.1 登录页面按钮文案）

---

## DEC-002

- **状态**: pending
- **已应用**: false
- **来源**: phase4
- **类型**: B

**问题**: 权限列表页面缺少分页——HTML 原型中权限列表无分页控件

**裁决**:

**影响**:

---

> 注：以上示例仅展示字段格式。实际运行中同一文件不会同时包含 phase0 和 phase4 的 pending 记录（见假设 1：Phase 0 安全阀触发后 return，不执行 Phase 1~4）。
```

**字段说明**：
- **状态**: `pending`（待裁决）/ `resolved`（已裁决）/ `rejected`（跳过，仅 phase4 来源允许；phase0 来源禁止 rejected，必须裁决）
- **已应用**: `false`（未应用）/ `true`（已应用到 PRD）——防止重复 apply，AI 只处理 `status=resolved && 已应用=false` 的记录，处理后标记 `true`
- **来源**: `phase0`（HTML 原型内部问题）/ `phase4`（HTML↔PRD↔SRS 差异）
- **类型**: `B`（PRD/SRS有HTML无）/ `C`（HTML自身矛盾）/ `D`（HTML明显Bug）
- **裁决**: PM 直接编辑填写
- **影响**: AI 应用后填写，说明更新了哪些文档

**与 SRS §9 的关系**：SRS §9 不再重复维护问题列表，改为引用 DECISIONS.md：
```markdown
## §9 开放问题

> 详见 [{module}-DECISIONS.md](./{module}-DECISIONS.md) 中 status=pending 的记录。
```

## 六、执行清单

### 写入方（SKILL.md）

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 1 | `.claude/skills/brainstorming/SKILL.md` | 伪代码第 208-209 行 | `questions_path = ...open-questions.md`; `write_open_questions(questions_path, html_issues)` | `decisions_path = ...{module}-DECISIONS.md`; `append_decisions(decisions_path, html_issues, source="phase0")` |
| 2 | `.claude/skills/brainstorming/SKILL.md` | 伪代码第 218-221 行（Phase 0 同步裁决） | `ask_user_resolve_issues(html_issues)` 命令行同步裁决 | 写入 {module}-DECISIONS.md (pending) → 提示 PM 编辑文件裁决 → 等 PM 回复"继续" → 读取 resolved 记录 → `apply_decisions_to_prd()` |
| 3 | `.claude/skills/brainstorming/SKILL.md` | 伪代码第 499-500 行 | `questions_path = ...open-questions.md`; `write_open_questions(questions_path, open_questions)` | `decisions_path = ...{module}-DECISIONS.md`; `append_decisions(decisions_path, pending_decisions, source="phase4")`（变量名由 #30 同步修改） |
| 4 | `.claude/skills/brainstorming/SKILL.md` | 失败退出规则第 522-526 行 | "输出 open-questions.md" + "approve 后 → brainstorm_done → split story" | "输出 {module}-DECISIONS.md" + "approve 后 → 根据裁决更新 PRD → 重新执行 /brainstorm" |
| 5 | `.claude/skills/brainstorming/SKILL.md` | 失败退出规则第 540-544 行 | "输出需求疑问清单（open-questions.md）" | "输出决策日志（{module}-DECISIONS.md）" |
| 6 | `.claude/skills/brainstorming/SKILL.md` | 输出格式第 589 行 | `疑问清单: {module}-open-questions.md` | `决策日志: {module}-DECISIONS.md` |
| 7 | `.claude/skills/brainstorming/SKILL.md` | 输出格式第 593 行（下一步提示） | `有待确认项: 请产品确认疑问清单后重新执行 /brainstorm {module}` | `有待确认项: 请在 {srs_dir}/{module}-DECISIONS.md 中裁决后执行 /approve brainstorm 或重新执行 /brainstorm {module}` |
| 8 | `.claude/skills/brainstorming/SKILL.md` | 硬约束第 616-621 行 | "open-questions.md" / "open_questions" | "{module}-DECISIONS.md" / "pending decisions"。追加约束：用户提示中必须输出完整路径（含 SRS 目录前缀），对应命名规则(b) |
| 9 | `.claude/skills/brainstorming/SKILL.md` | 输出格式节（第 547 行）之前新增 | 无 | 新增 DECISIONS.md 格式规范节 + `append_decisions` 函数签名（格式见五、目标状态） |
| 10 | `.claude/skills/brainstorming/SKILL.md` | 伪代码第 251 行 `generate_srs(context)` 调用点附近 | 无指令（SRS §9 由 AI 动态生成，无独立模板文件） | 在调用点上方添加注释指令：`# SRS §9 开放问题节改为引用 {module}-DECISIONS.md，不再内联问题表格`。验收：生成的 SRS §9 必须是引用链接（`详见 {module}-DECISIONS.md`）而非内联表格 |
| 29 | `.claude/skills/brainstorming/SKILL.md` | 伪代码 Phase 0 起始处（约 line 180） | 无 | 新增 `decisions_path = f"{config.paths.docs.srs}{module_name}-DECISIONS.md"`; `ensure_decisions_file_exists(decisions_path)`（文件不存在时创建空文件含表头，已存在则跳过不覆盖，对应命名规则(a)） |
| 30 | `.claude/skills/brainstorming/SKILL.md` | 伪代码 Phase 4 line 435~505 | `open_questions`（变量名，约 8 处） | `pending_decisions`（语义对齐：变量名应与写入目标 DECISIONS.md 一致） |

### 读取方（approve 流程）

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 11 | `.windsurf/workflows/approve.md` | 第 22-28 行（Brainstorm 需求确认） | 统一处理：PM 裁决 → brainstorm_done | 先读取 STATE.yaml + config.yaml → 分支处理：读取 {module}-DECISIONS.md 中 pending 或 resolved&&未应用 的记录（空集 Guard 含 phase0 rejected 诊断），检查 source（必填，缺失则失败）+ source 单一性检查（混合则失败）→ phase0：Guard 检查 pending → 读取 resolved 裁决 → 更新 PRD → 不写 STATE.yaml → 同步调用 /brainstorm / phase4：Guard 检查 resolved&&未应用 → 标记 pending 为 rejected → brainstorm_done |
| 12 | `.claude/commands/approve.md` | 第 17 行 + 第 24-35 行 + 第 39 行 | 统一处理："进入 split story" / PM 裁决 → brainstorm_done | 同步更新：先读取 STATE.yaml + config.yaml → 说明区分两种路径 + 读取 {module}-DECISIONS.md + 空集 Guard（含 phase0 rejected 诊断）+ source 必填校验 + source 单一性检查 + phase0 pending guard + phase4 resolved guard + 分支处理 + 下一步区分 phase0/phase4 |

### 描述方（brainstorm 流程）

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 13 | `.windsurf/workflows/brainstorm.md` | 第 21-24 行（Phase 0 正文）+ 第 52 行（输出产物）+ 第 58-62 行（更新状态） | "同步询问 PM 裁决" / "open-questions.md" / "或 /approve 跳过确认" | Phase 0 改为文件裁决流程；输出产物改为 {module}-DECISIONS.md；更新状态区分 phase0/phase4 |
| 14 | `.claude/commands/brainstorm.md` | 第 21-22 行（Phase 0 正文）+ 第 27 行（输出产物）+ 第 55-57 行（下一步） | "同步询问 PM" / "open-questions.md" / "问题确认清单" / "执行 /split story" | Phase 0 改为文件裁决；输出产物改为 {module}-DECISIONS.md；下一步区分 pending/done |

### 引擎层

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 15 | `.claude/skills/workflow-engine/state-machine.yaml` | 第 130 行（command_to_state） | `"/approve brainstorm": brainstorm_done` | 移除此行（approve 流程自管理状态） |
| 16 | `.claude/skills/workflow-engine/state-machine.yaml` | 第 173 行（brainstorm_completion） | `condition: "has_open_questions(module)"` | `condition: "has_pending_decisions(module)"` |
| 17 | `.claude/skills/workflow-engine/SKILL.md` | 第 141 行（排除列表） | `if command_completed in ("/next", "/verify"):` | `if command_completed in ("/brainstorm", "/next", "/verify", "/approve brainstorm"):` |
| 18 | `osg-spec-docs/tasks/STATE.yaml` | 第 53 行 | `open_questions_path: "...open-questions.md"` | `decisions_path: "...{module}-DECISIONS.md"` |
| 22 | `.claude/skills/workflow-engine/references/state-diagram.md` | 第 10-16 行 | `not_started → brainstorm_done`（无中间状态） | 加入 brainstorm_pending_confirm 分支（CLAUDE.md 要求修改状态机必须同步 state-diagram） |

### 测试

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 19 | `.claude/skills/workflow-engine/tests/simulation.py` | 第 76-77 行 | `return "brainstorm_done"` | 条件分支：读取 {module}-DECISIONS.md source → phase0 返回重新 brainstorm / phase4 返回 brainstorm_done |
| 20 | `.claude/skills/workflow-engine/tests/gate_verification.py` | 第 108-109 行 | `return "brainstorm_done"` | 同 #19 |

### 硬约束修正

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 21 | `.claude/skills/brainstorming/SKILL.md` | 硬约束第 600 行 | `禁止停下来等待用户确认` | `禁止在 Phase 2/3/4 校验循环中停下来等待用户确认（Phase 0 文件裁决除外）` |

### SKILL.md 前半段流程图

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 23 | `.claude/skills/brainstorming/SKILL.md` | 铁律第 25 行 | `不等待用户确认 - 自动继续执行` | `Phase 2/3/4 不等待用户确认（Phase 0 文件裁决除外）` |
| 24 | `.claude/skills/brainstorming/SKILL.md` | 流程图第 47-50 行 | `同步询问PM裁决` / `输出 open-questions.md` | `写入 {module}-DECISIONS.md → PM 文件裁决` / `输出 {module}-DECISIONS.md` |
| 25 | `.claude/skills/brainstorming/SKILL.md` | 流程图第 100 行 | `有 B/C/D 类 → [输出结果 + 疑问清单]` | `有 B/C/D 类 → [输出结果 + {module}-DECISIONS.md]` |

### 调度方（RPIV）

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 26 | `.windsurf/workflows/rpiv.md` | 第 28 行 | `执行 /approve brainstorm（审阅并确认待确认疑问项）` | `确保 PM 已在 {module}-DECISIONS.md 中裁决完所有 pending 记录，然后执行 /approve brainstorm` |

### 可选同步

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 27 | 🟢 `osg-spec-docs/docs/_sidebar.md` | 第 35 行 | `[待确认清单](/02-requirements/srs/career-open-questions.md)` | `[决策日志](/02-requirements/srs/career-DECISIONS.md)`。前提：命名规则(a)确保文件已存在 |
| 28 | 🟢 `osg-spec-docs/docs/_sidebar.md` | 第 38 行 | `[待确认清单](/02-requirements/srs/permission-open-questions.md)` | `[决策日志](/02-requirements/srs/permission-DECISIONS.md)`。同 #27 |

### 修改后审计

| # | 步骤 | 说明 |
|---|------|------|
| 31 | 执行 `framework-audit` Skill | CLAUDE.md 要求任何框架文件修改完成后必须执行全局一致性审计。在所有 #1~#30 实施完成后执行，确保无漂移 |

> 统计：13 个文件，28 处必改 + 2 处可选同步 + 1 处审计

## 七、自校验结果

### 通用校验

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 目标流程图清晰展示两条分支 + Phase 0 文件裁决流程 |
| G2 目标明确 | ✅ | 3 条验收标准，可度量 |
| G3 假设显式 | ✅ | 4 条假设 + 1 条命名硬规则已列出 |
| G4 设计决策完整 | ✅ | 7 个决策点（D1~D7），每个有理由 |
| G5 执行清单可操作 | ✅ | 28 项必改 + 2 项可选同步 + 1 项审计，按写入方/读取方/描述方/引擎层/测试/硬约束/流程图/调度方/审计分组 |
| G6 正向流程走读 | ✅ | Phase 0 路径：approve → 读取 DECISIONS.md resolved → 更新 PRD → 重新 /brainstorm → Phase 1~4 → done |
| G7 改动自洽 | ✅ | 写入方（SKILL.md #1~#10/#29/#30）→ 读取方（approve WS#11/CC#12）→ 描述方（brainstorm WS#13/CC#14）→ 引擎层（#15~#18/#22）→ 测试（#19#20）→ 硬约束（#21）→ 流程图（#23~#25）→ 调度方（#26）→ 可选（#27/#28）→ 审计（#31） |
| G8 简约不等于省略 | ✅ | 两条路径都有完整的裁决+更新+状态转换；DECISIONS.md 格式规范完整 |
| G9 场景模拟 | ✅ | 见下方（11 个场景） |

### 框架流程校验

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| F1 文件同步 | ✅ | 写入方（SKILL.md ×16）+ 读取方（approve WS/CC ×2）+ 描述方（brainstorm WS/CC ×2）+ 引擎层（state-machine ×2 + engine + STATE.yaml + state-diagram）+ 测试（×2）+ 调度方（rpiv ×1）+ 可选（_sidebar ×2）+ 审计（#31）= 13 个文件 28 处必改 + 2 处可选同步 + 1 处审计 |
| F2 状态一致性 | ✅ | 不新增状态，复用 brainstorm_pending_confirm 和 brainstorm_done |
| F3 交叉引用 | ✅ | DECISIONS.md 的写入方（SKILL.md #1#2#3）和读取方（approve #11#12、Phase 0 裁决 #2）都已覆盖；`open_questions` 变量名由 #30 覆盖；空文件创建由 #29 覆盖 |
| F4 引擎层一致 | ✅ | state-machine.yaml 移除映射（#15）+ 条件函数名更新（#16）+ 排除列表（#17）+ STATE.yaml 字段（#18）+ state-diagram 同步（#22）+ 测试（#19#20） |
| F5 状态机不死循环 | ✅ | Phase 0 approve 不写 STATE.yaml（D5），同步调用 /brainstorm 由其管理最终状态 |

### 场景模拟

**场景 1：Phase 0 安全阀 → approve → 重新 brainstorm**
1. `/brainstorm permission` → Phase 0 闭环 3 轮 → 安全阀 → permission-DECISIONS.md (source: phase0, status: pending) → pending_confirm
2. PM 在 permission-DECISIONS.md 中裁决（改 status=resolved，填写裁决内容）
3. `/approve brainstorm` → 读取 permission-DECISIONS.md → Guard 检查无 pending → source: phase0 → AI 读取 resolved 裁决 → 更新 PRD，标记 已应用=true
4. approve 流程内部同步调用 `/brainstorm permission`（不写 STATE.yaml，不返回状态机调度）
5. `/brainstorm permission` → Phase 0: PRD 已存在 → "使用已有" → Phase 1~4 → SRS 生成
6. 如果 Phase 4 无问题 → /brainstorm 自己设置 brainstorm_done → /split story
7. workflow-engine：update_workflow("/brainstorm") 被排除列表跳过（/brainstorm 自管理状态），不覆写 brainstorm_done
- ✅ SRS 正确生成，不跳过
- ✅ 状态由 /brainstorm 管理，无死循环风险
- ✅ workflow-engine 不干扰

**场景 2：Phase 4 B/C/D → approve（跳过） → split story**
1. `/brainstorm permission` → Phase 0~3 通过 → Phase 4 发现 B/C/D 类 → permission-DECISIONS.md (source: phase4, status: pending) → pending_confirm
2. `/approve brainstorm` → 读取 source: phase4 → PM 认为不影响 → 标记 rejected → brainstorm_done
3. /split story
- ✅ SRS 已存在，approve 是"跳过"语义

**场景 2b：Phase 4 B/C/D → PM 认为需要修改 → 重新 brainstorm**
1. `/brainstorm permission` → Phase 4 发现 B/C/D 类 → permission-DECISIONS.md (pending) → pending_confirm
2. PM 在 permission-DECISIONS.md 裁决后，修改 PRD，重新执行 `/brainstorm permission`（不走 approve）
3. Phase 1 增量更新 SRS → Phase 2~4 重新校验
- ✅ SRS 正确更新，完整重跑

**场景 3：正常流程（无问题）**
1. `/brainstorm permission` → Phase 0 通过 → Phase 1~4 通过 → brainstorm_done
2. 不产生 permission-DECISIONS.md 待决策记录，不触发 approve
- ✅ 不受影响

**场景 4：Phase 0 安全阀 → approve → 重新 brainstorm → Phase 4 又发现问题**
1. `/brainstorm permission` → Phase 0 安全阀 → permission-DECISIONS.md (source: phase0, pending) → pending_confirm
2. `/approve brainstorm` → Guard 检查无 pending → source: phase0 → PM 已裁决 → 更新 PRD，标记 已应用=true → 同步调用 /brainstorm（不写状态）
3. `/brainstorm permission`（第二次）→ Phase 0 "使用已有" → Phase 1~4 → Phase 4 发现 B/C/D → permission-DECISIONS.md (source: phase4, pending) → pending_confirm
4. `/approve brainstorm` → source: phase4 → PM 跳过 → 标记 rejected → brainstorm_done → /split story
- ✅ 两次 approve 的 source 不同，处理路径不同，端到端走通

**场景 5：验证 workflow-engine 排除逻辑**
1. 假设 approve 流程完成后，某处代码调用 `update_workflow("/approve brainstorm", state)`
2. workflow-engine/SKILL.md 排除列表：`if command_completed in ("/brainstorm", "/next", "/verify", "/approve brainstorm"): return`
3. 直接 return，不查 command_to_state 映射，不覆写 STATE.yaml
4. state-machine.yaml 中已移除 `"/approve brainstorm"` 映射，若排除列表失效，`command_to_state[...]` 会抛 KeyError（快速失败）
- ✅ 双重保险：排除列表正常时跳过 + 映射移除后异常时快速失败

**场景 6：source 缺失 → 快速失败**
1. 假设某次 /brainstorm 因 bug 未写入 source 字段，生成了无 source 的 permission-DECISIONS.md 记录
2. `/approve brainstorm` → 读取 permission-DECISIONS.md → 检查 source 字段 → 缺失
3. 直接失败，输出错误信息："❌ {srs_dir}/permission-DECISIONS.md 缺少 source 字段，请重新执行 /brainstorm permission"
4. 不进入任何分支，不写 STATE.yaml
- ✅ 快速失败，避免误分支风险

**场景 7：Phase 0 未达安全阀 — 文件裁决流程**
1. `/brainstorm permission` → Phase 0 第 1 轮 → 发现 2 个 html_issues
2. AI 写入 permission-DECISIONS.md：DEC-001 (pending, phase0, C类)、DEC-002 (pending, phase0, D类)
3. AI 输出提示："请在 {srs_dir}/permission-DECISIONS.md 中裁决后回复'继续'"
4. PM 编辑 permission-DECISIONS.md：DEC-001 改 status=resolved，填写裁决；DEC-002 改 status=resolved
5. PM 回复"继续"
6. AI 读取 resolved && 已应用=false 的记录 → apply_decisions_to_prd() → 标记 已应用=true → 回到循环顶部
7. Phase 0 第 2 轮 → 无问题 → 进入 Phase 1
- ✅ PM 直接编辑文件裁决，不需要命令行中转
- ✅ 裁决记录持久化在 permission-DECISIONS.md 中

**场景 8：DECISIONS.md 消除三处重复**
1. Phase 4 发现 B 类问题 → 写入 permission-DECISIONS.md (DEC-003, pending, phase4, B)
2. SRS §9 引用 permission-DECISIONS.md，不再内联问题表格
3. PM 裁决后 DEC-003 改为 resolved → SRS §9 自动反映（因为是引用）
4. 无需手动同步 open-questions.md ↔ SRS §9
- ✅ 单一事实源，修改一处即可

**场景 9：Phase 4 存在 resolved&&未应用 → Guard 报错**
1. `/brainstorm permission` → Phase 4 发现 B/C/D → permission-DECISIONS.md (DEC-004, pending, phase4)
2. PM 在文件中裁决 DEC-004 → status=resolved（但 PM 本应走"重新 /brainstorm"路径）
3. `/approve brainstorm` → source: phase4 → ⛔ Guard 检测到 resolved && 已应用=false 的记录
4. 直接报错："❌ {srs_dir}/permission-DECISIONS.md 中 phase4 存在已裁决但未应用的记录，请走重新 /brainstorm 路径而非 /approve"
5. PM 改走 `/brainstorm permission`（增量更新路径）
- ✅ 防止 phase4 下 resolved 记录残留，语义闭环

**场景 10：PM 误将 phase0 记录改为 rejected → 诊断提示**
1. `/brainstorm permission` → Phase 0 安全阀 → permission-DECISIONS.md (DEC-001, pending, phase0)
2. PM 误操作：将 DEC-001 的 status 改为 `rejected`（phase0 不支持跳过）
3. `/approve brainstorm` → 读取 pending 或 resolved&&未应用 → 空集（rejected 不在读取范围内）
4. 空集 Guard → 补充诊断：检测到 rejected 记录且来源为 phase0
5. 输出："❌ {srs_dir}/permission-DECISIONS.md 中无待处理的决策记录。⚠️ phase0 记录不支持 rejected，请改为 resolved 并填写裁决内容"
6. PM 修正 DEC-001 → status=resolved，填写裁决 → 重新执行 `/approve brainstorm`
- ✅ 防止 phase0 rejected 死锁，诊断信息引导 PM 修正

**场景 11：混合来源未处理记录 → source 单一性 Guard 报错**
1. 假设异常情况：PM 手动编辑 permission-DECISIONS.md，添加了一条 source=phase0 的 pending 记录（实际当前是 phase4 产生的）
2. `/approve brainstorm` → 读取未处理记录 → 发现同时存在 source=phase0 和 source=phase4 的记录
3. source 单一性 Guard → 直接失败："❌ {srs_dir}/permission-DECISIONS.md 中存在混合来源的未处理记录，请检查文件或重新执行 /brainstorm"
4. PM 检查文件，删除误加的记录，重新执行 `/approve brainstorm`
- ✅ 防御性编程：即使假设 1 结构性保证失效，Guard 仍能捕获异常
