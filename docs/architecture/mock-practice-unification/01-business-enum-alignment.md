# 业务侧对齐 brief：Mock Practice Status Enum SSOT 收敛

**日期**：2026-04-26  
**触发**：`2026-04-26-three-ends-overall-extraction-survey.md` §3.2 第 3 批 — 解锁 M3 PracticeTypeTag/StatusTag shared 抽取  
**接收方**：业务方（产品/运营） + 后端组

---

## 1. 背景

按 `2026-04-26-three-ends-overall-extraction-survey.md` §2.3 + 实测：

> M3 P0 候选组件 `PracticeStatusTag.vue` 被 status enum 不一致阻塞。原文档（M3 quick assessment）认为 admin vs assistant 不一致；但 admin 已剥离改造对象后，**asst / mentor / LM 三端 enum 仍不一致**。

→ 抽 shared 前必须先做业务侧 SSOT enum 收敛。

---

## 2. 当前三端 enum 实测

### 2.1 enum 取值矩阵

| 状态 | asst | mentor | LM |
|---|:---:|:---:|:---:|
| `new` | ✅ | ✅ | ?（由后端给） |
| `new_assigned` | ✅ | ❌ | ?（由后端给） |
| `pending` | ✅ | ✅ | ?（由后端给） |
| `scheduled` | ✅ | ✅ | ?（由后端给） |
| `confirmed` | ❌ | ✅ | ?（由后端给） |
| `ongoing` | ✅ | ❌ | ?（由后端给） |
| `completed` | ✅ | ✅ | ?（由后端给） |
| `cancelled` | ✅ | ✅ | ?（由后端给） |

**LM 用 `statusUi.statusTone`，由后端 `statusLabel + statusTone` 直接决定 UI** — 这是 LM 后端"代码侧固化"的结果，业务态对前端不可见。

### 2.2 颜色映射不一致

| 端 | pending | scheduled | confirmed | ongoing | completed | cancelled |
|---|---|---|---|---|---|---|
| **asst** | orange | orange | — | blue | green | default |
| **mentor** | (label "待进行") | (label "待进行") | (label "待进行") | — | (label "已完成") | (label "已取消") |
| **LM** | 后端给 tone | 后端给 tone | 后端给 tone | 后端给 tone | 后端给 tone | 后端给 tone |

**关键问题**：
- asst 把 `pending` 和 `scheduled` 同色（都是 orange），但语义本是"待安排" vs "已安排"
- mentor 把 `pending / scheduled / confirmed` 三个状态都映射为 label "待进行"
- LM 干脆放弃前端枚举，由后端决定 tone — 这是**最差的一致性**（任何 UI 调整都要改后端）

### 2.3 业务语义对比

| 业务态 | asst 含义 | mentor 含义 | LM 含义 |
|---|---|---|---|
| 新分配 | 后端刚分配 mentor，待 mentor 确认 | 同 asst | ? |
| 待进行 | 已确认时间，等到点开始 | 同 asst | ? |
| 已确认 | (asst 无此态) | 同 mentor 已确认 | ? |
| 进行中 | 已开始正在面试 | (mentor 无此态) | ? |
| 已完成 | 面试结束 | 同 asst | 同 asst |
| 已取消 | 任何阶段被取消 | 同 asst | 同 asst |

→ 三端实际有不同的"业务流细分"，需对齐。

---

## 3. 推荐 SSOT enum（建议以 asst 为基准）

### 3.1 完整状态机

```
new → pending → scheduled → ongoing → completed
              ↓
          cancelled (任何节点都可走)
```

| enum 值 | 中文 | 颜色 | 含义 |
|---|---|---|---|
| `new` | 新分配 | red | 后端刚分配 mentor，等 mentor 接受 |
| `pending` | 待安排 | orange | mentor 已接受，等安排具体时间 |
| `scheduled` | 已安排 | green | 时间已确认，等到点开始 |
| `ongoing` | 进行中 | blue | 已开始正在面试 |
| `completed` | 已完成 | cyan | 面试结束 |
| `cancelled` | 已取消 | default | 任何节点取消 |

### 3.2 各端迁移工作

| 端 | 当前状态 | 目标 | 工作量 |
|---|---|---|---:|
| **asst** | 已用上述 enum，但 pending/scheduled 颜色是 orange/orange | 改 scheduled → green | 0.1 天前端 |
| **mentor** | 缺 `ongoing` / 把 `confirmed` 映射成"待进行"歧义 | 后端 enum 加 ongoing，前端把 confirmed 改名为 scheduled | 0.5 天后端 + 0.2 天前端 |
| **LM** | 后端固化 tone，业务态不透明 | 后端把 tone 解耦，返回 status enum，前端按 SSOT 映射颜色 | 1 天后端 |
| **DB migration** | 历史 mock_practice 表 status 字段值校准 | 把 mentor 的 confirmed 迁移到 scheduled | 0.3 天 |

---

## 4. 业务侧需做的决策

### 4.1 关键决策点

1. **是否同意 SSOT enum 以 asst 为基准？**
   - 如同意：按 §3.1 推进
   - 如不同意：业务方给出新的 SSOT 定义

2. **mentor 当前的 `confirmed` 是否就是 asst 的 `scheduled`？**
   - 如是：DB migration 改名
   - 如否：业务方解释 `confirmed` 的真实业务语义

3. **LM 后端 tone 解耦是否值得做？**
   - ROI：解锁 shared PracticeStatusTag (~30 行 UI 组件)
   - 工作量：后端 1 天
   - 决策方：业务/技术综合判断

### 4.2 决策不影响优先级

按整体路线图，M3 P0 PracticeStatusTag 是 **P3 优先级**（共性产出小，~50 行 Tag 组件）。

**不强制业务方为此推进 enum 统一**，可作为长期改进事项，等业务侧自然推动。

---

## 5. 决策选项

| 选项 | 描述 | 适用场景 |
|---|---|---|
| **A. 立即推进** | 业务方同意 §3.1 SSOT，立即排期 | 业务侧已认同需要统一 |
| **B. 长期等待** | 暂不推动，本期 M3 P0 跳过 | 业务侧无暇对齐，前端长期维持各自 enum |
| **C. 仅前端层 mapper** | 不改后端 enum，前端写 `mapPracticeStatus(status, end)` 函数兜底 | 临时方案，但破坏 shared 一致性原则 |
| **D. 退回至当前** | 完全跳过 PracticeStatusTag 抽取，保留各端独立 | 直接放弃 M3 P0 |

**当前推荐：选项 B（长期等待）**，理由：
- ROI 太低（仅 ~50 行）
- 阻塞 M4/M5 解锁更紧要
- mock-practice 业务流本身可能在 V2 调整，先不固化

---

## 6. 工作量估算（如选 A）

| 任务 | 工作量 |
|---|---:|
| 业务方对齐 SSOT enum + DB migration 决策 | 1 天（跨组对齐） |
| 后端：mentor / LM enum 迁移 + DB migration 脚本 | 1.5 天 |
| 前端：三端 status mapper 删除 + 接入 shared PracticeStatusTag | 0.5 天 |
| 测试 + 验收 | 0.5 天 |
| **总计** | **3.5 天** |

---

## 7. 关联文档

- `docs/architecture/mock-practice-unification/00-epic-overview.md` (M3 quick assessment)
- `docs/architecture/2026-04-26-three-ends-overall-extraction-survey.md` §2.3
- `2026-04-26-lm-asst-commonality-quantification.md` §3.1（mock-practice 已合）

---

## 8. 状态

⏳ 等业务方决策（选项 A/B/C/D）
