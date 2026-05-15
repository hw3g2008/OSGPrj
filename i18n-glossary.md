# OSG i18n 术语表（权威）

> 5 端国际化（zh ↔ en）的强制术语对照表。**所有 worker / agent / 开发者**在做 i18n 替换时必须查本表，违反即视为错误。
>
> 优先级：本表 > `副本zh-en--map-translated.xlsx`（人工修订）> `osg-frontend/scripts/zh-en--map-translated.csv`（机翻，仅参考）

## 一、强制术语（不可变）

### 角色 / 人员

| 中文 | 英文（强制） | 严禁用 |
|---|---|---|
| 导师 | **Mentor** | Tutor / Instructor / Teacher |
| 班主任 | **Lead Mentor** | Head Teacher / Class Teacher / Homeroom Mentor |
| 学员 / 学生 | **Student** | Trainee / Pupil / Learner |
| 助教 | **Assistant** | TA / Aide |
| 管理员 | **Admin** | Administrator（除非正式头衔） |

### 业务核心概念

| 中文 | 英文（强制） | 严禁用 |
|---|---|---|
| 主攻方向 | **Track** | Main Direction / Major Direction / Direction of Attack |
| 岗位 | **Position** | Job / Job Post / Role |
| 岗位追踪 | **Application Progress** | Job Tracking / Position Tracking |
| 课程 | **Session** | Course / Class / Lesson |
| 课程记录 | **Session Record** | Course Record / Class Record |
| 排课 | **Session Scheduling** | Course Scheduling |
| 课时结算 | **Session Settlement** | Class Hour Settlement |
| 模拟应聘 | **Mock Practice** | Mock Interview Practice |
| 求职辅导 | **Job Coaching** | Career Coaching |
| 简历 | **Resume** | CV |
| 面试 | **Interview** | — |
| 真人面试 | **Live Interview** | Real Interview / Human Interview |
| 在线测试 | **Online Test** | Online Quiz |
| 反馈 | **Feedback** | — |
| 沟通记录 | **Communication Record** | Chat Log / Conversation Log |

### 系统管理

| 中文 | 英文（强制） | 严禁用 |
|---|---|---|
| 字典 / 字典管理 | **Dictionary** | Dict |
| 权限 / 权限管理 | **Permission** | Authority / Auth |
| 角色 / 角色管理 | **Role** | — |
| 菜单 / 菜单管理 | **Menu** | — |
| 报销 | **Reimbursement** | Expense Claim |
| 合同 | **Contract** | Agreement |
| 黑名单 | **Blacklist** | — |

### 模块名

| 中文 | 英文（强制） | 严禁用 |
|---|---|---|
| 求职中心 | **Job Search Center** | Career Center |
| 教学中心 | **Teaching Center** | Education Center |
| 用户中心 | **User Center** | — |
| 资源中心 | **Resource Center** | — |
| 财务中心 | **Financial Center** | Finance Center |
| 个人中心 | **Personal Center** | Profile Center |
| 首页 | **Home** | Dashboard（除非确实指仪表盘）|

---

## 二、Key 命名规范（强制）

**用 namespace，禁止 flat key**：

```
<scope>.<feature>.<element>
```

### 命名空间分配

| Scope | 用途 | 文件 |
|---|---|---|
| `common.*` | 跨端通用：按钮、提示、表单校验、字段通称 | `locales/{zh,en}/common.json` |
| `common.shared.*` | shared 公共组件文案 | 同上 |
| `admin.*` | admin 端专属 | `locales/{zh,en}/admin.json` |
| `student.*` | student 端专属 | `locales/{zh,en}/student.json` |
| `mentor.*` | mentor 端专属 | `locales/{zh,en}/mentor.json` |
| `leadMentor.*` | lead-mentor 端专属（camelCase）| `locales/{zh,en}/lead-mentor.json` |
| `assistant.*` | assistant 端专属 | `locales/{zh,en}/assistant.json` |

### 示例

```
common.action.save              = "保存" / "Save"
common.action.cancel            = "取消" / "Cancel"
common.message.success          = "操作成功" / "Operation successful"
common.field.name               = "姓名" / "Name"
common.validation.required      = "{field} 不能为空" / "{field} is required"

common.shared.pageHeader.search = "搜索" / "Search"
common.shared.modal.confirmTitle= "确认" / "Confirm"

admin.career.jobOverview.title  = "学员求职总览" / "Student Job Search Overview"
admin.career.jobOverview.filter.status = "状态" / "Status"
admin.users.staff.role.mentor   = "导师" / "Mentor"

student.dashboard.welcome       = "欢迎"  / "Welcome"
student.applications.empty      = "暂无申请记录" / "No application records"

mentor.courses.report.confirm   = "确认上报" / "Confirm Report"
leadMentor.teaching.classRecords.title = "课程记录" / "Session Records"
assistant.schedule.calendar.today = "今天" / "Today"
```

### 禁止

- ❌ `'save'` 顶层（无 scope）
- ❌ `'admin_career_job_overview_title'` 下划线 flat（旧 csv 是这种，仅查询用，不直接套）
- ❌ 中英混用（key 必须全 ASCII）

---

## 三、动态文本处理

### 字典值 / 菜单 / 角色

不要手翻，用工具：

```ts
import { dictI18n, menuI18n, roleI18n } from '@osg/shared'

// 字典值（status, level, type 等）
const label = dictI18n.translate('user_status', row.status)

// 菜单名（后端返 i18n_key）
const menuLabel = menuI18n.translate(menu.i18nKey, menu.menuName)

// 角色名
const roleLabel = roleI18n.translate(role.roleKey, role.roleName)
```

### 插值

```ts
// 模板
{{ t('common.tip.unsavedChanges', { count: dirtyCount }) }}

// locale
"unsavedChanges": "您有 {count} 项未保存的修改" / "You have {count} unsaved changes"
```

### 复数

```ts
{{ t('admin.users.studentCount', n) }}

// locale
"studentCount": "无学员 | {n} 位学员 | {n} 位学员"
"studentCount": "no students | one student | {n} students"
```

---

## 四、不要 t() 化的内容

- ❌ `console.log` / `console.error` / `console.warn` 文案
- ❌ log4j / logger 后端日志消息
- ❌ commit message / git 内部文案
- ❌ 错误判断用的字符串（如 `if (msg === '失败')` — 先重构成 errorCode 再 i18n）
- ❌ 注释 / 文档
- ❌ HTML `data-*` 属性内部值（除非确实展示给用户）
- ❌ 测试用例的 expect 描述（保中文方便看）
- ❌ 后端业务异常的中文（标 `// TODO(i18n-backend)`，前端不要 wrap 整句翻译）

---

## 五、工具与参考

| 资源 | 用途 |
|---|---|
| `i18n-glossary.md`（本文件） | **权威术语表**，必查 |
| `副本zh-en--map-translated.xlsx`（根目录）| 人工修订术语种子，Phase 0 解析合并到 terms.glossary.json |
| `osg-frontend/scripts/terms.glossary.json` | 运行时术语字典（本文件 + xlsx 合并产物） |
| `osg-frontend/scripts/zh-en--map-translated.csv` | 机翻参考（3756 条），**不准直接套**，术语必须按本表覆盖 |
| `osg-frontend/scripts/review-list.csv` | 132 条需人审条目 |
| `osg-frontend/scripts/key-map.json` | 6340 条历史 flat key（仅查询） |
| `osg-frontend/scripts/extract-i18n.mjs` | 扫硬编码 |
| `osg-frontend/scripts/replace-source.mjs` | 自动替换辅助 |
| `osg-frontend/scripts/generate-locale.mjs` | locale 生成 |
| `osg-frontend/packages/shared/src/i18n/index.ts` | i18n 实例入口 |
| `osg-frontend/packages/shared/src/utils/{menuI18n,dictI18n,roleI18n}.ts` | 字典/菜单/角色 i18n 工具 |

---

## 六、违规检测

CI 应加 lint（待 Phase 2 实现）：

```bash
node osg-frontend/scripts/extract-i18n.mjs --check
node osg-frontend/scripts/check-glossary.mjs   # 校验 locales 中术语翻译符合本表
```

PR 必过两关：
1. 无新增硬编码中文（除标 `// TODO(i18n-backend)` 的后端依赖项）
2. 术语翻译符合本表（"导师" 翻成 Tutor 直接 fail）

---

## 修改历史

| 日期 | 修改 |
|---|---|
| 2026-05-15 | 初版，确定 35+ 强制术语 + namespace 规范 |
