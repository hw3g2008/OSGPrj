# M5 Students 子 Epic — 快速评估

## 范围（4 端，但 LM/Mentor 多为 placeholder）

| 端 | 文件 | 行数 | 性质 |
|---|---|---|---|
| admin | `admin/src/views/users/students/index.vue` | 958 | 完整 CRUD |
| assistant | `assistant/src/views/students/index.vue` | 623 | 我的学员列表 |
| lead-mentor | `lead-mentor/src/views/students/index.vue` | 24 | placeholder |
| lead-mentor | `lead-mentor/src/views/teaching/students/index.vue` | ? | 实际管理页 |
| mentor | `mentor/src/views/students/index.vue` | 7 | placeholder（路径占位） |

**实际 SSOT 范围**：admin / assistant / lead-mentor (teaching/students)。Mentor 端 stub 不参与。

## 共性快速估算

共用元素：
- 学员姓名 + ID 头像（已有 shared/StudentAvatarCell）
- `<a-tag>` 学员状态（active / paused / completed）
- `<a-table>` + filter（companyName / industry 等）
- 学员详情 Modal

各端差异：
- **admin**: 完整 CRUD + 合同管理
- **assistant**: 名下学员列表
- **lead-mentor (teaching/students)**: 班级学员管理

## 共性覆盖率估算

- `StudentAvatarCell` ✅ 已抽（M1.1.3）
- `<a-tag>` student status：3 端共用 → P0 候选
- StudentDetailModal: 各端差异大 → P1 跳过

**估算共性覆盖率：30-40%**（有 StudentAvatarCell 作为基础）→ "仅抽纯 UI" 档

## P0 候选清单

| # | 组件 | 类型 | 估算行数 |
|---|---|---|---|
| M5.1 | `StudentStatusTag.vue` | UI Tag | ~30 |

## 决策

⚠️ **降级**：仅抽 P0 1 个 Tag 组件。

P1（StudentDetailModal / StudentTable）跳过。

## 已知遗留

- lead-mentor / mentor 的 placeholder 文件（24 / 7 行）需要在子 Epic 时确认是否纳入或保留 stub
- assistant 已用 shared/StudentAvatarCell，其他端未接入（待 M5 执行时统一）

## 状态

⏳ Quick assessment 完成，等具体执行
