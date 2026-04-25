# 课程记录修复 — 导师端

> 原型: mentor.html → modal-mentor-report (L620-889)
> 当前实现: 见下方组件列表
> 排查日期: 2026-04-22

---

## 排查状态：✅ 已完成排查

### 组件路径

| 组件 | 路径 | 说明 |
|------|------|------|
| 列表页 | `osg-frontend/packages/mentor/src/views/courses/index.vue` (705行) | 列表 + 筛选 + 详情弹窗 + 驳回弹窗 |
| 上报弹窗 | `osg-frontend/packages/mentor/src/views/courses/components/ReportModal.vue` (531行) | 完整表单 + API 提交 |

---

## 已发现的问题

### 1. 附件上传是假上传 ❌

**问题**：`ReportModal.vue` L392-403 的 `handleResumeUpload()` 只保存文件名到本地 state，不发送文件到服务器。

```js
// 当前实现（L392-403）
function handleResumeUpload(event, kind) {
  const file = input?.files?.[0]
  if (kind === 'original') form.value.originalResumeName = file.name  // 只存文件名
  else form.value.updatedResumeName = file.name
}
```

有 `<input type="file">` 元素（L150, L157），但提交 payload (L434-456) 不含任何文件 URL 或 attachments 字段。

**修复**：
1. 选择文件后立即调用 `POST /common/upload` 上传到服务器
2. 保存返回的 `fileName`（路径）和 `originalFilename`
3. 提交课程记录时附带 `attachments[]` 数组
4. 依赖 shared.md §2 附件表就绪

**涉及文件**：
- `osg-frontend/packages/mentor/src/views/courses/components/ReportModal.vue`

### 2. 岗位选择硬编码 ❌

**问题**：`ReportModal.vue` L89-98 的"选择申请辅导的岗位"下拉使用硬编码选项：

```html
<option value="gs-ib">Goldman Sachs · IB Analyst · Hong Kong</option>
<option value="ms-ibd">Morgan Stanley · IBD Analyst · New York</option>
<option value="mckinsey">McKinsey · Business Analyst · Shanghai</option>
```

提交时 `jobPosition: "gs-ib"` 字符串（L455），后端 insert **不存储**此值。

**修复**：
1. 选中学员后，调 API 获取该学员的 `osg_student_position` 列表
2. 动态渲染岗位下拉（显示 `company_name · position_name · city`）
3. 选中后存 `studentPositionId`（而非硬编码字符串）
4. 提交时附带 `studentPositionId`
5. 依赖 shared.md §3（DB 加 `student_position_id` 列）

**涉及文件**：
- `osg-frontend/packages/mentor/src/views/courses/components/ReportModal.vue`
- 可能需要新增 API：`GET /api/mentor/students/{studentId}/positions`

### 3. 提交 payload 字段映射混乱 ❌

当前 `handleSubmit()` (L429-456) 发送的 payload 存在多处语义混乱：

| payload 字段 | 当前值 | 问题 |
|-------------|--------|------|
| `rate` | `String(hourlyRate.value)` (如 "600") | 语义混乱：`rate` 在后端是学员评分，这里传的是时薪 |
| `totalFee` | `durationHours * hourlyRate.value` | 前端算费，应后端算（避免篡改） |
| `hourlyRate` | `hourlyRate.value` (固定 600) | 硬编码时薪，应从后端获取导师实际时薪 |
| `studentName` | `selectedStudent.value?.nickName` | 冗余：后端可通过 studentId 查 |
| `coachingType` + `courseType` | 同一个值发两遍 | 冗余字段 |
| `contentType` + `classStatus` | 同一个值发两遍 | 冗余字段 |
| `feedback` + `feedbackContent` | 同一个值发两遍 | 冗余字段 |

**修复**：精简 payload，只发必要字段，费用由后端计算。

### 4. 课程类型 / 反馈表单与原型对比 ✅

| 维度 | 原型 | 当前实现 | 一致性 |
|------|------|---------|--------|
| 课程类型 5 种 | 岗位辅导/模拟面试/人际关系/模拟期中/基础课程 | ✅ 一致 (L261-267) | ✅ |
| 学员状态 | 正常上课/旷课未到场 | ✅ 一致 (L49-69) | ✅ |
| 岗位辅导 → 课程内容类型 | 9 项下拉 | ✅ 一致 (L104-114) | ✅ |
| 基础课 → 内容类型 | 6 项下拉 | ✅ 一致 (L120-127) | ✅ |
| 通用课程反馈 | textarea | ✅ 有 (L130-138) | ✅ |
| 简历更新反馈 | 反馈 + 上传原简历 + 上传修改后简历 | ⚠️ 反馈有，上传是假的（问题 #1） | ⚠️ |
| 模拟面试反馈 | 反馈 + 面试公司/岗位 | ✅ 一致 (L164-174) | ✅ |
| 人际关系反馈 | 反馈 | ✅ 有 (L176-182)，但**缺少**评分项 + 推荐 | ⚠️ |
| 模拟期中反馈 | 反馈 + 分数 + 进度评估 | ✅ 一致 (L184-207) | ✅ |
| 课时费显示 | 原型有 | ✅ 有 (L219-221) | ✅ |

**差异 — 人际关系反馈不完整**：
- lead-mentor 端有 5 项评分（电子邮件质量/礼仪/闲聊质量/通话质量/感谢邮件）+ 推荐选择
- mentor 端只有一个 textarea（L176-182），缺少评分项和推荐选项

### 5. 学员选择逻辑 ✅

- `onMounted` (L470-477) 调 `GET /api/mentor/students/list` 动态加载学员列表 ✅
- 选中学员后 `onStudentSelect()` (L343-355) 重置所有表单字段 ✅

### 6. 列表页有真实 API 调用 ✅

- `onMounted` (L632-635) 调 `fetchSummaryRecords()` + `fetchRecords()` 加载列表 ✅
- 筛选（关键词/辅导类型/课程内容/时间范围）✅
- Tab 切换（全部/待审核/已通过/已驳回/待确认）✅
- 详情弹窗 + 驳回弹窗 ✅
- 提交后刷新列表 `onReportSubmitted()` (L622-626) ✅

### 7. 列表页辅导类型筛选选项不全 ⚠️

`index.vue` L25-28 筛选下拉只有 2 项：
- 岗位辅导 (`job_coaching`)
- 模拟应聘 (`mock_interview`)

缺少：人际关系 / 模拟期中 / 基础课程。与提交弹窗的 5 种课程类型不一致。

### 8. 列表页缺岗位/公司名展示 ⚠️

`index.vue` L52：辅导内容列显示 `coachingType` tag + `contentDetail`，但没有公司名。
后端不返回 `coachingCompany` 字段（依赖 shared.md §3）。

---

## 与其他端对比

| 维度 | mentor | lead-mentor | assistant |
|------|--------|-------------|-----------|
| 上报功能 | ✅ 有 | ✅ 有 | ❌ 无 |
| 学员加载 | API 动态 ✅ | API 动态 ✅ | N/A |
| 岗位选择 | 硬编码 3 条 ❌ | 硬编码 3 条 ❌ | N/A |
| 附件上传 | 假上传（有 input，只存文件名）❌ | 空壳（连 input 都没有）❌ | N/A |
| 提交 payload | 字段混乱（冗余 + rate 语义错）❌ | 字段清晰 ✅ | N/A |
| 列表数据来源 | 真实 API ✅ | 硬编码 mock ❌ | 真实 API ✅ |
| 人际关系反馈 | 只有 textarea ⚠️ | 完整（5 项评分+推荐）✅ | N/A |
| 课程类型映射 | 完整 ✅ | 完整 ✅ | 不全（只 3 种）⚠️ |

---

## 修复优先级

| 优先级 | 问题 | 依赖 |
|--------|------|------|
| **P0** | #2 岗位硬编码 | shared.md §3 |
| **P0** | #1 附件假上传 | shared.md §2 |
| **P1** | #3 payload 字段映射精简 | 无（但需与后端对齐） |
| **P1** | #4 人际关系反馈补全评分+推荐 | 无 |
| **P2** | #7 辅导类型筛选补全 | 无 |
| **P2** | #8 公司名展示 | shared.md §3 |
