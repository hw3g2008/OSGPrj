# Student API Smoke Design

## Goal

为学生端本次已落地功能提供一条可重复执行的本地 smoke 链路，覆盖：

- 登录与当前用户信息
- 岗位信息
- 我的求职
- 模拟应聘
- 课程记录
- 基本信息

脚本目标不是穷举所有筛选条件和弹窗分支，而是保证每个已落地页面的主流程至少跑通一次，并给出“前端一定会调用”与“只在主动提交时调用”的接口边界。

## Scope

新增一条脚本入口：

- `bin/student-api-smoke.sh`

新增一条脚本级自测：

- `bin/student-api-smoke-selftest.sh`

脚本默认访问本地开发后端 `http://127.0.0.1:28080`，使用学生账号登录并自动提取运行期数据，避免依赖数据库直连或硬编码业务主键。

## Runtime Contract

脚本顺序执行以下流程：

1. 学生登录并获取 token
2. 调用 `/getInfo`
3. 拉取岗位列表和岗位元数据
4. 选择一个真实岗位执行收藏切换、投递、进度更新、辅导申请
5. 手动新增一个岗位
6. 拉取我的求职列表和元数据，确认投递后记录可见
7. 拉取模拟应聘总览和元数据，并提交一次 practice request 与 class request
8. 拉取课程记录列表和元数据，并对一个可评价记录提交评价
9. 拉取个人资料并用当前值做一次更新

脚本输出按步骤打印 `PASS/FAIL`，失败立即退出。

## Data Strategy

脚本优先从接口响应中选择现有记录：

- 岗位流转优先使用 `applied=false` 的岗位创建一条投递记录
- 课程评价优先使用 `actionKind=rate` 的记录
- 个人资料更新默认使用当前值，避免引入不可逆测试数据

需要写入共享测试环境的接口仅采用最小 payload，并尽量使用可识别的 smoke 备注文本。

## Verification

实现阶段采用脚本级 TDD：

1. 先写 `student-api-smoke-selftest`，验证脚本参数、输出和基础 happy path
2. 再实现主脚本
3. 执行：
   - `bash bin/student-api-smoke-selftest.sh`
   - `bash bin/student-api-smoke.sh`
4. 最后用 Playwright 在本地学生端逐页点一遍主流程，对照前端实际请求

## Frontend Call Classification

最终结论按以下口径输出：

- 首屏一定调用：页面加载时立即请求的接口
- 主流程会调用：用户完成本次已落地页面的一条核心提交路径后触发的接口
- 当前前端主流程不会调用：脚本覆盖到了，但页面默认加载和主提交路径都不会自动触发的接口
