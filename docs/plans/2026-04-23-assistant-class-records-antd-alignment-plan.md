# 助教端 课程记录 页面 Ant Design 对齐改造计划

> **日期**: 2026-04-23
> **目标文件**: `osg-frontend/packages/assistant/src/views/class-records/index.vue`（当前 1067 行）
> **参考原型**: `osg-spec-docs/source/prototype/assistant.html` L1460-1648
> **参考 Admin**: `osg-frontend/packages/admin/src/views/teaching/class-records/index.vue`
> **测试文件**: `osg-frontend/packages/assistant/src/__tests__/class-records.spec.ts`（现为 mount 模式，需改 source string 匹配）
> **后端控制器**: `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgAssistantClassRecordController.java`
> **后端服务**: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java`（`selectAssistantClassRecordList` / `selectAssistantClassRecordStats` / `filterAssistantOwnedRows`）
> **参考计划**: `docs/plans/2026-04-22-assistant-student-list-antd-alignment-plan.md`
> **参考测试**: `osg-frontend/packages/assistant/src/__tests__/student-list.spec.ts`（source string 模式样板）

---

## 一、原型 vs 当前实现 差异总结

| # | 区域 | 原型设计 | 当前实现 | 偏差等级 |
|---|------|----------|----------|----------|
| 1 | 根元素 | — | `section#page-myclass.class-records-page` | 🟡 需改 `div.osg-page` + `id="page-myclass"`保留 |
| 2 | PageHeader | `课程记录 Class Records` + 描述 + 右侧「+ 上报课程记录」按钮 | 手写 `.page-header` + 「课程总览 / 只读查看 / 反馈摘要」双 pill | 🟡 需换 `<PageHeader>`；V1 不做「上报课程记录」（偏离 #1） |
| 3 | description 文案 | `查看和上报课程记录（包括我的申报和我管理的学员）` | `查看已分配课程记录、审核状态和反馈摘要，快速完成教学跟进与课程回顾。` | 🟡 需对齐为 `查看我管理学员的课程记录、审核状态和反馈摘要`（偏离 #1） |
| 4 | 流程 Banner | 原型无 | 有 `.flow-banner`（课程执行→记录提交→审核处理→反馈回看） | 🟢 原型增强，保留并改 `<a-alert>` |
| 5 | 统计卡片 | 原型无 | 4 卡：全部课程 / 待审核 / 已通过 / 待结算金额 | 🟢 原型增强，保留并改 `<a-card>` + `<a-statistic>` |
| 6 | 主 Tab「我的申报 / 我管理的学员」 | 原型有（primary 蓝激活） | **当前无** | 🔴 见偏离 #2：后端不支持区分，V1 **不实现** |
| 7 | 状态子 Tab | 原型有（全部/待审核/已通过/已驳回） | 改为 `<select>` 筛选 | 🟡 需改 `<a-tabs>` + badge 计数 |
| 8 | 筛选组件 | 原生 input/select + 重置按钮 | 原生 input/select + 应用筛选/重置按钮 | 🟡 需改 Ant Design |
| 9 | 筛选：搜索 | `搜索学员姓名/ID...` 180px | `搜索学员 / 学员` 宽占2列 | 🟡 需改 `<a-input>` + 原型文案 |
| 10 | 筛选：辅导类型 | `select`（岗位辅导/模拟应聘） | `select`（动态去重） | 🟡 需改 `<a-select>` + 固定选项 |
| 11 | 筛选：课程内容 | `select`（新简历/简历更新/Case准备/模拟面试/人际关系期中考试/模拟期中考试/Behavioral/Technical/其他） | **缺失**（只有「审核状态 / 申报角色 / 辅导类型」） | 🔴 需补充「课程内容」筛选 |
| 12 | 筛选：申报人角色 | `select`（导师/班主任/助教，仅 managed tab） | 有 `select`（动态去重） | 🟡 需改固定选项 |
| 13 | 筛选：时间范围 | `select`（本周/上周/本月） | **缺失** | 🟡 需改 `<a-range-picker>`（对齐 Admin，用日期范围；原型 select 语义弱） |
| 14 | 表格：记录ID 列 | `#R231780` 纯文本 | 「课程信息」列显示 `courseContent` + muted `recordCode` | 🔴 需拆分为独立「记录ID」列 |
| 15 | 表格：学员列 | bold 姓名 + muted `ID: 12766` | bold 姓名 + muted 导师 · 申报人 | 🔴 需拆分为独立「学员」列（显姓名+studentId） |
| 16 | 表格：申报人列 | bold 姓名 + muted 角色 | 与学员合并 | 🔴 需独立「申报人」列 |
| 17 | 表格：辅导内容列 | tag (info 蓝 / success 绿) + 下方 muted 公司/主题 | tag（info tone） | 🟡 需色值对齐（岗位辅导→blue / 模拟应聘→green）；副文本不显示（后端列表接口不返回 `coachingCompany`，见偏离 #8） |
| 18 | 表格：课程内容列 | colored tag（Case准备=#DBEAFE/#1D4ED8, 简历更新=#FEF3C7/#92400E, 新简历=info 蓝, 模拟期中=#F59E0B/#fff, 人际关系=purple, Behavioral/Technical=#DBEAFE） | **缺失** | 🔴 需新增此列 |
| 19 | 表格：上课日期列 | `MM/DD/YYYY` | `YYYY-MM-DD HH:mm` + muted 提交时间 | 🟡 改原型格式 `MM/DD/YYYY` |
| 20 | 表格：时长列 | `1h` / `2h` / `1.5h` | 同 `formatHours` | ✅ 已对齐 |
| 21 | 表格：课时费列 | `¥300` / `$40` | 有（merged 时长列 muted） | 🔴 需独立「课时费」列 |
| 22 | 表格：审核状态列 | tag warning/success/danger | tag 同色 | ✅ 基本一致，改 `<a-tag>` |
| 23 | 表格：学员评价列 | tag success `⭐ 4.8` / muted `-` / warning `待评价` | 合并到「状态」列（调用 `ratingSummary`） | 🔴 需独立「学员评价」列 |
| 24 | 表格：操作列 | `查看详情` 或 `查看原因`（rejected 行） | `查看详情` link 触发右侧 aside | 🟡 改 `<a-button type="link">` + 弹窗（详情 Modal） |
| 25 | 详情区域 | 原型用 modal（`modal-class-detail` / `modal-class-reject`） | 右侧 aside 固定面板 | 🟡 改 `<a-modal>` + `<a-descriptions>`（对齐 Admin 详情弹窗风格） |
| 26 | 分页 | **原型无分页** | **当前无分页**（一次加载全部） | 🟢 改 `<a-table>` 内置分页（client-side，10 条/页） |
| 27 | CSS | — | ~470 行手写 SCSS | 🟡 需精简（保留必要 tag 色值、Modal descriptions 样式） |
| 28 | 上报课程记录按钮 | 原型右上角有 | **当前无** | 🔴 V1 不实现（见偏离 #1），保持当前状态 |

---

## 二、改造任务清单

### Phase 1: 布局与组件壳

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| CR-1 | 根元素 `div.osg-page id="page-myclass"` + `<PageHeader title="课程记录" subtitle="Class Records" description="查看我管理学员的课程记录、审核状态和反馈摘要">`（description 沿用当前自定义文案，因 V1 不支持「我的申报」） | template L1-18 | 🔲 |
| CR-2 | import `PageHeader`, `SearchOutlined`, `ReloadOutlined`, `EyeOutlined` 图标 | script imports | 🔲 |
| CR-3 | 流程 Banner 改 `<a-alert type="info" show-icon>` + `<a-space wrap>` + `<a-tag>` × N；`flowSteps` 优先取 `stats.value?.flowSteps`（后端 `selectAssistantClassRecordStats` @L273-279 返回 **5 步**：学员申请岗位/模拟应聘→班主任分配导师→导师上课并申报记录→后台审核→结算中心转账，对齐 Admin 全链路）；失败时 fallback 到 4 步 `['课程执行', '记录提交', '审核处理', '反馈回看']`（保持当前降级行为） | template flow-banner | 🔲 |

### Phase 2: 统计卡片

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| CR-4 | 4 卡改 `<div class="stats-row"><a-card :bordered="false" style="flex:1">...` + `<a-statistic :title :value :value-style>`，对应现有 4 项：全部课程 / 待审核 / 已通过 / 待结算金额 | template summary-grid | 🔲 |
| CR-5 | 颜色 Map：全部课程=`#1E293B`，待审核=`#F59E0B`，已通过=`#22C55E`，待结算金额=`#1D4ED8`（沿用现有色值） | script valueStyleMap | 🔲 |

### Phase 3: 筛选卡片

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| CR-6 | 筛选改 `<a-card :bordered="false">` + `<a-form layout="inline">`，5 项筛选按原型顺序：搜索 / 辅导类型 / 课程内容 / 申报人 / 时间范围 | template toolbar | 🔲 |
| CR-7 | 搜索框：`<a-input id="assistant-class-records-keyword" placeholder="搜索学员姓名/ID" allow-clear style="width: 180px">` + `<SearchOutlined>` 前缀 + `@press-enter="handleSearch"`（180px 对齐原型 L1473 + Admin L40）。**后端契约说明**：`OsgClassRecordMapper.xml` L117-122 `keyword` 仅 `mentor_name` / `student_name` LIKE 匹配，**学员 ID 数字搜索暂不生效**；placeholder 保留原型文案，待后端补字段（如 `student_id` / `record_id` LIKE）后自然启用（见偏离 #9） | template | 🔲 |
| CR-8 | 辅导类型 select（固定选项）：`岗位辅导→position_coaching` / `模拟应聘→mock_application` | template + script coachingTypeOptions | 🔲 |
| CR-9 | 课程内容 select（固定选项 7 项，**对齐 Admin L50-56**）：新简历→new_resume / 简历更新→resume_update / Case准备→case_prep / 模拟面试→mock_interview / 人际关系期中考试→communication_midterm / 模拟期中考试→midterm_exam / 其他→other（**删除 Behavioral/Technical**，原型 mine tab L1475 有但 managed tab L1544 无，Admin 也无，见偏离 #6） | template + script courseContentOptions | 🔲 |
| CR-10 | 申报人 select（固定选项 3 项）：导师→mentor / 班主任→headteacher / 助教→assistant | template + script reporterRoleOptions | 🔲 |
| CR-11 | 时间范围 `<a-range-picker v-model:value="filters.classDateRange" value-format="YYYY-MM-DD" style="width: 240px">`（对齐 Admin 日期范围选择器；原型 select 语义弱，改日期范围更实用） | template | 🔲 |
| CR-12 | 筛选按钮：`<a-button id="assistant-class-records-search" type="primary" @click="handleSearch"><SearchOutlined /> 搜索</a-button>` + `<a-button id="assistant-class-records-reset" type="text" @click="resetFilters"><ReloadOutlined /> 重置</a-button> `（原型按钮文案: 重置；对齐 Admin 加「搜索」） | template | 🔲 |

### Phase 4: 状态子 Tabs

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| CR-13 | 状态 Tab 改 `<a-tabs v-model:activeKey="activeTab" @change="switchTab">` + 4 `<a-tab-pane>`：all（全部） / pending（待审核 + badge）/ approved（已通过）/ rejected（已驳回） | template + script activeTab | 🔲 |
| CR-14 | Badge 用 `<a-badge :count="stats.pendingCount" :number-style="{ backgroundColor: '#F59E0B' }">`；切换 tab 时调用 `loadData()` 重新请求 | script switchTab | 🔲 |

### Phase 5: 表格

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| CR-15 | `<a-table :columns :data-source :pagination :loading :row-key :scroll="{ x: 1200 }" :locale="{ emptyText: '暂无课程记录' }" :row-class-name="(r) => normalizeStatus(r.status) === 'pending' ? 'row-pending' : ''" @change="handleTableChange">` | template | 🔲 |
| CR-16 | columns 定义（**11 列**；原型 managed tab 10 列无课时费，V1 加课时费对齐数据完整性；操作列 `fixed: 'right'`）：记录ID / 学员 / 申报人 / 辅导内容 / 课程内容 / 上课日期 / 时长 / 课时费 / 审核状态 / 学员评价 / 操作（详见第七章最终列结构） | script columns | 🔲 |
| CR-17 | 记录ID 列 bodyCell：`<a-tag color="blue">{{ record.recordCode \|\| '#R' + record.recordId }}</a-tag>` | template bodyCell | 🔲 |
| CR-18 | 学员列 bodyCell：`<strong>{{ record.studentName }}</strong>` + `<span class="muted-id">ID: {{ record.studentId }}</span>` | template bodyCell | 🔲 |
| CR-19 | 申报人列 bodyCell：`<strong>{{ record.mentorName }}</strong>` + `<span class="muted-id">{{ reporterRoleLabel(record.reporterRole) }}</span>`；mentorName 空时显 `-` | template bodyCell | 🔲 |
| CR-20 | 辅导内容列 bodyCell：`<a-tag :color="coachingTypeTagColor(record.coachingType)">{{ record.coachingType }}</a-tag>`；**不显副文本**（后端 `toClassRecordPayload` @L673-694 不返回 `coachingCompany`；原型 L1486 '公司·岗位' 数据来自 `osg_student_position` 联表，仅在详情 API `toPayload` @L662-669 返回；Assistant V1 不调详情 API）；见偏离 #8；`coachingType` 后端已 label 化为中文（@L682），tag 文本直接绑 `record.coachingType` | template bodyCell | 🔲 |
| CR-21 | 课程内容列 bodyCell：`<a-tag :color="courseContentTagColor(record.courseContent)" :style="courseContentTagStyle(record.courseContent)">{{ record.courseContent }}</a-tag>`；**后端已返回中文 label**（`courseContent` 字段 = `toCourseContentLabel(row.getClassStatus())` 转换结果，@L684），前端无需再做 label 化；tag 文本直接显示 `{{ record.courseContent }}`；**色值函数接收中文 label 作为输入**：（1）Ant 预设 `color="blue"/"green"`：「新简历」/「模拟面试」（`courseContentTagColor` 返回值时 `courseContentTagStyle` **必返 `undefined`**）；（2）inline `:style`：「Case准备」/「简历更新」/「人际关系期中考试」/「模拟期中考试」（`courseContentTagStyle` 返回值时 `courseContentTagColor` **必返 `undefined`**）；**两函数互斥约束**（同一 label 最多一个返回值，避免 Ant Design 预设色覆盖 inline style）；其他/默认：两函数均返回 `undefined`，渲染为 default tag。详见第 3.4 节 | template bodyCell | 🔲 |
| CR-22 | 上课日期列 bodyCell：`{{ formatClassDate(record.classDate) }}`（新增 `formatClassDate` 函数，输出 `MM/DD/YYYY`） | template + script | 🔲 |
| CR-23 | 时长列 bodyCell：`{{ formatHours(record.durationHours) }}` | template | 🔲 |
| CR-24 | 课时费列 bodyCell：`{{ formatFee(record.courseFee) }}` | template | 🔲 |
| CR-25 | 审核状态列 bodyCell：`<a-tag :color="statusTagColor(record.status)">{{ statusLabel(record.status) }}</a-tag>` | template | 🔲 |
| CR-26 | 学员评价列 bodyCell：`<a-tag v-if="record.studentRating" color="green">⭐ {{ record.studentRating }}</a-tag>` + `<span v-else class="muted-id">-</span>` | template | 🔲 |
| CR-27 | 操作列 bodyCell：`<a-button type="link" size="small" @click="openDetail(record)">{{ normalizeStatus(record.status) === 'rejected' ? '查看原因' : '查看详情' }}</a-button>` | template | 🔲 |

### Phase 6: 详情弹窗

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| CR-28 | 右侧 aside 改 `<a-modal v-model:open="detailVisible" title="课程详情" :width="720" :footer="null">`；内容用 `<a-descriptions :column="2" bordered>`（**9 字段**：课程内容 / 辅导类型 / 学员 / 申报人 / 申报角色 / 审核状态 / 上课时间 / 时长 / 课时费）+ 3 段 `.detail-panel` 块（学员评价 / 课程反馈 / 反馈摘要）；**⚠️ `feedbackContent` 后端未返回**（`toClassRecordPayload` @L673-694 只返回 `reviewRemark` + `submittedAt`），课程反馈段显 fallback「暂无课程反馈」；rejected 时「反馈摘要」改为「驳回原因」展示 `reviewRemark`，见偏离 #7 | template + script detailVisible/selectedRecord | 🔲 |
| CR-29 | 新增 `openDetail(record)` 函数：设 `selectedRecord.value = record`, `detailVisible.value = true` | script | 🔲 |

### Phase 7: Script 适配

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| CR-30 | 新增 `pagination = reactive({ current: 1, pageSize: 10 })` + `tablePagination` 计算属性（`showSizeChanger: false`, `showTotal: (t) => \`共 \${t} 条记录\``） | script | 🔲 |
| CR-31 | 新增 `handleTableChange(config)` — 更新 pagination.current / pageSize，不重新请求（client-side 分页） | script | 🔲 |
| CR-32 | 改 `loadRecords()` 入参：传 `{ keyword, courseType, classStatus, courseSource, tab, classDateStart, classDateEnd }`（对齐后端参数名；**注意**：筛选时传 `classStatus=raw_key`（如 `case_prep`），后端 `normalizeClassStatusFilter` 转换后查询；返回时字段变为中文 label（`record.courseContent`）— 前后不对称是因后端 `toClassRecordPayload` 主动 label 化） | script | 🔲 |
| CR-33 | 新增 `activeTab` ref（默认 `'all'`）+ `switchTab(key)` 函数（change → loadData） | script | 🔲 |
| CR-34 | `toFilters()` 工具函数 — 聚合 filters → API params；`classDateRange` 空值防御：`const range = filters.classDateRange \|\| []; const classDateStart = range[0] \|\| undefined; const classDateEnd = range[1] \|\| undefined`（range-picker 未选值时 v-model 可能为 `null`/`[]`，直接解构会报错） | script | 🔲 |
| CR-35 | 保留现有函数：`normalizeStatus`, `statusLabel`, `reporterRoleLabel`, `coachingTypeLabel`, `formatHours`, `formatFee`, `ratingSummary`, `feedbackSummary`；新增 `formatClassDate`（MM/DD/YYYY）、`coachingTypeTagColor`, `courseContentTagColor`, `courseContentTagStyle`, `statusTagColor`；**重要**：后端 `toClassRecordPayload` (@L673-694) 已将 `coachingType`/`courseContent`/`reporterRole` 字段 label 化为中文，新增函数输入参数均为**中文 label**（不是 raw key）；**不新增 `courseContentLabel`**（后端已 label 化，tag 文本直接绑 `record.courseContent`）；现有 `coachingTypeLabel`/`reporterRoleLabel` 函数内部 `includes('岗位'/'导师'/'助教'/...)` 逻辑兼容中文输入，保留不改 | script | 🔲 |
| CR-36 | localStorage 持久化（新增，对齐 student-list）：`assistant-class-records-state` 存 filters + pagination.current + activeTab；mount 时 `applyPersistedState`；**调用时机**：`handleSearch` / `resetFilters` / `switchTab` / `handleTableChange`（分页切换）后均调 `persistState`（确保分页页码和 activeTab 持久化，匹配增强项 #3 承诺） | script | 🔲 |
| CR-37 | 删除 `selectedRecordId` 逻辑（改用 `selectedRecord` ref） | script | 🔲 |

### Phase 8: 样式清理

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| CR-38 | 删除手写 CSS（~400 行）：`.page-header`, `.flow-banner`, `.summary-*`, `.toolbar-*`, `.form-input`, `.form-select`, `.primary-button`, `.ghost-button`, `.state-card`, `.content-grid`, `.panel-card*`, `.data-table`, `.table-tag*`, `.detail-*` | style | 🔲 |
| CR-39 | 保留 / 新增必要样式：`.row-pending { background: #fff7ed; }`, `.muted-id { font-size: 12px; color: #64748b; }`, `.muted-sub { font-size: 12px; color: #64748b; margin-top: 2px; }`, `.stats-row { display: flex; gap: 12px; }`, `.detail-panel { padding: 16px; background: #f8fafc; border-radius: 12px; ... }`, `.flow-tag--purple { color: #7c3aed; background: #f5f3ff; border-color: #ddd6fe; }` | style | 🔲 |
| CR-40 | 响应式依赖 `<a-table :scroll>`，删所有 `@media` 规则 | style | 🔲 |

### Phase 9: 测试 + 验证

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| CR-41 | 重写 `class-records.spec.ts` 为 source string 匹配模式（参考 `student-list.spec.ts` 样板），断言：PageHeader + title/subtitle/description、import 图标、所有 `<a-card>/<a-table>/<a-tag>/<a-input>/<a-select>/<a-button>/<a-alert>/<a-range-picker>/<a-tabs>/<a-modal>/<a-descriptions>/<a-statistic>/<a-badge>` 存在、11 个 `key:` 列名、11 个列标题、statusTabs 4 个 key（all/pending/approved/rejected）、`showTotal`、`scroll="{ x: 1200 }"`、`emptyText: '暂无课程记录'`、**错误 alert 精确文案**（`'课程记录加载失败'`）、**localStorage 3 项**（`assistant-class-records-state` + `applyPersistedState` + `persistState`）、不包含 `<table class=`、不包含「上报课程记录」/「提交记录」 | test | 🔲 |
| CR-42 | `pnpm --filter @osg/assistant vue-tsc --noEmit` 零错误 | — | 🔲 |
| CR-43 | `pnpm --filter @osg/assistant vitest run src/__tests__/class-records.spec.ts` 通过 | — | 🔲 |
| CR-44 | MCP 浏览器真实接口验证（`/run-frontend-dev assistant` → `http://localhost:3004/class-records`）：登录后截图、snapshot、控制台无 console error、真实后端返回数据 | — | 🔲 |

---

## 三、原型关键设计参考

### 3.1 Page Header 区（原型 L1462）

```
课程记录 Class Records
查看和上报课程记录（包括我的申报和我管理的学员）                  [+ 上报课程记录]
```

V1 对齐：去掉右侧按钮（偏离 #1），description 改为 `查看我管理学员的课程记录、审核状态和反馈摘要`（偏离 #1）。

### 3.2 筛选区域（原型 L1472-1477, mine tab）

```
[搜索学员姓名/ID... 180px] [辅导类型▼] [课程内容▼] [时间范围▼] [↻ 重置]
```

managed tab 多一个 `[申报人▼]`。V1 合并为单一筛选条（5 项，因不分 tab）：

```
[搜索 180px] [辅导类型▼] [课程内容▼] [申报人▼] [时间范围 range-picker] [🔍 搜索] [↻ 重置]
```

### 3.3 状态 Tabs（原型 L1470, 1538）

```
[全部] [待审核 ⓷1] [已通过] [已驳回]
```

### 3.4 表格列色值（原型 L1481-1532, mine tab）

#### 辅导内容 tag（`record.coachingType`，**中文 label**）

**说明**：后端 `toClassRecordPayload` (@L682) 将 `row.getCourseType()` 通过 `toCoachingTypeLabel()` 转为中文 label 返回；前端 `coachingTypeTagColor` 函数接收**中文 label** 作为输入；tag 文本直接绑 `record.coachingType`。

- `'岗位辅导'`: `<a-tag color="blue">`（后端 raw key: 非 `mock_practice` 的所有值，包括 `position_coaching` / `job_coaching`；对应原型 `class="tag info"`）
- `'模拟应聘'`: `<a-tag color="green">`（后端 raw key: `mock_practice`，前端筛选传 `mock_application` 经 `normalizeCourseTypeFilter` 转换；对应原型 `class="tag success"`）
- 其他 / 未知中文 label / `coachingType` 空：函数返回 `undefined`，渲染为 default tag

#### 课程内容 tag（`record.courseContent`，**中文 label**）

**说明**：后端 `toClassRecordPayload` (@L684) 将 `row.getClassStatus()` 通过 `toCourseContentLabel()` 转为中文 label 返回。前端 `courseContentTagColor` / `courseContentTagStyle` 函数接收**中文 label** 作为输入；tag 文本直接绑 `record.courseContent`（无 `courseContentLabel` 函数）。

**预设色档**（`courseContentTagColor` 返回 Ant 预设值）：
- `'新简历'`: `<a-tag color="blue">`（后端 raw key: `resume_revision`，源自前端 `new_resume` → `normalizeClassStatusFilter` 转换）
- `'模拟面试'`: `<a-tag color="green">`（后端 raw key: `mock_interview`）

**inline style 档**（`courseContentTagStyle` 返回精确色值对象，因原型色值不在 Ant 预设中）：
- `'Case准备'`: `{ background: '#DBEAFE', color: '#1D4ED8' }`（原型 L1487，raw key: `case_prep`）
- `'简历更新'`: `{ background: '#FEF3C7', color: '#92400E' }`（原型 L1499，raw key: `resume_update`）
- `'人际关系期中考试'`: `{ background: '#EDE9FE', color: '#5B21B6' }`（原型 L1580 `class="tag purple"`，raw key: `networking_midterm`）
- `'模拟期中考试'`: `{ background: '#F59E0B', color: '#fff' }`（原型 L1511，raw key: `mock_midterm`）

**default 档**：其他 / 未知中文 label / `courseContent` 空：两函数均返回 `undefined`，`<a-tag>` 不加 color/style

**注**：原型 mine tab L1475 有 Behavioral/Technical 选项 + 色值 `background: #DBEAFE; color: #1D4ED8`（原型 L1523 / 1616），但 managed tab L1544 无 + Admin 无 + 后端 `normalizeClassStatusFilter` 无对应 switch → V1 不实现（见偏离 #6）；若后端数据库存在 `behavioral`/`technical` raw key，后端 `toCourseContentLabel` 返回的中文 label 对应值待查

#### 审核状态 tag（`record.status`）
- 待审核（`pending`）: `<a-tag color="orange">`
- 已通过（`approved`）: `<a-tag color="green">`
- 已驳回（`rejected`）: `<a-tag color="red">`

#### 学员评价（`record.studentRating`）
- 非空：`<a-tag color="green">⭐ {{ value }}</a-tag>`
- 空：`<span style="color: #9ca3af">-</span>`
- 原型额外有 `待评价 warning` 语义，当前后端未返回该字段，V1 不实现（偏离 #3）

### 3.5 操作列（原型 L1493, 1529）

- 默认：`查看详情` → openDetail 弹窗
- rejected 状态：`查看原因` → 同 openDetail 弹窗（弹窗内展示 `reviewRemark` 作为驳回原因）

### 3.6 Page Header（原型无分页说明）

原型未展示分页组件；当前实现也未分页（一次加载全部）。V1 对齐 Admin 风格加客户端分页（10 条/页，`<a-table>` 内置）。

---

## 四、Admin 框架参考点

| 组件 | Admin 用法 | Assistant 对齐方式 |
|------|-----------|-------------------|
| PageHeader | `<PageHeader title="课程记录" subtitle="Class Records" description="...">` + `<template #actions>` 导出按钮 | **相同**（无 actions slot，V1 不做导出/上报） |
| 流程 Alert | `<a-alert type="info" show-icon>` + `<a-space wrap>` + `<a-tag>` × 5 | **相同**（Assistant 直接用后端 `stats.flowSteps` 5 步，与 Admin 共用同一套全链路描述） |
| 统计卡片 | 5 卡 `<a-card>` + `<a-statistic>`（总记录数/待审核/已通过/已驳回/待结算金额） | **4 卡**（沿用现有：全部课程/待审核/已通过/待结算金额） |
| 筛选表单 | `<a-form layout="inline">` + `<a-input allow-clear>` + `<a-select>` × N + `<a-button>` | **相同**（5 项筛选 + 2 按钮） |
| 状态 Tabs | `<a-tabs>` + `<a-tab-pane>` + `<a-badge>` | **相同** |
| 表格 | `<a-table :columns :data-source :pagination :row-key :scroll :row-class-name :loading>` + `#bodyCell` slot | **相同** |
| 记录ID 列 | `{{ record.recordCode \|\| '#R' + record.recordId }}` 纯文本 | 改 `<a-tag color="blue">` 包裹（对齐 student-list 风格） |
| 学员列 | `<div><strong>{{ studentName }}</strong><span>ID: {{ studentId }}</span></div>` | **相同** |
| 申报人列 | `<div><strong>{{ mentorName }}</strong><span>{{ reporterRole }}</span></div>` | **相同**（`reporterRole` 用 `reporterRoleLabel` 转中文） |
| 辅导内容列 | `<a-tag>` 仅 `coachingType` + muted 副文本 `coachingCompany`（但 Admin list 接口 `toClassRecordPayload` 也不返回此字段，Admin 模板 `v-if` 兜底不渲染） | **仅 tag，不显副文本**（后端列表接口不返回 `coachingCompany`，Assistant V1 不调详情 API— 见偏离 #8） |
| 课程内容列 | `<a-tag :color="contentTagColor(record.courseContentKey)">` | **相同**（按 3.4 色值 Map） |
| 审核状态列 | `<a-tag :color="statusTagColor(...)">` | **相同** |
| 学员评价列 | `<a-tag v-if color="green">⭐ ...</a-tag>` | **相同** |
| 操作列 | 审核 / 详情 按钮 | **简化**（V1 只读：仅 `查看详情` / `查看原因`） |
| 详情弹窗 | `ClassRecordDetailModal` 独立组件 + `getReportDetail` API | **内联** `<a-modal>` + `<a-descriptions>`（不调详情 API，直接用 list 行数据；V1 数据已足够） |
| 分页 | `usePagination` composable（服务端分页） | **客户端分页**（后端 `selectAssistantClassRecordList` 返回全量，无服务端分页） |
| 导出 | `exportClassRecords` | **不实现**（V1 助教端只读，无导出需求） |

---

## 五、不改动项

- API 调用函数 `getAssistantClassRecordList` / `getAssistantClassRecordStats` 不变
- API 路径 `/assistant/class-records/list` / `/stats` 不变
- 路由配置 `{ path: 'class-records', name: 'ClassRecords' }` 不变
- 后端 `OsgAssistantClassRecordController.java` + `OsgClassRecordServiceImpl.java` 不变
- 数据模型 `AssistantClassRecordRow` / `AssistantClassRecordStats` 不变
- 业务语义保持：
  - 后端 `filterAssistantOwnedRows` 只返回「assistant = 当前用户」的学员课程记录
  - 不做客户端 mock，全量真实接口数据
- 测试账号、URL 保持：`test_asst@osg.local` / `Osg@2026` 登录 `http://localhost:3004`

---

## 六、原型偏离说明

### 偏离 #1: 「上报课程记录」按钮 + description 文案

**原型设计**: 右上角「+ 上报课程记录」按钮，description `查看和上报课程记录（包括我的申报和我管理的学员）`

**实际情况**:
- V1 助教端范围定义（memory `2c14519e`）: `教学中心：课程记录` — 属于只读查看
- 后端 `createAssistantClassRecord` 需要 `student.assistantId = currentUser` 的学员，但前端「我的申报」tab 在 V1 不实现
- 当前测试断言 `wrapper.text()).not.toContain('上报课程记录')` 明确排除

**处理**:
- 不实现上报按钮
- description 改为 `查看我管理学员的课程记录、审核状态和反馈摘要`（去掉「和上报」，去掉「我的申报和」）
- 保留 description 文案精确校验的测试断言

### 偏离 #2: 「我的申报 / 我管理的学员」主 Tabs 不实现

**原型设计**: 双主 Tab 切换数据视图（我的申报=assistant 自己报的 / 我管理的学员=assistant 管的学员课程）

**实际情况**:
- 后端 `selectAssistantClassRecordList()` 内部强制 `filterAssistantOwnedRows(rows, assistantUserId)`，按 `student.assistantId == currentUser` 过滤 → 返回的全部是「我管理的学员」
- 后端无字段区分「reporter 是否 = 当前 assistant」；即使切 tab 也给不出「我的申报」数据
- V1 assistant 不承担上报职责，「我的申报」天然为空

**处理**:
- 不实现主 Tabs，直接展示「我管理的学员课程记录」
- 在流程 Alert 或副标题中说明："以下为您管理的学员（导师/班主任提交）的课程记录"
- TODO 注释保留，后端支持 reporter 过滤后再补
- 不破坏现有行为（当前实现也是平铺）

### 偏离 #3: 「待评价」学员评价状态不实现

**原型设计**: `studentRating` 空时，managed tab 显示 `<span class="tag warning">待评价</span>`

**实际情况**: 后端返回的 `studentRating` 只有「有值 / 空」两种状态，不区分「空=未评 / 空=本课无需评」，语义不足

**处理**: 空值统一显 `-`（参考 Admin）；后续后端补字段（如 `needRating: boolean`）后再区分

### 偏离 #4: 时间范围筛选改日期范围选择器

**原型设计**: `<select>` 本周/上周/本月

**实际情况**: 后端接收 `classDateStart` / `classDateEnd` 两个日期参数，与 select 的相对时间不直接对应；Admin 端用 `<a-date-picker>` × 2 实现

**处理**:
- 改 `<a-range-picker value-format="YYYY-MM-DD">`，对齐 Admin 且后端原生支持
- 不维护「本周/上周/本月」快捷选项（如需要可后续加 `:ranges` prop）

### 偏离 #5: 申报人 select「人名 → 角色类型」

**原型设计**: managed tab L1542 申报人 select 选项为**具体人名** `Jerry Li / Mike Chen / Test Lead Mentor`

**实际情况**:
- 后端 `OsgClassRecordServiceImpl.normalizeCourseSourceFilter` (L832-844) 仅接收**角色类型**（mentor/clerk/assistant），无按 reporter ID 过滤接口
- Admin `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/teaching/class-records/index.vue:60-65` 也改为角色类型（导师/班主任/助教）
- 按具体人名过滤需后端新增 `reporterId` 参数并联表查询

**处理**: V1 用角色类型 select（导师→mentor / 班主任→headteacher / 助教→assistant），对齐 Admin；原型人名筛选等后端支持再加（TODO 注释标注）

### 偏离 #6: 课程内容选项删除 Behavioral/Technical

**原型设计**: mine tab L1475 课程内容 select 含 9 项（末两项 Behavioral / Technical）

**实际情况**:
- 原型 managed tab L1544 课程内容 select 仅 7 项（**不含** Behavioral/Technical），原型自相矛盾
- Admin L50-56 也是 7 项（无 Behavioral/Technical）
- 后端 `normalizeClassStatusFilter` 的 switch 未定义 behavioral/technical 映射 → 走 default 原样传递；数据库 `class_status` 字段字典值是否含这两个值未确认

**处理**: V1 对齐 Admin / managed tab 的 7 项；Behavioral/Technical 的色值仍保留在 3.4 节色值 Map 中备用（便于后端数据存在此值时仍能正确渲染），仅不开放 select 选项

### 偏离 #7: rejected 行独立 modal 合并为单一 Modal

**原型设计**: 原型 L1493 非 rejected 行 `onclick="openModal('modal-class-detail')"`；L1529 / L1621 rejected 行 `onclick="openModal('modal-class-reject')"`（独立驳回弹窗）

**实际情况**:
- Admin 也是单一 detail modal（非 rejected 走 detail，rejected 走 review modal 但 review modal 是管理员操作）
- 助教端只读，无需独立的 reject modal（不做驳回操作）
- V1 单一 Modal 通过 `reviewRemark` 字段展示驳回原因已足够

**处理**: V1 用单一 `<a-modal>`；按钮文案按 status 切换（rejected 显「查看原因」/ 其他显「查看详情」）；Modal 内 rejected 时「反馈摘要」段改显「驳回原因 (`reviewRemark`)」

### 偏离 #8: 辅导内容列副文本不显示

**原型设计**: mine tab L1486 岗位辅导行显 '公司·岗位'（如 'Goldman Sachs · IB Analyst'）；L1510 模拟应聘行显 '模拟类型'（如 '模拟期中考试'）；managed tab L1555 完全相同。

**实际情况**:
- 后端列表接口 `selectAssistantClassRecordList` 走 `toClassRecordPayload` @L673-694，**不返回 `coachingCompany`**
- `coachingCompany` 仅在详情接口 `toPayload` @L662-669 返回（通过 `osg_student_position` 联表获取 companyName）
- Admin list 列 `index.vue:119` 引用 `record.coachingCompany`，但实际为 `undefined` → `v-if` 守卫导致不渲染（“留个坑」语义，后端补字段后再充）
- 模拟应聘行的 '模拟类型' 实际等同于 `courseContent`，与列 5「课程内容」重复

**处理**: V1 **不显副文本**，`<a-tag>` 单行展示 `record.coachingType`；后端列表接口补充 `coachingCompany`/`positionTitle` 后可恢复副文本（仅对岗位辅导行）

### 偏离 #9: 搜索 placeholder 与后端契约不符（保留原型文案）

**原型设计**: L1473 `placeholder="搜索学员姓名/ID..."`，暗示支持按学员 ID 数字搜索

**实际情况**:
- 后端 `OsgClassRecordMapper.xml` L117-122 `keyword` SQL 仅按 `mentor_name` / `student_name` LIKE `'%kw%'` 模糊匹配
- **不匹配** `student_id` / `mentor_id` / `record_id` / `class_id (recordCode)`
- Admin 端同样 placeholder 对齐原型，同样受此契约限制，为历史既存问题

**处理**: V1 placeholder 保留原型文案（对齐 Admin + 原型），但**学员 ID 数字搜索不生效**；待后端 mapper SQL 补字段匹配（如 `OR student_id LIKE #{keyword}`）后自然启用；测试不断言 ID 搜索有效性

### 原型增强项（保留）

| # | 增强项 | 理由 |
|---|--------|------|
| 1 | 统计卡片 4 个（全部课程 / 待审核 / 已通过 / 待结算金额） | 助教端需关注课程结算总量，对齐 Admin 风格 |
| 2 | 流程 Banner（5 步优先，4 步 fallback） | 5 步来自后端 `stats.flowSteps`（与 Admin 共用同一套全链路描述）；stats 加载失败时 fallback 到 4 步 `['课程执行', '记录提交', '审核处理', '反馈回看']` 保证降级可用 |
| 3 | localStorage 持久化筛选 + 分页 + activeTab | 对齐 student-list 风格，提升用户体验 |
| 4 | 客户端分页（10 条/页） | 原型一次展示 4-6 条适合 demo；生产环境学员多，分页必要 |
| 5 | 详情 Modal（而非 aside） | 原型是 modal，当前是 aside → 对齐原型改 Modal 风格 |
| 6 | 记录ID 用 `<a-tag color="blue">` 包裹 | 对齐 student-list / Admin 风格 |
| 7 | 课时费列（列 8） | 原型 managed tab 无此列，mine tab 有；V1 加此列对齐 Admin / 数据完整性 |

---

## 七、最终列结构（11 列）

| # | 列名 | dataIndex / key | 来源 | 渲染 | 列宽 (px) | 备注 |
|---|------|-----------------|------|------|-----------|------|
| 1 | 记录ID | recordId | 后端 `recordId` / `recordCode` | `<a-tag color="blue">#{{ record.recordCode \|\| 'R' + record.recordId }}</a-tag>` | 90 | 原型是纯文本，**增强**用 Tag 风格 |
| 2 | 学员 | studentName | 后端 `studentName` / `studentId` | `<strong>{{ studentName }}</strong>` + `.muted-id "ID: {{ studentId }}"` | 120 | 对齐原型 |
| 3 | 申报人 | mentorName | 后端 `mentorName` / `reporterRole` | `<strong>{{ mentorName \|\| '-' }}</strong>` + `.muted-id "{{ reporterRoleLabel }}"` | 120 | 对齐原型 managed tab |
| 4 | 辅导内容 | coachingType | 后端 `coachingType`（**中文 label**） | `<a-tag :color>{{ record.coachingType }}</a-tag>` | 150 | tag 色按 3.4（输入中文 label）；**不显副文本**，见偏离 #8 |
| 5 | 课程内容 | courseContent | 后端 `courseContent`（**中文 label**） | `<a-tag :color :style>{{ record.courseContent }}</a-tag>` | 120 | **新增列**；色按 3.4 Map（输入中文 label）；后端 `toClassRecordPayload` @L684 已 label 化 |
| 6 | 上课日期 | classDate | 后端 `classDate` | `{{ formatClassDate(classDate) }}` (MM/DD/YYYY) | 100 | 原型格式 |
| 7 | 时长 | durationHours | 后端 `durationHours` | `{{ formatHours(durationHours) }}` | 70 | 已对齐 |
| 8 | 课时费 | courseFee | 后端 `courseFee` | `{{ formatFee(courseFee) }}` | 80 | **新增列**；原型 mine tab 有（增强项 #7） |
| 9 | 审核状态 | status | 后端 `status` | `<a-tag :color>` | 100 | 按 3.4 色值 |
| 10 | 学员评价 | studentRating | 后端 `studentRating` | `<a-tag color="green">⭐ {{ value }}</a-tag>` / `-` | 100 | **新增列** |
| 11 | 操作 | action | — | `<a-button type="link">{{ status === 'rejected' ? '查看原因' : '查看详情' }}</a-button>` | 90 | `fixed: 'right'`；对齐原型 |

**列宽合计**：90 + 120 + 120 + 150 + 120 + 100 + 70 + 80 + 100 + 100 + 90 = **1140 px**

**scroll 配置**：`:scroll="{ x: 1200 }"`（1200 > 1140，留 60px 余量；< 1200px 视口时触发横向滚动）

---

## 八、检查清单

Phase 3 实施前必过：
- [ ] `@osg/shared/api` 中 `AssistantClassRecordFilters` / `AssistantClassRecordRow` 接口字段与后端一致
- [ ] 后端 `/assistant/class-records/list` 真实联调返回非空数据（用 test_asst 账号登录 `test_asst@osg.local`）
- [ ] 后端 `/assistant/class-records/stats` 返回 4 个统计字段 + flowSteps
- [ ] Admin 端 `class-records` 页面已跑通（作为 UI 基线参考）
- [ ] 新测试文件 `class-records.spec.ts` 用 source string 匹配，不用 mount
- [x] **CR-20 副文本字段确认**：已核实后端 `toClassRecordPayload` @L673-694 不返回 `coachingCompany`（`coachingCompany` 仅在 `toPayload` @L662-669 详情接口返回）→ V1 方案明确**不显副文本**，见偏离 #8

Phase 4 完成标志：
- [ ] 浏览器 `/class-records` 页面无 console error
- [ ] Network 面板 `/list` + `/stats` 返回 200
- [ ] 表格渲染真实行，statsCards 显示真实数值
- [ ] 筛选 / 状态 Tab / 分页 / 详情 Modal 交互正常
- [ ] 截图归档 `e2e-review/assistant/class-records.png`
