# 新增学员弹窗 — 原型 vs 当前实现比对

> 原型来源: `admin.html:7488-7751` (modal-add-student)
> 实现文件: `AddStudentModal.vue` (910行)

---

## 一、整体结构对比

| 维度 | 原型 | 当前实现 | 差距 |
|------|------|---------|------|
| **弹窗宽度** | 960px | 880px | 小差异 |
| **步骤模式** | 步骤指示器(1/2)，但基本信息和合同信息**同页滚动显示** | 真正的分步(step1/step2切换)，步骤间隐藏 | ⚠️ **结构差异大**：原型是单页长表单，实现是分步切页 |
| **header** | 渐变蓝色背景(`#7399C6→#5A7BA3`)，白色文字 | 自定义浅色背景 | 风格差异 |
| **footer** | "取消" + "创建学员账户" | "取消/返回上一步" + "下一步/提交学员" | 因分步模式不同 |

## 二、分区对比（原型6个区块 vs 实现的扁平grid）

### 原型区块布局：
```
1. 核心信息 — 蓝色边框卡片，突出显示（4列grid）
2. 导师配置 — 灰色卡片（2列grid）
3. 学业信息 — 灰色卡片（4列grid）
4. 求职方向 — 灰色卡片（内含子区块）
5. 联系方式 — 灰色卡片（2列grid）
6. 学生端账号 — 绿色边框卡片
7. 合同信息 — 黄色渐变header + 灰色卡片（3列grid）
```

### 当前实现布局：
```
Step 1: 扁平 2列grid，所有字段混排
  - 提示note
  - 步骤指示器
  - 所有字段平铺（无分区卡片）
  - 中间插入"求职方向"和"辅导归属"小标签
Step 2: 合同信息 2列grid
```

**差距**：原型有**明确的分区卡片**（核心信息/导师配置/学业信息/求职方向/联系方式/账号信息），每个区块有独立的背景、边框、badge标签。当前实现是扁平的grid平铺，缺少视觉层次。

## 三、字段逐项比对

### 3.1 核心信息区

| 字段 | 原型 | 实现 | 差距 |
|------|------|------|------|
| 英文姓名 * | `input` | `a-input` | ✅ 一致 |
| 性别 * | `select` (Male/Female) | `a-select` (男/女/其他) | ✅ 基本一致 |
| 邮箱 * | `input` (span 2列) | `a-input` (wide) | ✅ 一致 |

### 3.2 导师配置区

| 字段 | 原型 | 实现 | 差距 |
|------|------|------|------|
| 班主任 (可多选) | 自定义多选dropdown + 搜索 + checkbox列表 | `a-select mode="multiple"` | ✅ 功能一致，实现方式不同（Ant Design更好）|
| 助教 (可多选) | 同上 | `a-select mode="multiple"` | ✅ 同上 |
| **区块位置** | 紧跟核心信息后（第2区） | 排在求职方向之后 | ⚠️ **顺序不同** |

### 3.3 学业信息区

| 字段 | 原型 | 实现 | 差距 |
|------|------|------|------|
| 学校 * | `select`（字典下拉） | `a-select`（已改为字典） | ✅ 已修复 |
| 专业 * | `input` | `a-input` | ✅ 一致 |
| 毕业年份 * | `select` | `a-select` | ✅ 一致 |
| **高中** | `input`（选填） | ❌ **缺失** | 🔴 缺字段 |
| 是否读研/延毕 * | `select`（是/否） | `a-radio-group`（3项） | ⚠️ 原型是是/否，实现是3项 |
| 签证 | `input`（选填） | `a-select`（3项下拉） | ⚠️ 原型是自由输入，实现是下拉 |

### 3.4 求职方向区

| 字段 | 原型 | 实现 | 差距 |
|------|------|------|------|
| 求职地区 * | `select` 单选，7个选项（含城市） | `a-select`（字典4项，大区级） | ⚠️ 原型更细到城市，实现只到大区 |
| 招聘周期 * | **checkbox平铺**多选（4项） | `a-select mode="multiple"` | ⚠️ **交互不同**：原型是checkbox平铺可见所有选项，实现是下拉多选 |
| 主攻方向 * | **左侧checkbox列表**（4项，带icon），联动右侧子方向 | `a-select mode="multiple"` | ⚠️ **交互差异大**：原型是带icon的checkbox列表 + 联动面板 |
| 子方向 * | **右侧联动checkbox区**，按主攻方向分组显示，**多选** | `a-select` 单选 | 🔴 **原型是多选checkbox，实现是单选下拉** |

### 3.5 联系方式区

| 字段 | 原型 | 实现 | 差距 |
|------|------|------|------|
| 电话 * | `input`（**必填**） | `a-input`（选填） | ⚠️ 原型标必填 |
| 微信ID | `input`（选填） | `a-input`（选填） | ✅ 一致 |

### 3.6 学生端账号区（原型有，实现缺失）

| 字段 | 原型 | 实现 | 差距 |
|------|------|------|------|
| 登录账号 | disabled input，"自动使用邮箱" | ❌ 缺失 | 🔴 |
| 初始密码 | disabled input，"Osg@2025" | Step2 有类似字段 | ⚠️ 位置不同 |
| 提示信息 | 绿色提示框 | ❌ 缺失 | 🔴 |

### 3.7 合同信息区

| 字段 | 原型 | 实现 | 差距 |
|------|------|------|------|
| 合同金额 * | `input`（带¥前缀） | `a-input-number` | ✅ 基本一致 |
| 学习时长 * | `input`（带"个月"后缀） | `a-input-number`（标注"小时"） | ⚠️ **单位不同**：原型是"月"，实现是"小时" |
| 合同开始时间 * | `date input` | `a-date-picker` | ✅ 已修复 |
| 合同结束时间 * | `date input` | `a-date-picker` | ✅ 已修复 |
| **合同附件** | **文件上传区**（支持PDF/JPG/PNG） | `a-input`（文本输入链接） | 🔴 **差距大**：原型是真文件上传 |
| **备注** | `textarea` | ❌ 缺失 | 🔴 |

## 四、差距汇总（按优先级）

### 🔴 高优先级（功能缺失/错误）

| # | 问题 | 说明 |
|---|------|------|
| H1 | 子方向应为**多选** | 原型用checkbox多选，实现是单选下拉 |
| H2 | 缺少**高中**字段 | 原型有，实现没有 |
| H3 | 缺少**学生端账号**展示区 | 原型有登录账号+初始密码+提示 |
| H4 | 合同附件应为**文件上传** | 原型是拖拽上传区，实现是文本输入 |
| H5 | 缺少合同**备注** | 原型有textarea |
| H6 | 学习时长单位不一致 | 原型"月"，实现"小时" |

### ⚠️ 中优先级（交互/布局差异）

| # | 问题 | 说明 |
|---|------|------|
| M1 | 整体结构差异 | 原型是单页滚动，实现是分步切页 |
| M2 | 缺少分区卡片布局 | 原型有6个分区卡片(核心/导师/学业/求职/联系/账号)，实现是扁平grid |
| M3 | 招聘周期交互不同 | 原型是checkbox平铺，实现是下拉多选 |
| M4 | 主攻方向交互不同 | 原型是checkbox列表+icon+联动面板，实现是普通多选下拉 |
| M5 | 区块顺序不同 | 原型：核心→导师→学业→求职→联系→账号→合同；实现：核心→联系→学业→求职→导师→合同 |
| M6 | 电话必填差异 | 原型必填，实现选填 |
| M7 | 求职地区粒度 | 原型到城市(7项)，实现到大区(4项) |

### 🟢 低优先级（视觉细节）

| # | 问题 | 说明 |
|---|------|------|
| L1 | header渐变色差异 | 原型蓝灰渐变，实现浅色 |
| L2 | 弹窗宽度 | 原型960px，实现880px |
| L3 | grid列数差异 | 原型核心信息4列、学业4列、合同3列；实现统一2列 |

## 五、建议修复顺序

### 第一轮：功能补全
1. 子方向改为多选 (`a-select mode="multiple"`)
2. 新增"高中"字段
3. 新增"学生端账号"展示区
4. 学习时长单位对齐（需确认业务：月 or 小时？）
5. 合同备注字段

### 第二轮：布局重构
6. 改为单页滚动（去掉分步切页）
7. 加入分区卡片（核心信息/导师配置/学业信息/求职方向/联系方式/账号信息/合同信息）
8. 调整区块顺序与原型一致
9. 调整grid列数（核心信息4列、学业4列、合同3列）

### 第三轮：交互优化（可选）
10. 招聘周期改为checkbox平铺
11. 主攻方向+子方向改为联动面板
12. 合同附件改为文件上传

### 暂不处理
- header渐变色（视觉细节）
- 弹窗宽度微调
- 求职地区城市粒度（需要新增字典数据）

---

## 六、第一轮详细修改方案（H1/H2/H3/H5/H6）

> H4（文件上传）需后端上传接口，放到第三轮。
> 本轮改动文件：`AddStudentModal.vue`（938行）
> 分 4 批执行，避免单次改动过大。

### 批次 A：interface + formState + resetForm + createPayload + rules（script 数据层）

**A1. interface 修改** (L394-417)

```diff
- subDirection?: string
+ subDirections: string[]
```
```diff
  school: string
  major: string
+ highSchool?: string
  graduationYear?: number
```
```diff
- totalHours?: number
+ totalMonths?: number
```
```diff
  initialPassword?: string
  contractAttachment?: string
+ contractRemark?: string
```

**A2. formState 初始值** (L502-525)

```diff
- subDirection: undefined,
+ subDirections: [],
```
```diff
  school: '',
  major: '',
+ highSchool: undefined,
  graduationYear: undefined,
```
```diff
- totalHours: undefined,
+ totalMonths: undefined,
```
```diff
  contractAttachment: undefined
+ contractRemark: undefined
```

**A3. resetForm** (L542-565)

```diff
- formState.subDirection = props.initialValue?.subDirection
+ formState.subDirections = props.initialValue?.subDirections ?? []
```
```diff
  formState.major = props.initialValue?.major ?? ''
+ formState.highSchool = props.initialValue?.highSchool
  formState.graduationYear = props.initialValue?.graduationYear
```
```diff
- formState.totalHours = props.initialValue?.totalHours
+ formState.totalMonths = props.initialValue?.totalMonths
```
```diff
  formState.contractAttachment = props.initialValue?.contractAttachment
+ formState.contractRemark = props.initialValue?.contractRemark
```

**A4. createPayload** (L597-620)

```diff
- subDirection: formState.subDirection,
+ subDirections: [...formState.subDirections],
```
```diff
  major: formState.major.trim(),
+ highSchool: formState.highSchool,
  graduationYear: formState.graduationYear,
```
```diff
- totalHours: formState.totalHours,
+ totalMonths: formState.totalMonths,
```
```diff
  contractAttachment: formState.contractAttachment
+ contractRemark: formState.contractRemark
```

**A5. rules** (L527-539)

```diff
- totalHours: [{ required: true, message: '请输入学习时长', trigger: 'change' }],
+ totalMonths: [{ required: true, message: '请输入学习时长', trigger: 'change' }],
```

**A6. validateStepOne** (L622-633)

```diff
- if (!formState.subDirection) {
-   message.error('请选择子方向')
+ if (!formState.subDirections.length) {
+   message.error('请至少选择一个子方向')
```

**A7. handlePrimaryAction validate** (L651)

```diff
- await formRef.value?.validate(['contractAmount', 'totalHours', 'startDate', 'endDate'])
+ await formRef.value?.validate(['contractAmount', 'totalMonths', 'startDate', 'endDate'])
```

---

### 批次 B：template Step1 改动（子方向多选 + 高中字段 + 账号展示区）

**B1. 子方向改多选** (L228-242)

```diff
  <a-form-item name="subDirection" ...>
-   <a-select
-     v-model:value="formState.subDirection"
-     placeholder="请选择子方向"
+   <a-select
+     v-model:value="formState.subDirections"
+     mode="multiple"
+     placeholder="可多选"
```

**B2. 学校后插入高中字段** (L127之后)

插入：
```html
<a-form-item name="highSchool" data-field-name="高中">
  <template #label>
    <span class="add-student-modal__label">高中</span>
  </template>
  <a-input
    v-model:value="formState.highSchool"
    placeholder="选填"
    allow-clear
  />
</a-form-item>
```

**B3. 辅导归属区之后（助教字段后 L281），插入学生端账号展示区**

在 `</div><!-- end step1 grid -->` 前插入：
```html
<div class="add-student-modal__field--wide">
  <div class="add-student-modal__section-badge add-student-modal__section-badge--green">
    <i class="mdi mdi-account-key" aria-hidden="true"></i> 学生端账号
  </div>
  <span class="add-student-modal__section-desc">创建学员后将自动生成学生端登录账号</span>
</div>

<a-form-item data-field-name="登录账号">
  <template #label>
    <span class="add-student-modal__label">登录账号</span>
  </template>
  <a-input
    :value="formState.email || '自动使用邮箱作为登录账号'"
    disabled
  />
</a-form-item>

<a-form-item data-field-name="初始密码">
  <template #label>
    <span class="add-student-modal__label">初始密码</span>
  </template>
  <a-input
    value="Osg@2025"
    disabled
  />
</a-form-item>

<div class="add-student-modal__field--wide add-student-modal__account-tip">
  <i class="mdi mdi-information" aria-hidden="true"></i>
  <span><strong>提示：</strong>学员创建成功后，系统将自动生成学生端账号。默认密码为 <strong>Osg@2025</strong>，学员首次登录后建议修改密码。</span>
</div>
```

---

### 批次 C：template Step2 改动（学习时长单位 + 备注 + 移除初始密码）

**C1. 学习时长标签+字段名** (L307-321)

```diff
- <a-form-item name="totalHours" data-field-name="学习时长（小时）">
+ <a-form-item name="totalMonths" data-field-name="学习时长（月）">
    <template #label>
      <span class="add-student-modal__label">
-       学习时长（小时）
+       学习时长（月）
        ...
    </template>
    <a-input-number
-     v-model:value="formState.totalHours"
+     v-model:value="formState.totalMonths"
```

**C2. 删除 Step2 初始密码字段** (L344-353)

删除整个 `<a-form-item name="initialPassword">` 区块（已移到 Step1 账号区）。

**C3. 合同附件后面插入备注** (L364之后)

```html
<a-form-item name="contractRemark" data-field-name="合同备注" class="add-student-modal__field--wide">
  <template #label>
    <span class="add-student-modal__label">备注</span>
  </template>
  <a-textarea
    v-model:value="formState.contractRemark"
    placeholder="选填，可填写特殊约定等"
    :rows="2"
    allow-clear
  />
</a-form-item>
```

---

### 批次 D：CSS 补充

**D1. 新增绿色 badge 样式**

```scss
.add-student-modal__section-badge--green {
  background: #dcfce7;
  color: #166534;
}
```

**D2. 新增账号提示框样式**

```scss
.add-student-modal__account-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  background: #dcfce7;
  border-radius: 8px;
  font-size: 11px;
  color: #166534;
  line-height: 1.5;
}
```

---

### 改动统计

| 批次 | 改动数 | 说明 |
|------|--------|------|
| A | 7处 | script 数据层：interface/formState/resetForm/createPayload/rules/validate |
| B | 3处 | template Step1：子方向多选/高中字段/账号展示区 |
| C | 3处 | template Step2：时长单位/删初始密码/加备注 |
| D | 2处 | CSS：绿色badge+提示框样式 |
| **合计** | **15处** | |
