# 班主任端 Lead Mentor 设计稿

> 日期: 2026-03-20
> 真源: `osg-spec-docs/source/prototype/lead-mentor.html`
> 工作流: RPIV / Research 阶段归档

## 1. 目标

本轮一次性建立班主任端完整产品需求基线，后续只在 Plan / Implement / Validate 分批落地，不再重复做需求分析。

硬约束：

- HTML 原型是唯一真源，不用现有代码骨架反推业务。
- 首批优先范围必须形成真实业务闭环，禁止任何假数据。
- UI 不走“先还原再接数据”的捷径，页面级和 modal 级 surface 一并纳入 RPIV。
- 非首批页面保留导航骨架，但点击统一 toast `敬请期待`，不进入假页面。

## 2. 完整产品基线

正式 IA 按原型侧边栏定义：

- 登录模块：登录、忘记密码
- 首页：Home
- 求职中心：岗位信息、学员求职总览、模拟应聘管理
- 教学中心：学员列表、课程记录、人际关系沟通记录
- 财务中心：课时结算、报销管理
- 资源中心：文件、在线测试题库、真人面试题库
- 个人中心：基本信息、课程排期、消息通知、常见问题

原型中的 `job-apply / requests / students / job-tracking / bank-review / qbank / questions` 视为内部页或未来页，纳入需求基线但不进入首层导航开放范围。

## 3. 首批真实闭环范围

首批优先范围固定为：

1. 登录 / 忘记密码
2. 岗位信息
3. 学员求职总览
4. 模拟应聘管理
5. 学员列表
6. 课程记录
7. 基本信息 / 课程排期

这七块必须同时满足：

- 页面结构按原型还原
- 数据来自真实接口
- 权限范围只允许当前班主任可见数据
- 操作产生真实状态变更
- 验证时包含关键弹窗和多态 surface

## 4. 数据与权限边界

班主任端不能直接等同于 admin 端裁剪版。底层可复用已有 service，但必须新增 lead-mentor 受限接口层。

关键边界：

- 岗位信息：岗位目录可全平台可见，但“我的学员申请”仅限当前班主任管理范围。
- 学员求职总览：`managed` 按 `leadMentorId`，`coaching` 按辅导关系包含当前用户，不能偷换。
- 模拟应聘管理：`pending / coaching / managed` 三视角都必须走真实关系过滤。
- 学员列表：同时保留“我教的学员”和“班主任为我”两种关系。
- 课程记录：既要有“我的申报”，也要有“我管理的学员”；`上报课程记录` 必须是真提交。
- 基本信息 / 排期：走 self-service 接口，不复用 admin 任意 staffId 的管理接口。

## 5. UI Surface 粒度

UI 分析粒度下沉到 `page -> surfaces -> states -> actions -> data fields -> backend contract`。

必须覆盖：

- 弹窗
- 抽屉/详情面板
- Tab 内容区
- 日历多态
- 空态 / 错误态 / 未授权态
- 禁用态 / 成功反馈
- 批量操作条 / 筛选栏 / 分页态

首批关键 surfaces：

- `modal-forgot-password`
- `modal-position-mystudents`
- `modal-job-detail`
- `modal-assign-mentor`
- `modal-lead-mock-feedback`
- `modal-assign-mock`
- `modal-lm-report`
- `modal-class-detail*`
- `modal-class-reject`
- `modal-lead-edit-profile`
- `modal-lead-force-schedule`

## 6. 已确认决策

- 非首批页面保留导航骨架，但点击统一 toast `敬请期待`。
- `dashboard/home` 也按非首批策略处理，不落假数据首页。
- 首次登录后默认进入首个开放能力页面 `岗位信息`。
- 原型存在缺口的地方不允许脑补，例如 `modal-lm-interview-27/28/30` 只有触发器没有实体定义。
- `岗位信息 -> 我的学员申请` 文案虽写可修改状态，但原型没有编辑控件，不能私造 UI。

## 7. 验收口径

Research 阶段完成标准：

- `lead-mentor` PRD 目录已建立
- SRS 已形成 FR / AC / 接口边界
- 决策与缺口已落盘
- UI-VISUAL-CONTRACT 和 DELIVERY-CONTRACT 已建立
- workflow 状态与事件链已切换到 `lead-mentor`

Plan 阶段进入条件：

- 不存在未决产品裁决
- 首批页面 page/surface/data/contract 已全部可追溯
- 非首批策略已明确为 toast 拦截，不再作为实施范围混入
