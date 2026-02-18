---
name: test-design
description: "Use when designing test cases for any Ticket - ensures 100% branch coverage with systematic test case generation"
metadata:
  invoked-by: "agent"
  auto-execute: "true"
---

# Test-Design Skill

## 概览

测试用例设计技能，确保每个 Ticket 的测试用例精确覆盖所有代码分支。这是框架中**最重要的质量保障环节**。

## ⚠️ 铁律

```
1. 先分析代码分支，再写测试用例
2. 每个 if-else 分支必须有对应的测试用例
3. 测试用例必须包含：正向测试 + 负向测试 + 边界测试
4. 禁止跳过任何分支
5. 禁止在覆盖率不达标时声明完成
```

## 何时使用

- `/next` 命令执行 Ticket 时（TDD 红灯阶段之前）
- 需要为新功能设计测试用例
- 需要为 Bug 修复设计回归测试

---

## 🎯 测试覆盖率目标

| 覆盖率类型 | 核心业务 | 一般业务 | 工具类 |
|-----------|---------|---------|--------|
| 行覆盖率 (Line) | ≥ 90% | ≥ 80% | ≥ 70% |
| 分支覆盖率 (Branch) | **100%** | ≥ 90% | ≥ 80% |
| 条件覆盖率 (Condition) | **100%** | ≥ 85% | ≥ 75% |
| 路径覆盖率 (Path) | ≥ 90% | ≥ 80% | ≥ 70% |

---

## 📋 测试用例设计流程

### Phase 1: 代码分支分析

```
[读取目标代码]
    │
    ▼
[识别所有分支点]
    │ - if/else 语句
    │ - switch/case 语句
    │ - 三元运算符
    │ - 短路求值 (&&, ||)
    │ - try/catch 块
    │ - 循环边界 (for, while)
    │
    ▼
[绘制分支树]
    │ - 每个分支点标记 ID
    │ - 记录分支条件
    │ - 标记嵌套层级
    │
    ▼
[计算分支总数]
    │ - 输出分支清单
```

### Phase 2: 测试用例设计（5 种方法）

#### 方法 1: 等价类划分 (Equivalence Partitioning)

**原理**：将输入域分为若干等价类，每个等价类内的数据对程序的影响相同

**步骤**：
1. 分析输入参数的有效范围
2. 划分有效等价类和无效等价类
3. 为每个等价类选择代表值

**模板**：
```yaml
equivalence_classes:
  parameter: "{参数名}"
  valid_classes:
    - id: EC1
      description: "{描述}"
      range: "{范围}"
      representative_value: "{代表值}"
  invalid_classes:
    - id: EC2
      description: "{描述}"
      range: "{范围}"
      representative_value: "{代表值}"
```

**示例**：
```yaml
equivalence_classes:
  parameter: "age"
  valid_classes:
    - id: EC1
      description: "成年人"
      range: "[18, 65]"
      representative_value: 30
  invalid_classes:
    - id: EC2
      description: "未成年"
      range: "[0, 17]"
      representative_value: 10
    - id: EC3
      description: "超龄"
      range: "[66, ∞)"
      representative_value: 70
    - id: EC4
      description: "负数"
      range: "(-∞, 0)"
      representative_value: -1
    - id: EC5
      description: "null值"
      range: "null"
      representative_value: null
```

#### 方法 2: 边界值分析 (Boundary Value Analysis)

**原理**：在等价类的边界处设计测试用例

**规则**：
- 对于范围 [a, b]，测试：a-1, a, a+1, b-1, b, b+1
- 对于列表，测试：空列表, 单元素, 最大长度
- 对于字符串，测试：空串, 单字符, 最大长度

**模板**：
```yaml
boundary_values:
  parameter: "{参数名}"
  range: "[{min}, {max}]"
  test_values:
    - value: {min - 1}
      expected: "invalid"
      description: "下边界外"
    - value: {min}
      expected: "valid"
      description: "下边界值"
    - value: {min + 1}
      expected: "valid"
      description: "下边界内"
    - value: {max - 1}
      expected: "valid"
      description: "上边界内"
    - value: {max}
      expected: "valid"
      description: "上边界值"
    - value: {max + 1}
      expected: "invalid"
      description: "上边界外"
```

#### 方法 3: 决策表测试 (Decision Table Testing)

**原理**：用表格形式列出所有条件组合及其对应的动作

**适用场景**：多个条件组合影响程序行为

**模板**：
```yaml
decision_table:
  conditions:
    - C1: "{条件1描述}"
    - C2: "{条件2描述}"
    - C3: "{条件3描述}"
  actions:
    - A1: "{动作1描述}"
    - A2: "{动作2描述}"
  rules:
    - id: R1
      conditions: [T, T, T]
      actions: [A1]
    - id: R2
      conditions: [T, T, F]
      actions: [A2]
    # ... 2^n 种组合
```

#### 方法 4: 状态转换测试 (State Transition Testing)

**原理**：测试系统在不同状态间的转换

**适用场景**：有明确状态机的系统

**模板**：
```yaml
state_transition:
  states:
    - S1: "{状态1}"
    - S2: "{状态2}"
    - S3: "{状态3}"
  transitions:
    - from: S1
      to: S2
      trigger: "{触发事件}"
      guard: "{守卫条件}"
    - from: S2
      to: S3
      trigger: "{触发事件}"
      guard: "{守卫条件}"
  test_cases:
    - id: TC1
      description: "正常流程"
      path: [S1, S2, S3]
    - id: TC2
      description: "非法转换"
      from: S1
      to: S3
      expected: "IllegalStateException"
```

#### 方法 5: 因果图法 (Cause-Effect Graphing)

**原理**：分析输入条件（原因）和输出结果（结果）之间的因果关系

**模板**：
```yaml
cause_effect:
  causes:
    - C1: "{原因1}"
    - C2: "{原因2}"
  effects:
    - E1: "{结果1}"
    - E2: "{结果2}"
  relationships:
    - effect: E1
      formula: "C1 ∧ C2"
    - effect: E2
      formula: "¬C1 ∨ ¬C2"
```

### Phase 3: 测试用例矩阵生成

```
[汇总所有设计方法的用例]
    │
    ▼
[去重合并]
    │ - 相同输入的用例合并
    │ - 保留最严格的断言
    │
    ▼
[生成测试用例矩阵]
    │
    ▼
[验证分支覆盖率]
    │ - 每个分支至少被 1 个用例覆盖
    │ - 有遗漏则补充用例
    │
    ▼
[输出最终用例清单]
```

---

## 📊 测试用例矩阵模板

```markdown
### 测试用例矩阵

| ID | 分类 | 输入 | 预期输出 | 覆盖分支 | 设计方法 |
|----|------|------|----------|----------|----------|
| TC-001 | 正向 | {输入描述} | {预期结果} | B1, B2 | 等价类 |
| TC-002 | 负向 | {输入描述} | {预期异常} | B3 | 边界值 |
| TC-003 | 边界 | {输入描述} | {预期结果} | B4 | 边界值 |
| TC-004 | 异常 | {输入描述} | {预期异常} | B5 | 因果图 |

### 分支覆盖检查

| 分支ID | 分支条件 | 覆盖用例 | 状态 |
|--------|----------|----------|------|
| B1 | user != null | TC-001 | ✅ |
| B2 | user == null | TC-002 | ✅ |
| B3 | age >= 18 | TC-001, TC-003 | ✅ |
| B4 | age < 18 | TC-004 | ✅ |

覆盖率: 4/4 = 100% ✅
```

---

## 🔍 API 测试用例设计

### 5 个测试维度

#### 维度 1: 正向测试 (Happy Path)

```yaml
positive_tests:
  - id: POS-001
    description: "正常创建用户"
    method: POST
    endpoint: "/api/users"
    request:
      body:
        username: "john_doe"
        email: "john@example.com"
        password: "SecurePass123"
    expected:
      status: 201
      body:
        id: "{non-null}"
        username: "john_doe"
```

#### 维度 2: 负向测试 (Negative Testing)

```yaml
negative_tests:
  - id: NEG-001
    description: "无效邮箱格式"
    method: POST
    endpoint: "/api/users"
    request:
      body:
        username: "john_doe"
        email: "invalid-email"
        password: "SecurePass123"
    expected:
      status: 400
      body:
        error: "邮箱格式不正确"

  - id: NEG-002
    description: "重复邮箱"
    precondition: "邮箱 existing@example.com 已存在"
    method: POST
    endpoint: "/api/users"
    request:
      body:
        username: "john_doe"
        email: "existing@example.com"
        password: "SecurePass123"
    expected:
      status: 409
      body:
        error: "邮箱已被注册"
```

#### 维度 3: 边界测试 (Boundary Testing)

```yaml
boundary_tests:
  - id: BND-001
    description: "用户名最小长度"
    method: POST
    endpoint: "/api/users"
    request:
      body:
        username: "ab"  # 最小长度 3
        email: "john@example.com"
        password: "SecurePass123"
    expected:
      status: 400
      body:
        error: "用户名长度不能少于3个字符"

  - id: BND-002
    description: "用户名刚好最小长度"
    method: POST
    endpoint: "/api/users"
    request:
      body:
        username: "abc"  # 刚好 3 个字符
        email: "john@example.com"
        password: "SecurePass123"
    expected:
      status: 201
```

#### 维度 4: 安全测试 (Security Testing)

```yaml
security_tests:
  - id: SEC-001
    description: "SQL注入防护"
    method: POST
    endpoint: "/api/users"
    request:
      body:
        username: "'; DROP TABLE users; --"
        email: "john@example.com"
        password: "SecurePass123"
    expected:
      status: 400
      body:
        error: "用户名包含非法字符"

  - id: SEC-002
    description: "XSS防护"
    method: POST
    endpoint: "/api/users"
    request:
      body:
        username: "<script>alert('xss')</script>"
        email: "john@example.com"
        password: "SecurePass123"
    expected:
      status: 400
      body:
        error: "用户名包含非法字符"

  - id: SEC-003
    description: "未授权访问"
    method: GET
    endpoint: "/api/admin/users"
    headers:
      Authorization: ""  # 无 token
    expected:
      status: 401
      body:
        error: "未授权"
```

#### 维度 5: 性能测试 (Performance Testing)

```yaml
performance_tests:
  - id: PERF-001
    description: "响应时间"
    method: GET
    endpoint: "/api/users/1"
    expected:
      status: 200
      response_time_ms: "< 200"

  - id: PERF-002
    description: "并发请求"
    method: GET
    endpoint: "/api/users"
    concurrent_requests: 100
    expected:
      success_rate: ">= 99%"
      avg_response_time_ms: "< 500"
```

---

## 🧪 测试代码模板

### Java/JUnit 5 模板

```java
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("{功能名称}测试")
class {ClassName}Test {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== 正向测试 ====================

    @Nested
    @DisplayName("正向测试")
    class PositiveTests {

        @Test
        @DisplayName("TC-001: {正常场景描述}")
        void should_返回成功_when_输入有效() throws Exception {
            // Given: 准备测试数据
            var request = new CreateRequest();
            request.setField("validValue");

            // When: 执行请求
            var result = mockMvc.perform(post("/api/endpoint")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)));

            // Then: 验证结果
            result.andExpect(status().isCreated())
                  .andExpect(jsonPath("$.id").exists())
                  .andExpect(jsonPath("$.field").value("validValue"));
        }
    }

    // ==================== 负向测试 ====================

    @Nested
    @DisplayName("负向测试")
    class NegativeTests {

        @Test
        @DisplayName("TC-002: {异常场景描述}")
        void should_返回错误_when_输入无效() throws Exception {
            // Given
            var request = new CreateRequest();
            request.setField("invalidValue");

            // When
            var result = mockMvc.perform(post("/api/endpoint")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)));

            // Then
            result.andExpect(status().isBadRequest())
                  .andExpect(jsonPath("$.error").value("错误信息"));
        }

        @Test
        @DisplayName("TC-003: null 输入")
        void should_返回错误_when_输入为null() throws Exception {
            // Given
            var request = new CreateRequest();
            request.setField(null);

            // When & Then
            mockMvc.perform(post("/api/endpoint")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("字段不能为空"));
        }
    }

    // ==================== 边界测试 ====================

    @Nested
    @DisplayName("边界测试")
    class BoundaryTests {

        @ParameterizedTest
        @DisplayName("TC-004: 边界值测试")
        @CsvSource({
            "17, false, 年龄过小",
            "18, true, ",
            "19, true, ",
            "64, true, ",
            "65, true, ",
            "66, false, 年龄过大"
        })
        void should_正确处理边界值(int age, boolean valid, String errorMsg) throws Exception {
            // Given
            var request = new CreateRequest();
            request.setAge(age);

            // When
            var result = mockMvc.perform(post("/api/endpoint")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)));

            // Then
            if (valid) {
                result.andExpect(status().isCreated());
            } else {
                result.andExpect(status().isBadRequest())
                      .andExpect(jsonPath("$.error").value(errorMsg));
            }
        }
    }

    // ==================== 分支覆盖测试 ====================

    @Nested
    @DisplayName("分支覆盖测试")
    class BranchCoverageTests {

        @Test
        @DisplayName("B1: 条件1为true的分支")
        void should_执行分支1_when_条件1为true() {
            // 覆盖分支: if (condition1) { ... }
        }

        @Test
        @DisplayName("B2: 条件1为false的分支")
        void should_执行分支2_when_条件1为false() {
            // 覆盖分支: else { ... }
        }

        @Test
        @DisplayName("B3: 嵌套条件分支")
        void should_执行嵌套分支_when_条件1和条件2都为true() {
            // 覆盖分支: if (condition1 && condition2) { ... }
        }
    }
}
```

### TypeScript/Vitest 模板

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginForm from '@/views/login/LoginForm.vue'
import { useAuthStore } from '@/stores/auth'

describe('LoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ==================== 正向测试 ====================

  describe('正向测试', () => {
    it('TC-001: 应该成功登录当输入有效', async () => {
      // Given
      const wrapper = mount(LoginForm)
      const authStore = useAuthStore()
      vi.spyOn(authStore, 'login').mockResolvedValue({ token: 'xxx' })

      // When
      await wrapper.find('[data-testid="username"]').setValue('admin')
      await wrapper.find('[data-testid="password"]').setValue('password123')
      await wrapper.find('[data-testid="captcha"]').setValue('1234')
      await wrapper.find('form').trigger('submit')

      // Then
      expect(authStore.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
        captcha: '1234'
      })
    })
  })

  // ==================== 负向测试 ====================

  describe('负向测试', () => {
    it('TC-002: 应该显示错误当用户名为空', async () => {
      // Given
      const wrapper = mount(LoginForm)

      // When
      await wrapper.find('[data-testid="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit')

      // Then
      expect(wrapper.find('.error-message').text()).toBe('请输入用户名')
    })

    it('TC-003: 应该显示错误当密码为空', async () => {
      // Given
      const wrapper = mount(LoginForm)

      // When
      await wrapper.find('[data-testid="username"]').setValue('admin')
      await wrapper.find('form').trigger('submit')

      // Then
      expect(wrapper.find('.error-message').text()).toBe('请输入密码')
    })
  })

  // ==================== 边界测试 ====================

  describe('边界测试', () => {
    it.each([
      ['ab', false, '用户名至少3个字符'],
      ['abc', true, ''],
      ['a'.repeat(20), true, ''],
      ['a'.repeat(21), false, '用户名最多20个字符'],
    ])('TC-004: 用户名 "%s" 应该 %s', async (username, valid, errorMsg) => {
      // Given
      const wrapper = mount(LoginForm)

      // When
      await wrapper.find('[data-testid="username"]').setValue(username)
      await wrapper.find('[data-testid="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit')

      // Then
      if (valid) {
        expect(wrapper.find('.error-message').exists()).toBe(false)
      } else {
        expect(wrapper.find('.error-message').text()).toBe(errorMsg)
      }
    })
  })
})
```

---

## 📝 执行伪代码

```python
def design_test_cases(ticket):
    """为 Ticket 设计测试用例"""

    # Step 1: 读取目标代码
    target_files = ticket.allowed_paths.modify
    code_content = read_files(target_files)

    # Step 2: 分析代码分支
    branches = analyze_branches(code_content)
    print(f"识别到 {len(branches)} 个分支点")

    # Step 3: 应用 5 种设计方法
    test_cases = []

    # 方法 1: 等价类划分
    ec_cases = apply_equivalence_partitioning(ticket.acceptance_criteria)
    test_cases.extend(ec_cases)

    # 方法 2: 边界值分析
    bva_cases = apply_boundary_value_analysis(ticket.acceptance_criteria)
    test_cases.extend(bva_cases)

    # 方法 3: 决策表测试
    dt_cases = apply_decision_table(branches)
    test_cases.extend(dt_cases)

    # 方法 4: 状态转换测试（如适用）
    if has_state_machine(code_content):
        st_cases = apply_state_transition(code_content)
        test_cases.extend(st_cases)

    # 方法 5: 因果图法
    ce_cases = apply_cause_effect(ticket.acceptance_criteria)
    test_cases.extend(ce_cases)

    # Step 4: 去重合并
    test_cases = deduplicate_cases(test_cases)

    # Step 5: 验证分支覆盖率
    coverage = calculate_branch_coverage(branches, test_cases)

    if coverage < 100:
        # 补充遗漏的分支
        uncovered = get_uncovered_branches(branches, test_cases)
        additional_cases = generate_cases_for_branches(uncovered)
        test_cases.extend(additional_cases)

    # Step 5.5: 测试用例关联 AC（E-12）
    for tc in test_cases:
        if not tc.get("ac_ref"):
            print(f"⚠️ TC {tc['id']} 没有关联 Ticket AC，请添加 ac_ref 字段")
            tc["ac_ref"] = infer_ac_ref(tc, ticket.acceptance_criteria)

    # Step 5.6: AC 测试覆盖率检查（E-13）
    for ac in ticket.acceptance_criteria:
        ac_tests = [tc for tc in test_cases if tc.get("ac_ref") == ac.get("id")]
        if len(ac_tests) == 0:
            print(f"❌ AC '{ac['description']}' 没有对应的测试用例，补充中...")
            additional = generate_cases_for_ac(ac)
            test_cases.extend(additional)

    # Step 6: 生成测试用例矩阵
    matrix = generate_test_matrix(test_cases, branches)

    # Step 7: 持久化矩阵文件（E-8b）
    matrix_path = f"{config.paths.tasks.test_matrices}{ticket.id}.yaml"
    write_yaml(matrix_path, {
        "ticket_id": ticket.id,
        "ticket_type": ticket.type,
        "branches": branches,
        "test_cases": test_cases,
        "coverage_target": get_coverage_thresholds(ticket.type),
        "design_methods_applied": ["equivalence_partitioning", "boundary_value_analysis", "decision_table"],
        "created_at": now()
    })
    print(f"✅ 测试矩阵已写入: {matrix_path}")

    return {
        "test_cases": test_cases,
        "branch_coverage": 100,
        "matrix": matrix,
        "matrix_path": matrix_path
    }


def analyze_branches(code_content):
    """分析代码中的所有分支点"""
    branches = []

    # 识别 if/else
    if_patterns = find_if_statements(code_content)
    for pattern in if_patterns:
        branches.append({
            "id": f"B{len(branches) + 1}",
            "type": "if",
            "condition": pattern.condition,
            "line": pattern.line,
            "true_branch": pattern.true_block,
            "false_branch": pattern.false_block
        })

    # 识别 switch/case
    switch_patterns = find_switch_statements(code_content)
    for pattern in switch_patterns:
        for case in pattern.cases:
            branches.append({
                "id": f"B{len(branches) + 1}",
                "type": "switch",
                "condition": f"{pattern.variable} == {case.value}",
                "line": case.line
            })

    # 识别三元运算符
    ternary_patterns = find_ternary_operators(code_content)
    for pattern in ternary_patterns:
        branches.append({
            "id": f"B{len(branches) + 1}",
            "type": "ternary",
            "condition": pattern.condition,
            "line": pattern.line
        })

    # 识别短路求值
    short_circuit_patterns = find_short_circuit(code_content)
    for pattern in short_circuit_patterns:
        branches.append({
            "id": f"B{len(branches) + 1}",
            "type": "short_circuit",
            "condition": pattern.condition,
            "line": pattern.line
        })

    # 识别 try/catch
    try_catch_patterns = find_try_catch(code_content)
    for pattern in try_catch_patterns:
        branches.append({
            "id": f"B{len(branches) + 1}",
            "type": "exception",
            "condition": f"throws {pattern.exception_type}",
            "line": pattern.line
        })

    return branches
```

---

## 🚨 强制检查点

### 测试用例设计完成前的检查清单

```markdown
## 测试用例设计检查清单

### 分支覆盖检查
- [ ] 所有 if 语句的 true 分支都有测试用例
- [ ] 所有 if 语句的 false 分支都有测试用例
- [ ] 所有 switch/case 分支都有测试用例
- [ ] 所有 try/catch 的异常分支都有测试用例
- [ ] 所有短路求值的两种情况都有测试用例

### 测试类型检查
- [ ] 有正向测试（Happy Path）
- [ ] 有负向测试（Invalid Input）
- [ ] 有边界测试（Boundary Values）
- [ ] 有异常测试（Exception Handling）
- [ ] 有 null/空值测试

### 覆盖率检查
- [ ] 分支覆盖率 = 100%
- [ ] 行覆盖率 ≥ 90%
- [ ] 条件覆盖率 ≥ 85%

### 质量检查
- [ ] 测试用例命名清晰（should_xxx_when_xxx）
- [ ] 每个测试用例只测试一个场景
- [ ] 测试用例之间相互独立
- [ ] 测试数据不依赖外部状态
```

---

## 硬约束

- 禁止在分支覆盖率 < 100% 时声明测试设计完成
- 禁止跳过任何分支的测试用例
- 禁止使用"太简单不需要测试"作为借口
- 必须输出测试用例矩阵
- 必须输出分支覆盖检查表
- 每个 if-else 必须有对应的测试用例
- 每个异常路径必须有对应的测试用例
