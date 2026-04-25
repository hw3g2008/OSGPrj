# M4 Class Records 子 Epic — 快速评估

## 范围（3 端，非 5 端）

| 端 | 文件 | 行数 |
|---|---|---|
| admin | `admin/src/views/teaching/class-records/index.vue` | 410 |
| assistant | `assistant/src/views/class-records/index.vue` | 937 |
| lead-mentor | `lead-mentor/src/views/teaching/class-records/index.vue` | 1488 |

**Mentor / Student 没有 class-records 列表页**（仅有相关入口，未完整列表）。

## 共性快速估算

共用元素：
- `<a-tag>` 课程状态（draft / submitted / approved / rejected）
- `<a-tag>` 课程类型（job_coaching / mock / midterm 等）
- 表格 + filter
- 附件上传/下载

各端差异：
- **admin**: 全列表 + 统计 + 审核
- **assistant**: 学员课程报告（路径不同 - 不在 teaching/）
- **lead-mentor**: 班级课程管理（最大文件，含 batch 操作）

## 共性覆盖率估算

- `<a-tag>` recordStatus / recordType 颜色映射：3 端共用 → P0 候选
- Form / Modal：差异大 → P1 跳过

**估算共性覆盖率：25-35%** → "仅抽纯 UI" 或 "推迟" 档

## P0 候选清单

| # | 组件 | 类型 | 估算行数 |
|---|---|---|---|
| M4.1 | `ClassRecordStatusTag.vue` | UI Tag | ~40 |
| M4.2 | `ClassRecordTypeTag.vue` | UI Tag | ~40 |

## 已知协调点

`docs/plans/class-records-fix/` 已有修复计划，本 Epic 应**与之协调**（避免重复修改）。

## 决策

⚠️ **降级**：仅抽 P0 2 个 Tag 组件。P1 跳过。

可选：可结合 docs/plans/class-records-fix/ 一起做。

## 状态

⏳ Quick assessment 完成，等具体执行
