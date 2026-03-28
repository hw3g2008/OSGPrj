# Admin Playwright P0 前端缺陷修复设计

日期：2026-03-28  
主题：admin 端 P0 Playwright 验收缺陷前端修复闭环设计

## 1. 背景

本次任务只处理 admin 前端真实问题，不修改 `admin-test/` 下的真源 TSV 和 MD。  
修复范围限定在：

- `osg-frontend/packages/admin/src`
- 以 `P0` 为最高优先级
- 优先处理 `Status=Fail`
- 对 `Block` 做前端 / 非前端分类，不硬改业务代码掩盖环境或夹具问题

用户明确要求：

- 只修真实前端问题
- 保持现有视觉和业务语义
- 优先补齐 surface contract
- 不允许 `message.info('后续版本接入')` 这类假成功或空动作
- 每个修复点都要补或更新对应 `vitest`
- 修复完成后必须给出已修项、改动文件、测试变更、剩余非前端 Block

## 2. 问题分类标准

本次分诊采用三类边界，避免把非前端问题误判为代码问题。

### 2.1 真前端 bug

满足以下任一项即进入修复范围：

- 页面可见入口未绑定
- 入口绑定错误或触发错误弹窗
- `data-surface-trigger` / `data-surface-id` 缺失、错绑、命名与公开契约不一致
- 弹窗可以打开但无法通过右上关闭、取消按钮、遮罩、ESC 按预期关闭
- 按钮文案、入口位置、弹窗行为与验收契约不一致
- 页面保留 `message.info(...)`、空函数、coming soon、后续版本接入等假动作
- 页面存在可见操作，但真实结果不明确且前端没有明确禁用态或不可用提示

### 2.2 非前端 Block

以下问题不进入前端代码修复：

- 缺少 `admin_limited_without_permission` 账号
- 缺少安全回滚夹具
- 共享环境不适合真实提交
- 上传类 smoke 缺少稳定文件与回滚夹具

这类问题要保留为剩余 Block，不能通过改业务代码“伪修复”。

### 2.3 真源 / 验收侧缺口

以下情况默认不硬改代码迎合：

- 真源缺少可稳定反推的点击目标
- 验收资产无法稳定定位，但页面本身没有明确错误行为

只有在源码中同时确认存在错绑、漏绑、孤儿入口、重复 modal ID 等真实缺陷时，才作为前端 bug 处理。

## 3. 设计目标

本次设计目标不是一次性重构整个 admin，而是在最小风险下完成 P0 缺陷闭环：

1. 修复真实前端缺陷，不掩盖非前端问题。
2. 以公开 surface contract 为优先修复对象。
3. 所有修复都有对应测试和定向回归。
4. 不引入新的命名双轨、伪交互或共享组件回归风险。
5. 最终输出清晰可回归的“已修 / 未修但非前端”边界。

## 4. 方案比较

### 4.1 方案 A：缺陷驱动分批修复

先按 `P0 Fail` 和可明确判定为前端 bug 的 `P0 Block` 建立清单，再按模块分批修复。  
每一批固定走：分诊 -> 测试补强 -> 最小修复 -> 定向回归 -> 结果记录。

优点：

- 风险最低
- 最适合本次缺陷闭环
- 便于分段回归

缺点：

- 节奏严格
- 不追求一次性全站标准化

### 4.2 方案 B：按页面族统一收口

先统一权限管理、用户中心、求职中心的 surface contract，再处理个别页面。

优点：

- 一致性更高
- 共享问题一次解决

缺点：

- 改动面更大
- 更容易把局部缺陷升级成共享回归风险

### 4.3 方案 C：全 admin 一次性契约标准化

把所有 modal、trigger、surface id、关闭逻辑全部统一。

优点：

- 长期形态最整洁

缺点：

- 明显超出这次 P0 修复的最小范围
- 最容易引入新问题

### 4.4 结论

采用方案 A 作为主流程，在局部吸收方案 B：

- 只有共享组件本身是根因时，才做小范围统一
- 不做全 admin 大重构
- 不保留长期兼容层掩盖契约问题

## 5. 总体推进框架

### 5.1 设计关口

先通过 `brainstorming` 固化：

- 范围
- 分类标准
- 修复批次
- 回归门槛
- 技能调度方式

未经批准不进入代码修改。

### 5.2 缺陷分诊

基于以下输入建立修复清单：

- `admin-test/2026-03-28-admin-playwright-run-results.tsv`
- `admin-test/2026-03-28-admin-playwright-defects.md`
- 受影响 admin 前端源码
- 现有 `vitest` 规范与契约测试

输出：

- 真前端 bug 清单
- 非前端 Block 清单
- 真源缺口清单

### 5.3 实施闭环

每个修复批次固定执行：

1. 缺陷定界
2. 测试补强
3. 最小代码修复
4. 模块级回归
5. 完成前验证

### 5.4 输出闭环

最终必须给出：

- 已修 ManifestItem / defect
- 改动文件
- 新增或更新测试
- 剩余非前端 Block
- 未验证项与残余风险

## 6. Skill / 能力调度设计

`brainstorming` 只是设计关口，不承担整个修复流程。  
实施时按环节调用不同能力。

### 6.1 `brainstorming`

用途：

- 锁定设计边界
- 固化批次与门槛

输入：

- 真源结果
- 缺陷清单
- 当前源码
- 用户约束

输出：

- 批准后的设计文档

Gate：

- 未批准不写实现代码

### 6.2 缺陷分诊

用途：

- 判定真实前端 bug 与非前端问题

输入：

- 缺陷清单
- 页面源码
- 现有测试

输出：

- 修复清单
- 排除清单

Gate：

- 只有真前端 bug 进入实施

### 6.3 `test-driven-development`

用途：

- 先把缺陷的失败形态固化成 `vitest`

输入：

- 当前批次缺陷
- 对应页面和组件源码
- 现有 spec 风格

输出：

- 能表达契约缺陷的测试

Gate：

- 没有测试边界，不做代码修复

### 6.4 实施修复

用途：

- 最小改动修复真实前端问题

原则：

- `surface contract` 优先
- 共享组件是根因才动共享组件
- 页面局部问题只做局部补丁
- 不为环境 / 夹具 / 真源问题改业务逻辑

### 6.5 定向回归

用途：

- 以模块级 `vitest` 为主
- 仅在必要时做浏览器级抽查

默认工具：

- `vitest`
- `webapp-testing`，仅用于补真实交互验证

### 6.6 `verification-before-completion`

用途：

- 在宣布完成前做最终核验

输出：

- 已修项
- 测试通过证据
- 剩余非前端 Block
- 风险说明

Gate：

- 没有验证证据，不宣称修复完成

## 7. 修复批次设计

### 7.1 批次 1：权限管理与共享 shell

优先修复最明确、最集中、共享收益最高的 P0。

建议纳入：

- `ADM-PW-ROLE-007`
- `ADM-PW-ADMINUSER-034`
- `ADM-PW-PROFILE-001`
- `ADM-PW-PROFILE-002`
- `ADM-PW-PROFILE-003`
- `ADM-PW-PROFILE-008`
- `ADM-PW-PROFILE-009`
- `ADM-PW-BASE-087`
- `ADM-PW-BASE-113`
- `ADM-PW-BASE-126`
- `ADM-PW-BASE-127`

根因聚类：

- `OverlaySurfaceModal` 的关闭 / 取消契约
- `MainLayout -> ProfileModal` 入口不可见或不可点
- `ProfileModal` 与 `BaseDataModal` 仍采用 ant modal，与 overlay 契约分裂
- 角色与后台用户页面的取消链路不稳定

处理原则：

- 以验收契约命名作为公开命名
- 共享组件是根因则统一
- 页面局部问题只补局部
- 不在共享问题未稳定前扩散到下一批

### 7.2 批次 2：用户中心 surface contract 收口

目标是修复“页面可见但 trigger/id 错绑或缺失”的真实前端问题。

建议纳入：

- 学员管理：`ADM-PW-STUD-026/027/028/061/065/067/075/076/077`
- 导师管理：`ADM-PW-STAFF-010/019/020/021/043/050/051/052`
- 合同管理：`ADM-PW-CONT-008/013`

公共策略：

- 所有可见入口必须直接挂 `data-surface-trigger`
- 对应 modal 必须具备唯一 `data-surface-id`
- 样本化行内入口补 `data-surface-sample-key`
- 详情 / 编辑 / 新增命名以验收契约为准

结论：

- 采用外部契约重命名
- 不做长期双命名兼容层

原因：

- 这类命名本身就是公开 surface contract
- 双轨兼容会继续积累错绑和测试漂移

### 7.3 批次 3：求职中心与课程记录假动作清理

目标是清理“按钮可见但无真实行为”的问题。

范围：

- 用户限定目录内的 career 页面中，能明确判定为可见未绑定、错绑或假动作的入口
- `views/teaching/class-records/index.vue`

处理策略：

- 有真实业务链路则接真实链路
- 没有真实链路且当前阶段无法提交，则改成明确禁用态或不可用态
- 不允许保留“后续版本接入”“开发中”等假成功提示作为可见动作结果

## 8. 公共 surface contract 规则

### 8.1 入口层

- 所有验收涉及入口必须挂在可点击语义元素上
- 不把 `data-surface-trigger` 挂在无语义 wrapper
- 行内入口按需补 `data-surface-sample` 和 `data-surface-sample-key`

### 8.2 弹窗层

- 所有 overlay 弹窗都有唯一 `data-surface-id`
- 右上关闭、取消按钮、遮罩关闭、ESC 行为一致
- 不允许孤儿 modal、重复 modal ID、不可达 modal

### 8.3 行为层

- 取消只负责关闭，不产生副作用
- 确认才触发提交
- 成功 / 失败提示必须与真实结果一致
- 不允许“看起来成功但实际上没做事”

## 9. 测试与回归设计

### 9.1 第一层：缺陷对应测试

每个修复点必须新增或更新 `vitest`。

共享契约类：

- `src/__tests__/overlay-surface.spec.ts`
- `src/__tests__/layout.spec.ts`

权限管理类：

- `src/__tests__/roles.spec.ts`
- `src/__tests__/users.spec.ts`
- `src/__tests__/base-data.spec.ts`

用户中心类：

- `src/__tests__/students.spec.ts`
- `src/__tests__/staff.spec.ts`
- `src/__tests__/contracts.spec.ts`

教学 / 求职中心类：

- `src/__tests__/class-records.spec.ts`
- 如涉及具体页面，再补 `positions.spec.ts`、`job-overview.spec.ts`、`mock-practice.spec.ts`

覆盖重点：

- `data-surface-trigger`
- `data-surface-id`
- 关闭 / 取消 / 入口绑定
- 文案与可点击性
- 假动作替换为真实行为或明确禁用态

### 9.2 第二层：批次级定向回归

admin 包现有测试脚本：

- `pnpm --filter @osg/admin test`

实施中按批次执行定向 spec，而不是默认全量。

批次 1 默认回归：

- `roles.spec.ts`
- `users.spec.ts`
- `base-data.spec.ts`
- `layout.spec.ts`
- `overlay-surface.spec.ts`

批次 2 默认回归：

- `students.spec.ts`
- `staff.spec.ts`
- `contracts.spec.ts`
- `overlay-surface.spec.ts`

批次 3 默认回归：

- `class-records.spec.ts`
- 以及本批实际 touched 的 `positions/job-overview/mock-practice` spec

通过条件：

- 当前批次新增 / 更新 spec 全部通过
- 同批次相关旧 spec 不回归失败
- 触及共享 overlay 契约时，`overlay-surface.spec.ts` 必跑

### 9.3 第三层：必要时浏览器级抽查

只在结构测试无法证明真实交互时使用 `webapp-testing`。

典型场景：

- 用户菜单打开后点击“个人设置”
- modal 右上关闭与取消按钮是否真实关闭
- 假动作改为禁用态后的页面表现

目的：

- 补足源码断言与真实交互之间的差距
- 不把整个流程升级成重型手工验证

## 10. 完成判定

宣布修复完成前，必须同时满足：

1. 每个已修 defect 都能映射到具体代码改动和测试。
2. 当前批次定向回归通过。
3. 剩余问题都已明确归类为账号 / 夹具 / 环境 / 真源缺口。
4. 汇报中显式区分“已修”和“未修但非前端”。

## 11. 风险控制

本次明确避免：

- 全局大重构
- 长期双命名兼容层
- 通过前端假提示掩盖环境问题
- 在没有测试兜底的前提下改共享 modal 契约
- 修改 `admin-test/` 真源文件

## 12. 实施前后的明确边界

### 12.1 本次要修

- `P0 Fail` 中确认属于前端缺陷的问题
- `P0 Block` 中明确属于 trigger / surface / 关闭链路 / 假动作问题的项

### 12.2 本次不硬修

- 缺 `admin_limited_without_permission` 账号
- 缺可回滚夹具
- 共享环境不适合真实提交
- 真源缺少稳定点击目标但前端无明显错误行为

## 13. 推荐实施顺序

1. 批次 1：权限管理与共享 shell
2. 批次 1 回归通过后，进入批次 2：用户中心 contract 收口
3. 批次 2 回归通过后，进入批次 3：求职中心与课程记录假动作清理
4. 最后统一出具修复清单与剩余 Block 清单

## 14. 后续说明

本次 `brainstorming` 完成后，下一步应进入实施计划阶段。  
当前会话可见 skills 中未提供 `writing-plans`，因此无法按该 skill 名称直接切换。  
最佳替代方式是基于本设计手动生成实施计划，再进入实现。
