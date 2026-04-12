# Admin Playwright 全链路 Supplement Case 设计

日期：2026-03-28
主题：admin 验收补充 case 从前端 gap 表升级为全链路增量台账

## 1. 背景

当前 admin 验收已有既定真源：

- `admin-test/2026-03-28-admin-acceptance-test-cases.tsv`
- `admin-test/2026-03-28-admin-playwright-manifest.tsv`
- 其他既有 trigger / boundary / priority / guide 文件

这些文件仍然是原始真源，不允许直接篡改来“追平现状”。

此前 supplement 的定位偏向前端 gap 补充，用户进一步明确：

1. 目标不是“前端先小完成，后面再补后端”。
2. 目标是看一条业务链是否真正通过。
3. 如果需要服务端配合，也必须显式拉出来并形成 case。
4. 页面可见入口不等于通过，只有全链路结果成立才能判 `Pass`。

因此，本设计把 supplement 从“前端 gap 补充表”升级为“全链路增量 case 台账”。

## 2. 设计目标

本次设计要解决四个问题：

1. 保持既有真源不变。
2. 用单一 supplement 台账承接增量判定，不再拆成多套账。
3. 把前端、后端、产品口径、环境阻断统一挂到同一条 case 上。
4. 为后续 agent 分工、修复、回归提供统一入口。

## 3. 方案比较

### 3.1 方案 A：单一 supplement 台账覆盖全链路

继续使用一份 supplement TSV，但分类扩展为：

- `quick_fix_frontend`
- `needs_backend_support`
- `needs_product_confirmation`
- `env_or_fixture_blocker`

优点：

- 单 case 统一归因
- 最符合“全链路通过”的目标
- 便于按责任域并行分派 agent

缺点：

- supplement 台账更重
- 分拣标准必须更严

### 3.2 方案 B：前后端分别维护 supplement

拆成 frontend supplement、backend supplement、product queue。

优点：

- 各团队视图更直观

缺点：

- 同一业务链被拆散
- 回归时仍需人工拼接

### 3.3 方案 C：维持前端 supplement，其他问题继续进 defects

优点：

- 最快

缺点：

- 不满足“全链路通过”的目标
- 后端问题仍然滞后暴露

### 3.4 结论

采用方案 A。

核心原则是：一条 case 不会拆成“前端已修 + 后端待补 + 另一个 blocker”，而是始终保留为一条全链路 case，只在责任分类上区分当前卡点。

## 4. 台账模型

supplement TSV 的定位为：

- admin 验收真源体系之外的增量判定层
- 不覆写原始真源
- 用于承接更严格的 visible-contract 判定和全链路归因

推荐保留或补强的字段：

- `SupplementCaseID`
- `CaseLevel`
- `模块`
- `子模块`
- `RoutePath`
- `VisibleEntry`
- `RelatedManifest`
- `RelatedAcceptance`
- `SourceCoverageStatus`
- `GapType`
- `CurrentObservedBehavior`
- `RequiredBehavior`
- `SuggestedActionType`
- `Priority`
- `RequiresFixture`
- `TriageLabel`
- `EvidencePath`
- `Notes`

其中：

- `TriageLabel=quick_fix_frontend`
  - 入口错绑、弹窗打不开、关闭失败、联动不生效、筛选重置不落地、假成功、前端未真正触发下载等
- `TriageLabel=needs_backend_support`
  - 文件流未返回、审核提交或状态回写缺失、统计与列表不同步、组合筛选依赖接口支持等
- `TriageLabel=needs_product_confirmation`
  - 入口是实现还是移除、审核通过后的唯一落点、详情策略、公开范围等尚未定稿
- `TriageLabel=env_or_fixture_blocker`
  - 缺账号、缺负权限账号、缺夹具、缺回滚条件、缺稳定测试文件

## 5. 全链路判定规则

case 的判定顺序固定为：

1. 前端入口是否成立
2. 服务端结果是否成立
3. 产品口径是否明确
4. 环境是否可验证

### 5.1 Frontend

必须至少满足：

- 可见入口与真实 surface 对应
- 打开、关闭、取消链路完整
- 筛选、联动、重置、状态切换在页面上有明确结果

### 5.2 Backend

必须至少满足：

- 导出按钮可见时真正产生文件
- 审核 / 通过 / 驳回 / 确认真正回写
- 列表、详情、tab、统计与最终结果一致

### 5.3 Product

必须至少满足：

- 该入口是否保留已明确
- 最终落点、公开范围、详情策略已明确

### 5.4 Environment

必须至少满足：

- 有账号
- 有受限账号
- 有夹具
- 有稳定数据或测试文件

## 6. 状态定义

执行结果仍然只保留：

- `Pass`
- `Fail`
- `Block`
- `N/A`

其中：

- `Pass`
  - 前端、后端、口径、环境都成立，且 acceptance 结果成立
- `Fail`
  - case 可执行，但前端行为或最终业务结果不符合 acceptance
- `Block`
  - 被环境、账号、夹具、后端未实现能力等显式阻断
- `N/A`
  - 与当前范围确认一致的显式移除或禁用

注意：

- `needs_product_confirmation` 是 supplement 的责任分类，不是执行状态
- “按钮能点”不等于 `Pass`
- “前端已打开弹窗”不等于 `Pass`

## 7. 适用范围

本轮只覆盖当前 admin 范围：

- 权限管理：后台用户管理、基础数据管理
- 用户中心：学员管理、合同管理、导师管理、导师排期管理
- 求职中心：岗位信息、学生自添岗位、学员求职总览、模拟应聘管理
- 教学中心：课程记录
- 个人中心：操作日志、个人设置

## 8. 执行策略

### 8.1 先补 case，再实施

先把现有 supplement TSV 从“前端 gap 表”升级为“全链路台账”，完成重分拣：

- 把已有 `quick_fix_frontend`
- 重新识别 `needs_backend_support`
- 保留 `needs_product_confirmation`
- 保留 `env_or_fixture_blocker`

### 8.2 再分责任域处理

- 前端 agent 处理 `quick_fix_frontend`
- 后端 agent 处理 `needs_backend_support`
- 产品确认项单列待裁决
- 环境项单列待补账号 / 夹具 / 数据

### 8.3 最后统一回归

回归不是看“某侧完成了多少”，而是看 case 是否完成闭环：

- 代码级验证
- 本地运行态验证
- 必要时测试环境抽查

## 9. 非目标

本设计不做以下事情：

- 不重写既有真源表
- 不把 supplement 变成第二套主真源
- 不用前端假提示掩盖后端缺失
- 不由前端或测试替产品拍板

## 10. 下一步

在本设计批准后，执行计划应按以下顺序展开：

1. 升级 supplement case 台账分类
2. 完成现有 case 的全链路重分拣
3. 按责任域派发 agent
4. 完成一轮修复后重新跑 admin 验收
