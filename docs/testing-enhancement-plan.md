# 测试能力补强方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- **一句话**：补强 RPIV 测试框架的 3 个重大缺口（集成测试触发、database 验证增强、E2E 测试框架），将测试能力从 40 分提升到 55 分（满分 90）
- **核心目标**：核心类型（backend/frontend/test）超越专业测试人员，辅助类型（database/frontend-ui/config）达到持平
- **本次验收标准**：
  1. 集成测试在 Story 验收时自动执行（verification Phase 2 调用 `mvn verify`）
  2. database 类型 Ticket 的 Level 1 验证从“只编译”升级为“执行相关测试”
  3. E2E 测试框架定义完成（config.yaml + 测试命令 + 触发时机）
  4. test-execution 覆盖率门槛表补全（T-1 修复）
  5. 测试用例矩阵持久化到文件（test-design 写入、deliver-ticket 读取）
  6. 测试质量五重保障：AC 覆盖检查 + AC 关联 + TDD Red 强制失败 + 断言密度 + 分支覆盖率 100%

## 二、前置条件与假设

- 假设 1: config.yaml 是测试配置的 SSOTbrainstorming
- 假设 2: 当前项目尚未有实际的集成测试代码和 E2E 测试代码，本次只做框架定义
- 假设 3: E2E 测试使用 Playwright（与 MCP 工具链一致）
- 假设 4: 遵循"最短路径"原则——先定义框架，实际测试代码在开发 Ticket 时编写

## 三、现状分析

### 测试能力评分

| 能力维度　　 | 满分　 | 当前　 | 目标　 | 差距　　　　　　　　　　　　　 |
| --------------| --------| --------| --------| --------------------------------|
| 单元测试　　 | 10　　 | 9　　　| 9　　　| —　　　　　　　　　　　　　　　|
| 回归测试　　 | 10　　 | 8　　　| 8　　　| —　　　　　　　　　　　　　　　|
| API 测试　　 | 10　　 | 8　　　| 8　　　| —　　　　　　　　　　　　　　　|
| 集成测试　　 | 10　　 | 2　　　| **7**　| 有配置无执行 → 自动触发　　　　|
| E2E 测试　　 | 10　　 | 0　　　| **5**　| 完全缺失 → 框架定义　　　　　　|
| 性能测试　　 | 10　　 | 1　　　| 1　　　| 暂不补强　　　　　　　　　　　 |
| 安全测试　　 | 10　　 | 3　　　| 3　　　| 暂不补强　　　　　　　　　　　 |
| 数据库测试　 | 10　　 | 2　　　| **5**　| 只编译 → 执行测试　　　　　　　|
| 测试质量保障 | 10　　 | 7　　　| **9**　| 五重保障（E-10/11/12/13 + L3） |
| **总分**　　 | **90** | **40** | **55** | **+15**　　　　　　　　　　　　|

### 相关文件清单

| 文件 | 角色 | 需要修改？ |
|------|------|-----------|
| `config.yaml` | 测试配置 SSOT | ✅ E2E 配置 + 矩阵路径（E-4, E-8a） |
| `test-execution/SKILL.md` | 测试执行 | ✅ 表格修复 + 断言检查（E-1, E-10） |
| `deliver-ticket/SKILL.md` | Ticket 交付 | ✅ database + 流程图注释 + 矩阵读取 + TDD Red（E-2, E-7, E-8c, E-11） |
| `verification/SKILL.md` | Story 验收 | ✅ 集成测试代码 + 表格（E-3, E-3b） |
| `testing.md` | 测试规范 | ✅ 集成测试 + E2E 说明（E-5） |
| `rpiv.md` | RPIV 主流程 | ✅ E2E 提示（E-6） |
| `test-design/SKILL.md` | 测试用例设计 | ✅ 矩阵写入 + AC 关联 + AC 覆盖检查（E-8b, E-12, E-13） |

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| D1 | 集成测试在哪个阶段执行 | A: Ticket Level 2<br>B: Story 验收 Phase 2<br>C: 两者都执行 | **B** | Ticket 级别执行太频繁（每个 Ticket 都跑一次太慢），Story 级别执行一次即可覆盖跨 Ticket 集成 |
| D2 | database 类型验证用什么命令 | A: `mvn test -Dtest=*Mapper*`<br>B: `mvn test` 全量<br>C: `mvn compile` 保持现状 | **A** | 只跑 Mapper 相关测试，比全量快，比只编译有效 |
| D3 | E2E 测试框架 | A: Playwright<br>B: Cypress<br>C: 暂不定义 | **A** | 项目已有 mcp-playwright，技术栈一致 |
| D4 | E2E 测试触发时机 | A: 每个 Story 验收时<br>B: all_stories_done 时<br>C: 手动触发 | **B+C** | Story 验收时可选执行，all_stories_done 时强制执行 |

## 五、目标状态

### 测试金字塔（修改后）

```
                    ┌─────────┐
                    │  E2E    │ ← 新增：Playwright，all_stories_done 时执行
                    ├─────────┤
                  ┌─┤ 集成测试 ├─┐ ← 补强：Story 验收 Phase 2 执行 mvn verify
                  │ ├─────────┤ │
                ┌─┤ │ API 测试 │ ├─┐ ← 已有：test-design 5 维度
                │ │ ├─────────┤ │ │
              ┌─┤ │ │ 回归测试 │ │ ├─┐ ← 已有：Level 2 + Story 全量
              │ │ │ ├─────────┤ │ │ │
            ┌─┤ │ │ │ 单元测试 │ │ │ ├─┐ ← 已有：TDD + test-design + 覆盖率门控
            └─┴─┴─┴─┴─────────┴─┴─┴─┘
```

### deliver-ticket database 验证（修改后）

```python
# 当前：
if ticket.type == "database":
    cmd = "mvn compile -pl ruoyi-admin -am -q"

# 修改后：
if ticket.type == "database":
    cmd = "mvn test -Dtest='*Mapper*,*Repository*'"
```

### verification Phase 2 集成测试（新增步骤）

```python
# Phase 2 功能验收中，在全量测试之后新增：
# 2.1b 集成测试（如果 config.testing.integration.enabled）
if config.testing.integration.enabled:
    integration_result = bash(config.testing.integration.command)
    if integration_result.exit_code != 0:
        issues.append(("integration_test", "all",
            f"集成测试失败: {extract_failure_summary(integration_result)}"))
```

### config.yaml 新增配置（E-4 + E-8a）

**E-4 E2E 配置**（加在 testing 节末尾）：
```yaml
  # E2E 测试（Playwright）
  e2e:
    enabled: true
    framework: playwright
    command: "cd osg-frontend && npx playwright test"
    report: "osg-frontend/playwright-report"
    trigger: "manual"  # manual | auto
```

**E-8a 矩阵路径**（加在 tasks 节）：
```yaml
  tasks:
    test_matrices: "osg-spec-docs/tasks/test-matrices/"
```

### 测试质量五重保障（E-10 ~ E-13 新增）

**五重保障链**：
```
E-13 AC覆盖检查 → E-12 AC关联 → E-11 TDD Red → E-10 断言密度 → L3 覆盖率100%
  ↑ 每个AC有测试    ↑ 可追溯      ↑ 先写测试    ↑ 有断言       ↑ 分支全覆盖
```

**适用范围**：

| Ticket Type | E-13 AC覆盖 | E-12 AC关联 | E-11 TDD Red | E-10 断言 | L3 覆盖率 |
|-------------|------------|------------|-------------|----------|----------|
| backend | ✅ | ✅ | ✅ | ✅ | ✅ 100% |
| database | ✅ | ✅ | ✅ | ✅ | ✅ 100% |
| test | ✅ | ✅ | ✅ | ✅ | ✅ 100% |
| frontend | ⚠️ 建议 | ⚠️ 建议 | ⚠️ 建议 | ⚠️ 建议 | ✅ 90% |
| frontend-ui | — | — | — | — | ✅ 80% |
| config | — | — | — | — | — |

> 五重保障完全适用于核心类型（backend/database/test），frontend 建议但不强制，frontend-ui/config 不适用（它们的验证以 lint+build 为主）。

**E-10 断言密度检查**（加在 test-execution 伪代码中）：
```python
# Step 2.5: 断言密度检查（测试通过后、覆盖率检查前）
for test_class in get_test_classes():
    for test_method in get_test_methods(test_class):
        assertion_count = count_assertions(test_method)
        # 断言关键词: assertEquals, assertTrue, assertFalse, assertThrows,
        #            assertNotNull, assertThat, verify, expect
        if assertion_count == 0:
            return {
                "status": "failed",
                "reason": f"{test_class}.{test_method} 没有断言，测试无效"
            }
```

**E-11 TDD Red 验证**（加在 deliver-ticket TDD Red 阶段）：
```python
# TDD Red: 写完测试后，运行测试必须失败
red_result = bash(f"mvn test -Dtest={test_class}")
if red_result.exit_code == 0:
    print("⚠️ TDD Red 失败：测试应该失败但通过了")
    print("  可能原因：测试没有断言，或断言条件错误")
    print("  请检查测试代码，确保有正确的断言")
    return {"status": "tdd_red_failed", "reason": "测试应该失败但通过了"}
```

**E-12 测试用例关联 AC**（加在 test-design Phase 2 模板中）：
```python
# 每个测试用例必须标注对应的 AC
for tc in test_matrix.test_cases:
    if not tc.get("ac_ref"):
        issues.append(f"TC {tc.id} 没有关联 Ticket AC (缺少 ac_ref 字段)")
```

**E-13 AC 测试覆盖率检查**（加在 test-design Phase 2 末尾，矩阵写入前）：
```python
# 检查每个 Ticket AC 至少有 1 个测试用例
for ac in ticket.acceptance_criteria:
    ac_tests = [tc for tc in test_matrix.test_cases if tc.ac_ref == ac.id]
    if len(ac_tests) == 0:
        issues.append(f"AC '{ac.description}' 没有对应的测试用例")
if issues:
    print(f"❌ AC 测试覆盖率检查失败: {len(issues)} 个 AC 未覆盖")
    # 补充缺失的测试用例后重新检查
```

### 测试用例矩阵持久化（E-8 新增）

**存储位置**：`osg-spec-docs/tasks/test-matrices/{ticket_id}.yaml`

**文件格式**：
```yaml
ticket_id: T-001-001
ticket_type: backend
target_code:
  - file: "src/main/java/com/osg/service/LoginService.java"
    methods: ["login(String, String)"]

branches:
  total: 8
  items:
    - id: B1
      location: "LoginService.java:25"
      condition: "username == null"
      type: "if"

test_cases:
  total: 15
  items:
    - id: TC1
      branch: B1
      ac_ref: AC-1              # E-12: 关联 Ticket AC
      method: equivalence_partitioning
      type: negative
      input: { username: null, password: "valid123" }
      expected: "throw NullPointerException"

coverage_target:
  branch: 100%
  line: 90%

design_methods_applied:
  - equivalence_partitioning
  - boundary_value_analysis
  - decision_table

created_at: "2026-02-18T23:50:00+08:00"
```

**数据流**：
```
test-design Phase 2 → 写入矩阵文件
    ↓
deliver-ticket TDD Red → 读取矩阵文件 → 编写测试代码
    ↓
未来校验 → 读取矩阵文件 → 对比测试代码是否遗漏
```

## 六、执行清单

### ✅ 本次执行（15 项修改）

| # | 文件 | 位置 | 当前值 | 目标值 | 解决什么 |
|---|------|------|--------|--------|----------|
| E-1 | `test-execution/SKILL.md` | 第 28-32 行 | 覆盖率表只有 3 列，database=N/A | 扩展为 6 种 type，database=100%/90% | T-1 错误信息修复 |
| E-2 | `deliver-ticket/SKILL.md` | 第 491-492 行 | database 只做 `mvn compile` | 改为 `mvn test -Dtest='*Mapper*,*Repository*'`（不指定 -pl，覆盖所有模块） | database 验证增强 |
| E-3 | `verification/SKILL.md` | Phase 2 第 218-219 行之间 | 无集成测试步骤 | 新增集成测试步骤（读取 config.testing.integration） | 集成测试触发 |
| E-3b | `verification/SKILL.md` | 第 83-85 行检查项表格 | Phase 2 表格无集成测试行 | 新增一行：集成测试 / 执行 mvn verify / exit_code=0 | 表格与代码同步 |
| E-4 | `config.yaml` | 第 235 行后 | 无 E2E 配置 | 新增 e2e 配置（Playwright 命令 + 触发时机） | E2E 框架定义 |
| E-5 | `testing.md` | 第 68 行后 | 无集成测试和 E2E 说明 | 新增集成测试和 E2E 测试说明 | 测试规范补全 |
| E-6 | `rpiv.md` | 第 66 行 `all_stories_done` 阶段 | 只提示新需求模块 | 加 E2E 测试提示 | 用户知道可以执行 E2E |
| E-7 | `deliver-ticket/SKILL.md` | 流程图 B 第 197 行后、流程图 E 第 236 行后 | 流程图直接跳到“更新状态” | 加注释：“❗ 流程 B/E 完成后仍需经过 Step 4~8” | 消除流程图与伪代码的歧义 |
| E-8a | `config.yaml` | 第 88 行 tasks 节 | 无 test_matrices 路径 | 新增 `test_matrices: "osg-spec-docs/tasks/test-matrices/"` | 测试矩阵存储路径 |
| E-8b | `test-design/SKILL.md` | Phase 2 末尾 | 矩阵只在 AI 上下文中 | 新增“写入矩阵文件”步骤 | 矩阵持久化（写入） |
| E-8c | `deliver-ticket/SKILL.md` | TDD Red 阶段前 | 无读取矩阵步骤 | 新增"读取矩阵文件"步骤（**文件不存在则先调用 test-design**） | 矩阵持久化（读取）+ 防跳步 |
| E-10 | `test-execution/SKILL.md` | 伪代码 Step 2 之后 | 无断言检查 | 新增断言密度检查：每个测试方法必须有 ≥1 个断言 | 防止空测试 |
| E-11 | `deliver-ticket/SKILL.md` | TDD Red 阶段（第 93 行） | 无强制失败验证 | 新增 TDD Red 验证：运行测试必须失败，否则拒绝进入 Green | 强制先写测试再写代码 |
| E-12 | `test-design/SKILL.md` | Phase 2 测试用例模板 | 无 ac_ref 字段 | 每个测试用例必须有 ac_ref 字段关联 Ticket AC | 防止断言与业务脱节 |
| E-13 | `test-design/SKILL.md` | Phase 2 末尾（矩阵写入前） | 无 AC 覆盖检查 | 新增检查：每个 Ticket AC 至少有 1 个测试用例 | 防止业务场景遗漏 |

### ⏸️ 暂缓记录（后续在实际开发中补充）

| # | 内容 | 暂缓原因 |
|---|------|----------|
| P-1 | 编写实际的集成测试代码 | 需要有业务代码后才能写 |
| P-2 | 编写实际的 E2E 测试脚本 | 需要有前端页面后才能写 |
| P-3 | 性能测试框架 | 优先级低，先跑通功能 |
| P-4 | 安全扫描工具集成 | 优先级低 |
| P-5 | 变异测试（PIT/Stryker） | 优先级低 |
| P-6 | 视觉回归测试 | 需要 UI 稳定后才有意义 |

## 七、自校验结果

### 基础校验

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 15 项修改，每项有精确位置和目标值 |
| G2 目标明确 | ✅ | 6 条验收标准可度量 |
| G5 执行清单可操作 | ✅ | 每项都是加几行代码/配置 |
| G7 改动自洽 | ✅ | config.yaml 加 E2E 配置 → verification 读取 → testing.md 说明 |

### 深度校验：每种 Ticket Type 的测试能力 vs 专业测试人员

| Ticket Type | 修改前 | 修改后 | vs 专业测试人员 | 说明 |
|-------------|--------|--------|----------------|------|
| **backend** | 强 | 强+ | **超越** | 5 种设计方法 + TDD + 覆盖率门控 + 集成测试 |
| **database** | 弱 | 中 | **持平** | Mapper 测试覆盖 CRUD + 约束（MyBatis 执行实际 SQL） |
| **test** | 强 | 强 | **超越** | 分支覆盖 100% + TDD |
| **frontend** | 强 | 强+ | **超越** | Vitest 模板 + E2E 框架 |
| **frontend-ui** | 中 | 中 | **略低** | 缺视觉回归，但当前阶段可接受（UI 未稳定） |
| **config** | 弱 | 弱 | **略低** | 但风险低，config 类型 Ticket 通常很简单 |

### 深度校验：测试执行链路完整性

| 测试类型 | 触发 | 执行命令 | 结果收集 | 门控 | 证据 | 状态 |
|----------|------|---------|---------|------|------|------|
| 单元测试 | deliver-ticket Step 5 | `mvn test` / `pnpm test` | exit_code | exit_code=0 | evidence | ✅ |
| 覆盖率 | test-execution | `mvn test jacoco:report` | JaCoCo XML | branch/line 门槛 | evidence.coverage | ✅ |
| 回归测试 | deliver-ticket Step 6 | `mvn test` | exit_code | exit_code=0 | evidence.regression | ✅ |
| 集成测试 | verification Phase 2 | `mvn verify` | exit_code | exit_code=0 | Story 验收结果 | ✅ 新增 |
| E2E 测试 | 手动/all_stories_done | `npx playwright test` | exit_code + 报告 | exit_code=0 | 手动确认 | ✅ 新增 |

### 场景模拟

**场景 1：backend Story 验收**
1. Phase 2 全量测试：`mvn test` → 通过
2. Phase 2 集成测试（新增）：`mvn verify -Pintegration-test` → 通过
3. Phase 2 覆盖率检查：branch 100%, line 92% → 通过
4. Phase 3 终审 → 通过

**场景 2：database Ticket 完成**
1. Level 1 验证（修改后）：`mvn test -Dtest='*Mapper*,*Repository*'` → 通过
2. Level 2 回归：`mvn test` → 通过
3. 写入 evidence → Ticket done

**场景 3：all_stories_done 后 E2E 测试**
1. 所有 Stories 完成
2. 用户选择执行 E2E：`cd osg-frontend && npx playwright test`
3. E2E 通过 → 项目完成

**场景 4：backend Ticket 的五重质量保障链**
1. test-design：生成矩阵 → E-13 检查每个 AC 有测试用例 ✅ → E-12 每个 TC 有 ac_ref ✅ → 写入矩阵文件
2. TDD Red：读取矩阵 → 编写测试代码 → 运行测试 → E-11 确认失败 ✅
3. TDD Green：写实现代码 → 测试通过
4. test-execution：E-10 断言密度检查 ✅ → 覆盖率 100% ✅
5. 五重保障全部通过 → 进入增强终审

### 已知不改项（低优先级，实际使用中自然暴露）

| # | 问题 | 不改原因 |
|---|------|----------|
| T-2 | 两套命令定义（顶层 commands vs testing.commands） | 值相同，实际不会出错 |
| T-3 | test-execution 硬编码覆盖率门槛 | 伪代码是指导性的，AI 执行时会读 config |
| T-4 | test-design 3 档与 5 种 type 无映射 | AI 可推断 |
| T-5 | evidence 结构不统一 | verification 只读 exit_code，当前不影响 |
| T-6 | backend 可能重复跑 3 次 mvn test | 效率问题，AI 可自行优化 |
