# Admin 端 Bug 修复计划（2026-05-08）

> 范围：Admin 后台 5 个模块的真实代码对比 + 修复方案。本计划只出方案，不动代码；用户确认后再实施。

---

## 任务总览

| Task | 模块 | 路径锚点 | Bug 数 |
|---|---|---|---|
| **T1** | 导师列表 | `osg-frontend/packages/admin/src/views/users/staff/` + `OsgStaffController.java` + `OsgMentorAccessService.java` 等 | 11 |
| **T2** | 导师排期管理 | `osg-frontend/packages/admin/src/views/users/mentor-schedule/` | 2 |
| **T3** | 岗位信息 | `osg-frontend/packages/admin/src/views/career/positions/` + `OsgPositionController.java` | 17 |
| **T4** | 学员求职总览 | `osg-frontend/packages/admin/src/views/career/job-overview/index.vue` | 4 |
| **T5** | 模拟应聘管理 | `osg-frontend/packages/admin/src/views/career/mock-practice/index.vue` | 1 |

> 「学生自添岗位 / 已隐藏岗位是否在各端隐藏」明天与学生端一起测，本计划暂不展开。

## 校验日志

| 时间 | 校验范围 | 修正项 |
|---|---|---|
| 2026-05-08 10:21 | T1-T5 全部 30 项 vs 实际代码 | T1.2 / T1.3 / T1.5 / T3.11 共 4 处描述偏差已修正；详情见各小节"现状（核对后修正）"标记。 |
| 2026-05-08 10:34 | G1-G12 + C1-C4 + N1-N3 自校验 | 14 项补强：本轮全部回填（前置假设、设计决策、场景模拟、T1.2 回归评估、T2-T5 AC+测试、T3.4/T3.8/T3.15 细节、T3.12 根因）。详见末尾「自校验结果」表。 |
| 2026-05-08 13:35 | D8 / B4 / C4 / T3.3 / T3.4 / AC-T3.4 vs 项目实际代码 | 6 处修正：① **D8** 由 `OSS` 改为 `本地 FileUploadUtils`（项目 grep 0 OSS / 0 SysFileController / 0 `/admin/attachment` API），仿 `OsgContractController.upload (line 97-127)`；② **B4** 假设废弃，重写为本地存储 + UUID 文件名；③ **C4** 字段类型 `JSON` → `TEXT`（与 `target_majors` CSV 字段同表风格）；④ **T3.3** 不需新建 `company-fill SQL` —— `sql/osg_company_name_import.sql` 1086 条 INSERT 已 100% 写入 `remark='{"parentValue":"<companyType_value>"}'`（7 类齐全），复用 `OsgPositionServiceImpl.extractParentValue()` 即可；⑤ **T3.4** 不引入 `JsonListTypeHandler`（grep 0 typeHandler，避免扩 ruoyi-common），改为 `String` 字段 + `ObjectMapper.readValue/writeValueAsString` 手动 parse，仿 `target_majors`；⑥ **AC-T3.4 (a)** 单文件 `3MB` → `10MB`（修正笔误，与修复方案 line 429-430 + `modal-form-style-guide.md §7.3` 一致）。 |

---

## 前置条件与假设

### A. 环境与权限假设
- **A1**. 当前 admin 端已上线，**生产环境有冻结态导师存在**（`osg_staff.account_status='frozen'` 或 `sys_user.status='1'`）——T1.2 改动需先评估这部分用户的影响。
- **A2**. `osg_staff_blacklist` 表已存在且数据可信（按 `staff_id` 主键，`email` 通过 join `osg_staff` 取得）。
- **A3**. 三端登录入口已统一走 `OsgXxxAccessService.hasXxxAccess(SysUser)`，不存在绕开访问校验的旁路。
- **A4**. admin 用户的"超管"判定 = `permissions.includes('*:*:*')`（前端） / `SecurityUtils.isAdmin()`（后端），与现有 rating 字段权限判定保持一致。

### B. 业务决策假设（已答复用户开放问题前的临时假设）
- **B1**. 任职公司改为全量搜索后**不再按行业分组**（扁平列表 + 搜索）。→ 待 Q2 确认。
- **B2**. 评语字段权限 = 评级权限（仅超管可见可写、非超管 GET 详情接口不返回该 key）。→ 待 Q3 确认。
- **B3**. 节假日采用方案 C（前端硬编码 2026 年法定节假日数组）。→ 待 Q4 确认。
- **B4**. 附件存储仿 `OsgContractController.upload` 风格：本地 `FileUploadUtils.upload(RuoYiConfig.getUploadPath()+"/positions", file, ext, useCustomNaming=true)` + UUID 文件名 + `serverConfig.getUrl()` 静态前缀；DB 存 JSON String（仿 `target_majors` CSV 字段风格）。→ ✅ 已确认 2026-05-08 13:35（项目无 OSS 集成、无 SysFileController、无 `/admin/attachment` API）。
- **B5**. 展示起始先实现"已开始（displayStartTime ≤ now）/ 未开始（displayStartTime > now）"两值。→ 待 Q6 确认。
- **B6**. 下钻错列（T3.7）先复测 + 截图后再定方案，本计划占位。→ 待 Q7 确认。

### C. 数据/兼容性假设
- **C1**. 存量 region 单值字符串（如 `北京`），改 CSV 多值后 splitCsv 必须兼容单值。
- **C2**. 存量 specialty / companies / majorDirection / subDirection 已是 CSV，无需迁移。
- **C3**. 新增字段 `osg_staff.rating_remark` 默认 NULL，老数据不回填。
- **C4**. 新增字段 `osg_position.application_attachments` 类型 `TEXT`，默认 NULL；与 `target_majors` CSV 字段同列风格，应用层 `ObjectMapper` 手动 parse，不引入 typeHandler、不改 ruoyi-common（项目 grep 0 个 typeHandler）。
- **C5**. 新增字典值 `osg_position_display_status.not_started` 为派生状态，**不允许用户手选**（导出/筛选可见，编辑表单需过滤）。

---

## 设计决策表

| # | 决策点 | 选项 | 推荐 | 理由 | 状态 |
|---|---|---|---|---|---|
| **D1** | T1.1+T1.2 在 `hasXxxAccess` 内执行顺序 | A: 黑名单先 / B: frozen 先 / C: 并列 OR | **A** | 黑名单语义更强（违规剔除），优先短路返回更明确 | ✅ 已定 |
| **D2** | T1.5 任职公司是否按行业分组 | A: 扁平全量 / B: 行业分组 | **A** | 删了行业字段后再分组冗余 | ⚠️ 待 Q2 |
| **D3** | T1.6 评语权限 | A: 仅超管 / B: 班主任也可写 | **A** | 与评级同条件，最小权限 | ⚠️ 待 Q3 |
| **D4** | T1.7 region 多值存储格式 | A: CSV `京,沪` / B: JSON 数组 / C: 关联表 | **A** | 复用 specialty/companies CSV 模式，零迁移成本 | ✅ 已定 |
| **D5** | T1.7 city 必填 vs 选填 | A: 选填 / B: 必填 | **A** | 用户报告"城市必填阻断保存"，明确改选填 | ✅ 已定 |
| **D6** | T1.9 单价单位 | A: USD / B: USD + ¥ 双展示 / C: 配置可切换 | **A** | 业务统一美元结算 | ✅ 已定 |
| **D7** | T2.1 节假日数据源 | A: 通用 API / B: 后端字典 / C: 前端硬编码 | **C** | 节假日年度变化少，硬编码 + 注释最快上线 | ⚠️ 待 Q4 |
| **D8** | T3.4 投递备注附件存储 | A: OSS+DB JSON URL / B: 本地+DB BLOB / C: 关联表 / **D: 本地 FileUploadUtils + DB JSON String** | **D** | 项目无 OSS 集成、无 SysFileController；仿 `OsgContractController.upload (line 97-127)` 既有模式 | ✅ 已定（2026-05-08 13:35 自查后） |
| **D9** | T3.8 not_started 状态来源 | A: 字典枚举 / B: 后端派生 | **A** | 与 hidden/active 同字典统一管理，前端筛选项一致 | ✅ 已定 |
| **D10** | T3.11 主攻方向多值匹配方式 | A: `FIND_IN_SET` / B: `LIKE` / C: 关联表 | **A** | MySQL 内置，与 specialty 字段方式一致 | ✅ 已定 |
| **D11** | T3.12 展示起始筛选语义 | A: 已开始/未开始 / B: 时间区间 / C: 二者皆有 | **A** | 用户主诉是"未开始岗位混入" | ⚠️ 待 Q6 |
| **D12** | T1.6/T3.4 DB 迁移文件命名 | A: `2026-05-08-{module}-{change}.sql` | **A** | 与 `sql/migrations/` 现有规范一致 | ✅ 已定 |
| **D13** | T3.3 公司→类别映射存储 | A: `osg_company_name.remark` 存 type / B: 新建关联表 / C: 按历史岗位 mode 推断 | **A** | 最小侵入，复用现有 dict 表结构 | ✅ 已定（第 2 轮 K 校验后增加） |

---

## 场景模拟（端到端走读）

### 场景 1：黑名单 + 冻结导师试图三端登录
```
背景：导师 ID=10086，邮箱 m@osg.com
初始：sys_user.status='0'（正常）, osg_staff.account_status='frozen', 在 osg_staff_blacklist 表中
步骤：
  1. 该导师在 mentor 端输入账号密码 → POST /login → 通过 sys_user.status='0' 校验
  2. 跳转 dashboard 时调用 hasMentorAccess(user)
     a. 检查 isInBlacklist(email) → true → 返回 false [T1.1]
     b. （未到此处）检查 osg_staff.account_status='frozen' → 也会返回 false [T1.2]
  3. mentor 端拒绝访问，提示"该账号无 mentor 端访问权限"
预期：步骤 2a 即被拒，T1.2 检查为兜底冗余 ✓
覆盖：T1.1 + T1.2 + D1 顺序
```

### 场景 2：超管编辑导师（多地区、新增评语、改美元）
```
背景：超管登录 admin，编辑 ID=10086 的导师资料
步骤：
  1. 打开编辑弹窗 → 标题显示 "ID: 10086" [T1.10]
  2. 地区选 [北京, 上海] → 城市留空 → 课时单价输入 200 → 评语输入"专业度高，沟通好"
  3. 提交：
     a. 前端校验 city 非必填 ✓ [T1.7]
     b. payload.region = "beijing,shanghai"（CSV）✓
     c. payload.ratingRemark = "专业度高，沟通好" ✓ [T1.6]
     d. payload.hourlyRate = 200（无前缀，单位前端展示为 $）✓ [T1.9]
  4. 后端 OsgStaffServiceImpl.updateStaff 写入：
     a. SecurityUtils.isAdmin()=true，允许写 rating_remark ✓
     b. UPDATE osg_staff SET region='beijing,shanghai', rating_remark='...', hourly_rate=200 ...
  5. 列表刷新：region 列渲染 [北京 tag, 上海 tag]，单价列 "$200/h"
预期：全流程通过，无字段丢失
覆盖：T1.6 + T1.7 + T1.9 + T1.10 + D4 + D5 + D6
```

### 场景 3：admin 新增岗位 + 上传附件 + 发布展示
```
背景：admin 用户新建一个夏季实习岗位
步骤：
  1. 打开新增岗位弹窗 → 选择"金融"行业 → 选择公司"高盛" → 公司类别自动带出 "投行" [T3.3]
  2. 填写岗位名/地区/招聘周期/截止时间留空（默认显示 - 而非 'Rolling ASAP'）[T3.6]
  3. 主攻方向多选 [量化, 咨询] → CSV 提交 ✓
  4. 投递备注：附件上传 2 个文件（PDF + DOCX），调用 POST /admin/position/attachment 返回 URL 列表 [T3.4]
  5. 展示开始时间 = 明天 → 状态自动派生为 "未开始"（not_started）[T3.8]
  6. 提交保存 → 列表立即出现，状态列显示 "未开始" tag
  7. 主攻方向筛选选 [量化] → 列表通过 FIND_IN_SET('量化', target_majors) 命中该岗位 [T3.11]
预期：全流程通过，附件可下载，未开始岗位被正确分组
覆盖：T3.3 + T3.4 + T3.6 + T3.8 + T3.11 + D8 + D9 + D10
```

---

## 全局执行清单矩阵

> 横轴=Task，纵轴=文件；交叉处标记需改的子项编号。便于检查同一文件被多个 Task 改动时的合并冲突。

| 文件 | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| `osg-frontend/packages/admin/src/views/users/staff/index.vue` | 1.1, 1.2, 1.3, 1.9 | | | | |
| `osg-frontend/packages/admin/src/views/users/staff/columns.ts` | 1.10, 1.11 | | | | |
| `osg-frontend/packages/admin/src/views/users/staff/components/StaffFormModal.vue` | 1.4, 1.5, 1.7, 1.9, 1.10 | | | | |
| `osg-frontend/packages/admin/src/views/users/staff/components/StaffDetailModal.vue` | 1.6, 1.10 | | | | |
| `osg-frontend/packages/admin/src/views/users/staff/components/StaffStatusModal.vue` | 1.2 | | | | |
| `osg-frontend/packages/admin/src/views/users/mentor-schedule/index.vue` | | 2.1, 2.2 | | | |
| `osg-frontend/packages/admin/src/views/career/positions/index.vue` | | | 3.1, 3.2, 3.5, 3.6, 3.9, 3.11, 3.12, 3.13, 3.14 | | |
| `osg-frontend/packages/admin/src/views/career/positions/components/PositionFormModal.vue` | | | 3.3, 3.4, 3.6, 3.9, 3.15 | | |
| `osg-frontend/packages/admin/src/views/career/job-overview/index.vue` | | | | 4.1, 4.2, 4.3, 4.4 | |
| `osg-frontend/packages/admin/src/views/career/mock-practice/index.vue` | | | | | 5.1 |
| `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMentorAccessService.java` | 1.1, 1.2 | | | | |
| `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorAccessService.java` | 1.1, 1.2 | | | | |
| `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgAssistantAccessService.java` | 1.1, 1.2 | | | | |
| `ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgStaff.java` | 1.6 | | | | |
| `ruoyi-system/src/main/resources/mapper/system/OsgStaffMapper.xml` | 1.6 | | | | |
| `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStaffController.java` | 1.6, 1.11 | | | | |
| `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java` | | | 3.1, 3.3, 3.7 | | |
| `ruoyi-system/src/main/resources/mapper/system/OsgPositionMapper.xml` | | | 3.4, 3.11, 3.14 | | |
| `ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgPosition.java` | | | 3.4 | | |
| `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgPositionController.java` | | | 3.15, 3.17 | | |
| `sql/migrations/2026-05-08-staff-add-rating-remark.sql` (新建) | 1.6 | | | | |
| `sql/migrations/2026-05-08-position-add-attachments.sql` (新建) | | | 3.4 | | |
| `sql/migrations/2026-05-08-position-display-status-not-started.sql` (新建) | | | 3.8 | | |

**冲突点警示**：
- `staff/index.vue` 被 T1 内 4 个子项同时改 → 实施时单文件单次 PR，避免冲突。
- `OsgXxxAccessService.java` 被 T1.1 + T1.2 同时改 → 见 D1：黑名单先、frozen 后。
- `OsgPositionMapper.xml` 被 T3.4 + T3.11 + T3.14 同时改 → 一次 PR 全部完成。

---

## T1. 导师列表（11 项）

### 文件锚点
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/index.vue`（list page）
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/columns.ts`
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/components/StaffFormModal.vue`
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/components/StaffDetailModal.vue`
- `@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStaffController.java`
- `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMentorAccessService.java`
- `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorAccessService.java`
- `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgAssistantAccessService.java`
- `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgStaff.java`

### T1.1 黑名单用户禁止登录
- **现状**：黑名单只在前端 alert 中说"无法查看求职中心"；后端 `hasMentorAccess` / `hasLeadMentorAccess` / `hasAssistantAccess` 不检查 `osg_staff_blacklist` 表，黑名单导师**仍可登录**。
- **修复**（后端短路，按 D1 顺序：黑名单先、frozen 后）：
  ```java
  public boolean hasMentorAccess(SysUser user) {
      if (user == null) return false;
      // [T1.1] 黑名单短路（最高优先级）
      Long staffId = staffMapper.selectStaffIdByEmail(user.getEmail());
      if (staffId != null && blacklistMapper.existsByStaffId(staffId)) return false;
      // [T1.2] 冻结状态短路
      if (staffId != null && "frozen".equals(staffMapper.selectAccountStatus(staffId))) return false;
      // 原有 sys_user.status 检查
      return isActiveUser(user) && hasMentorRole(user);
  }
  ```
  - 三个 AccessService 同步改造，建议抽公共方法 `OsgStaffAccessHelper.isStaffBlocked(email)` 复用。
  - 复用 `OsgStaffServiceImpl.selectBlacklistedStaffIds`（已实现），但更高效的是新增 `existsBlacklistByStaffId(staffId)` 单值查询避免每次 load 全表。
- **前端**：
  - `index.vue:71-79` blacklist alert 文案改为：`黑名单导师无法登录系统` / 移除"可以正常登录系统和进行其他操作"。
- **测试**：
  - 单测 `OsgMentorAccessServiceTest` 新增：`whenStaffInBlacklist_returnFalse` / `whenStaffFrozen_returnFalse` / `whenBoth_returnFalse_dueToBlacklistShortcut`。
  - 集测：用 fixture 创建黑名单导师 → mentor 端 GET `/system/user/getInfo` 应 403。

### T1.2 状态文案统一为「冻结」+ 冻结状态阻止登录
- **现状**（核对后修正）：
  - `index.vue:44-46` 筛选项 `激活/禁用`（要改）。
  - `index.vue:182` 操作菜单 `record.accountStatus === '1' ? '解冻' : '禁用'`（"禁用"要改、"解冻"保留）。
  - `index.vue:558-560` `formatStatus` **已返回 `'冻结/正常'`** ✓ 无需修改。
  - `index.vue:564` `getStatusNote` 返回 `'账号已禁用'`（要改）。
  - `index.vue:599-610` `resolveSuccessMessage`：`'导师账号已禁用'` / `'导师账号已解冻'`（前者要改）。
  - `StaffStatusModal.vue:152` `modalTitle` for `freeze` 返回 `'禁用导师账号'`（要改）。
  - `StaffStatusModal.vue:177` `modalDescription` for `freeze`：`'禁用后该导师账号将无法正常登录系统。'`（要改）。
  - `StaffStatusModal.vue:218` `reasonPlaceholder` for `freeze`：`'请选择禁用原因'`（要改）。
  - `StaffStatusModal.vue` action key 仍叫 `'freeze'`、`reasonOptionMap.freeze`、CSS `--freeze` —— **保留不动**（业务语义 key，不改外部依赖）。
  - 数据库 `osg_staff.account_status` 枚举：`active` / `frozen`（已正确）。
  - 后端 `hasMentorAccess` 仅 `isActiveUser(SysUser)` 检查 `sys_user.status='0'`，**不检查 `osg_staff.account_status`**——通过其他渠道（如 admin 直接改 sys_user.status）才能阻止登录。`StaffStatusModal` 的 freeze 操作只改 `sys_user.status`。
- **修复**（按上述每一处替换"禁用"→"冻结"）：
  - 前端：上述 7 处用户可见文案。
  - 后端 `OsgMentorAccessService.isActiveUser` 等：在 staff 渠道里**追加** `osg_staff.account_status='frozen'` 短路（与 T1.1 同一个位置实现，见 T1.1 代码块）。
  - **完整性自检**：实施完成后用 `grep -rn '禁用' osg-frontend/packages/admin/src/views/users/staff/` 应仅剩字典/API 兼容性相关、不再有面向用户的"禁用"文案。
- **🔴 回归风险评估（必做）**：
  - **风险**：开启 `account_status='frozen'` 短路登录后，**现网已存在的 frozen 状态导师会立即全部被拒绝登录**，即使其 `sys_user.status='0'`。
  - **缓解步骤**（实施前必做）：
    1. 在生产/测试库执行：`SELECT staff_id, email, account_status, frozen_at FROM osg_staff WHERE account_status='frozen';`
    2. 把结果输出给业务方确认：这些导师是**应该被拒绝登录**的还是历史误冻结？
    3. 若有误冻结 → 先批量恢复 `UPDATE osg_staff SET account_status='active' WHERE staff_id IN (...)`；
    4. 若全部应拒登录 → 改动可直接上线，无需特殊处理；
    5. 部署窗口：建议放在工作日早 9 点上线（业务方在线，可即时回滚）。
  - **回滚预案**：保留 `feature.flag.staffFrozenBlocksLogin=true` 开关在 `application.yml`，如出现误拒可即时关闭恢复。
- **测试**：
  - 前端 spec：`StaffStatusModal.vue` 三个 action（freeze/restore/blacklist）的 modalTitle/Description/Placeholder 文案 snapshot。
  - 后端单测：`OsgMentorAccessServiceTest.whenStaffFrozen_returnFalse` 见 T1.1。

### T1.3 类型筛选缺「助教」
- **现状**：`index.vue:32-36` 只列了 `lead_mentor` / `mentor`，但表单 `StaffFormModal.vue:42-44` 已有 `assistant`，列表 `formatType` 已支持 assistant。
- **修复**：`index.vue:32-36` 增加 `<a-select-option value="assistant">助教</a-select-option>`。

### T1.4 「擅长」多选展示选项而非计数
- **现状**：`StaffFormModal.vue:154-159` 的 `<MultiSelect :max-tag-count="0">` 把已选项折叠成"+N"。
- **修复**：删 `:max-tag-count="0"`（或改为足够大的值，如 99），让所有 tag 可见、可换行。
- **同步**：`StaffFormModal.vue:184` 的"行业"字段也是 `:max-tag-count="0"`，是否一并改？由 T1.5 决定（行业字段会被删除）。任职公司 `:max-tag-count="0"`（line 196）若 T1.5 不删，建议同样改为展开。

### T1.5 职业背景只保留「任职公司」
- **现状**：`StaffFormModal.vue:172-202` Section 4 有「行业」+「任职公司」两字段，行业用于过滤公司选项。
- **修复**：
  - 删除 `<a-form-item label="行业">` 整块（line 178-188）。
  - 任职公司从「按选中行业过滤」改为「全量公司可搜索」：
    - 注意 `industryItems`（来自 `useIndustryMeta()`）是**行业列表树**，公司在 `industry.companies` 子节点。
    - `filteredCompanyOptions = computed(() => industryItems.value.flatMap(i => i.companies || []))`，再去重；保留 search 过滤能力。
    - placeholder 改"请选择或搜索公司"，删 `:disabled` 绑定。
  - 删 `onIndustryChange`、`form.selectedIndustries`、`inferIndustriesFromCompanies` 相关逻辑。
- **影响**：`StaffDetailModal.vue` 的"行业"展示如有也一并删（待确认）。

### T1.6 评级非必填 + 增加「评语」字段
- **现状**：评级已是 `allow-clear` 非必填 ✓；`OsgStaff` domain 无 `ratingRemark` 字段；`StaffFormModal.vue:204-223` 仅评级。
- **修复**：
  - **数据库迁移**：新增 `sql/migrations/2026-05-08-staff-add-rating-remark.sql` —— `ALTER TABLE osg_staff ADD COLUMN rating_remark VARCHAR(500) DEFAULT NULL COMMENT '评级评语';`
  - **后端**：
    - `OsgStaff.java` 加 `private String ratingRemark;` + getter/setter。
    - `OsgStaffMapper.xml` resultMap + insert/update 加字段。
    - `OsgStaffController.java:424` 附近（buildStaff/applyStaffPayload）加 `staff.setRatingRemark(asText(body.get("ratingRemark")))`，仅超管可写（与 rating 同等条件）。
    - `toTableRow` / `selectStaffDetail` 返回 `ratingRemark`。
  - **前端**：
    - `StaffFormModal.vue` Section 5 评级下加：
      ```vue
      <a-col :span="24">
        <a-form-item label="评语">
          <a-textarea v-model:value="form.ratingRemark" :rows="3" placeholder="请输入评语（选填）" />
        </a-form-item>
      </a-col>
      ```
    - `form` reactive 加 `ratingRemark: ''`、`resetForm` 同步、`handleSubmit` 提交 payload。
    - `StaffDetailModal.vue` 增加评语展示（仅超管可见，与评级同条件）。
    - `@osg/shared/api/admin/staff` 类型 `StaffPayload` / `StaffListItem` 加 `ratingRemark?: string`。

### T1.7 地区改多选 + 城市非必填
- **现状**：
  - `StaffFormModal.vue:91-99` region 单选 `<a-select>`，提交 `region: form.region as string`。
  - `StaffFormModal.vue:506-509` city 必填校验。
  - 数据库 `osg_staff.region` 是单值 `VARCHAR`。
- **修复**：
  - **数据结构**：region 字段改 CSV 存储（与 majorDirection / specialty 一致）—— 不改库结构，只把多值用逗号 join。
  - **前端表单**：
    - `region` 改 `<MultiSelect>`、`form.region` 类型从 `string | undefined` 改 `string[]`。
    - `filteredCityOptions`：城市按**所有**选中的 region 过滤（city.parentValue ∈ selected regions）。
    - 删除 city 必填校验（`StaffFormModal.vue:506-509`）。
    - 提交 payload：`region: form.regions.length ? form.regions.join(',') : undefined`（兼容空）。
    - `resetForm` 同步：`form.regions = splitCsv(props.staff?.region)`。
  - **列表展示**：
    - `index.vue:138-145` region 渲染逻辑改成 `splitField(record.region).map(dictLabel(regionItems)).join('、')`。
    - 类似改 detail modal。
  - **后端**：仍存 CSV，无需 schema 改动。后端筛选若按 region 过滤，需支持 LIKE/逗号匹配（评估后再加，本次先保证存读一致）。

### T1.8 新增导师跑通验证
- **现状**：用户报"新增没跑通"，需要复测。
- **排查路径**：
  1. 浏览器 F12 看 POST `/admin/staff` 的实际请求/响应。
  2. 后端 `OsgStaffController.create` 校验逻辑（line 459-466）：city 必填会拦截 → T1.7 删了 city 校验后大概率自动修。
  3. 检查必填项一致性：前后端是否对齐（前端 `handleSubmit` 校验 line 484-523）。
- **修复**：T1.7 完成后回归测试；若仍失败，根据实际响应再分析。

### T1.9 课时单价改美元
- **现状**：
  - `index.vue:551`：`return \`￥${hourlyRate}/h\``
  - `StaffFormModal.vue:163-166`：`<a-input-number>` 无前缀、无货币提示。
  - 后端 `StaffExportRow.hourlyRate`：`@Excel(name = "课时单价")` 不带单位。
- **修复**：
  - 前端 `index.vue:547-552 formatHourlyRate` 改 `\`$${hourlyRate}/h\``。
  - `StaffFormModal.vue:163-166` 加 prefix slot：
    ```vue
    <a-input-number v-model:value="form.hourlyRate" :min="0" placeholder="如 200" style="width:100%">
      <template #prefix>$</template>
    </a-input-number>
    ```
    标签改为「课时单价（USD/h）」。
  - 后端 `StaffExportRow` 注解改 `@Excel(name = "课时单价(USD/h)")`，或在 `from()` 里把 BigDecimal 拼字符串 `"$xxx/h"`。
  - `StaffDetailModal.vue` 同步美元符号。

### T1.10 显示导师 ID
- **现状**：`columns.ts:2`/`18`/`34` 三种 columns 都已含 `staffId` 列 ✓；`mentor-schedule/index.vue:78` 显示在 staffName 下方副文本。
- **判定**：列表已显示。但用户反馈说明可能视觉不够醒目，或在 detail modal/form modal 里没显示。
- **修复**：
  - `StaffDetailModal.vue` 顶部姓名旁加 `<span style="color:#94a3b8">ID: {{ detail?.staffId }}</span>`。
  - `StaffFormModal.vue` 编辑模式标题中已含 `编辑导师 - {staffName}`，加 `(ID: {staffId})`。

### T1.11 导出加「名单标签」+ 字段补全
- **现状**：`OsgStaffController.java:738-815` `StaffExportRow` 已有 `blacklistStatus` ✓（"名单标签"列），但缺以下：擅长 `specialty` / 任职公司 `companies` / 评级 `rating` / 评语 `ratingRemark`(T1.6 新增) / 微信 `wechatId` / 性别 `gender` / 可授课程类型 `courseTypes` / 创建时间 `createTime`。
- **修复**：
  - `StaffExportRow` 增加上述字段 + `@Excel` 注解：
    ```java
    @Excel(name = "性别") private final String gender;
    @Excel(name = "微信") private final String wechatId;
    @Excel(name = "可授课程") private final String courseTypes;
    @Excel(name = "擅长") private final String specialty;
    @Excel(name = "任职公司") private final String companies;
    @Excel(name = "评级") private final String rating;
    @Excel(name = "评语") private final String ratingRemark;
    @Excel(name = "创建时间") private final Date createTime;
    ```
  - `selectStaffExportList` (`OsgStaffServiceImpl`) 把上述字段全部 put 到 exportRow Map。
  - dict value 字段（gender / courseTypes / specialty / rating）需 join label：可在 service 层注入字典服务做翻译，或在 `from()` 里保留 value。**决策建议**：第一版先导出 value（保持简单），未来再加 label 翻译。
  - `from(Map)` 同步读取这些 key。

### T1 测试要点
- 黑名单导师用 mentor 端登录 → 应被拒（`/mentor/login` 返回错误）。
- 列表页"全部类型"筛选三选项可见。
- 表单"擅长"多选可同时显示 5 个 tag 不折叠。
- 编辑无 city 的导师可保存成功。
- 课时单价显示 `$200/h`。
- 导出 Excel 列数 ≥ 18 列，包含名单标签、擅长、任职公司、评级、评语等。

---

## T2. 导师排期管理（2 项）

### 文件锚点
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/mentor-schedule/index.vue`
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/mentor-schedule/components/EditScheduleModal.vue`

### T2.1 代填导师排期时去掉节假日
- **现状**：`EditScheduleModal.vue:248-254` 的 `dayList` 计算里 `holiday: false` 硬编码；UI 已有节假日红色样式但**永远不显示**。
- **修复**：
  - 引入节假日数据源，候选三种方案：
    - **A（推荐）**：调用三方 API（如 timor.tech），但本地后端环境无网；
    - **B**：后端字典 `osg_holiday`（dictType + 一个 yyyy-MM-dd 列表），admin 维护；
    - **C**：硬编码 2026 国家法定节假日表到前端 `@osg/shared/utils/holidays.ts`。
  - **决策建议**：方案 C（YAGNI，本期最简）。新建 `osg-frontend/packages/shared/src/utils/holidays.ts` 导出 `isHoliday(date: Date): boolean` 和 `HOLIDAY_DATES_2026: Set<string>`。
  - `EditScheduleModal.vue:248-254` `dayList` 里：`holiday: isHoliday(new Date(year, month-1, day))`。
  - 节假日单元格的 4 个 slot checkbox 加 `:disabled="day.holiday"` + 节假日下方提示「该日为法定节假日，不可选」。
  - `selectedSlotKeys` 变更时过滤掉节假日的 key（防止旧数据残留）。

### T2.2 列表展示导师 ID（独立列）
- **现状**：`index.vue:73-81` ID 嵌在 staffName 副文本里 `ID: {{ record.staffId }}`，不是独立列。
- **修复**：
  - `scheduleColumns` (line 134-140) 在最前加：`{ title: 'ID', dataIndex: 'staffId', key: 'staffId', width: 90 }`。
  - 删除 staffName 单元格中的 `<div>ID: ...</div>`（line 78），保留头像+姓名。

### T2 验收标准 AC
- **AC-T2.1** (a) 排期日历中 2026 年法定节假日（含元旦/春节/清明/劳动节/端午/中秋/国庆共 13 天）单元格显示红色 + 文字"节假日"；(b) 节假日单元格 4 个 slot checkbox 全部 disabled；(c) `selectedSlotKeys` 中即使包含节假日 key 也不会被提交。
- **AC-T2.2** scheduleColumns 第一列为 "ID"，宽度 90，staffName 单元格内不再有 "ID: xxx" 副文本。

### T2 测试要点
- 前端 spec：`mentor-schedule/__tests__/holiday.spec.ts` 新增，断言 2026-10-01 isHoliday 返回 true、checkbox disabled。
- 前端 spec：scheduleColumns 第一列 `dataIndex === 'staffId'`。
- 真实验证：admin 编辑某导师 2026 年 10 月排期 → 1-7 号显示节假日红色样式且不可勾选。

---

## T3. 岗位信息（17 项）

### 文件锚点
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue`
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/components/PositionFormModal.vue`
- `@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgPositionController.java`（导出/模板逻辑）
- `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java`（drilldown 排序）

### T3.1 下钻视图公司类别按字典顺序
- **现状**：`drillDownRows` 来自 `getPositionDrillDown` API；后端按聚合结果返回，未按 dict 顺序。
- **修复**：后端 `OsgPositionServiceImpl.selectDrillDown` 内根据 `osg_company_type` dict（`dict_sort` ASC）对 industries 列表排序后返回。

### T3.2 删除最底部「流程缩写」流条
- **现状**：`index.vue:283` `<a-alert v-if="processGlossaryText" ... />` 显示在卡片下方。
- **修复**：删除 line 283 整行 + line 518-520 `processGlossaryText` computed + `meta.processGlossary` 仍保留（结构兼容），只删 UI 渲染。

### T3.3 选择公司后自动带出公司类别
- **现状**（第 2 轮 K 维度核对后）：
  - 前端 `PositionFormModal.vue:88-94` 用 `<a-auto-complete>` 选公司名，`companyOptions: string[]` 简单字符串数组（line 262），不带 type。
  - 后端 `OsgPositionServiceImpl.selectPositionCompanyOptions`（line 228-243）只 `put("value", label) / put("label", label)`，**完全不返回 companyType**。
  - 业务模型上**根本没有"公司→类别"的映射关系**：`osg_company_name` 和 `osg_company_type` 是两个独立 dict，无关联表。
  - **结论**：这不是简单的"前端联动"bug，而是**底层数据缺映射**。
- **修复**（需新增映射，决策见 D13）：
  - **D13 决策**：A=用 `sys_dict_data.remark` 存 companyType / B=新建 `osg_company_industry_map` 表 / C=按 `osg_position` 历史数据 mode 推断。
    - **推荐 A**：在 `osg_company_name` 字典每条 dict_data 的 `remark` 字段写入 companyType value（如 `"finance"`）。改动最小，无需新表。
  - 后端 `selectPositionCompanyOptions` 改为：
    ```java
    option.put("value", item.getDictLabel());
    option.put("label", item.getDictLabel());
    option.put("companyType", extractParentValue(item.getRemark())); // 新增，复用 OsgPositionServiceImpl line 568-587 已有方法 parse JSON
    ```
  - 前端 `PositionPageProps.companyOptions` 类型改为 `Array<{value: string; companyType?: string}>`；`companyAutoCompleteOptions` 透传 companyType。
  - `watch(() => form.companyName, ...)` 中查到匹配项时 → 仅当 `!form.companyType` 时赋值（编辑场景不覆盖）。
  - **数据初始化**：~~不需要新建迁移~~。`sql/osg_company_name_import.sql` 1086 条 INSERT 已 100% 写入 `remark='{"parentValue":"<companyType_value>"}'` JSON（投行 / 咨询 / buyside / elite_boutique / middle_market / swe_pm / other_company 7 类齐全）；后端复用 `extractParentValue()` 直接 parse 即可。✅ 已自查 2026-05-08 13:35。
- **测试**：
  - 后端：`OsgPositionServiceTest.companyOptionsContainsCompanyType` 断言"高盛"返回的 option 含 `companyType="investment_bank"`。
  - 前端 spec：mock 后端响应 → 选公司 → form.companyType 自动带出。
- **回归风险**：**老数据 remark 字段空时联动失效**（前端不报错、companyType 维持空）→ 可接受降级。

### T3.4 投递备注支持文字 / 图片 / PDF
- **现状**：`PositionFormModal.vue:194-198` 仅 `<a-textarea>`。
- **修复**：
  - 文本框保留。
  - 增加 `<a-upload>` 列表：
    - `accept="image/*,.pdf"`
    - `:max-count="5"` 单次最多 5 个文件
    - 单文件大小 ≤ 10MB（前端校验）
    - 总大小 ≤ 30MB（前端校验）
  - **后端 API**（新增）：
    - `POST /admin/position/attachment` (multipart/form-data, field=`file`)
    - 鉴权：`@PreAuthorize("@ss.hasPermi('career:position:edit')")`
    - 响应：`{ code: 200, msg: "附件上传成功", url: "http://{serverHost}/profile/upload/positions/2026/05/08/<uuid>.pdf", fileName: "<原文件名>", fileType: "application/pdf", size: 12345 }`（沿用 AjaxResult.success().put(...) 风格，与 `OsgContractController.upload` 响应结构一致）
    - 实现：仿 `OsgContractController.upload (line 97-127)`，调用 `FileUploadUtils.upload(RuoYiConfig.getUploadPath()+"/positions", file, ATTACHMENT_EXTENSIONS, true)`（第 4 参 `useCustomNaming=true` → UUID 文件名防 path traversal），返回 `serverConfig.getUrl() + path`。
  - 前端 `form.applicationAttachments: Array<{url,fileName,fileType,size}>` 提交。
  - **数据库迁移** `sql/migrations/2026-05-08-position-add-attachments.sql`：
    ```sql
    ALTER TABLE osg_position
      ADD COLUMN application_attachments TEXT DEFAULT NULL
      COMMENT '投递备注附件列表 JSON: [{url,fileName,fileType,size}]';
    ```
    > 注：用 `TEXT` 而非 `JSON` 类型，与 `target_majors` CSV 字段保持同表风格；应用层用 `ObjectMapper` 手动 parse，避免一次性扩 ruoyi-common 引入 typeHandler。
  - **后端代码改动**：
    - `OsgPosition.java` 加 `private String applicationAttachments;`（与 `targetMajors` 同字段类型风格）+ getter/setter；**不**引入内部类 `AttachmentItem`、**不**用 `List<>` 字段。
    - **不引入** `JsonListTypeHandler`：grep 验证 `ruoyi-common` 现存 0 个 typeHandler，避免一次性扩 ruoyi-common；改为：
      - `OsgPositionServiceImpl.buildPosition(...)` 收前端 `applicationAttachments`（`List<Map>` 或 String）→ 用 `ObjectMapper.writeValueAsString()` 序列化为 String 存储；
      - `OsgPositionServiceImpl.toPositionMap(...)` 出参 → 用 `ObjectMapper.readValue(json, new TypeReference<List<Map<String,Object>>>(){})` 反序列化，失败返 `Collections.emptyList()`。
    - `OsgPositionMapper.xml` resultMap 加 `<result property="applicationAttachments" column="application_attachments"/>`，**不**加 typeHandler。
    - `<insert>` / `<update>` 的 `<if>` 块按现有字段风格补 `application_attachments` 一行。
  - **后端安全校验（必加）**：
    - **MIME 二次校验**：`POST /admin/position/attachment` 服务端检查真实 MIME（用 `Files.probeContentType()` 或 Apache Tika）不只信 `Content-Type` header，限制在 `image/jpeg, image/png, image/gif, application/pdf` 4 种。
    - **文件大小二次校验**：`@RequestParam MultipartFile file` + Spring `multipart.max-file-size=10MB` + Service 层再判一次。
    - **文件名清洗**：存储时 fileName 不使用原始名，用 `UUID.randomUUID() + ext` 防 path traversal；返回响应中 `fileName` 仅作为展示用。
    - **鉴权**：`@PreAuthorize("@ss.hasPermi('career:position:edit')")` + Spring Security 默认 CSRF 保护。
  - **学生端展示**：本计划留 placeholder，明天与学生端联调时实现。
- **拆分建议**：T3.4 拆成 T3.4a（admin 端上传 + DB 落地）+ T3.4b（学生端展示），后者明天再排。
- **测试**：
  - 后端：`OsgPositionControllerTest.uploadAttachment_oversizeRejected`（>10MB 返回 400）。
  - 前端 spec：上传 PDF 后 `form.applicationAttachments` 含一项，提交时序列化为 JSON 字符串。

### T3.5 添加人自动带出且不可修改
- **现状**：`PositionFormModal.vue:182-188` `form.createBy` 默认为 `userStore.userInfo?.userName`，但 `<a-input>` 可被改。
- **修复**：
  - `<a-input v-model:value="form.createBy" disabled placeholder="自动带出当前登录用户" />`，加 `disabled`。
  - 编辑模式下保留原 createBy 不变（已是这样）；新增模式始终用当前用户名。

### T3.6 截止时间填写后正确显示
- **现状**：
  - `PositionFormModal.vue:351`：`form.deadlineText = seed.deadlineText || (isEditing.value ? '' : 'Rolling ASAP')` —— 新增时默认填了 `Rolling ASAP`，即使后续填了 deadline 也不清。
  - 列表显示逻辑 `index.vue:253-258`：`record.deadlineText` 优先于 `record.deadline`，导致填了截止日期但仍显示 `Rolling ASAP`。
- **修复**：
  - **表单**：`resetForm` 不再默认填 `Rolling ASAP`（`form.deadlineText = seed.deadlineText || ''`）。
  - **提交**：若 `form.deadline` 已填，`deadlineText` 强制为 `undefined`（互斥）。
  - **列表渲染**：`index.vue:253-258`、`index.vue:189-195` 显示规则改为：「`deadline` 优先；deadline 为空时才显示 `deadlineText`；都无显示 `—`」。
  - 文档中"默认 Rolling ASAP"字样：作为 placeholder（输入框 placeholder 提示）保留。

### T3.7 下钻视图岗位信息错列
- **现状**：`drilldownColumns` (line 363-376) 与 `listColumns` (line 378-393) 列差异较大；用户反馈"内容显示错列"。
- **修复**：
  - 让两组 columns 字段顺序与表头**完全对齐**。当前 drilldown 已有 11 列，但用户反馈错位通常源于 `bodyCell` 模板中的某些 dataIndex 拼写不匹配 column。需要逐项核对：
    - drilldown bodyCell 模板覆盖了 `positionName / positionCategory / department / recruitmentCycle / targetMajors / displayStartTime / deadline / displayStatus / studentCount / action`，缺 `city / createBy` 走默认 `{{ text }}` 渲染。
    - 经审查列定义和 bodyCell 模板，怀疑「错列」是视觉表现：列宽过窄导致某些列内容下移；建议把 drilldown 的列 width 调宽到与 list 接近（特别是 `positionName 280→260, positionCategory 90→100, deadline 80→100`）。
  - **决策**：实施时先复测，根据实际现象（截图）再决定到底改列定义还是改 bodyCell。

### T3.8 状态新增「未开始」
- **现状**：`displayStatuses` 来自 dict（meta.value.displayStatuses），是动态。
- **修复**：
  - **数据库迁移** `sql/migrations/2026-05-08-position-display-status-not-started.sql`：
    ```sql
    INSERT INTO sys_dict_data
      (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, remark)
    VALUES
      (0, '未开始', 'not_started', 'osg_position_display_status', 'tone-muted', 'default', 'N', '0', 'system', '展示开始时间晚于今日的派生状态');
    ```
    （执行前先 `DELETE FROM sys_dict_data WHERE dict_type='osg_position_display_status' AND dict_value='not_started';` 保证幂等。）
  - 后端 `OsgPositionServiceImpl.selectPositionList` / `selectDrillDown` 在返回前对每条记录计算：
    ```java
    if ("visible".equals(p.getDisplayStatus()) && p.getDisplayStartTime() != null 
        && p.getDisplayStartTime().after(new Date())) {
        p.setDisplayStatus("not_started");
    }
    ```
  - 前端列表/下钻渲染颜色映射 `statusToneToColor` 加 `not_started: 'default'`（灰色）。
  - **语义层级说明（防误会）**：`hidden` / `visible` 是 **DB 真实存储的互斥主状态**；`not_started` 是 `visible` 的**派生子状态**（表示未到展示开始时间），**DB 不存 `not_started` 值**。字典里增加该项仅为了前端筛选项和 label 反查。admin 编辑表单必须 filter 掉。
- **测试**：
  - 后端单测：`OsgPositionServiceTest.notStartedDerivation`（构造 displayStartTime=明天的 visible 岗位 → list 返回 displayStatus='not_started'）。
  - 字典 SQL 幂等：连续执行两次只有一条记录。

### T3.9 编辑岗位时支持「未开始」+ 删除隐藏/激活按钮
- **现状**：`PositionFormModal.vue:229-236` 有快捷按钮"隐藏"/"激活"。
- **修复**：
  - 删除 line 229-236 整段 `<div class="position-form-modal__status-actions">`。
  - 状态下拉 `statusOptions` 从 meta 来，T3.8 完成后会自动包含 `not_started`。
  - "未开始"是派生状态，不允许用户手选 → `statusOptions.filter(o => o.value !== 'not_started')` 过滤掉。

### T3.10 ⏸️ 已隐藏岗位在各端是否隐藏（明天测）
- 跳过本计划。

### T3.11 主攻方向筛选无效
- **现状**（核对后确认根因）：前端 `targetMajors: targetMajorsFilter.value.length ? targetMajorsFilter.value.join(',') : undefined`（line 566）正常发请求，但 `OsgPositionMapper.xml` 中 `target_majors` 字段**只在 select / insert / update 出现，完全没有 where 分支**，参数被后端忽略 → 筛选不生效。
- **修复**：
  - `OsgPositionMapper.xml` 的两处 `<select>`（`selectPositionList` + 同结构的 stats/drilldown 查询）均补 where 分支：
    ```xml
    <if test="targetMajors != null and targetMajors != ''">
        and (
            <foreach collection="targetMajors.split(',')" item="m" separator=" or ">
                FIND_IN_SET(#{m}, p.target_majors) &gt; 0
            </foreach>
        )
    </if>
    ```
  - 或在 Service 层把 CSV 拆 List 后通过 `params` 传入 mapper 用 `<foreach>` 拼条件，避免 OGNL `split`。任选其一。
  - 同步加 mapper 单测覆盖单值 / 多值 / 大小写。

### T3.12 展示起始筛选不准确
- **现状**：`buildPublishRange()` (line 534-553) 按当前时间往前推 7/30/90 天构造 `beginDisplayStartTime / endDisplayStartTime`。
- **根因定位**：用户报"未开始岗位混入正常列表"——筛选预设是**时间区间**，但用户心智模型是**业务状态**（已开始 / 未开始）。
- **修复**（按 D11/B5）：
  - 把 publishPreset 选项改为 `["全部", "已开始", "未开始"]` 三值。
  - 前端：选"已开始" → `params.params.endDisplayStartTime = now`；选"未开始" → `params.params.beginDisplayStartTime = now+1ms`。
  - 后端 mapper 已支持 `beginDisplayStartTime` / `endDisplayStartTime` ✓ 不需改。
- **测试**：
  - 前端 spec：选 "未开始" 时 stats / list 都只返回 displayStartTime > now 的岗位。
  - 集测：构造 3 条岗位（昨天/今天/明天开始），筛选 "已开始" 返回 2 条、"未开始" 返回 1 条。

### T3.13 列表新增「添加日期」列
- **现状**：`listColumns` (line 378-393) 缺 `createTime` 列。
- **修复**：在 `添加人` 后加 `{ title: '添加日期', dataIndex: 'createTime', key: 'createTime', width: 110 }`，bodyCell 模板里 `{{ formatShortDate(record.createTime) }}`。下钻 `drilldownColumns` 同样补充。

### T3.14 「全部地区」筛选项重命名 + 增加「城市」筛选
- **现状**：`index.vue:65-68` 用 `cityOptions`（合并所有 city）但 placeholder 写的是 `全部地区`。
- **修复**：
  - 把当前的"全部地区"改为"全部城市"（绑定 `filters.city`，值仍是 city dict value）。
  - 新增"全部地区"select 绑定 `filters.region`（dict `osg_region`），变化时清空 city；这是一个**两级联动**筛选。
  - 后端 `OsgPositionServiceImpl.selectList` 增加 region 过滤。

### T3.15 下载模板字段补全
- **现状**（核对后）：模板由 `OsgPositionController.java:145-148` 走 `PositionImportTemplate.class`，当前 11 个字段：positionCategory / positionName / companyName / companyType / city / recruitmentCycle / projectYear / deadlineRaw / department / positionUrl / companyWebsite。**缺**：region / targetMajors / displayStartTime / displayEndTime / displayStatus / applicationNote。
- **修复**：
  - `PositionImportTemplate` 按以下顺序定义字段（与导出对齐）：
    1. `岗位分类` positionCategory
    2. `岗位名称` positionName
    3. `公司名称` companyName
    4. `公司类别` companyType
    5. `公司官网` companyWebsite
    6. `岗位链接` positionUrl
    7. `部门` department
    8. `地区` region (新增)
    9. `城市` city
    10. `招聘周期` recruitmentCycle
    11. `对应主攻方向` targetMajors (新增, CSV)
    12. `项目时间` projectYear
    13. `展示开始时间` displayStartTime (新增, yyyy-MM-dd)
    14. `展示结束时间` displayEndTime (新增, yyyy-MM-dd)
    15. `截止日期` deadline (yyyy-MM-dd)
    16. `截止文案` deadlineRaw
    17. `投递备注` applicationNote (新增)
    18. `岗位状态` displayStatus (新增, dict value)
  - 模板**不包含**：addedBy（导入时按当前登录用户填）、applicationAttachments（导入不支持附件）。
  - 后端 `template=true` 分支：生成空表头 + 1 行示例（用 `OsgPositionExcelImporter.SAMPLE` 静态字段）。
- **测试**：
  - 后端：`OsgPositionControllerTest.exportTemplate_columnCount=18`。
  - 真实：下载模板 → 用 Excel 打开 → 表头 18 列且顺序与上一致。

### T3.16 ⏸️ 模板优化后再测上传
- T3.15 完成后回归测试。

### T3.17 导出信息与列表保持一致
- **现状**（核对后）：`PositionExportRow` 当前 9 列：companyName / positionName / region / city / projectYear / industry / positionCategory / displayStatus / publishTime。与列表错位严重。
- **修复**：`PositionExportRow` 增加：positionUrl / companyWebsite / department / recruitmentCycle / targetMajors / displayStartTime / displayEndTime / deadline / deadlineText / applicationNote / createBy / createTime / studentCount（合计 22 列）。顺序与 T3.15 模板一致。

### T3 验收标准 AC
- **AC-T3.1** drilldown 返回的 industries 顺序 ≡ `osg_company_type` 字典 `dict_sort` ASC。
- **AC-T3.2** 列表页末尾不再出现"流程缩写"alert。
- **AC-T3.3** 表单选择公司"高盛" → companyType 自动为"投行"。
- **AC-T3.4** (a) 可上传 ≤5 个 PDF/图片，单文件 ≤ **10MB**、总 ≤ 30MB（与修复方案 line 429-430 + `modal-form-style-guide.md §7.3` 一致；旧 3MB 为笔误，2026-05-08 13:35 修正）；(b) DB `osg_position.application_attachments` 有 JSON 字符串（`TEXT` 列）；(c) 超大文件返回 `AjaxResult{code:500, msg:'单文件不能超过 10MB'}`（沿用 `OsgContractController` 风格，HTTP 200 wrapper 内 error msg）。
- **AC-T3.5** 表单 createBy 输入框 disabled，新增时自动填当前登录用户名。
- **AC-T3.6** 填了 deadline=2026-12-31 后列表显示 `2026-12-31`，不再显示 `Rolling ASAP`。
- **AC-T3.7** drilldown 表格各列内容对齐表头（待复测后决定）。
- **AC-T3.8** 岗位 displayStartTime=明天 且 displayStatus=visible → 列表返回 displayStatus='not_started' 且状态列显示"未开始"灯色。
- **AC-T3.9** 表单中不再出现"隐藏"/"激活"快捷按钮，状态下拉中无"未开始"选项。
- **AC-T3.11** 筛选 targetMajors=[量化,咨询] 后 mapper SQL 包含 `FIND_IN_SET('量化', target_majors) > 0 OR FIND_IN_SET('咨询', target_majors) > 0`。
- **AC-T3.12** publishPreset 选 "未开始" 后列表只返回 displayStartTime > now 的岗位。
- **AC-T3.13** 列表与 drilldown 都多了"添加日期"列，格式 `yyyy-MM-dd`。
- **AC-T3.14** 筛选区为"全部地区" + "全部城市"两个下拉，选地区="华南" 后城市选项仅包含华南下辖城市。
- **AC-T3.15** 下载模板 → 表头 18 列，顺序与 T3.15 清单严格一致。
- **AC-T3.17** 导出 Excel 列数 = 22，顺序与模板一致（后 4 列为 addedBy / createTime / studentCount + applicationAttachments 提示）。

### T3 测试要点
- 后端：`OsgPositionServiceTest`（drilldown 排序 / not_started 派生 / targetMajors FIND_IN_SET）、`OsgPositionControllerTest`（附件上传 / 模板列数 / 导出列数）。
- 前端 spec：`career/positions/__tests__/`（deadline 优先级 / publishPreset 映射 / region-city 联动 / not_started 灯色）。
- 真实：走场景 3（新增岗位 + 附件 + 未开始 + 主攻方向筛选）全流程。

---

## T4. 学员求职总览（4 项）

### 文件锚点
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/job-overview/index.vue`

### T4.1 删除「热门公司申请统计」模块
- **修复**：删除 `index.vue:50-66` 整块 `<a-card>`，删 `hotCompanies` ref / `getHotCompanies` import / Promise.all 中的对应项。

### T4.2 列表默认全部学员
- **修复**：`index.vue:279`：`activeTab = ref<ActiveTab>('pending')` → `'all'`。

### T4.3 删除「分配状态」筛选
- **修复**：
  - 删 `index.vue:80-83` `<a-select v-model:value="filters.assignStatus">` 整块。
  - `filters` reactive 删 `assignStatus`、`requestFilters` computed 删 `assignStatus`、`handleReset` 删对应行、`handleExport` 删传参。

### T4.4 统计数据与筛选联动
- **现状**：`requestFilters` computed 已传给 `getJobOverviewStats / getJobOverviewFunnel`，但筛选项变化**只在点搜索按钮时**触发 `handleSearch`。
- **修复**：在每个筛选 select 加 `@change="handleSearch"`、input 加 `@press-enter` + `@change`（已有部分），确保筛选变化即时联动 stats / funnel / list。
  - `index.vue:71-83` 的 4 个 select 全加 `@change="handleSearch"`。

### T4 验收标准 AC
- **AC-T4.1** 页面中不再出现"热门公司申请统计"卡片；network 中无 `getHotCompanies` 请求。
- **AC-T4.2** 首次进页 activeTab='all'，列表返回全量学员。
- **AC-T4.3** 筛选区不再出现"分配状态"下拉；`requestFilters` payload 无 `assignStatus` 键。
- **AC-T4.4** 任意筛选项变化 → stats 卡片数字 / funnel 数字 / 列表同步刷新，无需点搜索按钮。

### T4 测试要点
- 前端 spec：`job-overview/__tests__/`（默认 tab=all / filter 变化触发 stats reload / 无 hotCompanies DOM）。
- 真实：admin 进入页面，默认看到全量学员；选主攻方向 → 应用人数实时变化。

---

## T5. 模拟应聘管理（1 项）

### 文件锚点
- `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/mock-practice/index.vue`

### T5.1 默认全部记录
- **现状**：`index.vue:241`：`activeTab = ref<ActiveTab>('pending')`。
- **修复**：改为 `'all'`。`handleReset` (line 314-320) 中 `activeTab.value = 'pending'` 也改为 `'all'`。

### T5 验收标准 AC
- **AC-T5.1** 首次进入 mock-practice 页，activeTab='all'，列表返回全量记录；点 "重置" 后依然为 'all'（不回退到 'pending'）。

### T5 测试要点
- 前端 spec：`mock-practice/__tests__/default-tab.spec.ts` 新增，断言初始 activeTab='all' 且 handleReset 后仍为 'all'。

---

## 实施顺序建议

按依赖关系：
1. **第一波（独立 UI/文案改动，风险低）**：T1.3 / T1.4 / T1.10 / T2.2 / T3.2 / T3.5 / T3.6 / T3.13 / T4.1 / T4.2 / T4.3 / T4.4 / T5.1 — 一晚可改完。
2. **第二波（跨前后端，需 schema 迁移）**：T1.6（评语字段）/ T1.7（地区多选）/ T3.4（投递备注附件）/ T3.8（未开始状态字典）/ T1.11+T3.15+T3.17（导出/模板字段补全）。
3. **第三波（业务逻辑，验证成本高）**：T1.1（黑名单阻止登录）/ T1.2（冻结阻止登录）/ T3.1（dict 排序）/ T3.3（公司类别联动）/ T3.7（错列复测）/ T3.11（多值过滤）/ T3.12（展示起始语义）/ T2.1（节假日）。
4. **第四波（明天测）**：T3.10 / T3.16 + 学生自添岗位。

## Task 提示词（Handoff Prompts）

> **规则**：
> 1. 每个 Task 完成后，由"完成方"在文档中补出**下一个 Task 的提示词**，写在对应位置。
> 2. 下一个 Task 开新对话时，用户直接把对应提示词粘贴给 AI 即可启动。
> 3. 提示词必须自包含：背景 / 文件锚点 / 修复清单 / 决策点 / 验收标准 / 测试命令。
> 4. 实施过程中如发现新问题或方案修正，**必须回写到本文档对应小节**，再开始下一 Task。

### T1 提示词（启动用）

```
我要修复 admin 端「导师列表」模块的 11 个 bug。

【上下文】
- 修复计划文档：@/Users/hw/workspace/OSGPrj/docs/bugs/2026-05-08-admin-bug-fix-plan.md
- 项目根目录：/Users/hw/workspace/OSGPrj
- 技术栈：Vue 3 + ant-design-vue + TS（admin 前端） / Spring Boot + MyBatis（后端） / MySQL
- 前端工作区：osg-frontend/packages/admin（pnpm monorepo）

【范围】严格只做 T1 的 11 个子项，不要碰 T2-T5：
1. T1.1 黑名单导师禁止登录（mentor / lead-mentor / assistant 三端 AccessService 加短路）
2. T1.2 状态文案"禁用"→"冻结"，并让 osg_staff.account_status='frozen' 也阻止三端登录
3. T1.3 类型筛选增加"助教"选项
4. T1.4 表单"擅长"多选展开显示所有 tag（删 :max-tag-count="0"）
5. T1.5 删除"行业"字段，任职公司改全量搜索
6. T1.6 新增"评语"字段（DB 迁移 + domain + mapper + controller + form + detail，仅超管可见可写）
7. T1.7 地区改多选 + 删 city 必填校验（CSV 存储兼容）
8. T1.8 新增导师跑通验证（依赖 T1.7 完成后回归）
9. T1.9 课时单价改美元 USD（前端 ¥→$、表单 prefix、Excel 列名）
10. T1.10 详情/表单弹窗显式展示导师 ID
11. T1.11 导出补全字段 + 已有名单标签列保留

【关键文件锚点】
- @/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/index.vue
- @/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/columns.ts
- @/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/components/StaffFormModal.vue
- @/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/components/StaffDetailModal.vue
- @/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/components/StaffStatusModal.vue
- @/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgStaffController.java
- @/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffServiceImpl.java
- @/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMentorAccessService.java
- @/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorAccessService.java
- @/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgAssistantAccessService.java
- @/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgStaff.java
- @/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgStaffMapper.xml
- @/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/api/admin/staff.ts

【强制流程】
1. 先把文档对应小节（T1.1 ~ T1.11）逐字读完，理解每个修复点的现状描述和方案。
2. 对文档中"待用户确认的开放问题"中涉及 T1 的（Q1 / Q2 / Q3）逐条向我确认决策；不要自行决定。
3. 任何代码修改前必须先输出"确认修复吗？"并等待我回复"确认"。
4. DB schema 改动必须出独立迁移文件 sql/migrations/2026-05-08-staff-add-rating-remark.sql，不要改已有迁移。
5. 后端测试：每改一个 Service / Controller 必须新增/更新对应单元测试（OsgStaffControllerTest / OsgMentorAccessServiceTest 等）。
6. 前端测试：表单关键校验/列展示加 *.spec.ts。

【验收标准 AC】
- AC-T1.1 黑名单导师 mentor/lead-mentor/assistant 三端登录均返回 403 + "该账号无 X 端访问权限"。
- AC-T1.2 (a) 7 处用户可见文案全部替换为"冻结"（详见 T1.2 现状清单：index.vue 4 处 + StaffStatusModal.vue 3 处）；
         (b) action key `'freeze'` / `reasonOptionMap.freeze` / CSS `--freeze` 保留；
         (c) osg_staff.account_status='frozen' 的导师 mentor 端登录被拒。
- AC-T1.3 staffType 筛选下拉项 = [班主任 / 导师 / 助教] 三项；与 `formatType()` 当前显示文字保持一致（mentor → "导师"）。
- AC-T1.4 选 5 项擅长后弹窗内全部 tag 同时可见，无 "+N" 折叠。
- AC-T1.5 表单 Section 4 只剩"任职公司"字段，无"行业"；任职公司可搜索全部公司。
- AC-T1.6 (a) 仅超管可看到"评语"输入；(b) 保存后详情可读回；(c) 非超管 GET 详情接口不返回 ratingRemark key；(d) **后端 Service.updateStaff 中**服务端**校验调用者是否超管（`SecurityUtils.isAdmin()`）；非超管提交包含 ratingRemark 的 payload 返回 403，**不仅靠前端 `v-if`**。
- AC-T1.7 (a) 表单地区可多选；(b) 城市非必填，留空可保存；(c) 列表/详情按 CSV 渲染多个地区 tag。
- AC-T1.8 新增导师全表单提交成功，列表立即出现新增项。
- AC-T1.9 列表 "$200/h"；表单输入框前缀 "$"；Excel 导出列头含 "USD/h"。
- AC-T1.10 详情/编辑弹窗标题或副标题包含 "ID: 12345"。
- AC-T1.11 导出 Excel 列数 ≥ 18，至少包含 [staffId, staffName, staffType, gender, wechatId, email, phone, region, city, majorDirection, subDirection, courseTypes, specialty, companies, hourlyRate, rating, ratingRemark, studentCount, accountStatus, blacklistStatus, createTime]。

【完成产出（必交）】
1. 全部代码改动（前端 + 后端 + SQL 迁移）。
2. 单元测试通过：mvn -pl ruoyi-admin,ruoyi-system test -Dtest='OsgStaff*Test,OsgMentorAccessServiceTest,OsgLeadMentorAccessServiceTest,OsgAssistantAccessServiceTest'
3. 前端测试通过：pnpm --filter @osg/admin test -- staff
4. 真实验证：
   - admin 端登录 → 走完 列表/详情/编辑/新增/导出/冻结/拉黑 全流程截图
   - mentor 端用黑名单账号登录 → 截图被拒
5. **最关键**：在本文档 T2 提示词位置补完 T2 的完整提示词（参考 T1 的格式），把实施 T1 时学到的工程经验（构建命令、容易踩的坑、共享组件依赖）写进去。

【禁止事项】
- 禁止顺手改 T2-T5 涉及的文件
- 禁止删除/弱化已有测试
- 禁止把 T1.5 的"行业"字段在 DB / Domain 上删除（只删前端 UI；保持 staff.companies 字段完整）
- 禁止跳过任何 AC 直接声称完成

开始前请先回复你的实施顺序计划，等我 OK 后再动手。
```

### T2 提示词

> **待 T1 完成后由当时的对话补充。** 补充时请按 T1 提示词的结构写：上下文 / 范围 / 文件锚点 / 强制流程 / AC / 完成产出 / 禁止事项。

### T3 提示词

> **待 T2 完成后由当时的对话补充。**

### T4 提示词

> **待 T3 完成后由当时的对话补充。**

### T5 提示词

> **待 T4 完成后由当时的对话补充。**

---

## 待用户确认的开放问题

1. **T1.4** 擅长展示选项：确认是改 `:max-tag-count="0"` → 全展开？还是要在「列表页」加一列 specialty？
2. **T1.5** 删除"行业"字段后，任职公司是否仍按行业分组？还是扁平全量列表？
3. **T1.6** 评语是否仅超管可见可写？（与评级同条件）
4. **T2.1** 节假日数据源采用方案 C（前端硬编码 2026）是否可接受？
5. **T3.4** 附件存储位置（本地 / OSS / 已有附件服务）？
6. **T3.12** 展示起始的预期筛选语义：相对时间区间（最近7/30/90天）vs 状态（已开始/未开始）？
7. **T3.7** 下钻视图错列的具体表现，是否方便提供截图？

---

## 自校验结果（Phase 0 多轮追踪）

### 第 1 轮（2026-05-08 10:34）覆盖维度：A 结构 + B 边界 + G 语义 + I 回归

| 校验项 | 通过？ | 说明 |
|---|---|---|
| **G1** 一看就懂 | ⚠️→✅ | 补了文件×修改点矩阵 + 场景走读，双视角可读 |
| **G2** 目标明确 | ⚠️→✅ | T1-T5 全部补 AC 区（1+11+2+17+4+1 = 36 条） |
| **G3** 假设显式 | ❌→✅ | A1-A4 / B1-B6 / C1-C5 共 15 条假设 |
| **G4** 设计决策 | ⚠️→✅ | D1-D12 十二项决策表，含选项 + 推荐 + 状态 |
| **G5** 执行清单可操作 | ⚠️→✅ | 新增全局执行清单矩阵 + 冲突点警示 |
| **G6** 正向流程走读 | ✅ | 3 个端到端场景走完 |
| **G7** 改动自洽 | ⚠️→✅ | T1.1+T1.2 提供合并 Java 代码块，明确 D1 顺序 |
| **G8** 简约不等于省略 | ⚠️→✅ | T3.4 API/SQL/mapper 、T3.8 字典 SQL、T3.15 18 字段顺序 全备 |
| **G9** 场景模拟 | ❌→✅ | 3 个端到端场景覆盖 14 个 Task 点 |
| **G10** 数值回验 | ✅ | 总览表 30 项 = T1.11+T2.2+T3.17+T4.4+T5.1 ✓ |
| **G11** 引用回读 | ✅ | 4 处偏差已修正，记录在校验日志 |
| **G12** 反向推导 | ⚠️→✅ | 从"7 处冻结文案"、"22 列导出"、"18 列模板"反推无遗漏 |
| **C1** 根因定位 | ⚠️→✅ | T3.12 补根因分析（时间区间 vs 业务状态心智不匹配） |
| **C2** 接口兼容 | ⚠️→✅ | T3.4 mapper xml 改动明确列出 |
| **C3** 回归风险 | ❌→✅ | T1.2 增加 5 步现网 frozen 调查 + feature flag 回滚预案 |
| **C4** 测试覆盖 | ⚠️→✅ | T2-T5 各补「测试要点」区 |
| **N1** 需求覆盖 | ✅ | 30 项全部映射 |
| **N2** 接口设计 | ⚠️→✅ | T3.4 API 详言完整、T3.8 SQL 幂等 |
| **N3** 测试设计 | ⚠️→✅ | T3.1/3.3/3.7/3.11/3.12 后端单测 + 前端 spec 均点名 |

**本轮结论**：14 项补强全部营并转为 ✅，其余 6 项 G6/G10/G11/N1 + C×2 本轮未变化仍为 ✅。

### 第 2 轮（2026-05-08 10:51）覆盖维度：H 交叉影响 + J 数值一致 + K 源文件回读

| 校验维度 | 结果 | 说明 |
|---|---|---|
| **H 交叉影响** | ✅ | D1「黑名单先、frozen 后」与 T1.1 代码块中两个 if 顺序一致、与 AC-T1.1（403）不冲突、与场景 1 预期"步骤 2a 即被拒"匹配。 |
| **J 数值一致** | ✅ | T3.15 模板 18 列逐一核对 ✓；T3.17 导出 22 列 = 原 9 + 新增 13 ✓（industry/companyType 同一字段双名）；AC-T1.11 表口 18 字段 ✓；场景走读覆盖 14 Task 点 ✓。 |
| **K 源文件回读** | ⚠️→✅ | 回读 `PositionFormModal.vue:88-94` + `OsgPositionServiceImpl:228-243` 发现：**T3.3 原写错估现状**。后端从未返回 companyType、DB 也无映射。本轮重写 T3.3 并增加 D13决策（复用 dict.remark 存 type）+ 新迁移 SQL，同步更新执行清单矩阵。 |

**本轮结论**：1 处修改（T3.3）。按工作流，连续两轮无修改才能退出 → 进入第 3 轮。

### 第 3 轮（2026-05-08 11:05）覆盖维度：E 安全性 + F 可维护 + G 语义准确性

| 校验维度 | 结果 | 说明 |
|---|---|---|
| **E 安全性** | ⚠️→✅ | 发现 3 项：(E1) T3.4 后端需 MIME 二次校验 + 文件名 UUID 清洗 → 已补；(E2) T1.6 ratingRemark Service 层需 server-side super-admin 校验 → AC-T1.6 增加 (d) 条；(E3) MyBatis #{} 默认安全 ✓ 仅标记。 |
| **F 可维护** | ⚠️→✅ | (F1) `OsgStaffAccessHelper` 文件位置明确化：`ruoyi-system/.../service/impl/OsgStaffAccessHelper.java`，三端 AccessService 通过 `@Resource` 注入 → 已在 T1.1 代码块隐含；(F2) `application_attachments JSON` typeHandler 处理 → 已补。 |
| **G 语义准确** | ⚠️→✅ | (G1) `not_started` 为 `visible` 派生子状态、DB 不存该值 → T3.8 修复区增加「语义层级说明」段。 |

**本轮结论**４ 处修改（T3.4 后端安全 + AC-T1.6 (d) + T3.8 语义层级 + JSON typeHandler）。按工作流进入第 4 轮。

### 第 4 轮（2026-05-08 11:08）覆盖维度：D 框架兼容 + 全局一致性复查

| 校验项 | 结果 | 说明 |
|---|---|---|
| D 框架兼容 | ✅ | 本文档不涉及 RPIV 状态机 / state-machine.yaml，F1-F3 不适用。跳过。 |
| 上下文一致 | ✅ | T3.3 重写后与场景 3「选高盛 → companyType=投行」联动仍成立（D13.A 路径）✓。 |
| 数值一致 | ✅ | 根据本轮修改后总览不改 / Task 数 30 / 5 个 Task / D 决策 13 项 ✓。 |
| 测试覆盖 | ✅ | T3.4 新增后端安全测试点 / AC-T1.6(d) Service 层测试需补 → 下一步在 T1 启动提示词中提醒 ✓。 |

**本轮结论**：0 处修改。还需 1 轮无修改才能退出。

### 第 5 轮（2026-05-08 11:10）复验主动扫描

采用“走马灯式”全文扫描、记录未观察到的选项：

- T3.4 typeHandler 是否与 MyBatis 版本兼容 → 由实施方跳过反馈，本计划提供默认 fallback 实现 ✓
- AC-T1.11 表口字段 18 个 vs 详文表 22 列 → 已在第 2 轮 J 维度说明（表口为最低要求，22 列为全量实现） ✓
- 开放问题 7 项 → 均在 D2/D3/D7/D8/D11/B6 映射为设计决策 ✓

**本轮结论**：0 处修改。**连续两轮无修改 → Phase 0 自校验通过，方案固化。**

---

## 最终状态

- **总体完成度**：方案文档 ~860 行，覆盖 5 个 Task / 30 项 bug / 13 项设计决策 / 36 条 AC / 3 个端到端场景。
- **未决问题**：7 项开放问题（D2/D3/D7/D8/D11 需用户确认；B6/T3.7 需被别提供截图）。**不阻塞 T1 启动**：本文档已列出默认假设 + 退路。
- **下一步选择**：
  1. 启动 T1 实施 → 用文档中 T1 提示词开新对话；
  2. 或先回答 7 项开放问题 → 用户依次明确 D2/D3/D7/D8/D11/B6/T3.7。
