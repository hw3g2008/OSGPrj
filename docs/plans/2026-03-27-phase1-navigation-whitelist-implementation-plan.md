# OSG 第一期导航白名单实施计划

> Goal: 按 `docs/plans/2026-03-27-phase1-navigation-whitelist-design.md` 的设计，收口 5 端第一期菜单显示范围，隐藏首页入口并改默认首屏，不改登录、不删路由。
>
> Design Doc: `docs/plans/2026-03-27-phase1-navigation-whitelist-design.md`
>
> Strategy: 每端建立 `phase1` 白名单真相文件 -> 过滤 `MainLayout` 侧边栏 -> 修改根路由默认重定向 -> 按端逐个实现与逐个验证 -> 每个端测试后关闭网页进程/浏览器会话 -> 再用 MCP 做真实页面端到端验证 -> 不改手动 URL 行为。
>
> DoD: 5 个端侧边栏均只展示第一期保留页面；首页不再作为默认首屏和菜单入口；登录与忘记密码不受影响；手动输入隐藏 URL 仍保持当前行为。

## 0. 执行原则

1. 只改前端导航层，不碰后端权限、不删页面。
2. 所有隐藏规则都来自单端白名单文件，不允许散落在模板里硬编码。
3. 默认首屏调整与侧边栏隐藏必须一起做，否则首页仍会暴露。
4. 不扩范围处理所有页面内 CTA，只处理正常主导航链路。
5. 按端逐个落地：一个端完成后必须立刻测试，不允许攒多个端后统一验证。
6. 每个端测试后都要关闭当前网页进程或浏览器会话，再启动 MCP 真实页面端到端验证。

## 1. 文件落点

新增：

- `osg-frontend/packages/student/src/navigation/phase1.ts`
- `osg-frontend/packages/mentor/src/navigation/phase1.ts`
- `osg-frontend/packages/lead-mentor/src/navigation/phase1.ts`
- `osg-frontend/packages/assistant/src/navigation/phase1.ts`
- `osg-frontend/packages/admin/src/navigation/phase1.ts`

修改：

- `osg-frontend/packages/student/src/layouts/MainLayout.vue`
- `osg-frontend/packages/mentor/src/layouts/MainLayout.vue`
- `osg-frontend/packages/lead-mentor/src/layouts/MainLayout.vue`
- `osg-frontend/packages/assistant/src/layouts/MainLayout.vue`
- `osg-frontend/packages/admin/src/layouts/MainLayout.vue`
- `osg-frontend/packages/student/src/router/index.ts`
- `osg-frontend/packages/mentor/src/router/index.ts`
- `osg-frontend/packages/lead-mentor/src/router/index.ts`
- `osg-frontend/packages/assistant/src/router/index.ts`
- `osg-frontend/packages/admin/src/router/index.ts`

测试：

- 现有各端导航/权限相关前端测试
- 必要时新增各端最小导航白名单测试

## 2. Task 1: 建立 5 端白名单真相文件

每个 `phase1.ts` 至少导出：

- `PHASE1_VISIBLE_PATHS`
- `PHASE1_DEFAULT_PATH`

说明：

- 若页面有路由别名，别名与主路径都要写入
- 登录、忘记密码不在白名单文件中处理，因为本次不纳入隐藏范围

## 3. Task 2: 改 5 端侧边栏渲染

实现方式：

- 保留原 `menuGroups` / `navigationGroups` 定义
- 新增过滤层 `filteredMenuGroups`
- 模板只渲染过滤后的菜单
- 首页入口从定义中移除，或在过滤层中被排除

特殊点：

- admin 用户菜单保留 `个人设置`
- 其他端用户菜单如仅包含 `个人设置/退出登录`，保留已落地项即可

## 4. Task 3: 改默认首屏重定向

修改 5 端 `router/index.ts`：

- student: `/ -> /positions`
- mentor: `/ -> /courses`
- lead-mentor: `/ -> /career/positions`
- assistant: `/ -> /career/positions`
- admin: `/ -> /permission/roles`

注意：

- 不删除 `/dashboard` / `/home`
- 不新增 redirect guard 去拦手动输入

## 5. Task 4: 覆盖首页显式入口

仅处理与正常导航强耦合的首页入口：

- 侧边栏首页按钮
- `handleHomeNavigation` 之类显式首页跳转入口
- 与默认首屏耦合的首页 redirect

不处理：

- 手动输入 `/dashboard`、`/home`
- 首页页面内部所有深层卡片 CTA

## 6. Task 5: 测试

### 静态测试

每个端至少断言：

- 白名单外文案不再出现在侧边栏模板输出中
- 首页入口不再出现在导航中
- 根路由 redirect 已改到一期首屏

### 最小运行时验证

对 5 个端各做一次：

1. 登录成功
2. 验证首屏路径
3. 验证侧边栏只包含白名单项

### 按端实施节奏

建议执行顺序：

1. student
2. mentor
3. lead-mentor
4. assistant
5. admin

每个端统一执行以下步骤：

1. 修改该端 `phase1.ts`
2. 修改该端 `MainLayout.vue`
3. 修改该端 `router/index.ts`
4. 跑该端静态测试
5. 跑该端最小运行时验证
6. 关闭该端当前网页进程/浏览器会话
7. 用 MCP 打开真实页面做端到端验证
8. 通过后再进入下一个端

## 7. 提交策略

建议按一个主题提交：

- `feat: hide non-phase1 navigation entries`

如果改动面过大，可拆成：

1. `feat: add phase1 navigation allowlists`
2. `feat: hide non-phase1 sidebar entries`
3. `test: cover phase1 navigation redirects`

## 8. 风险与回滚

风险：

- 某端可能因路径别名遗漏导致菜单激活态异常
- 首页移除后，少量页面可能缺少“返回首页”路径习惯

回滚方式：

- 恢复各端 `phase1.ts`
- 恢复 5 个 `router/index.ts` redirect
- 恢复 `MainLayout.vue` 使用原始菜单定义直接渲染
