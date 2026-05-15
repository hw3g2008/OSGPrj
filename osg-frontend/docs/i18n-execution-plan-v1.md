# 整站英文化执行方案

> 将 OSG 前端 5 端 + 共享层从中文硬编码迁移为 vue-i18n 中英双语。

## 1. 现状

| 项目 | 数据 |
|------|------|
| 技术栈 | Vue 3 + Pinia + Vue Router + Ant Design Vue 4 |
| 端 | admin / student / mentor / lead-mentor / assistant + shared |
| 含中文文件数 | 432 个（.vue / .ts） |
| 去重中文短语 | 3,756 条 |
| 现有 i18n | **无**，全部硬编码；仅 ant-design-vue 使用内置 zhCN locale |
| 翻译进度 | CSV 中英对照已完成：`scripts/i18n-map-translated.csv` |

### 各端文件分布

| 端 | 含中文文件数 | 优先级 |
|---|---|---|
| admin | 149 | P0（最大、最复杂） |
| shared | 95 | P0（公共组件，所有端依赖） |
| lead-mentor | 74 | P1 |
| student | 45 | P1 |
| assistant | 35 | P2 |
| mentor | 34 | P2 |

---

## 2. 目标架构

```
packages/
  shared/src/
    i18n/
      index.ts          ← createI18n() 实例，export 给各端
      locales/
        zh.json          ← 中文语言包（source of truth）
        en.json          ← 英文语言包
  admin/src/
    main.ts             ← app.use(i18n)
  student/src/
    main.ts             ← app.use(i18n)
  ...（其他端同理）
```

### 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| i18n 实例位置 | shared 包统一创建 | 各端共享翻译，避免重复维护 |
| key 命名规则 | 模块化前缀 `module.page.text` | 可读性 + 避免冲突 |
| 语言切换 | 首版不做运行时切换，构建时选择 | 降低首版复杂度 |
| Ant Design Vue locale | 跟随 vue-i18n 同步切换 | `ConfigProvider :locale` 绑定 |

---

## 3. 执行分阶段

### Phase 0：准备工作（~30min）

| # | 任务 | 产物 |
|---|------|------|
| 0.1 | 安装 `vue-i18n@^9` 到 shared 包 | `pnpm add vue-i18n -w --filter @osg/shared` |
| 0.2 | 校对 CSV 术语一致性 | 统一术语表（见第 5 节） |
| 0.3 | 从 CSV 生成 key 映射规则 | key 重命名脚本：hex key → 可读 key |
| 0.4 | 创建 git 分支 `feat/i18n` | 隔离变更，便于回滚 |

### Phase 1：基础设施搭建（~1h）

| # | 任务 | 说明 |
|---|------|------|
| 1.1 | 创建 `shared/src/i18n/index.ts` | 导出 `createI18n()` 实例 + `useAppI18n()` composable |
| 1.2 | 生成 `zh.json` / `en.json` | 脚本从 CSV 生成 |
| 1.3 | 各端 `main.ts` 挂载 `app.use(i18n)` | 5 个端逐个加 |
| 1.4 | `App.vue` 中 `ConfigProvider` 切换 antd locale | 从 zhCN 改为动态绑定 |
| 1.5 | 验证：页面正常加载，控制台无报错 | 此时页面仍显示中文（还没替换） |

**Phase 1 关键代码示例：**

```typescript
// shared/src/i18n/index.ts
import { createI18n } from 'vue-i18n'
import zh from './locales/zh.json'
import en from './locales/en.json'

export const i18n = createI18n({
  legacy: false,        // Composition API 模式
  locale: 'en',         // 默认英文
  fallbackLocale: 'zh', // 兜底中文
  messages: { zh, en }
})
```

```typescript
// admin/src/main.ts（其他端同理）
import { i18n } from '@osg/shared/i18n'
app.use(i18n)
```

### Phase 2：源文件替换 — 以 admin 端为样板（~4-6h）

**2.1 自动替换（脚本覆盖约 70%）**

脚本处理三种模式：

| 模式 | 原文 | 替换后 |
|------|------|--------|
| 模板文本 | `<span>找回密码</span>` | `<span>{{ $t('forgot_password') }}</span>` |
| 模板属性 | `placeholder="请输入"` | `:placeholder="$t('please_enter')"` |
| JS 字符串 | `message: '请输入邮箱'` | `message: t('enter_email')` |

**2.2 进阶替换（约 30%，9 类场景完整方案）**

以下 9 类场景自动脚本无法简单正则替换，需要分场景处理。每类给出**原文 → 目标 → 脚本策略**。

---

#### 场景 A：模板字面量中的中文（`` `中文${var}中文` ``）

**真实样本**
```vue
<!-- StatCards.vue:45 -->
sub: `本月新增 ${s.newStudentsThisMonth}`,

<!-- StatCards.vue:66 -->
sub: `最早 ${s.earliestPendingDays}天前`,

<!-- positions/index.vue:126 -->
<span>{{ industry.companyCount }} 家公司</span>
```

**替换规则**
```typescript
// Before
sub: `本月新增 ${s.newStudentsThisMonth}`
// After — 使用 vue-i18n 命名插值
sub: t('new_this_month', { count: s.newStudentsThisMonth })
// en.json: "new_this_month": "{count} new this month"
// zh.json: "new_this_month": "本月新增 {count}"
```

```vue
<!-- Before -->
<span>{{ industry.companyCount }} 家公司</span>
<!-- After -->
<span>{{ $t('n_companies', { n: industry.companyCount }) }}</span>
<!-- en.json: "n_companies": "{n} companies" -->
```

**脚本策略**：正则匹配 `` `...${...}...中文` `` 模式 → 提取变量名和中文片段 → 生成 `t('key', { var })` + 对应 locale 条目。脚本标记这些行到 `review-list.csv` 供人工确认插值语序。

---

#### 场景 B：字符串拼接中的中文（`'中文' + var`）

**真实样本**
```vue
<!-- BatchUploadModal.vue:26 -->
<strong>{{ selectedFile?.name || '拖拽文件到此处，或点击选择文件' }}</strong>
```

**替换规则**
```vue
<!-- Before -->
<strong>{{ selectedFile?.name || '拖拽文件到此处，或点击选择文件' }}</strong>
<!-- After -->
<strong>{{ selectedFile?.name || $t('drag_or_click_to_upload') }}</strong>
```

**脚本策略**：匹配 `|| '中文'` / `?? '中文'` / `+ '中文'` 模式 → 直接替换为 `t('key')`。对于 `'中文' + var + '中文'` 复合拼接，转为命名插值。

---

#### 场景 C：三元表达式中的中文（`cond ? '中文A' : '中文B'`）

**真实样本**
```vue
<!-- PositionFormModal.vue:15 -->
{{ isEditing ? '编辑岗位' : '新增岗位' }}

<!-- ForgotPasswordModal.vue:91 -->
{{ countdown > 0 ? `${countdown}s` : '重新发送' }}

<!-- PositionFormModal.vue (placeholder) -->
:placeholder="form.region ? '请选择' : '请先选择地区'"
```

**替换规则**
```vue
<!-- Before -->
{{ isEditing ? '编辑岗位' : '新增岗位' }}
<!-- After -->
{{ isEditing ? $t('edit_position') : $t('add_position') }}

<!-- Before -->
{{ countdown > 0 ? `${countdown}s` : '重新发送' }}
<!-- After -->
{{ countdown > 0 ? `${countdown}s` : $t('resend') }}

<!-- Before -->
:placeholder="form.region ? '请选择' : '请先选择地区'"
<!-- After -->
:placeholder="form.region ? $t('please_select') : $t('select_region_first')"
```

**脚本策略**：正则匹配 `? '中文'` 和 `: '中文'` → 分别替换两侧字面量为 `$t('key')` / `t('key')`。保留三元结构不变。

---

#### 场景 D：数组/对象字面量中的中文 label（`{ label: '中文' }`）

**真实样本**
```typescript
// columns.ts:7-18
export const positionColumns: PositionColumn[] = [
  { key: 'positionName', label: '岗位名称' },
  { key: 'companyIndustry', label: '公司行业' },
  { key: 'city', label: '地区' },
  // ...
]

// QuickActions.vue:28-33
const actions = [
  { key: 'add-student', icon: '...', label: '新增学员' },
  { key: 'add-staff', icon: '...', label: '新增导师' },
]
```

**替换规则**
```typescript
// 方案一：静态数组改为 computed（推荐）
const positionColumns = computed(() => [
  { key: 'positionName', label: t('position_name') },
  { key: 'companyIndustry', label: t('company_industry') },
  { key: 'city', label: t('region') },
])

// 方案二：非响应式则用函数
function getPositionColumns() {
  const { t } = useI18n()
  return [
    { key: 'positionName', label: t('position_name') },
    // ...
  ]
}
```

> **关键**：`columns.ts` 等纯 .ts 文件中没有 `setup` 上下文，不能直接用 `useI18n()`。
> 两种处理方式：
> 1. 改为在 .vue 的 `<script setup>` 中定义（推荐）
> 2. 将 columns 改为导出函数，接收 `t` 参数：`export const getColumns = (t: TFunction) => [...]`

**脚本策略**：匹配 `label: '中文'` / `title: '中文'` / `text: '中文'` 模式 → 替换值为 `t('key')`。同时检查所在文件是否为纯 `.ts`，如果是则标记到 `review-list.csv` 提醒需要改为函数参数或迁移到 `.vue`。

---

#### 场景 E：Ant Design Vue 组件属性中的中文

**真实样本**
```vue
<!-- placeholder -->
<a-select placeholder="全部分类" />
<a-input placeholder="请输入注册邮箱" />

<!-- title -->
<a-modal title="编辑岗位" />
<a-popconfirm title="确定删除？" />

<!-- locale 对象 -->
<a-table :locale="{ emptyText: '当前没有待分配导师的岗位申请' }" />
```

**替换规则**
```vue
<!-- Before -->
<a-select placeholder="全部分类" />
<!-- After -->
<a-select :placeholder="$t('all_categories')" />

<!-- Before -->
<a-modal title="编辑岗位" />
<!-- After -->
<a-modal :title="$t('edit_position')" />

<!-- Before -->
<a-table :locale="{ emptyText: '当前没有...' }" />
<!-- After -->
<a-table :locale="{ emptyText: $t('no_pending_applications') }" />
```

**脚本策略**：匹配 `attr="中文"` 模式（不以 `:` 开头）→ 替换为 `:attr="$t('key')"`。已有 `:attr="{ ...: '中文' }"` 的，替换内部字符串值为 `$t('key')`。

---

#### 场景 F：表单校验 message 中的中文

**真实样本**
```typescript
// ForgotPasswordModal.vue:248-256
const emailRules = {
  email: [
    { required: true, message: '请输入邮箱地址' },
    { type: 'email', message: '请输入正确的邮箱格式' },
  ],
}

// 自定义校验函数
const validatePassword = (_rule: Rule, value: string) => {
  if (!value) return Promise.reject('请输入新密码')
  if (value.length < 8 || value.length > 20)
    return Promise.reject('密码长度需为8-20字符')
}
```

**替换规则**
```typescript
// Before
{ required: true, message: '请输入邮箱地址' }
// After
{ required: true, message: t('email_required') }

// Before
return Promise.reject('请输入新密码')
// After
return Promise.reject(t('password_required'))
```

**脚本策略**：
- 匹配 `message: '中文'` → `message: t('key')`
- 匹配 `Promise.reject('中文')` → `Promise.reject(t('key'))`
- 匹配 `Promise.reject("中文")` → `Promise.reject(t('key'))`
- 确保所在 `<script setup>` 顶部有 `const { t } = useI18n()`

---

#### 场景 G：console.log / console.warn 中的中文

**真实样本**
```typescript
console.error('加载岗位数据失败', error)
console.warn('[PositionStore] 未找到匹配记录')
```

**处理决策：不翻译**

理由：console 输出面向开发者，不面向终端用户。翻译收益为零。

**脚本策略**：正则匹配 `console\.(log|warn|error|info)\(` 开头的行 → 跳过，不替换。但仍计入扫描报告，确保不是 UI 面向用户的 `message.error('中文')` 误判为 console。

---

#### 场景 H：computed / watch 中返回的中文

**真实样本**
```typescript
// StatCards.vue:35-92
const cards = computed(() => [
  {
    label: '学员总数',
    sub: `本月新增 ${s.newStudentsThisMonth}`,
  },
  {
    label: '导师总数',
    sub: `本月新增 ${s.newMentorsThisMonth}`,
  },
])

// PositionFormModal.vue:375
const formatDisplayStatus = (value: string) => {
  return displayStatusMap.value.get(value) || '展示中'
}
```

**替换规则**
```typescript
// Before
const cards = computed(() => [
  { label: '学员总数', sub: `本月新增 ${s.newStudentsThisMonth}` },
])
// After
const cards = computed(() => [
  { label: t('total_students'), sub: t('new_this_month', { count: s.newStudentsThisMonth }) },
])

// Before
return displayStatusMap.value.get(value) || '展示中'
// After
return displayStatusMap.value.get(value) || t('displaying')
```

**脚本策略**：与场景 D 相同，匹配 `label: '中文'` / `|| '中文'` 模式。computed 内部天然有响应式上下文，`t()` 可直接使用。

---

#### 场景 I：动态返回函数中的中文（`formatXxx()`、状态映射）

**真实样本**
```typescript
// 状态映射表
const statusMap: Record<string, string> = {
  active: '活跃',
  frozen: '冻结',
  done: '完成',
}

// 格式化函数
function formatStatus(val: string) {
  return statusMap[val] ?? '未知'
}
```

**替换规则**
```typescript
// Before — 静态映射对象
const statusMap = { active: '活跃', frozen: '冻结' }

// After — 方案一：改为 computed 映射（推荐）
const statusMap = computed(() => ({
  active: t('active'),
  frozen: t('frozen'),
}))

// After — 方案二：改为函数 + t()
function getStatusLabel(val: string) {
  const map: Record<string, string> = {
    active: t('active'),
    frozen: t('frozen'),
  }
  return map[val] ?? t('unknown')
}
```

**脚本策略**：匹配对象字面量中 `key: '中文'` 且 key 不是 `label/title/message/text` 的情况（值是中文即命中）→ 替换值为 `t('key')`。如果对象是模块顶层 `const`，标记需改为 `computed` 或函数。

---

### 各场景脚本覆盖率汇总

| 场景 | 标记 | 脚本可自动替换 | 需人工确认 | 说明 |
|------|------|--------------|-----------|------|
| A. 模板字面量 | `TMPL_LITERAL` | 60% | 40% | 插值语序需人工确认 |
| B. 字符串拼接 | `STR_CONCAT` | 80% | 20% | 简单 `||` 拼接可自动 |
| C. 三元表达式 | `TERNARY` | 90% | 10% | 两侧独立替换 |
| D. 对象/数组 label | `OBJ_LABEL` | 70% | 30% | 纯 .ts 文件需改结构 |
| E. 组件属性 | `COMP_ATTR` | 95% | 5% | 加 `:` 前缀即可 |
| F. 表单校验 | `FORM_RULE` | 90% | 10% | message + reject 可匹配 |
| G. console | `SKIP` | 100%（跳过） | 0% | 不翻译 |
| H. computed 返回 | `COMPUTED` | 70% | 30% | 同 D，有上下文 |
| I. 映射函数 | `MAP_FN` | 50% | 50% | 可能需要改为 computed |

**综合自动化率提升**：从 70% → **~85%**，剩余 15% 生成 `review-list.csv` 供逐条人工确认。

**2.3 人工审查（review-list.csv）**

替换脚本对无法 100% 确认的替换会生成 `scripts/review-list.csv`，格式：

```csv
file,line,category,original,suggested,status
admin/src/.../StatCards.vue,45,TMPL_LITERAL,"`本月新增 ${s.newStudentsThisMonth}`","t('new_this_month', { count: s.newStudentsThisMonth })",pending
admin/src/.../columns.ts,7,OBJ_LABEL,"label: '岗位名称'","label: t('position_name')",pending
```

审查清单：
- [ ] 检查插值变量语序是否在英文中正确（中文"共 N 条" vs 英文 "N records in total"）
- [ ] 纯 .ts 文件中的 `t()` 调用是否有合法的 i18n 上下文
- [ ] 状态映射对象是否需要从 `const` 改为 `computed`
- [ ] 确认 `console.*` 行确实不面向用户（排除 `message.error` 误判）

**2.4 useI18n 注入**

脚本在替换 `<script setup>` 中的字符串时，自动检测并注入：

```typescript
// 自动在 <script setup> 顶部追加（如果不存在）
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
```

规则：
- 已有 `useI18n` 导入 → 跳过
- `<script>` 非 setup 模式 → 标记到 review-list，不自动注入
- 纯 `.ts` 文件 → 改为导出函数接收 `t` 参数（标记到 review-list）

**2.5 验证**

```bash
# 1. 扫描残留中文（排除注释、console、node_modules）
grep -rn --include="*.vue" --include="*.ts" -E '[一-龥]+' packages/admin/src/ \
  | grep -v '^\s*//' | grep -v '^\s*\*' | grep -v '<!--' \
  | grep -v 'console\.' | grep -v 'node_modules'

# 2. TypeCheck
pnpm --filter admin typecheck

# 3. 检查 review-list 剩余未处理条目
grep ',pending' scripts/review-list.csv | wc -l

# 4. 启动 dev server 人工验证
pnpm --filter admin dev
```

**验证重点页面**（admin 端）：
- [ ] 登录页（含忘记密码流程）
- [ ] Dashboard 首页（统计卡片、快捷操作）
- [ ] 岗位管理（列表/下钻/新增编辑弹窗）
- [ ] 学生自添岗位审核
- [ ] 财务结算（列表 + 标记支付）
- [ ] 系统管理（用户/角色/菜单/字典）
- [ ] 检查英文文本是否溢出 UI 容器

### Phase 3：推广到其他端（~3-4h）

按优先级逐端推进，复用 Phase 2 的替换脚本：

| 顺序 | 端 | 预计耗时 | 说明 |
|------|---|---------|------|
| 1 | shared | 1.5h | 公共组件，改完所有端受益 |
| 2 | student | 0.5h | 45 文件，量小 |
| 3 | lead-mentor | 1h | 74 文件 |
| 4 | mentor | 0.5h | 34 文件，量最小 |
| 5 | assistant | 0.5h | 35 文件 |

### Phase 4：收尾验证（~1-2h）

| # | 任务 | 说明 |
|---|------|------|
| 4.1 | 全局中文残留扫描 | `grep -rn '[一-龥]' packages/` 确认为 0（排除注释） |
| 4.2 | TypeCheck 全量通过 | `pnpm typecheck` |
| 4.3 | 各端 dev server 启动 + 浏览器验证 | 重点页面截图对比 |
| 4.4 | 清理临时文件 | 删除 scripts/chunk-*.json, result-*.json 等 |
| 4.5 | 更新 README | 说明 i18n 使用方式和新增翻译流程 |

---

## 4. 替换脚本设计

```
scripts/
  extract-i18n.mjs           ← 已完成：提取中文 → CSV
  translate-i18n.mjs          ← 已完成：CSV 中文 → 英文翻译
  i18n-map-translated.csv     ← 已完成：3756 条中英对照
  generate-locale.mjs         ← 待写：CSV → zh.json + en.json（含 key 重命名）
  replace-source.mjs          ← 待写：源文件中文 → $t('key')（9 类场景全覆盖）
  inject-use-i18n.mjs         ← 待写：自动注入 useI18n() 到需要的 <script setup>
  review-list.csv             ← 自动生成：脚本无法 100% 确认的替换清单
  verify-i18n.mjs             ← 待写：扫描残留 + 校验 key 完整性 + UI 溢出检查
```

### replace-source.mjs 核心逻辑

```
对每个 .vue 文件：
  1. 解析 <template> 块
     - 匹配 >中文<  → >{{ $t('key') }}<
     - 匹配 attr="中文" → :attr="$t('key')"
     - 匹配 attr='中文' → :attr="$t('key')"
  2. 解析 <script> 块
     - 匹配 '中文' / "中文" → t('key')
     - 如果有替换，检查是否已有 useI18n()，没有则注入
  3. 跳过：
     - 注释（// 和 /* */）
     - console.log 内容
     - TypeScript 类型字面量（可选保留）
```

---

## 5. 术语统一表

CSV 翻译时已统一的核心术语，后续维护需遵守：

| 中文 | 英文 | 说明 |
|------|------|------|
| 导师 | Mentor | 不用 Tutor / Instructor |
| 学员 / 学生 | Student | 不用 Learner |
| 岗位 | Position | 不用 Job / Vacancy |
| 简历 | Resume | 不用 CV（统一北美用法） |
| 求职 | Job Search | — |
| 面试 | Interview | — |
| 辅导 | Coaching | 不用 Tutoring |
| 课程 | Course | — |
| 课时 | Session | 不用 Class Hour |
| 排期 | Schedule | — |
| 签证 | Visa | — |
| 班主任 | Admin | 系统内的管理角色 |
| 助教 | Assistant | — |
| 主攻方向 | Specialty | 不用 Major / Direction |
| 子方向 | Sub-specialty | — |
| 招聘周期 | Recruitment Cycle | — |
| 报销 | Reimbursement | — |
| 结算 | Settlement | — |
| 课时费 | Session Fee | — |
| 投递 | Application / Apply | — |
| 审核 | Review | — |
| 通过 | Approve / Approved | — |
| 拒绝 | Reject / Rejected | — |

---

## 6. 风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 自动替换引入语法错误 | 中 | 高 | 替换后自动跑 TypeCheck；使用 git diff 逐文件审查 |
| 英文过长导致 UI 溢出 | 高 | 中 | Phase 4 浏览器验证时修复；CSS 加 `text-overflow` 兜底 |
| key 冲突 / 重复 | 低 | 中 | 生成阶段自动检测唯一性 |
| 动态拼接字符串漏替换 | 高 | 中 | 手动 grep 扫描残留，Phase 2.2 覆盖 |
| Ant Design Vue 组件内置文案（分页、表格空态等）未翻译 | 中 | 低 | ConfigProvider 绑定 enUS locale 一行搞定 |
| 后端返回的中文（错误消息、字典值） | 高 | 中 | 后端国际化单独排期，首版前端翻译覆盖不含后端 |

---

## 7. 不在本次范围

以下内容本次不做，标记为后续迭代：

| 项目 | 原因 |
|------|------|
| 后端 API 错误消息国际化 | 需后端配合 Spring MessageSource |
| 数据库字典表双语 | 需加 `name_en` 字段 + 数据迁移 |
| 运行时语言切换 UI | 首版默认英文，切换功能后续加 |
| PDF / Excel 导出英文化 | 后端模板修改，单独排期 |
| 邮件模板英文化 | 后端 + 内容团队配合 |

---

## 8. 执行时间线

| 阶段 | 预计时间 | 前置依赖 |
|------|---------|---------|
| Phase 0 准备 | 30min | CSV 术语校对 |
| Phase 1 基础设施 | 1h | Phase 0 |
| Phase 2 admin 样板 | 4-6h | Phase 1 |
| Phase 3 推广其他端 | 3-4h | Phase 2 验收通过 |
| Phase 4 收尾验证 | 1-2h | Phase 3 |
| **总计** | **~10-14h** | — |

---

## 9. 启动命令

准备好后，按以下顺序执行：

```bash
# 1. 创建分支
git checkout -b feat/i18n

# 2. 安装 vue-i18n
pnpm add vue-i18n --filter @osg/shared

# 3. 生成 locale 文件（脚本待写）
node scripts/generate-locale.mjs

# 4. 替换源文件（脚本待写）
node scripts/replace-source.mjs --target admin

# 5. 验证
pnpm --filter admin typecheck
pnpm --filter admin dev
```
