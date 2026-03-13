# MySQL-init 真源链扩展方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- **做什么**: 扩展 `bin/prepare-mysql-init.sh` 的 MAPPINGS 数组，纳入 admin 端 19 个业务表 SQL，使 database 类型 Ticket 可以通过正规真源链（`sql/ → prepare-mysql-init.sh → deploy/mysql-init/`）落地
- **验收标准**:
  1. `bash bin/prepare-mysql-init.sh` 生成 26 个 SQL 文件（原 7 + 新 19）
  2. `bash bin/prepare-mysql-init.sh --check` 校验通过
  3. `bash bin/deploy-preflight.sh test` 中 mysql-init 相关检查通过（需要先有 ruoyi-admin.jar，此项为设计验证，运行时才完整校验）
  4. 所有 database Ticket 的 `allowed_paths` 只引用 `sql/` 真源，不引用 `deploy/mysql-init/` 生成产物

## 二、前置条件与假设

- 假设 1: 新的业务表 SQL 文件尚未创建（`sql/osg_student_init.sql` 等不存在），本方案只修改基础设施链，不创建 SQL 内容
- 假设 2: 新 SQL 文件的编号从 07 开始，不与现有 00~06 冲突
- 假设 3: MySQL `docker-entrypoint-initdb.d` 按文件名字母序执行 `.sql` 文件，两位数字前缀保证顺序
- 假设 4: `deploy-preflight.sh` 的 line 254 `bash bin/prepare-mysql-init.sh --check` 已完整覆盖文件存在性+内容一致性+manifest 校验，line 265-273 的逐文件硬编码检查是冗余的

## 三、现状分析

### 真源链拓扑

```
sql/*.sql (SSOT 真源，7个文件)
    │
    ▼ bin/prepare-mysql-init.sh generate
    │   MAPPINGS 数组定义 "前缀:源文件名" 映射
    │   生成: deploy/mysql-init/XX_源文件名.sql + manifest.sha256
    │
deploy/mysql-init/ (生成产物，7个 SQL + manifest)
    │
    ├─ bin/prepare-mysql-init.sh --check (校验：文件存在+内容一致+manifest匹配)
    │     └─ 被 deploy-preflight.sh line 254 调用
    │
    ├─ bin/deploy-preflight.sh line 265-273 (冗余：硬编码逐文件 require_file_nonempty)
    │
    ├─ bin/final-closure.sh line 348-357 (只检查目录非空，不依赖文件名/数量)
    │
    └─ deploy/compose.base.yml line 17 (volume mount → MySQL initdb.d，按字母序执行)
```

### 存在的问题

1. `MAPPINGS` 数组固定 7 条，无法纳入新业务表
2. `rm -f` 清理用 `0[0-6]_*.sql` glob，只覆盖 00~06 前缀
3. 文件数量检查硬编码 `count != "7"`
4. `deploy-preflight.sh` 硬编码 7 个文件名
5. 6 个 Ticket YAML 的 `allowed_paths` 直接引用生成产物路径

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | 新 SQL 前缀范围 | A: 07~25 两位数 / B: 动态编号 | A | 两位数字前缀简单明确，26 个文件足够 admin 端，后续端再扩展 |
| 2 | deploy-preflight.sh 硬编码检查 | A: 删除冗余段 / B: 改为动态 | A | line 254 的 --check 已完整覆盖，硬编码段是纯冗余，删除最简单 |
| 3 | rm 清理 glob | A: `[0-9][0-9]_*.sql` / B: `[0-2][0-9]_*.sql` | A | 两位数字通配，简洁且支持未来扩展到 99 |
| 4 | 文件数量检查 | A: `${#MAPPINGS[@]}` 动态 / B: 硬编码 26 | A | 动态更健壮，后续加表不用再改这行 |
| 5 | Ticket allowed_paths | A: 只保留 sql/ 真源 / B: 保留两个 | A | Ticket 只负责写真源，生成产物由 CI/deploy 链路自动产出 |

## 五、目标状态

### 修改后的 prepare-mysql-init.sh 关键逻辑

```bash
declare -a MAPPINGS=(
  "00:ry_20250522.sql"
  ...
  "06:osg_alter_user_first_login.sql"
  # admin 端业务表
  "07:osg_student_init.sql"
  ...
  "25:osg_complaint_init.sql"
)

# 清理时用通用两位数匹配
rm -f "${OUT_DIR}"/[0-9][0-9]_*.sql

# 数量检查动态计算
expected_count="${#MAPPINGS[@]}"
count="$(find ... -name '[0-9][0-9]_*.sql' | wc -l)"
if [[ "${count}" != "${expected_count}" ]]; then ...

# 输出文本动态
echo "PASS: ... ${#MAPPINGS[@]} 个 ..."
```

### 修改后的 deploy-preflight.sh

```bash
# line 254 保留不动
bash bin/prepare-mysql-init.sh --check >/dev/null

# line 265-274 删除（冗余的硬编码逐文件检查）
```

## 六、执行清单

| # | 文件 | 位置 | 当前值 | 目标值 | 优先级 |
|---|------|------|--------|--------|--------|
| 1 | bin/prepare-mysql-init.sh | line 15-23 (MAPPINGS) | 7 条映射 | 26 条映射（追加 19 条业务表） | 🔴高 |
| 2 | bin/prepare-mysql-init.sh | line 94 (rm glob) | `0[0-6]_*.sql` | `[0-9][0-9]_*.sql` | 🔴高 |
| 3 | bin/prepare-mysql-init.sh | line 116-118 (count check) | `count != "7"` | `count != "${expected_count}"` + `expected_count="${#MAPPINGS[@]}"` | 🔴高 |
| 4 | bin/prepare-mysql-init.sh | line 151 (PASS text) | `（7 个）` | `（${#MAPPINGS[@]} 个）` | 🟡中 |
| 5 | bin/prepare-mysql-init.sh | line 153 (PASS text) | `7 个初始化 SQL` | `${#MAPPINGS[@]} 个初始化 SQL` | 🟡中 |
| 6 | bin/deploy-preflight.sh | line 265-274 | 7 个硬编码文件检查 | 删除整段 | 🔴高 |
| 7 | osg-spec-docs/tasks/tickets/T-052.yaml | allowed_paths.modify | `deploy/mysql-init/03_osg_student.sql` | 删除此行 | 🟡中 |
| 8 | osg-spec-docs/tasks/tickets/T-069.yaml | allowed_paths.modify | `deploy/mysql-init/04_osg_contract.sql` | 删除此行 | 🟡中 |
| 9 | osg-spec-docs/tasks/tickets/T-084.yaml | allowed_paths.modify | `deploy/mysql-init/05_osg_student_change_request.sql` | 删除此行 | 🟡中 |
| 10 | osg-spec-docs/tasks/tickets/T-096.yaml | allowed_paths.modify | `deploy/mysql-init/06_osg_staff.sql` | 删除此行 | 🟡中 |
| 11 | osg-spec-docs/tasks/tickets/T-105.yaml | allowed_paths.modify | `deploy/mysql-init/07_osg_staff_schedule.sql` | 删除此行 | 🟡中 |
| 12 | osg-spec-docs/tasks/tickets/T-111.yaml | allowed_paths.modify | `deploy/mysql-init/08_osg_position.sql` | 删除此行 | 🟡中 |

## 七、自校验结果

### 第 1 轮

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 拓扑图清晰，执行清单 12 项，每项一目了然 |
| G2 目标明确 | ✅ | 4 个可度量验收标准 |
| G3 假设显式 | ✅ | 4 个假设均已列出 |
| G4 设计决策完整 | ✅ | 5 个决策点，每个有选项+理由 |
| G5 执行清单可操作 | ✅ | 每项有精确文件+行号+当前值+目标值 |
| G6 正向流程走读 | ✅ | generate → --check → deploy-preflight → compose.base.yml → MySQL initdb.d，每步有效 |
| G7 改动自洽 | ✅ | 改了 MAPPINGS → 检查了 rm glob / count check / PASS text / deploy-preflight / Tickets |
| G8 简约不等于省略 | ✅ | manifest.sha256 自动覆盖新文件，final-closure.sh 不用改，compose.base.yml 不用改 |
| G9 场景模拟 | ✅ | 场景1: generate 26个→count=26→PASS; 场景2: --check 缺少 sql/osg_student_init.sql→FAIL（正确行为，因为 SQL 尚未创建） |
| G10 数值回验 | ✅ | 执行清单 12 项 = 6 shell 变更 + 6 ticket 变更，与详细分析一致 |
| G11 引用回读 | ✅ | 所有行号从 read_file 实际输出确认：MAPPINGS=L15-23, rm=L94, count=L116, PASS=L151/153, preflight=L265-274 |
| G12 反向推导 | ✅ | 目标"所有引用 mysql-init 的地方都兼容新文件"→ 反向查 grep 结果 10 个文件全覆盖 |
| C1 根因定位 | ✅ | 根因是 MAPPINGS 硬编码，不是 Ticket 路径问题 |
| C2 接口兼容 | ✅ | prepare-mysql-init.sh 的 generate/--check 接口不变 |
| C3 回归风险 | ✅ | 现有 7 个 SQL 的映射不变，只是追加新映射 |
| C4 测试覆盖 | ✅ | `bash bin/prepare-mysql-init.sh --check` 即为集成测试 |
