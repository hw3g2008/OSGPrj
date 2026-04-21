# 课程记录修复 — Admin 端

> 原型: admin.html → page-class-records (L3837-3970) + modal-audit (L10186-10278)
> PRD: 11-admin-class-records.md + 05-admin-reports.md

---

## 一、问题总览

### 原型有两个页面共享课程记录数据

| 原型页面 | 功能 | V1 是否实现 |
|----------|------|------------|
| page-class-records (L3837) | 课程记录管理 + 审核 | ✅ 已实现（/teaching/class-records） |
| page-reports (L1466) | 课时审核（auditor 角色专用） | ❌ 不在 V1 scope（V1 只有"课程记录"） |

当前实现将两个页面合并到了一个 `/teaching/class-records`，其中：
- **列表页**：基本对应 page-class-records ✅
- **审核弹窗** (ClassRecordReviewModal)：应对应 modal-audit (L10186) ❌ 内容不全
- **详情弹窗** (ClassRecordDetailModal)：对应 已通过/已驳回 的只读查看 ❌ 内容不全

---

## 二、需要修复的问题

### 2.1 操作列互斥逻辑 ❌

**原型规则**（L3879-3968）：
- 待审核行 → 只显示 **"审核"** 按钮（primary）
- 已通过/已驳回行 → 只显示 **"详情"** 按钮（text link）

**当前实现** (index.vue L136-141)：
- 所有行都显示"课程审核"按钮 ← **Bug**
- "详情"按钮只在非 pending 时显示（正确）

**修复**：审核按钮加 `v-if="record.status === 'pending'"` 条件

**涉及文件**：
- `osg-frontend/packages/admin/src/views/teaching/class-records/index.vue` L138

### 2.2 审核弹窗 (ClassRecordReviewModal) 内容缺失 ❌

**原型 modal-audit (L10186-10278) 的完整结构**：

```
Header: 金色渐变背景 "课程记录审核" + × 关闭
├── 基本信息卡片（黄色背景 #FEF3C7，2×4 grid）
│   ├── 状态 tag (待审核) + 记录ID (#R231785)
│   ├── 学员: 张三 (12766)           ← 含 studentId
│   ├── 申报人: Jerry Li 导师         ← 含角色 tag
│   ├── 辅导内容: 岗位辅导 Goldman Sachs  ← 含公司名
│   ├── 课程内容: 新简历 (tag)
│   ├── 上课日期: 01/26/2026
│   ├── 时长: 2小时                   ← ❌ 当前缺失
│   ├── 课时费: ¥800 (绿色)           ← ❌ 当前缺失
│   └── 提交时间: 01/26/2026 18:30    ← ❌ 当前缺失
├── 课程反馈                           ← ❌ 当前完全缺失
│   └── 大段反馈文字
├── 附件                              ← ❌ 当前缺失（依赖 shared.md §2）
│   └── PDF 文件列表（原简历.pdf / 修改后简历.pdf）
├── 审核操作
│   ├── 通过 / 驳回 radio              ← ✅ 已有（button toggle）
│   ├── 驳回原因下拉 + textarea         ← ✅ 已有
│   └── 通过备注 textarea              ← ✅ 已有
└── Footer: 取消 / 提交审核             ← ✅ 已有
```

**当前 ReviewModal 缺失的具体字段**：

| # | 缺失字段 | 原型位置 | 后端 API 是否已返回 | 说明 |
|---|---------|---------|-------------------|------|
| 1 | 学员 studentId | L10200 | ✅ toPayload 返回 studentId | 原型显示"张三 (12766)" |
| 2 | 申报人角色 tag | L10201 | ✅ toPayload 返回 courseSource | 原型显示"导师" tag |
| 3 | 辅导内容 + 公司名 | L10202 | ⚠️ 部分 — courseType 有, 公司名依赖 shared.md §3 | 原型显示"岗位辅导 Goldman Sachs" |
| 4 | 时长 | L10205 | ✅ toPayload 返回 durationHours | 原型显示"2小时" |
| 5 | 课时费 | L10206 | ❌ 依赖 shared.md §1 | 需后端补算 |
| 6 | 提交时间 | L10207 | ✅ toPayload 返回 submittedAt | 原型显示"01/26/2026 18:30" |
| 7 | 课程反馈 | L10211-10219 | ✅ toPayload 返回 feedbackContent | 导师填写的课程反馈全文 |
| 8 | 附件区域 | L10221-10233 | ❌ 依赖 shared.md §2 | 需附件系统就绪 |

**驳回原因选项对比**：

| 原型 (L10252-10259) | 当前实现 (L190-195) |
|---------------------|---------------------|
| 课时时长有误 | 内容不符 |
| 课程内容描述不清 | 时间异常 |
| 课程类型选择错误 | 重复记录 |
| 缺少必要附件 | 其他 |
| 重复提交 | |
| 其他原因 | |

**修复内容**：
1. 基本信息卡片从 3×2 grid 改为 2×4 grid，补全 8 个字段
2. 基本信息卡片加黄色背景 (#FEF3C7)
3. 新增"课程反馈"区域，显示 feedbackContent
4. 驳回原因选项改为与原型一致
5. **Bug 修复**：“课程内容”标签 (L37-38) 实际显示 `detail?.courseSource`（申报人角色），应显示 `detail?.classStatus`（实际课程内容）
6. **Bug 修复**：“课程类型”(L33-34) 显示原始值如 `position_coaching`，需 normalize 为“岗位辅导”/“模拟应聘”
7. （Phase 4）新增“附件”区域，依赖 shared.md §2

**涉及文件**：
- `osg-frontend/packages/admin/src/views/teaching/class-records/components/ClassRecordReviewModal.vue`

### 2.3 详情弹窗 (ClassRecordDetailModal) 内容缺失 ❌

**详情弹窗**用于查看已通过/已驳回记录，应展示**完整记录信息（只读）**。

```
Header: "课程记录详情 #recordId" + × 关闭
├── 基本信息卡片（2×4 grid）
│   ├── 状态 tag (已通过/已驳回) + 记录ID
│   ├── 学员: 姓名 (studentId)
│   ├── 申报人: 姓名 + 角色 tag
│   ├── 辅导内容 + 公司名
│   ├── 课程内容 (tag)
│   ├── 上课日期
│   ├── 时长
│   ├── 课时费
│   └── 提交时间
├── 课程反馈                       ← ❌ 当前缺失
│   └── feedbackContent 只读
├── Topics                        ← ✅ 已有
├── Comments                      ← ✅ 已有
├── 附件                           ← ❌ 依赖 shared.md §2
├── 审核结果（只读）                ← ❌ 当前缺失
│   ├── 审核状态: 已通过/已驳回
│   ├── 驳回原因（如有）
│   └── 审核备注                   ← ✅ 已有
└── Footer: 关闭                   ← ✅ 已有
```

**当前 DetailModal 缺失的具体字段**：

| # | 缺失字段 | 后端 API 是否已返回 |
|---|---------|-------------------|
| 1 | studentId | ✅ |
| 2 | 申报人角色 | ✅ courseSource |
| 3 | 辅导内容 + 公司名 | ⚠️ 部分，公司名依赖 shared.md §3 |
| 4 | 时长 | ✅ durationHours |
| 5 | 课时费 | ❌ 依赖 shared.md §1 |
| 6 | 提交时间 | ✅ submittedAt |
| 7 | 课程反馈 | ✅ feedbackContent |
| 8 | 附件 | ❌ 依赖 shared.md §2 |

**Bug 修复**：
- **rate/courseFee 混淆**：L51-52 标签“课时费”实际显示 `detail?.rate`（学员评分），并用 `¥` 格式化。`rate` 是学员评分（如 "4"/"5"），不是钱。应改为显示 `courseFee`，`rate` 展示为学员评价（⭐ 格式）
- **courseSource 标签错误**：L37-38 标签“课程内容”实际显示 `detail?.courseSource`（申报人角色），应显示 `detail?.classStatus`（实际课程内容）
- **courseType 原始值**：L33-34 显示原始值如 `position_coaching`，需 normalize 为“岗位辅导”/“模拟应聘”

**涉及文件**：
- `osg-frontend/packages/admin/src/views/teaching/class-records/components/ClassRecordDetailModal.vue`

### 2.4 列表页辅导内容列缺公司名

**原型** (L3883)：辅导内容列显示 "岗位辅导" tag + 下方 "Goldman Sachs" 公司名
**当前实现** (index.vue L121)：有 `v-if="record.coachingCompany"` 条件渲染，但后端不返回此字段

**修复**：依赖 shared.md §3 后端就绪后，前端无需改动（条件渲染已存在）

### 2.5 附件展示（依赖 shared.md §2）

**原型** (L10221-10233)：审核弹窗和详情弹窗均展示附件列表（PDF 文件卡片，含文件名和大小）

**当前实现**：无附件展示区域

**修复**：
1. ReviewModal 和 DetailModal 新增“附件” section
2. 通过 `detail?.attachments` 渲染文件卡片列表
3. 点击卡片调用 `GET /common/download/resource` 下载
4. 无附件时显示空态“暂无附件”

**涉及文件**：
- `ClassRecordReviewModal.vue`
- `ClassRecordDetailModal.vue`

### 2.6 公司名展示（依赖 shared.md §3）

**原型** (L10202)：审核弹窗辅导内容显示“岗位辅导 Goldman Sachs”

**当前实现**：弹窗中无公司名，列表页有条件渲染但后端不返回

**修复**：
1. `toPayload` 补返 `coachingCompany` 后，弹窗辅导内容字段拼接公司名
2. 列表页无需改动（`v-if="record.coachingCompany"` 已存在）

**涉及文件**：
- `ClassRecordReviewModal.vue`
- `ClassRecordDetailModal.vue`

---

## 三、Admin 端执行顺序

### Phase 1 — 独立修复（无外部依赖）

| 批次 | 内容 |
|------|------|
| **A1** | 操作列互斥 + 驳回原因选项对齐 (§2.1) |
| **A2** | 审核弹窗内容补全 + courseSource/courseType bug (§2.2) |
| **A3** | 详情弹窗内容补全 + rate/courseFee + courseSource/courseType bug (§2.3) |

> A2/A3 中课时费字段依赖 shared.md §1（后端 toPayload 补 courseFee），需先完成或同步进行。

### Phase 4 — 补全（依赖 shared 基础设施）

| 批次 | 内容 | 依赖 |
|------|------|------|
| **A5** | 审核弹窗 + 详情弹窗附件展示 (§2.5) | shared.md §2 |
| **A6** | 列表页 + 弹窗公司名展示 (§2.6) | shared.md §3 |
