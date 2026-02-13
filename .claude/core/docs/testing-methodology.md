# 测试方法论完整指南

> 本文档定义了框架的测试标准和方法论，是 `test-design` 和 `test-execution` Skill 的参考依据。

---

## 1. 测试覆盖率标准

### 1.1 五种覆盖率维度

#### 行覆盖率 (Line Coverage)

**定义**：代码中被执行的行数占总行数的比例

```
覆盖率 = 被执行的代码行数 / 总代码行数 × 100%
```

**目标标准**：
- 核心业务逻辑：≥ 90%
- 工具类/辅助代码：≥ 70%
- 整体项目：≥ 80%

#### 分支覆盖率 (Branch Coverage) 🚨 最重要

**定义**：代码中所有分支（if/else、switch等）被执行的比例

```
覆盖率 = 被执行的分支数 / 总分支数 × 100%
```

**目标标准**：
- 关键业务逻辑：**100%**（强制要求）
- 一般业务逻辑：≥ 90%
- 整体项目：≥ 85%

**示例**：
```java
public String processOrder(Order order) {
    // 分支1：order为null (true/false)
    if (order == null) {
        return "INVALID";
    }

    // 分支2：金额检查 (true/false)
    if (order.getAmount() <= 0) {
        return "INVALID_AMOUNT";
    }

    // 分支3：库存检查 (true/false)
    if (!hasStock(order.getProductId())) {
        return "OUT_OF_STOCK";
    }

    // 分支4：支付处理 (true/false)
    if (processPayment(order)) {
        return "SUCCESS";
    } else {
        return "PAYMENT_FAILED";
    }
}
// 总分支数：8（4个if，每个if有true/false两个分支）
// 分支覆盖率 = 被执行的分支数 / 8
```

**测试用例设计**：
```java
@Test void testOrderNull() { /* 覆盖分支1-true */ }
@Test void testOrderNotNull() { /* 覆盖分支1-false */ }
@Test void testAmountZero() { /* 覆盖分支2-true */ }
@Test void testAmountPositive() { /* 覆盖分支2-false */ }
@Test void testNoStock() { /* 覆盖分支3-true */ }
@Test void testHasStock() { /* 覆盖分支3-false */ }
@Test void testPaymentSuccess() { /* 覆盖分支4-true */ }
@Test void testPaymentFailed() { /* 覆盖分支4-false */ }
```

#### 条件覆盖率 (Condition Coverage)

**定义**：复杂条件表达式中每个子条件的真假值都被测试

**示例**：
```java
// 条件：(user.isVIP && order.amount > 1000) || (user.isNewUser && order.amount > 500)
// 需要测试的条件组合：
// 1. user.isVIP=true, order.amount>1000 → true
// 2. user.isVIP=true, order.amount<=1000 → false
// 3. user.isVIP=false, order.amount>1000 → false
// 4. user.isNewUser=true, order.amount>500 → true
// 5. user.isNewUser=true, order.amount<=500 → false
// 6. user.isNewUser=false, order.amount>500 → false
```

#### 路径覆盖率 (Path Coverage)

**定义**：从程序入口到出口的所有可能执行路径都被测试

**目标标准**：
- 关键业务流程：≥ 90%
- 一般情况：≥ 80%

#### MC/DC覆盖率 (Modified Condition/Decision Coverage)

**定义**：每个条件的改变都会影响决策结果

**适用场景**：
- 航空、医疗等高可靠性系统
- 复杂的安全关键代码

---

## 2. 测试用例设计方法

### 2.1 等价类划分 (Equivalence Partitioning)

**原理**：将输入域分为若干等价类，每个等价类内的数据对程序的影响相同

**步骤**：
1. 分析输入条件
2. 划分等价类（有效类和无效类）
3. 为每个等价类选择代表值
4. 设计测试用例

**示例：密码验证**

```java
/**
 * 密码规则：
 * - 长度：8-20位
 * - 必须包含字母和数字
 * - 不能包含特殊字符
 */
public boolean validatePassword(String password);

// 等价类划分
// 有效等价类：
// EC1: 长度8-20，包含字母和数字，无特殊字符 → "Password123"

// 无效等价类：
// EC2: 长度 < 8 → "Pass1"
// EC3: 长度 > 20 → "Password123456789012345"
// EC4: 无字母 → "12345678"
// EC5: 无数字 → "abcdefgh"
// EC6: 包含特殊字符 → "Pass@word1"
// EC7: 空字符串 → ""
// EC8: null值 → null
```

**测试用例**：
```java
@Test void testValidPassword() { assertTrue(validator.validatePassword("Password123")); }
@Test void testTooShort() { assertFalse(validator.validatePassword("Pass1")); }
@Test void testTooLong() { assertFalse(validator.validatePassword("Password123456789012345")); }
@Test void testNoLetter() { assertFalse(validator.validatePassword("12345678")); }
@Test void testNoDigit() { assertFalse(validator.validatePassword("abcdefgh")); }
@Test void testWithSpecialChar() { assertFalse(validator.validatePassword("Pass@word1")); }
@Test void testEmpty() { assertFalse(validator.validatePassword("")); }
@Test void testNull() { assertFalse(validator.validatePassword(null)); }
```

### 2.2 边界值分析 (Boundary Value Analysis)

**原理**：在等价类的边界处设计测试用例，因为边界处最容易出现错误

**规则**：
- 对于范围 [a, b]，测试 a-1, a, a+1, b-1, b, b+1
- 对于列表，测试第一个、最后一个、中间元素
- 对于字符串，测试空字符串、单字符、最大长度

**示例：年龄验证**

```java
/**
 * 规则：年龄必须在18-65岁之间
 */
public boolean isValidAge(int age);

// 边界值测试用例
@Test void testAge17() { assertFalse(validator.isValidAge(17)); }  // 下边界外
@Test void testAge18() { assertTrue(validator.isValidAge(18)); }   // 下边界值
@Test void testAge19() { assertTrue(validator.isValidAge(19)); }   // 下边界内
@Test void testAge64() { assertTrue(validator.isValidAge(64)); }   // 上边界内
@Test void testAge65() { assertTrue(validator.isValidAge(65)); }   // 上边界值
@Test void testAge66() { assertFalse(validator.isValidAge(66)); }  // 上边界外
@Test void testAge0() { assertFalse(validator.isValidAge(0)); }    // 最小值
@Test void testAgeNegative() { assertFalse(validator.isValidAge(-1)); }  // 负数
```

### 2.3 决策表测试 (Decision Table Testing)

**原理**：用表格形式列出所有条件组合及其对应的动作

**适用场景**：多个条件组合影响程序行为

**示例：订单处理规则**

```
条件表：
┌─────────────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ 条件\用例       │ TC1  │ TC2  │ TC3  │ TC4  │ TC5  │ TC6  │ TC7  │ TC8  │
├─────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 用户是VIP       │ T    │ T    │ T    │ T    │ F    │ F    │ F    │ F    │
│ 订单金额>1000   │ T    │ T    │ F    │ F    │ T    │ T    │ F    │ F    │
│ 库存充足        │ T    │ F    │ T    │ F    │ T    │ F    │ T    │ F    │
├─────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 动作：          │      │      │      │      │      │      │      │      │
│ 给予20%折扣     │ Y    │ Y    │ N    │ N    │ N    │ N    │ N    │ N    │
│ 给予10%折扣     │ N    │ N    │ Y    │ N    │ Y    │ N    │ N    │ N    │
│ 拒绝订单        │ N    │ Y    │ N    │ Y    │ N    │ Y    │ N    │ Y    │
└─────────────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

**测试用例**：
```java
@Test void testTC1_VIP_HighAmount_HasStock() {
    Order order = createOrder(true, 1500, true);
    assertEquals(0.2, processor.processOrder(order).getDiscount());
}

@Test void testTC2_VIP_HighAmount_NoStock() {
    Order order = createOrder(true, 1500, false);
    assertEquals(OrderStatus.REJECTED, processor.processOrder(order).getStatus());
}

// ... 其他 6 个测试用例
```

### 2.4 状态转换测试 (State Transition Testing)

**原理**：测试系统在不同状态间的转换

**适用场景**：有明确状态机的系统

**示例：订单状态转换**

```
状态转换图：
┌─────────────┐
│   待支付    │
└──────┬──────┘
       │ 支付成功
       ▼
┌─────────────┐
│   已支付    │
└──────┬──────┘
       │ 发货
       ▼
┌─────────────┐
│   已发货    │
└──────┬──────┘
       │ 确认收货
       ▼
┌─────────────┐
│   已完成    │
└─────────────┘
```

**测试用例**：
```java
@Test void testNormalFlow() {
    Order order = new Order();
    assertEquals(OrderStatus.PENDING_PAYMENT, order.getStatus());

    order.pay();
    assertEquals(OrderStatus.PAID, order.getStatus());

    order.ship();
    assertEquals(OrderStatus.SHIPPED, order.getStatus());

    order.confirm();
    assertEquals(OrderStatus.COMPLETED, order.getStatus());
}

@Test void testIllegalTransition() {
    Order order = new Order();
    order.pay();
    order.confirm();  // 已完成状态

    assertThrows(IllegalStateException.class, () -> order.pay());
    assertThrows(IllegalStateException.class, () -> order.cancel());
}
```

### 2.5 因果图法 (Cause-Effect Graphing)

**原理**：分析输入条件（原因）和输出结果（结果）之间的因果关系

**示例：登录系统**

```
原因（输入）：
C1: 用户名存在
C2: 密码正确
C3: 账户未被锁定
C4: 验证码正确

结果（输出）：
E1: 登录成功
E2: 显示"用户名或密码错误"
E3: 显示"账户已被锁定"
E4: 显示"验证码错误"

因果关系：
E1 = C1 ∧ C2 ∧ C3 ∧ C4
E2 = ¬C1 ∨ ¬C2
E3 = ¬C3
E4 = ¬C4
```

---

## 3. API 测试最佳实践

### 3.1 五个测试维度

#### 维度 1: 正向测试 (Happy Path)

测试系统在正常、预期的输入下是否能正确工作。

```java
@Test
void testCreateUserSuccess() throws Exception {
    CreateUserRequest request = new CreateUserRequest();
    request.setUsername("john_doe");
    request.setEmail("john@example.com");
    request.setPassword("SecurePass123");

    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").exists())
        .andExpect(jsonPath("$.username").value("john_doe"));
}
```

#### 维度 2: 负向测试 (Negative Testing)

测试系统在无效、异常输入下的行为。

```java
@Test
void testCreateUserWithInvalidEmail() throws Exception {
    CreateUserRequest request = new CreateUserRequest();
    request.setUsername("john_doe");
    request.setEmail("invalid-email");  // 无效邮箱
    request.setPassword("SecurePass123");

    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("邮箱格式不正确"));
}

@Test
void testCreateUserWithDuplicateEmail() throws Exception {
    // 已存在的邮箱
    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"existing@example.com\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("邮箱已被注册"));
}
```

#### 维度 3: 边界测试 (Boundary Testing)

```java
@ParameterizedTest
@CsvSource({
    "ab, false, 用户名至少3个字符",
    "abc, true, ",
    "a]".repeat(20) + ", true, ",
    "a".repeat(21) + ", false, 用户名最多20个字符"
})
void testUsernameBoundary(String username, boolean valid, String errorMsg) throws Exception {
    // ...
}
```

#### 维度 4: 安全测试 (Security Testing)

```java
@Test
void testSqlInjection() throws Exception {
    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"username\":\"'; DROP TABLE users; --\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("用户名包含非法字符"));
}

@Test
void testXssProtection() throws Exception {
    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"username\":\"<script>alert('xss')</script>\"}"))
        .andExpect(status().isBadRequest());
}

@Test
void testUnauthorizedAccess() throws Exception {
    mockMvc.perform(get("/api/admin/users"))
        .andExpect(status().isUnauthorized());
}
```

#### 维度 5: 性能测试 (Performance Testing)

```java
@Test
void testResponseTime() throws Exception {
    long start = System.currentTimeMillis();

    mockMvc.perform(get("/api/users/1"))
        .andExpect(status().isOk());

    long duration = System.currentTimeMillis() - start;
    assertTrue(duration < 200, "响应时间应小于200ms");
}
```

---

## 4. 测试代码模板

### 4.1 Java/JUnit 5 模板

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
                  .andExpect(jsonPath("$.id").exists());
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

            // When & Then
            mockMvc.perform(post("/api/endpoint")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
        }
    }

    // ==================== 边界测试 ====================

    @Nested
    @DisplayName("边界测试")
    class BoundaryTests {

        @ParameterizedTest
        @CsvSource({
            "17, false",
            "18, true",
            "65, true",
            "66, false"
        })
        void should_正确处理边界值(int value, boolean valid) {
            // ...
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
    }
}
```

### 4.2 TypeScript/Vitest 模板

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginForm from '@/views/login/LoginForm.vue'

describe('LoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ==================== 正向测试 ====================

  describe('正向测试', () => {
    it('TC-001: 应该成功登录当输入有效', async () => {
      const wrapper = mount(LoginForm)

      await wrapper.find('[data-testid="username"]').setValue('admin')
      await wrapper.find('[data-testid="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit')

      expect(wrapper.emitted('login')).toBeTruthy()
    })
  })

  // ==================== 负向测试 ====================

  describe('负向测试', () => {
    it('TC-002: 应该显示错误当用户名为空', async () => {
      const wrapper = mount(LoginForm)

      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('.error-message').text()).toBe('请输入用户名')
    })
  })

  // ==================== 边界测试 ====================

  describe('边界测试', () => {
    it.each([
      ['ab', false, '用户名至少3个字符'],
      ['abc', true, ''],
    ])('用户名 "%s" 应该 %s', async (username, valid, errorMsg) => {
      const wrapper = mount(LoginForm)

      await wrapper.find('[data-testid="username"]').setValue(username)
      await wrapper.find('form').trigger('submit')

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

## 5. 覆盖率工具配置

### 5.1 JaCoCo (Java)

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.10</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>BRANCH</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>1.00</minimum>
                            </limit>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.90</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### 5.2 Vitest (TypeScript)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 90,
        statements: 80
      },
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.test.ts'
      ]
    }
  }
})
```

---

## 6. 测试命名规范

### 6.1 命名模式

```
should_{预期结果}_when_{条件}
```

### 6.2 示例

```java
// Java
@Test void should_返回成功_when_参数有效() { }
@Test void should_抛出异常_when_参数为null() { }
@Test void should_返回空列表_when_无数据() { }

// TypeScript
it('should return success when params are valid', () => { })
it('should throw error when param is null', () => { })
it('should return empty list when no data', () => { })
```

---

## 7. 红旗 - 立即停止

- ❌ 没有运行任何测试就说"完成"
- ❌ 测试失败但声称"应该是环境问题"
- ❌ 跳过测试因为"太简单了"
- ❌ 分支覆盖率 < 100% 但声称"已经够了"
- ❌ 使用"根据我的理解"而非实际证据
- ❌ 没有 verification_evidence 就更新状态为 done
