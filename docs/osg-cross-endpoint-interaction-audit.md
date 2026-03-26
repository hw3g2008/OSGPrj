# OSG 五端交互问题审计报告

> 审计日期：2026-03-26
> 审计范围：Student / Mentor / Lead-Mentor / Assistant / Admin 五端落地需求中的跨端数据交互问题
> 方法：源码静态分析 + 远程环境 E2E API 验证

---

## 一、问题汇总（按严重度排序）

| # | 严重度 | 端 | 模块 | 问题摘要 |
|---|--------|-----|------|----------|
| 1 | **P0** | Student→Admin | 个人中心→学员列表 | 5个字段 key 不匹配，Admin 审批变更请求时 500 崩溃 |
| 2 | **P0** | Lead-Mentor/Mentor→Admin | 个人中心→导师列表 | 班主任/导师提交的 Staff 变更请求**无审批入口** |
| 3 | **P1** | Assistant | 个人中心 | 前端调用 `/api/mentor/profile`（错误端点），跨端复用导师 API |
| 4 | **P1** | Mentor | 个人中心 | 专业方向硬编码为静态文本，未从后端读取 |
| 5 | **P1** | Mentor | 个人中心 | 微信号存入 `remark` 字段（SysUser.remark），与备注语义冲突 |
| 6 | **P1** | Mentor | 个人中心 | 所在地区存入 `loginIp` 字段（SysUser.loginIp），字段滥用 |
| 7 | **P1** | Student→Admin | 个人中心 | Student 端用 `osg_student_profile_changes` 表，Admin 端用 `osg_student_change_request` 表，两套系统未打通 |
| 8 | **P2** | Mentor | 个人中心 | 编辑弹窗缺少变更审核提示，直接 PUT 更新无需审批 |
| 9 | **P2** | Student | 求职中心 | 忘记密码 API 路径 `/system/password/sendCode`，与导师端 `/mentor/forgot-password/send-code` 不一致 |
| 10 | **P2** | Lead-Mentor | 个人中心 | 地区/城市下拉框硬编码（仅5个城市），无法覆盖实际业务场景 |
| 11 | **P2** | Mentor | 个人中心 | 地区下拉框 value 为英文 key（`north-america`），但后端存中文（`北美`），存取不一致 |
| 12 | **P3** | All | 登录模块 | 各端忘记密码 API 路径风格不统一（3种路径风格并存） |
| 13 | **P3** | Assistant | 个人中心 | 编辑表单缺少"所属地区"和"微信号"字段（相比 Mentor/Lead-Mentor 端） |

---

## 二、逐条详细分析

### P0-1：Student→Admin 5个字段 key 不匹配（已远程验证崩溃）

**影响**：Admin 审批学生 profile 变更请求时，5个字段全部 500 崩溃。

**根因**：`StudentProfileServiceImpl.REVIEW_FIELDS` 使用的 key 与 `OsgStudentChangeRequestServiceImpl.applyChangeToStudent` 的 switch case 不匹配。

| Student 端提交的 fieldKey | switch 中的 case | 结果 |
|---|---|---|
| `highSchool` | ❌ 无 | 500: `暂不支持该字段审核: highSchool` |
| `postgraduatePlan` | ❌ 无 | 500: `暂不支持该字段审核: postgraduatePlan` |
| `visaStatus` | ❌ 无 | 500: `暂不支持该字段审核: visaStatus` |
| `primaryDirection` | `majorDirection` | 500: `暂不支持该字段审核: primaryDirection` |
| `secondaryDirection` | `subDirection` | 500: `暂不支持该字段审核: secondaryDirection` |

**文件**：
- 提交端：`StudentProfileServiceImpl.java:23-33`（REVIEW_FIELDS 定义）
- 审批端：`OsgStudentChangeRequestServiceImpl.java:159-179`（applyChangeToStudent switch）

**验证方式**：远程 E2E API 调用已复现全部 5 个 500 错误（requestId: 9008-9012）。

---

### P0-2：Lead-Mentor/Mentor Staff 变更请求无审批入口

**影响**：班主任端提交的个人信息变更请求（`osg_staff_change_request` 表）永远停留在 `pending` 状态，无人审批。

**根因**：
- 班主任端 `OsgLeadMentorProfileController.submitChangeRequest` 正确地创建了 `osg_staff_change_request` 记录。
- Admin 端 `OsgStaffController.submitChangeRequest` 也能通过 Admin 端手动创建变更请求。
- **但整个后端没有 `approve/reject StaffChangeRequest` 的 API 端点**。

**搜索验证**：在全部 controller 和 service 中搜索 `staff.*change.*approve`，结果为零。

**对比**：Student 端有完整的审批链路：
- `OsgStudentChangeRequestController.approve` → `PUT /admin/student/change-request/{id}/approve`
- `OsgStudentChangeRequestController.reject` → `PUT /admin/student/change-request/{id}/reject`

Staff 端**完全缺失**对应的 approve/reject 端点。

**文件**：
- 提交端：`OsgLeadMentorProfileService.java:59-114`（submitChangeRequest）
- Admin 端：`OsgStaffController.java:188-200`（只有 submit，无 approve/reject）

---

### P1-3：Assistant 端复用 Mentor 端 Profile API

**影响**：助教端个人中心的数据来源和保存目标与导师端**完全混淆**。

**现状**：
- `assistantProfile.ts:25` → `GET /api/mentor/profile`（读导师 profile）
- `assistantProfile.ts:31` → `PUT /api/mentor/profile`（写导师 profile）

两个调用都打到了 `OsgMentorProfileController`，操作的是 `SysUser` 表的导师记录。

**应该**：助教端应有独立的 profile 端点（`/api/assistant/profile`），或至少调用正确的端点。

**文件**：
- 前端 API：`osg-frontend/packages/shared/src/api/assistantProfile.ts:24-34`
- 后端 Controller：`OsgMentorProfileController.java`（只校验 nickName 长度，无角色校验）

---

### P1-4：Mentor 端专业方向硬编码

**影响**：导师端 Profile 页面的"主攻方向"和"二级方向"显示的是静态 HTML 文本 `咨询 Consulting` / `Strategy Consulting`，而非从后端 API 读取的动态数据。

**现状**（mentor profile/index.vue:36-37）：
```html
<span class="tag purple">咨询 Consulting</span>
<div class="info-value">Strategy Consulting</div>
```

**应该**：应使用 `profile.majorDirection` / `profile.subDirection` 动态渲染。

**影响范围**：所有导师看到的方向信息都是相同的硬编码值，与实际分配不符。

**文件**：`osg-frontend/packages/mentor/src/views/profile/index.vue:36-37`

---

### P1-5/P1-6：Mentor 端字段滥用

**影响**：导师端编辑保存时，微信号存入 `SysUser.remark`，所在地区存入 `SysUser.loginIp`，造成数据语义混乱。

**现状**（mentor profile/index.vue）：
- 第 24 行：`{{ profile.remark || '-' }}` 显示为"微信号"
- 第 25 行：`{{ profile.loginIp || '-' }}` 显示为"所属地区"
- 编辑表单第 62 行：`v-model="editForm.remark"` 绑定微信号输入
- 编辑表单第 66 行：`v-model="editForm.region"` / `editForm.city` → 但后端 `updateUserProfile` 不处理这两个字段

**后端**（`OsgMentorProfileController.java:22-38`）：直接调用 `userService.updateUserProfile(user)`，而 `SysUser` 没有 `region/city` 字段。

**结果**：
- 导师编辑地区后保存 → 地区数据丢失（不会写入任何字段）
- 微信号写入了 `remark` → 与"备注"语义冲突

**文件**：
- 前端：`osg-frontend/packages/mentor/src/views/profile/index.vue:24-25, 62-72`
- 后端：`OsgMentorProfileController.java:22-38`

---

### P1-7：Student 两套变更系统未打通

**影响**：Student 端提交 profile 变更后，Admin 端看不到这些变更请求。

**现状**：
- Student 端 `updateProfile` → 写入 `osg_student_profile_changes` 表（via `StudentProfileMapper.insertPendingChange`）
- Admin 端 `change-request/list` → 查询 `osg_student_change_request` 表（via `OsgStudentChangeRequestMapper`）

两个是**独立的表**，数据互不可见。

**结果**：
- Student 端修改 highSchool → 页面显示"1项变更正在审核中"
- Admin 端查 pending 变更 → 看不到这条记录
- Admin 只能看到通过 `POST /admin/student/change-request` 手动创建的变更请求

**文件**：
- Student 端写入：`StudentProfileServiceImpl.java:65-73`（写 `osg_student_profile_changes`）
- Admin 端读取：`OsgStudentChangeRequestServiceImpl.java:38-55`（读 `osg_student_change_request`）

---

### P2-8：Mentor 端 Profile 编辑无需审批

**影响**：导师编辑个人信息后直接 `PUT /api/mentor/profile` 更新 SysUser 表，跳过了变更审核流程。

**对比**：
- Lead-Mentor 端：编辑后 → `POST /lead-mentor/profile/change-request` → 创建待审核记录
- Mentor 端：编辑后 → `PUT /api/mentor/profile` → 直接更新，无审核

**文件**：
- Mentor 前端：`mentor/src/views/profile/index.vue:107`（直接 PUT）
- Lead-Mentor 前端：通过 `submitLeadMentorProfileChangeRequest` 创建变更请求

---

### P2-9：忘记密码 API 路径不一致

**影响**：功能可用但路径风格混乱，增加维护成本。

| 端 | send-code 路径 | 备注 |
|---|---|---|
| Student | `/system/password/sendCode` | camelCase，若依原生风格 |
| Mentor | `/mentor/forgot-password/send-code` | kebab-case，OSG 新风格 |
| Lead-Mentor | 前端内联（modal 中直接调 API） | 路径取决于前端配置 |
| Assistant | 前端有忘记密码页面但无 API 调用 | 可能未实现 |
| Admin | 若依原生 `/login` 流程 | 无独立 forgot-password |

**文件**：
- Student API：`osg-frontend/packages/shared/src/api/password.ts:18-19`
- Mentor API：`osg-frontend/packages/mentor/src/api/auth.ts:20-21`

---

### P2-10：Lead-Mentor 地区下拉框硬编码

**影响**：班主任只能选择 5 个城市中的一个，无法覆盖实际业务场景。

**硬编码城市**（`LeadEditProfileModal.vue:112-117`）：
- New York 纽约、London 伦敦、Singapore 新加坡、Shanghai 上海、Beijing 北京

**应该**：从后端基础数据 API 动态加载城市列表。

---

### P2-11：Mentor 端地区 key 存取不一致

**影响**：导师编辑地区后，前端传英文 key，但后端（如果能存的话）期望中文值。

- 前端 select value：`north-america`, `europe`, `asia-pacific`, `china`
- 数据库/展示期望值：`北美`, `欧洲`, `亚太`, `中国大陆`

**文件**：`osg-frontend/packages/mentor/src/views/profile/index.vue:67`

---

### P3-12：各端忘记密码 API 路径风格不统一

**现状**（3种风格并存）：
1. `/system/password/sendCode` — camelCase（Student，若依风格）
2. `/mentor/forgot-password/send-code` — kebab-case（Mentor）
3. 前端内联 / Modal 调 API（Lead-Mentor）

**建议**：统一为 `/{端}/forgot-password/send-code` kebab-case 风格。

---

### P3-13：Assistant 端编辑表单字段不完整

**影响**：助教端 Profile 编辑只有 4 个字段（英文名/性别/邮箱/手机号），缺少"所属地区"和"微信号"。

**对比**：
| 字段 | Lead-Mentor | Mentor | Assistant |
|------|-------------|--------|-----------|
| 英文名 | ✅ | ✅ | ✅ |
| 性别 | ✅ | ✅ | ✅ |
| 手机号 | ✅ | ✅ | ✅ |
| 邮箱 | ✅ | ✅ | ✅ |
| 微信号 | ✅ | ✅ | ❌ |
| 所属地区 | ✅ | ✅ | ❌ |

**文件**：`osg-frontend/packages/assistant/src/views/profile/index.vue:147-196`

---

## 三、跨端数据流完整度矩阵

```
Student 提交 Profile 变更
  └→ osg_student_profile_changes 表（Student独立系统）
  └→ Admin 端看不到（Admin 读 osg_student_change_request 表）❌ P1-7

Admin 手动创建 Student 变更请求
  └→ osg_student_change_request 表
  └→ Admin approve → applyChangeToStudent() → 5个字段 500 ❌ P0-1

Lead-Mentor 提交 Profile 变更
  └→ osg_staff_change_request 表
  └→ Admin 端无审批 API ❌ P0-2

Mentor 编辑 Profile
  └→ 直接 PUT SysUser 表（无审核流程）⚠️ P2-8

Assistant 编辑 Profile
  └→ 调用 /api/mentor/profile（错误端点）❌ P1-3
```

---

## 四、修复优先级建议

### 第一批（P0，必须修复，否则核心流程崩溃）
1. **P0-1**：在 `applyChangeToStudent` 的 switch 中添加 5 个缺失 case
2. **P0-2**：在 Admin 端新增 Staff 变更请求的 approve/reject API

### 第二批（P1，功能性缺陷）
3. **P1-3**：为 Assistant 端创建独立的 Profile Controller
4. **P1-7**：打通 Student 两套变更系统（统一使用 `osg_student_change_request` 表）
5. **P1-4/5/6**：Mentor 端 Profile 页面修正（动态方向 + 正确字段映射）

### 第三批（P2，体验/一致性问题）
6. **P2-8**：Mentor 端增加变更审核流程
7. **P2-10/11**：统一地区下拉框数据源和 key 格式
8. **P2-9**：统一忘记密码 API 路径风格

### 第四批（P3，低优先级）
9. **P3-12**：API 路径风格统一
10. **P3-13**：Assistant 编辑表单补全字段
