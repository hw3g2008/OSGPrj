# 合同管理 8 个 Bug 修复方案

**日期**：2026-05-07
**范围**：admin 端 · 合同管理模块（`/users/contracts`）
**状态**：待审批后实施

---

## 0. 背景与目标

用户反馈合同管理模块存在 8 个 Bug，经 systematic-debugging 定位后，本方案是**一次性修复全部 8 个 Bug** 的最小改动方案。

**目标**：最小改动、根因修复、前后端 + DB 一致。

遵循原则：
- **最小改动**：只改与 Bug 直接相关的代码，不夹带重构
- **根因修复**：避免下游兜底
- **前后端 + DB 一致**：涉及的数据迁移脚本幂等可重跑

---

## 0.1 前提与依赖（实施前必读）

| # | 前提 | 影响 |
|---|---|---|
| P1 | **使用合同管理模块的角色必须同时拥有 `admin:students:list` 权限** | Bug 1 学员远端搜索调 `/admin/student/list`，无该权限的角色（如纯助教）会被强制限定 `assistantId=getUserId()`，搜索范围被收窄。当前 admin/班主任级角色都包含此权限，业务推断不影响实际场景。如发现某角色仅有 `admin:contracts:list` 而无 `admin:students:list`，需作为后续工作单独处理。 |
| P2 | **Spring multipart 已配置 150MB**（`application.yml:60-66` `max-file-size: 150MB / max-request-size: 200MB`） | Bug 3a 移除控制器硬限后，实际上限由 Spring 决定 |
| P3 | **`FileUploadUtils.DEFAULT_MAX_SIZE = 150MB`** 已与 Spring 对齐 | 同上 |
| P4 | **admin 端有 `/profile/logs` 等真实前端路由** | Bug 3d/8 vite 代理范围必须收窄至 `/profile/upload`，不能代理 `/profile/**` 全前缀，否则会劫持前端 SPA 路由 |

---

## 1. Bug 列表与根因

### Bug 1 · 续费/新增合同时，学员下拉不支持模糊搜索

**现象**：`<a-select>` 无法按姓名关键字搜索。

**根因**：
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/contracts/components/RenewContractModal.vue:40-44` 的 `<a-select>` 没有 `show-search` / `filter-option`
- `studentOptions` 仅由父组件从**当前页合同行**聚合（`index.vue:249-255`），无合同的新学员根本不在选项里

**修复**：改为远端搜索模式
- `<a-select :show-search :filter-option="false" @search="onStudentSearch" :options="studentOptions" >`
- `onStudentSearch(keyword)` 调用 `getStudentList({ pageNum:1, pageSize:20, studentName: keyword })`（已有接口 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/api/admin/student.ts:46-48`）
- 去掉 `index.vue` 传入的 `studentOptions` prop（或保留为空数组以兼容）

---

### Bug 2 · 续签原因下拉选项为空

**现象**：打开"续费/新增合同"，"续签原因"下拉是空的。

**根因**：DB 中 `osg_renewal_reason` 字典**从未入库**
```
SELECT COUNT(*) FROM sys_dict_type WHERE dict_type='osg_renewal_reason';  -- 0
SELECT COUNT(*) FROM sys_dict_data WHERE dict_type='osg_renewal_reason';  -- 0
```
- 前端 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/contracts/components/RenewContractModal.vue:402` 调 `getAdminDictOptions('osg_renewal_reason')`，但 DB 无数据
- SQL 脚本 `@/Users/hw/workspace/OSGPrj/sql/migrations/2026-05-03-renewal-reason-dict.sql` 已存在但**未执行**

**修复**：在测试/生产 DB 执行该 SQL 脚本（幂等）

---

### Bug 3 · 合同附件上传 PDF 失败（4 个子因）

**现象**：上传 PDF 大文件失败；希望支持 PDF/JPG/JPEG/PNG。

#### 3a · 控制器硬编码 10MB 上限

`@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgContractController.java:30,95-98`
```java
private static final long MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024L;  // 10MB
...
if (file.getSize() > MAX_ATTACHMENT_SIZE) return AjaxResult.error("合同附件不能超过10MB");
```
即使 Spring `max-file-size=150MB`，控制器拦下。

**修复**：**移除该硬限**（让 Spring 的 150MB 限制生效）

#### 3b · 文件类型白名单只允许 PDF

`@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgContractController.java:32`
```java
private static final String[] PDF_EXTENSION = { "pdf" };
```
前端 `accept=".pdf,application/pdf"` 也只允许 PDF。

**修复**：
- 后端：`String[] ATTACHMENT_EXTENSIONS = { "pdf", "jpg", "jpeg", "png" }`
- 前端 accept：`.pdf,.jpg,.jpeg,.png`
- 前端 UI 文案："点击或拖拽上传 PDF" → "点击或拖拽上传合同附件（PDF / JPG / PNG）"

#### 3c · 上传成功后前端拿不到 attachmentPath

`@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgContractController.java:106-110` 把 `attachmentPath` `put` 到 AjaxResult **顶层**：
```java
AjaxResult ajax = AjaxResult.success("合同附件上传成功");
ajax.put("attachmentPath", attachmentPath);
ajax.put("url", serverConfig.getUrl() + attachmentPath);
```
前端 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/contracts/components/RenewContractModal.vue:329-333` 读的是 `res.data.attachmentPath`：
```ts
if (info.file.status === 'done') {
  const res = info.file.response
  if (res?.data?.attachmentPath) {  // ← 永远 undefined
    form.attachmentPath = res.data.attachmentPath
  }
}
```
导致 `form.attachmentPath` 始终为空，提交时触发"请上传合同附件"校验失败。

**修复**：前端兼容两种路径
```ts
const attachmentPath = res?.attachmentPath || res?.data?.attachmentPath
if (attachmentPath) { form.attachmentPath = attachmentPath; ... }
```

#### 3d · Dev 模式下 `/profile/upload/**` 附件 URL 不可访问（与 Bug 8 同因）

`FileUploadUtils.upload` 返回路径形如 `/profile/upload/contracts/2026/05/07/xxx.pdf`，由后端 `ResourcesConfig` 静态资源映射（`@/Users/hw/workspace/OSGPrj/ruoyi-framework/src/main/java/com/ruoyi/framework/config/ResourcesConfig.java:33-34`）。

但前端 dev 模式下 `@/Users/hw/workspace/OSGPrj/osg-frontend/config/viteProxy.ts:84` **只代理 `/api`**，`/profile/**` 在 vite 本地 3005 端口返回 404。

**修复**：admin 端 `vite.config.ts` 增加 **`/profile/upload`** 代理（通过 `passthroughPrefixes`）。

⚠️ **关键约束**：**不能代理 `/profile/**` 全前缀**——admin 路由配置 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/router/index.ts:105-110` 有真实页面 `/profile/logs`（操作日志），菜单中还有 `/profile/notice` `/profile/mailjob` `/profile/complaints`（comingSoon）。代理 `/profile` 全前缀会劫持这些前端 SPA 路由到 28080，页面崩溃。

上传文件 URL 实际形如 `/profile/upload/contracts/...`，因此用 `/profile/upload` 子路由代理即可避开冲突。

---

### Bug 4 · 续签流程没跑通，需要重新测试

**根因**：Bug 2（字典空）+ Bug 3c（attachmentPath 拿不到）的连锁结果——必填项校验过不了，提交被拦。

**修复**：以上修复完成后**人工回归**一次完整"续签合同"流程。

---

### Bug 5 · 筛选"合同状态"筛选结果不完整

**现象**：按"有效 / 即将到期 / 已结束"筛选都漏掉部分记录。

**根因**：DB 实际枚举与 UI/代码预期不一致

```
SELECT contract_status, COUNT(*) FROM osg_contract GROUP BY contract_status;
  active = 1
  normal = 5
```

- `init` SQL 注释说明合同状态只有 `active / expired / cancelled`
- 后端 `resolveContractStatus` 也只写 `active / expired`
- DB 中 `normal` 是**早期脏数据**（可能是更早版本的默认值遗留）
- 前端筛选下拉没有 `normal` 选项；`resolveStatus` 也不识别 `normal` → 5 条被任何筛选都漏掉

**修复**：
1. **数据迁移**：`UPDATE osg_contract SET contract_status='active' WHERE contract_status='normal';`（一次性，清理脏数据）
2. 前端筛选加 `cancelled`（已作废）选项，与 init schema 对齐
3. 无需改 `resolveContractStatus`（已正确）

---

### Bug 6 · 导出：剩余课时乱码、合同状态不对

**根因**（双因）：

#### 6a · `@Excel` 默认 cellType=STRING 导致数字被写为字符串单元格

**真正根因**（已通过查证 `ExcelUtil.java` + `Excel.java` 注解定义确认）：

```@/Users/hw/workspace/OSGPrj/ruoyi-common/src/main/java/com/ruoyi/common/annotation/Excel.java:122-125
/**
 * 导出类型（0数字 1字符串 2图片）
 */
public ColumnType cellType() default ColumnType.STRING;
```

```@/Users/hw/workspace/OSGPrj/ruoyi-common/src/main/java/com/ruoyi/common/utils/poi/ExcelUtil.java:1173-1184
else if (value instanceof BigDecimal && -1 != attr.scale())
{
    cell.setCellValue((((BigDecimal) value).setScale(attr.scale(), attr.roundingMode())).doubleValue());
}
...
else
{
    // 设置列类型
    setCellVo(value, attr, cell);
}
```

- `@Excel` 默认 `scale = -1`，BigDecimal 走不到 L1175 的 `doubleValue` 分支
- 默认 `cellType = STRING`，`setCellVo` STRING 分支（L1018-1030）调 `Convert.toStr(value)` 后**作为字符串写入单元格**
- Excel 单元格类型 = 字符串，数字左对齐 + 显示绿色警告角，用户感知为"乱码"
- `usedHours/remainingHours` 在 `OsgContract.java:31-33` 是 `BigDecimal`，DB 实际 `INT`（已验证 `DESC osg_contract`），但**类型本身不是问题**——即使改 `Integer` 也走同样的 STRING 分支被 `Convert.toStr` 写为字符串

**修复**：在 `ContractExportRow` 的 `@Excel` 注解上**显式加 `cellType = ColumnType.NUMERIC`**，让所有数字列走 `setCellVo` 的 NUMERIC 分支（`ExcelUtil.java:1032-1037`）：

```java
cell.setCellValue(StringUtils.contains(Convert.toStr(value), ".") ? Convert.toDouble(value) : Convert.toInt(value));
```

应用范围：
- `contractAmount`（BigDecimal）
- `totalHours`（Integer）
- `usedHours`（BigDecimal）
- `remainingHours`（BigDecimal）

> 注：**不改 DTO 字段类型**，只加 `@Excel` 属性。日期列保留 `dateFormat`，不需要 cellType。

#### 6b · 合同状态/类型 导出的是 raw 枚举

`ContractExportRow.contractStatus` 直接透出 `active` / `normal` / `expired` 英文枚举，用户看到的是英文字符串，当然"不对"。
`contractType` 同样问题（首签/续签/补充）。

**修复**：在 `ContractExportRow.from()` 里做中文转换：
- `contractStatus`：`active→有效`、`expired→已结束`、`cancelled→已作废`、其它→原值
- `contractType`：`initial→首签`、`renew→续签`、`supplement→补充`、其它→`首签`

---

### Bug 7 · 合同详情底部删除"修改状态 / 加入黑名单 / 移出黑名单"三个按钮

**查证结论**：三个按钮**完全是早期原型假 UI**，且与其他模块功能重复

| 模块 | 有实际后端调用？ |
|---|---|
| 学员管理 `BlacklistModal` | ✅ 调 `POST /admin/student/blacklist` |
| 员工管理 `StaffStatusModal` | ✅ 有实际后端接口 |
| 合同详情 `ContractBlacklistModal` 等 3 个 | ❌ `handleSubmit` 只 `emit('submitted')`，**无 HTTP 请求** |

业务上：
- 合同状态由 `resolveContractStatus` 根据到期日/课时**自动计算**，没有"人工改合同状态"的业务场景
- 黑名单是**学员维度**属性（`osg_student.is_blacklisted`），不是合同维度

**修复**：彻底下线
1. 删除 `ContractDetailModal.vue` footer 里三个 `<a-button>` + 对应 `emits` 声明
2. 删除 `index.vue` 中：
   - `import ContractStatusChangeModal / ContractBlacklistModal / ContractRemoveBlacklistModal`
   - 对应 `<Xxx v-model:visible>` 标签
   - state: `statusChangeVisible / addBlacklistVisible / removeBlacklistVisible / statusChangeTarget / addBlacklistTarget / removeBlacklistTarget`
   - handler: `handleStatusChangeEntry / handleAddBlacklistEntry / handleRemoveBlacklistEntry`
   - `ContractDetailModal` 上的 `@request-status-change / @request-add-blacklist / @request-remove-blacklist` 事件监听
3. **删除 3 个 modal 文件**：
   - `components/ContractStatusChangeModal.vue`
   - `components/ContractBlacklistModal.vue`
   - `components/ContractRemoveBlacklistModal.vue`

> 可视化测试文件 `admin-visual-contract.spec.ts` 有 4 处引用，需同步清理（若涉及）。

---

### Bug 8 · 合同上传完后需能查看

**根因**：与 Bug 3d 同——dev 模式下 `/profile/...` URL 无代理。

**现有实现**：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/contracts/components/ContractDetailModal.vue:86-89`
```vue
<a v-if="contract.attachmentPath" :href="contract.attachmentPath" target="_blank">查看附件</a>
```
URL 本身正确（`/profile/upload/...`），只是没走代理。

**修复**：Bug 3d 修完即自然解决。

---

## 2. 修改清单（汇总）

### 2.1 后端（Java）· 1 个文件

**`ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgContractController.java`**

| 位置 | 改动 |
|---|---|
| L30 | **删除** `MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024L` 常量 |
| L32 | `PDF_EXTENSION = { "pdf" }` → `ATTACHMENT_EXTENSIONS = { "pdf", "jpg", "jpeg", "png" }` |
| L95-98 | **删除** `if (file.getSize() > MAX_ATTACHMENT_SIZE) { ... }` 整段校验 |
| L102 | `FileUploadUtils.upload(..., PDF_EXTENSION, ...)` → `..., ATTACHMENT_EXTENSIONS, ...` |
| L139-161 | `ContractExportRow` 字段：`contractAmount` / `totalHours` / `usedHours` / `remainingHours` 的 `@Excel` 注解显式加 `cellType = ColumnType.NUMERIC`（`contractAmount` 可加 `scale = 2`），**不改字段类型** |
| L183-200 | `ContractExportRow.from()`：`contractStatus/contractType` 做中文映射（active/expired/cancelled→中文；initial/renew/supplement→中文） |

### 2.2 前端 Vue · 3 个文件 + 1 个配置

**`osg-frontend/packages/admin/src/views/users/contracts/components/RenewContractModal.vue`**

| 位置 | 改动 |
|---|---|
| L40-44 | 学员 `<a-select>` 改为远端搜索模式（`show-search`、`filter-option=false`、`@search` 防抖调 `getStudentList`） |
| L196 | `accept=".pdf,application/pdf"` → `accept=".pdf,.jpg,.jpeg,.png"` |
| L202 | UI 文案 "点击或拖拽上传 PDF" → "点击或拖拽上传合同附件（PDF / JPG / PNG）" |
| L329-333 | `handleUploadChange` 读取路径改为 `res?.attachmentPath ?? res?.data?.attachmentPath` |
| script | 新增 `onStudentSearch` 函数 + 本地 `studentOptions` ref + 防抖；去掉 `studentOptions` prop 依赖（可保留但允许为空） |

**`osg-frontend/packages/admin/src/views/users/contracts/components/ContractDetailModal.vue`**

| 位置 | 改动 |
|---|---|
| L109-124 | 删除 footer 里"状态修改 / 加入黑名单 / 移出黑名单"三个 `<a-button>` |
| L149-155 | 删除对应 `emits` 类型：`request-status-change`、`request-add-blacklist`、`request-remove-blacklist` |

**`osg-frontend/packages/admin/src/views/users/contracts/index.vue`**

| 位置 | 改动 |
|---|---|
| L39-44 | 状态筛选下拉新增 `<a-select-option value="cancelled">已作废</a-select-option>` |
| L145-156 | 删除 `<ContractStatusChangeModal>`、`<ContractBlacklistModal>`、`<ContractRemoveBlacklistModal>` 三个组件使用 |
| L166-168 | 删除对应三个 `import` 语句 |
| L194-200 | 删除 state：`statusChangeVisible`、`addBlacklistVisible`、`removeBlacklistVisible`、`statusChangeTarget`、`addBlacklistTarget`、`removeBlacklistTarget` |
| L135-138 | 删除 `ContractDetailModal` 上的 `@request-status-change/@request-add-blacklist/@request-remove-blacklist` 事件监听 |
| L353-366 | 删除 `handleStatusChangeEntry / handleAddBlacklistEntry / handleRemoveBlacklistEntry` 三个 handler |

**`osg-frontend/packages/admin/vite.config.ts`**

| 改动 |
|---|
| 在 `createApiProxyConfig({...})` 的 `passthroughPrefixes` 中新增 **`/profile/upload`**（**不是 `/profile`**），让 dev 模式下上传文件 URL `/profile/upload/**` 走代理到 28080；同时不影响前端路由 `/profile/logs` 等 |

### 2.3 文件删除 · 3 个

- `osg-frontend/packages/admin/src/views/users/contracts/components/ContractStatusChangeModal.vue`
- `osg-frontend/packages/admin/src/views/users/contracts/components/ContractBlacklistModal.vue`
- `osg-frontend/packages/admin/src/views/users/contracts/components/ContractRemoveBlacklistModal.vue`

### 2.4 测试文件清理

- `osg-frontend/packages/admin/src/__tests__/admin-visual-contract.spec.ts`：**已查证无关**——该 spec 读的是 `osg-spec-docs/docs/01-product/prd/admin/UI-VISUAL-CONTRACT.yaml` 中的 `contractStatus` / `isBlacklisted` fixture 字段，与本次删除的 3 个 modal 组件**无任何 import/component 引用**，**无需修改**。
- 其他 contract 相关 spec：实施时全局 grep 一次 `ContractStatusChangeModal | ContractBlacklistModal | ContractRemoveBlacklistModal` 确认无遗漏即可。

### 2.5 DB 操作 · 2 条

1. **执行已有字典脚本**（幂等）：
   ```
   mysql -h <host> -P <port> -u <user> -p<pwd> ry-vue < sql/migrations/2026-05-03-renewal-reason-dict.sql
   ```
2. **清理 contract_status='normal' 脏数据**（新增脚本 `sql/migrations/2026-05-07-contract-status-normal-to-active.sql`）：
   ```sql
   -- 把遗留的 normal 状态修正为 active（init schema 默认值）
   UPDATE osg_contract SET contract_status='active' WHERE contract_status='normal';
   ```

---

## 3. 风险与回归范围

### 3.1 影响范围

| 改动 | 风险 | 回归点 |
|---|---|---|
| 删除 3 个 modal | 低（原本就无后端） | 合同详情页打开是否正常、footer 布局 |
| 学员远端搜索 | 中（受角色权限影响） | 新增/续签合同时搜学员、翻页无异常；**确保使用账号有 `admin:students:list` 权限**（见 P1） |
| `/profile/upload` 代理 | 极低 | 仅代理上传子路径，前端 `/profile/logs` 等 SPA 路由不受影响（已 grep 确认无冲突） |
| 导出 DTO 加 `cellType=NUMERIC` | 低（只影响导出） | Excel 打开：课时列右对齐数字、状态/类型为中文 |
| 上传 150MB | 低 | Spring + FileUploadUtils 都已对齐 150MB，测一个大 PDF |
| DB `normal→active` 迁移 | 中 | 5 条受影响记录的筛选/统计需要回归 |

### 3.2 兼容性

- `OsgContract.java` domain 字段类型**完全不改**（`usedHours/remainingHours` 保持 BigDecimal），其他调用方不受影响
- `ContractExportRow` DTO 字段类型**也不改**，只在 `@Excel` 注解上加 `cellType = ColumnType.NUMERIC`
- 前端 `studentOptions` prop 保留兼容，只是内部改用远端搜索
- `/profile/upload` 代理只影响 admin 端 dev 模式，不影响生产环境（生产由 Nginx 配置）

---

## 4. 验证清单

### 4.1 功能验证（人工回归）

- [ ] **B1**：续费合同时，学员下拉输入关键字能搜到学员
- [ ] **B2**：续签原因下拉显示 5 项（含"其他原因"）
- [ ] **B3**：上传 50MB PDF、10MB JPG、5MB PNG 都成功，关闭弹窗再打开显示已选中
- [ ] **B4**：完整走一遍续签流程（新学员 + 全字段 + 附件），刷新列表新记录出现
- [ ] **B5**：按"有效/即将到期/已结束/已作废"筛选，总和 == 总记录数
- [ ] **B6**：导出 Excel，剩余课时列是数字（如 `100`），合同状态列是中文（如 `有效`）
- [ ] **B7**：合同详情弹窗底部只剩"关闭"和"续签合同"两个按钮
- [ ] **B8**：合同详情表格里"查看附件"能在新窗口打开 PDF/图片

### 4.2 自动化验证

- [ ] `pnpm test` admin 端单测通过
- [ ] 若 `admin-visual-contract.spec.ts` 引用被删组件则同步更新
- [ ] `mvn -pl ruoyi-admin test -Dtest='*Contract*'` 通过

---

## 5. 实施顺序

按"后端 → 前端 → DB → 验证"分批推进：

1. **后端改动**（OsgContractController.java）+ **编译验证**
2. **前端改动**（4 个文件 + vite 配置）+ **本地启动验证**
3. **删除 3 个 modal 文件** + **清理测试引用**
4. **DB 执行 2 条 SQL**（测试库先，确认再生产）
5. **人工回归 8 项**（见 4.1）
6. 若全部通过 → 提交

---

## 6. 问题与决定（本次确认记录）

| 问题 | 决定 | 来源 |
|---|---|---|
| Q1 · `normal` 5 条数据处理 | **迁移到 `active`**（最小副作用） | 用户决策 |
| Q2 · 学员搜索范围 | **全量搜**，用 `/admin/student/list?studentName=关键字` | 用户决策 |
| Q3 · 三个按钮和 modal 文件 | **彻底下线 + 删除 3 个 modal 文件**（查证后确认是假 UI，与其他模块重复） | 用户决策 + 代码查证 |
| Q4 · 附件大小上限 | **跟随 Spring 150MB**（移除控制器硬限） | 用户决策 |
| A5（隐含）· 学员搜索 API 权限范围 | **声明前提**：使用方角色须有 `admin:students:list`（见 P1）；不新增专用 API | 自核对发现 |
| A6（隐含）· 导出乱码根因 | **`@Excel` 默认 cellType=STRING 导致数字写成字符串**；修复加 `cellType = ColumnType.NUMERIC`；不改字段类型 | 自核对发现 |
| B1（校验）· vite 代理范围 | **收窄到 `/profile/upload`**（不可代理 `/profile` 全前缀，避免劫持前端路由 `/profile/logs`） | /validate-doc Round 1 发现 |

---

## 7. 下一步

此文档等你审批后，我按"第 5 节实施顺序"逐项推进。你可以：
- 直接回复 **"确认按方案执行"** → 我从第 1 步开始改
- 或针对具体某条提出调整 → 我修方案后再执行
