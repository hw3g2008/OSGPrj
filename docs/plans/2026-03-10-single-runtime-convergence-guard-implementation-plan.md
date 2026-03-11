# Single Runtime Convergence Guard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把“验证前先收敛到单运行态”固化成共享守卫，覆盖本地 backend、admin preview、prototype 三类运行态，并让主要入口脚本统一复用。

**Architecture:** 复用 `runtime-port-guard.sh` 作为唯一共享收敛守卫，新增 `converge-runtime` 目标态切换能力；新增 `backend-dev-server.sh` 托管本地 backend 生命周期；将 `run-dev-shared.sh`、`admin-preview-server.sh`、`prototype-server.sh`、`ui-visual-gate.sh`、`ui-visual-baseline.sh`、`final-gate.sh`、`final-closure.sh` 接到这两层之上。未知监听 fail-fast，项目自管运行态自动收敛。

**Tech Stack:** Bash, lsof, curl, Python selftests, existing runtime contracts and gate scripts

---

**Design Doc:** `docs/plans/2026-03-10-single-runtime-convergence-guard-design.md`

**Execution Order:**
1. 先写守卫与 backend 生命周期的失败测试
2. 再补共享收敛逻辑
3. 再接入各入口脚本
4. 最后跑入口回归与阶段回归

**DoD:**
1. `runtime-port-guard.sh` 支持 `converge-runtime`
2. `backend-dev-server.sh` 支持 `start|stop|status|restart`
3. 指定入口全部改为共享守卫
4. 自测试、入口回归、阶段回归命令都有新鲜通过证据

---

## Existing-Entrypoint Inventory

当前实际入口与守卫：

- `bin/run-backend-dev.sh`
- `bin/run-dev-shared.sh`
- `bin/admin-preview-server.sh`
- `bin/prototype-server.sh`
- `bin/ui-visual-gate.sh`
- `bin/ui-visual-baseline.sh`
- `bin/final-gate.sh`
- `bin/final-closure.sh`
- `bin/context-preflight.sh`
- `bin/runtime-port-guard.sh`

本计划只复用并扩展这些入口，不新建第二套平行运行态框架。

## Guard Reuse / Collision Audit

- 复用对象：`bin/runtime-port-guard.sh`
  - 新增 `converge-runtime`
  - 保留 `require-free` / `describe`
- 不新增平行 guard
  - 不创建 `runtime-convergence-guard.sh`
  - 不创建 `single-runtime-enforcer.sh`
- 新增 `bin/backend-dev-server.sh`
  - 不是 guard
  - 是 backend 生命周期包装器
  - 职责与 `run-backend-dev.sh` 不冲突

## Source-Stage Integration Path

- 现有真源继续保持：
  - `.claude/project/config.yaml`
  - `deploy/runtime-contract.dev.yaml`
  - `deploy/runtime-contract.test.yaml`
- 本轮新增文件最早都在 implementation 阶段生成：
  - `bin/backend-dev-server.sh`
  - `bin/backend-dev-server-selftest.sh`
- 修改文件也都属于已有入口，不把任何新规则拖到 final gate 才首次出现

## Stage-Regression Verification

必须在最早 choke point 验证规则，而不是只跑最终 gate：

- `bash bin/admin-preview-server.sh restart`
- `bash bin/prototype-server.sh start`
- `bash bin/run-dev-shared.sh`
- `bash bin/ui-visual-gate.sh permission`

每个入口都要覆盖两类结果：

1. 项目自管冲突运行态会被自动收敛
2. 未知监听会 fail-fast 并打印 `lsof + ps`

---

### Task 1: 给共享守卫写失败测试

**Files:**
- Modify: `bin/runtime-port-guard-selftest.sh`
- Test: `bin/runtime-port-guard.sh`

**Step 1: 写新的失败场景测试**

给 `bin/runtime-port-guard-selftest.sh` 增加两类用例：

- `converge-runtime --target dev-local` 在存在项目自管 prototype 残留时，应先失败（因为实现还不存在）
- `converge-runtime --target prototype-only` 在 18090 被陌生监听占用时，应返回未知监听失败语义

**Step 2: 运行测试，确认红灯**

Run:

```bash
bash bin/runtime-port-guard-selftest.sh
```

Expected:

- FAIL，提示 `converge-runtime` 还未实现或结果不符合预期

**Step 3: 记录失败语义**

红灯必须明确区分：

- “mode 未实现”
- “未知监听未正确 fail-fast”

---

### Task 2: 实现 `runtime-port-guard` 共享收敛模式

**Files:**
- Modify: `bin/runtime-port-guard.sh`
- Modify: `bin/runtime-port-guard-selftest.sh`

**Step 1: 扩展 CLI**

为 `bin/runtime-port-guard.sh` 增加：

- `--mode converge-runtime`
- `--target <dev-local|prototype-only|test-docker>`
- `--context <name>`

**Step 2: 实现项目自管运行态收敛**

实现逻辑：

- `dev-local`
  - stop `prototype-server`
- `prototype-only`
  - stop `admin-preview-server`
  - stop `backend-dev-server`
- `test-docker`
  - 先描述为受支持目标态
  - 当前只接现有 `docker-env-down.sh` 协议，不盲目 stop 本机未知 docker 进程

**Step 3: 对未知监听保持 fail-fast**

要求：

- 如果目标关键端口仍被非项目自管进程监听
- 输出：
  - `FAIL: unknown listener ...`
  - `lsof`
  - `ps`

**Step 4: 重新运行自测试，确认转绿**

Run:

```bash
bash bin/runtime-port-guard-selftest.sh
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add bin/runtime-port-guard.sh bin/runtime-port-guard-selftest.sh
git commit -m "feat: add shared runtime convergence guard"
```

---

### Task 3: 给 backend 增加托管生命周期包装器

**Files:**
- Create: `bin/backend-dev-server.sh`
- Create: `bin/backend-dev-server-selftest.sh`
- Modify: `bin/run-backend-dev.sh`

**Step 1: 写 backend 生命周期自测试（先红）**

自测试至少覆盖：

- `status` 在未运行时返回失败
- `start` 启动后可通过 health check
- `restart` 可重启
- `stop` 可停掉受管 backend
- 对未知 28080 监听不盲杀

**Step 2: 运行自测试，确认红灯**

Run:

```bash
bash bin/backend-dev-server-selftest.sh
```

Expected:

- FAIL，因为脚本还不存在

**Step 3: 实现 `backend-dev-server.sh`**

接口：

```bash
bash bin/backend-dev-server.sh start
bash bin/backend-dev-server.sh stop
bash bin/backend-dev-server.sh status
bash bin/backend-dev-server.sh restart
```

要求：

- PID 文件放在 `/tmp`
- 以 `bin/run-backend-dev.sh deploy/.env.dev` 为真实启动器
- 用 `http://127.0.0.1:28080/actuator/health` 做 readiness
- `stop` 只停项目自管 backend

**Step 4: 运行自测试，确认转绿**

Run:

```bash
bash bin/backend-dev-server-selftest.sh
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add bin/backend-dev-server.sh bin/backend-dev-server-selftest.sh bin/run-backend-dev.sh
git commit -m "feat: add managed backend dev lifecycle"
```

---

### Task 4: 接入本地开发与 preview / prototype 入口

**Files:**
- Modify: `bin/run-dev-shared.sh`
- Modify: `bin/admin-preview-server.sh`
- Modify: `bin/prototype-server.sh`
- Test: `bin/admin-preview-server-selftest.sh`

**Step 1: 先写入口回归用例**

给现有 selftest 补一条要求：

- `admin-preview-server.sh restart` 前若存在 prototype 残留，应能自动收敛

如无合适现成自测试，补最小测试脚本：

- 起 prototype
- 调 `admin-preview-server.sh restart`
- 断言 prototype 被停，preview 可用

**Step 2: 运行，确认红灯**

Run:

```bash
bash bin/admin-preview-server-selftest.sh
```

Expected:

- FAIL，说明入口尚未接入收敛守卫

**Step 3: 接入入口**

修改：

- `run-dev-shared.sh`
  - 先 `converge-runtime --target dev-local`
  - 再 `backend-dev-server.sh restart`
- `admin-preview-server.sh`
  - `start/restart` 前 `converge-runtime --target dev-local`
- `prototype-server.sh`
  - `start` 前 `converge-runtime --target prototype-only`

**Step 4: 回归验证**

Run:

```bash
bash bin/admin-preview-server-selftest.sh
```

Expected:

- PASS

---

### Task 5: 接入 visual 入口

**Files:**
- Modify: `bin/ui-visual-gate.sh`
- Modify: `bin/ui-visual-baseline.sh`
- Test: `bin/ui-visual-gate.sh`

**Step 1: 先补最小失败验证**

写一个阶段回归场景：

- 先起 prototype
- 再跑 `bash bin/ui-visual-gate.sh permission`
- 当前应无法证明它做了完整收敛

**Step 2: 跑场景，确认红灯**

Run:

```bash
bash bin/ui-visual-gate.sh permission
```

Expected:

- 若失败，应缺少明确的共享收敛日志
- 或仍只 stop preview

**Step 3: 接入共享守卫**

修改：

- `ui-visual-gate.sh`
  - 去掉只 stop preview 的局部逻辑
  - 改为先 `converge-runtime --target dev-local`
- `ui-visual-baseline.sh`
  - `--source prototype` 前先 `converge-runtime --target prototype-only`

**Step 4: 重跑验证**

Run:

```bash
bash bin/ui-visual-gate.sh permission
```

Expected:

- 入口日志中能看到收敛过程
- 收敛后 visual gate 继续执行

---

### Task 6: 接入 final gate / closure 的 backend 生命周期

**Files:**
- Modify: `bin/final-gate.sh`
- Modify: `bin/final-closure.sh`
- Test: `bin/final-gate.sh`

**Step 1: 先定位裸启动分支**

确认并标记所有：

- `nohup bash bin/run-backend-dev.sh ... &`

**Step 2: 写最小回归检查**

新增文本级或脚本级验证，要求：

- `final-gate.sh` / `final-closure.sh` 不再直接裸起 backend

**Step 3: 实现切换**

替换为：

- `bash bin/backend-dev-server.sh start`
- 或 `restart`

**Step 4: 回归验证**

Run:

```bash
rg -n "nohup bash bin/run-backend-dev.sh|backend-dev-server.sh" bin/final-gate.sh bin/final-closure.sh
```

Expected:

- 只剩 `backend-dev-server.sh`
- 不再出现 backend 裸启动

---

### Task 7: 运行完整验证并留证据

**Files:**
- Test: `bin/runtime-port-guard-selftest.sh`
- Test: `bin/backend-dev-server-selftest.sh`
- Test: `bin/admin-preview-server-selftest.sh`
- Test: `bin/context-preflight-selftest.sh`

**Step 1: 跑守卫与生命周期自测试**

Run:

```bash
bash bin/runtime-port-guard-selftest.sh
bash bin/backend-dev-server-selftest.sh
bash bin/admin-preview-server-selftest.sh
```

Expected:

- 全部 PASS

**Step 2: 跑前置守卫回归**

Run:

```bash
bash bin/context-preflight-selftest.sh
```

Expected:

- PASS

**Step 3: 跑阶段回归**

建议最少执行：

```bash
bash bin/prototype-server.sh start
bash bin/admin-preview-server.sh restart
bash bin/prototype-server.sh start
bash bin/run-dev-shared.sh
```

Expected:

- 项目自管冲突态被自动收敛
- 未知监听场景保持 fail-fast

**Step 4: Commit**

```bash
git add bin/runtime-port-guard.sh bin/runtime-port-guard-selftest.sh bin/backend-dev-server.sh bin/backend-dev-server-selftest.sh bin/run-dev-shared.sh bin/admin-preview-server.sh bin/prototype-server.sh bin/ui-visual-gate.sh bin/ui-visual-baseline.sh bin/final-gate.sh bin/final-closure.sh
git commit -m "feat: enforce single runtime convergence across entrypoints"
```

