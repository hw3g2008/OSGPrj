# OSG 跨端数据流审计矩阵

更新日期：2026-03-26  
范围：第二轮跨端数据流与审批必要性审计基线  
状态：已建立矩阵骨架，并回填首轮已知问题

## 说明

- 本矩阵是 `docs/plans/2026-03-26-cross-endpoint-flow-audit-design.md` 与 `docs/plans/2026-03-26-cross-endpoint-flow-audit-implementation-plan.md` 的执行基线。
- 首轮已确认问题统一标记为 `已知-待修复`，不在第二轮作为“新增问题”重复计数。
- 第二轮新增发现统一标记为 `本轮新增问题`。
- 若需求资产之间存在冲突，统一标记为 `需求冲突`。
- 若当前证据不足以下结论，统一标记为 `存疑`。

### 当前状态枚举

| 状态 | 含义 |
|---|---|
| `已知-待修复` | 首轮或既有文档已明确确认的问题，第二轮保留跟踪但不重复计数 |
| `待审计` | 已纳入范围，但尚未完成第二轮链路取证 |
| `本轮新增问题` | 第二轮新发现且需单独计数的问题 |
| `需求冲突` | 需求资产之间存在冲突，当前不能静默裁决 |
| `存疑` | 需求或实现证据不足，暂不能下最终结论 |
| `通过` | 第二轮完成取证后确认链路成立 |

## 1. 个人资料与变更申请

| 链路名 | 子链路 | 需求资产 | 写入口 | 持久化目标 | 下游读取方 | 是否应审批 | 是否已具备审批闭环 | 最终状态/正式数据回写点 | 当前状态 | 问题类型 | 严重度 | 核心证据 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 个人资料与变更申请 | Student 即时字段直写 | `docs/osg-product-confirmation-checklist.md`<br>`osg-spec-docs/docs/01-product/prd/admin/02-admin-students.md` | `PUT /student/profile`（手机号/微信等即时字段） | `osg_student_profile` | `GET /student/profile` | `直接写入` | `不适用` | 学生个人资料正式展示源 | `待审计` | - | - | `ruoyi-admin/.../OsgStudentProfileController.java`<br>`ruoyi-system/.../StudentProfileServiceImpl.java` |
| 个人资料与变更申请 | Student 审核字段变更 -> Admin 审批 | `docs/osg-product-confirmation-checklist.md`<br>`osg-spec-docs/docs/01-product/prd/admin/02-admin-students.md`<br>`osg-spec-docs/docs/01-product/prd/admin/DELIVERY-CONTRACT.yaml` | `PUT /student/profile`（学校/专业/方向等审核字段） | 当前：`osg_student_profile_change`<br>预期：Student 提交面与 Admin 审核面应同源 | `GET /admin/student/change-request/list`<br>`PUT /admin/student/change-request/{id}/approve|reject` | `发起申请 + 必须审批` | `已知断裂` | Student 正式资料展示源 + Admin 学员详情 | `已知-待修复` | `断链 / 脏映射` | `P0 / P1` | `docs/osg-cross-endpoint-interaction-audit.md` 的 `P0-1`、`P1-7`<br>`docs/osg-cross-endpoint-interaction-audit.md` |
| 个人资料与变更申请 | Lead-Mentor 资料变更申请 | `osg-spec-docs/docs/01-product/prd/lead-mentor/07-lead-mentor-profile.md`<br>`osg-spec-docs/docs/01-product/prd/admin/03-admin-staff.md`<br>`osg-spec-docs/docs/01-product/prd/lead-mentor/DECISIONS.md` | `POST /lead-mentor/profile/change-request` | `osg_staff_change_request` | Admin Staff 审核入口 | `发起申请 + 必须审批` | `依赖 Staff 审批链；当前缺失` | `osg_staff` / Staff 正式资料源 | `已知-待修复` | `断链 / 能力缺口` | `P0` | `docs/osg-cross-endpoint-interaction-audit.md` 的 `P0-2`<br>`ruoyi-admin/.../OsgLeadMentorProfileController.java` |
| 个人资料与变更申请 | Staff 资料变更 Admin 审批链 | `osg-spec-docs/docs/01-product/prd/admin/03-admin-staff.md`<br>`osg-spec-docs/docs/01-product/prd/admin/DELIVERY-CONTRACT.yaml` | 上游来自 `POST /lead-mentor/profile/change-request` 与 `POST /admin/staff/change-request` | `osg_staff_change_request` | 预期：Admin `list/approve/reject` 审核流 | `发起申请 + 必须审批` | `已知缺失 approve/reject` | `osg_staff` / Staff 正式资料源 | `已知-待修复` | `断链` | `P0` | `docs/osg-cross-endpoint-interaction-audit.md` 的 `P0-2`<br>`ruoyi-admin/.../OsgStaffController.java` |
| 个人资料与变更申请 | Mentor 资料编辑 | `osg-spec-docs/docs/01-product/prd/admin/03-admin-staff.md`<br>`osg-spec-docs/docs/01-product/prd/permission/MATRIX.md` | `GET/PUT /api/mentor/profile` | 当前：`sys_user` 直写 | Mentor 自己 + 可能影响 Admin Staff 视图 | `待一致性校验（当前倾向应审批）` | `当前绕过审批` | `sys_user` / 可能外溢到 Staff 视图 | `已知-待修复` | `错路 / 脏映射 / 审批策略偏差` | `P1 / P2` | `docs/osg-cross-endpoint-interaction-audit.md` 的 `P1-4`、`P1-5`、`P1-6`、`P2-8` |
| 个人资料与变更申请 | Assistant 资料编辑 | `docs/osg-product-confirmation-checklist.md`<br>`osg-spec-docs/docs/01-product/prd/permission/MATRIX.md` | 当前：`GET/PUT /api/mentor/profile`（经 Assistant 前端调用） | 当前：复用 Mentor `SysUser` 资料接口 | Assistant 自己 | `待审计` | `不适用 / 待判定` | Assistant 资料正式展示源 | `已知-待修复` | `错路 / 能力缺口` | `P1 / P3` | `docs/osg-cross-endpoint-interaction-audit.md` 的 `P1-3`、`P3-13` |

## 2. 教学链路

| 链路名 | 子链路 | 需求资产 | 写入口 | 持久化目标 | 下游读取方 | 是否应审批 | 是否已具备审批闭环 | 最终状态/正式数据回写点 | 当前状态 | 问题类型 | 严重度 | 核心证据 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 教学链路 | 课程记录共享读取链 | `docs/osg-product-confirmation-checklist.md`（第 2 条）<br>`osg-spec-docs/docs/01-product/prd/admin/11-admin-class-records.md`<br>`osg-spec-docs/docs/01-product/prd/lead-mentor/06-lead-mentor-class-records.md` | 多端课程记录读写入口 | 预期：围绕 `osg_class_record` 共享 | Student / Mentor / Lead-Mentor / Assistant / Admin | `不是审批，而是共享读取链` | `依赖课时审核链` | Student 课程记录回看与评价入口 | `已知-待修复` | `断链` | `P1` | `docs/osg-curl-chain-checklist.md` 的 `GAP-E-01` |
| 教学链路 | 课时上报 / 审核链 | `docs/osg-product-confirmation-checklist.md`（第 2 条）<br>`osg-spec-docs/docs/01-product/prd/admin/05-admin-reports.md`<br>`osg-spec-docs/docs/01-product/prd/admin/11-admin-class-records.md` | `POST /api/mentor/class-records`<br>`POST /lead-mentor/class-records` 等 | 预期：`osg_class_record` + 审核状态 | Admin `report` 视角、Student 回看、结算链 | `发起记录 + 必须审核` | `待审计` | 审核结果、Student 可见结果、结算链 | `待审计` | - | - | `docs/osg-curl-chain-checklist.md`<br>`ruoyi-admin/.../OsgReportController.java` |

## 3. 岗位、求职与模拟应聘流转

| 链路名 | 子链路 | 需求资产 | 写入口 | 持久化目标 | 下游读取方 | 是否应审批 | 是否已具备审批闭环 | 最终状态/正式数据回写点 | 当前状态 | 问题类型 | 严重度 | 核心证据 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 岗位、求职与模拟应聘流转 | 后台岗位发布与公共岗位池曝光 | `osg-spec-docs/docs/01-product/prd/admin/06-admin-positions.md`<br>`osg-spec-docs/docs/01-product/prd/career/01-student-positions.md`<br>`osg-spec-docs/docs/01-product/prd/lead-mentor/02-lead-mentor-positions.md` | `POST /admin/position` | 后台岗位主表 | Student / Lead-Mentor / Assistant 视角 | `直接写入` | `不适用` | 公共岗位池 | `待审计` | - | - | `docs/osg-curl-chain-checklist.md` `FLOW-B` |
| 岗位、求职与模拟应聘流转 | Student 自添岗位 -> Admin 审核 | `docs/osg-product-confirmation-checklist.md`（第 3 条）<br>`osg-spec-docs/docs/01-product/prd/admin/07-admin-student-positions.md`<br>`osg-spec-docs/docs/01-product/prd/career/DECISIONS.md`（`D-C003`） | `POST /student/position/manual` | 学生自添岗位表 / 待审记录 | `GET /admin/student-position/list` -> approve/reject -> 公共岗位池 | `发起申请 + 必须审批` | `待审计` | 审核通过后进入公共岗位池 | `待审计` | - | - | `docs/osg-curl-chain-checklist.md` `FLOW-B` |
| 岗位、求职与模拟应聘流转 | 求职状态 / 投递进度 / 辅导申请流转 | `docs/osg-product-confirmation-checklist.md`（第 2 条）<br>`osg-spec-docs/docs/01-product/prd/admin/08-admin-job-overview.md`<br>`osg-spec-docs/docs/01-product/prd/career/01-student-positions.md`<br>`osg-spec-docs/docs/01-product/prd/career/02-student-applications.md`<br>`osg-spec-docs/docs/01-product/prd/lead-mentor/03-lead-mentor-job-overview.md` | `POST /student/position/apply`<br>`POST /student/position/progress`<br>`POST /student/position/coaching` | 当前：学生独立表<br>预期：共享主链 `osg_job_application` / `osg_coaching` | Lead-Mentor / Assistant / Admin / Mentor 求职总览 | `不是审批，而是流转 / 分配` | `已知主链断裂` | 共享求职主状态与辅导状态 | `已知-待修复` | `断链 / 错路` | `P1` | `docs/osg-curl-chain-checklist.md` 的 `GAP-C-01`、`GAP-C-02` |
| 岗位、求职与模拟应聘流转 | 模拟应聘申请 / 分配 / 确认 / 反馈 | `docs/osg-product-confirmation-checklist.md`（第 1 条）<br>`osg-spec-docs/docs/01-product/prd/admin/13-admin-mock-practice.md`<br>`osg-spec-docs/docs/01-product/prd/lead-mentor/04-lead-mentor-mock-practice.md` | `POST /student/mock-practice/practice-request`<br>`POST /student/mock-practice/class-request` | 当前：`osg_student_mock_request`<br>预期：`osg_mock_practice` 主链 | Lead-Mentor / Admin / Mentor / Assistant / Student 回看 | `不是审批，而是申请 -> 分配 -> 确认` | `已知主链断裂` | `osg_mock_practice` 主链 + Student 回看结果 | `已知-待修复` | `断链 / 脏映射` | `P0 / P1` | `docs/osg-curl-chain-checklist.md` 的 `GAP-D-01`、`GAP-D-02` |

## 4. 登录、忘记密码与身份恢复

| 链路名 | 子链路 | 需求资产 | 写入口 | 持久化目标 | 下游读取方 | 是否应审批 | 是否已具备审批闭环 | 最终状态/正式数据回写点 | 当前状态 | 问题类型 | 严重度 | 核心证据 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 登录、忘记密码与身份恢复 | Student 身份恢复链 | `osg-spec-docs/docs/01-product/prd/permission/00-admin-login.md`<br>`docs/osg-curl-chain-checklist.md` | `/system/password/*` | 密码重置服务 | Student 登录恢复 | `不是审批` | `不适用` | Student 可重新登录 | `待审计` | - | - | `osg-frontend/packages/shared/src/api/password.ts` |
| 登录、忘记密码与身份恢复 | Mentor 身份恢复链 | `osg-spec-docs/docs/01-product/prd/admin/00-admin-login.md`<br>`docs/osg-curl-chain-checklist.md` | `/mentor/forgot-password/*` | 密码重置服务 | Mentor 登录恢复 | `不是审批` | `不适用` | Mentor 可重新登录 | `待审计` | - | - | `osg-frontend/packages/mentor/src/api/auth.ts`<br>`ruoyi-admin/.../OsgForgotPasswordController.java` |
| 登录、忘记密码与身份恢复 | Lead-Mentor 身份恢复链 | `osg-spec-docs/docs/01-product/prd/lead-mentor/00-lead-mentor-login.md` | Lead-Mentor 登录页内联 forgot-password 流程 | 待核对真实后端命名空间 | Lead-Mentor 登录恢复 | `不是审批` | `不适用` | Lead-Mentor 可重新登录 | `待审计` | - | - | `osg-frontend/packages/lead-mentor/src/views/login/index.vue` |
| 登录、忘记密码与身份恢复 | Assistant 身份恢复链 | `osg-spec-docs/docs/01-product/prd/permission/MATRIX.md`<br>`docs/osg-curl-chain-checklist.md` | Assistant forgot-password 页面 | 待核对真实后端命名空间 | Assistant 登录恢复 | `不是审批` | `不适用` | Assistant 可重新登录 | `待审计` | - | - | `osg-frontend/packages/assistant/src/views/forgot-password/index.vue` |
| 登录、忘记密码与身份恢复 | 跨端 forgot-password 命名空间一致性 | `docs/osg-product-confirmation-checklist.md`<br>`docs/osg-cross-endpoint-interaction-audit.md` | Student / Mentor / Lead-Mentor / Assistant recovery APIs | 多套路径风格并存 | 各端登录恢复 | `不是审批` | `不适用` | 一致的身份恢复命名空间 | `已知-待修复` | `错路 / 一致性偏差` | `P2 / P3` | `docs/osg-cross-endpoint-interaction-audit.md` 的 `P2-9`、`P3-12` |

## 5. 字典与枚举驱动字段

| 链路名 | 子链路 | 需求资产 | 写入口 | 持久化目标 | 下游读取方 | 是否应审批 | 是否已具备审批闭环 | 最终状态/正式数据回写点 | 当前状态 | 问题类型 | 严重度 | 核心证据 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 字典与枚举驱动字段 | 地区字段一致性 | `docs/osg-product-confirmation-checklist.md`（第 4 条）<br>`osg-spec-docs/docs/01-product/prd/lead-mentor/07-lead-mentor-profile.md`<br>`osg-spec-docs/docs/01-product/prd/admin/03-admin-staff.md` | Mentor / Lead-Mentor 资料编辑 | 当前：Mentor 使用英文 key + `loginIp`；Lead-Mentor 前端硬编码城市 | Mentor / Lead-Mentor / Admin Staff 视图 | `待审计` | `不适用` | 统一地区字典与正式资料源 | `已知-待修复` | `脏映射 / 能力缺口` | `P1 / P2` | `docs/osg-cross-endpoint-interaction-audit.md` 的 `P2-10`、`P2-11` |
| 字典与枚举驱动字段 | 方向字段一致性 | `docs/osg-product-confirmation-checklist.md`（第 4 条）<br>`osg-spec-docs/docs/01-product/prd/admin/03-admin-staff.md` | Mentor 资料展示 / 编辑 | 当前：前端硬编码方向展示 | Mentor / Admin Staff 视图 | `待审计` | `不适用` | 正式方向展示源 | `已知-待修复` | `脏映射` | `P1` | `docs/osg-cross-endpoint-interaction-audit.md` 的 `P1-4` |
| 字典与枚举驱动字段 | 跨端共享状态枚举一致性 | `docs/osg-product-confirmation-checklist.md`（第 2 条）<br>`osg-spec-docs/docs/01-product/prd/admin/DELIVERY-CONTRACT.yaml`<br>`osg-spec-docs/docs/01-product/prd/lead-mentor/DELIVERY-CONTRACT.yaml` | 多端状态更新入口 | 多个业务主表与投影表 | Student / Lead-Mentor / Assistant / Admin / Mentor | `依链路而定` | `依链路而定` | 各业务链正式状态源 | `待审计` | - | - | `docs/osg-curl-chain-checklist.md` 的 `FLOW-C/D/E` |

## 6. 已知问题索引

### 来自 `docs/osg-cross-endpoint-interaction-audit.md`

- `P0-1` Student 审核字段 key 不匹配 -> 已映射到“Student 审核字段变更 -> Admin 审批”
- `P0-2` Staff 变更请求无审批入口 -> 已映射到“Lead-Mentor 资料变更申请”“Staff 资料变更 Admin 审批链”
- `P1-3` Assistant 资料接口复用 Mentor 端点 -> 已映射到“Assistant 资料编辑”
- `P1-4/P1-5/P1-6/P2-8/P2-11` Mentor 资料链问题 -> 已映射到“Mentor 资料编辑”“地区字段一致性”“方向字段一致性”
- `P1-7` Student 两套变更系统未打通 -> 已映射到“Student 审核字段变更 -> Admin 审批”
- `P2-9/P3-12` 忘记密码路径不一致 -> 已映射到“跨端 forgot-password 命名空间一致性”
- `P2-10` Lead-Mentor 地区城市硬编码 -> 已映射到“地区字段一致性”
- `P3-13` Assistant 编辑字段缺失 -> 已映射到“Assistant 资料编辑”

### 来自 `docs/osg-curl-chain-checklist.md`

- `GAP-C-01/GAP-C-02` 求职状态 / 辅导申请主链未共享 -> 已映射到“求职状态 / 投递进度 / 辅导申请流转”
- `GAP-D-01/GAP-D-02` 模拟应聘主链未共享 / 分配标识不一致 -> 已映射到“模拟应聘申请 / 分配 / 确认 / 反馈”
- `GAP-E-01` Student 课程记录回看不消费后台主链 -> 已映射到“课程记录共享读取链”
