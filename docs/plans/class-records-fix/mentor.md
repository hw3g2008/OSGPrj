# 课程记录修复 — 导师端

> 原型: mentor.html → modal-mentor-report (L620-889)
> 当前实现: `osg-frontend/packages/mentor/src/views/courses/components/ReportModal.vue`

---

## 排查状态：📝 已发现部分问题（待完整对比原型）

以下为 Admin 端排查过程中附带发现的问题，导师端完整原型对比尚未进行。

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

提交 payload (L434-456) 不含任何文件 URL 或 attachments 字段。

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

### 3. 提交 payload 字段映射（待确认）

当前 `handleSubmit()` (L429-456) 发送的 payload 中：
- `rate: String(hourlyRate.value)` ← 把时薪当 rate 发送，语义混乱
- `totalFee: form.value.durationHours * hourlyRate.value` ← 前端算费，应后端算

**待确认**：后端接收逻辑是否正确处理了这些字段。

---

## 待排查项

- [ ] 完整对比 mentor.html 原型与当前 ReportModal.vue
- [ ] 各课程类型的反馈表单是否与原型一致
- [ ] 学员选择逻辑是否完整
- [ ] 课程类型/内容类型映射是否正确
