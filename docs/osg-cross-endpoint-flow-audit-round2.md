# OSG 跨端数据流第二轮审计报告

审计日期：2026-03-26  
审计范围：按 `docs/plans/2026-03-26-cross-endpoint-flow-audit-design.md` 执行的第二轮跨端数据流与审批必要性审计  
当前状态：已建立矩阵基线，详细链路取证进行中

## 1. 审计目标

本轮目标不是重复罗列页面现象，而是按“可写且跨端流转”的业务链路，回答以下问题：

1. 这条链路的写入口、持久化目标、下游读取方是否同源。
2. 这条链路按需求到底应不应该审批。
3. 如果需要审批，当前是否具备完整闭环。
4. 首轮已知问题是否已经在矩阵中保留，避免被误记为本轮新增问题。

## 2. 审计方法

- 先做需求资产一致性校验，再做代码取证。
- PRD 是重要证据源，但不自动视为绝对真值。
- 若产品确认清单、`DECISIONS`、`DELIVERY-CONTRACT` 与 PRD 冲突，冲突本身进入审计结果。
- 统一以 [docs/osg-cross-endpoint-flow-matrix.md](/Users/hw/workspace/OSGPrj/docs/osg-cross-endpoint-flow-matrix.md) 作为链路总表。

## 3. 当前基线状态

当前已完成：

- 创建链路矩阵：[docs/osg-cross-endpoint-flow-matrix.md](/Users/hw/workspace/OSGPrj/docs/osg-cross-endpoint-flow-matrix.md)
- 将首轮已确认问题回填为 `已知-待修复`
- 为第二轮纳入范围的 5 组链路建立子链路占位
- 完成首轮需求资产一致性校验，并识别出一批 `需求冲突` 与 `需求资产缺口`

当前尚未完成：

- 各子链路的完整需求一致性校验
- 各子链路的代码级取证
- 高风险新增问题的运行时 spot-check

## 4. 首轮已知问题承接

以下问题已在矩阵中承接，不在第二轮作为“新增问题”重复计数：

- `P0-1` Student 审核字段 key 不匹配
- `P0-2` Staff 变更请求无审批入口
- `P1-3` Assistant 资料接口复用 Mentor 端点
- `P1-4/P1-5/P1-6/P2-8/P2-11` Mentor 资料链问题
- `P1-7` Student 两套变更系统未打通
- `P2-9/P3-12` 忘记密码路径不一致
- `P2-10` Lead-Mentor 地区城市硬编码
- `P3-13` Assistant 编辑字段缺失
- `GAP-C-01/GAP-C-02` 求职状态 / 辅导申请主链断裂（已在本轮代码取证中复核；Student 主链写入已接通，但 Admin 分配导师链出现新的标识错路问题）
- `GAP-D-01/GAP-D-02` 模拟应聘主链断裂 / 分配标识不一致（已在本轮代码取证中复核；practice-request 主链与 Lead-Mentor 分配链已接通，但 Admin 分配链仍存在标识错路问题）
- `GAP-E-01` Student 课程记录回看不消费后台主链（已在本轮代码取证中复核，当前实现不再匹配该旧结论）

## 5. 需求冲突

本节记录第二轮需求资产一致性校验中已确认的冲突。

- `Staff 资料审核能力`：
  [03-admin-staff.md](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/admin/03-admin-staff.md) 明确存在“导师信息变更待审核”横幅，但 [DELIVERY-CONTRACT.yaml](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/admin/DELIVERY-CONTRACT.yaml) 当前没有 staff-change-review 对应 capability。
- `Lead-Mentor Profile 可编辑字段范围`：
  [07-lead-mentor-profile.md](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/lead-mentor/07-lead-mentor-profile.md) 一方面把“方向 / 子方向”列入可编辑信息，另一方面又写“锁定字段仅展示”，但没有明确哪些字段锁定。
- `教学链审核范围`：
  [osg-product-confirmation-checklist.md](/Users/hw/workspace/OSGPrj/docs/osg-product-confirmation-checklist.md) 与 [11-admin-class-records.md](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/admin/11-admin-class-records.md) 都把导师、班主任、助教列为提交方；[05-admin-reports.md](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/admin/05-admin-reports.md) 的副标题和来源枚举则收窄到了“导师提交 / 学生申请 / 导师申报”。
- `Admin forgot-password surface 形态`：
  [permission/00-admin-login.md](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/permission/00-admin-login.md) 定义 4 步 modal；[admin/MATRIX.md](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/admin/MATRIX.md) 和 [19-admin-remaining-pages.md](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/admin/19-admin-remaining-pages.md) 则把 forgot-password 定义为独立页面。
- `基础数据统一源`：
  [osg-product-confirmation-checklist.md](/Users/hw/workspace/OSGPrj/docs/osg-product-confirmation-checklist.md) 与 [osg-business-flow-target.md](/Users/hw/workspace/OSGPrj/docs/osg-business-flow-target.md) 已把基础数据管理定为全平台统一配置源，但局部页面 PRD 仍把地区、方向、招聘周期等写成页面内静态选项。

## 6. 需求资产缺口 / 存疑

本节记录当前需求资产不足以直接下结论的链路。

- `Student Profile`：
  当前能找到 Admin 学员列表与变更审核需求，但未找到 Student 自助 profile 页面专属 PRD。
- `Mentor Profile`：
  当前未找到 Mentor 自助资料页面专属 PRD，现有约束主要由 Admin Staff 页面和实现现状反推。
- `Assistant Profile`：
  当前未找到 Assistant 自助资料页面专属 PRD。
- `Assistant 教学链`：
  checklist 明确 assistant 可提交课程记录，但未找到 Assistant 教学页面专属 PRD。
- `Mentor / Assistant / Student Mock Practice`：
  [career/DECISIONS.md](/Users/hw/workspace/OSGPrj/osg-spec-docs/docs/01-product/prd/career/DECISIONS.md) 明确导师端存在 mock-practice，但当前未找到对应 mentor 页面 PRD；assistant 和 student 端 mock-practice 也缺少专属 PRD 资产。
- `Student / Mentor / Assistant 登录与找回密码`：
  当前只有 Admin 与 Lead-Mentor 有相对完整的登录 / 找回密码 PRD 资产，其余端侧需求资产不完整。

## 7. 本轮新增问题

本节用于记录第二轮新增发现的问题。

- `Assistant 课时提交侧缺失`：
  产品确认清单和 Admin 课程记录 PRD 都把助教列为提交方，但当前代码只给 Assistant 提供了读取 `/admin/class-record/list` 和 `/admin/class-record/stats` 的能力，未找到 Assistant 创建课程记录的后端入口或前端提交 surface。
- `Admin 求职分配导师链使用非真实导师标识`：
  Admin 求职总览前端用导师姓名和序号前端生成 `mentorId`，服务端又直接把这些值写入 `osg_coaching.mentor_ids`，没有做 `staff_id -> user_id` 解析。导师侧读取依赖当前登录 `userId` 匹配 `mentor_ids`，这条链有高风险读不到分配结果。
- `Admin 模拟应聘分配链使用静态导师目录与原样 mentorIds`：
  Admin 模拟应聘前端使用静态 `mentorCatalog`，服务端直接把传入 `mentorIds` 写入 `osg_mock_practice.mentor_ids`，同样没有做 `staff_id -> user_id` 转换。导师侧消费链依赖 `userId` 匹配 `mentor_ids`，存在同类错路风险。

## 8. 按链路分组的审计结论

### 8.1 个人资料与变更申请

当前状态：

- `Student 即时字段直写链`：
  代码已形成自洽闭环。`StudentProfileServiceImpl` 先直写 `phone/wechatId`，再返回刷新后的 profile 视图，这一部分当前没有看到实现层断链。
- `Student 审核字段链`：
  仍是已知断裂。Student 提交面写 `osg_student_profile_change`，Admin 审核面读 `osg_student_change_request`，并且 `applyChangeToStudent` 的 switch 与 Student 提交 key 不一致，首轮 `P0-1` / `P1-7` 继续成立。
- `Lead-Mentor 提交侧`：
  已经具备真实变更申请能力。`/lead-mentor/profile/change-request` 会校验本人范围、拒绝锁定字段修改，并写入 `osg_staff_change_request`。
- `Staff 审批侧`：
  仍然缺失。Admin 侧只有 `POST /admin/staff/change-request`，没有对应 `approve/reject` 入口，首轮 `P0-2` 继续成立。
- `Mentor 自助资料链`：
  当前实现仍是直接读写 `SysUser`，前端把微信号和地区分别绑到 `remark` / `loginIp`，并且方向展示仍是硬编码，已知问题继续成立。
- `Assistant 自助资料链`：
  当前前端确实复用了 `/api/mentor/profile`。更准确地说，这是“错误端点复用 + 错误角色边界”，但控制器仍按当前登录 `userId` 读写，不是跨用户覆盖。
- `需求层面`：
  已确认 `Staff 审核 capability 缺口`、`Lead-Mentor 可编辑字段范围歧义`、以及 Student/Mentor/Assistant profile 需求资产缺口。

### 8.2 教学链路

当前状态：

- 已拆分为 `课程记录链` 与 `课时上报 / 审核链`
- `Student 回看链`：
  已回查当前实现，`StudentCourseRecordServiceImpl` 现在直接读取 `osg_class_record` 中 `approved` 记录，并把评价回写同一主表。因此历史 `GAP-E-01` 不再匹配当前代码。
- `Mentor / Lead-Mentor 提交 -> Admin 审核链`：
  当前代码已具备真实链路。Mentor 和 Lead-Mentor 都能写入 `osg_class_record`，Admin `report` 视角也具备 approve/reject/batch 审核入口。
- `Assistant 提交侧`：
  当前未找到真实创建入口。Assistant 端目前只具备读取 `/admin/class-record/list` 和 `/stats` 的能力，这是本轮新发现的实现缺口。
- `需求层面`：
  仍保留 `审核提交来源范围` 的需求冲突，尤其是 reports PRD 对提交来源的定义比 checklist 和 class-records PRD 更窄。

### 8.3 岗位、求职与模拟应聘流转

当前状态：

- 已拆分为 `岗位发布与学生自添岗位审核`、`求职状态与辅导申请流转`、`模拟应聘申请/分配/确认/反馈`
- `后台岗位发布 -> 公共岗位池曝光链`：
  当前可用。Admin 可真实写入 `osg_position`，Student / Lead-Mentor / Assistant 岗位池围绕公开岗位主表消费。
- `Student 自添岗位 -> Admin 审核链`：
  当前代码已形成完整审核闭环。学生手动添加岗位写入 `osg_student_position`，Admin 侧具备 `list / approve / reject`，审核通过后会写入公共岗位 `osg_position`。
- `Student 求职主链`：
  当前代码已经把 `apply / progress / coaching` 写入 `osg_job_application` 主表，Student 自己的 `/student/application/list` 也直接从主表读。历史 `GAP-C-01` 不再匹配当前实现。
- `Admin 求职分配导师链`：
  当前是本轮新增问题。前端分配弹窗使用前端生成的 `mentorId`，服务端又直接把该值写入 `osg_coaching.mentor_ids`，没有做真实导师标识解析，导师端可能读不到 Admin 分配结果。
- `Student 模拟应聘主链（practice-request）`：
  当前代码已经把 `practice-request` 同时写入 shadow 表和 `osg_mock_practice` 主表，Student overview 的 practiceRecords 也直接读取主表，因此历史 `GAP-D-01` 在该子链上已不再成立。
- `Lead-Mentor 模拟应聘分配链`：
  当前可用。班主任分配时会把 `staffId` 转成 `userId` 再写入 `mentor_ids`，与导师端读取方式一致。
- `Admin 模拟应聘分配链`：
  当前是本轮新增问题。前端使用静态导师目录，服务端直接写入传入的 `mentorIds`，没有做 `staff_id -> user_id` 解析，导师端存在读不到 Admin 分配结果的风险。
- `Student class-request`：
  当前只写 `osg_student_mock_request`，未进入 `osg_mock_practice` 主链；但它究竟属于模拟应聘链还是课程申请链，需求边界还没完全收敛，暂记 `存疑`。
- `需求层面`：
  继续保留 mentor / assistant / student mock-practice 页面契约缺口。

### 8.4 登录、忘记密码与身份恢复

当前状态：

- `Student 恢复链`：
  当前代码已可用，走 shared `/system/password/*`。
- `Mentor 恢复链`：
  当前代码已可用，走 `/mentor/forgot-password/*` 专属命名空间。
- `Lead-Mentor 恢复链`：
  当前代码已可用，但实际走的是 shared `/system/password/*`，与 Mentor 端形成并行命名风格。
- `Assistant 恢复链`：
  当前代码已可用，Assistant forgot-password 页面同样走 shared `/system/password/*`。
- 已承接跨端 forgot-password 命名空间不一致问题
- 已识别 `Admin forgot-password surface` 的需求冲突，以及 Student / Mentor / Assistant 身份恢复资产缺口
- 详细结论待补

### 8.5 字典与枚举驱动字段

当前状态：

- `求职 / 课程 / 模拟应聘`：
  当前代码已经大量使用 `SysDictData` 动态生成 page copy、过滤器和类型 / 状态枚举，不是全站都还停留在硬编码。
- `Profile 相关字段`：
  Mentor Profile 与 Lead-Mentor 编辑弹窗仍在硬编码地区、城市和方向相关展示，继续构成已知问题。
- 已识别 `基础数据统一源 vs 页面静态选项` 的需求冲突
- 详细结论待补

## 9. 下一步

下一步按执行计划继续：

1. 继续按 5 组链路逐组完成代码取证，并把当前 `待审计` 条目收敛成 `通过 / 本轮新增问题 / 存疑`。
2. 对本轮新增 P0/P1 候选项做最小化运行时 spot-check。
3. 回填本报告中的“本轮新增问题”和各组最终结论。
