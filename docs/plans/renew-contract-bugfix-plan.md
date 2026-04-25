# 续签合同全链路 BUG 修复方案（Final v4）

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

---

## 一、目标

### 一句话

修复续签合同全链路 **7 个 BUG**（含展示层 + 学员合同详情接口字段補齐），让从前端填写→提交→后端保存→DB 写入→后端读出→前端展示的完整链路跑通且数据正确。

### 验收标准

1. ✅ Chrome 中打开续签弹窗，填写所有必填字段，点击"保存续签合同"，成功创建合同（无"合同起止日期不能为空"错误）
2. ✅ DB 中新合同记录的 `currency`、`amount_usd`、`amount_gbp` 字段有值（不为 NULL/默认值）
3. ✅ 开始日期默认**当天**（本地时区）；结束日期默认 **startDate 年份+1 的 5-31**；两者均必填
4. ✅ 课时字段默认**空**，UI label 显示 **"新增课时 / New Hours"**，用户必填
5. ✅ `contractAmount` 字段写入 DB 的值 **= amountUsd**（无论 USD 还是 GBP 合同），不再是 `amountUsd + amountGbp`
6. ✅ 凌晨（UTC+8 的 00:00~07:59）打开弹窗，默认开始日期显示**本地今天**（不是 UTC 昨天）
7. ✅ 续签原合同 currency 为 null、amountGbp > 0 时，新表单默认币种识别为 GBP（不是 USD）
8. ✅ **展示层**：学员档案 Tab / 学员详情弹窗 / 合同详情弹窗 — GBP 合同显示 `£5000 ($6500 等值)`，USD 合同显示 `$5000`（不再出现 `¥`）
9. ✅ 后端 `/admin/student/{id}/contracts` 接口 JSON 响应包含 `currency` / `amountUsd` / `amountGbp` 字段（展示层和 resolveCurrency 的数据源）

---

## 二、前置条件与假设

- **假设 1**：DB schema `end_date DATE NOT NULL` 不修改（避免影响范围过大）
- **假设 2**：`contractType` 保持硬编码 `renew`（业务规则待确认，本次不改）
- **假设 3**：`amountUsd` 和 `amountGbp` 在 GBP 合同时是**同一笔金额的两种表达**（英镑原值 + 当下汇率美元等值），不是相加关系
- **假设 4**：合同金额 `amountUsd / amountGbp` 在业务上必须 > 0（0 金额合同不合法）
- **假设 5**：历史数据兼容 — 可能存在 `currency` 为空但 `amountGbp > 0` 的老合同，本次通过 `resolveCurrency` 防御性回落兼容；老合同若 contractAmount 计算错误，用户将择机手动清理（本次不做数据 migration）
- **假设 6**：`AddStudentModal.vue` 的 endDate 默认值 `${currentYear + 1}-05-31` 已正确（用 `getFullYear()` 本地时区），本次不动；startDate 本就是 undefined（用户必填）

---

## 三、产品规则总表

| # | 字段 | 默认值 | 必填 | 说明 |
|---|------|--------|------|------|
| 1 | 开始日期 | 本地今天（dayjs().format('YYYY-MM-DD')） | ✅ | 续签合同从今天生效 |
| 2 | 结束日期 | `${本地今年 + 1}-05-31` | ✅ | 贴合毕业季（5-31） |
| 3 | 课时（新增课时） | 空 | ✅ | 本次续签**新增**课时数 |
| 4 | 币种 | 原合同 currency / GBP (若 amountGbp>0) / USD | ✅ | 续签三级回落：currency → amountGbp → USD |
| 5 | amountUsd | 空 | ✅ | 美元金额；GBP 合同时填"当下汇率美元等值"；必须 > 0 |
| 6 | amountGbp | 空 | ✅ (仅 GBP 合同) | 英镑金额，必须 > 0 |
| 7 | contractAmount | `= amountUsd`（自动计算） | - | 美元等值单位，便于 `SUM` 汇总 |
| 8 | 续签原因 | 空 | ✅ | 5 选 1 + 其他（填文本） |
| 9 | 合同附件 | 空 | ❌ | PDF 可选 |
| 10 | 备注 | 空 | ❌ | 自由文本可选 |

### 展示层规则

| 场景 | USD 合同 | GBP 合同 |
|------|----------|---------|
| 合同列表金额列 | `$5000` | `£5000 / $6500 等值`（已正确，本次不改） |
| 学员档案 Tab 金额列 | `$5000` | `£5000 ($6500 等值)` |
| 学员详情弹窗合同金额 | `$5000` | `£5000 ($6500 等值)` |
| 合同详情弹窗金额列 | `$5000` | `£5000 ($6500 等值)` |
| 学员档案 Tab summary.totalAmount | `$xxxx`（所有合同美元等值汇总） | 同 |

---

## 四、现状分析

### 数据流

```
RenewContractModal.vue（前端续签弹窗）
  → form reactive
  → handleSubmit() 构建 payload
  → renewContract(payload) → POST /api/admin/contract/renew
  → Vite proxy → http://127.0.0.1:28080/admin/contract/renew
  → OsgContractController.renew() → contractService.renewContract(body, username)
  → OsgContractServiceImpl.renewContract(payload, operator)
    - asDate() 解析日期
    - new OsgContract() + set 各字段
  → contractMapper.insertContract(contract) → OsgContractMapper.xml INSERT SQL
  → DB: osg_contract 表
  → getStudentContractDetail / getContractList → 前端展示层（3 个组件）
```

### 相关文件清单

| 层 | 文件 | 作用 |
|----|------|------|
| 前端组件（续签） | `osg-frontend/packages/admin/src/views/users/contracts/components/RenewContractModal.vue` | 续签弹窗 UI + 表单 + 提交 |
| 前端组件（新增） | `osg-frontend/packages/admin/src/views/users/students/components/AddStudentModal.vue` | 新增学员 + 创建初始合同 |
| 前端展示（学员档案 Tab） | `osg-frontend/packages/admin/src/views/users/students/components/ContractTab.vue` | 学员档案中的合同 Tab |
| 前端展示（学员详情弹窗） | `osg-frontend/packages/admin/src/views/users/students/components/StudentDetailModal.vue` | 学员详情弹窗 |
| 前端展示（合同详情弹窗） | `osg-frontend/packages/admin/src/views/users/contracts/components/ContractDetailModal.vue` | 合同详情弹窗 |
| 前端 API | `osg-frontend/packages/shared/src/api/admin/contract.ts` | RenewContractPayload 类型 + renewContract() |
| 后端 Controller | `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgContractController.java` | `/admin/contract/renew` 入口 |
| 后端 Service（续签） | `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgContractServiceImpl.java` | renewContract() 业务逻辑 |
| 后端 Service（新增） | `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStudentServiceImpl.java` | createStudentWithContract() |
| Mapper XML | `ruoyi-system/src/main/resources/mapper/system/OsgContractMapper.xml` | insertContract SQL |
| DB Schema | `deploy/mysql-init/08_osg_contract_init.sql` | osg_contract 表定义 |

### 存在的问题（7 个 BUG）

| # | 严重度 | BUG | 根因 |
|---|--------|-----|------|
| **B1** | 🔴 | 日期格式不兼容，后端报"合同起止日期不能为空" | 前端 dayjs 对象 JSON 序列化为 `"2026-04-08T00:00:00.000+08:00"`；后端 `LocalDate.parse()` 只支持严格 `YYYY-MM-DD`，解析失败返回 null |
| **B2** | 🔴 | currency / amountUsd / amountGbp 未写入 DB | `OsgContractServiceImpl.renewContract()` L130-145 缺少 `setCurrency` / `setAmountUsd` / `setAmountGbp` 调用 |
| **B3** | 🔴 | 初始日期默认值错误 + 时区 bug + 币种回落错 | startDate 取原合同（错）；endDate 取原合同或 +90 天（错）；`toISOString().slice(0,10)` 在凌晨返回 UTC 昨天；`currency === 'GBP' ? 'GBP' : 'USD'` 不处理 null currency 老数据 |
| **B4** | 🟡 | 课时字段默认硬编码 20 / 原合同值，label 含义模糊 | `resetForm()` 设 `form.totalHours = 20` 或 `presetContract.totalHours`；label `Learn Time (小时)` 语义不明 |
| **B5** | 🔴 | contractAmount 计算逻辑错误 | 前端 `GBP ? amountUsd + amountGbp : amountUsd` — 英镑数值+美元数值相加，单位混乱；后端兜底同错 |
| **B6** | 🔴 | 展示层硬编码 `¥` 人民币符号 | `ContractTab.vue` / `StudentDetailModal.vue` / `ContractDetailModal.vue` 的 `formatCurrency` 都用 `¥`，修复 B5 后配合 `¥` 显示会更混乱 |
| **B7** | 🔴 | 后端学员合同详情接口不返回币种字段 | `OsgStudentServiceImpl.java:350-363` 的 `studentContracts()` 循环构建 row 时未 `put` currency/amountUsd/amountGbp，导致前端 resolveCurrency（B3）和展示层分币种渲染（B6）都拿不到数据。实施中发现，与 B2（写入端）互补 |

---

## 五、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| D1 | B1 日期格式修复层 | A: 只改前端 / B: 只改后端 / C: 前后端都改 | **C** | 前端 `.slice(0,10)` 治标；后端 `asDate()` 加 `indexOf('T')` + 多格式 fallback 治本 |
| D2 | B3 startDate 默认值 | A: 当天 / B: 原合同 startDate | **A** | 用户决策：续签合同从今天生效 |
| D3 | B3 endDate 默认值 | A: +90 天 / B: +1 年 / C: startDate 年份+1 的 5-31 | **C** | 用户决策：贴合毕业季 |
| D4 | B3 时区修复实现 | A: 本地 Date 手动拼接 / B: dayjs().format | **B** | 项目已依赖 dayjs |
| D5 | endDate 必填性 | A: 必填 / B: 选填后端兜底 | **A** | 用户决策：合同必须有明确期限 |
| D6 | B4 课时默认值 | A: 20 / B: 原合同 totalHours / C: 空 | **C** | 用户决策：避免用户忘改 |
| D7 | B4 课时语义 | A: 新增课时 / B: 续签后总课时 | **A** | 用户决策：符合"卖课时"商业直觉 |
| D8 | B5 contractAmount 计算 | A: amountUsd + amountGbp / B: = amountUsd / C: 按 currency 取原币种 | **B** | 用户决策：美元统一记账单位 |
| D9 | 老数据是否 migration | A: 写 SQL 修复 / B: 不做，用户择机清理 | **B** | 用户决策：测试数据手动清理 |
| D10 | 0 金额是否合法 | A: 合法 / B: 非法（代码+UI 拦截） | **B** | 业务假设 4，代码用 `Number.isFinite && > 0` 兜底 |
| D11 | 币种回落策略 | A: 只看 currency / B: currency + amountGbp 联合 | **B** | 兼容 currency=null 的老数据 |
| D12 | 部署顺序 | A: 前端先 / B: 后端先 / C: 任意 | **B** | 后端先上修复 B1/B2；前端再补齐 B3/B4/B5/B6/B7 |
| D13 | B6 展示层修复范围 | A: 本次修 / B: 加验收条款 / C: Phase 2 | **A** | 用户决策：避免上线即困惑，修复 contractAmount 语义必须同步展示层 |
| D14 | B6 summary 汇总金额币种 | A: 随首个合同币种 / B: 固定 USD（美元等值总额） | **B** | 混合币种汇总只有美元等值有业务意义 |

---

## 六、目标状态

### 修复后的前端 `RenewContractModal.vue` 关键伪代码

```typescript
import dayjs from 'dayjs'
import type { ContractListItem } from '@osg/shared/api/admin/contract'

// ------ 币种回落（D11 / P4）------
const resolveCurrency = (preset: ContractListItem | null | undefined): 'USD' | 'GBP' => {
  if (preset?.currency === 'GBP') return 'GBP'
  if (preset?.currency === 'USD') return 'USD'
  if (preset && Number(preset.amountGbp) > 0) return 'GBP'
  return 'USD'
}

// ------ resetForm（D2 / D3 / D4 / D6）------
const resetForm = () => {
  const todayStr = dayjs().format('YYYY-MM-DD')
  const nextYearMay31 = `${new Date().getFullYear() + 1}-05-31`
  form.studentId = presetContract.value ? String(presetContract.value.studentId) : ''
  form.currency = resolveCurrency(presetContract.value)
  form.amountUsd = undefined
  form.amountGbp = undefined
  form.totalHours = undefined
  form.startDate = todayStr
  form.endDate = nextYearMay31
  form.renewalReason = ''
  form.otherReason = ''
  form.attachmentPath = ''
  form.remark = ''
  submitting.value = false
  fileList.value = []
}

// ------ handleSubmit（B1 / B5 / D10）------
const toFiniteNumber = (v: unknown): number | undefined => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}
const amountUsd = toFiniteNumber(form.amountUsd)
const amountGbp = toFiniteNumber(form.amountGbp)
const contractAmount = amountUsd ?? 0

await renewContract({
  studentId,
  currency: form.currency,
  amountUsd,
  amountGbp: form.currency === 'GBP' ? amountGbp : undefined,
  contractAmount,
  totalHours: toFiniteNumber(form.totalHours) ?? 0,
  startDate: String(form.startDate).slice(0, 10),
  endDate: String(form.endDate).slice(0, 10),
  renewalReason: form.renewalReason,
  otherReason: form.otherReason.trim() || undefined,
  attachmentPath: form.attachmentPath || undefined,
  remark: form.remark.trim() || undefined,
})
```

### 修复后的后端 `asDate()` 伪代码（B1 / P3）

```java
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

private LocalDate asDate(Object value) {
    if (value == null) return null;
    if (value instanceof Date sqlDate) return sqlDate.toLocalDate();
    if (value instanceof java.util.Date utilDate) return new Date(utilDate.getTime()).toLocalDate();
    String text = String.valueOf(value);
    int tIdx = text.indexOf('T');
    if (tIdx > 0) text = text.substring(0, tIdx);
    try {
        return LocalDate.parse(text);
    } catch (DateTimeParseException e) {
        try {
            return LocalDate.parse(text, DateTimeFormatter.ofPattern("yyyy-M-d"));
        } catch (DateTimeParseException ex) {
            return null;
        }
    }
}
```

### 修复后的展示层 `formatCurrency` 伪代码（B6）

```typescript
// 统一规范（3 个展示文件共用此模式）
const formatCurrency = (value?: number, currency: string = 'USD') => {
  const num = Number(value || 0)
  if (currency === 'GBP') return `£${num.toLocaleString()}`
  return `$${num.toLocaleString()}`
}

// GBP 合同在表格金额列的渲染（使用 td 内 template）
// USD: 直接 {{ formatCurrency(contract.amountUsd, contract.currency) }}
// GBP: 显示 £amountGbp + ($amountUsd 等值)
```

---

## 七、执行清单（27 项，6 个文件）

### 前端 `RenewContractModal.vue`（11 处）

| # | 位置 | 当前值 | 目标值 | BUG |
|---|------|--------|--------|-----|
| E1 | L109 label | `Learn Time (小时)` | `新增课时 / New Hours` | B4 |
| E2 | L119 placeholder | `"如 40"` | `"如 50（本次新增课时数）"` | B4 |
| E3 | L278 reactive | `totalHours: 20` | `totalHours: undefined as number \| undefined` | B4 |
| E4 | L299 | `const after90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)` | 删除 | B3 |
| E5 | L304 | `form.totalHours = presetContract.value?.totalHours ? Number(...) : 20` | `form.totalHours = undefined` | B4 |
| E6 | L305 | `form.startDate = presetContract.value?.startDate \|\| today.toISOString().slice(0, 10)` | `form.startDate = dayjs().format('YYYY-MM-DD')` | B3 |
| E7 | L306 | `form.endDate = presetContract.value?.endDate \|\| after90Days.toISOString().slice(0, 10)` | `form.endDate = \`${new Date().getFullYear() + 1}-05-31\`` | B3 |
| E8 | L303 currency | `form.currency = presetContract.value?.currency === 'GBP' ? 'GBP' : 'USD'` | `form.currency = resolveCurrency(presetContract.value)`；顶部新增 resolveCurrency() 函数 | B3 |
| E9 | L361-362 + L370 | `const amountUsd = Number(form.amountUsd \|\| 0); const amountGbp = Number(form.amountGbp \|\| 0)`；payload `totalHours: Number(form.totalHours \|\| 0)` | 新增 `toFiniteNumber()` 工具函数；`const amountUsd = toFiniteNumber(form.amountUsd); const amountGbp = toFiniteNumber(form.amountGbp)`；payload 改为 `totalHours: toFiniteNumber(form.totalHours) ?? 0` | B5 |
| E10 | L363 | `const contractAmount = form.currency === 'GBP' ? amountUsd + amountGbp : amountUsd` | `const contractAmount = amountUsd ?? 0` | B5 |
| E11 | L371-372 | `startDate: form.startDate,` / `endDate: form.endDate,` | `startDate: String(form.startDate).slice(0, 10),` / `endDate: String(form.endDate).slice(0, 10),` | B1 |

**依赖**：E6 需确保 `import dayjs from 'dayjs'`（如未 import）

### 前端 `AddStudentModal.vue`（1 处）

| # | 位置 | 当前值 | 目标值 | BUG |
|---|------|--------|--------|-----|
| E12 | L786-788 | `contractAmount: formState.currency === 'GBP' ? (amountUsd \|\| 0) + (amountGbp \|\| 0) : (amountUsd \|\| 0)` | `contractAmount: formState.amountUsd \|\| 0` | B5 |

### 前端 `ContractTab.vue`（3 处）

| # | 位置 | 当前值 | 目标值 | BUG |
|---|------|--------|--------|-----|
| E13 | L65-76 ContractRow 接口 | 缺 currency/amountUsd/amountGbp | 新增字段 `currency?: string; amountUsd?: number; amountGbp?: number` | B6 |
| E14 | L83-85 formatCurrency | `return \`¥${Number(value \|\| 0).toLocaleString('zh-CN', ...)}\`` | 改为接受 `currency` 参数，USD 返回 `$xxx`，GBP 返回 `£xxx` | B6 |
| E15 | L38 td 金额列 | `{{ formatCurrency(contract.contractAmount) }}` | GBP 合同显示 `£amountGbp ($amountUsd 等值)`；USD 合同显示 `$amountUsd`；summary 用 `{{ formatCurrency(summary.totalAmount, 'USD') }}` | B6 |

### 前端 `StudentDetailModal.vue`（3 处）

| # | 位置 | 当前值 | 目标值 | BUG |
|---|------|--------|--------|-----|
| E16 | L358-364 合同接口 | 缺 currency/amountUsd/amountGbp | 新增字段 | B6 |
| E17 | L499 数据映射 | `contractAmount: Number(contract.contractAmount \|\| 0),` | 同时加 `currency: contract.currency, amountUsd: Number(contract.amountUsd \|\| 0), amountGbp: Number(contract.amountGbp \|\| 0),` | B6 |
| E18 | L651-653 formatCurrency | `return \`¥${Number(value \|\| 0).toLocaleString('zh-CN', ...)}\`` | 改为接受 `currency` 参数分币种显示 | B6 |

### 前端 `ContractDetailModal.vue`（2 处）

| # | 位置 | 当前值 | 目标值 | BUG |
|---|------|--------|--------|-----|
| E19 | L191-197 formatCurrency | 用 `Intl.NumberFormat` + `currency: 'CNY'` | 改为分币种：USD 返回 `$xxx`，GBP 返回 `£xxx` | B6 |
| E20 | L74 td 金额列 | `{{ formatCurrency(contract.contractAmount) }}` | GBP 合同显示 `£amountGbp ($amountUsd 等值)`；USD 合同显示 `$amountUsd`（使用 `contract.currency` 判断） | B6 |

### 后端 `OsgContractServiceImpl.java`（5 处）

| # | 位置 | 当前值 | 目标值 | BUG |
|---|------|--------|--------|-----|
| E21 | L411-433 `asDate()` | `return LocalDate.parse(String.valueOf(value));` | 用 `indexOf('T')` + 多格式 fallback（见上方伪代码） | B1 |
| E22 | `renewContract()` L133 后插入 | 无 | `contract.setCurrency(defaultText(asText(payload.get("currency")), "USD"));` | B2 |
| E23 | 同上 | 无 | `contract.setAmountUsd(asBigDecimalOrNull(payload.get("amountUsd")));` | B2 |
| E24 | 同上 | 无 | `contract.setAmountGbp(asBigDecimalOrNull(payload.get("amountGbp")));` | B2 |
| E25 | L409 `asBigDecimal()` 之后 | 无 | 新增 `asBigDecimalOrNull()` 方法 | B2 |

**依赖**：E21 需 `import java.time.format.DateTimeFormatter` 和 `import java.time.format.DateTimeParseException`

### 后端 `OsgStudentServiceImpl.java`（2 处）

| # | 位置 | 当前值 | 目标值 | BUG |
|---|------|--------|--------|-----|
| E26 | L419-421 兜底 | `BigDecimal usd = ...; BigDecimal gbp = ...; contract.setContractAmount(usd.add(gbp));` | `contract.setContractAmount(contract.getAmountUsd() == null ? BigDecimal.ZERO : contract.getAmountUsd());` | B5 |
| E27 | L353 `row.put("contractType", ...)` 之后 | 无 | 补 3 行：`row.put("currency", contract.getCurrency()); row.put("amountUsd", contract.getAmountUsd()); row.put("amountGbp", contract.getAmountGbp());` | B7 |

---

## 八、部署顺序（D12）

### 兼容性矩阵

| 场景 | 前端 payload | 后端处理 | 兼容？ |
|------|--------------|----------|--------|
| 后端新 + 前端旧 | 旧 payload (`contractAmount=usd+gbp`) + 日期 ISO 带时区 | 新 asDate 解析，新 setCurrency/Usd/Gbp 保存；contractAmount 仍是旧错值 | ⚠️ 部分生效 |
| 后端旧 + 前端新 | 新 payload (`contractAmount=amountUsd`) + 日期已 slice | 旧 asDate 能解析（前端已 slice），但不存 currency/Usd/Gbp | ⚠️ 部分生效 |
| 后端新 + 前端新 | 新 payload | 全部修复 | ✅ 完整 |

### 推荐部署顺序：**后端先 → 前端后**

1. 后端先上 → B1（日期格式）+ B2（币种字段）立刻生效
2. 前端再上 → 补齐 B3/B4/B5/B6（默认值 + contractAmount + 展示层）
3. 中间窗口期警告：**中间态产生的合同，在前端上线前不要用于任何统计或对账**

---

## 九、Phase 2 实施前预检（I4）

实施前需执行一次确认：

```bash
# 检查现有 contractType 分布，确认 "renew" 是否混有应该是 "supplement" 的记录
mysql -h 47.94.213.128 -P 23306 -u ruoyi -p'app123456' ry-vue -e \
  "SELECT contract_type, COUNT(*) FROM osg_contract GROUP BY contract_type;"
```

若发现异常（如 `renew` 占比不合理），实施前向用户确认是否在本次一并处理。

---

## 十、自校验结果

### 第 1 轮（通用 + 代码维度）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 7 BUG + 27 执行项，每项精确定位 |
| G2 目标明确 | ✅ | 9 条可度量验收标准 |
| G3 假设显式 | ✅ | 6 条前置假设已列出（假设 5 措辞已修正） |
| G4 设计决策完整 | ✅ | 14 个决策点（新增 D13/D14） |
| G5 执行清单可操作 | ✅ | 每项有文件、行号、当前值、目标值 |
| G6 正向流程走读 | ✅ | 填写→提交→后端解析→DB 写入→展示层，每步有对应修复 |
| G7 改动自洽 | ✅ | B5 后端改法 + 前端 contractAmount 改法 + 展示层 B6 闭环 |
| G8 简约不等于省略 | ✅ | 3 个前端工具函数（asBigDecimalOrNull / toFiniteNumber / resolveCurrency）保证语义正确 |
| G9 场景模拟 | ✅ | 7 个场景 |
| G10 数值回验 | ✅ | 7 BUG + 27 执行项 + 6 文件 + 14 决策点 = 匹配 |
| G11 引用回读 | ✅ | 所有行号已通过 read_file 确认 |
| G12 反向推导 | ✅ | 从 DB 字段反推所有写入点 + 从 UI 反推所有展示点 |
| C1 根因定位 | ✅ | B1 格式+单数字；B2 缺 set；B3 默认值+时区+回落；B4 语义；B5 计算；B6 展示层硬编码；B7 读取端缺 put |
| C2 接口兼容 | ✅ | RenewContractPayload 不变；ContractRow 新增字段（可选）不破坏兼容 |
| C3 回归风险 | ✅ | asDate 向后兼容；contractAmount 仅影响新建；展示层扩展字段为可选 |
| C4 测试覆盖 | ⚠️ 手动 | 建议修复后在 Chrome 走 7 个场景验证 |

### 第 2 轮（边界场景维度）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| 边界 1: USD 合同，不填 amountGbp | ✅ | undefined，payload 不含字段，mapper `<if>` 跳过，DB 存 NULL |
| 边界 2: GBP 合同，填了 amountGbp | ✅ | 后端 setAmountGbp 写入 |
| 边界 3: 课时填 0 | ✅ | UI `:min=1` + 表单 required + toFiniteNumber 三道防线 |
| 边界 4: endDate 早于 startDate | ✅ | 后端校验已有 |
| 边界 5: startDate = 12-31 | ✅ | endDate 算法 `${year+1}-05-31` 仍正确 |
| 边界 6: 凌晨 01:00 打开弹窗 | ✅ | dayjs() 返回本地时间 |
| 边界 7: 前端传单数字月日 `2026-4-8` | ✅ | asDate 第二轮 fallback 能解析 |
| 边界 8: 老合同 currency=null, amountGbp=5000 | ✅ | resolveCurrency 返回 GBP |
| 边界 9: amountUsd 传 0 | ✅ | toFiniteNumber 返回 undefined |
| 边界 10: amountUsd 传 "abc" | ✅ | NaN → isFinite false → undefined |
| 边界 11: 展示层 GBP 合同但 amountGbp 为 null | ✅ | 显示 `£0` 且 `$amountUsd 等值`（数据异常可见） |
| 边界 12: 展示层 currency 字段缺失 | ✅ | formatCurrency 默认 USD，显示 `$contractAmount` |

### 第 3 轮（交叉影响维度）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| 交叉 1: AddStudentModal 改 contractAmount 影响列表显示吗？ | ✅ | 合同列表分币种显示（没用 contractAmount）；学员详情/档案本次也修复 |
| 交叉 2: asDate 改后，AddStudent 流程受影响吗？ | ✅ | AddStudent 走 `OsgStudentServiceImpl.asDate`（未改） |
| 交叉 3: asBigDecimalOrNull vs 现有 asBigDecimal | ✅ | 新方法私有，不影响现有调用 |
| 交叉 4: 前端 amountUsd=undefined 的链路 | ✅ | JSON 跳过 → 后端 null → mapper `<if>` 跳过 |
| 交叉 5: resolveCurrency 对 USD 合同正常工作 | ✅ | presetContract.currency='USD' → 返回 USD |
| 交叉 6: 部署中间态（后端新前端旧） | ⚠️ 已论证 | contractAmount 临时错，清理测试数据时一并处理 |
| 交叉 7: 3 个展示组件 formatCurrency 统一规则 | ✅ | 采用相同模式（USD $ / GBP £），UI 一致 |
| 交叉 8: ContractTab summary.totalAmount 币种 | ✅ | D14 决策：固定 USD（美元等值汇总） |

### 场景模拟

**场景 1: USD 续签**
- 输入：Peter、USD、amountUsd=$5000、课时=50、startDate=今天、endDate=明年5-31
- payload: `{currency:"USD", amountUsd:5000, contractAmount:5000, totalHours:50, startDate:"2026-04-17", endDate:"2027-05-31", ...}`
- 后端：setCurrency("USD") / setAmountUsd(5000) / setAmountGbp(null) → INSERT
- DB: `currency='USD', amount_usd=5000, amount_gbp=NULL, contract_amount=5000`
- 展示：`ContractTab` 合同行 `$5000`；summary 累加 `$5000`
- ✅ 通过

**场景 2: GBP 续签**
- 输入：Peter、GBP、amountGbp=£5000、amountUsd=$6500（等值）
- payload: `{currency:"GBP", amountUsd:6500, amountGbp:5000, contractAmount:6500, ...}`
- DB: `currency='GBP', amount_usd=6500, amount_gbp=5000, contract_amount=6500`
- 展示：`ContractTab` 合同行 `£5000 ($6500 等值)`；summary 累加 `$6500`
- ✅ 通过

**场景 3: 凌晨 01:00 打开弹窗**
- 本地 2026-04-17 01:30（UTC 2026-04-16 17:30）
- 旧：`toISOString().slice(0,10)` → "2026-04-16" ❌
- 新：`dayjs().format('YYYY-MM-DD')` → "2026-04-17" ✅

**场景 4: 老合同 currency=null, amountGbp=5000 续签**
- resolveCurrency 返回 `GBP` ✅

**场景 5: 用户输入 amountUsd=0**
- toFiniteNumber(0) = undefined ✅

**场景 6: 部署中间态（后端新前端旧）**
- 新合同 contractAmount=11500（老错值），其他字段正确
- 清理测试数据时统一处理

**场景 7: 学员档案 Tab 同时有 USD 和 GBP 合同**
- 合同 1 (USD)：显示 `$5000`
- 合同 2 (GBP)：显示 `£5000 ($6500 等值)`
- summary.totalAmount = 5000 + 6500 = 11500 → 显示 `$11500`（美元等值汇总）
- ✅ 通过

---

## 十一、遗留与后续优化（不在本次修复范围）

| 项　　　　　　　　　　　　　　　　　| 说明　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| -------------------------------------| -------------------------------------------------------------------------------|
| 测试数据清理　　　　　　　　　　　　| 用户将择机手动清理 `osg_contract` 表（包括部署中间态产生的错 contractAmount） |
| contractType 智能映射　　　　　　　 | 根据续签原因自动映射 `renew` vs `supplement`　　　　　　　　　　　　　　　　　|
| `OsgStudentServiceImpl.asDate` 统一 | 本次未改（原有 substring），未来可抽取公共工具　　　　　　　　　　　　　　　　|
