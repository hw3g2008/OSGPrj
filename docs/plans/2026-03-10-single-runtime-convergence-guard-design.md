# Single Runtime Convergence Guard Design

> Date: 2026-03-10
> Status: Approved
> Owner: workflow-framework
> Scope: 将“验证前必须先收敛到单运行态”固化为项目共享守卫，覆盖本地 backend、admin preview、prototype 三类运行态，并接入现有入口脚本
> Non-goals: 不重写 Docker test/prod 部署拓扑；不引入新的运行态真源文件；不修改业务页面逻辑

---

## 1. 问题定义

当前项目已经有两类运行态事实：

1. `context-preflight` / `runtime-contract` 负责验证“目标模式是否合理”
2. 各入口脚本负责实际启动 preview、prototype、backend 或 Docker stack

但仓库缺少一层关键能力：

- **在启动目标运行态前，先把冲突的项目自管运行态收敛掉**

这会导致两个直接后果：

1. 调试或验证时，入口脚本可能建立在一个“混杂态”之上继续运行
2. 失败后很难判断是真实业务缺陷，还是旧 preview / 旧 prototype / 旧 backend 残留造成的假问题

本次设计目标不是再增加一套新的“项目流程”，而是把“单运行态收敛”落实到现有脚本骨架中，成为所有早期入口都能复用的共享守卫。

---

## 2. 设计目标

### 2.1 必须达到

1. 验证入口在启动前必须显式收敛到单运行态
2. 收敛范围覆盖：
   - 本地 backend
   - admin preview
   - prototype server
3. 对“项目自管”的冲突运行态自动 stop
4. 对“未知来源”的监听不盲杀，直接 fail 并打印证据
5. 早期入口统一接入，不把问题拖到 `final-gate`
6. 不新增平行 guard，优先复用现有 `runtime-port-guard`

### 2.2 明确不做

1. 不把远端 test host 的存活状态伪装成本机 test truth
2. 不把任意占用 28080/4173/18090 的陌生进程都强杀
3. 不新增第二份运行态配置文件去和 `config.yaml` / `runtime-contract.*.yaml` 竞争真源

---

## 3. 方案对比

### 方案 A：各入口脚本各自实现清场逻辑

做法：

- 在 `run-dev-shared.sh`、`admin-preview-server.sh`、`prototype-server.sh`、`ui-visual-gate.sh` 等脚本中分别写 stop/kill 逻辑

优点：

- 落地直接

缺点：

- 同一规则会复制到多个脚本
- 后续新增入口时容易漏接
- 很快演变成“每个入口各有一套收敛标准”

结论：

- 不推荐

### 方案 B：扩展现有 `runtime-port-guard` 成为共享收敛守卫

做法：

- 保留 `require-free` / `describe`
- 新增 `converge-runtime`
- 各入口只声明目标运行态，收敛策略统一放在一处

优点：

- 复用现有 guard，无命名冲突
- 入口脚本只声明目标，不再重复写冲突矩阵
- 最符合“共享守卫”目标

缺点：

- 需要补 backend 的生命周期包装器，否则 28080 只能检测，不能安全 stop

结论：

- **推荐**

### 方案 C：新建总控 orchestrator，所有入口都必须经过它

做法：

- 新增单独的运行态编排脚本，统一接管所有 start/stop/restart

优点：

- 一致性最强

缺点：

- 侵入性过大
- 需要改造现有所有入口
- 超出本轮最小改造范围

结论：

- 本轮不采用

---

## 4. 选型结论

采用 **方案 B：扩展 `runtime-port-guard` 为共享收敛守卫**。

设计核心分两层：

1. **收敛层**
   - 由 `runtime-port-guard.sh` 新增 `converge-runtime` 承担
2. **生命周期层**
   - 新增 `backend-dev-server.sh`
   - 继续复用现有 `admin-preview-server.sh`
   - 继续复用现有 `prototype-server.sh`

这样可以保证：

- 入口脚本仍保持自己“启动什么”的职责
- 单运行态规则集中在 guard 中
- backend 不再是“只能起、不能安全停”的裸进程

---

## 5. Existing-Entrypoint Inventory

当前会影响运行态的入口如下：

### 5.1 本地开发入口

- `bin/run-backend-dev.sh`
  - 本地 backend 启动器
  - 已有 `context-preflight dev`
  - 只会要求 28080 空闲，不会主动收敛冲突态
- `bin/run-dev-shared.sh`
  - 当前 dev 主入口
  - 本质上只是转发到 `run-backend-dev.sh`

### 5.2 本地 UI / 原型入口

- `bin/admin-preview-server.sh`
  - 管理后台 preview 生命周期
  - 只管 4173，自身不会主动处理 backend/prototype 冲突
- `bin/prototype-server.sh`
  - prototype 静态服务器生命周期
  - 只管 18090，自身不会主动处理 backend/preview 冲突

### 5.3 验证 / gate 入口

- `bin/ui-visual-gate.sh`
  - 当前只显式 stop preview
  - 没有完整的运行态收敛
- `bin/ui-visual-baseline.sh`
  - `--source prototype` 时只会确保 prototype server 可用
  - `--source app` 默认依赖调用方先准备好 backend/preview
- `bin/final-gate.sh`
  - 仍包含手写 backend 启动分支
- `bin/final-closure.sh`
  - 仍包含手写 backend 启动分支

### 5.4 已有守卫

- `bin/context-preflight.sh`
  - 校验目标模式与 machine truth 是否一致
- `bin/runtime-port-guard.sh`
  - 当前只有 `require-free` / `describe`
  - 只能报端口占用，不能做运行态收敛

---

## 6. Guard Reuse / Collision Audit

### 6.1 为什么复用 `runtime-port-guard`

`runtime-port-guard` 已经承担了“运行态启动前的端口安全检查”职责。  
本次新增的“收敛冲突运行态”与它属于同一责任域：

- 在启动某个运行态前检查当前端口环境
- 区分“项目自管监听”和“未知监听”
- 输出可读诊断信息

因此最合理的做法是扩展它，而不是新建：

- `runtime-convergence-guard.sh`
- `single-runtime-enforcer.sh`
- `dev-runtime-cleanup.sh`

这类并列脚本都会造成职责重叠和命名漂移。

### 6.2 为什么不能只复用 `context-preflight`

`context-preflight` 解决的是：

- 当前选择的模式是否符合 `config.yaml`
- env file / runtime contract 是否指向正确目标

它不负责：

- 停进程
- 停 preview
- 停 prototype
- 收敛已有监听

因此它应继续做“模式真值守卫”，不能被扩展成“进程生命周期管理器”。

### 6.3 新增 `backend-dev-server.sh` 是否会冲突

不会。

因为它承担的是 `backend` 的生命周期包装：

- `start|stop|status|restart`
- PID 管理
- health 检查

这和 `run-backend-dev.sh` 的角色不同：

- `run-backend-dev.sh` 仍然是“纯启动器”
- `backend-dev-server.sh` 是“托管生命周期外壳”

二者职责清晰，不会冲突。

---

## 7. 目标运行态模型

本次只抽象三种目标态：

### 7.1 `dev-local`

目标：

- 本地 backend 可运行
- admin preview 可运行
- prototype 不是当前目标，若存在则应被收敛

适用入口：

- `run-dev-shared.sh`
- `admin-preview-server.sh`
- `ui-visual-gate.sh`
- 需要本地 app 预览的其它验证入口

### 7.2 `prototype-only`

目标：

- prototype 可运行
- admin preview 与 backend 不是当前目标，若存在冲突残留则收敛

适用入口：

- `prototype-server.sh`
- `ui-visual-baseline.sh --source prototype`

### 7.3 `test-docker`

目标：

- test stack 由现有 Docker 入口统一管理
- 依旧以 `context-preflight test` 和 `docker-env-down/up` 为主

适用入口：

- `deploy-server-docker.sh`
- `deploy-test-remote.sh`

本次不会把本机非项目 Docker 进程纳入盲目 stop 范围。

---

## 8. 共享守卫接口设计

在 `bin/runtime-port-guard.sh` 上新增：

```bash
bash bin/runtime-port-guard.sh --mode converge-runtime --target dev-local --context ui-visual-gate
bash bin/runtime-port-guard.sh --mode converge-runtime --target prototype-only --context baseline-generate
bash bin/runtime-port-guard.sh --mode converge-runtime --target test-docker --context deploy-server-docker
```

语义：

- `--target` 描述“我要进入什么运行态”
- guard 根据目标态，决定哪些项目自管运行态应该被 stop
- 对目标端口上的陌生监听，仅输出证据并 fail，不自动 kill

### 8.1 输出要求

收敛成功时：

- 打印每个被 stop 的项目自管运行态
- 打印最终目标态已满足

收敛失败时：

- 明确哪个端口存在未知监听
- 输出 `lsof` 与 `ps` 证据
- exit non-zero

---

## 9. 生命周期层设计

新增：

- `bin/backend-dev-server.sh`

接口：

```bash
bash bin/backend-dev-server.sh start
bash bin/backend-dev-server.sh stop
bash bin/backend-dev-server.sh status
bash bin/backend-dev-server.sh restart
```

职责：

1. 使用 `run-backend-dev.sh` 作为真实启动器
2. 记录 backend PID
3. 校验 `http://127.0.0.1:28080/actuator/health`
4. stop 时优先杀托管 PID；若 PID 丢失，再按 28080 listener 识别项目自管 Java 进程
5. 不对未知 28080 监听做盲杀

这样，收敛守卫在处理 `dev-local` / `prototype-only` 时，就能安全地 stop backend。

---

## 10. 冲突矩阵

| 目标态 | 应保留 | 应收敛 | 未知监听策略 |
|------|------|------|------|
| `dev-local` | backend, admin preview | prototype | fail + describe |
| `prototype-only` | prototype | backend, admin preview | fail + describe |
| `test-docker` | test docker stack | 同项目 test stack 旧容器 | fail + describe |

说明：

1. `dev-local` 不强制 backend 与 preview 同时已启动，但会先把 prototype 清掉
2. `prototype-only` 要求 backend / preview 不继续占着本机开发链路
3. “未知监听”指不属于：
   - `backend-dev-server.sh`
   - `admin-preview-server.sh`
   - `prototype-server.sh`
   - 当前项目 Docker test stack

---

## 11. 入口接入设计

### 11.1 `run-backend-dev.sh`

- 保持“纯启动器”
- 继续负责：
  - `context-preflight`
  - `require-free`
  - 真正的 Java 启动
- 不新增 stop/cleanup 职责

### 11.2 `run-dev-shared.sh`

- 先执行：
  - `converge-runtime --target dev-local`
- 再执行：
  - `backend-dev-server.sh restart`

### 11.3 `admin-preview-server.sh`

- `start/restart` 前执行：
  - `converge-runtime --target dev-local`

### 11.4 `prototype-server.sh`

- `start` 前执行：
  - `converge-runtime --target prototype-only`

### 11.5 `ui-visual-gate.sh`

- 用共享守卫替代“只 stop preview”的局部逻辑
- 顺序改为：
  1. `converge-runtime --target dev-local`
  2. `admin-preview-server.sh restart`
  3. 执行现有 visual gate

### 11.6 `ui-visual-baseline.sh`

- `--source prototype` 时：
  1. `converge-runtime --target prototype-only`
  2. `prototype-server.sh start`
- `--source app` 时不自行切换到 test/remote，只依赖调用方先收敛正确运行态

### 11.7 `final-gate.sh` / `final-closure.sh`

- 删除手写 `nohup bash bin/run-backend-dev.sh ... &`
- 改为统一调用：
  - `backend-dev-server.sh start|restart`

---

## 12. Source-Stage Integration Path

本次设计不引入新的运行态真源文件。

### 12.1 真源保持不变

仍然以现有文件为唯一事实来源：

- `.claude/project/config.yaml`
- `deploy/runtime-contract.dev.yaml`
- `deploy/runtime-contract.test.yaml`

### 12.2 新增产物的最早生成阶段

本轮新增的只有“执行层产物”，不会在 final gate 才首次出现：

1. `bin/backend-dev-server.sh`
   - 最早在 implementation 阶段生成
2. `bin/runtime-port-guard-selftest.sh` 扩展
   - 最早在 implementation 阶段生成/修改
3. `bin/backend-dev-server-selftest.sh`
   - 最早在 implementation 阶段生成

### 12.3 为什么没有新增 YAML / contract

因为单运行态收敛不是新的业务真源，而是对已有 machine truth 的执行强化。  
如果再新增一份“runtime convergence config”，会制造第二真源，违背当前框架方向。

---

## 13. Stage-Regression Verification Approach

本次改造必须在**最早入口**证明规则生效，而不是只在 final gate 观察到结果。

### 13.1 自测试

- `runtime-port-guard-selftest`
  - 覆盖 `converge-runtime`
  - 覆盖未知监听失败
- `backend-dev-server-selftest`
  - 覆盖 `start|stop|status|restart`

### 13.2 入口级验证

至少验证：

1. `admin-preview-server.sh restart`
   - 能在有 prototype 残留时完成收敛
2. `prototype-server.sh start`
   - 能在有 preview / backend 残留时完成收敛
3. `run-dev-shared.sh`
   - 能在有 prototype 残留时完成收敛
4. `ui-visual-gate.sh`
   - 不再仅 stop preview，而是明确走共享收敛逻辑

### 13.3 阶段回归要求

每条规则都必须能回答：

- 最早在哪个入口会触发？
- 触发时是自动收敛，还是 fail-fast？
- 输出是否足够让人一眼判断“项目自管冲突”还是“未知监听”？

---

## 14. 风险与回退

### 14.1 风险

1. backend 目前没有现成 PID 管理，新增生命周期脚本时容易误识别 listener
2. 如果把陌生监听也纳入自动 stop，会有误杀风险
3. 如果 `ui-visual-baseline.sh` 自己擅自切 test/remote，会再次违反单运行态原则

### 14.2 风险控制

1. 只 stop 项目自管运行态
2. 未知监听统一 fail + describe
3. app/prototype 入口各自只收敛到自己的目标态，不跨模式猜测

---

## 15. 验收标准

满足以下条件才算设计落地正确：

1. `runtime-port-guard` 成为唯一共享收敛守卫
2. `backend-dev-server.sh` 承担本地 backend 生命周期托管
3. `run-dev-shared` / `admin-preview-server` / `prototype-server` / `ui-visual-gate` 都接入收敛守卫
4. `final-gate` / `final-closure` 不再手写 backend 裸启动
5. 入口级验证能证明规则在最早 choke point 生效

