# 课程记录修复 — 助教端

> 原型: assistant.html → 课程记录查看 + 提交相关部分
> 当前实现: 见下方组件列表
> 排查日期: 2026-04-21

---

## 排查状态：✅ 已完成排查

## 修复状态（2026-04-22 / 2026-04-23 增补）

| 批次 | 状态 | 备注 |
|------|------|------|
| T1 详情面板课程反馈全文 | ✅ 已修 | 新增“课程反馈”区块 + `ClassRecordRow` 加 `feedbackContent` 字段 |
| T2 课程类型映射补全 | ✅ 已修 | 3→5 种，修正“课程辅导”错误映射 |
| T3 辅导内容公司名 | ⏳ 待 S3 后端就绪 |
| T4 附件展示 | ⏳ 待 S2 后端就绪 |
| ~~T1 (上报功能)~~ | ✅ 已实现 | 新增 `AssistantClassReportFlowModal.vue`，并在 2026-04-23 完成 absent 契约落实（详见下） |
| **T5 Absent 契约（2026-04-23）** | ✅ 已修 | DB NULL 化 + 后端校验/默认值/label null 安全 + 弹窗 payload 精简 + UI 空值兼容 + 旷课备注行，**详见 [2026-04-23-absent-contract-implementation.md](./2026-04-23-absent-contract-implementation.md)** |
| **T6 测试基建清理（2026-04-23）** | ✅ 已修 | Node 25 localStorage polyfill + sidebar 断言 6→4 + vitest 排除 Playwright E2E，全量 91/91 PASS |

### 组件路径

| 组件 | 路径 | 说明 |
|------|------|------|
| 列表页 | `osg-frontend/packages/assistant/src/views/class-records/index.vue` | 列表 + 详情 Modal（含 absent 旷课备注行） |
| 上报弹窗 | `osg-frontend/packages/assistant/src/views/class-records/AssistantClassReportFlowModal.vue` | 2026-04-23 新增；absent 时 payload 精简、学习时长字段隐藏 |

> 注：原排查报告（2026-04-21）记录"助教端没有上报弹窗组件"，该定位已在 2026-04-22/04-23 被推翻：新增上报弹窗并完成 absent 契约。

---

## 已发现的问题

### 1. 缺少"上报课程记录"功能 ❌

**问题**：原型 assistant.html L4354-4363 确认助教端有课程记录提交入口（简历上传**非必填**）。但当前实现完全是只读的：

- 页面 header 标注 `<span class="readonly-pill">只读查看 / 反馈摘要</span>` (L16-17)
- **没有** "上报课程记录" 按钮
- **没有** 上报弹窗组件
- **没有** 表单提交逻辑

对比 lead-mentor 端：有 "上报课程记录" 按钮 + `LeadMentorClassReportFlowModal` 完整表单 + API 提交。

**待确认**：助教端在 V1 scope 中是否需要上报功能，还是只需只读查看？
- 如果需要上报：需新建 `AssistantClassReportFlowModal.vue`，参考 `LeadMentorClassReportFlowModal.vue`，附件改为非必填
- 如果只需只读：当前实现符合需求，此项标记为"设计决策"而非 bug

### 2. 列表页有真实 API 调用 ✅（比 lead-mentor 好）

列表页通过 `getAssistantClassRecordList()` / `getAssistantClassRecordStats()` 动态加载数据 (L517-562)：
- `onMounted` 触发 `loadRecords()` ✅
- 搜索筛选 ✅（keyword + status + reporterRole + coachingType）
- 统计卡片 ✅（总数 / 待审核 / 已通过 / 待结算金额）
- 详情面板 ✅（选中一条记录后右侧展示详情）

### 3. 缺少岗位/公司名展示 ⚠️

**问题**：列表页和详情面板中**没有**岗位/公司名字段。

- 列表 `<table>` 列：课程信息 / 学员·导师 / 辅导内容 / 上课时间 / 时长·费用 / 状态 / 详情
- 详情面板字段：课程内容 / 辅导类型 / 学员 / 导师 / 申报角色 / 审核状态 / 上课时间 / 课时·费用 / 学员评价 / 反馈摘要

**缺失**：辅导内容应包含公司名（如 "岗位辅导 Goldman Sachs"），与 admin 端原型一致。

**修复**：依赖 shared.md §3 后端返回 `coachingCompany`，前端辅导内容列拼接公司名。

### 4. 详情面板缺课程反馈全文 ⚠️

**问题**：详情面板 "反馈摘要" (L243-244) 显示 `reviewRemark`（审核备注），**不是** feedbackContent（导师填写的课程反馈）。

- `reviewRemark` 是审核人的备注
- `feedbackContent` 是导师/班主任提交的课程反馈全文

**修复**：新增 "课程反馈" 区域显示 `feedbackContent`，保留 "反馈摘要" 显示 `reviewRemark`。

### 5. 缺少附件展示 ⚠️

**问题**：详情面板中没有附件展示区域。导师/班主任提交的简历附件在助教端不可见。

**修复**：依赖 shared.md §2 附件系统就绪后，详情面板新增附件列表（只读下载）。

### 6. 课程类型映射不全 ⚠️

**问题**：`coachingTypeLabel()` (L441-456) 只映射了 3 种类型：

```ts
if (normalized.includes('mock')) return '模拟应聘'
if (normalized.includes('position')) return '岗位辅导'
if (normalized.includes('course')) return '课程辅导'
```

原型中有 5 种课程类型（岗位辅导 / 模拟面试 / 人际关系 / 模拟期中 / 基础课程），当前实现会把 networking / mock-midterm / basic 等后端返回值原样显示。

**修复**：补全 `coachingTypeLabel()` 映射，覆盖所有后端返回的课程类型 key。

---

## 与其他端对比

| 维度 | mentor | lead-mentor | assistant |
|------|--------|-------------|-----------|
| 上报功能 | ✅ 有 | ✅ 有 | ❌ 无（待确认是否 V1 需求） |
| 列表数据来源 | 真实 API ✅ | 硬编码 mock ❌ | 真实 API ✅ |
| 岗位/公司名 | 硬编码岗位 | 硬编码岗位 | 列表/详情无展示 |
| 附件 | 假上传 | 空壳 | 无展示区域 |
| 课程类型映射 | 完整 | 完整 | 不全（只 3 种） |
| 课程反馈展示 | N/A（提交端） | N/A（提交端） | 缺失（显示 reviewRemark 而非 feedbackContent） |

---

## 修复优先级

| 优先级 | 问题 | 依赖 |
|--------|------|------|
| **P0** | #1 确认是否需要上报功能 | 产品决策 |
| **P1** | #4 详情面板课程反馈全文 | 后端 feedbackContent 已返回 |
| **P1** | #6 课程类型映射补全 | 无 |
| **P2** | #3 辅导内容公司名 | shared.md §3 |
| **P2** | #5 附件展示 | shared.md §2 |
