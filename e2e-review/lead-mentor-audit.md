# 班主任端 (Lead Mentor) E2E 审查报告

> 审查日期：2026-04-21
> 审查范围：全部 13 个路由页面 + 13 个弹窗组件
> 测试账号：`lead_mentor_demo / Osg@2026`
> 环境：http://localhost:3003 (前端) + http://127.0.0.1:28080 (后端)
> 测试方法：Playwright 自动化截图 + 代码审查
> 原型文件：无（项目中未找到 lead-mentor 相关原型）

---

## 一、截图凭证

所有截图已保存至 `e2e-review/lead-mentor/`，共 12 张：

| 文件 | 路由 | 说明 |
|------|------|------|
| `00-login.png` | `/login` | 登录页（含忘记密码弹窗） |
| `01-home.png` | `/home` | 首页 |
| `02-career-positions.png` | `/career/positions` | 岗位信息 |
| `03-career-job-overview.png` | `/career/job-overview` | 学员求职总览 |
| `04-career-mock-practice.png` | `/career/mock-practice` | 模拟应聘管理 |
| `05-teaching-students.png` | `/teaching/students` | 学员列表 |
| `06-teaching-class-records.png` | `/teaching/class-records` | 课程记录 |
| `07-classes.png` | `/classes` | 班级管理 |
| `08-mentors.png` | `/mentors` | 导师管理 |
| `09-reports.png` | `/reports` | 学情报告 |
| `10-profile-basic.png` | `/profile/basic` | 基本信息 |
| `11-profile-schedule.png` | `/profile/schedule` | 课程排期 |

---

## 二、路由清单与实现状态

| # | 路由 | 路径 | 状态 | 数据来源 | 备注 |
|---|------|------|------|----------|------|
| 1 | 登录 | `/login` | ✅ | 真实 API | 自定义登录，无前端验证码 |
| 2 | 首页 | `/home` | ❌ 严重 | **全 Hardcoded Mock** | 见 Bug 汇总 |
| 3 | 岗位信息 | `/career/positions` | ✅ | 真实 API | 部分选项 Hardcoded |
| 4 | 学员求职总览 | `/career/job-overview` | ✅ | 真实 API | 部分按钮 stub |
| 5 | 模拟应聘管理 | `/career/mock-practice` | ✅ | 真实 API | |
| 6 | 学员列表 | `/teaching/students` | ✅ | 真实 API | 分页按钮样式 |
| 7 | 课程记录 | `/teaching/class-records` | ✅ | 真实 API | 弹窗 Hardcoded |
| 8 | 班级管理 | `/classes` | ❌ 严重 | **全 Hardcoded Mock** | 完全未实现 |
| 9 | 导师管理 | `/mentors` | ❌ 严重 | **全 Hardcoded Mock** | 完全未实现 |
| 10 | 学情报告 | `/reports` | ❌ 严重 | **占位页面** | 功能开发中 |
| 11 | 基本信息 | `/profile/basic` | ✅ | 真实 API | 弹窗地区 Hardcoded |
| 12 | 课程排期 | `/profile/schedule` | ✅ | 真实 API | |

**实现率：真实 API 7/12（58%），Mock 占位 5/12（42%）**

---

## 三、逐页详细审查

### 3.1 登录页 `/login` ✅

**截图：** `00-login.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| UI 渲染 | ✅ | 自定义品牌登录页，布局清晰 |
| 表单字段 | ✅ | 用户名/密码，密码可见切换 |
| 忘记密码弹窗 | ✅ | 三步弹窗（发邮件→填验证码→重置密码），`data-surface-id="modal-forgot-password"` |
| 登录 API | ✅ | `leadMentorLogin` → `/lead-mentor/login`（免验证码）|
| 角色校验 | ✅ | `getLeadMentorInfo()` 检查 `lead-mentor` 或 `admin` 角色 |
| 记住我 | ✅ | `rememberMe` 参数传递到后端 |

**代码审查：**
```typescript
// src/views/login/index.vue
const { token } = await leadMentorLogin({
  username: formState.username.trim(),
  password: formState.password,
})
// → POST /lead-mentor/login（无需验证码，后端 skipCaptcha）
// → GET /lead-mentor/getInfo（校验角色）
// → 写入 localStorage osg_token + osg_user
```

**弹窗相关：**
- 忘记密码 → `sendResetCode({ email })` → `verifyResetCode({ email, code })` → `resetLeadMentorPassword({ email, password, resetToken })`

---

### 3.2 首页 `/home` ❌ 严重（Hardcoded Mock）

**截图：** `01-home.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| UI 渲染 | ✅ | 布局正确，但数据全假 |
| 数据真实性 | ❌ 严重 | **所有数据 Hardcoded，零 API 调用** |
| 用户名匹配 | ❌ Bug | 页面写死 "下午好，Jess"，登录用户为 "Lead Demo" |
| 快捷入口 | ❌ Bug | 全部触发 `showUpcomingToast()`，不导航 |

**代码证据：**
```typescript
// src/views/home/index.vue
<h1>下午好，Jess</h1>  // ❌ 硬编码，未读取 osg_user.nickName

const summaryCards: SummaryCard[] = [
  { label: '待排课程', value: '5', unit: '个', footerText: '去分配导师' },
  { label: '待确认课程', value: '3', unit: '节' },
  { label: '本周收入（已结算）', value: '$1,250', footerText: '待结算 $320' }, // ❌ 美元符号
  { label: '本周课时', value: '12.5 h', footerText: '已完成 8节 · 待审核 2节' },
]
const statCards: StatCard[] = [ /* 5 项全 Hardcoded */ ]
const quickEntries: QuickEntry[] = [ /* 6 项全 Hardcoded */ ]
// 全部调用 showUpcomingToast()，无真实导航
```

**Bug 清单：**
- B1: 欢迎语 "下午好，Jess" 硬编码 ❌ — 应读取 `localStorage.osg_user.nickName`
- B2: `$1,250` 美元符号 ❌ — 应为人民币 `¥12,500`
- B3: 4 个 SummaryCard 全部 Hardcoded ❌
- B4: 5 个 StatCard 全部 Hardcoded ❌
- B5: 6 个快捷入口点击均 stub → toast ❌

---

### 3.3 岗位信息 `/career/positions` ✅

**截图：** `02-career-positions.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| API 调用 | ✅ | `getLeadMentorPositionList`, `getLeadMentorPositionMeta`, `getLeadMentorPositionStudents` |
| 下钻视图 | ✅ | 按分类→公司→岗位三级展开，真实数据 |
| 列表视图 | ✅ | 扁平表格，真实数据 |
| 筛选器 | ✅ | 分类/行业/地区/工作形式，调用 API |
| 排序 | ✅ | 发布时间升/降序 |
| 我的学员弹窗 | ✅ | `PositionMyStudentsModal`（`data-surface-id="modal-position-mystudents"`）|
| 公司颜色 | ⚠️ 扩展性 | `COMPANY_COLORS` 硬编码 6 家公司，新增公司无配色 |

**弹窗组件：`PositionMyStudentsModal.vue`**
- Props 驱动（`preview` prop 传入数据）
- 表格展示：学员姓名/学校/专业/申请岗位/申请状态/跟进记录
- 无 Hardcoded 数据 ✅

---

### 3.4 学员求职总览 `/career/job-overview` ✅

**截图：** `03-career-job-overview.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| API 调用 | ✅ | `getLeadMentorJobOverviewList`, `getLeadMentorJobOverviewDetail`, `acknowledgeLeadMentorJobOverviewStage` |
| 日历视图 | ✅ | 月度格子带色点，真实数据 |
| 求职列表 | ✅ | 待分配/进行中/已完结 Tabs，真实数据 |
| 日历展开 | ✅ | 展开后显示每日详细安排 |
| 阶段确认 | ✅ | `handleAcknowledgeStage` 调用 API |
| 分配导师弹窗 | ✅ | `AssignMentorModal`（`data-surface-id="modal-assign-mentor"`）|
| 详情弹窗 | ✅ | `JobDetailModal`（`data-surface-id="modal-job-detail"`）|
| 导出按钮 | ❌ Bug | `showUpcomingToast()` — stub |
| 月份导航 | ❌ Bug | 月份显示硬编码 "1月"，箭头点击 toast ❌ |
| 快捷统计点击 | ❌ Bug | toast 不导航 ❌ |

**Bug 清单：**
- B8: 导出按钮 stub（点击 toast）❌
- B9: 月份 "1月" 硬编码，非动态当前月 ❌
- B10: 日历月份箭头 stub ❌

---

### 3.5 模拟应聘管理 `/career/mock-practice` ✅

**截图：** `04-career-mock-practice.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| API 调用 | ✅ | `getLeadMentorMockPracticeStats/List/Detail/Acknowledge/Assign` |
| Tabs | ✅ | 待分配/我的辅导/我的管理 |
| 搜索过滤 | ✅ | 读操作，API 调用 |
| 确认按钮 | ✅ | `acknowledgeLeadMentorMockPractice` |
| 分配弹窗 | ✅ | `AssignMockModal`（`data-surface-id="modal-assign-mock"`）|
| 反馈弹窗 | ✅ | `LeadMockFeedbackModal`（`data-surface-id="modal-lead-mock-feedback"`）|

**弹窗组件：**
- `AssignMockModal` — Props 驱动，`assignLeadMentorMockPractice` API
- `LeadMockFeedbackModal` — 只读展示（`preview` prop），无 Hardcoded 数据 ✅

---

### 3.6 学员列表 `/teaching/students` ✅

**截图：** `05-teaching-students.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| API 调用 | ✅ | `getLeadMentorStudentList`, `getLeadMentorStudentMeta` |
| 表格 | ✅ | 12 列（姓名/学校/专业/学历/求职方向/合同状态/跟进状态等）|
| 搜索过滤 | ✅ | 真实 API |
| 分页 | ⚠️ UI | prev/next 文字按钮，非 Ant Design 图标风格 |

**Bug 清单：**
- B13: 翻页按钮 "prev" / "next" 文字 ❌ — 应为 `<` `>` 图标按钮

---

### 3.7 课程记录 `/teaching/class-records` ✅

**截图：** `06-teaching-class-records.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| API 调用 | ✅ | `getLeadMentorClassRecords` |
| 列表 | ✅ | 真实课程记录 |
| 填报弹窗 | ❌ 严重 | `LeadMentorClassReportModal` — 大量 Hardcoded |

**弹窗组件：`LeadMentorClassReportModal.vue`**

此弹窗是本次审查中 **Hardcoded 数据最多的组件**：

```typescript
// ❌ students — Hardcoded
const students = [
  { value: '12766', label: '张三 (12766) - Finance IB' },
  { value: '12890', label: '李四 (12890) - Consulting MC' },
  { value: '12901', label: '王五 (12901) - Tech SWE' },
]

// ❌ positionOptions — Hardcoded
const positionOptions = [
  'Goldman Sachs · IB Analyst · Hong Kong',
  'Morgan Stanley · IBD Analyst · New York',
  'McKinsey · Business Analyst · Shanghai',
]

// ❌ jobContentOptions — Hardcoded
const jobContentOptions = ['技术的', '行为训练', '新简历制作', '简历更新', ...]

// ❌ basicContentOptions — Hardcoded
const basicContentOptions = ['技术的', '行为训练', '新简历制作', '简历更新', ...]

// ❌ performanceOptions — Hardcoded（含 emoji）
const performanceOptions = [
  { value: 'disappointing', emoji: '😞', label: '令人失望' },
  { value: 'good', emoji: '🙂', label: '好的' },
  { value: 'great', emoji: '😊', label: '伟大的' },
  { value: 'amazing', emoji: '🌟', label: '真棒' },
]

// ❌ networkingScores — Hardcoded
const networkingScores = [
  { label: '电子邮件质量 (1-5分)', options: ['1','2','3','4','5'] },
  { label: '电子邮件礼仪 (1-5分)', options: ['1','2','3','4','5'] },
  { label: '闲聊/自我介绍质量 (1-10分)', options: ['1'..'10'] },
  { label: '通话质量 (1-10分)', options: ['1'..'10'] },
  { label: '感谢邮件 (1-3分)', options: ['1','2','3'] },
]

// ❌ recommendationOptions — Hardcoded
const recommendationOptions = [
  '是的 - 我相信这位学生很适合我的团队',
  '或许 - 如果他们能改进一下就好了',
  '不 - 他们需要认真加强准备工作',
]

// ❌ progressOptions — Hardcoded
const progressOptions = [
  '非常棒 - 进展顺利，会取得好成绩',
  '太好了 - 进展顺利',
  '好的 - 需要在一些方面下功夫',
  '令人失望 - 严重落后',
  '不适用 - 入学时间太短',
]
```

**提交逻辑：** 弹窗本身无 API 调用，`handleSubmit` → `emit('submit')` → 父组件 `teaching/class-records/index.vue` 处理提交。

**Bug 清单：**
- B11: 学员选项 3 项 Hardcoded ❌
- B12: 岗位选项 3 项 Hardcoded ❌
- B13: 课程内容类型全部 Hardcoded ❌
- B14: 表现评级含 emoji，全 Hardcoded ❌
- B15: 人际关系评分选项 Hardcoded ❌
- B16: 推荐选项 3 项 Hardcoded ❌
- B17: 进度评估选项 5 项 Hardcoded ❌

---

### 3.8 班级管理 `/classes` ❌ 严重（完全未实现）

**截图：** `07-classes.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| 数据真实性 | ❌ 严重 | **100% Hardcoded Mock，零 API 调用** |
| 功能 | ❌ 严重 | 无任何操作按钮 |

**代码证据：**
```typescript
// src/views/classes/index.vue
const classes = ref([
  { id: 1, name: 'Java 就业班 01 期', studentCount: 18, startDate: '2025-09-01', status: '进行中' },
  { id: 2, name: 'Python 人工智能 01 期', studentCount: 15, startDate: '2025-09-01', status: '进行中' },
  { id: 3, name: '数据分析 01 期', studentCount: 20, startDate: '2025-09-08', status: '进行中' },
  { id: 4, name: '前端工程化 01 期', studentCount: 12, startDate: '2025-10-15', status: '进行中' },
  { id: 5, name: '全栈开发 01 期', studentCount: 10, startDate: '2025-10-20', status: '已结束' },
])
// 无任何 API 调用
```

**截图可见（全是 Mock）：**
- Java 就业班 01 期 / 18 人 / 2025-09-01 / 进行中
- Python 人工智能 01 期 / 15 人 / 2025-09-01 / 进行中
- 数据分析 01 期 / 20 人 / 2025-09-08 / 进行中
- 前端工程化 01 期 / 12 人 / 2025-10-15 / 进行中
- 全栈开发 01 期 / 10 人 / 2025-10-20 / 已结束

---

### 3.9 导师管理 `/mentors` ❌ 严重（完全未实现）

**截图：** `08-mentors.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| 数据真实性 | ❌ 严重 | **100% Hardcoded Mock，零 API 调用** |
| 功能 | ❌ 严重 | 无操作按钮 |

**代码证据：**
```typescript
// src/views/mentors/index.vue
const mentors = ref([
  { id: 1, name: '王老师', specialty: 'Java/Spring', studentCount: 6, monthHours: 48, rating: 4.8 },
  { id: 2, name: '李老师', specialty: 'Python/ML', studentCount: 8, monthHours: 36, rating: 4.9 },
  { id: 3, name: '张老师', specialty: 'React/Vue', studentCount: 5, monthHours: 42, rating: 4.7 },
  { id: 4, name: '陈老师', specialty: 'Go/微服务', studentCount: 7, monthHours: 30, rating: 4.6 },
  { id: 5, name: '刘老师', specialty: 'iOS/Android', studentCount: 4, monthHours: 24, rating: 4.5 },
])
```

**截图可见（全是 Mock）：**
- 王老师 / Java/Spring / 6 学员 / 48h / ★4.8
- 李老师 / Python/ML / 8 学员 / 36h / ★4.9
- 张老师 / React/Vue / 5 学员 / 42h / ★4.7
- 陈老师 / Go/微服务 / 7 学员 / 30h / ★4.6
- 刘老师 / iOS/Android / 4 学员 / 24h / ★4.5

---

### 3.10 学情报告 `/reports` ❌ 严重（占位页面）

**截图：** `09-reports.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| 实现状态 | ❌ 严重 | **页面完全空，`a-empty` 占位** |

**代码证据：**
```vue
<!-- src/views/reports/index.vue -->
<a-empty description="学情报告功能开发中" />
```

---

### 3.11 基本信息 `/profile/basic` ✅

**截图：** `10-profile-basic.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| API 调用 | ✅ | `getLeadMentorProfile`, `submitLeadMentorProfileChangeRequest` |
| 表单展示 | ✅ | 真实用户信息 |
| 头像 | ✅ | 字母头像 |
| 编辑弹窗 | ⚠️ 混合 | `LeadEditProfileModal` — 地区选项 Hardcoded |

**弹窗组件：`LeadEditProfileModal.vue`**

- ✅ 表单数据来自父组件 `draft` prop
- ✅ 提交通过 `emit('save-request')` → 父组件调用 `submitLeadMentorProfileChangeRequest`
- ❌ 大区选项 Hardcoded：`北美 / 欧洲 / 亚太 / 中国大陆`（含 emoji）
- ❌ 城市选项 Hardcoded：`New York 纽约 / London 伦敦 / Singapore 新加坡 / Shanghai 上海 / Beijing 北京`

**Bug 清单：**
- B18: 地区大区选项 4 项 Hardcoded ❌
- B19: 城市选项 5 项 Hardcoded ❌

---

### 3.12 课程排期 `/profile/schedule` ✅

**截图：** `11-profile-schedule.png`

| 维度 | 状态 | 说明 |
|------|------|------|
| API 调用 | ✅ | `getLeadMentorSchedule`, `getLeadMentorScheduleStatus`, `saveLeadMentorNextSchedule` |
| 周视图 | ✅ | 周一至周日格子，真实数据 |
| 日时段选择 | ✅ | Checkbox 选择时段 |
| 排期状态 | ✅ | 状态按钮（已填写/待填写）|
| 强制排期弹窗 | ✅ | `LeadForceScheduleModal`（`data-surface-id="modal-lead-force-schedule"`）|

---

## 四、弹窗（Modal）汇总

| # | 弹窗 | 文件 | data-surface-id | 数据来源 | Hardcoded |
|---|------|------|-----------------|----------|-----------|
| 1 | 忘记密码 | `login/index.vue` 内联 | `modal-forgot-password` | 真实 API | ❌ |
| 2 | 我的学员申请 | `PositionMyStudentsModal.vue` | `modal-position-mystudents` | Props 驱动 | ❌ |
| 3 | 处理模拟应聘 | `AssignMockModal.vue` | `modal-assign-mock` | Props 驱动 | ❌ |
| 4 | 查看模拟反馈 | `LeadMockFeedbackModal.vue` | `modal-lead-mock-feedback` | Props 驱动（只读）| ❌ |
| 5 | 学员求职详情 | `JobDetailModal.vue` | `modal-job-detail` | Props 驱动 | ❌ |
| 6 | 分配导师 | `AssignMentorModal.vue` | `modal-assign-mentor` | Props 驱动 | ❌ |
| 7 | 上报课程记录 | `LeadMentorClassReportModal.vue` | `modal-lm-report` | **大量 Hardcoded** | ❌ 严重 |
| 8 | 课程详情 | `LeadMentorClassDetailModal.vue` | - | Props 驱动 | ❌ |
| 9 | 简历辅导详情 | `LeadMentorClassDetailResumeModal.vue` | - | Props 驱动 | ❌ |
| 10 | 人际关系辅导详情 | `LeadMentorClassDetailNetworkingModal.vue` | - | Props 驱动 | ❌ |
| 11 | 常规课程详情 | `LeadMentorClassDetailRegularModal.vue` | - | Props 驱动 | ❌ |
| 12 | 拒绝课程详情 | `LeadMentorClassRejectModal.vue` | - | Props 驱动 | ❌ |
| 13 | 编辑个人信息 | `LeadEditProfileModal.vue` | `modal-lead-edit-profile` | Props + Hardcoded 地区 | ❌ |
| 14 | 强制填写排期 | `LeadForceScheduleModal.vue` | `modal-lead-force-schedule` | Props 驱动 | ❌ |

---

## 五、Console Error 检查

**结果：无 Console Error ✅**

Playwright 运行全程 0 个 JS Error，无网络请求 500/401。

---

## 六、Bug 汇总表

| # | 严重度 | 位置 | 类型 | 描述 |
|---|--------|------|------|------|
| B1 | 🔴 严重 | 首页 | Hardcoded | 欢迎语 "下午好，Jess" 硬编码，未读取 `osg_user.nickName` |
| B2 | 🔴 严重 | 首页 | Bug | `$1,250` 使用美元符号，应为人民币 |
| B3 | 🔴 严重 | 首页 | Hardcoded | 4 个 SummaryCard 全部硬编码，零 API |
| B4 | 🔴 严重 | 首页 | Hardcoded | 5 个 StatCard 全部硬编码，零 API |
| B5 | 🔴 严重 | 首页 | 无功能 | 6 个快捷入口点击全部 stub → toast |
| B6 | 🔴 严重 | 班级管理 | Hardcoded | 5 个班级数据 100% 硬编码，零 API 调用 |
| B7 | 🔴 严重 | 导师管理 | Hardcoded | 5 个导师数据 100% 硬编码，零 API 调用 |
| B8 | 🔴 严重 | 学情报告 | 未实现 | 页面为空，`a-empty` 占位，无任何功能 |
| B9 | 🔴 严重 | 课程记录弹窗 | Hardcoded | 学员选项 3 项硬编码（张三/李四/王五）|
| B10 | 🔴 严重 | 课程记录弹窗 | Hardcoded | 岗位选项 3 项硬编码（Goldman Sachs/Morgan Stanley/McKinsey）|
| B11 | 🔴 严重 | 课程记录弹窗 | Hardcoded | 课程内容类型全部硬编码 |
| B12 | 🔴 严重 | 课程记录弹窗 | Hardcoded | 表现评级（含 emoji 😞🙂😊🌟）全部硬编码 |
| B13 | 🟡 中等 | 求职总览 | 无功能 | 导出按钮 stub → toast |
| B14 | 🟡 中等 | 求职总览 | Bug | 月份 "1月" 硬编码，非动态当前月 |
| B15 | 🟡 中等 | 求职总览 | 无功能 | 日历月份箭头点击 stub |
| B16 | 🟡 中等 | 基本信息弹窗 | Hardcoded | 地区大区选项 4 项硬编码 |
| B17 | 🟡 中等 | 基本信息弹窗 | Hardcoded | 城市选项 5 项硬编码 |
| B18 | 🟡 中等 | 岗位信息 | 扩展性 | `COMPANY_COLORS` 硬编码 6 家公司，新增公司无配色 |
| B19 | 🟡 中等 | 学员列表 | UI | 翻页按钮 "prev" / "next" 文字，非图标风格 |

**严重 Bug：9 个 | 中等 Bug：7 个 | 合计：19 个**

---

## 七、评分总览

| 维度 | 得分 | 说明 |
|------|------|------|
| 真实 API 页面覆盖率 | **7/12 (58%)** | 5 个页面 Hardcoded 或未实现 |
| 弹窗 Hardcoded 覆盖率 | **2/14** | 仅 2 个弹窗含 Hardcoded 选项 |
| Console Error | **0 个** | 全程无 JS Error |
| 表单未提交校验 | ⚠️ | `LeadMentorClassReportModal` textarea 无 v-model，提交不携带内容 |

---

## 八、修复优先级建议

### P0（立即修复，影响用户可见性）
1. **首页欢迎语** — `<h1>` 改为 `{{ getUser()?.nickName || '用户' }}，{{ greeting }}`
2. **首页数据** — 接入 3 个 API 端点，删除所有 Hardcoded
3. **班级管理** — 评估是否删除页面或实现功能（接入 `getLeadMentorClasses` 或类似 API）
4. **导师管理** — 评估是否删除页面或实现功能
5. **学情报告** — 评估是否删除页面或实现功能

### P1（本迭代修复，影响数据正确性）
6. **首页收入单位** — `$1,250` → `¥12,500`
7. **首页快捷入口** — 实现真实导航，删除 `showUpcomingToast()` stub
8. **课程记录弹窗** — 学员/岗位/课程类型等选项改为 API 驱动
   - `students` → `getLeadMentorClassRecordDraft` 或字典接口
   - `positionOptions` → `getLeadMentorPositionMeta`
   - 内容类型 → 字典接口
9. **求职总览月份** — 改为 `new Date().toLocaleDateString('zh-CN', {month:'long'})`
10. **求职总览导出/箭头** — 实现功能或移除按钮

### P2（优化项）
11. **基本信息弹窗地区选项** — 改为 API 驱动或基于 `getLeadMentorProfile` 返回的可用范围
12. **岗位颜色** — `COMPANY_COLORS` 改为基于公司名 Hash 的算法
13. **学员列表翻页按钮** — 改为 Ant Design `<a-pagination>` 或图标按钮

---

## 九、测试建议

### 9.1 Smoke Test 场景（Playwright）
```python
# lead-mentor-smoke.py
- LM-01: 登录 → 验证 redirect 到 home
- LM-02: 首页 → 验证欢迎语与登录用户匹配（无 Hardcoded）
- LM-03: 岗位信息 → 搜索过滤 → 验证表格数据刷新
- LM-04: 求职总览 → 点击"确认" → 验证 stage 更新
- LM-05: 课程记录 → 打开填报弹窗 → 验证下拉选项非空
- LM-06: 课程排期 → 选择时段 → 验证保存成功
```

### 9.2 回归检查项
- [ ] 首页欢迎语动态匹配登录用户
- [ ] 首页卡片数据来自 API（非 Hardcoded）
- [ ] 岗位颜色对所有公司均有效
- [ ] 课程记录弹窗选项为 API 数据
- [ ] 班级/导师/报告页面是否启用
