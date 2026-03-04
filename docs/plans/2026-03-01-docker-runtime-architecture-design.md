# Docker Runtime 同构架构设计（Test/Prod）

Date: 2026-03-01  
Status: Implemented & Verified (Closed on 2026-03-03)  
Owner: workflow-framework
Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`

## 0. 执行状态快照（2026-03-03）

1. 已落地：
   - `deploy/compose.base.yml` / `deploy/compose.test.yml` / `deploy/compose.prod.yml`
   - `bin/docker-env-*.sh` 与 `deploy-preflight` 脚本
   - `final-gate/final-closure` 与 Docker 相关入口打通
2. 严格模式闭环已完成：
   - `--backend-policy docker_only` 下，若检测到 Docker backend 已健康则复用 Docker；若未就绪则强制走 Docker 启动链。
   - 不再出现“docker_only 却落到 external backend”的语义偏差。
3. 最新闭环证据：
   - `osg-spec-docs/tasks/audit/final-closure-permission-2026-03-03.md`（`backend_policy=docker_only`、`backend_mode=docker`、结论 `PASS`）
   - `osg-spec-docs/tasks/audit/final-gate-permission-2026-03-03.log`

## 0.1 与上位标准关系（2026-03-03）

1. 本文档遵循 `docs/plans/FOUR-PACK-STANDARD.md` 的四件套治理与执行门禁要求。
2. 本文档聚焦运行环境同构与 Docker 编排，不改写视觉验收统一口径（视觉规则由 `FOUR-PACK-STANDARD.md` 第 7 节定义）。
3. 如本文档与上位标准冲突，以上位标准为准，并先更新上位标准再更新本文档。

## 1. 背景

当前仓库仅有前端 `osg-frontend/docker-compose.yml`，缺少可启动后端（8080）与依赖（MySQL/Redis）的统一编排。

这导致收尾自动化存在硬阻塞：

1. `final-closure --backend-policy docker_only` 无法稳定闭环。
2. test/prod 缺少同构基线，流程易漂移。

已确认目标：

- test/prod 架构一致（同构）
- 全量服务一次建模（后端 + 全角色前端）
- 日常默认最小启动，按 profile 扩展
- Playwright 保持宿主机运行
- 数据持久化保留

## 2. 设计目标

1. 建立可复用、可自动化、可审计的 Docker 运行架构。
2. test/prod 只允许配置差异，不允许服务拓扑差异。
3. 与 `final-closure` 无缝集成，支持 `docker_only` 严格模式。
4. 明确镜像构建、容器配置覆盖、健康检查契约，消除隐式假设。

## 3. 非目标

1. 不在本阶段将 Playwright 容器化（继续宿主机执行）。
2. 不在本阶段引入 Kubernetes。
3. 不在本阶段做大规模应用重构（仅做容器运行必需改造）。

## 3.1 显式前置假设（无隐式依赖）

1. Docker Engine `>= 24.x`，Docker Compose Plugin（v2）`>= 2.20`。
2. 宿主机可用端口：test 默认 `28080`（backend）、`23306`（mysql）、`26379`（redis）、`3001-3005`（各前端端口，按 profile 可选）；若覆盖端口，必须同步更新健康检查变量。
3. 宿主机可用磁盘空间 `>= 20GB`（镜像 + 数据卷 + 构建缓存）。
4. 允许容器访问 Maven/NPM 镜像源（首次构建需要）。
5. 使用 JDK 21 构建后端镜像（与项目运行时对齐）。
6. CI 与本地执行环境需具备 Node.js 20.x + pnpm 9.x（用于前端构建、Playwright 与门禁脚本）。
7. `sql/` 目录 7 个初始化 SQL 文件完整可读。

## 4. 业界通用方案选择

### 4.1 备选方案

方案 A：`compose.test.yml` 与 `compose.prod.yml` 两套完整文件
- 优点：直观
- 缺点：重复高，长期易漂移

方案 B：`base + override + profiles`（推荐）
- `compose.base.yml`：全量服务公共定义
- `compose.test.yml` / `compose.prod.yml`：环境差异覆盖
- `profiles`：控制默认启动集合

方案 C：直接 Kubernetes
- 优点：扩展性高
- 缺点：当前复杂度过高

### 4.2 结论

采用方案 B，符合 Docker Compose 官方多文件与 profiles 机制，也符合业界常见“同构+覆盖”实践。

## 5. 目标架构与运行契约

### 5.1 服务拓扑（test/prod 同构，全部定义）

- `mysql`
- `redis`
- `backend`（ruoyi-admin）
- `admin`
- `student`
- `mentor`
- `lead-mentor`
- `assistant`

说明：
- 所有服务在 `compose.base.yml` 一次定义完成。
- test/prod 不允许增删服务，仅允许覆盖配置。

### 5.1.1 服务端口映射表（8 服务固定口径）

| 服务 | 容器端口 | 宿主机端口（test 默认） | 宿主机端口（prod 默认） |
| --- | --- | --- | --- |
| mysql | 3306 | 23306 | 不暴露 |
| redis | 6379 | 26379 | 不暴露 |
| backend | 8080 | 28080 | 38080 |
| admin | 3005 | 3005 | 13005 |
| student | 3001 | 3001 | 13001 |
| mentor | 3002 | 3002 | 13002 |
| lead-mentor | 3003 | 3003 | 13003 |
| assistant | 3004 | 3004 | 13004 |

说明：
- 若通过 `.env` 覆盖宿主机端口，必须同步更新健康检查、前端路由与 preflight 校验目标端口。
- prod 可按最小暴露原则收敛外部端口，但容器内服务端口保持不变。

### 5.2 启动策略（profiles）

- `deps`：`mysql + redis`
- `core`：`mysql + redis + backend`
- `frontends`：`admin + student + mentor + lead-mentor + assistant`
- 开发者手工默认启动：`deps`
- 自动化命令（`commands.ops.docker_run`）默认启动：`core`
- 需要全量时：`core + frontends`

### 5.2.1 网络模式决策

- 统一使用 user-defined bridge 网络（如 `osg-net`）。
- 禁止 `network_mode: host`（避免端口冲突与环境耦合）。
- 服务间通信统一走服务名（`mysql`、`redis`、`backend`）。

### 5.2.2 deps-only 模式（开发默认）

- 目标：给开发者提供“只拉基础依赖”的最快启动路径。
- 定义：`deps = mysql + redis`，不启动 backend 和前端容器。
- 用途：本地后端/前端进程调试时复用容器化数据库与缓存。
- 约束：`final-closure` 不得使用 `deps`，必须使用 `core` 及以上。

### 5.3 后端镜像构建策略（必须显式化）

必须新增后端镜像构建定义，避免“backend 服务不可构建”：

- 新增：`deploy/backend/Dockerfile`
- 推荐：多阶段构建
  1. build stage：`mvn -pl ruoyi-admin -am -DskipTests package`
  2. runtime stage：仅复制 `ruoyi-admin.jar` 及运行时依赖

禁止依赖“外部预构建镜像但无版本策略”的隐式方式。

当前实现补充约束（过渡期）：

- 若后端 Dockerfile 仍采用“复制本地 `ruoyi-admin/target/ruoyi-admin.jar`”模式，则执行 `docker-env-build/up` 前必须先运行：
  - `mvn -pl ruoyi-admin -am -DskipTests package`
- preflight 可将 `ruoyi-admin/target/ruoyi-admin.jar` 作为显式前置条件校验，避免运行期才失败。

### 5.3.1 前端 prod 镜像构建策略（必须显式化）

为避免 prod 继续跑 dev server，新增前端生产镜像策略：

- 新增：`deploy/frontend/Dockerfile.prod`
- 构建方式：多阶段（Node build -> Nginx runtime）
- 服务方式：Nginx 静态托管构建产物
- 约束：prod 前端服务禁止源码挂载、禁止 `pnpm dev` 命令

### 5.3.1.1 前端 test 容器策略（决策）

决策：test 前端走 Docker 容器（与整体自动化链路保持一致）。

实现约束：

1. 新增 `deploy/frontend/Dockerfile.test` 作为 test 专用开发镜像。
2. `Dockerfile.test` 必须覆盖 5 个角色包依赖（包含 `packages/admin/package.json`）。
3. `Dockerfile.test` 必须暴露 `3001-3005`。
4. `deploy/` 体系不得直接依赖 `osg-frontend/Dockerfile.dev`（该文件保留给旧前端独立场景）。

### 5.3.2 前端到后端路由机制（按环境固化，避免漂移）

需要明确 test/prod 各自的 API 路由方案，并写成可执行约束，避免上线时路由漂移。

决策：

- test：允许 `VITE_API_BASE_URL` 编译时注入（便于快速联调）
- prod：强制 Nginx `/api` 反向代理到 `backend:8080`

prod 反代实现契约（必须）：

1. 必须对 `/api` 做前缀剥离后再转发给后端（后端接口不是 `/api/**`）。
2. Nginx `location` 必须使用 `/api/`，`proxy_pass` 必须以 `/` 结尾（如 `proxy_pass http://backend:8080/;`）。
3. 禁止使用不带尾 `/` 的 `proxy_pass http://backend:8080;`（会保留 `/api` 前缀导致 404）。
4. 验收时必须验证至少一个真实接口经过 `/api` 访问成功（如 `/api/system/role/list`）。

理由：

- prod 使用反代可减少“仅换后端地址就需重构前端镜像”的运维成本
- 与同构部署下的服务发现（`backend`）天然一致

### 5.4 容器配置覆盖契约（必须显式化）

当前应用默认使用 `localhost` 连接 MySQL/Redis，不适用于容器网络。

需要新增容器运行配置层（两种二选一，推荐第 1 种）：

1. 新增 `application-docker.yml`（推荐）
2. 通过环境变量完整覆盖 `spring.datasource.*` 与 `spring.data.redis.*`

约束：
- MySQL 主机必须为服务名 `mysql`
- Redis 主机必须为服务名 `redis`
- 不允许容器内继续使用 `localhost` 访问外部依赖
- `ruoyi.profile` 必须覆盖为 Linux 容器路径（如 `/data/ruoyi/uploadPath`），禁止保留 `D:/ruoyi/uploadPath`

### 5.4.1 MySQL 字符集/时区与 Druid 同步（必须）

- JDBC URL 显式包含：`characterEncoding=utf8mb4`、`serverTimezone=GMT%2B8`
- MySQL 容器参数显式设置：`--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci`
- test/prod 保持同一字符集与时区策略

### 5.4.2 MySQL/Druid 密码同步机制（必须）

连接密码必须“单一真源（按环境）”，禁止双源：

- test：真源为 `.env.test` 中 `MYSQL_APP_PASSWORD`
- prod：真源为 `deploy/secrets/mysql_app_password`
- backend 启动时统一按优先级解析：`MYSQL_APP_PASSWORD_FILE` > `MYSQL_APP_PASSWORD`
- Compose 同时只允许一种注入方式（变量或 `_FILE`），禁止并存
- MySQL 初始化用户密码与 backend（Druid）连接密码必须来自同一解析结果

### 5.4.3 Redis/JWT 密钥注入机制（必须）

- test：
  - Redis 密码来自 `.env.test` 中 `REDIS_PASSWORD`
  - JWT secret 来自 `.env.test` 中 `JWT_SECRET`
- prod：
  - Redis 密码真源：`deploy/secrets/redis_password`
  - JWT secret 真源：`deploy/secrets/jwt_secret`
- backend 启动脚本负责把 `_FILE` 变量转换为 Spring 可识别环境变量（如 `SPRING_DATA_REDIS_PASSWORD`、`TOKEN_SECRET`）
- 禁止在 prod 同时使用 `.env.prod` 明文密码与 secrets 文件

### 5.5 健康检查契约（统一）

统一健康检查入口为 `GET /actuator/health`（业界标准），并与自动化脚本对齐。

需要在 Phase 1 明确落地：

1. `ruoyi-admin/pom.xml` 新增 `spring-boot-starter-actuator` 依赖。
2. 后端必须提供 `/actuator/health`（返回 200）。
3. `/actuator/health` 必须匿名可访问（不依赖登录态）。
4. 暴露策略最小化：仅开放 `health`（可选 `info`）。
5. 健康响应必须轻量，不依赖业务 SQL 长事务。
6. `bin/final-closure.sh` 与 `bin/final-gate.sh`、`bin/api-smoke.sh` 必须复用同一后端地址源（禁止多默认值分叉）。
7. 后端地址单一来源契约：
   - `BASE_URL`（例如 `http://127.0.0.1:28080`）
   - `HEALTH_PATH`（默认 `/actuator/health`）
   - `BASE_HEALTH_URL = ${BASE_URL}${HEALTH_PATH}`
   - 未显式传入 `BASE_HEALTH_URL` 时，脚本可按顺序探测 `28080 -> 8080`，并将命中的地址回传给后续步骤复用。
8. `.claude/project/config.yaml` 的 `commands.ops.health` 更新为基于 `BASE_HEALTH_URL` 的统一命令，不再写死 `8080`。
9. `ruoyi-framework/src/main/java/com/ruoyi/framework/config/SecurityConfig.java` 必须允许 `/actuator/health` 匿名访问（`permitAll`）。

### 5.5.1 Spring Profiles 激活方式（druid + docker）

必须显式定义多 profile 组合，避免容器内漏配：

- 推荐：`SPRING_PROFILES_ACTIVE=druid,docker`
- `docker` profile 负责：
  - 容器路径（`ruoyi.profile`）
  - mysql/redis 主机与端口
  - 生产/测试差异覆盖（通过 `.env.test/.env.prod` 注入）

### 5.5.2 构建失败与启动失败分流策略

- 构建失败（Build Fail）：归类为 `DEPLOY_BUILD_FAIL`
  - 典型：镜像构建错误、依赖下载失败、Dockerfile 语法错误
  - 处理：中止部署，不执行 `up`
- 启动失败（Startup Fail）：归类为 `DEPLOY_START_FAIL`
  - 典型：端口冲突、健康检查超时、配置注入错误
  - 处理：抓取容器日志并执行故障定位

### 5.5.3 验证码基线守卫（防静默漂移）

1. `final-gate` 增加可配置验证码基线校验：
   - 通过 `/captchaImage` 读取 `captchaEnabled` 当前值；
   - `CAPTCHA_EXPECTED` 为空时仅记录当前值；
   - `CAPTCHA_EXPECTED=true|false` 时执行强校验，不一致直接 FAIL。
2. 验收报告必须落一条验证码状态证据（值 + 比对结论），最少包含：
   - `captcha_expected`（`true|false|none`）
   - `captcha_evidence`（从 `final-gate` 日志提取的单行证据）
3. 该守卫用于防止“流程中被动改动配置但无人感知”。

### 5.6 前端容器运行契约（test/prod 同拓扑）

所有前端角色服务在 base 中定义，但 test/prod 仅允许运行方式差异：

- test：允许开发型镜像/命令（便于快速验证）
- prod：使用构建产物镜像（禁止开发服务器模式）

约束：

- 禁止 test/prod 服务清单分叉
- 禁止 prod 使用宿主机源码挂载开发模式运行

### 5.7 持久化与初始化策略

- MySQL、Redis 使用命名卷持久化。
- test/prod 卷名隔离（如 `osg_mysql_test` / `osg_mysql_prod`）。
- 首次初始化通过 `docker-entrypoint-initdb.d` 挂载 SQL（一次性初始化脚本）。
- 持久化模式下，不自动重置数据库。
- Redis 在 test/prod 均启用密码，但来源不同：
  - test：来自 `.env.test`（允许弱口令用于本地）
  - prod：来自 secrets（强口令，禁止入库）

### 5.8 SQL 初始化清单（顺序 / 范围 / 幂等）

#### 5.8.1 初始化文件范围（固定 7 个）

1. `sql/ry_20250522.sql`
2. `sql/quartz.sql`
3. `sql/osg_menu_init.sql`
4. `sql/osg_role_init.sql`
5. `sql/osg_role_menu_init.sql`
6. `sql/osg_user_init.sql`
7. `sql/osg_alter_user_first_login.sql`

#### 5.8.2 启动顺序（必须）

按前缀重命名后挂载到 `docker-entrypoint-initdb.d`：

- `00_ry_20250522.sql`
- `01_quartz.sql`
- `02_osg_menu_init.sql`
- `03_osg_role_init.sql`
- `04_osg_role_menu_init.sql`
- `05_osg_user_init.sql`
- `06_osg_alter_user_first_login.sql`

说明：
- `ry_20250522.sql` 为基线业务库结构与基础数据。
- `quartz.sql` 明确包含 `DROP TABLE`，仅允许在“首次建库”阶段执行。
- `osg_*_init.sql` 多数为清理+插入脚本，默认视为一次性引导脚本。
- `osg_alter_user_first_login.sql` 已具备幂等逻辑，可重复执行。

#### 5.8.3 幂等与持久化规则（强约束）

1. `docker-entrypoint-initdb.d` 仅在 MySQL 数据目录为空时自动执行。
2. 持久化卷存在时，不自动重跑初始化脚本。
3. 需要重建环境时，必须显式执行 `docker volume rm ...` 后再 `up`。
4. 后续增量变更不放入 init 脚本，改走迁移脚本目录（`sql/migrations/`）。

#### 5.8.4 数据库名与密码策略（决策）

- 数据库名统一：`ry-vue`
- test 默认密码可由 `.env.test` 管理（不写死在 compose）
- prod 密码必须通过外部注入（不提交 Git）

#### 5.8.5 落地方式（必须可执行）

1. 通过 `bin/prepare-mysql-init.sh` 从 `sql/` 目录生成 `deploy/mysql-init/00-06_*.sql`（固定命名）。
2. `compose.base.yml` 仅挂载 `deploy/mysql-init/` 到 `/docker-entrypoint-initdb.d:ro`。
3. 禁止直接把原始 `sql/*.sql` 整目录挂载到 `docker-entrypoint-initdb.d`（顺序不可控）。
4. 当 `sql/` 基线文件变更时，必须重新执行 `bin/prepare-mysql-init.sh` 并提交差异。
5. preflight 必须校验 `deploy/mysql-init/00-06_*.sql` 共 7 个文件全部存在且非空（空文件直接 FAIL）。
6. `bin/prepare-mysql-init.sh` 必须生成 `deploy/mysql-init/manifest.sha256`（记录 `00-06_*.sql` 的 sha256）。
7. preflight 必须校验 `manifest.sha256` 与实际 `deploy/mysql-init/00-06_*.sql` 完全一致（任一哈希不一致即 FAIL）。

## 6. 文件与目录设计

新增目录与文件：

- `deploy/compose.base.yml`
- `deploy/compose.test.yml`
- `deploy/compose.prod.yml`
- `deploy/.env.test.example`
- `deploy/.env.prod.example`
- `deploy/ENV-REQUIREMENTS.md`
- `deploy/requirements-test.txt`（必需，preflight 必填键校验清单）
- `deploy/requirements-prod.txt`（必需，preflight 必填键校验清单）
- `deploy/backend/Dockerfile`
- `deploy/backend/docker-entrypoint.sh`
- `deploy/frontend/Dockerfile.test`
- `deploy/frontend/Dockerfile.prod`
- `deploy/frontend/nginx.conf`
- `deploy/mysql-init/00_ry_20250522.sql`
- `deploy/mysql-init/01_quartz.sql`
- `deploy/mysql-init/02_osg_menu_init.sql`
- `deploy/mysql-init/03_osg_role_init.sql`
- `deploy/mysql-init/04_osg_role_menu_init.sql`
- `deploy/mysql-init/05_osg_user_init.sql`
- `deploy/mysql-init/06_osg_alter_user_first_login.sql`
- `deploy/mysql-init/manifest.sha256`
- `deploy/secrets/README.md`（说明 secret 文件格式，不存真实值）

新增脚本：

- `bin/deploy-preflight.sh`
- `bin/prepare-mysql-init.sh`
- `bin/docker-env-up.sh`
- `bin/docker-env-down.sh`
- `bin/docker-env-status.sh`
- `bin/docker-env-build.sh`
- `bin/docker-env-logs.sh`

应用配置变更（Phase 1 范围）：

- `ruoyi-admin/src/main/resources/application-docker.yml`（或等价 env 覆盖）
- `ruoyi-admin/pom.xml`（新增 actuator 依赖）
- `.claude/project/config.yaml`：
  - `commands.ops.docker_build` -> `bash bin/docker-env-build.sh test --profile core`
  - `commands.ops.docker_run` -> `bash bin/docker-env-up.sh test --profile core`
  - `commands.ops.logs` -> `bash bin/docker-env-logs.sh test --profile core`
  - `commands.ops.health` -> `curl -sS --max-time 5 "${BASE_HEALTH_URL:-http://127.0.0.1:28080/actuator/health}"`
- 命令口径约束：
  - `commands.ops.docker_run` 仅用于收尾自动化（`final-closure`），固定 `--profile core`
  - 日常开发默认命令：`bash bin/docker-env-up.sh test --profile deps`

命令规范：

- 统一使用 `docker compose`（Compose v2）。
- 不再新增 `docker-compose`（v1）命令写法。
- `.gitignore` 增加 `deploy/secrets/*`（仅保留模板与 README）。

## 7. 环境清单（reqxxx 的工程化落地）

采用三层清单并存：

1. 人类可读：`deploy/ENV-REQUIREMENTS.md`
2. 机器可读：`deploy/.env.test` / `deploy/.env.prod`（由 example 复制）
3. 机器校验：`bin/deploy-preflight.sh`

其中 `requirements-test.txt` / `requirements-prod.txt` 为 preflight 的必填键机器校验清单（逐键阻断）。

端口冲突策略（写入 preflight）：

1. preflight 按启动 profile 动态校验“将映射到宿主机”的端口：
   - `deps`：`${MYSQL_PORT}/${REDIS_PORT}`（test 默认 `23306/26379`）
   - `core`：`deps + ${BACKEND_PORT}`（test 默认 `28080`）
   - `frontends`：`3001-3005`
2. 支持通过 `.env` 覆盖端口（如 `BACKEND_PORT`），但必须同步健康检查与前端路由配置。
3. 默认不自动 kill 占用进程（避免破坏宿主机环境）。

## 8. 安全与运维基线

1. 生产敏感信息不入库，使用外部注入。
2. 生产默认最小端口暴露。
3. 关键服务定义 healthcheck，并通过 `depends_on: condition: service_healthy` 串联。
4. preflight 强校验：
   - Docker/Compose 版本
   - 必要端口占用
   - 磁盘空间
   - 必要文件存在
   - `deploy/mysql-init/00-06_*.sql` 文件完整且非空
   - `deploy/mysql-init/manifest.sha256` 与 `00-06_*.sql` 哈希一致
   - `docker compose ... config` 的服务拓扑与固定清单一致（mysql/redis/backend/admin/student/mentor/lead-mentor/assistant）
5. 容器权限最小化（非 root、只读卷优先、必要能力最小化）。
6. prod 使用 Compose secrets：
   - `mysql_root_password`
   - `mysql_app_password`
   - `redis_password`
   - `jwt_secret`（如需要）

### 8.1 Secrets 消费契约（避免“声明了但未使用”）

1. `mysql` 服务直接使用官方 `_FILE` 变量：
   - `MYSQL_ROOT_PASSWORD_FILE=/run/secrets/mysql_root_password`
   - `MYSQL_PASSWORD_FILE=/run/secrets/mysql_app_password`
2. `redis` 服务通过启动命令读取 secret 文件并设置 `requirepass`：
   - 例如：`redis-server --requirepass "$(cat /run/secrets/redis_password)"`
3. `backend` 服务通过 `deploy/backend/docker-entrypoint.sh` 统一映射：
   - `MYSQL_APP_PASSWORD_FILE` -> `SPRING_DATASOURCE_PASSWORD`
   - `REDIS_PASSWORD_FILE` -> `SPRING_DATA_REDIS_PASSWORD`
   - `JWT_SECRET_FILE` -> `TOKEN_SECRET`
4. prod 环境必须启用上述 `_FILE` 路径；test 环境不得依赖 secrets 文件。
5. CI 或 preflight 需校验：prod 下 secrets 文件存在且非空。

### 8.2 服务拓扑漂移防护（必须）

1. preflight 必须执行 `docker compose ... config --services` 并与固定服务清单逐项比对。
2. 固定清单（8 服务）：
   - `mysql`
   - `redis`
   - `backend`
   - `admin`
   - `student`
   - `mentor`
   - `lead-mentor`
   - `assistant`
3. 任何服务缺失、额外服务、服务名变化均视为拓扑漂移，直接 FAIL。
4. 该校验在 test/prod 均必须通过，确保“同构”不被静默破坏。

## 9. 与 Final Closure 的集成

### 9.1 自动化入口

```bash
bash bin/final-closure.sh permission --cc-mode optional --backend-policy docker_only
```

### 9.2 运行机制

- `final-closure` 通过 `DOCKER_RUN_CMD` 或 `config.commands.ops.docker_run` 启动 `core`。
- `docker_only` 下 Docker 启动失败必须 `EXIT 11`。
- `final-gate` 命中业务 WARNING（后端未启动 / @api E2E 跳过）必须 `EXIT 12`。
- 健康检查以 `/actuator/health` 为唯一契约，避免多口径。
- `final-closure` 必须将统一后的 `BASE_URL/HEALTH_PATH/BASE_HEALTH_URL` 透传给 `final-gate` 与 `api-smoke`，禁止中途回落到写死端口。

### 9.3 标准运行命令模板

测试环境（核心服务）：

```bash
docker compose \
  -f deploy/compose.base.yml \
  -f deploy/compose.test.yml \
  --env-file deploy/.env.test \
  --profile core up -d
```

测试环境（开发默认，仅依赖）：

```bash
docker compose \
  -f deploy/compose.base.yml \
  -f deploy/compose.test.yml \
  --env-file deploy/.env.test \
  --profile deps up -d
```

测试环境（全量服务）：

```bash
docker compose \
  -f deploy/compose.base.yml \
  -f deploy/compose.test.yml \
  --env-file deploy/.env.test \
  --profile core \
  --profile frontends up -d
```

正式环境（全量服务）：

```bash
docker compose \
  -f deploy/compose.base.yml \
  -f deploy/compose.prod.yml \
  --env-file deploy/.env.prod \
  --profile core \
  --profile frontends up -d
```

正式环境（secrets 校验 + 全量 profile）：

```bash
bash bin/deploy-preflight.sh prod --profile core,frontends
docker compose \
  -f deploy/compose.base.yml \
  -f deploy/compose.prod.yml \
  --env-file deploy/.env.prod \
  --profile core \
  --profile frontends up -d
```

说明：
- `compose.prod.yml` 通过 `secrets:` 声明引用 `deploy/secrets/*` 文件
- `deploy/secrets/` 目录不入库

## 10. 验收标准（含全量 profile）

1. `docker compose -f deploy/compose.base.yml -f deploy/compose.test.yml --env-file deploy/.env.test config` 成功。
2. `bash bin/docker-env-up.sh test --profile deps` 能成功拉起 `mysql+redis`。
3. `bash bin/docker-env-up.sh test --profile core` 后 `http://127.0.0.1:${BACKEND_PORT:-28080}/actuator/health` 可达。
4. `bash bin/docker-env-up.sh test --profile frontends` 能成功拉起全角色前端容器集合（含 admin:3005）。
5. `final-closure --backend-policy docker_only` 至少完成一次无环境阻塞闭环。
6. 重启后 MySQL/Redis 数据保留。
7. test/prod 仅配置差异，无服务拓扑差异。
8. prod 前端服务使用构建产物镜像（非开发服务器模式）。

## 10.1 Docker 环境测试策略（新增）

1. 配置测试：`docker compose ... config`（语法与变量完整性）
2. 生命周期测试：`up -> health -> down -> up`（验证可重复启动）
3. 持久化测试：插入一条业务数据，重启后仍存在
4. 兼容性测试：`deps`、`core` 与 `core+frontends` 三种 profile 均可启动
5. 失败注入：故意占用当前环境端口（如 test 默认 `23306/26379/3001`），验证 preflight 能按 profile 阻断并给出明确错误
6. 失败分类测试：构建失败与启动失败都能输出不同错误码与日志位置

## 10.2 失败退出码矩阵（执行口径）

### final-closure.sh

| 退出码 | 含义 | 典型触发 |
| --- | --- | --- |
| 0 | 闭环完成（PASS/PARTIAL） | 全流程执行完成，且报告已生成 |
| 10 | 前置状态不满足 | `STATE.yaml` 不存在或 `workflow.current_step != all_stories_done` |
| 11 | 环境准备失败（后端未就绪） | Docker preflight 失败、`docker_only` 下 Docker 启动失败、健康检查超时 |
| 12 | final-gate 失败或命中业务 WARNING | `final-gate` 非零退出，或命中“后端未启动/@api E2E 跳过” |
| 13 | 审计校验失败 | `traceability_guard` 或 `story_integration_assertions` 失败 |
| 14 | CC 复核失败（required） | `cc_mode=required` 且 `claude` 不可用或复核失败 |
| 15 | 产物收集/报告失败 | 缺少 final-gate 日志、api-smoke 报告、Playwright 报告目录、closure 审计报告写入失败 |
| 16 | 参数或模块资产错误 | 参数非法、module 为空、模块测试资产缺失 |

### final-gate.sh

| 退出码 | 含义 | 典型触发 |
| --- | --- | --- |
| 0 | 门禁通过 | 所有 guard、测试与构建步骤通过 |
| 21 | 工具链缺失 | 缺少 `python3/node/pnpm/mvn` |
| 22 | E2E 启动前置缺失 | 缺少 `osg-frontend/playwright.config.ts` 或 `webServer` 未配置 |
| 23 | 验证码基线不匹配 | `CAPTCHA_EXPECTED` 与 `/captchaImage.captchaEnabled` 不一致 |

## 11. 分阶段实施（消除前后冲突）

### Phase 1（必须完成）

1. 落地全量 `compose.base.yml`（含所有前端角色定义）。
2. 落地 `compose.test.yml` / `compose.prod.yml` 覆盖层（含 `deps/core/frontends` profile 约束）。
3. 新增后端 Dockerfile。
4. 新增前端 `Dockerfile.test`（覆盖 admin 依赖与 3005 端口）。
5. 落地容器配置覆盖（`application-docker.yml` 或等价 env 覆盖）。
6. 引入 actuator 并统一 `/actuator/health` 契约与 `SecurityConfig permitAll`。
7. 明确 `SPRING_PROFILES_ACTIVE=druid,docker` 激活方式。
8. 落地 preflight 与 up/down/status/build/logs 脚本（统一 `docker compose`）。
9. 落地 prod Nginx `/api` 反代（含 `/api` 前缀剥离）。
10. 落地 secrets 消费链路（mysql `_FILE` + backend entrypoint + redis requirepass）。
11. 更新 `bin/final-gate.sh`、`bin/final-closure.sh`、`bin/api-smoke.sh` 的后端地址契约（单一来源 + 透传 + 自动探测）。
12. 跑通 `final-closure docker_only`，且 `api-smoke` 与 `final-gate` 使用同一 BASE_URL。

### Phase 2（优化增强）

1. profile 细粒度优化（按角色拆分更多子 profile）。
2. 故障排查手册与运维文档补齐。
3. CI 增加 `docker compose config` 与 preflight 校验。

## 12. 迁移场景：本地 MySQL -> Docker MySQL

### 12.1 迁移流程（标准）

1. 从本地导出：
   - `mysqldump -u <user> -p --databases ry-vue > backup-ry-vue.sql`
2. 启动 Docker MySQL（仅 core）并确认可连接。
3. 导入到 Docker：
   - `docker exec -i <mysql-container> mysql -u root -p${MYSQL_ROOT_PASSWORD} ry-vue < backup-ry-vue.sql`
4. 启动 backend，执行最小业务校验。

### 12.2 风险控制

1. 导入前保留 Docker 卷快照（或备份文件）。
2. 严禁在 prod 未验证前覆盖现网数据卷。
3. 导入后执行 schema/version 对齐检查。

## 13. 现有 `osg-frontend/docker-compose.yml` 处置策略

1. 保留现文件用于“前端开发独立场景”。
2. 新增 `deploy/` 体系作为“收尾自动化与同构部署”唯一入口。
3. 在旧文件头部追加 deprecation 注释，指向 `deploy/compose*.yml`。
4. 禁止 `final-closure` 直接调用旧文件。
5. `osg-frontend/Dockerfile.dev` 仅保留给旧独立开发场景；`deploy/` 体系统一使用 `deploy/frontend/Dockerfile.test` 与 `deploy/frontend/Dockerfile.prod`。

## 14. 可执行实施清单（逐步，不留解释空间）

1. 新建 `deploy/compose.base.yml`（全量服务 + network + volumes + profiles）  
   DoD：`docker compose -f deploy/compose.base.yml config` 成功，8 个服务均存在。
2. 新建 `deploy/compose.test.yml` 与 `deploy/compose.prod.yml`（仅覆盖差异；新增 `deps` profile）  
   DoD：test/prod 服务拓扑一致，仅 env/ports/secrets 差异。
3. 新建 `deploy/backend/Dockerfile`、`deploy/backend/docker-entrypoint.sh`、`deploy/frontend/Dockerfile.test`、`deploy/frontend/Dockerfile.prod`、`deploy/frontend/nginx.conf`  
   DoD：后端镜像可构建并启动；前端 prod 镜像不含 `pnpm dev` 运行路径。
   补充：若后端镜像仍依赖本地 jar，必须先执行 `mvn -pl ruoyi-admin -am -DskipTests package` 再执行 preflight/up。
4. 新建 `.env.test.example` / `.env.prod.example` 并补齐变量说明（明确 test 明文变量、prod secrets 与 `_FILE` 映射关系）  
   DoD：按 example 复制后可通过 preflight（版本/文件/端口/secrets/必填键）校验。
5. 新建 `bin/prepare-mysql-init.sh`，生成 `deploy/mysql-init/00-06_*.sql` 并在 compose 中挂载  
   DoD：固定生成 7 个 `00-06` 文件，且顺序与清单一致。
6. 新建 `bin/deploy-preflight.sh`（版本/端口/文件/磁盘/secrets 非空 + compose 渲染 + 必填键校验）  
   DoD：能阻断 Docker 版本不足、端口占用、secrets 空文件、mysql-init 空文件、compose 配置渲染失败、必填键缺失、拓扑漂移、hash 不一致。
7. 新建 `bin/docker-env-{up,down,status,build,logs}.sh`  
   DoD：支持 `test|prod` 与 `deps|core|frontends` 组合参数。
8. 新增 `application-docker.yml`（mysql/redis 主机改服务名）  
   DoD：后端容器日志中 datasource/redis 主机为 `mysql`/`redis`。
9. `ruoyi-admin/pom.xml` 增加 actuator，开放 `/actuator/health`  
   DoD：`/actuator/health` 返回 200。
10. `SecurityConfig.java` 将 `/actuator/health` 加入 `permitAll`  
    DoD：匿名访问 `/actuator/health` 不触发鉴权。
11. `application-docker.yml` 覆盖 `ruoyi.profile` 为 Linux 路径，并激活 `druid,docker`  
    DoD：运行时 `SPRING_PROFILES_ACTIVE` 生效，上传路径不再指向 `D:/...`。
12. 更新 `bin/final-gate.sh`、`bin/final-closure.sh`、`bin/api-smoke.sh` 后端地址单一来源契约  
    DoD：三脚本健康检查地址一致，`final-closure` 透传到 `final-gate/api-smoke`，且与 `.claude/project/config.yaml` 一致。
13. 更新 `.claude/project/config.yaml` 的 `docker_build/docker_run/logs/health`（统一 `docker compose` v2 + 统一健康地址变量）  
    DoD：`commands.ops.*` 不再使用 `docker-compose`（v1）写法。
14. 验证：`docker compose ... config`、`up core`、`/actuator/health`、`final-closure docker_only`  
    DoD：`final-closure --backend-policy docker_only` 返回 0，且无业务 WARNING。
15. 验证：`up deps`（mysql+redis）作为日常开发默认模式可用  
    DoD：`deps` 模式下 backend/frontends 未启动，mysql/redis 健康。
16. 验证：`up frontends` + `/api` 反代（含前缀剥离）+ Playwright 宿主机冒烟  
    DoD：`/api/system/role/list` 可达且至少 1 条 `@api` E2E 通过。
17. 输出审计与回归记录，更新 live checklist  
    DoD：生成 final-closure/final-gate/api-smoke/playwright 报告，并回填 checklist 状态。
18. 验证：preflight 拓扑与哈希守卫  
    DoD：`docker compose ... config --services` 与固定 8 服务完全一致；`deploy/mysql-init/manifest.sha256` 校验通过。
19. 验证：验证码基线守卫  
    DoD：`CAPTCHA_EXPECTED` 设置后，`/captchaImage.captchaEnabled` 不一致时能明确失败；为空时仅记录不阻断。

## 15. 参考依据（官方 + 业界）

官方规范：

1. Docker Compose 多文件与覆盖机制  
   https://docs.docker.com/compose/how-tos/multiple-compose-files/
2. Docker Compose Profiles  
   https://docs.docker.com/compose/how-tos/profiles/
3. Docker Compose 环境变量管理  
   https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
4. Docker Volumes 持久化  
   https://docs.docker.com/engine/storage/volumes/
5. Docker Compose Secrets  
   https://docs.docker.com/compose/how-tos/use-secrets/
6. Playwright `webServer`（宿主机测试策略）  
   https://playwright.dev/docs/test-webserver

业界方法论与案例：

1. Twelve-Factor：Config 与 Dev/Prod Parity  
   https://12factor.net/config  
   https://12factor.net/dev-prod-parity
2. OWASP Docker Security Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
3. Adobe Commerce Cloud Docker（base + override）  
   https://developer.adobe.com/commerce/cloud-tools/docker/configure/
4. eShopOnContainers（多 compose 文件协同）  
   https://github.com/gcc98/eShopOnContainers-Tutorial
