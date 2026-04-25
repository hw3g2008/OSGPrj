# M2 Positions 子 Epic — 快速评估

> 由 M1 完成后启动的快速 scope assessment。完整 `01-current-state.md` 共性审计待具体执行时再做。

## 范围（4 端）

| 端 | 文件 | 行数 | 已用 shared 次数 |
|---|---|---|---|
| admin | `admin/src/views/career/positions/index.vue` | 936 | 4 |
| assistant | `assistant/src/views/career/positions/index.vue` | 1053 | 3 |
| lead-mentor | `lead-mentor/src/views/career/positions/index.vue` | 1465 | 5 |
| student | `student/src/views/positions/index.vue` | 1872 | 2 |

**Mentor 不参与**（Mentor 端无 positions 页面，路线图 §7.5 端参与度降级触发）。

## 共性快速估算

四端均为 antd 实现，共用元素：
- `<a-card>` 卡片骨架
- `<a-tag>` 状态/类别 tag（industry / position count / open count 等）
- `<a-select>` filter（companyName / recruitmentCycle）
- `<a-table>` 或 `<a-list>` 数据展示
- 字段统一：`companyName` / `positionName` / `recruitmentCycle` / `industry`

各端差异：
- **admin**: 完整 CRUD（增删改查 + 审核学生自添岗位）
- **assistant**: 浏览 + 收藏 + 学员推荐
- **lead-mentor**: 浏览 + 推荐给学员（与 assistant 类似但有更多管理）
- **student**: listing + 申请

## 共性覆盖率估算

按文件量（4 端总 5326 行）+ UI/逻辑共用估算：
- `<a-tag>` 类别 + 状态：可抽 P0（IndustryTag / PositionStatusTag / RecruitmentCycleTag）
- `<a-card>` 公司+岗位卡片：4 端样式相近但内容不同，**P1 候选**但风险大
- `<a-select>` filter 下拉：选项一致但筛选逻辑各端不同

**估算共性覆盖率：30-40%**（按路线图 §5.1.2 判据 → "仅抽纯 UI"档）

## P0 候选清单

| # | 组件 | 类型 | 估算行数 |
|---|---|---|---|
| M2.1 | `IndustryTag.vue` | UI Tag | ~30 |
| M2.2 | `PositionStatusTag.vue` (open/closed) | UI Tag | ~30 |
| M2.3 | `RecruitmentCycleTag.vue` (招聘周期) | UI Tag | ~30 |

## 决策

⚠️ **降级**：按路线图 §5.1.2 共性 30-50% 区间 → "仅抽纯 UI 组件"。

P0 候选 3 个 Tag 组件可抽。P1 复合（FilterBar / Table / Cards）跳过。

## P0 抽取前置条件

参考 M3 实测发现：抽 shared Tag 前需先确认各端 enum 一致。M2 需在执行时实测：

1. 各端 industry 取值是否一致（可能各端 dictionary 差异）
2. positionStatus enum（open / closed / pending 等）各端是否对齐
3. recruitmentCycle 取值各端是否对齐

如发现 enum 不一致 → 先做业务侧统一，再抽 shared。

## 执行入口

按 M1 模式：
1. 抽 IndustryTag → 4 端接入
2. 抽 PositionStatusTag → 4 端接入
3. 抽 RecruitmentCycleTag → 4 端接入

## 已知遗留

- 学生端 student/src/views/positions/index.vue 1872 行，是 5 端中最复杂的（含 industry tree + 申请流程），shared 抽取效益最低
- admin 已有独立的 PositionFormModal 和 student-positions（学生自添岗位审核），**不属于本 Epic**

## 状态

⏳ Quick assessment 完成，等具体执行
