# 本期需求 / Bug 主清单（开发 SSOT）

> **作用**：本期所有需求 + bug 的唯一权威清单。每条带 ID、状态、所属端 / 模块、依赖。
> 后续按编号一条条开发，不再翻原始 bug 群消息。
>
> **来源**：
> - 2026-05-10 用户提交的大长 bug 清单
> - 2026-05-11 产品需求规则清单（求职辅导主链 / 课程记录上报 / 学生自添岗位 等）
> - 冲突仲裁结论：[07-conflict-clarifications.md](./07-conflict-clarifications.md)
> - Step 1-4 已实现的代码现状（已核对）
>
> **状态约定**：
> - ✅ DONE — 已实现，核对代码确认在线
> - ▶ TODO — 待开发，可立即启动（不依赖任何待定项）
> - ⏸ HOLD — 等待依赖（依赖项可在备注里查）
> - ❌ DROP — 经讨论确认不做（保留入口注明原因）
> - 📐 RULE — 不是单条 bug，是产品已定的规则 / 主链方案，按规则实施

---

## 0. 总览

| 状态 | 数量 |
|---|---|
| ✅ DONE | 54 |
| ▶ TODO | 17 |
| ⚠ 部分 | 7 |
| ⏸ HOLD | 5 |
| ❌ DROP | 4 |
| 📐 RULE | 6 大类 |

> **2026-05-11 第三轮清理**：再清 9 项 —— 后端 A-PS-001（下钻按字典排序）+ A-PS-012（展示起始范围）实修；核对发现 A-ST-007/009/016、A-PS-016/017 已 DONE；A-ST-012 降级为 ⚠ 部分。剩余 17 项 ▶ TODO 全部需用户复现或后端 SQL 详细调试（A-PS-006/011/A-CT-005/006/007/A-SF-008/011 等）。

**冲突仲裁**：5 条全部 close（见 §1）。

---

## 1. 已生效裁决（开发依据）

| 编号 | 主题 | 裁决 |
|---|---|---|
| C-1 | 学生账号 4 态权限 | 误判，不存在冲突。按 `account_status` 0/1/2/3 + 独立 `osg_student_blacklist` 表现状走，i18n key `frozen / refunded` 区分。代码已落地。|
| C-2 | 岗位多端可见性 | (a) 学生侧已投递岗位被停用 → "我的求职"灰显；(b) 编辑岗位删除"隐藏/激活"按钮（与下拉冗余）；(c)「未开始」状态：学生 ❌、班主任 / 助教 👁、导师 n/a、后台 ✅ |
| C-3 | 班主任双角色 | 三栏分操作：管理只看 / 待辅导才上报 / 待分配才分配；自分配占 `requested_mentor_count` 名额 |
| C-4 | 黑名单跨实体 | 学生黑名单能登录 + 禁求职可见 + 可课消；导师黑名单不能登录。术语共用，按 user.role 岔分支 |
| C-5 | 字段直改 vs 审核 | 已实施按现走，不再立矩阵 |

---

## 2. 主链规则（已定，按规则实施）

### 📐 RULE-A 求职辅导主链 5 端列表字段（产品 2026-05-11）

#### 学生端 [我的求职]
- 列表展示**已求职岗位**，每行字段：岗位名称、公司、行业、岗位分类、地区、招聘周期、投递时间、求职状态
- 操作列只有「申请辅导」按钮
- 申请辅导可选 7 阶段：
  - HireVue or Online Test (在线测试)
  - Screening Call (Phone Screen / HR Screen / Initial Call / Recruiter Call)
  - First Round
  - Second Round
  - Third Round and Beyond
  - Case study Round
  - Superday / Assessment Centre / AC
- 申请辅导后该岗位行可展开显示辅导记录
- 辅导记录字段：面试阶段、面试时间、城市、导师、最近评分
- 辅导记录操作：查看详情（导师填写的课消详情）+ 修改（只能改面试时间和面试官）

#### 班主任端 [学员求职总览]
3 栏，默认第一栏：

| 栏 | 筛选 | 列表字段 | 操作 |
|---|---|---|---|
| 我管理的学员 | 公司 / 面试阶段 / 面试时间 + 面试日历 | 学生 ID / 学生姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / 导师 / 最近评分 | 查看详情（多条课消详情） |
| 待辅导的学员 | 公司 / 面试阶段 / 面试时间 / 是否上报课消 | 学生 ID / 学生姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / 已上报课消数 | 上报课消 |
| 待分配导师 | （无） | 学生 ID / 学生姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / 提交时间 | 分配导师 |

**分配导师数量必须 = `requested_mentor_count`**，前后端双层校验。

#### 助教端 [学员求职总览]
1 栏「我管理的学员」：
- 面试日历 + 筛选（公司 / 面试阶段 / 面试时间）
- 列表字段：学生 ID / 学生姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / 导师 / 最近评分
- 操作：查看详情（导师填写的课消详情）

#### 导师端 [学员求职总览]
1 栏「待辅导的学员」：
- 筛选：公司 / 面试阶段 / 面试时间 / 是否上报课消
- 列表字段：学生 ID / 学生姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / 已上报课消数
- 操作：上报课消

#### 后台 [学员求职总览]
- 默认显示**全部学员**（不预过滤）
- 删除「热门公司申请统计」模块
- 删除「分配状态」筛选
- 统计数据需与筛选联动

### 📐 RULE-B 模拟应聘管理 5 端

#### 导师端
- 删除统计卡片
- 筛选：公司 / 面试阶段 / 面试时间 / 是否上报课消（**注意**：模拟应聘表无这三个字段，实施前需澄清字段来源 — 见附录 A 降级条目）
- 列表字段：学生 ID / 学生姓名 / 类型 / 分配时间 / 已上报课消数
- 操作：上报课消

#### 班主任端
3 栏，默认第一栏，删除统计卡片：

| 栏 | 筛选 | 列表字段 | 操作 |
|---|---|---|---|
| 我管理的学员 | 类型 | 学生 ID / 学生姓名 / 类型 / 申请时间 / 辅导老师 / 已上报课消数 | 详情（导师上报的多条课消反馈）|
| 待辅导的学员 | 类型 | 学生 ID / 学生姓名 / 类型 / 申请时间 / 辅导老师 | 上报课消 |
| 待分配导师 | （无） | 学生 ID / 学生姓名 / 类型 / 申请时间 | 分配导师 |

#### 助教端
1 栏「我管理的学员」，删除统计卡片：
- 筛选：类型
- 列表字段：学生 ID / 学生姓名 / 类型 / 申请时间 / 辅导老师 / 已上报课消数
- 操作：详情（导师上报的多条课消反馈）

#### 后台
- **默认显示全部记录**（当前 `activeTab='pending'` 待改）

### 📐 RULE-C 课程记录上报弹窗（导师 / 班主任 / 助教三端一致）

详见 [§5 课程记录上报弹窗规则](#5-课程记录上报弹窗规则️rule-c-展开)

### 📐 RULE-D 学生自添岗位审核流

详见 [§6 学生自添岗位审核流方案](#6-学生自添岗位审核流方案️rule-d-展开)

### 📐 RULE-E 全局规则

- 默认密码强制修改密码（首次登录拦截）
- 静置 1 小时无操作自动退出（已实现 `useIdleLogout`）
- 所有时间使用美国时间（EST），页面给出 EST 提示
- 5 端登录方式统一：邮箱 + 密码
- **状态展示统一用字典中文 label**（2026-05-11 新增）：
  - 所有 UI 上的状态字段（求职状态 / 辅导状态 / 面试阶段 / 课消状态 / 岗位状态 / 合同状态 等）一律渲染字典里的中文 label，**不允许露出英文 value**（如 `applied / interviewing / withdraw / hirevue / first_round / pending` 等）
  - 后端必须为每个 status 字段附 `xxxLabel`（如 `stageLabel / applicationStatusLabel / coachingStatusLabel / interviewStageLabel`）
  - 前端禁止 `record.xxxLabel || record.xxx` 这种 fallback 写法——找不到 label 时显示空或 `-`，不显示英文 value
  - 字典 value 仅用于：API 入参出参、SQL 条件、前端状态机判断；**展示一律用 label**
  - 涉及范围：5 端所有列表 / 弹窗 / 详情 / Tab / Tag / Badge / Dropdown，含求职总览、模拟应聘、课消上报、岗位列表、合同管理、用户管理等

### 📐 RULE-F 课程排期强制弹窗

- 导师 / 班主任端没有填写课程排期时，进入相关页面强制弹出排期填写页

---

## 3. 后台 (admin) 待办

### 3.1 字典管理

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-DC-001 | 学校字典：新增学校时国家/地区调字典 + 列表显示 | ✅ DONE | `osg_school` Tab 已加 country 字段，下拉来自 `osg_region` 字典；列表已显示 |

### 3.2 学生列表（用户 / 学员）

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-ST-001 | 新增学员 - 学校栏光标靠上 | ▶ TODO | UI bug，需复现 |
| A-ST-002 | 新增学员 - 学校改多选 | ✅ DONE | `AddStudentModal.vue:135` MultiSelect 已用；多选时国家/地区显示由开发选默认 |
| A-ST-003 | 新增学员 - 毕业年月改日历，默认当前+3 年 | ✅ DONE | `AddStudentModal.vue:157` `<a-date-picker picker="month">` |
| A-ST-004 | "读研研毕"字段改为"学业状态" | ✅ DONE | `AddStudentModal.vue:179` label="学业状态" |
| A-ST-005 | 新增 - 合同附件改必传 | ⏸ HOLD | 依赖 A-ST-014 PDF 上传 bug 修复 |
| A-ST-006 | 新增 - 合同附件 PDF 上传变红原因排查 | ▶ TODO | 与 A-ST-014 一并查 |
| A-ST-007 | 详情 - 删除"学生资料台账"说明文字 | ✅ DONE | `StudentDetailModal.vue` 全文 grep「台账/说明/tip/description」零匹配 |
| A-ST-008 | 新增/查看/编辑三页面布局/字段/顺序一致 | ▶ TODO | C-I 解读：读写权限按场景区分 |
| A-ST-009 | 编辑/查看 - 班主任和助教多选项不显示 bug | ✅ DONE | `EditStudentModal.vue:65-94` MultiSelect 已实装；`StudentDetailModal.vue:117-133` pill 形式展示 |
| A-ST-010 | 编辑 - 账号状态可改（按 C-1 4 态）| ✅ DONE | 已实现 |
| A-ST-011 | 提醒列：服务即将到期/已到期/课时即将耗尽(≤20)/课时已耗尽 | ⚠ 部分 | `columns.ts` 已有"提醒"列；4 种状态规则未落地 |
| A-ST-012 | 详情/编辑看不了合同附件 bug | ⚠ 部分 | 前端入口在：`ContractTab.vue:56-65` 详情 tab 有下载链接 + `EditStudentModal.vue:410-428` upload-dragger file-list 回填；若仍看不到需后端验证 attachmentPath 字段数据 |
| A-ST-013 | 新增 - 录入英镑没测试（货币字段）| ▶ TODO | 需要补测试 |
| A-ST-014 | 新增 - 合同 PDF 上传失败 | ▶ TODO | 基础设施 bug，多处依赖 |
| A-ST-015 | 新增 - 合同金额输入上限 | ✅ DONE | 已实现 (≤ 1M / ≤ 100K) |
| A-ST-016 | 新增 - 必填字段缺失给提醒 | ✅ DONE | `AddStudentModal.vue:933-945` `formRef.validate` + `message.error` 多字段兜底 |

### 3.3 合同管理

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-CT-001 | 续费 - 学员模糊搜索 | ✅ DONE | `RenewContractModal.vue:40-53` show-search + 远程 onStudentSearch 已实现 |
| A-CT-002 | 续签原因下拉 | ✅ DONE | 已绑定字典 |
| A-CT-003 | 续费 - 合同附件 PDF 上传失败 | ▶ TODO | 与 A-ST-014 同源 |
| A-CT-004 | 续签流程跑通测试 | ⏸ HOLD | 依赖 A-CT-003 修好 |
| A-CT-005 | 筛选 - 合同状态结果不完整 | ▶ TODO | 筛选 bug |
| A-CT-006 | 导出 - 剩余课时乱码 | ▶ TODO | 编码 bug |
| A-CT-007 | 导出 - 合同状态值错 | ▶ TODO | 数据映射 |
| A-CT-008 | 详情 - 删除「修改状态/加入黑名单/移出黑名单」按钮 | ✅ DONE | `ContractDetailModal.vue:109-119` footer 仅留「关闭」「续签合同」 |

### 3.4 导师列表（staff）

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-SF-001 | 状态：黑名单不能登录 | ✅ DONE | C-4 拍板，已实现 |
| A-SF-002 | 更多里禁用状态改为冻结 + 不能登录 | ✅ DONE | `OsgStaffAccessGuard` 已 frozen 拦截 |
| A-SF-003 | 全部类型筛选缺选项 | ▶ TODO | 选项补齐 |
| A-SF-004 | 擅长多选展示选项不计数 | ✅ DONE | MultiSelect 已实现 |
| A-SF-005 | 职业背景只留任职公司 | ✅ DONE | `StaffFormModal.vue:170-188` 章节内只有「任职公司」MultiSelect |
| A-SF-006 | 评级非必填 + 加评语字段 | ✅ DONE | StaffFormModal:208 评语已实现 |
| A-SF-007 | 地区改多选 + 城市非必填 | ✅ DONE | MultiSelect 已实现 |
| A-SF-008 | 新增导师跑通测试 | ▶ TODO | 端到端测 |
| A-SF-009 | 课单价显示美元符号 | ✅ DONE | StaffDetailModal:422 `$/h` |
| A-SF-010 | 列表显示导师 ID | ✅ DONE | columns.ts staffId 已加 |
| A-SF-011 | 导出多一列名单标签 + 导出全部信息 | ▶ TODO | 导出增强 |
| A-SF-012 | 新增的用户排在最前面 | ✅ DONE | `OsgStaffMapper.xml:110` `order by create_time desc, staff_id desc` |
| A-SF-013 | 编辑 - 登录账号/初始密码"假成功"bug | ✅ DONE | `StaffFormModal.vue:230-243` 编辑模式两个字段 `:disabled="isEditing"` 锁定 + 提交时 undefined 不传后端 |

### 3.5 导师排期管理

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-SC-001 | 代填导师排期去掉节假日 | ▶ TODO | 日历过滤 |
| A-SC-002 | 列表展示导师 ID | ✅ DONE | `mentor-schedule/columns.ts:2` `{ title: 'ID', dataIndex: 'staffId' }` |

### 3.6 岗位信息

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-PS-001 | 下钻视图 - 公司类别按字典顺序排序 | ✅ DONE | `OsgPositionServiceImpl.selectPositionDrillDown` 加载 `osg_company_type` 字典 dict_sort 作为 industry 输出顺序，未在字典内的项放最后 |
| A-PS-002 | 下钻 + 列表 - 删除底部流程缩写行 | ▶ TODO | UI 删除 |
| A-PS-003 | 新增 - 选择公司名称后自动带出公司类别 | ✅ DONE | `PositionFormModal.vue` 加 @select/@change 联动 + companyTypeMap 反查 + companyOptions prop 改为完整对象 |
| A-PS-004 | 新增 - 投递备注支持文字+图片+PDF | ▶ TODO | 学生端展示规则待定 |
| A-PS-005 | 新增 - 添加人自动带出且不能修改 | ✅ DONE | `PositionFormModal.vue:186` `disabled` + line 398 `userStore.userInfo.userName` 自动带出 |
| A-PS-006 | 新增 - 填了截止时间还显示默认字段 bug | ▶ TODO | 显示逻辑 |
| A-PS-007 | 下钻视图 - 岗位信息显示错位 | ▶ TODO | 布局 |
| A-PS-008 | 状态新增「未开始」（展示开始 > 今天）| ▶ TODO | 配 C-2 矩阵：学生 ❌ / 班主任 助教 👁 / 导师 n/a / 后台 ✅ |
| A-PS-009 | 编辑 - 删除"隐藏/激活"按钮（与下拉冗余）| ✅ DONE | `PositionFormModal.vue:251-258` 整段已删除（C-2 拍板）|
| A-PS-010 | 已隐藏岗位 5 端可见性回归 | ▶ TODO | 配 C-2 学生侧灰显规则 |
| A-PS-011 | 主攻方向筛选无效 | ▶ TODO | 筛选 bug |
| A-PS-012 | 展示起始筛选不准确 | ✅ DONE | `OsgPositionController.list` 新增 `applyDisplayStartTimeRange`：把前端 begin/endDisplayStartTime 塞入 `position.params`，让 mapper 既有 `params.beginDisplayStartTime` 范围条件生效 |
| A-PS-013 | 列表新增"添加日期"列 | ⚠ 部分 | `index.vue:189` 模板有 createTime，但 columns.ts 列定义不全 |
| A-PS-014 | 「学员」列改「投递学员」 | ✅ DONE | columns 已改 |
| A-PS-015 | 「全部地区」筛选项不对 + 加城市筛选 | ✅ DONE | `positions/index.vue:65-72` 「全部地区」绑 `filters.region` + 新增「全部城市」绑 `filters.city` |
| A-PS-016 | 下载模板字段补齐：主攻方向 / 岗位地区 / 展示开始 / 展示结束 | ✅ DONE | `OsgPositionController.PositionExportRow` 已含 `targetMajors / region / displayStartTime / displayEndTime` |
| A-PS-017 | 模板：去掉"添加人"字段（导入时取登录用户）| ✅ DONE | `PositionExportRow` 字段集内无 "添加人" 列 |
| A-PS-018 | 模板优化后再测试上传 | ⏸ HOLD | 依赖 A-PS-016/017 |
| A-PS-019 | 导出信息缺失，与实际保持一致 | ▶ TODO | 导出 |

### 3.7 学员求职总览

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-JO-001 | 删除「热门公司申请统计」模块 | ✅ DONE | `job-overview/index.vue` 删除整段 + 移除 getHotCompanies / hotCompanies state / HotCompanyItem 类型 |
| A-JO-002 | 列表默认显示全部学员 | ✅ DONE | `activeTab = ref<ActiveTab>('all')` + `handleReset` 重置为 'all' |
| A-JO-003 | 删除「分配状态」筛选 | ✅ DONE | 删除 select + filters.assignStatus + requestFilters/handleReset/handleExport 引用 |
| A-JO-004 | 统计数据与筛选联动 | ⚠ 部分 | 前端 loadDashboard 已传 requestFilters，待后端 stats/funnel 端点确认按筛选返回 |

### 3.8 模拟应聘管理（后台）

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-MP-001 | 默认显示全部记录（当前 `activeTab='pending'`）| ✅ DONE | `mock-practice/index.vue:241,318` activeTab 默认 + reset 都改为 'all' |

### 3.9 课程记录（后台）

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-CR-001 | 因上报课消未通过，未测试后台课程记录 | ⏸ HOLD | 依赖 RULE-C 三端弹窗完成 |

### 3.10 审核

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| A-AU-001 | 导师列表 - 审核不了变更信息 bug | ▶ TODO | 排查审核入口 |
| A-AU-002 | 学生自添岗位审核流（合并 vs 新增）| ▶ TODO | 见 §6 RULE-D 方案 |

---

## 4. 学生端 (student) 待办

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| ST-001 | 登录页统一邮箱+密码 | ✅ DONE | 5 端已统一 |
| ST-002 | 岗位信息 - 修改求职意向直跳，不审核 | ✅ DONE | `student/career/index.vue:9` `$router.push('/profile')` 直跳，无审核 |
| ST-003 | 岗位信息 - 全部地区筛选字段不匹配 | ▶ TODO | 字段对齐 |
| ST-004 | 岗位信息 - 收藏 vs 取消投递解耦 | ▶ TODO | 取消投递不应同时取消收藏 |
| ST-005 | 岗位信息列表操作列：保留收藏 + 加「求职状态」按钮（6 态）| ✅ DONE | `student/positions/index.vue:215, 312` 6 态已实装；联动后台计数已 OK（A-PS-014）|
| ST-006 | 申请辅导阶段表单加：城市（必填）/ 面试人（选填）/ 面试部门（字典选择）| ▶ TODO | RULE-A 学生端 |
| ST-007 | 我的求职无法按星期切换 bug | ▶ TODO | UI bug |
| ST-008 | 模拟应聘"模拟面试"改名"面试测试" | ✅ DONE | 已收尾全量：dashboard/courses/notice/report/mock-practice/restricted/communication/applications 7 文件全清 |
| ST-009 | 修改信息字段都走字典 | ✅ DONE | C-5 已实施 |
| ST-010 | 自添岗位提交 → 后台审核 | ▶ TODO | RULE-D §6 |
| ST-011 | 我的求职列表字段对齐 RULE-A 学生端 | ▶ TODO | 列表 8 字段 + 展开辅导记录 |

---

## 5. 班主任端 (lead-mentor) 待办

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| LM-001 | 学员列表剩余课时显示 0 bug（如 xuesheng58）| ▶ TODO | 数据 / 计算 bug |
| LM-002 | 班主任分配导师 - 导师列表含班主任本人，可自分配 | ▶ TODO | C-3 拍板 |
| LM-003 | 上报课时双权限（辅导 + 管理）| ▶ TODO | C-3 拍板：管理只看 / 待辅导才上报 |
| LM-004 | 班主任端可见后台所有岗位信息（当前对应不上）| ▶ TODO | 数据范围对齐 |
| LM-005 | 菜单：学员列表挪到「学员中心」/ 课程列表挪到「教学中心」| ✅ DONE | `lead-mentor/MainLayout.vue:75,86` 「学员中心 Student Center」+「教学中心 Teaching」两个 group |
| LM-006 | 岗位信息 - 地区/主攻方向显示错误 | ▶ TODO | 字段映射 |
| LM-007 | 学员求职总览三栏 + 字段对齐 RULE-A | ✅ DONE | `lead-mentor/career/job-overview/index.vue:64-227` 三栏齐 |
| LM-008 | 模拟应聘管理三栏 + 字段对齐 RULE-B + 删 statsCards | ✅ DONE | Step 2-B 已收口 |
| LM-009 | 分配导师数量限制（= `requested_mentor_count`）| ▶ TODO | 前后端校验 |
| LM-010 | 课程排期未填强制弹窗 | ▶ TODO | 与 MT-002 共享规则 |

---

## 6. 导师端 (mentor) 待办

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| MT-001 | 学员求职总览单栏待辅导 + 字段对齐 RULE-A | ✅ DONE | Step 3-F1/F2 |
| MT-002 | 课程排期未填强制弹窗 | ▶ TODO | 与 LM-010 共享规则 |
| MT-003 | 课程排期页面按钮显示 bug | ⏸ HOLD | Step3-F5，缺截图复现 |
| MT-004 | 模拟应聘管理删 statsCards + 字段对齐 RULE-B | ✅ DONE | Step 3-F3/F4 |
| MT-005 | 切换导航菜单内容消失 bug | ▶ TODO | 路由 / keep-alive bug |
| MT-006 | 上报课程记录页面（按 RULE-C） | ⏸ HOLD | 依赖 RULE-C 主体改造 |

---

## 7. 助教端 (assistant) 待办

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| AS-001 | 学员求职总览单栏管理 + 字段对齐 RULE-A | ⚠ 部分 | Step4-F2 前端 UI 已收口（占位字段 -），后端 F1 透 coachingId/mentorName/latestRating 待启动 |
| AS-002 | 模拟应聘管理删 statsCards + 单栏 + 字段对齐 RULE-B | ⚠ 部分 | Step4-F4 前端 UI 已收口（占位字段 -），后端 F3 detail 端点 + reportedLessonCount 待启动 |
| AS-003 | 课时申报弹窗 v-model 修复 | ✅ DONE | Step4-F1 已修 |
| AS-004 | `/home` 切走，落到 `/career/positions` | ✅ DONE | 已切 redirect |

---

## 8. 课程记录上报弹窗规则【RULE-C 展开】

### 通用要求
- 三端（导师 / 班主任 / 助教）页面内容**完全一致**
- 不显示页面最下方"课时费"

### 学员状态分支
- **正常上课**：不显示旷课备注，只显示课程类型
- **旷课未到场**：学习时长默认 0.5h，只显示旷课备注，其他项不显示

### 课程类型分支

#### a) 岗位辅导
- 显示「选择申请信息」+ 同模拟面试需要填写的内容

#### b) 模拟面试
- 先选择模拟面试申请的信息
- 只展示模拟面试反馈字段
- **缺一字段**：「你在这个模拟面试中有哪些你希望做但是没有做的事情？」

#### c) 人际关系
- 先选择人际关系申请的信息
- 只展示人际关系反馈字段
- **缺**：上传相关截图入口
- **缺**：每一项的"详细说明"（参考原系统文案）

#### d) 模拟期中考试
- 先选择申请信息 + 反馈字段

#### e) 基础课程
先选基础课程子类型：技术的 / 行为训练 / 新简历制作 / 建立更新 / 咨询案例准备 / 其它

##### e.1 技术的（多选）
必修：
- T01 损益表 / T02 资产负债表 / T03 现金流量表 / T04 基础财务
- T05 企业价值与权益价值 / T06 稀释股份 / T07 商业意识_竞争战略
- T08 WACC / T09 DCF 估值 / T10 公众可比分析 / T11 先前交易分析
- T12 估值摘要 / T13 并购入门 / T14 吸积稀释分析
- T15 体育入门 / T16 LBO 型号 / T17 LBO 面试题及书面 LBO
- T18 杠杆融资与杠杆债务 / T19 高级会计

选修：
- T20 高级并购 / T21 DCM / T22 ECM
- T23 OSG 股票推介指南 / T24 私募股权案例研究教育

##### e.2 行为训练（多选）
- B0 OSG 简历指南（不含 WM 功能）
- B1 网络交流 / B2 自荐信 / B3 谈谈你自己吧
- B4 优势与劣势 / B5 成功与失败 / B6 领导故事 / B7 动机

##### e.3 其他子类型
- 新简历制作 / 建立更新 / 咨询案例准备 / 其它（不再细分多选）

### 落地任务

| ID | 标题 | 状态 |
|---|---|---|
| CR-001 | 三端弹窗 UI 统一回归（已抽 ClassReportFlowModal）| ✅ DONE | `shared/components/ClassReportFlowModal/index.vue` |
| CR-002 | 旷课逻辑：学习时长 0.5h 默认 + 只显示旷课备注 | ✅ DONE | `index.vue:254,359-375` + `StepMemberStatus.vue:11-20` + constants:38 |
| CR-003 | 正常上课：隐藏旷课备注 | ✅ DONE | `StepMemberStatus.vue:11` v-if 条件已实装 |
| CR-004 | 模拟面试反馈补「希望做但没做的事」字段 | ✅ DONE | `MockInterviewFeedback.vue:51-57,81` `wishedToDo` 字段已实现 |
| CR-005 | 人际关系反馈补「截图上传」+「每项详细说明」| ⚠ 部分 | 截图上传 `RelationFeedback.vue:40-50` 已实现；5 项评分的"详细说明"仍为 TBD 占位 (`constants:43-48`) |
| CR-006 | 基础课程子类型 + 技术 24 标签 + 行为 8 标签多选 | ✅ DONE | `StepReference.vue:38-44` + `BaseCourseTopicPicker.vue:3-36` + `useBaseCourseTopic.ts:110-117` |
| CR-007 | 隐藏底部「课时费」展示 | ✅ DONE | `index.vue:119-142` footer 无课时费 |

---

## 9. 学生自添岗位审核流方案【RULE-D 展开】

> **核对结论**：框架已实现，本期只补「合并到已有岗位」分支即可，**不重建表结构、不改入口**。

### 9.1 现状盘点（2026-05-11 核对）

#### 学生端 ✅ 已实现
- `views/positions/index.vue:401, 856` 「手动添加岗位」入口
- API：`POST /student/position/manual`

#### 后端 ✅ 已实现
- 表：`osg_student_position`（独立审核表）
  - 字段：`status / publicPositionId / hasCoachingRequest / flowStatus / rejectReason / rejectNote / reviewer / reviewedAt` 等
- API：
  - `GET /admin/student-position/list`
  - `PUT /admin/student-position/{id}/approve`
  - `PUT /admin/student-position/{id}/reject`
- approve 现有逻辑（`OsgStudentPositionServiceImpl.java:65-114`）：校验 pending → admin 可在弹窗编辑字段 → dedup 判重（公司+岗位+地区+城市+年份）→ **如重复则抛错**，否则写入 `osg_position` 公共表 + 回填 `publicPositionId`
- reject 现有逻辑：必填驳回原因 → status=rejected

#### 后台前端 ✅ 已实现
- `admin/career/student-positions/index.vue` 页齐全（筛选 / 列表 / ReviewPositionModal / RejectPositionModal）
- 路由 + 菜单已挂

### 9.2 唯一缺的：「合并到已有岗位」分支

产品原话：
> 方式一：如果申请的岗位有重复就**合并岗位**
> 方式二：如果没有这个岗位就**新增岗位**

现状只有"新增"路径。dedup 命中重复时硬抛错，审核员只能驳回 → 学生求职申请掉链。

### 9.3 修订方案（最小改动）

#### 后端
- approve 端点 payload 增加可选字段 `mergeToPositionId`
  - 有该字段 → **合并分支**：不写新 `osg_position`、把 `publicPositionId` 直接回填为该值、status=approved、flowStatus 仍按 hasCoachingRequest 走
  - 无该字段 → 现有"新增"分支不动
- dedup 判重由 throw 改 **soft hint**：返回检测到的重复 positionId 候选，不抛错；admin 可决定继续新增（不推荐）或切换合并

#### 后台前端 ReviewPositionModal
- 顶部加 radio：**「合并到已有岗位」 / 「新增公共岗位」**
- 选「合并到已有岗位」：
  - 显示已有岗位搜索框（按公司+岗位名模糊匹配，调 `osg_position` 列表）
  - 选中后展示对照信息（学生填的 vs 已有岗位）
  - 提交 payload 带 `mergeToPositionId`
- 选「新增公共岗位」：
  - 现有的字段编辑表单（保持不变）
  - 后端返回 dedup hint 时显示提示条 + 一键切换"合并"按钮

#### 学生端
- 不动

### 9.4 验收标准

- 学生提交自添岗位 → 后台出现待审核记录（**已工作**）
- 后台审核员选「合并」+ 选定已有岗位 X → `osg_student_position.publicPositionId = X`，**不写新 `osg_position`**
- 后台审核员选「新增」+ 没有重复 → 写新 `osg_position` + 回填 publicPositionId（**已工作**）
- 后台审核员选「新增」+ 检测到重复 → 提示但不阻塞，可一键切「合并」
- 后台驳回 → 学生侧看到驳回原因（**已工作**）

### 9.5 落地任务

| ID | 标题 | 状态 | 修改文件 |
|---|---|---|---|
| RD-001 | 后端：approve 接口加 `mergeToPositionId` 分支；dedup 改 soft hint 不 throw | ▶ TODO | `OsgStudentPositionServiceImpl.java`（仅改 approveStudentPosition + isDuplicatePublicPosition 两处方法）|
| RD-002 | 后台前端：ReviewPositionModal 加 radio +「合并/新增」分支 + 已有岗位搜索 | ▶ TODO | `admin/career/student-positions/components/ReviewPositionModal.vue` + `shared/src/api/admin/studentPosition.ts` payload 类型 |
| RD-003 | 学生端：状态文案补「已通过（合并到 X 公司 X 岗位）」 | ▶ TODO | `student/views/positions/index.vue` 状态展示 |
| RD-004 | 跨端联动测试：合并 / 新增后学生求职记录绑定正确 | ▶ TODO | 端到端测 |

---

## 10. 全局 (global) 待办

| ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| GL-001 | 默认密码强制修改密码（首次登录拦截）| ⚠ 部分 | `useMustChangePassword` composable 已存在；未集成到 5 端登录守卫 |
| GL-002 | 静置 1 小时无操作自动退出 | ✅ DONE | `useIdleLogout` 已在 5 端使用 |
| GL-003 | 所有时间使用美国时间（EST）+ 页面 EST 提示 | ▶ TODO | 全端改造，需先确认范围 |
| GL-004 | 5 端登录方式统一邮箱+密码 | ✅ DONE | 已统一 |
| GL-005 | 5 端登录后 redirect 切走 home/dashboard | ✅ DONE | 已落地 |

---

## 附录 A：降级条目（不需仲裁，开发选默认）

| 主题 | 处理方式 |
|---|---|
| 学校多选时列表显示国家/地区 | 取首项学校的国家/地区 |
| 模拟应聘筛选「公司/面试阶段/面试时间」字段不存在 | 实施前再确认；建议先砍这三项 |
| 学生申请辅导可填「面试时间未确定」+ 多端筛选 | 默认包含 +「未确定」独立筛选项 |
| 一个 user 兼班主任 + 导师双角色 | 认证路由问题，由开发与登录层一起决定 |

---

## 附录 B：编号 → 优先级速查

### P0（基础设施 / 阻塞类，必须先做）

- A-ST-014 / A-CT-003 — 合同 PDF 上传 bug（多处依赖）
- A-PS-016/017 — 模板字段（A-PS-018 上传测试依赖）
- C-2/C-3/C-4 衍生主链规则落地（RULE-A / RULE-B / RULE-C）

### P1（用户可感知主流程）

- 各端学员求职总览改造（LM-007 / AS-001 / 后台 A-JO-*）
- 各端模拟应聘改造（A-MP-001 / 后台 A-MP-001）
- 课程记录上报字段补齐（CR-002 ~ CR-007）
- 学生自添岗位审核（RD-001 ~ RD-004）
- 学生端 6 态求职状态联动（ST-005）

### P2（界面 / 体验优化）

- 后台导师列表 / 合同管理 / 岗位信息一系列 UI 改造
- 学生端模拟面试改名（ST-008）
- 班主任端菜单结构（LM-005）
- 全局 EST 时间（GL-003）

---

## 附录 C：HOLD / DROP 项跟踪

### HOLD（依赖未解）

| ID | 阻塞项 |
|---|---|
| A-ST-005 | A-ST-014 PDF 上传修好 |
| A-CT-004 | A-CT-003 PDF 上传修好 |
| A-PS-018 | A-PS-016/017 模板字段补齐 |
| A-CR-001 | RULE-C 三端弹窗主体改造完成 |
| MT-003 | 缺截图复现，等用户提供 |
| MT-006 | RULE-C 主体改造 |

### DROP（不做）

| 主题 | 原因 |
|---|---|
| assistant 端学员类型筛选（我教的 / 助教为我）| 强多端联动改造，本期不动 |
| assistant 端 8 个 placeholder 页 | 设计上保留为 coming-soon |
| 各端 home / dashboard 页 | 本期不交付，已 redirect 切走 |
| 编辑岗位「隐藏 / 激活」按钮 | C-2 拍板：与下拉冗余，A-PS-009 删除 |

---

## 修改历史

| 日期 | 修改 |
|---|---|
| 2026-05-11 | 首版：整理 2026-05-10 bug 清单 + 2026-05-11 产品需求 + C-1~C-5 仲裁结论 + Step 1-4 已实现现状，作为本期开发 SSOT |
| 2026-05-11 | 3 Agent 核对代码现状：12 条原标 TODO 实际已 DONE，6 条降级为 ⚠ 部分；总览统计修正 |
| 2026-05-11 | RULE-D 自填岗位审核：核对发现框架已存在，方案改为最小改动「仅补合并分支」（修订 §9.1-9.5）|
| 2026-05-11 | 第二轮单端 UI 清理：A-JO-001/002/003、A-MP-001、A-PS-003/009/015、ST-008 收尾；同步对齐 9 条已 DONE 但状态未更新的项 |
| 2026-05-11 | 第三轮清理：后端 A-PS-001（下钻按字典排序）+ A-PS-012（展示起始范围）实修；核对 A-ST-007/009/016、A-PS-016/017 已 DONE；A-ST-012 降级 ⚠ 部分 |
