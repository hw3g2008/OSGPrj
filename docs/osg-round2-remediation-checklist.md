# OSG Round2 修复清单

更新日期：2026-03-26  
来源：`docs/osg-cross-endpoint-flow-audit-round2.md` + `docs/osg-cross-endpoint-flow-matrix.md`  
用途：把第二轮审计结果压缩成修复执行清单，便于后续按优先级处理

## P1 新增问题

- [ ] 修复 `Admin 求职分配导师链` 使用非真实导师标识的问题
  当前风险：Admin 分配成功，但导师端看不到记录
  目标：Admin 分配链与 Lead-Mentor 分配链统一使用真实 `user_id` 语义

- [ ] 修复 `Admin 模拟应聘分配链` 使用静态导师目录与原样 `mentorIds` 的问题
  当前风险：Admin 分配成功，但导师端看不到记录
  目标：前端导师选项来自真实 staff 数据，后端统一写入真实 `user_id`

- [ ] 补齐 `Assistant 课时提交侧`
  当前风险：助教只有读取课时记录能力，没有真实提交链
  目标：助教可按需求提交课程记录，并进入后台审核链

## 已知待修复问题

- [ ] 修复 `Student 审核字段变更 -> Admin 审批` 的双表断裂
  当前问题：Student 写 `osg_student_profile_change`，Admin 读 `osg_student_change_request`

- [ ] 修复 `Student 审核字段 key` 与 `Admin applyChangeToStudent` switch 不一致的问题
  当前问题：`highSchool / postgraduatePlan / visaStatus / primaryDirection / secondaryDirection` 会在审批时崩溃

- [ ] 补齐 `Staff 资料变更 Admin 审批链`
  当前问题：只有 submit，没有 approve / reject

- [ ] 修复 `Mentor 自助资料链`
  当前问题：
  - 直接写 `SysUser`
  - 微信号落 `remark`
  - 地区落 `loginIp`
  - 主攻方向 / 二级方向硬编码展示

- [ ] 修复 `Assistant 资料接口` 错误复用 `/api/mentor/profile`
  当前问题：端点和角色边界错误，仍按 mentor profile 路径访问

- [ ] 修复 `跨端 forgot-password` 命名空间不一致
  当前问题：`/system/password/*` 与 `/mentor/forgot-password/*` 并存，Lead-Mentor / Assistant 也复用 shared path

- [ ] 修复 `Profile` 相关页面的地区 / 城市 / 方向硬编码
  当前问题：profile 相关页面仍未接动态字典源

## 需求冲突待统一

- [ ] 统一 `Staff 资料审核能力` 的需求资产
  冲突点：`03-admin-staff.md` 有待审核横幅，`admin/DELIVERY-CONTRACT.yaml` 缺少 staff-change-review capability

- [ ] 统一 `Lead-Mentor Profile` 可编辑字段范围
  冲突点：PRD 一处写方向 / 子方向可编辑，一处又写锁定字段仅展示

- [ ] 统一 `教学链审核提交来源范围`
  冲突点：checklist / class-records PRD 与 reports PRD 对“谁能提交”口径不一致

- [ ] 统一 `Admin forgot-password` 的真实 surface
  冲突点：有的文档写 modal，有的文档写独立页面

- [ ] 统一 `基础数据管理为全平台配置源` 的落地口径
  冲突点：产品口径要求统一配置源，但部分页面 PRD 仍写静态选项

## 存疑项

- [ ] 补齐 `Student Profile` 专属 PRD 资产，避免长期靠 Admin 学员页反推
- [ ] 补齐 `Mentor Profile` 专属 PRD 资产
- [ ] 补齐 `Assistant Profile` 专属 PRD 资产
- [ ] 补齐 `Assistant 教学链` 专属 PRD 资产
- [ ] 补齐 `Mentor / Assistant / Student Mock Practice` 专属页面 PRD 资产
- [ ] 补齐 `Student / Mentor / Assistant 登录与找回密码` 专属 PRD 资产
- [ ] 明确 `Student class-request` 到底归属 `模拟应聘链` 还是 `课程申请链`

## 建议顺序

1. 先修 3 个 `P1` 新增问题
2. 再修 `Student 审核字段链` 和 `Staff 审批链`
3. 并行清理 `需求冲突`
4. 最后回补 `存疑项` 的需求资产
