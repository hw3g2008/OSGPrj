# MySQL-init 真源链扩展方案 v2（定稿）

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

> **v2 说明**：v1（同目录 `-plan.md`）的 §1-7 已失效（全量声明模式无法兼容 Ticket 逐个交付）。
> 本文档是收敛后的唯一可执行版本，包含三个必做步骤。

---

## 一、目标

扩展 `bin/prepare-mysql-init.sh`，使其支持 admin 端 19 个业务表 SQL 的**渐进式纳入**：

- 基础架构 SQL（00~06）：必须存在，缺失即 FAIL
- 业务表 SQL（07~25）：源文件存在才参与 generate/check，不存在则跳过
- Ticket 交付时：只写真源 `sql/xxx.sql`，不负责同步派生产物（由部署入口统一 generate）

**验收标准**：
1. `bash bin/prepare-mysql-init.sh` 输出 `PASS: ... 7/26 个 ...`（初始状态，无业务 SQL）
2. `bash bin/prepare-mysql-init.sh --check` 输出 `PASS: ... 7/26 个 ...`
3. 创建 `sql/osg_student_init.sql` 后，generate → PASS 8/26，--check → PASS 8/26
4. 所有 database Ticket 的 `allowed_paths.modify` 只包含 `sql/` 真源（不包含 `deploy/mysql-init/`）
5. `bin/docker-env-build.sh` 和 `bin/docker-env-up.sh` 在 `deploy-preflight.sh` 之前执行 generate

## 二、前置条件与假设

- 假设 1: `deploy-preflight.sh` 硬编码逐文件检查已删除（commit `8914f7c3`），只保留 `--check` 调用
- 假设 2: `deliver-ticket` SKILL 不直接调用 `--check` 或 generate（grep 验证），Ticket 只负责写 sql/ 真源
- 假设 3: `prepare-mysql-init.sh` 的 generate 模式是"全量重建"——先 `rm -f [0-9][0-9]_*.sql`，再重建所有 ACTIVE 映射

## 三、当前仓库状态

| 文件 | 状态 |
|------|------|
| bin/prepare-mysql-init.sh | MAPPINGS 已扩展到 26 条，但仍是全量强校验模式（无 ACTIVE_MAPPINGS）|
| bin/deploy-preflight.sh | 硬编码逐文件检查已删除，只调用 `--check` |
| 6 个 database Ticket YAML | `deploy/mysql-init/` 路径已删除（只剩 `sql/` 真源）|

**当前 `bash bin/prepare-mysql-init.sh --check` 结果**：FAIL（缺少 sql/osg_student_init.sql）

## 四、执行计划（三步，必须按序执行）

### Step 1: 渐进式纳入（ACTIVE_MAPPINGS）

**目标**：让 prepare-mysql-init.sh 在业务表 SQL 不存在时跳过而非 FAIL。

**修改文件**：`bin/prepare-mysql-init.sh`（1 个文件，8 处变更）

| # | 位置 | 变更 |
|---|------|------|
| S1-1 | line 79 前 | 新增 `REQUIRED_PREFIX_MAX=6` + `declare -a ACTIVE_MAPPINGS=()` |
| S1-2 | line 85-88 | 源文件不存在时：prefix ≤ 6 → FAIL，prefix > 6 → `continue`（跳过）|
| S1-3 | line 92 后 | 新增 `ACTIVE_MAPPINGS+=("${mapping}")` |
| S1-4 | line 116 (generate 循环) | `"${MAPPINGS[@]}"` → `"${ACTIVE_MAPPINGS[@]}"` |
| S1-5 | line 126 (manifest 循环) | `"${MAPPINGS[@]}"` → `"${ACTIVE_MAPPINGS[@]}"` |
| S1-6 | line 136 (count check) | `"${#MAPPINGS[@]}"` → `"${#ACTIVE_MAPPINGS[@]}"` |
| S1-7 | line 157 (--check manifest 循环) | `"${MAPPINGS[@]}"` → `"${ACTIVE_MAPPINGS[@]}"` |
| S1-8 | line 172/174 (PASS 输出) | `${#MAPPINGS[@]}` → `${#ACTIVE_MAPPINGS[@]}/${#MAPPINGS[@]}` |

**验证命令**：
```bash
bash bin/prepare-mysql-init.sh           # → PASS 7/26
bash bin/prepare-mysql-init.sh --check   # → PASS 7/26
```

### Step 2: Ticket 交付边界策略（开发/部署分离）

**目标**：database Ticket 只负责写真源 `sql/*.sql`，不负责同步派生产物。

**核心策略**（经 3 轮 Codex review 收敛）：

1. **Ticket 只写真源** — `allowed_paths.modify` 只包含 `sql/xxx_init.sql`，不包含任何 `deploy/mysql-init/` 路径
2. **generate 延迟到部署前** — `bash bin/prepare-mysql-init.sh` 在部署流程中由 `deploy-preflight.sh` 的上游步骤或 CI 触发，不在 Ticket 交付流程中执行
3. **Ticket 验证不依赖 `--check`** — Ticket 的 AC 验证是"SQL 语法正确+表结构符合 SRS"，不是"deploy 链路通过"
4. **不改框架** — deliver-ticket SKILL 的路径守卫保持原样

**为什么这是最简方案**（vs 之前的方案）：

| 被否决的方案 | 失败原因 |
|-------------|---------|
| 兼容版 D（每 Ticket 加 deploy/ 路径） | generate 全量重建，T-069 会重写 T-052 的派生产物 → 越界 |
| derived 字段 | 框架路径守卫只认 modify，derived 被忽略 |
| 每 Ticket 覆盖所有 active 派生产物 | Ticket 边界越来越宽，拆票隔离被破坏 |

**职责分离**：

```
开发阶段（/next → deliver-ticket）：
  Ticket 写 sql/xxx_init.sql → allowed_paths.modify 只有 sql/
  验证：SQL 语法检查（如 mysql --syntax-check 或简单 grep）

部署阶段（deploy-preflight.sh 之前）：
  bash bin/prepare-mysql-init.sh  → 全量重建 deploy/mysql-init/
  bash bin/prepare-mysql-init.sh --check  → 校验一致性
  deploy-preflight.sh → 完整预检
```

**修改文件**：6 个 database Ticket YAML

| # | Ticket | 修改内容 |
|---|--------|---------|
| S2-1~S2-6 | T-052/T-069/T-084/T-096/T-105/T-111 | 确认 `allowed_paths.modify` 只有 `sql/*.sql`（当前状态已满足，无需改动）|

**实际上 Step 2 不需要改任何 Ticket 文件**——上次修复已经删除了 `deploy/mysql-init/` 路径（commit `5bec6ca`），当前 6 个 Ticket 的 `allowed_paths.modify` 已经只有 `sql/` 真源。

**Ticket AC 不追加 generate 步骤**——generate 不是 Ticket 的职责。

**补充说明**：database 类型 Ticket 仍走 deliver-ticket SKILL 的 TDD 流程（SKILL.md line 401）。
上述验证命令仅为真源链相关的补充检查，不替代 Ticket 的完整交付标准。

### Step 3: 部署入口补 generate 调用

**目标**：在部署脚本调用 `deploy-preflight.sh`（含 `--check`）之前，先执行 `bash bin/prepare-mysql-init.sh`（generate）同步派生产物。

**修改文件**：2 个 deploy 入口脚本

| # | 文件 | 位置 | 变更 |
|---|------|------|------|
| S3-1 | bin/docker-env-build.sh | line 30 之前 | 新增 `bash bin/prepare-mysql-init.sh` |
| S3-2 | bin/docker-env-up.sh | line 30 之前 | 新增 `bash bin/prepare-mysql-init.sh` |

**目标代码**（以 docker-env-build.sh 为例）：
```bash
# line 30 之前新增：
bash bin/prepare-mysql-init.sh
bash bin/deploy-preflight.sh "${ENV_NAME}" --profile "${PROFILE_CSV}"
```

**验证命令**：
```bash
bash -n bin/docker-env-build.sh && echo "SYNTAX OK"
bash -n bin/docker-env-up.sh && echo "SYNTAX OK"
```

## 五、设计决策汇总

| # | 决策点 | 选择 | 理由 |
|---|--------|------|------|
| 1 | 业务表 SQL 缺失处理 | 渐进式纳入（skip） | 兼容 Ticket 逐个交付 |
| 2 | 开发 vs 部署校验 | Ticket 不执行 generate；generate + --check 在部署前执行 | 职责分离 |
| 3 | 派生产物边界 | Ticket 只写 sql/ 真源，deploy/ 派生产物延迟到部署前 generate | 开发/部署职责分离，避免全量重建越界 |
| 4 | 框架修改 | 不改 deliver-ticket SKILL | 项目级问题，开发/部署分离即可 |
| 5 | REQUIRED_PREFIX_MAX | 硬编码 6（00~06 必需）| 简单明确，后续扩展时同步修改 |

## 六、自校验

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 三步计划：Step 1 脚本改造 + Step 2 Ticket 边界确认 + Step 3 部署入口补 generate |
| G2 目标明确 | ✅ | 4 个可度量验收标准 |
| G7 改动自洽 | ✅ | Step 1: 7 个消费 MAPPINGS 的位置全部覆盖。Step 2: Ticket 只写 sql/ 真源，deploy/ 延迟到部署前 |
| G9 场景模拟 | ✅ | 初始(7/26) → T-052完成(8/26) → 全部完成(26/26) |
| G10 数值回验 | ✅ | Step 1: 8 处变更，Step 2: 0 处（已满足），Step 3: 2 处（docker-env-build.sh + docker-env-up.sh）|
| G11 引用回读 | ✅ | 仓库 deploy-preflight.sh 已确认无硬编码检查段 |
| G12 反向推导 | ✅ | 目标"T-052 能安全完成" → 需要 ACTIVE_MAPPINGS 跳过缺失源(Step 1) + Ticket 只写 sql/(Step 2，当前已满足) |
| C2 接口兼容 | ✅ | generate/--check 外部接口不变 |
| C3 回归风险 | ✅ | 00~06 走 REQUIRED 路径，行为与旧代码一致 |

## 七、维护约束

1. `REQUIRED_PREFIX_MAX=6` 是硬编码边界。新增"必需基础 SQL"时必须同步修改 MAPPINGS + 此值。
2. 新增业务表时，需要同时更新 MAPPINGS + 创建对应 database Ticket。
3. 部署前必须执行 `bash bin/prepare-mysql-init.sh` 同步派生产物。Step 3 已在 `docker-env-build.sh` 和 `docker-env-up.sh` 中补上。**但如果直接手动执行 `bash bin/deploy-preflight.sh`（绕过部署入口），必须先手动执行 `bash bin/prepare-mysql-init.sh`，否则 `--check` 会因派生产物缺失而 FAIL。**
