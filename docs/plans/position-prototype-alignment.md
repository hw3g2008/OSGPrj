# 岗位页面原型对齐需求

> **模块**: career/positions (Admin 端)
> **原型文件**: `osg-spec-docs/source/prototype/admin.html` (line 1942-2455)
> **前端文件**: `osg-frontend/packages/admin/src/views/career/positions/index.vue`
> **日期**: 2026-04-13
> **修订**: v2 — 经讨论确认最终方案

---

## 1. 背景分析

### 原型 vs 前端 vs 数据模型对照

| 原型列表视图列 | 前端当前列 | 数据库字段　　　　　　　 | Excel 导入 | 新增弹窗　 |
| ----------------| ------------| --------------------------| ------------| ------------|
| 岗位名称　　　 | ✅ 岗位名称 | position_name　　　　　　| ✅　　　　　| ✅　　　　　|
| **公司**　　　 | ❌ 缺失　　 | company_name　　　　　　 | ✅　　　　　| ✅　　　　　|
| **行业**　　　 | ❌ 缺失　　 | industry (=company_type) | ❌ 无独立列 | ❌ 无输入框 |
| 岗位分类　　　 | ✅ 岗位分类 | position_category　　　　| ✅　　　　　| ✅　　　　　|
| —　　　　　　　| ✅ 部门　　 | department　　　　　　　 | ✅　　　　　| ✅　　　　　|
| 地区　　　　　 | ✅ 地区　　 | city　　　　　　　　　　 | ✅　　　　　| ✅　　　　　|
| 招聘周期　　　 | ✅ 招聘周期 | recruitment_cycle　　　　| ✅　　　　　| ✅　　　　　|
| 发布时间　　　 | ✅ 发布时间 | publish_time　　　　　　 | —　　　　　| —　　　　　|
| 截止时间　　　 | ✅ 截止时间 | deadline　　　　　　　　 | ✅　　　　　| ✅　　　　　|
| 状态　　　　　 | ✅ 状态　　 | display_status　　　　　 | —　　　　　| —　　　　　|
| 学员　　　　　 | ✅ 学员　　 | (聚合)　　　　　　　　　 | —　　　　　| —　　　　　|
| 操作　　　　　 | ✅ 操作　　 | —　　　　　　　　　　　　| —　　　　　| —　　　　　|

### 关键发现

1. **`industry` = `company_type`**: 后端导入时 `setIndustry(companyType)`，两者存储完全相同的值
2. **"行业"无独立输入入口**: Excel 模板无行业列，新增弹窗无行业输入框，用户无法独立填写行业
3. **"部门"有输入但无展示**: Excel 模板有部门列(列9)，新增弹窗有部门字段，但列表视图应展示

### 决策

- ❌ **不加"行业"列** — 行业=公司类别，无独立输入入口，加了也是冗余信息
- ✅ **加"公司"列** — 列表视图扁平展示时必须看到公司
- ✅ **保留"部门"列** — 有输入就要有展示

---

## 2. 修复方案

### 目标列定义（11 列）

```
岗位名称 | 公司 | 部门 | 岗位分类 | 地区 | 招聘周期 | 发布时间 | 截止时间 | 状态 | 学员 | 操作
```

### 与原型的偏差说明

| 原型有，前端不加 | 原因 |
|-----------------|------|
| 行业列 | industry=company_type，无独立输入入口，冗余 |

| 原型无，前端保留 | 原因 |
|-----------------|------|
| 部门列 | Excel 模板和新增弹窗都有部门字段，有输入就要有展示 |

### 代码修改

**文件**: `osg-frontend/packages/admin/src/views/career/positions/index.vue`

**改动**: 修改 `listColumns` (line 340-351)，在第2位插入"公司"列

```typescript
const listColumns = [
  { title: '岗位名称', dataIndex: 'positionName', key: 'positionName', width: 280, ellipsis: false },
  { title: '公司', dataIndex: 'companyName', key: 'companyName', width: 160 },
  { title: '部门', dataIndex: 'department', key: 'department', width: 80 },
  { title: '岗位分类', dataIndex: 'positionCategory', key: 'positionCategory', width: 90 },
  { title: '地区', dataIndex: 'city', key: 'city', width: 70 },
  { title: '招聘周期', dataIndex: 'recruitmentCycle', key: 'recruitmentCycle', width: 100 },
  { title: '发布时间', dataIndex: 'publishTime', key: 'publishTime', width: 80 },
  { title: '截止时间', dataIndex: 'deadlineDisplay', key: 'deadlineDisplay', width: 100 },
  { title: '状态', dataIndex: 'displayStatus', key: 'displayStatus', width: 80 },
  { title: '学员', dataIndex: 'studentCount', key: 'studentCount', width: 60 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 60 },
]
```

### 数据层确认

- `PositionListItem` 接口已有 `companyName`(string) 字段 — **无需改 API/类型**
- 导出功能为后端 Excel 生成 — **不受影响**

---

## 3. 不修复项（记录备查）

| ID | 描述 | 原因 |
|----|------|------|
| 原型行业列 | 原型列表视图有"行业"列 | industry=company_type 冗余，无输入入口 |
| 筛选器布局 | 重置/搜索按钮位置略有差异 | 功能等效 |
| 弹窗必填标记 | 原型公司类别/官网/链接标`*` | 需产品确认，暂不动 |
| 下钻表头/数据不一致 | 原型自身问题 | 前端实现合理，不动 |
| tag 颜色差异 | 招聘周期蓝 vs 紫 | UI 渲染细节，不动 |

---

## 4. 验收标准

- [ ] AC1: 列表视图表头为 11 列：岗位名称、公司、部门、岗位分类、地区、招聘周期、发布时间、截止时间、状态、学员、操作
- [ ] AC2: "公司"列正确显示公司名称
- [ ] AC3: "部门"列保留展示
- [ ] AC4: 下钻视图不受影响
- [ ] AC5: 筛选器功能不受影响

---

## 5. 下钻视图颜色对齐原型

### 原型 vs 当前差异

| 元素 | 原型 | 当前实现 | 差异 |
|------|------|---------|------|
| 展开箭头颜色 | 行业色（IB:#92400E, Consulting:#7C3AED, Tech:#1D4ED8, PE/VC:#D97706） | 无颜色（继承默认） | ❌ |
| mdi 图标颜色 | 同上行业色 | 无颜色 | ❌ |
| 行业名文字颜色 | 同上行业色 | 无颜色 | ❌ |
| "X 家公司" tag | 行业色背景+白字圆角胶囊 | 统一 `a-tag color="orange"` | ❌ |
| "X 个岗位" tag | `var(--primary)` 背景+白字 | `a-tag color="purple"` | ≈ 接近 |
| 学员数 | 行业色文字 | 无颜色，仅 `font-weight:700` | ❌ |

### 修改方案

**文件**: `index.vue` (1处 script + 4处 template)

#### S1: 新增 tone→文字颜色映射 (script)

```typescript
const toneTextColor: Record<string, string> = {
  gold: '#92400E',
  violet: '#7C3AED',
  blue: '#1D4ED8',
  amber: '#D97706',
  slate: '#64748b'
}
```

#### T1: 箭头图标加行业颜色 (line 111)

```diff
- <i :class="['mdi', expandedIndustries.has(industry.industry) ? 'mdi-chevron-down' : 'mdi-chevron-right']" aria-hidden="true"></i>
+ <i :class="['mdi', expandedIndustries.has(industry.industry) ? 'mdi-chevron-down' : 'mdi-chevron-right']" :style="{ color: toneTextColor[getIndustryTone(industry.industry)] }" aria-hidden="true"></i>
```

#### T2: mdi 行业图标 + 行业名加颜色 (line 112-113)

```diff
- <i :class="['mdi', getIndustryIcon(industry.industry)]" aria-hidden="true"></i>
- <strong>{{ formatIndustry(industry.industry) }}</strong>
+ <i :class="['mdi', getIndustryIcon(industry.industry)]" :style="{ color: toneTextColor[getIndustryTone(industry.industry)] }" aria-hidden="true"></i>
+ <strong :style="{ color: toneTextColor[getIndustryTone(industry.industry)] }">{{ formatIndustry(industry.industry) }}</strong>
```

#### T3: "家公司" tag 改为行业色胶囊 (line 114)

```diff
- <a-tag color="orange">{{ industry.companyCount }} 家公司</a-tag>
+ <span :style="{ background: toneTextColor[getIndustryTone(industry.industry)], color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }">{{ industry.companyCount }} 家公司</span>
```

#### T4: 学员数加行业颜色 (line 120)

```diff
- <span style="font-size: 12px; font-weight: 700">{{ industry.studentCount }} 学员</span>
+ <span :style="{ fontSize: '12px', fontWeight: 700, color: toneTextColor[getIndustryTone(industry.industry)] }">{{ industry.studentCount }} 学员</span>
```

### 不修改项

| 元素 | 原因 |
|------|------|
| 渐变方向 90deg vs 135deg | 视觉差异极小 |
| "个岗位" tag | 当前 purple ≈ 原型 primary，接近 |
| "开放"/"已关闭" tag | 当前 green/default 与原型一致 |

### 验收标准

- [ ] AC6: 下钻行业行的箭头、图标、行业名颜色与原型一致（IB棕、Consulting紫、Tech蓝、PE/VC琥珀）
- [ ] AC7: "家公司" tag 为行业色背景+白字圆角胶囊
- [ ] AC8: 学员数文字使用行业对应颜色
