# 助教端 Mock Practice 页面 Ant Design 对齐改造计划

> **日期**: 2026-04-22
> **目标文件**: `packages/assistant/src/views/career/mock-practice/index.vue`
> **参考原型**: `osg-spec-docs/source/prototype/assistant.html` L789-1048
> **参考 Admin**: `packages/admin/src/views/career/mock-practice/index.vue`

---

## 一、原型 vs 当前实现 差异总结

| # | 区域 | 原型设计 | 当前实现 | 偏差等级 |
|---|------|----------|----------|----------|
| 1 | 根元素 | — | `#page-mock-practice` | 🟡 需改 `.osg-page` |
| 2 | PageHeader | 标题+描述 | 手写 `.page-header` | 🟡 需替换 `<PageHeader>` |
| 3 | 统计卡片 | 我辅导的(蓝)/我管理的(绿)/已完成(紫)/累计课时(primary) | 待进行/已有反馈/已完成/待安排 | 🔴 严重偏离原型 |
| 4 | Tab 结构 | **双 Tab**: 我辅导的学员 + 我管理的学员 | **三 Tab**: 待进行/已有反馈/全部记录 | 🔴 严重偏离原型 |
| 5 | 辅导 Tab banner | 蓝底「以下是由您亲自辅导的学员模拟应聘记录」 | 按 Tab 切换不同 banner | 🟡 文案不符 |
| 6 | 管理 Tab banner | 绿底「以下是您管理的学员的模拟应聘记录（由其他导师辅导）」| 不存在 | 🔴 缺失 |
| 7 | 辅导表列 | 6 列: 学员/类型/申请时间/状态/已上课时/**课程反馈** | 8 列: 学员/类型/申请时间/状态/辅导导师/已上课时/**反馈结果**/操作 | 🔴 列不符 + 列名「课程反馈」写成「反馈结果」|
| 8 | 管理表列 | 7 列: 学员/类型/申请时间/状态/**辅导导师**/已上课时/**课程反馈** | 不存在 | 🔴 缺失 |
| 9 | 筛选组件 | 原生 select/input | 原生 select/input | 🟡 需改 Ant Design |
| 10 | 管理 Tab 筛选 | 多出「导师」搜索框 | 不存在 | 🟡 缺失 |
| 11 | 表格组件 | 原生 `<table>` | 原生 `<table>` | 🟡 需改 `<a-table>` |
| 12 | 行高亮 | 新分配=红色渐变+左边框, 期中考=紫色背景 | 按类型着色(蓝/琥珀/紫) | 🟡 逻辑偏差 |
| 13 | 新分配行操作 | 原型在**课程反馈列**内放绿色 `✓ 确认` 按钮（无独立操作列） | 只有「查看详情」链接 | 🟡 需补「确认」按钮 |
| 14 | 详情弹窗 | **原型无此功能** | 自定义 modal | 🟢 原型增强，保留并改 `<a-modal>` |
| 15 | PageHeader description | `处理学员的模拟面试、人际关系测试、期中考试申请` | `查看学员的模拟面试...聚焦近期安排和反馈结果` | 🟡 文案不符 |
| 16 | 筛选按钮 | 原型按钮文案为「**筛选**」 | `.btn btn-sm` 没有按钮 | 🟡 需新增按钮且文案为「筛选」|
| 17 | CSS | — | ~520 行旧 CSS | 🟡 需精简 |

---

## 二、改造任务清单

### Phase 1: 布局与组件壳

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| MP-1 | 根元素 `class="osg-page"` + `<PageHeader title="模拟应聘管理" subtitle="Mock Practice" description="处理学员的模拟面试、人际关系测试、期中考试申请">` 替换手写 header（description 严格采用原型文案） | template L1-11 | 🔲 |
| MP-2 | 统计卡片改 `<a-row>` + `<a-col>` + `<a-card>` + `<a-statistic>` | template L13-20, script statsCards | 🔲 |

### Phase 2: Tab + 筛选

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| MP-3 | 双 Tab 按钮（我辅导的学员 + 我管理的学员），与 Job Overview 一致风格 | template tabs 区域, script activeTab | 🔲 |
| MP-4 | 筛选改 Ant Design（`<a-input>` + `<a-select>` + `<a-button>`），按钮文案用原型的「**筛选**」+ 「重置」 | template filters 区域 | 🔲 |
| MP-5 | 管理 Tab 多出「导师」搜索框 | template + script filters | 🔲 |

### Phase 3: 表格

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| MP-6 | 辅导表 6 列 `<a-table>`（**列名严格按原型**）: 学员/类型/申请时间/状态/已上课时/**课程反馈** + 独立「操作」列（原型增强，对齐 Admin 风格） | template + script coachingColumns | 🔲 |
| MP-7 | 管理表 7 列 `<a-table>`（**列名严格按原型**）: 学员/类型/申请时间/状态/**辅导导师**/已上课时/**课程反馈** + 独立「操作」列（原型增强） | template + script managedColumns | 🔲 |
| MP-8 | 行高亮 `row-class-name`: 新分配=红色渐变+左边框, 期中考=紫色 | script + style | 🔲 |
| MP-9 | 新分配行操作：「课程反馈」列显示 `-`，「操作」列同时显示绿色「确认」按钮 + 「查看详情」链接；已完成行「课程反馈」列显示反馈文字，「操作」列只有「查看详情」（**说明**：独立操作列 + 查看详情是原型增强，与 Admin 框架一致） | template bodyCell slot | 🔲 |

### Phase 4: 弹窗 + 清理

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| MP-10 | 详情弹窗改 `<a-modal>` + `<a-descriptions>` | template modal 区域 | 🔲 |
| MP-11 | 删旧 CSS，保留行高亮/头像/弹窗必要样式 | style 区域 | 🔲 |

### Phase 5: Script 适配

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| MP-12 | 更新 script: activeTab 改 'coaching'/'managed', statsCards 对齐原型4项 | script | 🔲 |
| MP-13 | 新增 coachingColumns/managedColumns, coachingRecords/managedRecords 计算属性 | script | 🔲 |
| MP-14 | 新增 rowClassName 函数(新分配红/期中考紫), practiceTypeColor/statusColor 函数 | script | 🔲 |
| MP-15 | import PageHeader + SearchOutlined 等图标 | script imports | 🔲 |

### Phase 6: 测试 + 验证

| ID | 任务 | 影响范围 | 状态 |
|----|------|----------|------|
| MP-16 | 更新 career-pages.spec.ts 中 mock-practice 测试（改 source string 匹配） | test file | 🔲 |
| MP-17 | 验证 vue-tsc 零错误 | — | 🔲 |
| MP-18 | 验证 vitest 通过 | — | 🔲 |
| MP-19 | MCP 浏览器验证 | — | 🔲 |

---

## 三、原型关键设计参考

### 3.1 统计卡片（原型 L798-802）

```
| 我辅导的(蓝#3B82F6) | 我管理的(绿#22C55E) | 已完成(紫#8B5CF6) | 累计课时(primary) |
|         5           |         8           |        12         |      35.5h        |
```

### 3.2 双 Tab（原型 L808-809 + 对齐 Job Overview 设计）

- **我辅导的学员** — **primary 蓝**激活态, icon: `mdi-school`（SolutionOutlined）, badge: count
- **我管理的学员** — **紫色 `#8B5CF6`** 激活态（与 Job Overview 双 Tab 保持一致，原型仅示 coaching 激活态，managed 激活态参考同端的 Job Overview 设计规范）, icon: `mdi-account-group`（TeamOutlined）, badge: count

### 3.3 辅导表列（原型 L847）

| 学员 | 类型 | 申请时间 | 状态 | 已上课时 | 课程反馈 |

### 3.4 管理表列（原型 L965）

| 学员 | 类型 | 申请时间 | 状态 | **辅导导师** | 已上课时 | 课程反馈 |

### 3.5 行高亮（原型 L849, L907, L1024）

- **新分配行**: `background: linear-gradient(90deg, #FEE2E2, #FEF2F2); border-left: 4px solid #EF4444`
- **期中考试行**: `background: #F3E8FF`

### 3.6 筛选选项（原型 L821-826, L830-836, L936-950）

辅导 Tab 筛选:
- 类型: 全部类型 / 模拟面试 / 人际关系测试 / 期中考试
- 状态: 全部状态 / 新分配 / 待进行 / 已完成 / 已取消
- 学员: 搜索学员姓名/ID

管理 Tab 筛选（多出导师搜索）:
- 类型: 全部类型 / 模拟面试 / 人际关系测试 / 期中考试
- 状态: 全部状态 / 待进行 / 进行中 / 已完成 / 已取消
- 学员: 搜索学员姓名/ID
- **导师: 搜索导师姓名**（管理 Tab 独有）

---

## 四、Admin 框架参考点

| 组件 | Admin 用法 | Assistant 对齐方式 |
|------|-----------|-------------------|
| PageHeader | `<PageHeader title="..." subtitle="..." description="...">` | 相同 |
| 统计卡片 | `<a-row :gutter="12">` + `<a-col :span="6">` + `<a-card>` + `<a-statistic>` | 相同 |
| 筛选 | `<a-form layout="inline">` + `<a-input>` + `<a-select>` + `<a-button>` | 相同 |
| 表格 | `<a-table :columns :data-source :pagination :loading :scroll>` + `#bodyCell` slot | 相同 |
| Tab | Admin 用 `<a-tabs>` | Assistant 用原型的 button-pill 风格（与 Job Overview 一致） |
| 弹窗 | Admin 有 `AssignMockModal` / `MockFeedbackModal` | Assistant 只保留查看详情 `<a-modal>` |

---

## 五、不改动项

- API 调用函数 `getAssistantMockPracticeList` 不变
- 路由配置不变
- 业务逻辑（筛选/排序）保持现有语义
- 助教端只读原则：不包含 Admin 的「分配导师」「录入反馈」等管理操作
- 助教可用操作：「确认」（标记已读，原型设计）+「查看详情」（**原型增强**，与 Admin 风格一致，保留现有详情弹窗能力，迁移到 `<a-modal>`）

---

## 六、原型偏离说明（原型增强项）

本方案不完全照搬原型，以下 **3 项** 为原型增强（对齐 Admin 框架、保留现有能力）：

| # | 原型增强项 | 理由 |
|---|-----------|------|
| 1 | 表格新增独立「操作」列 | 原型把「确认」按钮塞在「课程反馈」列内，与 Ant Design 表格规范不符，独立操作列更清晰，与 Admin/Lead-Mentor 框架一致 |
| 2 | 保留「查看详情」链接 + 详情弹窗 | 原型无此功能，但当前实现已有完整逻辑且业务有价值（助教需查看申请内容/安排信息），不回退 |
| 3 | Managed Tab 紫色激活态 | 原型仅展示 coaching 激活态，managed 激活态参考同端 Job Overview 的「双 Tab 一蓝一紫」设计规范 |

其余**严格按原型**：标题文案、描述文案、统计卡片顺序与颜色、Tab 名称、列名（「课程反馈」非「反馈结果」）、筛选按钮文案（「筛选」非「搜索」）、banner 底色、行高亮色值。
