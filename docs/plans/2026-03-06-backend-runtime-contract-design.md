# Backend Runtime Contract Design

> 日期：2026-03-06
> 范围：本地开发态 Spring Boot + Vue 运行时统一契约
> 目标模块：当前先服务 OSG，设计保持对后续同类项目可复用

---

## 1. 问题定义

当前登录页分成两层状态：

- **登录页视觉层**：已基本收口，不再是当前主问题
  - `login-page` 在 `ui-visual-gate` 中已经 `PASS`
  - 登录页的 `style_contracts` 已落入 `UI-VISUAL-CONTRACT.yaml`
- **登录/忘记密码功能链**：还没有收口
  - 真实 E2E 失败根因是前端代理访问 `127.0.0.1:28080`，但后端没有稳定监听该端口
  - 这说明当前问题主要是**运行时契约缺失**，不是登录页视觉框架继续出错

### 1.1 已确认的根因

现状存在三套不一致口径：

1. `bin/run-backend-dev.sh` 默认按 `SERVER_PORT=${SERVER_PORT:-8080}` 启动后端
2. `osg-frontend/packages/admin/vite.config.ts` 默认代理到 `http://127.0.0.1:28080`
3. `final-gate / final-closure / e2e-api-gate / ui-visual-baseline` 又优先按 `28080` 探测

结果是：

- 人可能“已经正确启动了后端”，但 E2E 和 gate 仍然会打错端口
- 功能链失败会被误读成“登录没实现完”或“UI 还有框架问题”
- 真实问题其实是：**没有一个被框架强制执行的单一开发态运行契约**

### 1.2 新增确认的更深层根因：后端运行的未必是当前源码

在 2026-03-06 晚间追加回源时，又确认了一个更隐蔽但更关键的问题：

1. 当前 `bin/run-backend-dev.sh` 使用的是：
   - `mvn -f ruoyi-admin/pom.xml spring-boot:run`
2. 这种“只从 `ruoyi-admin` 子模块启动”的方式，会让 `ruoyi-framework / ruoyi-system / ruoyi-common` 优先从 `~/.m2/repository` 已安装 jar 解析
3. 结果就是：
   - `ruoyi-admin` 本身可能是工作区最新源码
   - 但共享模块却可能还是旧 jar
   - 从而出现“集成测试对当前源码是 PASS，但本地运行态仍表现出旧逻辑”的分裂

这类问题比端口漂移更危险，因为它会直接制造：

- 源码看起来已经修好
- 单元/集成测试也对
- 但真实页面与 E2E 仍然表现为旧行为

因此，开发态运行契约除了“唯一端口、唯一 health、唯一 proxy”之外，还必须新增一条更硬的要求：

- **开发态后端必须使用 reactor 最新源码启动，禁止隔离子模块 + `~/.m2` 旧共享包启动**

### 1.3 为什么这必须进框架

这类问题不能继续靠记忆解决：

- 直接跑 `playwright test`
- 直接跑 `ui-visual-gate`
- 直接跑 `final-gate`
- 手动 `mvn spring-boot:run`

这些入口只要不共享同一份运行时契约，就会反复出现“页面看着对，功能链测不通”的假问题。

---

## 2. 设计目标

### 2.1 必须达到

1. 开发态后端启动入口唯一
2. 开发态健康检查地址唯一
3. 前端代理目标唯一
4. 开发态后端必须运行当前工作区最新共享模块源码，而不是 `~/.m2` 历史 jar
5. E2E / visual gate / final gate 不再各自猜端口
6. 本地开发固定为：
   - 本地仅启动 backend
   - MySQL / Redis 使用远端共享依赖
7. 设计对后续同类项目可复用，不把 OSG 业务细节硬编码进通用逻辑

### 2.2 明确不做

1. 不在本轮解决 Docker test/prod 全部拓扑问题
2. 不把这套扩展到非 Spring Boot + Vue 项目
3. 不在本轮直接修改业务页面逻辑

---

## 3. 方案对比

### 方案 A：只写 OSG 项目专用 workflow

做法：

- 只在仓库里补一个 `run-backend-dev` 项目 workflow
- 继续把 `28080`、健康地址、env 文件等写在 OSG 脚本里

优点：

- 落地快

缺点：

- 下一项目几乎不能复用
- 仍然容易把“项目事实”和“通用规则”混在一起

结论：

- 不推荐作为最终形态

### 方案 B：通用骨架 + 项目适配层

做法：

- 通用层定义“Spring Boot 开发态运行契约”
- 项目层只提供当前项目的运行时配置
- 所有 gate / E2E / visual 都只读取项目契约，不再直接猜端口

优点：

- 当前项目可稳定
- 下一个 Spring Boot + Vue 项目只要替换契约值即可复用
- 业务无关，通用性最强

缺点：

- 需要补一层契约文件和解析逻辑

结论：

- **推荐**

### 方案 C：继续保留多端口自动探测

做法：

- 维持 `28080 -> 8080` 多端口探测
- 不强制统一启动命令

优点：

- 表面灵活

缺点：

- 会继续掩盖错误启动方式
- 仍然无法保证 “开发 / E2E / gate” 口径一致

结论：

- 只能保留为迁移期兜底，不应作为主策略

---

## 4. 选型结论

采用 **方案 B：通用骨架 + 项目适配层**。

### 4.1 通用骨架（面向 Spring Boot + Vue）

抽象出以下字段：

- `run_command`
- `classpath_mode`
- `env_file`
- `base_url`
- `health_url`
- `proxy_target`
- `port`
- `profile`
- `preflight_checks`

这些字段不包含任何 OSG 业务语义，只描述运行时事实。

### 4.2 项目适配层（OSG 当前项目）

OSG 当前开发态唯一口径固定为：

- 启动命令：`bash bin/run-backend-dev.sh deploy/.env.dev`
- backend base url：`http://127.0.0.1:28080`
- health url：`http://127.0.0.1:28080/actuator/health`
- 前端代理目标：`http://127.0.0.1:28080`
- 依赖：
  - MySQL：远端共享库
  - Redis：远端共享 Redis
- 不启本地 Docker MySQL/Redis

这里的 `28080` 是 **当前项目契约值**，不是通用框架常量。

同时补一条源码一致性约束：

- `run_command` 的真实实现必须先从仓库根 reactor 构建 `ruoyi-admin` 及其共享模块
- 再运行当前工作区刚构建出的 `ruoyi-admin/target/ruoyi-admin.jar`
- 不允许继续使用 `mvn -f ruoyi-admin/pom.xml spring-boot:run`

这样运行态一定来自当前工作区刚构建出的产物，而不是吃 `~/.m2` 历史包。

---

## 5. 架构设计

## 5.1 新增项目运行契约文件

建议新增：

- `deploy/runtime-contract.dev.yaml`

职责：

- 声明当前项目开发态运行事实
- 让脚本、workflow、gate、E2E 统一读取

建议字段：

```yaml
mode: local-backend-remote-deps
stack: springboot-vue
classpath_mode: workspace-reactor
env_file: deploy/.env.dev
run_command: bash bin/run-backend-dev.sh deploy/.env.dev
port: 28080
base_url: http://127.0.0.1:28080
health_url: http://127.0.0.1:28080/actuator/health
proxy_target: http://127.0.0.1:28080
deps:
  mysql: remote
  redis: remote
providers:
  smtp:
    provider_class: smtp
    truth_mode: real
    config_env:
      host: SPRING_MAIL_HOST
      port: SPRING_MAIL_PORT
      username: SPRING_MAIL_USERNAME
      password: SPRING_MAIL_PASSWORD
      from: SPRING_MAIL_FROM
evidence_sinks:
  mailbox:
    sink_type: mailbox
    provider: smtp
evidence_paths:
  mailbox:
    mailbox_target_env: PASSWORD_RESET_MAILBOX
    provider_log_path_env: PASSWORD_RESET_PROVIDER_LOG_PATH
```

## 5.2 后端启动脚本改为读取契约，而不是自带另一套默认值

`bin/run-backend-dev.sh` 的角色应变成：

1. 读取 `deploy/.env.dev`
2. 校验远端 DB/Redis 参数齐全
3. 统一按契约端口启动（当前项目是 `28080`）
4. 先从仓库根 reactor 构建，再运行最新 jar，确保共享模块走最新源码
5. 输出启动摘要
6. 支持 `--check-only` / `--print-runtime` 这类无副作用模式，便于 gate 和测试先验证配置

这一步的关键是：

- **禁止脚本继续默默回退到 8080**
- **禁止脚本继续用隔离子模块方式启动，造成 `~/.m2` 旧包污染运行态**

## 5.3 Gate / E2E / Visual 统一读契约

以下入口都不该再各自猜端口：

- `bin/e2e-api-gate.sh`
- `bin/ui-visual-baseline.sh`
- `bin/ui-visual-gate.sh`
- `bin/final-gate.sh`
- `bin/final-closure.sh`
- `osg-frontend/packages/admin/vite.config.ts`

它们应统一遵循：

1. 若显式传入 `BASE_URL / E2E_API_PROXY_TARGET`，用显式值
2. 否则读取 `deploy/runtime-contract.dev.yaml`
3. 默认不允许兜底探测；只有显式设置 `RUNTIME_CONTRACT_ALLOW_FALLBACK=1` 时才允许历史兜底，并输出 `WARN: using deprecated fallback`

这条必须采用 **fail-closed** 策略。否则下一模块仍会重复出现“人以为起对了，框架其实打错目标”的假问题。

## 5.4 Project workflow 固化唯一入口

建议项目侧补一个 workflow：

- `.windsurf/workflows/run-backend-dev.md`

职责：

- 只做一件事：按项目运行契约启动本地开发后端并验证健康检查
- 明确告诉使用者：
  - 本地不启 Docker MySQL/Redis
  - 先启动 backend，再跑 E2E / visual / final gate

并要求：
- 任何依赖 backend 的 workflow 都必须先调用这一入口或其等价统一包装
- 禁止在 workflow 中直接推荐裸 `mvn spring-boot:run`

## 5.5 登录页状态在框架中的准确定义

需要在文档和 gate 语义里明确：

- `login-page visual PASS` 不等于 `login flow PASS`
- 登录页现在**视觉已收口**
- 登录/忘记密码流程当前**功能未收口**
- 这不是登录页视觉契约继续有问题，而是 runtime orchestration 缺失

这条定义必须进入审计文档与后续运行时设计文档，避免再误判。

---

## 6. 通用性约束

为了保证下一个项目可复用，这套设计必须遵守：

1. 通用骨架只允许描述运行时，不允许描述业务模块
2. 不允许把 `permission/login/dashboard` 写进通用解析逻辑
3. 端口 `28080` 只存在于 OSG 项目契约，不存在于通用骨架默认值
4. `stack=springboot-vue` 是当前复用边界，超出边界另开设计

---

## 7. 验证标准

设计落地后，必须满足：

1. 只执行一次：

```bash
bash bin/run-backend-dev.sh deploy/.env.dev
```

后端就必须稳定监听：

```bash
curl -fsS http://127.0.0.1:28080/actuator/health
```

2. 不额外传环境变量时，以下入口都必须复用同一口径：

- `pnpm exec playwright test`
- `bash bin/ui-visual-gate.sh permission`
- `bash bin/final-gate.sh permission`
- `bash bin/final-closure.sh permission`

3. 若后端未启动，错误提示必须明确指向唯一正确命令，而不是继续多端口猜测后沉默失败

4. 任何入口若发现运行契约缺失、端口不一致、health 不一致，必须直接 FAIL，不允许自动吞掉并改用另一端口继续执行

5. 任何入口若检测到当前后端不是按 reactor 最新源码启动，也必须 FAIL，不能把“旧 jar 运行态”当成有效开发环境

---

## 8. 对当前问题的最终判断

### 8.1 现在登录页是否还没收口

结论：

- **登录页视觉：已收口**
- **登录/忘记密码功能链：未收口**

### 8.2 这是不是框架还有问题

结论：

- **是，但不是登录页视觉框架的问题**
- 当前剩余框架问题是：
  - 运行时统一契约缺失
  - 启动入口不唯一
  - 后端启动方式未锁定到 reactor 最新源码
  - gate / E2E / 前端代理没有共享同一份运行时事实

也就是说，下一步该修的是**开发态运行时框架**，而不是继续怀疑登录页视觉收口本身。

---

## 10. 质量门槛（严格模式）

为了保证“下一个模块能直接落地”，本设计采用严格模式：

1. 唯一启动入口
2. 唯一端口口径
3. 唯一代理目标
4. 唯一失败语义：契约错 = 直接 FAIL
5. 唯一运行前检查：所有依赖 backend 的 workflow/gate 都必须先经过 runtime preflight

---

## 9. 推荐下一步

1. 基于本设计写实现计划
2. 先落运行契约与统一启动入口
3. 再重跑：
   - 登录 E2E
   - 忘记密码 E2E
   - `ui-visual-gate`
   - `final-gate`
4. 最后再收 `dashboard / roles / admins / base-data`
