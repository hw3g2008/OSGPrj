# M3 Mock Practice 子 Epic — 快速评估

## 范围（5 端）

| 端 | 文件 | 行数 |
|---|---|---|
| admin | `admin/src/views/career/mock-practice/index.vue` | 430 |
| assistant | `assistant/src/views/career/mock-practice/index.vue` | 620 |
| lead-mentor | `lead-mentor/src/views/career/mock-practice/index.vue` | 1283 |
| mentor | `mentor/src/views/mock-practice/index.vue` | 368 |
| student | `student/src/views/mock-practice/index.vue` | 774 |

5 端齐全，但 mentor 端是表格式（旧 HTML class），其他 antd 实现。

## 共性快速估算

共用元素：
- `practiceType` 字段（mock / midterm / interview 等）
- `practiceStatus` 字段（pending / completed / cancelled）
- 表格/卡片 + filter（practiceType filter）
- `<a-tag>` 显示类型/状态

各端差异：
- **admin**: 全列表 + 统计卡 + 反馈管理
- **assistant**: 浏览 + 学员推荐
- **lead-mentor**: 完整管理（最大文件）
- **mentor**: 个人面试列表（旧 HTML class，未完全 antd 化）
- **student**: 个人面试 + 申请

## 共性覆盖率估算

- `<a-tag>` practiceType 颜色映射：5 端共用 → P0 候选
- `<a-tag>` practiceStatus 颜色映射：4 端共用（admin/assistant/LM/student）→ P0 候选
- Table/FilterBar/Card：各端结构差异大 → P1 跳过

**估算共性覆盖率：30-40%** → "仅抽纯 UI" 档

## P0 候选清单

| # | 组件 | 类型 | 估算行数 |
|---|---|---|---|
| M3.1 | `PracticeTypeTag.vue` | UI Tag | ~40 |
| M3.2 | `PracticeStatusTag.vue` | UI Tag | ~30 |

## 决策

⚠️ **降级**：仅抽 P0 2 个 Tag 组件。P1 跳过。

## P0 抽取前置条件（实测发现）

实测各端 statusColor 规则发现 **status enum 定义不一致**：

- **admin** statusColor: `pending → orange / scheduled → green / completed → cyan / cancelled → default`
- **assistant** statusColor: `new / new_assigned → red / completed → green / cancelled → default / ongoing → blue / pending / scheduled → orange`

业务语义不同：admin 的 `scheduled` 是绿色（已安排成功），assistant 的 `scheduled` 和 `pending` 都是橙色（待处理）。这意味着 enum 取值不一致 + 业务态映射也不一致。

→ **不能直接抽 PracticeStatusTag**，需先做业务侧 status enum 统一。

按路线图 §1.2 原则 B（"数据结构能统一才统一"）：抽 shared 前必须先统一各端 enum 定义。

**前置任务**：
1. 业务侧确认 SSOT enum（建议以最完整端为准 = Assistant）
2. 各端后端 API / 数据迁移到统一 enum（含 DB migration）
3. 然后才能抽 PracticeStatusTag

## 已知遗留

- mentor 端 mock-practice/index.vue 仍是旧 HTML class（未完全 antd 化），独立处理
- 各端的 typeColor / typeLabel / typeIcon 函数三端不一致，按 SSOT 收敛到 shared utility

## 状态

⏳ Quick assessment 完成。P0 实施被前置条件（enum 统一）阻塞，待业务统一后执行。
