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
- `GAP-C-01/GAP-C-02` 求职状态 / 辅导申请主链断裂
- `GAP-D-01/GAP-D-02` 模拟应聘主链断裂 / 分配标识不一致
- `GAP-E-01` Student 课程记录回看不消费后台主链

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

当前状态：

- 暂无；待完成各组链路取证后更新

## 8. 按链路分组的审计结论

### 8.1 个人资料与变更申请

当前状态：

- 已建立矩阵占位
- 已承接首轮已知问题
- 已识别 `Staff 审核 capability 缺口`、`Lead-Mentor 可编辑字段范围歧义`、以及 Student/Mentor/Assistant profile 需求资产缺口
- 详细结论待补

### 8.2 教学链路

当前状态：

- 已拆分为 `课程记录链` 与 `课时上报 / 审核链`
- `课程记录链` 已承接 `GAP-E-01`
- 已识别 `审核提交来源范围` 的需求冲突
- 详细结论待补

### 8.3 岗位、求职与模拟应聘流转

当前状态：

- 已拆分为 `岗位发布与学生自添岗位审核`、`求职状态与辅导申请流转`、`模拟应聘申请/分配/确认/反馈`
- 已承接 `GAP-C-01/GAP-C-02` 与 `GAP-D-01/GAP-D-02`
- 已识别 mentor / assistant / student mock-practice 需求资产缺口
- 详细结论待补

### 8.4 登录、忘记密码与身份恢复

当前状态：

- 已建立各端恢复链占位
- 已承接跨端 forgot-password 命名空间不一致问题
- 已识别 `Admin forgot-password surface` 的需求冲突，以及 Student / Mentor / Assistant 身份恢复资产缺口
- 详细结论待补

### 8.5 字典与枚举驱动字段

当前状态：

- 已建立地区、方向、状态枚举 3 条子链
- 已承接地区与方向相关已知问题
- 已识别 `基础数据统一源 vs 页面静态选项` 的需求冲突
- 详细结论待补

## 9. 下一步

下一步按执行计划继续：

1. 继续按 5 组链路逐组完成代码取证，并把当前 `待审计` 条目收敛成 `通过 / 本轮新增问题 / 存疑`。
2. 对本轮新增 P0/P1 候选项做最小化运行时 spot-check。
3. 回填本报告中的“本轮新增问题”和各组最终结论。
