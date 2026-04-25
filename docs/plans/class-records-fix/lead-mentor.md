# 课程记录修复 — 班主任端

> 原型: lead-mentor.html → 课程记录提交相关部分
> 当前实现: 见下方组件列表
> 排查日期: 2026-04-21

---

## 排查状态：✅ 已完成排查

### 组件路径

| 组件 | 路径 | 说明 |
|------|------|------|
| 列表页 | `osg-frontend/packages/lead-mentor/src/views/teaching/class-records/index.vue` (1490行) | 我的申报 + 我管理的学员 双 scope |
| 上报弹窗（**实际使用**） | `osg-frontend/packages/lead-mentor/src/views/teaching/class-records/LeadMentorClassReportFlowModal.vue` (1073行) | 完整表单 + API 提交 |
| 上报弹窗（**旧壳/死代码**） | `osg-frontend/packages/lead-mentor/src/components/LeadMentorClassReportModal.vue` (891行) | 纯原型壳，handleSubmit 只 emit 不调 API，列表页未引用 |
| 详情弹窗 ×4 | `components/LeadMentorClassDetail[Regular/Resume/Networking/]Modal.vue` | 按课程类型分 4 个详情弹窗 |
| 驳回弹窗 | `components/LeadMentorClassRejectModal.vue` | 查看驳回原因 + 重新提交 |

---

## 已发现的问题

### 1. 岗位选择硬编码 ❌

**问题**：`LeadMentorClassReportFlowModal.vue` L462-466 硬编码岗位列表（与 mentor 端完全相同）：

```ts
const positionOptions = [
  'Goldman Sachs · IB Analyst · Hong Kong',
  'Morgan Stanley · IBD Analyst · New York',
  'McKinsey · Business Analyst · Shanghai',
]
```

提交时 `positionLabel` 字符串写入 `topics` 字段（L592-594），后端不存储为独立列。

**修复**：与 mentor 端一致
1. 选中学员后，调 API 获取该学员的 `osg_student_position` 列表
2. 动态渲染岗位下拉（显示 `company_name · position_name · city`）
3. 选中后存 `studentPositionId`
4. 提交时附带 `studentPositionId`
5. 依赖 shared.md §3（DB 加 `student_position_id` 列）

**涉及文件**：
- `LeadMentorClassReportFlowModal.vue`

### 2. 附件上传是空壳（比 mentor 更严重）❌

**问题**：`LeadMentorClassReportFlowModal.vue` L253-268 的 upload-dropzone 是纯静态 HTML：

```html
<div class="upload-dropzone">
  <i class="mdi mdi-upload" aria-hidden="true" />
  <span>点击上传原简历</span>
</div>
```

- **没有** `<input type="file">` 元素
- **没有** 任何上传处理函数
- 提交 payload (L664-674) 不含任何附件字段

对比 mentor 端：mentor 至少有 `<input type="file">` + `handleResumeUpload()`（虽然只存文件名不真上传），lead-mentor 连 input 都没有。

**修复**：
1. 添加 `<input type="file">` 到 upload-dropzone
2. 选择文件后调 `POST /common/upload` 上传到服务器
3. 保存返回的 `fileName` + `originalFilename`
4. 提交课程记录时附带 `attachments[]` 数组
5. 依赖 shared.md §2 附件表就绪

**涉及文件**：
- `LeadMentorClassReportFlowModal.vue`

### 3. 列表页硬编码假数据 ❌

**问题**：`index.vue` L502-746 的 `initialMineRows` 和 `initialManagedRows` 全部是硬编码的 mock 数据（共 13 条），页面加载时直接使用。

- **没有** `onMounted` 调后端 API 加载已有记录
- 新提交的记录通过 `handleReportSubmit()` (L969-994) 追加到前端列表（真实 API 调用 `createLeadMentorClassRecord`）
- 但刷新页面后新记录消失，回退到硬编码假数据

**修复**：
1. `onMounted` 中调 API 加载课程记录列表
2. 删除 `initialMineRows` / `initialManagedRows` 硬编码数据
3. 需要后端提供 `GET /api/lead-mentor/class-records` 列表接口（如尚未实现）

**涉及文件**：
- `osg-frontend/packages/lead-mentor/src/views/teaching/class-records/index.vue`

### 4. 旧壳组件应清理 ⚠️

**问题**：`components/LeadMentorClassReportModal.vue` (891行) 是纯原型壳：
- `students` 硬编码 3 条（L371-375）
- `positionOptions` 硬编码 3 条（L385-389）
- `handleSubmit()` 只 `emit('submit')` + `closeModal()`，不调后端 API
- 列表页 `index.vue` 已引用新的 `LeadMentorClassReportFlowModal.vue`，旧壳是死代码

**修复**：删除 `LeadMentorClassReportModal.vue`，避免混淆。

### 5. 课程类型 / 反馈表单与原型对比 ✅

| 维度 | 原型 | 当前实现 | 一致性 |
|------|------|---------|--------|
| 课程类型 5 种 | 岗位辅导/模拟面试/人际关系/模拟期中/基础课程 | ✅ 一致 (L454-460) | ✅ |
| 学员状态 | 正常上课/旷课未到场 | ✅ 一致 (L110-131) | ✅ |
| 课程反馈 textarea | 有 | ✅ 有 (L225-232) | ✅ |
| 简历更新反馈 | 反馈 + 上传原简历 + 上传修改后简历 | ⚠️ 反馈有，上传是空壳（问题 #2） | ⚠️ |
| 模拟面试反馈 | 反馈 + 目的 + 概念 + 弱项 + 表现评价 | ✅ 一致 (L271-317) | ✅ |
| 人际关系反馈 | 反馈 + 5项评分 + 推荐 | ✅ 一致 (L319-353) | ✅ |
| 模拟期中反馈 | 反馈 + 分数 + 逐题分析 + 进度评估 | ✅ 一致 (L355-385) | ✅ |
| 课程内容类型下拉 | 岗位辅导 9 项 / 基础课 6 项 | ✅ 一致 (L468-487) | ✅ |

### 与 mentor 端对比

| 维度 | mentor | lead-mentor | 差异 |
|------|--------|-------------|------|
| 学员加载 | API 动态加载 ✅ | API 动态加载 ✅ | 一致 |
| 岗位选择 | 硬编码 3 条 ❌ | 硬编码 3 条 ❌ | 一致，都需修 |
| 附件上传 | 假上传（存文件名） | 空壳（连 input 都没有） | lead-mentor 更严重 |
| 提交 payload | 字段映射混乱（rate/totalFee/hourlyRate） | 字段映射清晰（courseType/classStatus/feedbackContent） | lead-mentor 更规范 |
| 列表数据 | 真实 API ✅ | 硬编码 mock ❌ | 需后端接口 |

---

## 修复优先级

| 优先级 | 问题 | 依赖 |
|--------|------|------|
| **P0** | #1 岗位硬编码 | shared.md §3 |
| **P0** | #2 附件空壳 | shared.md §2 |
| **P1** | #3 列表页假数据 | 后端列表 API |
| **P2** | #4 清理旧壳组件 | 无 |
