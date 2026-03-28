# Student Playwright 执行审计设计

日期：2026-03-28  
主题：student 端 Playwright testcase pack 执行审计设计

## 1. 背景

本次角色不是 testcase pack 生成 agent，也不是前端修复 agent。  
职责固定为：

- 读取既定 student 验收资产
- 按 `manifest` 逐条执行
- 按 `acceptance` 判定结果
- 留证并输出执行结果
- 防止“假通过”

不在职责内的事项：

- 不修改 testcase pack
- 不修改真源
- 不修改执行口径
- 不把页面可见但未实现的问题降级成 `gap`

本次单一真源固定为：

- `/Users/hw/workspace/OSGPrj/osg-spec-docs/source/prototype/index.html`

执行资产固定为：

- `student-test/2026-03-28-student-acceptance-execution-guide.md`
- `student-test/2026-03-28-student-acceptance-priority.tsv`
- `student-test/2026-03-28-student-acceptance-test-cases.tsv`
- `student-test/2026-03-28-student-acceptance-trigger-links.tsv`
- `student-test/2026-03-28-student-interaction-boundary-test-cases.tsv`
- `student-test/2026-03-28-student-playwright-manifest.tsv`
- `student-test/2026-03-28-student-prototype-test-cases.tsv`
- `student-test/2026-03-28-student-gap-register.md`

执行范围固定为：

- 求职中心 / 岗位信息
- 求职中心 / 我的求职
- 求职中心 / 模拟应聘
- 学习中心 / 课程记录
- 个人中心 / 基本信息

明确排除：

- 登录
- 忘记密码
- 首页
- 消息中心
- 资源中心
- 简历中心
- 沟通记录
- 其他未明确页面

## 2. 设计目标

本设计只解决一件事：把 student pack 变成一套可执行、可留证、可复核、不会把坏态误判为通过的执行审计流程。

必须满足以下目标：

1. 按 `manifest` 逐条执行，不自行发明替代路径。
2. 最终判定回落到 `acceptance`，不能只看“按钮能不能点”。
3. `ExpectedPrimary` 与 `ExpectedSecondary` 必须同时满足才可判 `Pass`。
4. 当前页面肉眼可见但未落地的控件、交互、切换、校验、提交，一律判 `Fail`。
5. `gap register` 只承接完全没有可见入口的孤儿资产。
6. 结果文件、缺陷文档和证据目录必须落盘，且可直接用于后续修复回路。

## 3. 现有上下文与复用边界

本次执行设计复用现有仓库能力，但不混用其业务判断口径。

### 3.1 可复用输入

- `student-test/2026-03-28-student-playwright-execution-prompt.md`
  - 作为 student 执行契约说明
- `admin-test/admin_test_playwright_runner.py`
  - 作为 runner 形状参考
- `osg-frontend/playwright.config.ts`
  - 作为 student 本地目标解析来源
- `osg-frontend/tests/e2e/support/auth.ts`
  - 作为默认 student 登录来源

### 3.2 已确认的执行前提

采用仓库当前默认前提作为可用输入：

- student base URL：`http://127.0.0.1:4000`
- 默认账号：`student_demo / student123`

若这些前提在执行时不可用，则应直接记 `Block`，而不是修改服务或更换执行口径。

### 3.3 本次需要新增的执行层

新增一个独立的 student runner，例如：

- `student-test/student_test_playwright_runner.py`

其职责仅限于：

- 读取 student 资产
- 过滤执行批次
- 驱动 Playwright 执行
- 采集证据
- 生成结果文件

不承担任何资产修订或业务修复职责。

## 4. 方案比较

### 4.1 方案 A：P0 批次门禁停机

先执行全部 `P0` manifest，再统一裁决。  
若 `P0` 中存在任一 `Fail` 或 `Block`，整轮暂停，不进入 `P1`。

优点：

- 符合“先修关键问题”的门禁思路
- 能一次拿到完整 `P0` 缺陷面
- 避免 `P1` 稀释对阻断问题的关注

缺点：

- `P0` 失败时，本轮拿不到 `P1` 逐条执行数据

### 4.2 方案 B：P0 首缺陷即停

执行到首个 `Fail` 或 `Block` 即停止。

优点：

- 最快进入修复

缺点：

- 信息量过少
- 容易反复多轮往返

### 4.3 方案 C：P0/P1 全量执行

无论 `P0` 是否通过，都把 `P1` 一并跑完。

优点：

- 信息最全

缺点：

- 与当前门禁策略冲突
- 容易把重点从 `P0` 阻断问题上移开

### 4.4 结论

采用方案 A：`P0` 批次门禁停机。

固定规则：

- 先执行全部 `25` 条 `P0`
- `P0` 出现任一 `Fail` 或 `Block`，立即暂停，不进入 `P1`
- 仅当 `P0 = 100% Pass` 时，才进入 `51` 条 `P1`

## 5. 执行架构

执行架构分为四层：

### 5.1 资产读取层

读取并建立以下映射：

- `manifest -> boundary`
- `manifest -> acceptance`
- `acceptance -> trigger-links`
- `acceptance -> priority`

其中：

- `manifest` 是主执行清单
- `acceptance` 是最终判定依据
- `trigger-links` 用于回查入口来源
- `gap register` 只用于审计无入口资产

### 5.2 预检层

正式执行前先做轻量预检：

1. base URL 是否可访问
2. 默认 student 账号是否可登录
3. 首个范围页面是否可加载并截图

若预检失败：

- 本轮直接终止
- 输出环境级 `Block`
- 不进入具体 manifest 执行

### 5.3 执行层

每条 manifest 固定按以下顺序执行：

1. 读取 `RoutePath / Precondition / ActionType / LocatorHint / InputProfile`
2. 处理 `DependsOn`
3. 进入页面或 surface
4. 执行动作
5. 断言 `ExpectedPrimary`
6. 断言 `ExpectedSecondary`
7. 回查 `AcceptanceRefs`
8. 采集证据
9. 按 `StateIsolation` 清理状态

### 5.4 输出层

本轮必须产出：

- `student-test/2026-03-28-student-playwright-run-results.tsv`
- `student-test/2026-03-28-student-playwright-defects.md`
- `screenshots/student-acceptance/`

## 6. 判定规则

### 6.1 Pass

满足以下全部条件才可判 `Pass`：

- manifest 指定动作执行成功
- `ExpectedPrimary` 满足
- `ExpectedSecondary` 满足
- 回查 `AcceptanceRefs` 后，与 acceptance 预期一致

### 6.2 Fail

以下情况一律判 `Fail`：

- 页面有可见入口，但无绑定
- 页面有可见入口，但无联动、无切换、无阻断
- 页面有可见入口，但跳到占位或错误页面
- 成功流被错误阻断
- 只满足主结果，不满足次结果
- 与 acceptance 预期不一致
- 页面可见但未落地

其中“页面可见但未落地”必须显式标注，不能隐藏在备注里。

### 6.3 Block

仅在以下类型问题导致当前条目无法继续时才可判 `Block`：

- 环境不可用
- 服务不可用
- 默认账号不可用
- 数据或依赖资源缺失
- 页面无法正常加载
- 明显系统级异常导致当前条目无法进入判定

`Block` 不能用来兜底页面可见但未实现的问题。

### 6.4 Gap 使用边界

只有在页面里完全没有可见入口时，才允许引用 `gap register`。  
一旦页面中存在可见入口或操作控件，就必须按 `Pass / Fail / Block` 判定，不能降级为 `gap`。

## 7. 证据策略

证据统一落到：

- `screenshots/student-acceptance/`

按 manifest 条目分目录或分文件留证，确保能从结果文件直接反查。

### 7.1 页面、tab、视图、排序、筛选

至少保留：

- `before`
- `after`

要求能对照出切换、排序、筛选或显示状态变化。

### 7.2 弹窗

至少保留：

- 打开态
- 结果态

要求能看到标题、关键字段区和关闭或提交结果。

### 7.3 提交成功

至少保留：

- 输入态
- 成功提示
- 来源控件回写态

### 7.4 提交失败或边界阻断

至少保留：

- 输入态
- 阻断提示
- 页面或弹窗保持态

### 7.5 执行异常

至少保留：

- 当前页全屏截图

必要时补充：

- console
- trace
- 其他错误日志

## 8. 结果文件设计

### 8.1 Run Results

输出文件：

- `student-test/2026-03-28-student-playwright-run-results.tsv`

至少包含字段：

- `ManifestItem`
- `AcceptanceRefs`
- `TriggerItem`
- `Module`
- `Submodule`
- `Priority`
- `Status`
- `EvidencePath`
- `Notes`

规则：

- 只写本轮实际执行过的条目
- 未进入执行的条目不伪造状态

### 8.2 Defects

输出文件：

- `student-test/2026-03-28-student-playwright-defects.md`

每条至少包含：

- 用例 ID
- 模块
- 实际结果
- 预期结果
- 复现步骤
- 证据路径
- 严重级别
- 判定类型：`Fail` 或 `Block`
- 是否页面可见但未落地

## 9. 批次执行与停机规则

### 9.1 批次顺序

固定执行顺序：

1. 预检
2. 全量 `P0`
3. `P0` 裁决
4. 若 `P0 = 100% Pass`，再执行全量 `P1`

### 9.2 停机规则

- `P0` 逐条执行到底，不因首个失败中途退出
- `P0` 中只要出现任一 `Fail` 或 `Block`，本轮立即停止，不进入 `P1`
- `P1` 只在 `P0` 全通过时才执行

### 9.3 统计规则

总数取 manifest 范围内应执行总数，不等于本轮实际执行数。

统计口径：

- `Pass / Fail / Block` 只统计本轮已执行且已裁决条目
- 未执行条目单独说明，不伪装成 `Block`

因此当 `P0` 不通过时，最终汇报中的 `P1` 固定写法为：

- `P1 总数 51 / Pass 0 / Fail 0 / Block 0`
- 备注：`未进入执行 51，原因：P0 未达到放行条件`

## 10. 汇总与放行结论

最终汇报固定输出：

1. `P0 总数 / Pass / Fail / Block`
2. `P1 总数 / Pass / Fail / Block`
3. 页面可见但未落地的 `Fail` 数量
4. Top defects
5. Top blockers
6. `gap register` 是否仍只包含无可见入口资产
7. 结果文件路径
8. 当前 student 端是否达到测试放行标准

### 10.1 Top defects

只列 `Fail`，排序优先级：

1. `P0`
2. 页面可见但未落地
3. 其余 `P1`

### 10.2 Top blockers

只列 `Block`，优先级：

1. 环境级
2. 登录级
3. 页面加载级
4. 关键依赖级

### 10.3 Gap Register 复核

执行完成后必须逐条复核：

- `student-test/2026-03-28-student-gap-register.md`

若任何 gap 实际上已存在页面可见入口，则应判定：

- `gap register 不再纯净`

仅当全部 gap 仍然完全无可见入口时，才可判定：

- `gap register 仍只包含无可见入口资产`

### 10.4 放行标准

仅在以下条件全部满足时，才可判定达到测试放行标准：

- `P0 = 100% Pass`
- `P1` 通过率 `>= 95%`
- 不存在未裁决 `Block`
- 不存在被降级处理的页面可见坏态
- `gap register` 仍符合无可见入口边界

否则一律判定：

- `当前 student 端未达到测试放行标准`

## 11. 后续实施交接

本设计获批后，实施阶段应严格按以下方向推进：

1. 先实现 student runner
2. 先打通预检与 `P0` 批次执行
3. 先保证结果文件、缺陷文档和证据目录可稳定落盘
4. 再补齐 `P1` 和 gap 复核逻辑

实施阶段仍需遵守：

- 不修改 testcase pack
- 不修改真源
- 不擅自改变 `Pass / Fail / Block / gap` 口径
