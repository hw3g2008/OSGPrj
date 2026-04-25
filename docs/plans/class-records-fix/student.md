# 课程记录修复 — 学生端

> 原型: student.html → 课程记录查看 + 评价相关部分
> 当前实现: 见下方组件列表
> 排查日期: 2026-04-22

---

## 排查状态：✅ 已完成排查

### 组件路径

| 组件 | 路径 | 说明 |
|------|------|------|
| 列表页 + 详情/评价弹窗 | `osg-frontend/packages/student/src/views/courses/index.vue` (1230行) | 全部功能在一个文件 |

**功能定位**：查看 + 评价（不是提交端）

**技术特点**（与其他端差异大）：
- 使用 **Ant Design Vue** 组件（ATable/AModal/ASelect/AButton 等），其他端大多用原生 HTML
- **元数据驱动**：所有 label/placeholder/options 从后端 `getStudentClassRecordsMeta()` API 获取，前端不硬编码文案
- **真实 API**：`listStudentClassRecords()` 加载列表 + `rateStudentClassRecord()` 提交评价

---

## 功能结构

```
列表页
├── 提醒 Banner（"您有 N 条新课程记录等待评价"）
├── Tab（全部 / 待评价 / 已评价）
├── 筛选（关键词 / 辅导类型 / 课程内容 / 时间范围）
├── ATable 表格
│   └── 列：记录ID / 辅导内容 / 课程内容 / 导师 / 上课日期 / 时长 / 评价 / 操作
├── 详情弹窗 (detailVisible)
│   ├── 导师卡片（头像缩写 + 姓名 + 角色 + 日期 + 时长 + 辅导类型 tag）
│   ├── 课程信息（recordId / coachingDetail / courseContent / mentor / classDate / duration / 当前评价）
│   └── 课程反馈（ratingFeedback — 学员填的反馈，非导师 feedbackContent）
└── 评价弹窗 (rateVisible)
    ├── 课程卡片
    ├── 星级评分（1-5 分 ⭐）
    ├── 标签选择（多选 chip）
    └── 反馈文本 textarea
```

---

## 已发现的问题

### 1. 详情弹窗缺导师课程反馈 ⚠️

**问题**：详情弹窗 (L238-258) "课程反馈" section 显示的是 `ratingFeedback`（学员自己写的评价反馈），**不是** `feedbackContent`（导师/班主任填写的课程反馈全文）。

- `ratingFeedback`：学员评价课程时填的文字
- `feedbackContent`：导师提交课程记录时填的反馈

学生端原型中应能看到导师写的课程反馈，当前实现只能看自己的评价。

**修复**：新增"导师反馈"区域显示 `feedbackContent`，保留"我的评价"显示 `ratingFeedback`。

### 2. 详情弹窗和列表缺公司名展示 ⚠️

**问题**：
- 列表辅导内容列 (L123-129)：显示 `coachingType` tag + `coachingDetail`，无公司名
- 详情弹窗 (L213-214)：显示 `coachingDetail`，无公司名

与 admin/assistant 端相同问题。

**修复**：依赖 shared.md §3 后端返回 `coachingCompany`，前端拼接显示。

### 3. 缺少附件展示 ⚠️

**问题**：详情弹窗中没有附件展示区域。导师提交的简历等附件在学生端不可见。

学生端原型中可能需要查看简历附件（毕竟是自己的简历）。

**修复**：依赖 shared.md §2 附件系统就绪后，详情弹窗新增附件列表（只读下载）。

### 4. 课程类型 tag 直接用后端原始值 ⚠️

**问题**：列表列 (L126) 直接渲染 `record.coachingType`，不做前端映射。

元数据驱动模式下，label 应由后端 meta API 正确返回。但如果后端返回 `position_coaching` 而非"岗位辅导"，前端会原样显示。

**待确认**：后端 `getStudentClassRecordsMeta()` 返回的 coachingType options 是否已做中文映射。如果后端已处理则此项无需修复。

### 5. 列表页有真实 API 调用 ✅

- `onMounted` → `bootstrapPage()` → `loadPage()` (L653-672) ✅
- `getStudentClassRecordsMeta()` 加载元数据 ✅
- `listStudentClassRecords()` 加载列表 ✅
- `rateStudentClassRecord()` 提交评价 ✅
- 筛选（关键词/辅导类型/课程内容/时间范围）✅
- Tab 切换（全部/待评价/已评价）✅

### 6. 评价功能完整 ✅

- 星级评分 1-5 (L294-303) ✅
- 标签多选 chip (L309-319) ✅
- 反馈文本 textarea (L325-329) ✅
- 提交验证（必须选分 + 必须填反馈）(L605-613) ✅
- 提交后刷新列表 (L624) ✅

---

## 与其他端对比

| 维度 | student | assistant | mentor | lead-mentor |
|------|---------|-----------|--------|-------------|
| 角色定位 | 查看 + 评价 | 只读查看 | 提交 + 查看 | 提交 + 查看 |
| UI 框架 | **Ant Design Vue** | 原生 HTML | 原生 HTML | 原生 HTML |
| 元数据驱动 | **✅ 全量** | ❌ | ❌ | ❌ |
| 列表数据来源 | 真实 API ✅ | 真实 API ✅ | 真实 API ✅ | 硬编码 mock ❌ |
| 导师反馈展示 | ❌ 缺（显示 ratingFeedback） | ❌ 缺（显示 reviewRemark） | N/A | N/A |
| 公司名展示 | ❌ 缺 | ❌ 缺 | ❌ 缺 | ❌ 缺 |
| 附件展示 | ❌ 缺 | ❌ 缺 | N/A | N/A |
| 评价功能 | ✅ 完整 | ❌ 无 | N/A | N/A |

---

## 修复优先级

| 优先级 | 问题 | 依赖 |
|--------|------|------|
| **P1** | #1 详情弹窗补导师课程反馈 | 后端 feedbackContent 已返回（需确认） |
| **P1** | #4 确认课程类型 tag 是否需前端映射 | 确认后端 meta API |
| **P2** | #2 公司名展示 | shared.md §3 |
| **P2** | #3 附件展示 | shared.md §2 |
