---
name: test-execution
description: "Use when executing tests for a Ticket - runs tests, validates coverage, and records evidence"
metadata:
  invoked-by: "agent"
  auto-execute: "true"
---

# Test-Execution Skill

## 概览

测试执行技能，负责运行测试、验证覆盖率、记录证据。与 `test-design` Skill 配合使用，确保测试质量。

## ⚠️ 铁律

```
1. 必须先运行测试，再检查覆盖率
2. 覆盖率不达标禁止声明完成
3. 必须记录完整的验证证据
4. 禁止伪造测试结果
```

---

## 🎯 覆盖率门槛

| 类型 | backend | database | test | frontend | frontend-ui | config |
|------|---------|----------|------|----------|-------------|--------|
| 分支覆盖率 | **100%** | **100%** | **100%** | 90% | 80% | — |
| 行覆盖率 | 90% | 90% | 90% | 80% | 70% | — |
| 测试通过率 | **100%** | **100%** | **100%** | **100%** | **100%** | — |

---

## 📋 执行流程

```
[读取测试用例]
    │
    ▼
[运行单元测试]
    │ - 执行测试命令
    │ - 捕获输出
    │
    ▼
[检查测试结果] ──── 有失败？──→ [分析失败原因]
    │ ✅ 全部通过                    │
    │                               ▼
    │                          [修复代码]
    │                               │
    │                               ▼
    │                          [重新运行测试]
    │                               │
    ▼ ◄─────────────────────────────┘
[生成覆盖率报告]
    │
    ▼
[检查覆盖率] ──── 不达标？──→ [补充测试用例]
    │ ✅ 达标                        │
    │                               ▼
    │                          [重新运行测试]
    │                               │
    ▼ ◄─────────────────────────────┘
[记录验证证据]
    │
    ▼
[输出测试报告]
```

---

## 🔧 测试命令配置

### 后端测试命令 (Java/Maven)

```yaml
# 从 config.yaml 读取
commands:
  # 运行所有测试
  test: "mvn test"

  # 运行指定测试类
  test_single: "mvn test -Dtest={TestClass}"

  # 运行测试并生成覆盖率报告
  test_coverage: "mvn test jacoco:report"

  # 检查覆盖率门槛
  coverage_check: "mvn jacoco:check"

  # 覆盖率报告路径
  coverage_report: "target/site/jacoco/index.html"
```

### 前端测试命令 (Vitest)

```yaml
commands:
  frontend:
    # 运行所有测试
    test: "pnpm --dir ${frontend.package_dir} test"

    # 运行指定测试文件
    test_single: "pnpm --dir ${frontend.package_dir} test {testFile}"

    # 运行测试并生成覆盖率报告
    test_coverage: "pnpm --dir ${frontend.package_dir} test:coverage"

    # 覆盖率报告路径
    coverage_report: "${frontend.package_dir}/coverage/index.html"
```

---

## 📊 覆盖率报告解析

### JaCoCo 报告解析 (Java)

```python
def parse_jacoco_report(report_path):
    """解析 JaCoCo 覆盖率报告"""

    # 读取 jacoco.xml
    tree = ET.parse(f"{report_path}/jacoco.xml")
    root = tree.getroot()

    coverage = {
        "line": {
            "covered": 0,
            "missed": 0,
            "percentage": 0
        },
        "branch": {
            "covered": 0,
            "missed": 0,
            "percentage": 0
        },
        "method": {
            "covered": 0,
            "missed": 0,
            "percentage": 0
        }
    }

    for counter in root.findall(".//counter"):
        type = counter.get("type").lower()
        if type in coverage:
            covered = int(counter.get("covered"))
            missed = int(counter.get("missed"))
            total = covered + missed
            coverage[type] = {
                "covered": covered,
                "missed": missed,
                "percentage": round(covered / total * 100, 2) if total > 0 else 0
            }

    return coverage
```

### Vitest 报告解析 (TypeScript)

```python
def parse_vitest_report(report_path):
    """解析 Vitest 覆盖率报告"""

    # 读取 coverage-summary.json
    with open(f"{report_path}/coverage-summary.json") as f:
        data = json.load(f)

    total = data.get("total", {})

    return {
        "line": {
            "covered": total.get("lines", {}).get("covered", 0),
            "total": total.get("lines", {}).get("total", 0),
            "percentage": total.get("lines", {}).get("pct", 0)
        },
        "branch": {
            "covered": total.get("branches", {}).get("covered", 0),
            "total": total.get("branches", {}).get("total", 0),
            "percentage": total.get("branches", {}).get("pct", 0)
        },
        "function": {
            "covered": total.get("functions", {}).get("covered", 0),
            "total": total.get("functions", {}).get("total", 0),
            "percentage": total.get("functions", {}).get("pct", 0)
        }
    }
```

---

## 📝 验证证据格式

### 完整的 verification_evidence 结构

```yaml
verification_evidence:
  # 基本信息
  command: "{实际执行的测试命令}"
  exit_code: 0
  timestamp: "{ISO8601_UTC}"

  # 测试结果
  test_result:
    total: 15
    passed: 15
    failed: 0
    skipped: 0
    duration_ms: 3500

  # 覆盖率结果
  coverage:
    line:
      covered: 180
      total: 200
      percentage: 90.0
    branch:
      covered: 50
      total: 50
      percentage: 100.0
    method:
      covered: 25
      total: 25
      percentage: 100.0

  # 未覆盖的代码（如有）
  uncovered_lines: []
  uncovered_branches: []

  # 输出摘要
  output_summary: "Tests run: 15, Failures: 0, Errors: 0, Skipped: 0"
```

---

## 🔍 测试失败分析

### 失败类型分类

| 失败类型 | 描述 | 处理方式 |
|----------|------|----------|
| 断言失败 | 预期值与实际值不匹配 | 检查代码逻辑或测试用例 |
| 编译错误 | 代码无法编译 | 修复语法错误 |
| 运行时异常 | 未捕获的异常 | 添加异常处理或修复代码 |
| 超时 | 测试执行超时 | 优化代码或增加超时时间 |
| 依赖错误 | Mock 配置错误 | 检查 Mock 设置 |

### 失败分析流程

```python
def analyze_test_failure(failure):
    """分析测试失败原因"""

    # 1. 解析错误信息
    error_type = classify_error(failure.message)

    # 2. 定位失败位置
    location = {
        "test_class": failure.test_class,
        "test_method": failure.test_method,
        "line": failure.line_number
    }

    # 3. 分析根因
    if error_type == "assertion":
        root_cause = analyze_assertion_failure(failure)
    elif error_type == "exception":
        root_cause = analyze_exception(failure)
    elif error_type == "timeout":
        root_cause = analyze_timeout(failure)
    else:
        root_cause = "未知错误，需要人工分析"

    # 4. 生成修复建议
    suggestion = generate_fix_suggestion(error_type, root_cause)

    return {
        "error_type": error_type,
        "location": location,
        "root_cause": root_cause,
        "suggestion": suggestion
    }
```

---

## 📋 执行伪代码

```python
def execute_tests(ticket, config):
    """执行测试并验证覆盖率"""

    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        retry_count += 1
        print(f"🧪 测试执行 (第 {retry_count} 次)")

        # Step 1: 运行测试
        if ticket.type in ("backend", "database", "test"):
            test_cmd = config.commands.test_coverage
        else:
            test_cmd = config.commands.frontend.test_coverage

        result = bash(test_cmd)

        # Step 2: 检查测试结果
        if result.exit_code != 0:
            print(f"❌ 测试失败")

            # 分析失败原因
            failures = parse_test_failures(result.stdout)
            for failure in failures:
                analysis = analyze_test_failure(failure)
                print(f"  - {analysis['location']['test_method']}: {analysis['root_cause']}")
                print(f"    建议: {analysis['suggestion']}")

            # 尝试自动修复
            if can_auto_fix(failures):
                apply_auto_fix(failures)
                continue  # 重新运行测试
            else:
                return {
                    "status": "failed",
                    "reason": "test_failure",
                    "failures": failures
                }

        print("✅ 测试全部通过")

        # Step 2.5: 断言密度检查（每个测试方法必须有 ≥1 个断言）
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
        print("✅ 断言密度检查通过")

        # Step 3: 解析覆盖率报告
        if ticket.type in ("backend", "database", "test"):
            coverage = parse_jacoco_report(config.commands.coverage_report)
        else:
            coverage = parse_vitest_report(config.commands.frontend.coverage_report)

        print(f"📊 覆盖率报告:")
        print(f"  - 行覆盖率: {coverage['line']['percentage']}%")
        print(f"  - 分支覆盖率: {coverage['branch']['percentage']}%")

        # Step 4: 检查覆盖率门槛
        thresholds = get_coverage_thresholds(ticket.type)

        coverage_ok = True
        if coverage['branch']['percentage'] < thresholds['branch']:
            print(f"❌ 分支覆盖率不达标: {coverage['branch']['percentage']}% < {thresholds['branch']}%")
            coverage_ok = False

        if coverage['line']['percentage'] < thresholds['line']:
            print(f"❌ 行覆盖率不达标: {coverage['line']['percentage']}% < {thresholds['line']}%")
            coverage_ok = False

        if not coverage_ok:
            # 列出未覆盖的代码
            uncovered = get_uncovered_code(coverage)
            print("未覆盖的代码:")
            for item in uncovered:
                print(f"  - {item['file']}:{item['line']} - {item['type']}")

            return {
                "status": "coverage_insufficient",
                "coverage": coverage,
                "uncovered": uncovered,
                "hint": "请补充测试用例覆盖以上代码"
            }

        print("✅ 覆盖率达标")

        # Step 5: 记录验证证据
        evidence = {
            "command": test_cmd,
            "exit_code": 0,
            "timestamp": now(),
            "test_result": parse_test_summary(result.stdout),
            "coverage": coverage,
            "output_summary": extract_summary(result.stdout)
        }

        return {
            "status": "passed",
            "evidence": evidence
        }

    # 超过最大重试次数
    return {
        "status": "max_retries_exceeded",
        "reason": f"经过 {max_retries} 次尝试仍未通过"
    }


def get_coverage_thresholds(ticket_type):
    """获取覆盖率门槛"""

    thresholds = {
        "backend": {"branch": 100, "line": 90},
        "database": {"branch": 100, "line": 90},
        "test": {"branch": 100, "line": 90},
        "frontend": {"branch": 90, "line": 80},
        "frontend-ui": {"branch": 80, "line": 70},
        "config": {"branch": 0, "line": 0}  # 配置类不要求覆盖率
    }

    return thresholds.get(ticket_type, {"branch": 80, "line": 70})
```

---

## 📊 输出格式

### 测试通过报告

```markdown
## ✅ 测试执行报告

### 测试结果
- 总用例数: 15
- 通过: 15
- 失败: 0
- 跳过: 0
- 执行时间: 3.5s

### 覆盖率
| 类型 | 覆盖 | 总数 | 百分比 | 门槛 | 状态 |
|------|------|------|--------|------|------|
| 行覆盖 | 180 | 200 | 90.0% | 90% | ✅ |
| 分支覆盖 | 50 | 50 | 100.0% | 100% | ✅ |
| 方法覆盖 | 25 | 25 | 100.0% | - | ✅ |

### 验证证据
```yaml
command: "mvn test jacoco:report"
exit_code: 0
output_summary: "Tests run: 15, Failures: 0, Errors: 0"
timestamp: "2026-02-12T10:00:00Z"
```
```

### 测试失败报告

```markdown
## ❌ 测试执行报告

### 测试结果
- 总用例数: 15
- 通过: 13
- 失败: 2
- 跳过: 0

### 失败详情

#### 失败 1: UserServiceTest.should_返回错误_when_用户不存在
- **类型**: 断言失败
- **位置**: UserServiceTest.java:45
- **预期**: "用户不存在"
- **实际**: "User not found"
- **根因**: 错误消息未国际化
- **建议**: 检查 UserService.findById() 的错误消息

#### 失败 2: UserServiceTest.should_抛出异常_when_参数为null
- **类型**: 运行时异常
- **位置**: UserServiceTest.java:60
- **异常**: NullPointerException
- **根因**: 未对 null 参数进行校验
- **建议**: 在方法开头添加参数校验

### ⏭️ 下一步
修复以上问题后重新运行测试
```

---

## 硬约束

- 禁止在测试失败时声明完成
- 禁止在覆盖率不达标时声明完成
- 禁止伪造测试结果或覆盖率数据
- 必须记录完整的 verification_evidence
- 必须输出覆盖率报告
- 分支覆盖率必须达到 100%（后端/数据库/测试类型）
- 测试通过率必须达到 100%
