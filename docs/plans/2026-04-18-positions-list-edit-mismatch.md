# 岗位信息列表 vs 编辑弹窗数据不一致 — 根因与方案

**日期**：2026-04-18  
**报告人**：huangxin  
**复现路径**：后台 `/career/positions` → 列表 → 任一行"编辑"

---

## 1. 现象（实测 SIG 第一行）

| 列表列 | 列表显示 | 编辑弹窗对应字段 | 编辑弹窗显示 | 对得上吗 |
|--------|----------|-----------------|-------------|---------|
| 岗位名称 | `Equity Analyst Internship: Summer 2027 (NY)` | `positionName` | 同左 | ✅ |
| 公司 | `SIG` | `companyName` | `SIG` | ✅ |
| 公司类别 | `Investment Bank` | `companyType` | `Investment Bank` | ✅ |
| 岗位分类 | `Summer Analyst` | `positionCategory` | `Summer Analyst` | ✅ |
| 地区 | `New York` | `region + city` | `北美` + `New York` | ✅ |
| **招聘周期** | **`Class of 2028`**（只 1 个） | `recruitmentCycles` checkbox | **24 个全勾 `on`** | ❌ **严重不一致** |
| **发布时间** | **`04-16`** | **无对应字段** | — | ❌ **编辑界面看不到也改不了** |
| **截止时间** | **`Rolling ASAP`**（文案） | `deadline`（日期选择器） | `(空)` | ❌ **编辑界面没"截止文案"入口** |
| 展示起止 | 列表不显示 | `displayStartTime/EndTime` | `2026-04-13` / `2026-07-12` | — |

## 2. 根因分析

### 2.1 `recruitmentCycle` 列表只显示第一个值

**位置**：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue:767-774`

```ts
const formatCycle = (value?: string) => {
  if (!value) return '-'
  const cycles = value.split(',').map(i => i.trim()).filter(Boolean)
  const first = cycles[0] || value   // ← 只取第一个
  return cycleMap.value.get(first)?.label || first
}
```

后端 `recruitment_cycle` 字段是**逗号分隔多值字符串**（如 `"fall2025,spring2026,summer2027,..."`）。  
编辑弹窗按多选 checkbox 正确展示全部，但**列表只取 `cycles[0]` 显示**，导致视觉上"列表只有 1 个，编辑时发现全勾"。

### 2.2 `publishTime`（发布时间）编辑弹窗无对应字段

**位置**：
- 后端字段：`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgPosition.java:178`（`publish_time` 独立 DB 字段）
- 前端列表列：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue:349`
- 前端 Form：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/components/PositionFormModal.vue:215-232`（form 对象里**没有 `publishTime`**）
- 前端 submit：`PositionFormModal.vue:324-343`（payload 不带 `publishTime`）

后端行为（`OsgPositionServiceImpl`）：
- 新建时：`if (position.getPublishTime() == null) position.setPublishTime(currentSecond())` — 自动填当前时间
- 更新时：mapper 用 `<if test="publishTime != null">` 只在传了才更新，前端不传就保留旧值

**后果**：列表看得到"发布时间"，但管理员**无法通过编辑界面修改**它。

### 2.3 `deadlineText`（截止文案）编辑弹窗无对应字段

**位置**：
- 后端 API 类型：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/api/admin/position.ts:133`（`PositionPayload.deadlineText?: string`）
- 前端列表列：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue:219`（`v-if="record.deadlineText"`）
- 前端 Form：`PositionFormModal.vue:215-232`（**没有 `deadlineText` 字段**）
- 前端 submit：不传 `deadlineText`

**后果**：列表显示 `Rolling ASAP` 这类文案，但编辑弹窗里管理员**只看到一个日期选择器，没有文案输入框**，没法修改这段文字，只能新建时由后端/批量导入给出。

### 2.4 `industry` 存在硬编码 fallback

**位置**：`PositionFormModal.vue:327`

```ts
industry: form.companyType || 'Investment Bank',
```

如果 `companyType` 为空，直接 fallback 成字面量 `'Investment Bank'`。这是用户提到的"写死"之一。

## 3. 判断

**这不是"数据错了"**，而是**列表/编辑两处字段集不对齐**造成的错觉：
- 列表显示了 4 个编辑不能改的东西（`recruitmentCycle` 全量、`publishTime`、`deadlineText`、自动 fallback 的 `industry`）
- 编辑弹窗把`recruitmentCycle` 变成多选，给列表取第一个读者会以为"列表 1 个，弹窗 24 个"

## 4. 修复方案（最小改动）

按优先级，分 4 个独立小点，**每个都是几行改动，互不耦合**。

### Fix A（必做）：列表"招聘周期"改为显示全部 label

**改 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue:767-774` 的 `formatCycle`**：

```ts
const formatCycle = (value?: string) => {
  if (!value) return '-'
  const cycles = value.split(',').map(i => i.trim()).filter(Boolean)
  if (!cycles.length) return '-'
  return cycles.map(c => cycleMap.value.get(c)?.label || c).join(' / ')
}
```

效果：列表从 `Class of 2028` 变成 `Class of 2027 / Class of 2028 / Spring 2026 / ...`。
表格列宽较窄（100px），可能需要加 `ellipsis` 和 tooltip — 或者只显示前 2 个 + `+N`。

**建议（更友好）**：
```ts
const formatCycle = (value?: string) => {
  if (!value) return '-'
  const cycles = value.split(',').map(i => i.trim()).filter(Boolean)
  const labels = cycles.map(c => cycleMap.value.get(c)?.label || c)
  if (labels.length <= 2) return labels.join(' / ')
  return `${labels.slice(0, 2).join(' / ')} +${labels.length - 2}`
}
```

### Fix B（建议）：列表"发布时间"改成显示"展示起始时间"，与编辑字段一致

**两选一**：

**B1. 最简单**：把列表的"发布时间"列直接去掉，管理员看编辑弹窗就行。
- 改 `listColumns` / `drilldownColumns`，删掉 `publishTime` 列。
- `sortedListRows` 的排序 key 从 `publishTime` 换成 `displayStartTime` 或 `positionId`。

**B2. 保留列**：把列标题从"发布时间"改为"展示起始"，数据源改用 `displayStartTime`。
- `listColumns[中] { title: '展示起始', dataIndex: 'displayStartTime' }`
- 列表单元格改用 `record.displayStartTime`。

我倾向 **B2**，因为排序、筛选器都依赖这列，直接删会有连锁影响。

### Fix C（建议）：编辑弹窗加"截止文案"字段

在 `PositionFormModal.vue` 的"公司信息"最后加一个字段：

```vue
<fieldset class="position-form-modal__field" data-field-name="截止文案">
  <span>截止文案 <small>(如 Rolling ASAP，选填)</small></span>
  <a-input v-model:value="form.deadlineText" placeholder="如 Rolling ASAP / ASAP" />
</fieldset>
```

form 添加 `deadlineText: ''`，resetForm 里 `form.deadlineText = seed.deadlineText || ''`，submit 里 `deadlineText: form.deadlineText || undefined`。

### Fix D（建议）：去掉 `industry` 的硬编码 fallback

**改 `PositionFormModal.vue:327`**：

```ts
// Before
industry: form.companyType || 'Investment Bank',

// After
industry: form.companyType || undefined,
```

后端 payload 里 `industry` 原本就可选，交由后端决定（或后端也设个合理的默认，但不在前端硬写）。

## 5. 建议的提交顺序

1. ~~**Fix A**（招聘周期显示全部）~~ — ✅ 已修复（模板已用 splitCycles + v-for 渲染全部 tags）
2. **Fix B2**（前端列名改为"展示起始"）— ✅ 已修复（commit `7ae42834`，与 Fix B3 合并提交）
3. ~~**Fix D**（去掉 industry 硬编码）~~ — ✅ 已修复（submit payload 已无 industry 字段）
4. **Fix B3**（全栈过滤/排序切换到 display_start_time）— ✅ 已修复（commit `7ae42834`）
5. **Fix C**（加 deadlineText 输入框）— ✅ 已修复（commit `bb5d50cb`）

**当前进度**：全部 Fix（A + B2 + B3 + C + D）已完成 ✅

## 6. 风险与验证

- Fix A：列表列宽 100px，三四个周期 label 会超宽 → 用 `+N` 折叠策略缓解
- Fix B2：排序字段切换，需重测降序是否符合预期
- Fix C：新增字段后需测创建、编辑、保存后是否正确回显
- Fix D：后端需接受 `industry=null` 的情况，已确认后端 `<if test="industry != null">` 允许

### Fix B3（必做）：全栈过滤/排序从 `publish_time` 切换到 `display_start_time`

Fix B2 只改了前端展示层。后端时间范围过滤和默认排序仍走 `publish_time`，导致筛选器语义与列展示不一致。**业务落地必须端到端对齐。**

**改 4 处**（全栈 3 层共 4 个文件）：

**1. 后端 Mapper** — `ruoyi-system/src/main/resources/mapper/system/OsgPositionMapper.xml`

两个 SELECT（`selectPositionDrillDown` + `selectPositionList`）各改 3 处：
```xml
<!-- 参数名 beginPublishTime → beginDisplayStartTime -->
<if test="params != null and params.beginDisplayStartTime != null and params.beginDisplayStartTime != ''">
    and p.display_start_time <![CDATA[>=]]> #{params.beginDisplayStartTime}
</if>
<if test="params != null and params.endDisplayStartTime != null and params.endDisplayStartTime != ''">
    and p.display_start_time <![CDATA[<=]]> #{params.endDisplayStartTime}
</if>
<!-- ORDER BY -->
order by p.display_start_time desc, p.position_id desc
```

**2. 前端 API 类型** — `shared/src/api/admin/position.ts`
```ts
// PositionListParams：
beginDisplayStartTime?: string   // 原 beginPublishTime
endDisplayStartTime?: string     // 原 endPublishTime

// toRequestParams：
if (key === 'beginDisplayStartTime') {
  requestParams['params[beginDisplayStartTime]'] = value
  return
}
if (key === 'endDisplayStartTime') {
  requestParams['params[endDisplayStartTime]'] = value
  return
}
```

**3. 前端业务** — `admin/src/views/career/positions/index.vue`
```ts
// buildPublishRange 返回字段：
return {
  beginDisplayStartTime: start.toISOString().slice(0, 10),
  endDisplayStartTime: end.toISOString().slice(0, 10)
}
```

**风险**：`publish_time` 字段仍保留在数据库和 Java Domain 中（新建岗位时自动填入），但不再用于排序/过滤。如后续确认废弃，可单独清理。

---

## 7. 不在本次修复范围
- 列表"学员"列显示的 0 人是否准确 — 需要单独查 `studentCount` 统计逻辑

---

## 确认请求

请你从以下中选择：
- **方案 1**：只做 Fix A（改 `formatCycle` 显示全部招聘周期，其他问题先不动）
- **方案 2**：做 Fix A + B2 + D（最小闭环，列表标题对齐编辑，去掉 industry 硬编码）
- **方案 3**：四个 Fix 全做（含新增"截止文案"输入框）
- **其他**：你指定具体哪几个
