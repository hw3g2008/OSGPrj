# Student 端 Ant Design 改造 — Roadmap & 任务启动提示词

> **维护者**：主指挥窗口（roadmap-only，不动代码）
> **用法**：每个 Worker 任务一节，复制对应 § 4.x【复制到新窗口】下方代码块到新窗口启动。提示词都是自包含的。
> **创建**：2026-04-25

---

## 1. 战略一页纸

### 1.1 总目标

把 student 端**登录后可见的 5 个业务页**的 UI 控件从手写 HTML/CSS 迁移到 **ant-design-vue 4.x**，并把基础设施（主题 token / 依赖 / Layout）对齐 admin 改造范式。

### 1.2 红线（绝对不动）

- `views/login/`、`views/forgot-password/`（用户明确不弄）
- 其他 PHASE1 未启用页（ai-resume / ai-interview / communication / faq / files / interview-bank / netlog / notice / online-test-bank / questions / report / resources / restricted / resume / schedule / placeholder）
- 业务逻辑、API、router、auth 流程
- `@osg/shared`、admin、后端任何文件

### 1.3 5 个改造目标页

| # | 路由 | 主文件 | 备注 |
|---|---|---|---|
| 1 | `/positions` | `osg-frontend/packages/student/src/views/positions/index.vue` | **60KB 单文件** |
| 2 | `/job-tracking` | `osg-frontend/packages/student/src/views/applications/` | 日历+表格+tab |
| 3 | `/mock-practice` | `osg-frontend/packages/student/src/views/mock-practice/` | 3 服务卡 |
| 4 | `/myclass` | `osg-frontend/packages/student/src/views/courses/` | banner+tab+表格 |
| 5 | `/profile` | `osg-frontend/packages/student/src/views/profile/` | 5 区块 |

### 1.4 7 Story 依赖图

```
S0 基础设施 → S1 MainLayout logout
                    │
        ┌──────┬───┴──┬──────┬──────┐
        ▼      ▼      ▼      ▼      ▼
       S2     S3     S4     S5     S6
     Pos    Apps   Mock   Class  Profile
        └──────┴──────┴──────┴──────┘
                       │
                       ▼
                S7 收尾验收
```

### 1.5 推荐串行顺序

S0 → S1 → S6（最简单练手）→ S4 → S5 → S2（60KB）→ S3（实测 67KB 最大，收尾最难）→ S7

总估 12-14 小时。

> **顺序依据**：applications/index.vue（67KB）实际比 positions/index.vue（60KB）大，S3 应放在 S2 之后，累计了 S2 的 AntD 组件替换经验再启 S3。

---

## 2. 全局决策项（启动 S0 前拍板）

### 决策 #1 — 主色对齐 vs 主色保持

| 选项 | 影响 |
|---|---|
| A 改齐 admin | `--primary` 从 `#7399c6` 改成 `#6366F1`；登录页按钮渐变和链接色顺带变 indigo |
| **B 保持灰蓝（已选）** | `--primary` 保持 `#7399c6`；登录页零变动；跨端不一致 |

> **决策**：✅ B — **保持 student 端特有的灰蓝主色，SCSS 色值都不动**
>
> **强约束**：
> - `osg-frontend/packages/student/src/styles/global.scss` 全文件不动；任何 worker 都不能改 SCSS token 数值
> - AntD 组件通过 `App.vue` 注入 `colorPrimary: '#7399c6'`（**字面量**，与 SCSS `--primary` 同值）让 AntD 高亮态/hover 态/active 态走灰蓝
> - **不用 `var(--primary)`**：AntD 4.x 内部用 `@ant-design/colors.generate()` 派生 hover/active/border 等色阶，该函数只接受 hex/rgb/hsl，传 CSS 变量字符串会让派生色断裂
> - 唯一字面量出现在 `App.vue` 一处，与 SCSS 灰蓝同步；如未来灰蓝变动，需同步两处（可接受的低成本双维护）

### 决策 #2 — sidebar 是否改 `<a-menu>`

| 选项 | 影响 |
|---|---|
| **A 不改（已选）** | 保留手写 `<aside><nav><a>`；admin 自己也手写；省 1 个 Ticket |
| B 改 `<a-layout-sider>` + `<a-menu>` | S1 多 1 个 Ticket；回归风险中 |

> **决策**：✅ A — sidebar 不改，S1 只做 logout 一项

### 决策 #3 — 超大单 vue（≥ 50KB）是否拆文件

**辖区**：本决策同时适用于 Positions/index.vue（60KB）、applications/index.vue（67KB）等本次改造范围内的所有超大单文件。

| 选项 | 影响 |
|---|---|
| A 拆多文件 | 按 admin 范式拆为 `index / FilterBar / TreeView / ListView / Card` 等；与 admin 对齐但是结构重构 |
| **B 不拆（已选）** | 保留单文件，只换组件；符合"只换组件"最小变更原则；单 vue 长期 review/diff 痛苦但本期不解决 |

> **决策**：✅ B — **Positions 和 applications 都不拆**，单文件内只换组件
>
> 理由：用户明确"只需要把组件改了"，拆文件属于结构重构，超出本次范围。如未来需要再拆，单独再立 Story。

---

## 3. Worker 共享上下文

每份任务卡引用本节，不重复。

### 3.1 项目 / 启动

- 仓库根：`h:\workspace\java\OSGPrj`（Windows，PowerShell + Git Bash 混合）
- student 包：`osg-frontend/packages/student`
- admin 包（参照系，**不动**）：`osg-frontend/packages/admin`
- 后端：`bash bin/run-backend-dev.sh deploy/.env.dev` → `28080` → `curl http://127.0.0.1:28080/actuator/health` 应返回 `{"status":"UP"}`
- 前端：`bash bin/run-frontend-dev.sh student` → `3001`（Windows 上 `lsof` 不可用，端口占用要先 `taskkill /F /T /PID <持有者>`）
- 测试账号：`student_demo` / `student123`（首次登录 ~10s，远程 DB 冷启）

### 3.2 admin 改造体征（参照系）

| 体征 | admin | student 现状 |
|---|---|---|
| `App.vue` theme | `:theme="{ token: { colorPrimary: '#6366F1' } }"` | 没注入 |
| `--primary` | `#6366F1` indigo | `#7399c6` 灰蓝 |
| `@mdi/font` | 自有依赖 + scss `@import` | `main.ts` 跨包硬路径 hack |
| 登录页 | 全 `<a-form>/<a-input>/<a-button>` | 全手写（**不改**） |
| MainLayout logout | `Modal.confirm` + `message.success` | 直接 `router.push` |
| views 拆分 | 按业务域多文件 | 一页一 vue |

### 3.3 强制规则（项目级）

- **R1**：bug 修复前必须走 `systematic-debugging` 4 阶段（Reproduce → Investigate → Root Cause → Fix Plan），禁止直接改代码
- **R2**：声称"完成"前必须 `verification-before-completion`（实际跑测试/curl/可执行命令，不能仅凭代码 diff）
- **R3**：连续失败 2 次必须调 `when-stuck` 重新分流

### 3.4 通用验收信号

- `pnpm --filter @osg/student build` exit 0
- `pnpm --filter @osg/student test` exit 0（如果有相关单测）
- dev server 起来 + Playwright MCP 实测 + console 0 errors / 0 warnings
- 截图存 `screenshots/student-S<N>-<slug>.png`

---

## 4. 任务启动提示词

> 复制 § 4.x 代码块**整段**到新窗口粘贴发送。

### 4.0 Story 0 — 基础设施对齐

**前置**：无 · **工时**：30min · **Ticket**：1 · **推荐 skill**：`/implement-fix-plan`

**复制到新窗口**：

````md
任务：Student 端 AntD 改造 — Story 0 基础设施对齐

# 上下文
仓库根 h:\workspace\java\OSGPrj
本任务范围：osg-frontend/packages/student
不改：登录页、忘记密码、@osg/shared、admin、业务逻辑
参考 docs/plans/2026-04-25-student-antd-migration-roadmap.md § 3

# 决策 #1（主色）
✅ B — 保持 student 灰蓝 #7399c6
**强约束：global.scss 全文件不动；通过 App.vue 注入 colorPrimary: '#7399c6' 字面量（不用 var(--primary)，因为 AntD 派生色函数不识别 CSS 变量）**

# 现状证据
- packages/student/package.json 没 @mdi/font 依赖
- packages/student/src/main.ts:7 跨包 hack：
    import '../../admin/node_modules/@mdi/font/css/materialdesignicons.css'
- packages/student/src/App.vue:2 没 :theme prop
- packages/student/src/styles/global.scss:4 --primary: #7399c6

# 实施
## T1 加 @mdi/font 依赖
- packages/student/package.json dependencies 加 "@mdi/font": "^7.4.47"
- 仓库根跑 pnpm install
- main.ts:7 改成 import '@mdi/font/css/materialdesignicons.css'

## T2 App.vue 注入 theme token
- App.vue:2 改成：
    <a-config-provider :locale="zhCN" :theme="{ token: { colorPrimary: '#7399c6' } }">
- **用字面量不用 var(--primary)**：AntD 4.x 派生色函数 generate() 只接受 hex/rgb/hsl，传 CSS 变量会断派生色
- '#7399c6' 与 global.scss 的 --primary 同值（手动同步，唯一字面量出现处）
- **字面量 vs var() 边界**：App.vue 这一处是 AntD 派生色函数限制下的**唯一例外**，所有其他位置（SCSS / `<style scoped>` / 组件 prop 上的主色）一律用 `var(--primary*)`

## T3 global.scss 主色
跳过：决策 #1 = B 不动 SCSS 色值，本步骤无需任何代码变动。严禁提交中包含 `osg-frontend/packages/student/src/styles/global.scss` 的任何变动。

# 验收
1. pnpm --filter @osg/student build → exit 0
2. bash bin/run-frontend-dev.sh student（先清 3001 端口）
3. Playwright MCP 登录 student_demo/student123 → 跳 /positions
4. console 0 errors 0 warnings
5. 看左下 user-card 渐变色应保持灰蓝（与改造前一致）
6. **AntD 高亮态实测（必做，不能只看登录页）**：在 /positions 临时加一个 `<a-button type="primary">测试</a-button>`，看按钮主色是否是灰蓝 #7399c6（非 AntD 默认蓝 #1677ff），实测完删掉临时按钮。实测完后必须跑：`git diff -- osg-frontend/packages/student/src/views/positions/index.vue` 输出应为空（确认 /positions 未被污染）
7. 截图 screenshots/student-S0-positions.png + student-S0-login.png（确认登录页零变动）

# 严禁
- 不动 views/login/、views/forgot-password/
- 不动 @osg/shared、admin、业务逻辑
- **不动 src/styles/global.scss 任何色值**（决策 #1 = B 强约束）
- 不动任何 SCSS 文件里的 var(--primary*) 引用

# 完成后
git diff + build 输出 + Playwright 验证截图回报主指挥窗口。
````

### 4.1 Story 1 — MainLayout logout 收口

**前置**：S0 · **工时**：45min · **Ticket**：1（决策 #2=A）或 2（决策 #2=B）

**复制到新窗口**：

````md
任务：Student 端 AntD 改造 — Story 1 MainLayout logout 收口

# 前置
S0 已完成（pnpm build 过、dev server 起得来、console 0 错）

# 上下文
仓库根 h:\workspace\java\OSGPrj
参考 docs/plans/2026-04-25-student-antd-migration-roadmap.md § 3

# 决策 #2（sidebar 是否改 a-menu）
✅ A — 不改，本任务只做 logout 一项

# 现状
packages/student/src/layouts/MainLayout.vue:262-270 直接 router.push('/login') 无确认。
admin/src/layouts/MainLayout.vue:232-245（参照系）用 Modal.confirm + message.success。

# 实施
## T1 logout 走 Modal.confirm
1. 顶部 import 加：
   import { Modal, message } from 'ant-design-vue'
2. 重写 handleLogout：
   const handleLogout = () => {
     Modal.confirm({
       title: '确认退出',
       content: '确定要退出登录吗？',
       okText: '确定',
       cancelText: '取消',
       async onOk() {
         try { await logout() } catch { /* 忽略 */ }
         clearAuth()
         message.success('已退出登录')
         router.push('/login')
       },
     })
   }

# 验收
1. pnpm --filter @osg/student build → exit 0
2. dev server + 登录 → 点左下 user-card → 弹 AntD Modal "确认退出"
3. 取消 → Modal 关闭，停在原页
4. 确定 → message "已退出登录" → 跳 /login
5. console 0 errors 0 warnings
6. 截图 screenshots/student-S1-logout-modal.png

# 严禁
- 不动 menuGroups 数据
- 不动 filteredMenuGroups / isActive / navigate
- 不动 normalizeStudentPath / PHASE1_VISIBLE_PATHS

# 完成后
git diff + build + Playwright 三步操作截图回报主指挥窗口。
````

---

### 4.2 Story 2 — Positions 页改造（**60KB，最复杂**）

**前置**：S0 + S1 · **工时**：3-4h · **Ticket**：5-7（决策 #3=B 已落定） · **推荐 skill**：`/brainstorm` 子分析后 `/implement-fix-plan`

**复制到新窗口**：

````md
任务：Student 端 AntD 改造 — Story 2 Positions 页（最复杂的一页）

# 前置
S0 + S1 已完成

# 上下文
仓库根 h:\workspace\java\OSGPrj
参考 docs/plans/2026-04-25-student-antd-migration-roadmap.md § 3
目标文件：osg-frontend/packages/student/src/views/positions/index.vue（60KB 单文件）

# 决策 #3（是否拆 5 文件）
✅ B — 不拆，单文件内只换组件（最小变更原则）
本任务在 osg-frontend/packages/student/src/views/positions/index.vue 单文件内完成 T2-T7

# 页面构成
- 顶部页头（标题 + 副标题 + 视图切换 radio + "手动添加"按钮）
- 学员意向 banner（2026 Spring / Shanghai / Consulting）
- 4 筛选下拉（全部分类/全部行业/全部公司/全部地区）+ 搜索框
- Tab：全部岗位 / 我的收藏（带计数）
- 下钻视图：5 大分类（Consulting / Buyside / Middle Market / Elite Boutique / Bulge Bracket），每个分类下钻显示公司，公司下钻显示岗位

# 实施清单（决策 #3 = B：单文件内只换组件，不创 components/ 子目录、不抽 PositionCard.vue、不收口为编排器）

## T2 视图切换 → a-radio-group
<a-radio-group v-model:value="viewMode" button-style="solid">
  <a-radio-button value="drill">下钻视图</a-radio-button>
  <a-radio-button value="list">列表视图</a-radio-button>
</a-radio-group>

## T3 筛选区 → 4 a-select + a-input-search（直接在 index.vue 内）
<a-select v-model:value="filters.category" placeholder="全部分类" allow-clear style="width: 140px">
  <a-select-option value="all">全部分类</a-select-option>
  <a-select-option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
</a-select>
其余 3 个下拉（行业/公司/地区）同模式。
搜索：<a-input-search v-model:value="kw" placeholder="搜索岗位名称..." enter-button @search="onSearch" style="width: 240px" />

## T4 学员意向 banner → a-alert
<a-alert type="info" show-icon>
  <template #message>
    根据您的求职意向，当前展示 <strong>{{ cycle }}</strong> 招聘周期、<strong>{{ region }}</strong> 地区、<strong>{{ direction }}</strong> 主攻方向的岗位信息
  </template>
  <template #action>
    <a-button type="link" size="small" @click="onEditPreference">修改求职意向 <RightOutlined /></a-button>
  </template>
</a-alert>

## T5 Tab → a-tabs + a-badge
<a-tabs v-model:active-key="activeTab">
  <a-tab-pane key="all" tab="全部岗位" />
  <a-tab-pane key="favorites">
    <template #tab>
      我的收藏 <a-badge :count="favoritesCount" :number-style="{ backgroundColor: '#52c41a' }" />
    </template>
  </a-tab-pane>
</a-tabs>

## T6 下钻视图 → a-collapse（直接在 index.vue 内，不抽 CategoryTreeView.vue）
<a-collapse v-model:active-key="expandedCategories" :bordered="false">
  <a-collapse-panel v-for="cat in categories" :key="cat.id" :header="cat.name">
    <template #extra>
      <a-tag color="processing">{{ cat.companyCount }} 家公司</a-tag>
      <a-tag color="success">{{ cat.positionCount }} 个岗位</a-tag>
    </template>
    <CompanyList :companies="cat.companies" />
  </a-collapse-panel>
</a-collapse>

## T7 "手动添加" → a-button + Plus
<a-button type="primary" @click="onAddManual">
  <template #icon><PlusOutlined /></template>
  手动添加
</a-button>

## T8 列表视图 → a-table（直接在 index.vue 内）
columns: 分类 / 公司 / 岗位 / 地区 / 操作
pagination 由 a-table 自带

# 验收
1. pnpm --filter @osg/student build → exit 0
2. pnpm --filter @osg/student test → exit 0（如有相关单测）
3. dev server + 登录 → /positions
4. 必测：
   - 视图切换 radio：下钻 ⇆ 列表
   - 4 筛选可选可 clear
   - 搜索回车有反应
   - Tab 切换
   - 5 大分类下钻可展开/折叠
   - "修改求职意向"链接可点
   - "手动添加"按钮可点
5. console 0 errors 0 warnings
6. 截图 screenshots/student-S2-positions-drill.png + student-S2-positions-list.png
7. **e2e 退出码 0**：`pnpm --filter @osg/student exec playwright test e2e/positions.e2e.spec.ts e2e/positions-real-integration.e2e.spec.ts`。选择器如需更新（DOM 从手写变 AntD）可改，行为断言不能改

# 严禁
- 不动 API 调用（fetch 岗位列表）
- 不动路由
- 不动收藏计数逻辑
- 不动 PHASE1_VISIBLE_PATHS
- **不动 SCSS 色值**（保持 var(--primary*) 引用，不替换具体颜色字面量）
- 不抽子组件文件（决策 #3 = B 强约束）

# 完成后
git diff + build + 全部必测交互截图回报主指挥窗口。
````

---

### 4.3 Story 3 — My Applications 页改造（**实测 67KB 最大**）

**前置**：S0 + S1 · **工时**：3-4h · **Ticket**：5-7 · **推荐 skill**：`/implement-fix-plan`

**复制到新窗口**：

````md
任务：Student 端 AntD 改造 — Story 3 My Applications 页

# 前置
S0 + S1 已完成

# 上下文
仓库根 h:\workspace\java\OSGPrj
参考 docs/plans/2026-04-25-student-antd-migration-roadmap.md § 3
目标：osg-frontend/packages/student/src/views/applications/index.vue（**实测 67KB 单文件，比 positions 还大**）

# 决策 #3（是否拆文件）
✅ B — **不拆**，单文件内只换组件（与 Positions 一致）
本任务在 osg-frontend/packages/student/src/views/applications/index.vue 单文件内完成所有 T，不抽子组件、不创建 components/ 子目录

# 页面构成
- 4 月日历 widget（本月 0 场 / 本周 0 场 / 周一-周日栏）
- 4 筛选 + 搜索 + 重置（搜索公司岗位 / 全部阶段 / 全部辅导状态 / 全部公司类型）
- 阶段 Tab + 计数（全部 4 / 已投递 2 / 面试中 2 / 已结束 0）
- 申请表格（公司岗位/阶段/面试时间/辅导状态/导师/课时反馈/操作）
- 操作列内嵌状态切换 combobox

# 实施

## T1 日历保留手写但 token 化
（决策：a-calendar 太重；本部件只读视觉，保留手写但用 var(--primary) 等 token 替代硬编码颜色）

## T2 筛选区 → a-input-search + 3 a-select + 2 a-button
<a-input-search v-model:value="kw" placeholder="搜索公司/岗位..." />
<a-select v-model:value="stage" placeholder="全部阶段" allow-clear>
  <a-select-option value="applied">已投递</a-select-option>
  <a-select-option value="interview">面试中</a-select-option>
  <a-select-option value="ended">已结束</a-select-option>
</a-select>
<a-select v-model:value="coachStatus" placeholder="全部辅导状态" allow-clear />
<a-select v-model:value="companyType" placeholder="全部公司类型" allow-clear />
<a-button type="primary" @click="onSearch">搜 索</a-button>
<a-button @click="onReset">重 置</a-button>

## T3 阶段 Tab → a-tabs + a-badge
<a-tabs v-model:active-key="activeStage">
  <a-tab-pane key="all">
    <template #tab>全部 <a-badge :count="counts.all" :number-style="{ backgroundColor: 'var(--primary)' }" /></template>
  </a-tab-pane>
  <a-tab-pane key="applied">
    <template #tab>已投递 <a-badge :count="counts.applied" /></template>
  </a-tab-pane>
  <a-tab-pane key="interview">
    <template #tab>面试中 <a-badge :count="counts.interview" /></template>
  </a-tab-pane>
  <a-tab-pane key="ended">
    <template #tab>已结束 <a-badge :count="counts.ended" /></template>
  </a-tab-pane>
</a-tabs>

## T4 表格 → a-table
const columns = [
  { title: '公司/岗位', key: 'company', dataIndex: 'companyName' },
  { title: '阶段', key: 'stage', dataIndex: 'stage' },
  { title: '面试时间', key: 'interviewTime', dataIndex: 'interviewTime' },
  { title: '辅导状态', key: 'coachStatus', dataIndex: 'coachStatus' },
  { title: '导师', key: 'mentor', dataIndex: 'mentorName' },
  { title: '课时/反馈', key: 'feedback', dataIndex: 'feedback' },
  { title: '操作', key: 'action' },
]

<a-table :columns="columns" :data-source="rows" :pagination="false">
  <template #bodyCell="{ column, record }">
    <template v-if="column.key === 'company'">
      <div>
        <strong>{{ record.companyName }}</strong>
        <p>{{ record.positionTitle }}</p>
      </div>
    </template>
    <template v-if="column.key === 'stage'">
      <a-tag :color="stageColor(record.stage)">{{ record.stageLabel }}</a-tag>
    </template>
    <template v-if="column.key === 'coachStatus'">
      <a-tag :color="coachStatusColor(record.coachStatus)">{{ record.coachStatusLabel }}</a-tag>
    </template>
    <template v-if="column.key === 'action'">
      <a-select v-model:value="record.stage" size="small" @change="onStageChange(record)">
        <a-select-option value="applied">已投递</a-select-option>
        <a-select-option value="firstRound">First Round</a-select-option>
        <a-select-option value="secondRound">Second Round</a-select-option>
        ...
      </a-select>
    </template>
  </template>
</a-table>

## T5 stageColor / coachStatusColor 保持现有色谱
不要改色谱 mapping（紫色/黄色/绿色对应业务状态）。

# 验收
1. pnpm --filter @osg/student build → exit 0
2. dev server + 登录 → /job-tracking
3. 必测：
   - 日历 widget 渲染（保持现有视觉）
   - 4 筛选可选 / 可 clear
   - 搜索 + 重置工作
   - Tab 切 4 stages
   - a-table 渲染 4 行真实数据
   - 表格内嵌状态 a-select 下拉可用
4. console 0 errors 0 warnings
5. 截图 screenshots/student-S3-applications.png
6. **e2e 退出码 0**：`pnpm --filter @osg/student exec playwright test e2e/applications.e2e.spec.ts e2e/applications-real-integration.e2e.spec.ts`。选择器如需更新可改，行为断言不能改

# 严禁
- 不动 API 拉取申请列表逻辑
- 不动 stageColor / coachStatusColor 色谱
- 不动日历 0 场计数逻辑
- **不动 SCSS 色值**（保持 var(--primary*) 引用，不替换颜色字面量）

# 完成后
git diff + build + 必测截图回报。
````

---

### 4.4 Story 4 — Mock Practice 页改造

**前置**：S0 + S1 · **工时**：1.5h · **Ticket**：3-4 · **推荐 skill**：`/implement-fix-plan`

**复制到新窗口**：

````md
任务：Student 端 AntD 改造 — Story 4 Mock Practice 页

# 前置
S0 + S1 已完成

# 上下文
仓库根 h:\workspace\java\OSGPrj
参考 docs/plans/2026-04-25-student-antd-migration-roadmap.md § 3
目标：osg-frontend/packages/student/src/views/mock-practice/index.vue

# 页面构成
- 顶部 3 服务卡：模拟面试 (MI, 蓝) / 人际关系测试 (RT, 黄) / 期中考试 (EX, 紫)
- 我的模拟应聘记录区：搜索 + 全部类型 + 全部状态 + 时间范围 + 刷新
- 申请记录表格（类型/申请内容/申请时间/导师/已上课时/课程反馈），现 empty

# 实施

## T1 3 服务卡 → a-card hoverable + a-row/col + a-avatar
<a-row :gutter="16">
  <a-col :span="8" v-for="service in services" :key="service.code">
    <a-card hoverable @click="onApply(service)">
      <a-avatar :size="64" :style="{ backgroundColor: service.bgColor }">{{ service.code }}</a-avatar>
      <h3>{{ service.title }}</h3>
      <p>{{ service.description }}</p>
      <a-button :type="service.btnType" block>{{ service.btnLabel }}</a-button>
    </a-card>
  </a-col>
</a-row>

services 数据：
[
  { code: 'MI', title: '模拟面试', description: '与导师进行1对1模拟面试练习，获取专业反馈', btnLabel: '申请模拟面试', btnType: 'primary', bgColor: '#3b82f6' },
  { code: 'RT', title: '人际关系测试', description: '测试您的职场沟通和人际交往能力', btnLabel: '申请测试', btnType: 'default', bgColor: '#f59e0b' },
  { code: 'EX', title: '期中考试', description: '阶段性知识检测，评估学习进度', btnLabel: '申请考试', btnType: 'default', bgColor: '#a855f7' },
]

## T2 筛选区 → a-input + 3 a-select + 刷新 a-button.icon
<a-input v-model:value="kw" placeholder="搜索..." style="width: 200px" />
<a-select v-model:value="type" placeholder="全部类型" allow-clear />
<a-select v-model:value="status" placeholder="全部状态" allow-clear />
<a-select v-model:value="timeRange" placeholder="时间范围" allow-clear />
<a-button @click="onRefresh">
  <template #icon><ReloadOutlined /></template>
  刷新
</a-button>

## T3 表格 → a-table（自带 empty）
const columns = [
  { title: '类型', dataIndex: 'type' },
  { title: '申请内容', dataIndex: 'content' },
  { title: '申请时间', dataIndex: 'appliedAt' },
  { title: '导师', dataIndex: 'mentorName' },
  { title: '已上课时', dataIndex: 'hours' },
  { title: '课程反馈', dataIndex: 'feedback' },
]
<a-table :columns="columns" :data-source="records" :pagination="false" />
（空态由 a-table 自动渲染 a-empty）

## T4 整页用 a-card 包两大区
<a-card title="应聘演练" :bordered="false">
  <!-- 3 服务卡 -->
</a-card>
<a-card title="我的模拟应聘记录" :bordered="false" style="margin-top: 24px">
  <!-- 筛选 + 表格 -->
</a-card>

# 验收
1. pnpm --filter @osg/student build → exit 0
2. dev server + 登录 → /mock-practice
3. 必测：
   - 3 服务卡 hover 有动效
   - 点服务卡 button 触发 onApply
   - 4 筛选可选可 clear
   - 刷新按钮可点
   - 表格空态显示 AntD 默认 empty
4. console 0 errors 0 warnings
5. 截图 screenshots/student-S4-mock-practice.png
6. **e2e 退出码 0**：`pnpm --filter @osg/student exec playwright test e2e/mock-practice.e2e.spec.ts e2e/mock-practice-real-integration.e2e.spec.ts`。选择器如需更新可改，行为断言不能改

# 严禁
- 不动 onApply 后续业务（弹申请 modal 是后续 story）
- 不动 services 的 code 配置（颜色由 a-avatar bgColor 控制）
- **不动 SCSS 色值**（保持 var(--primary*) 引用，不替换颜色字面量）

# 完成后
git diff + build + 截图回报。
````

---

### 4.5 Story 5 — Class Records 页改造

**前置**：S0 + S1 · **工时**：1.5h · **Ticket**：3-4 · **推荐 skill**：`/implement-fix-plan`

**复制到新窗口**：

````md
任务：Student 端 AntD 改造 — Story 5 Class Records 页

# 前置
S0 + S1 已完成

# 上下文
仓库根 h:\workspace\java\OSGPrj
参考 docs/plans/2026-04-25-student-antd-migration-roadmap.md § 3
目标：osg-frontend/packages/student/src/views/courses/index.vue

# 页面构成
- 顶部"新增课程记录"banner：导师 Jerry Li 为您填报了 0 条新的上课记录 + "去评价"button
- 三 Tab：全部 / 待评价 / 已评价
- 筛选区：搜索导师 + 辅导类型 + 课程内容 + 时间范围 + 重置
- 课程记录表格（记录ID/辅导内容/课程内容/导师/上课日期/时长/我的评价/操作），现 empty

# 实施

## T1 banner → a-alert type="success" banner closable
<a-alert type="success" show-icon banner closable>
  <template #message>
    <strong><BellOutlined /> 新增课程记录</strong>
  </template>
  <template #description>
    导师 <strong>{{ mentorName }}</strong> 为您填报了 <strong>{{ pendingCount }}</strong> 条新的上课记录，请及时评价
  </template>
  <template #action>
    <a-button type="primary" size="small" @click="onGoToEvaluate">去评价</a-button>
  </template>
</a-alert>

## T2 三 Tab → a-tabs
<a-tabs v-model:active-key="activeTab">
  <a-tab-pane key="all" tab="全部" />
  <a-tab-pane key="pending" tab="待评价" />
  <a-tab-pane key="done" tab="已评价" />
</a-tabs>

## T3 筛选区 → a-input + 2 a-select + a-range-picker + a-button
<a-input v-model:value="kw" placeholder="搜索导师..." />
<a-select v-model:value="coachType" placeholder="辅导类型" allow-clear />
<a-select v-model:value="courseTopic" placeholder="课程内容" allow-clear />
<a-range-picker v-model:value="dateRange" />
<a-button @click="onReset">
  <template #icon><FilterOutlined /></template>
  重置
</a-button>

## T4 表格 → a-table
const columns = [
  { title: '记录ID', dataIndex: 'id' },
  { title: '辅导内容', dataIndex: 'coachContent' },
  { title: '课程内容', dataIndex: 'courseTopic' },
  { title: '导师', dataIndex: 'mentorName' },
  { title: '上课日期', dataIndex: 'classDate' },
  { title: '时长', dataIndex: 'durationMin', customRender: ({ value }) => `${value} 分钟` },
  { title: '我的评价', key: 'rating' },
  { title: '操作', key: 'action' },
]

<a-table :columns="columns" :data-source="records" :pagination="false">
  <template #bodyCell="{ column, record }">
    <template v-if="column.key === 'rating'">
      <a-rate v-if="record.rated" :value="record.rating" disabled />
      <span v-else>未评价</span>
    </template>
    <template v-if="column.key === 'action'">
      <a-button type="link" size="small" @click="onEvaluate(record)">
        {{ record.rated ? '查看' : '评价' }}
      </a-button>
    </template>
  </template>
</a-table>

# 验收
1. pnpm --filter @osg/student build → exit 0
2. dev server + 登录 → /myclass
3. 必测：
   - banner 显示 + 可关闭 + "去评价"按钮触发 onGoToEvaluate
   - 三 Tab 切换
   - 筛选 + 重置工作
   - a-range-picker 可选时间范围
   - 表格空态显示 AntD 默认 empty
4. console 0 errors 0 warnings
5. 截图 screenshots/student-S5-class-records.png
6. **e2e 退出码 0**：`pnpm --filter @osg/student exec playwright test e2e/courses.e2e.spec.ts e2e/courses-real-integration.e2e.spec.ts`。选择器如需更新可改，行为断言不能改

# 严禁
- 不动 mentorName / pendingCount 数据来源
- 不动"去评价"按钮跳转目标
- **不动 SCSS 色值**（保持 var(--primary*) 引用，不替换颜色字面量）

# 完成后
git diff + build + 截图回报。
````

---

### 4.6 Story 6 — Profile 页改造（**最简单，建议先做练手**）

**前置**：S0 + S1 · **工时**：1h · **Ticket**：3-4 · **推荐 skill**：`/implement-fix-plan`

**复制到新窗口**：

````md
任务：Student 端 AntD 改造 — Story 6 Profile 页（最简单的一页，建议作为团队首个改造任务练手）

# 前置
S0 + S1 已完成

# 上下文
仓库根 h:\workspace\java\OSGPrj
参考 docs/plans/2026-04-25-student-antd-migration-roadmap.md § 3
目标：osg-frontend/packages/student/src/views/profile/index.vue

# 页面构成
- 顶部 banner（warning 色）："当前没有待审核的信息变更" + "查看详情"button
- Avatar SD + 姓名 Student Demo + Student ID: STU-101 · 正常 + 编辑信息 button
- 5 区块（每块都是 label-value 罗列）：
  1. 核心信息：英文姓名 / 性别 / 邮箱
  2. 导师配置：班主任 / 助教
  3. 学业信息：学校 / 专业 / 毕业年份 / 高中 / 是否读研或延毕 / 签证
  4. 求职方向：求职地区 / 招聘周期 / 主攻方向 / 子方向
  5. 联系方式：电话 / 微信ID

# 实施

## T1 顶部 banner → a-alert type="warning"
<a-alert type="warning" show-icon>
  <template #message>{{ pendingChange ? '您有待审核的信息变更' : '当前没有待审核的信息变更' }}</template>
  <template #description>学业信息和求职方向的修改会进入后台审核队列，联系方式修改后直接生效。</template>
  <template #action>
    <a-button size="small" @click="onViewDetail">查看详情</a-button>
  </template>
</a-alert>

## T2 头像 + 名片区 → a-page-header 或手写 + a-avatar
<div class="profile-header">
  <a-avatar :size="80" :style="{ backgroundColor: 'var(--primary)' }">SD</a-avatar>
  <div>
    <h2>{{ user.nickName }}</h2>
    <a-space>
      <span>Student ID: {{ user.studentId }}</span>
      <a-tag color="success">{{ user.statusLabel }}</a-tag>
    </a-space>
  </div>
  <a-button type="primary" @click="onEdit">
    <template #icon><EditOutlined /></template>
    编辑信息
  </a-button>
</div>

## T3 5 区块 → a-card + a-descriptions（每区块用一个 a-card）
<a-card title="核心信息" :bordered="false">
  <a-descriptions :column="3">
    <a-descriptions-item label="英文姓名">{{ user.englishName }}</a-descriptions-item>
    <a-descriptions-item label="性别">{{ user.gender }}</a-descriptions-item>
    <a-descriptions-item label="邮箱">{{ user.email }}</a-descriptions-item>
  </a-descriptions>
</a-card>

<a-card title="导师配置" :bordered="false" style="margin-top: 16px">
  <a-descriptions :column="2">
    <a-descriptions-item label="班主任">{{ user.headTeacher || '-' }}</a-descriptions-item>
    <a-descriptions-item label="助教">{{ user.teachingAssistant || '-' }}</a-descriptions-item>
  </a-descriptions>
</a-card>

<a-card title="学业信息" :bordered="false" style="margin-top: 16px">
  <a-descriptions :column="3">
    <a-descriptions-item label="学校">{{ user.school }}</a-descriptions-item>
    <a-descriptions-item label="专业">{{ user.major }}</a-descriptions-item>
    <a-descriptions-item label="毕业年份">{{ user.graduationYear }}</a-descriptions-item>
    <a-descriptions-item label="高中">{{ user.highSchool || '-' }}</a-descriptions-item>
    <a-descriptions-item label="是否读研或延毕">{{ user.isPostgrad ? '是' : '否' }}</a-descriptions-item>
    <a-descriptions-item label="签证">{{ user.visa || '-' }}</a-descriptions-item>
  </a-descriptions>
</a-card>

<a-card title="求职方向" :bordered="false" style="margin-top: 16px">
  <a-descriptions :column="2">
    <a-descriptions-item label="求职地区">{{ user.region }}</a-descriptions-item>
    <a-descriptions-item label="招聘周期">{{ user.cycle }}</a-descriptions-item>
    <a-descriptions-item label="主攻方向">{{ user.direction }}</a-descriptions-item>
    <a-descriptions-item label="子方向">{{ user.subDirection || '-' }}</a-descriptions-item>
  </a-descriptions>
</a-card>

<a-card title="联系方式" :bordered="false" style="margin-top: 16px">
  <a-descriptions :column="2">
    <a-descriptions-item label="电话">{{ user.phone }}</a-descriptions-item>
    <a-descriptions-item label="微信ID">{{ user.wechat || '-' }}</a-descriptions-item>
  </a-descriptions>
</a-card>

## T4 编辑信息 modal（保留现有逻辑只换组件）
- onEdit 弹 <a-modal v-model:open="editVisible" title="编辑信息">
- 内含 <a-form> + <a-form-item> + <a-input> + <a-select>，按字段权限分核心可改 / 待审核两组

# 验收
1. pnpm --filter @osg/student build → exit 0
2. dev server + 登录 → /profile
3. 必测：
   - banner 显示当前状态
   - "查看详情"按钮可点
   - 5 a-card 渲染所有字段（与种子值一致：Student Demo / Male / student_demo@osg.local / Runtime Backfill University / Business / 2027 / Shanghai / 2026 Spring / Consulting / Strategy / 13900000002）
   - "编辑信息"button 弹出 a-modal（如已有现成 modal 改成 AntD 即可，复用业务逻辑）
4. console 0 errors 0 warnings
5. 截图 screenshots/student-S6-profile.png
6. **e2e 退出码 0**：`pnpm --filter @osg/student exec playwright test e2e/profile-plus.e2e.spec.ts e2e/profile-real-integration.e2e.spec.ts`。选择器如需更新可改，行为断言不能改

# 严禁
- 不动数据 fetch 逻辑
- 不动字段映射（labels）
- 编辑后保存的提交 API 不动
- **不动 SCSS 色值**（保持 var(--primary*) 引用，不替换颜色字面量）
- a-avatar 的 backgroundColor 不要写 `#6366F1`（admin 主色 indigo），改用 `var(--primary)`（SCSS 灰蓝）或 `#7399c6` 字面量

# 完成后
git diff + build + 截图回报。
````

---

### 4.7 Story 7 — 收尾验收

**前置**：S0-S6 全部完成 · **工时**：45min · **Ticket**：1-2 · **推荐 skill**：`webapp-testing` + `verification`

**复制到新窗口**：

````md
任务：Student 端 AntD 改造 — Story 7 收尾全量验收

# 前置
S0/S1/S2/S3/S4/S5/S6 全部完成

# 上下文
仓库根 h:\workspace\java\OSGPrj
参考 docs/plans/2026-04-25-student-antd-migration-roadmap.md § 3

# 目标
- 跨页视觉对齐 admin（决策 #1 = A 时）：colorPrimary 在按钮/选中态/链接上一致
- E2E smoke：5 业务页全部能登录后正常加载
- console 全程 0 errors / 0 warnings
- 视觉 baseline：screenshots/student-*.png 重新生成存档

# 实施

## T1 全量 build + 类型检查
- pnpm --filter @osg/student build → exit 0
- pnpm --filter @osg/student test → exit 0

## T2 5 页 smoke + console 监听（用 Playwright MCP）
登录 student_demo / student123，依次访问：
- /positions
- /job-tracking
- /mock-practice
- /myclass
- /profile

每页：snapshot + 全页 screenshot，console_messages 检查 0 errors。

## T2.5 跑全套 student e2e
- `pnpm --filter @osg/student exec playwright test`
- 退出码必须 0
- 如果有选择器回归（DOM 变 AntD 后 CSS 类名改了），可以同步更新选择器，但**不能改行为断言**（调用哪个接口、期待打开哪个 dialog、期待看到哪个文本等业务语义）
- 选择器更新作为独立 commit：`test(student): align e2e selectors with antd dom changes`、不与业务改造 commit 混

## T3 视觉 baseline 更新
- 替换 screenshots/student-positions.png（旧）为 student-S7-positions.png
- 同样为其余 4 页生成 student-S7-{job-tracking,mock-practice,myclass,profile}.png
- git add 所有截图

## T4 色值零变动验证（决策 #1 = B 已落定）
- App.vue 注入的 colorPrimary 必须是 `#7399c6` 字面量（与 SCSS --primary 同值）
- `osg-frontend/packages/student/src/styles/global.scss` 应与改造前完全一致，`git diff -- osg-frontend/packages/student/src/styles/global.scss` 应输出为空
- 登录页背景渐变/按钮渐变/链接色全保持 `#7399c6` 灰蓝系
- AntD 组件高亮态应是灰蓝 #7399c6（来自 App.vue 注入的字面量），不应是 AntD 默认蓝 #1677ff，也不应是 admin 的 #6366F1 indigo

## T6 测试套件
- 跑 pnpm --filter @osg/student test → exit 0
- 任何 visual / unit 测试都不应回归

## T7 写 commit
建议 commit message：
  feat(student): migrate 5 business pages to ant-design-vue components

  - Replace handwritten form/select/tabs with AntD components on positions/applications/mock-practice/myclass/profile
  - Inject AntD theme colorPrimary as literal '#7399c6' (matches SCSS --primary; cannot use var() because AntD generate() needs hex)
  - Keep all SCSS color values unchanged (--primary stays #7399c6)
  - Add @mdi/font as proper dep, remove cross-pkg path hack
  - MainLayout logout now uses Modal.confirm with confirmation
  - Login page intentionally untouched per requirement

# 验收
1. pnpm --filter @osg/student build → exit 0
2. pnpm --filter @osg/student test → exit 0
3. 5 页 console 0 errors 0 warnings
4. screenshots/student-S7-*.png 5 张全部生成
5. git status 干净（无 untracked / unstaged）
6. 主指挥窗口确认决策 #1 选择对应的视觉表现已落地

# 完成后
最终报告回报主指挥窗口：
- 5 页 baseline 截图
- build + test 退出码
- git log 最后 N 个提交摘要（按每个 Story 一个或几个 commit）
- 任何遗留待办（如发现的副作用、不能改的地方）
````

---

## 5. 跨 Story 红线（任何 worker 都必须遵守）

### 5.1 不能动的代码

| 代码 | 理由 |
|---|---|
| `osg-frontend/packages/student/src/views/login/` | 用户明确不弄 |
| `osg-frontend/packages/student/src/views/forgot-password/` | 同登录线 |
| `osg-frontend/packages/student/src/navigation/access.ts` | 路径规范化逻辑 |
| `osg-frontend/packages/student/src/navigation/phase1.ts` | 白名单管控 |
| `osg-frontend/packages/student/src/router/` | 路由结构 |
| `osg-frontend/packages/shared/` 任何文件 | 跨端共用契约 |
| `osg-frontend/packages/admin/` 任何文件 | 参照系，不动 |
| 后端 / SQL / Java | 完全不动 |
| API 调用 / fetch 逻辑 | UI 改造范围外 |
| `e2e/` 行为断言 | **不能改**（调用哪个接口、期待打开哪个 dialog、期待看到哪个文本等业务语义） |
| `e2e/` 选择器 | **可跟随 DOM 变化更新**（如 `<input>` → `<a-input>` 后 CSS 选择器层级改变，可从 `.form-input` 改为 `.ant-input` 或优先用 ARIA role/`getByPlaceholder`）|

### 5.2 必须保持的行为

- **数据来源**：Profile 字段 / Applications 列表 / Positions 22 个岗位 / Mentor 名字 → 来自远程 DB，不能 mock
- **登录流程**：student_demo / student123 → /positions 跳转链路不变
- **路径**：`/positions` `/job-tracking` `/mock-practice` `/myclass` `/profile` 不变
- **侧边栏菜单顺序**：求职中心 → 学习中心 → （可能的简历中心 / 资源中心）→ 个人中心
- **PHASE1 白名单**：`PHASE1_VISIBLE_PATHS` 决定哪些菜单项可见，不能改这个 set

### 5.3 色值约束（决策 #1 = B 已落定）

**主色 token（不能改）**：
- `osg-frontend/packages/student/src/styles/global.scss` 全文件不动
- 任何 SCSS / Vue scoped style 里的 `var(--primary*)` 不要被具体颜色字面量替换
- AntD 主色通过 `App.vue` 注入字面量：`colorPrimary: '#7399c6'`（与 SCSS `--primary` 同值）
- **不用 `var(--primary)`**：AntD 派生色函数 generate() 不识别 CSS 变量
- 登录页背景渐变/按钮渐变/链接色全保持原样，与改造前一致
- 每个 Worker 任务完成后必须截一张登录页作为零变动证据

**装饰色（不是主色 token，可字面量）**：
- 业务装饰色允许字面量，比如：
  - S4 服务卡的蓝/黄/紫区分色 `#3b82f6` `#f59e0b` `#a855f7`（区分 3 种服务类型）
  - a-tag color="success"、a-badge `#52c41a` 等 AntD 标准语义色
- 这些是与 student 灰蓝主色无关的业务区分色
- **禁止**用 admin 的 `#6366F1` indigo 作为装饰色（容易与主色混淆，且 student 不该出现 admin 主色）
- `<style scoped>` 里新增颜色：主色相关必须 `var(--primary*)`，装饰色可字面量

---

## 6. 主指挥窗口的下一步

### 6.1 决策状态（已拍板，可启动）

| 决策 | 选定 | 强约束 |
|---|---|---|
| #1 主色 | ✅ B 保持灰蓝 | global.scss 全文件不动；AntD 通过 App.vue 注入 colorPrimary='#7399c6' 字面量（与 SCSS --primary 同值；不用 var() 因为 AntD 派生色断裂） |
| #2 sidebar | ✅ A 不改 | S1 只做 logout 一项 |
| #3 Positions 拆文件 | ✅ B 不拆 | 单文件内只换组件 |

**总原则**：色值不动 / 只换组件 / 不结构重构 / 登录页零变动

### 6.2 启动 Worker 流程

每次启动一个 Worker 窗口：
1. 主指挥窗口选定下一个 Story（按 § 1.5 推荐顺序）
2. 把 § 4.x 对应的【复制到新窗口】代码块**整段**复制
3. 在新会话粘贴，发送
4. Worker 窗口完成后回报 git diff + build/test 输出 + 截图
5. 主指挥窗口审查回报，确认后启动下一个 Worker

### 6.3 中断与恢复

- 如果某 Worker 卡住（连续失败 2 次），主指挥窗口要求其调 `when-stuck` skill 重新分流
- 如果某 Worker 改坏了文件，可以 `git restore` 回滚后重启
- 跨 Worker 状态记在本文档底部"进度"段（自添加）

### 6.4 进度跟踪（自维护）

| Story | 状态 | Worker 会话 | 完成时间 | 备注 |
|---|---|---|---|---|
| S0 | ⏳ 待启动 | — | — | 决策已拍板，可启 Worker |
| S1 | ⏳ 待 S0 完成 | — | — | 决策 #2=A，只做 logout |
| S2 | ⏳ 待 S1 完成 | — | — | 决策 #3=B，单文件内只换组件 |
| S3 | ⏳ 待 S1 完成 | — | — | — |
| S4 | ⏳ 待 S1 完成 | — | — | — |
| S5 | ⏳ 待 S1 完成 | — | — | — |
| S6 | ⏳ 待 S1 完成 | — | — | 建议先做（最简单） |
| S7 | ⏳ 待 S0-S6 完成 | — | — | 最后做 |

> 完成时把状态从 ⏳ 改 ✅，写下 Worker 会话识别码 + 完成时间 + 任何需要主指挥关注的 follow-up。

---

## 附录 A：术语表

- **AntD** = ant-design-vue 4.x（本仓库使用的 Vue 3 版本）
- **MDI** = `@mdi/font` Material Design Icons font（私用 Unicode 区域字符如 `󰑴` `󰨭`）
- **PHASE1** = student 端的功能开放阶段控制（哪些路由可见）
- **token** = AntD theme token / SCSS CSS variable（`--primary` 等），主题定制的最小单位
- **Worker 窗口** = 用本文档某个【复制到新窗口】代码块启动的新 Cascade 会话，专做单个 Story
- **主指挥窗口** = 维护本文档、不写代码、只调度 Worker 的 Cascade 会话（即当前会话）

## 附录 B：references

- `osg-frontend/packages/admin/src/App.vue` — admin 主题注入参照
- `osg-frontend/packages/admin/src/styles/global.scss` — design token 参照
- `osg-frontend/packages/admin/src/layouts/MainLayout.vue` — logout 范式参照
- `osg-frontend/packages/admin/src/views/login/index.vue` — AntD 化登录范式参照（**student 不用做这个**）
- `osg-frontend/packages/admin/src/views/career/positions/` — Positions 页拆分范式（决策 #3 = A 时参考）
