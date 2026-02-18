# Phase 0 简化方案 v3 — 最终版

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、最少概念、最短路径、改动自洽、简约不等于省略。

---

## 一、brainstorm 整体流程

```
/brainstorm {module}
  │
  ▼
Phase 0: PRD 生成（闭环，max 3 轮）
  │ - 调用 prototype-extraction → 检查 html_issues
  │ - 生成失败 → 直接 return 失败
  │ - 有问题 → 同步询问 PM 裁决 → 更新 PRD → 重跑
  │ - 3 轮后仍有问题 → 输出 open-questions.md → 阻塞（不继续）
  │ - 无问题 → 继续
  ▼
Phase 1: 生成 SRS
  │ - SRS 已存在 → 对比 PRD 差异，增量更新
  │ - SRS 不存在 → 全新生成
  ▼
Phase 2: 校验循环（正向/反向/PRD覆盖率/UI专项，max 10 轮）
  │ - 达到上限仍未通过 → 失败退出
  ▼
Phase 3: 终审循环（三维度终审 + A~I 多维度旋转校验，max 10 轮）
  │ - 达到上限仍未通过 → 失败退出
  ▼
Phase 4: HTML↔PRD↔SRS 全量校验
  │ - 逐端逐页面浏览 HTML 原型（启动 HTTP 服务器）
  │ - 截图 + snapshot 对比 PRD 和 SRS
  │ - 差异处理（HTML 是 SSOT）：
  │     A 类（HTML有PRD/SRS无）→ 直接补充到 PRD + SRS
  │     B/C/D 类 → 收集到 open_questions
  │ - 有 A 类补充 → 回到 Phase 2 重新校验（max 1 次回退）
  │ - 有 open_questions → 输出 {module}-open-questions.md
  ▼
输出产物：
  │ - {module}.md（SRS 文档，始终输出）
  │ - {module}-open-questions.md（问题清单，有问题时输出）
  ▼
出口（只有两个）：
  ├─ 无问题 → brainstorm_done → 自动 split story
  └─ 有问题 → brainstorm_pending_confirm → 等 /approve brainstorm
```

**关键点**：
- Phase 0 安全阀到了 → **直接阻塞**，不带着错误往下跑
- Phase 0 闭环内部的 PM 裁决用 `ask_user` 同步完成，不需要 return/恢复
- Phase 4 **必须执行** — 每个模块都有原型，没有原型就不会进入 brainstorm
- `/approve brainstorm` 只处理最终的 open-questions.md，不需要关心来自哪个 Phase
- Phase 0 和 Phase 4 的问题不会同时出现（安全阀阻塞了就到不了 Phase 4）

---

## 二、状态和文件

- **状态**：只用 `brainstorm_done` 和 `brainstorm_pending_confirm`（已有，不新增）
- **文件**：只用 `{module}-open-questions.md`（一个文件）
- **删除**：`brainstorm_pending_confirm_final`（本轮新增的，回滚掉）

---

## 三、Phase 0 伪代码

```python
# Phase 0: PRD 生成闭环
if need_extraction:
    MAX_ROUNDS = 3
    for round_num in range(1, MAX_ROUNDS + 1):
        print(f"🔄 Phase 0 第 {round_num}/{MAX_ROUNDS} 轮")

        result = invoke_skill("prototype-extraction", module_name, config)
        if result["status"] == "failed":
            return {"status": "failed", "reason": f"PRD 生成失败"}

        html_issues = result.get("html_issues", [])
        if not html_issues:
            print(f"✅ Phase 0 通过")
            break

        if round_num >= MAX_ROUNDS:
            # 安全阀：直接阻塞，不继续
            write_open_questions(f"{module}-open-questions.md", html_issues)
            set_state("brainstorm_pending_confirm")
            return  # 停在这里，等 /approve brainstorm

        # 同步询问 PM 裁决
        decisions = ask_user_resolve(html_issues)
        apply_to_prd(decisions)
        # 回到循环顶部重跑
```

---

## 四、Phase 4 回校验逻辑

Phase 4 发现 A 类差异后直接补充到 PRD + SRS，补充改变了 SRS 内容，必须重新校验。

```python
# Phase 4 回校验（max 1 次回退，防死循环）
MAX_PHASE4_RETRIES = 1
phase4_retry = 0

while True:
    # 执行 Phase 4
    open_questions, has_a_type_fixes = run_phase4(module_prototypes, context, requirement_doc)

    if has_a_type_fixes and phase4_retry < MAX_PHASE4_RETRIES:
        phase4_retry += 1
        print(f"⚠️ Phase 4 有 A 类补充，回到 Phase 2 重新校验（第 {phase4_retry} 次回退）")
        # 回到 Phase 2 完整重跑（失败则直接退出）
        result = run_phase2(requirement_doc, context, max_iterations=10)
        if result["status"] == "failed":
            return result
        requirement_doc = result["doc"]
        # 回到 Phase 3 完整重跑（失败则直接退出）
        result = run_phase3(requirement_doc, context, max_enhanced_rounds=10)
        if result["status"] == "failed":
            return result
        requirement_doc = result["doc"]
        # 回到 Phase 4 重新校验
        continue
    else:
        break  # 无 A 类补充，或已达回退上限
```

**关键点**：
- 回退上限 1 次 — 第一次回退保证补充内容质量，第二次 Phase 4 如果还有 A 类则不再回退
- 完整重跑 Phase 2 + Phase 3 — 不走捷径，质量优先
- Phase 2/3 如果失败 → 直接失败退出（不会到 Phase 4）
- A 类（auto_fixed）不算"有问题" — 只有 B/C/D 类才触发 `brainstorm_pending_confirm`
- 达到回退上限后仍有 A 类 — A 类补充照常执行但不再回退校验，此时 SRS 内容已经过至少一轮完整校验，风险可控

---

## 五、/approve brainstorm 逻辑

```
1. 读 open-questions.md
2. 逐项展示，PM 裁决
3. 设置 brainstorm_done → 自动 split story
```

不需要区分来源、不需要分流、不需要触发重跑。

---

## 六、修改清单

### A. 状态机回滚（已完成 ✅）

| # | 文件 | 当前值 | 目标值 |
|---|------|--------|--------|
| 1 | `state-machine.yaml` states | 有 `brainstorm_pending_confirm_final` | 删除 |
| 2 | `state-machine.yaml` pending_confirm.description | "Phase 0 闭环中发现 HTML 内部问题..." | "需求分析完成但有待产品确认的疑问项" |
| 3 | `state-machine.yaml` special_branches | 三分支（done/pending/pending_final） | 二分支：`has_open_questions` → pending_confirm / done |
| 4 | `state-machine.yaml` rollback | `[pending_confirm, pending_confirm_final]` | `[pending_confirm]` |

### B. brainstorming/SKILL.md — Phase 0 简化（已完成 ✅）

| # | 位置 | 当前值 | 目标值 |
|---|------|--------|--------|
| 5 | 伪代码 Phase 0 | return pending_confirm / pending_confirm_final | 同步 ask_user + 安全阀直接 return 阻塞 |
| 6 | 流程图 Phase 0 | 安全阀 → "由PM决定继续" | 安全阀 → "输出 open-questions.md → 停止" |
| 7 | 失败退出 | pending_confirm_final | pending_confirm |
| 8 | 硬约束 | "由 PM 决定是否继续" | "安全阀到了直接阻塞" |
| 9 | 迭代计数示例 | "⛔ 阻塞等待 PM 裁决..." | "→ 同步询问 PM 裁决..." |

### C. 去除假条件化（已完成 ✅）

| # | 文件 | 当前值 | 目标值 | 状态 |
|---|------|--------|--------|------|
| 10 | SKILL.md 流程图 L74 | `✅ (仅 UI 模块)` | `✅` | ✅ |
| 11 | SKILL.md 流程图 L86 | `Phase 4: HTML 原型全量校验（仅 UI 模块）` | `Phase 4: HTML↔PRD↔SRS 全量校验` | ✅ |
| 12 | SKILL.md 校验表 L128 | `UI 模块专项校验（当模块涉及 UI 还原时）` | `UI 专项校验` | ✅ |
| 13 | SKILL.md 校验表 L130 | `当 config...匹配到原型文件时，自动追加` | `Phase 2 中必须执行的 UI 相关校验项` | ✅ |
| 14 | SKILL.md 伪代码 L288-290 | `if prd_dir and module_prototypes:` → orphan `{` | 去掉 if 和 `{}`，直接执行 | ✅ |
| 15 | SKILL.md 伪代码 L403-404 | `if module_prototypes_p4:` → orphan `{` | 去掉 if 和 `{}`，直接执行 | ✅ |
| 16 | SKILL.md 输出格式 L497 | `UI 专项校验: ✅ 全部通过（仅 UI 模块）` | `UI 专项校验: ✅ 全部通过` | ✅ |
| 17 | SKILL.md 输出格式 L525 | `Phase 4 校验结果（仅 UI 模块）` | `Phase 4 校验结果` | ✅ |
| 18 | SKILL.md 硬约束 L542 | `UI 模块必须执行 UI 专项校验 - 当 config 中有原型映射时自动触发` | `必须执行 UI 专项校验` | ✅ |
| 19 | SKILL.md 硬约束 L548 | `Phase 4 仅在有原型映射时触发` | `Phase 4 必须执行 HTML↔PRD↔SRS 全量校验` | ✅ |
| 20 | SKILL.md 迭代计数 L587 | `UI 专项校验: ✅ 5/5 通过（仅 UI 模块）` | `UI 专项校验: ✅ 5/5 通过` | ✅ |
| 21 | brainstorm.md WS L34 | `UI专项仅在有原型映射时触发` | 去掉条件 | ✅ |
| 22 | brainstorm.md WS L37 | `（仅当 config...有该模块映射时触发）` | 去掉条件 | ✅ |
| 23 | brainstorm.md WS L49-50 | `仅在有待确认项时生成` / `仅记录` | `有待确认项时生成` / `记录备查` | ✅ |

### D. approve.md 简化（已完成 ✅）

| # | 文件 | 当前值 | 目标值 |
|---|------|--------|--------|
| 24 | approve.md CC | pending_confirm + pending_confirm_final 双条件 | 只有 pending_confirm |
| 25 | approve.md CC | 分流逻辑（未达安全阀/已达安全阀） | 统一读 open-questions.md → brainstorm_done |
| 26 | approve.md WS | 同上 | 同上 |

### E. brainstorm.md 更新（已完成 ✅）

| # | 文件 | 当前值 | 目标值 | 状态 |
|---|------|--------|--------|------|
| 27 | brainstorm.md CC L22 | "安全阀: 由PM决定继续或终止" | "安全阀: 输出 open-questions.md → 阻塞" | ✅ |

### F. CLAUDE.md 设计原则（已完成 ✅）

| # | 文件 | 改什么 |
|---|------|--------|
| 28 | CLAUDE.md | 在“禁止行为”之前插入 8 条设计原则 |

---

### G. 流程完善（已完成 ✅）

| # | 文件 | 当前值 | 目标值 |
|---|------|--------|--------|
| 29 | SKILL.md 伪代码 Phase 4 | A 类补充后不重新校验 | A 类补充后回到 Phase 2 重新校验（max 1 次回退） |
| 30 | SKILL.md 流程图 Phase 4 | 无回到 Phase 2 的路径 | 有 A 类补充 → 回到 Phase 2（max 1 次回退） |
| 31 | brainstorm.md WS Phase 4 | 无回到 Phase 2 的描述 | 补充"A 类补充后重新校验 + 只有 B/C/D 类触发阻塞" |

---

## 七、执行状态

全部 31 项修改已完成 ✅

---
