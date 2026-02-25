# Story 流程修复方案

> 状态：**已完成 ✅**
> 问题 1：已修复（3 个文件：next.md WS/CC + deliver-ticket/SKILL.md）
> 问题 2：不需要修（每个环节只管自己的事）

## 一、目标（原始）

- **一句话**：修复 Story 流程中的边界处理缺失和完整性保障不足
- **验收标准**：
  1. `/next` 在当前 Story 无 pending Ticket 时有明确错误提示，不会静默失败
  2. story-splitter 拆分后能回溯验证 PRD 功能点是否被 Stories 完整覆盖

## 二、现状问题

### 问题 1：/next 缺少边界处理（F-10）

```
当前 Story 所有 Tickets 都 done（状态 = story_verified）
用户误执行 /next
  → 查找 pending Ticket → 找不到 → ？？？（无明确处理）
```

deliver-ticket 第 302 行检查 `ticket.status not in ["pending", "in_progress"]`，但 next.md 第 12 行"找到第一个 status: pending 的 Ticket"没有说找不到时怎么办。

### 问题 2：Story 完整性无回溯保障

```
SRS 文档（brainstorm 产物）
  → story-splitter 读取 SRS，提取 FR IDs
  → 拆分为 Stories，校验 FR↔Story 覆盖率 100%
```

story-splitter 的 FR↔Story 覆盖率校验（Phase 2 第 189-202 行）只看 SRS 中的 FR IDs。如果 SRS 本身遗漏了 PRD 中的功能点，Stories 也会遗漏。**story-splitter 完全信任 SRS，没有回溯 PRD。**

## 三、设计决策

| # | 决策点 | 推荐 | 理由 |
|---|--------|------|------|
| D1 | /next 找不到 pending Ticket 时怎么办 | 在 next.md 和 deliver-ticket 中增加边界检查：输出当前 Story 状态提示，不执行任何操作 | 上游有问题就停，给明确提示 |
| D2 | story-splitter 是否需要回溯 PRD | **不需要**。brainstorming Phase 2 已有 PRD 覆盖率 100% 校验 + Phase 4 HTML↔PRD↔SRS 全量校验。SRS 是 brainstorming 的产物，brainstorming 已保证 SRS 覆盖 PRD。story-splitter 信任 SRS 是正确的——每个环节只管自己的事 | 每个节点只做一件事 |

## 四、执行清单

| # | 文件 | 改什么 |
|---|------|--------|
| 1 | `.windsurf/workflows/next.md` 第 12 行后 | 增加边界处理：如果当前 Story 无 pending Ticket，输出提示（当前 Story 状态 + 建议操作），不调用 deliver-ticket |
| 2 | `.claude/skills/deliver-ticket/SKILL.md` 伪代码 Step 0 前 | 增加前置检查：从 STATE.yaml 读取 current_story，检查是否有 pending Ticket，没有则 return failed() |

## 五、自校验

| 校验项 | 结果 |
|--------|------|
| G1 一看就懂 | ✅ 两个问题，一个真正要修，一个不需要修 |
| G2 目标明确 | ✅ 2 条验收标准 |
| G7 改动自洽 | ✅ next.md + deliver-ticket 两处同步 |
| G9 场景模拟 | ✅ 用户在 story_verified 状态执行 /next → 提示"当前 Story 所有 Tickets 已完成，请执行 /approve 或 /cc-review" |

## 六、关闭分析

### 问题 1 不需要修的原因

1. `story_verified` 状态的 `next_action: null` → workflow-engine 自动继续循环在"next_step 为空"时停止
2. next.md 和 deliver-ticket 是给 AI 看的指令文档，不是代码。AI 有判断能力，找不到 pending Ticket 时会自己提示用户
3. 极低概率的边缘场景（正常流程中最后一个 Ticket 完成 → 自动 Story 验收 → 用户不会再执行 /next）

### 问题 2 不需要修的原因

brainstorming Phase 2 已有 PRD 覆盖率 100% 校验 + Phase 4 HTML↔PRD↔SRS 全量校验。每个环节只管自己的事，story-splitter 信任 SRS 是正确的。
