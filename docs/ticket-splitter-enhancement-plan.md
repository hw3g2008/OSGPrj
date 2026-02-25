# ticket-splitter 严谨性增强方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、最少概念、最短路径、改动自洽、简约不等于省略

## 目标

对齐 ticket-splitter/SKILL.md 与 story-splitter/brainstorming 的严谨性结构，补充缺失的输入收集阶段、失败退出规则完整性、流程图一致性。

## 前置条件

- story-splitter/SKILL.md 已完成增强（commit `0835d6b4`）
- ticket-splitter/SKILL.md 当前 521 行，已有失败退出规则和迭代计数示例

## 现状分析

| 维度　　　　　　 | story-splitter（修复后） | ticket-splitter（现状）　　　　　　　| 差距　　　　　　　　　　　　　　 |
| ------------------| --------------------------| --------------------------------------| ----------------------------------|
| Phase 1 入口函数 | ✅ `split_stories_main()` | ❌ 无，直接 `split_tickets(story_id)` | 缺少 STATE 读取、Story 状态检查　|
| 流程图 Phase 1　 | ✅ 有　　　　　　　　　　 | ❌ 无　　　　　　　　　　　　　　　　 | 缺少输入收集步骤　　　　　　　　 |
| 失败退出 Phase 1 | ✅ 有　　　　　　　　　　 | ❌ 无　　　　　　　　　　　　　　　　 | 缺少 Story 不存在/状态不对的路径 |
| 失败退出 Phase 2 | ✅ 5 条　　　　　　　　　 | ⚠️ 4 条（缺"不保存 Ticket 文件"）　　 | 少 1 条　　　　　　　　　　　　　|
| 失败退出 Phase 3 | ✅ 5 条　　　　　　　　　 | ⚠️ 4 条（缺"不保存 Ticket 文件"）　　 | 少 1 条　　　　　　　　　　　　　|
| 迭代计数示例　　 | ✅ 正确　　　　　　　　　 | ⚠️ 第 3 轮维度重复（H→H 应为 H→B）　　| 示例错误　　　　　　　　　　　　 |

## 设计决策

| ID | 决策 | 方案 | 理由 |
|----|------|------|------|
| D-1 | 入口函数命名 | `split_tickets_main()` | 与 `split_stories_main()` 命名一致 |
| D-2 | Story 状态检查 | 检查 status 为 approved 或 pending | 与 workflow 前置条件一致 |
| D-3 | 失败退出补充方式 | 在现有条目间插入 | 保持编号连续 |
| D-4 | 迭代示例修正 | 第 3 轮 H→B（ticket 优先级 C→H→B→D） | 按规则：上轮无修改→按优先级轮换，第 1 轮 C 有修改→第 2 轮 H→无修改→第 3 轮 B |

## 目标状态

修改后 ticket-splitter/SKILL.md 应具备：
- `split_tickets_main()` 入口函数（Phase 1 输入收集）
- 流程图包含 Phase 1 步骤
- 失败退出规则覆盖 Phase 1/2/3 三个阶段，每个阶段都有"不保存产物"条目
- 迭代计数示例维度轮换正确

## 执行清单

### T-1: 补充 `split_tickets_main()` 入口函数（🟡中）

**文件**: `.claude/skills/ticket-splitter/SKILL.md`
**位置**: 第 212 行 ` ```python` 后、第 213 行 `def split_tickets(story_id)` 前
**操作**: 插入

```python
def split_tickets_main(story_id):
    # ========== Phase 1: 输入收集 ==========
    config = load_yaml(".claude/project/config.yaml")
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")

    # 读取 Story（上游产物，SSOT）
    story_path = f"osg-spec-docs/tasks/stories/{story_id}.yaml"
    if not exists(story_path):
        return failed(f"Story 文件不存在: {story_path}")
    story = read_yaml(story_path)

    # 检查 Story 状态
    if story.status not in ["approved", "pending"]:
        return failed(f"Story {story_id} 状态为 {story.status}，需要 approved 或 pending")

    # ========== Phase 2~3: 拆分 + 校验 ==========
    return split_tickets(story_id)


```

**影响**: `split_tickets()` 函数签名不变，下游无影响

### T-2: 失败退出规则补充（🟡中）

**文件**: `.claude/skills/ticket-splitter/SKILL.md`
**位置**: 第 393-407 行 失败退出规则段落
**操作**: 替换

替换后内容：
```
⚠️ Phase 1 失败：Story 文件不存在或状态不对：
1. 输出错误信息（提示 Story 路径或状态问题）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 停止 — 上游有问题不往下跑

⚠️ Phase 2 失败：当 max_iterations（默认 5）次迭代后仍有校验项未通过：
1. 输出失败报告（列出所有未通过的校验项和具体问题）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 不保存 Ticket 文件 — 禁止写入不完整的产物
4. 停止自动继续 — 提示用户人工介入
5. 用户可以调整 Story 后重新执行 /split ticket S-xxx

⚠️ Phase 3 失败：当增强终审经过 max_enhanced_rounds（默认 10）轮后仍有问题：
1. 输出失败报告（列出最后一轮的所有未通过项，包括三维度终审和多维度旋转校验）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 不保存 Ticket 文件 — 禁止写入不完整的产物
4. 停止自动继续 — 提示用户人工介入
5. 用户可以调整 Story 后重新执行 /split ticket S-xxx
```

### T-3: 迭代计数示例修正（🟢低）

**文件**: `.claude/skills/ticket-splitter/SKILL.md`
**位置**: 第 515 行
**操作**: 替换

```
🔍 终审轮次 3/10 (维度 H — 交叉影响)
```
→
```
🔍 终审轮次 3/10 (维度 B — 边界完整性)
```

### T-4: 流程图补充 Phase 1（🟡中）

**文件**: `.claude/skills/ticket-splitter/SKILL.md`
**位置**: 第 79-82 行
**操作**: 替换

```
[读取 Story]
    │ - osg-spec-docs/tasks/stories/S-xxx.yaml
```
→
```
[Phase 1: 输入收集]
    │ - 读取 config.yaml + STATE.yaml
    │ - 检查 Story 文件是否存在（不存在 → 失败退出）
    │ - 检查 Story 状态（非 approved/pending → 失败退出）
    │
    ▼
[读取 Story]
    │ - osg-spec-docs/tasks/stories/S-xxx.yaml
```

## 执行顺序

从文件末尾到开头，避免行号偏移：
1. T-3（第 515 行）
2. T-2（第 393-407 行）
3. T-1（第 212-213 行）
4. T-4（第 79-82 行）

## 自校验结果

### 第 1 轮（通用 G1-G9）

| ID | 校验项 | 结果 | 说明 |
|----|--------|------|------|
| G1 | 目标明确？ | ✅ | 4 项修改，每项有明确位置和内容 |
| G2 | 影响范围完整？ | ✅ | 仅 1 个文件，无下游影响 |
| G3 | 执行清单可操作？ | ✅ | 每项有文件、行号、操作类型、具体内容 |
| G4 | 设计决策有理由？ | ✅ | 4 个决策都有理由 |
| G5 | 前置条件满足？ | ✅ | story-splitter 已修复 |
| G6 | 违反设计原则？ | ✅ | 无 ask_user，自动检查状态 |
| G7 | 执行顺序正确？ | ✅ | 从末尾到开头，避免行号偏移 |
| G8 | 遗漏修改项？ | ✅ | 对比 story-splitter 的 5 项修改，ticket-splitter 对应 4 项（无"已有 Tickets 清理"因为 ticket 拆分是按 Story 独立的） |
| G9 | 自洽？ | ✅ | T-1 入口函数与 T-4 流程图一致，T-2 失败退出覆盖 T-1 的失败路径 |

### 第 2 轮（文件同步 F1 + 交叉引用 F3）

| ID | 校验项 | 结果 | 说明 |
|----|--------|------|------|
| F1 | workflow 文件需要更新？ | ✅ | split-ticket.md 步骤 1 已是"读取 Story"，T-4 在 Skill 内部补充 Phase 1，workflow 不需要改 |
| F3 | 硬约束节需要更新？ | ✅ | 已有"禁止在校验未全部通过时保存 Ticket 文件"，无需新增 |

全部通过。
