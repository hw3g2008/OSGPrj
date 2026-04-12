# 单真源 Playwright Testcase Pack Skill 设计

日期：2026-03-28  
主题：为五端生成最终 Playwright testcase pack 的公共 skill

## 1. 背景

当前 admin 端已经沉淀出一套可执行的验收资产链：

- trigger layer
- acceptance layer
- boundary layer
- Playwright manifest
- execution prompt

问题不在产物结构，而在生成方式。过去习惯容易引入以下漂移：

- 多真源拼接，导致 case 口径飘移
- 用 PRD、旧 case、plan 文档替原型补洞
- 为了“全量”硬写假断言
- 一个 case 同时承载多个业务结论
- 最终 Playwright 资产依赖人工二次解释

目标不是再做 4 套端侧 skill，而是沉淀 1 套公共 skill，让任意端都能按同一规范直接产出最终可执行的 Playwright testcase pack。

这里的“同一规范”不再是抽象意义上的同类资产，而是明确对齐 admin 端最终产出的 case 标准。

## 2. 目标

公共 skill 必须满足：

1. 单真源生成。
2. 默认按端解析唯一真源文件。
3. 不使用辅助真源补洞。
4. admin 最终 testcase 资产作为唯一 schema 母版。
5. 每条 case 对应一条真实业务事实。
6. 断言必须有真源锚点。
7. 真源缺口时优先产出 gap，而不是猜测。
8. 最终直接产出 Playwright manifest，而不是只停留在表层 case。

## 3. 默认真源

每个端只允许一个默认真源：

- `admin` -> `osg-spec-docs/source/prototype/admin.html`
- `student` -> `osg-spec-docs/source/prototype/index.html`
- `mentor` -> `osg-spec-docs/source/prototype/mentor.html`
- `lead-mentor` -> `osg-spec-docs/source/prototype/lead-mentor.html`
- `assistant` -> `osg-spec-docs/source/prototype/assistant.html`

用户可以显式传入 `truth=/path/to/file` 覆盖默认值，但覆盖后必须完全替代默认真源，而不是与默认真源拼接。

## 4. 非目标

本 skill 不负责：

- 启动应用
- 执行 Playwright
- 自动修复业务代码
- 用 PRD/旧 case/plan 文档替真源补业务逻辑
- 在真源不完整时伪造断言

## 5. 生成产物

对任意端，skill 输出到固定目录，文件名使用当日日期前缀：

- `admin` -> `<repo>/admin-test/`
- `student` -> `<repo>/student-test/`
- `mentor` -> `<repo>/mentor-test/`
- `lead-mentor` -> `<repo>/lead-mentor-test/`
- `assistant` -> `<repo>/assistant-test/`

目录下生成：

- `<date>-<end>-prototype-test-cases.tsv`
- `<date>-<end>-acceptance-test-cases.tsv`
- `<date>-<end>-acceptance-trigger-links.tsv`
- `<date>-<end>-acceptance-priority.tsv`
- `<date>-<end>-acceptance-execution-guide.md`
- `<date>-<end>-interaction-boundary-test-cases.tsv`
- `<date>-<end>-playwright-manifest.tsv`
- `<date>-<end>-playwright-execution-prompt.md`
- `<date>-<end>-gap-register.md`

其中最终交付重点是：

- `acceptance-execution-guide.md`
- `playwright-manifest.tsv`
- `playwright-execution-prompt.md`
- `gap-register.md`

前置几张 TSV 是为了保证 Playwright 资产不是凭空编出来的，而是可追溯的。

## 6. 核心规则

### 6.1 单真源

一次生成只允许一个 truth source。  
禁止把以下内容作为默认补充输入：

- PRD
- 旧 testcase
- docs/plans
- 接口文档
- 页面源码

只有当用户明确把这些文件指定为唯一 truth source 时，skill 才能使用。

唯一例外是 admin 最终资产可以作为 schema 母版参与校验，但不能贡献任何业务事实。

### 6.2 一条业务事实一条 case

每条 case 必须只表达一个业务事实，例如：

- 一个入口可触发
- 一个弹窗可打开
- 一个字段可填写并受边界限制
- 一个状态流转成立
- 一个异常路径被阻断

禁止把“打开弹窗 + 填表 + 保存 + 列表刷新”糊成一条 case。

### 6.3 无锚点不生成断言

如果某条断言在真源中没有明确锚点，则：

- 不生成可执行 Playwright 断言
- 在 `gap-register.md` 中登记
- 结论写为缺口，不写为猜测

### 6.4 Gap Over Guess

以下场景必须登记 gap，而不是脑补：

- 页面存在，但业务结果未写死
- 权限差异未写死
- 通过/驳回后跨端回写未写死
- 上传格式、长度、大小、状态回滚规则未写死
- 路由、菜单路径、入口归属未写死

### 6.5 最终 Manifest 允许“真源保守值”

为了保持单真源，manifest 字段允许使用以下保守值，而不是伪造运行时信息：

- `RoutePath` 可为真实路径，也可为 `menu://...` 语义入口
- `PermissionKey` 若真源未表达，可写 `UNSPECIFIED_IN_TRUTH`
- `NegativeRoleProfile` 若真源未表达，可留空

但不允许伪造看似精确的权限码、接口名或路由名。

## 7. 工作流

1. 解析目标端。
2. 解析唯一真源路径。
3. 读取真源，枚举页面、入口、弹窗、字段、状态、异常入口。
4. 先生成 trigger layer。
5. 再把每个 trigger 收敛成一条业务事实，生成 acceptance layer。
6. 将交互型 trigger 展成 boundary layer。
7. 由 boundary layer 直接翻译出最终 Playwright manifest。
8. 生成 execution prompt。
9. 输出 gap register。
10. 做结构校验与引用校验。

## 8. Manifest 的设计取向

Manifest 不再依赖“辅助真源中的 router 文件”才能成立。

优先级为：

1. 如果真源明确给出直接入口或路径，就写入 `RoutePath`。
2. 如果真源只给出菜单/按钮/标签页入口，就用 `menu://模块/页面/动作` 表示。
3. 如果连菜单语义也没有，只能登记 gap。

这样生成出的 manifest 仍然可被 Playwright 消费，只是导航方式从“直接跳路由”降级为“按可见入口导航”。

## 9. 质量门槛

生成结束后，必须校验：

- required 列空值为 0
- 主键无重复
- trigger 与 acceptance 关联完整
- boundary 与 acceptance 关联完整
- manifest 对 boundary 的回链完整
- 每条 manifest 都有单一业务事实
- 所有无法锚定的 case 都进入 gap register
- 所有文件表头与 admin 母版完全一致
- 必须产出 acceptance execution guide
- 任何端都不得自定义新的 schema
- execution guide 与 execution prompt 的 P0/P1 门槛口径完全一致

## 11. 执行门槛补充

所有端生成出的执行资产必须使用同一条门槛规则：

- 先执行 `P0`
- `P0` 未 `100% Pass` 时，立即停止
- 不进入 `P1`
- 最终汇报中，`P1` 只能写为 `Not Run / 未执行`

禁止出现下面这种冲突：

- 一边写“P0 未全过则不进入 P1”
- 另一边又要求输出 `P1 Pass / Fail / Block` 总数

只有当 `P0` 已经 `100% Pass` 并且真的执行了 `P1`，才允许输出 `P1` 明细统计。

## 10. 推荐落地

在项目技能目录中新增：

- `.codex/project-skills/generate-playwright-testcase-pack/SKILL.md`
- `.codex/project-skills/generate-playwright-testcase-pack/references/output-contract.md`
- `.codex/project-skills/generate-playwright-testcase-pack/agents/openai.yaml`

skill 采用“公共 skill + 端参数”的模式，不再为 student / mentor / lead-mentor / assistant 各自复制一套流程。
