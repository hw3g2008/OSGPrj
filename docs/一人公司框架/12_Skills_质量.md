# Skills - 质量类

本文档包含 4 个质量相关的 Skills：
- verification
- tdd
- code-review
- debugging

---

## 1. verification

**参考来源**：obra/superpowers verification-before-completion

```yaml
---
name: verification
description: 完成前验证。证据先于断言。
invoked_by: agent
---
```

### 验证清单

- [ ] 测试通过（命令输出）
- [ ] Lint 通过（命令输出）
- [ ] 功能可用（如有 UI，截图证明）

### Prompt 模板

```markdown
# Verification Skill

## 核心原则
**证据先于断言**：所有完成声明必须有命令输出证明。

## 验证流程

### Step 1: 执行验证命令
运行 Ticket 中定义的所有 acceptance 检查：

```yaml
acceptance:
  - type: command
    run: "mvn test -Dtest=SysUserControllerTest"
    expect: "BUILD SUCCESS"
  - type: command
    run: "mvn checkstyle:check"
    expect: "BUILD SUCCESS"
```

### Step 2: 收集证据
"""
## 🔍 验证证据

### 测试结果
命令: `mvn test -Dtest=SysUserControllerTest`
```
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```
✅ 通过

### Lint 结果
命令: `mvn checkstyle:check`
```
[INFO] BUILD SUCCESS
```
✅ 通过

### 功能验证
{如适用，附截图或 API 响应}
"""

### Step 3: 输出验证报告
"""
## ✅ 验证完成

| 检查项 | 状态 | 证据 |
|--------|------|------|
| 单元测试 | ✅ | 3 tests passed |
| 代码规范 | ✅ | checkstyle passed |
| 功能可用 | ✅ | API 返回 200 |

**结论**: 验收通过
"""

## 硬性约束
1. 必须执行所有 acceptance 检查
2. 必须展示命令输出作为证据
3. 任何检查失败则整体不通过
4. 不接受"应该没问题"的主观判断
```

---

## 2. tdd

**参考来源**：obra/superpowers test-driven-development

```yaml
---
name: tdd
description: TDD 开发。红-绿-重构循环。
invoked_by: agent
---
```

### 配置选项

```yaml
# project/config.yaml 中的 TDD 配置
tdd:
  strict_mode: false  # true = 严格 TDD，false = 允许降级
  
  # 降级条件（当 strict_mode: false 时）
  fallback_conditions:
    - existing_coverage_low: true      # 现有测试覆盖率低于 20%
    - no_test_infrastructure: true     # 缺少测试框架配置
    - legacy_code_modification: true   # 修改遗留代码
  
  # 降级时的替代验证
  fallback_verification:
    - "lint_pass"      # Lint 必须通过
    - "build_pass"     # 构建必须通过
    - "manual_test"    # 需要手动测试说明
```

### 降级策略

当项目不适合严格 TDD（如若依这类现有测试覆盖率低的项目）时：

| 场景 | 处理方式 |
|------|----------|
| 新增独立功能 | 尽量 TDD |
| 修改现有代码 | 先补测试，再修改 |
| 现有代码无测试 | 使用 lint + build + 手动验证 |
| 紧急修复 | 可跳过，但必须记录技术债 |

**降级时必须**：
1. 在 Ticket 日志中标注 `tdd_skipped: true` 和原因
2. 确保 lint 和 build 通过
3. 提供手动测试步骤

### TDD 流程

1. **红**：先写失败的测试
2. **绿**：写最少代码让测试通过
3. **重构**：优化代码，保持测试通过

### Prompt 模板

```markdown
# TDD Skill

## 核心原则
**测试先行**：在写实现代码之前，必须先写测试。

## TDD 循环

### Phase 1: 红灯 🔴
1. 根据需求编写测试用例
2. 运行测试，确认失败
3. 输出：
"""
### 🔴 红灯阶段

**测试文件**: {test_file}

**测试用例**:
```java
@Test
public void testListUsers_success() {
    // 测试代码
}
```

**运行结果**:
```
Tests run: 1, Failures: 1, Errors: 0
FAILED: testListUsers_success
Expected: not null
Actual: null
```

✅ 红灯确认：测试按预期失败
"""

### Phase 2: 绿灯 🟢
1. 编写最少的实现代码
2. 运行测试，确认通过
3. 输出：
"""
### 🟢 绿灯阶段

**实现文件**: {impl_file}

**关键代码**:
```java
public List<SysUser> selectUserList(SysUser user) {
    return userMapper.selectUserList(user);
}
```

**运行结果**:
```
Tests run: 1, Failures: 0, Errors: 0
BUILD SUCCESS
```

✅ 绿灯确认：测试通过
"""

### Phase 3: 重构 🔄
1. 优化代码结构（可选）
2. 确保测试仍然通过
3. 输出：
"""
### 🔄 重构阶段

**优化内容**: {优化说明，如无则标注"无需重构"}

**验证结果**:
```
Tests run: 1, Failures: 0, Errors: 0
BUILD SUCCESS
```

✅ 重构完成：测试仍然通过
"""

## 硬性约束
1. 必须先写测试，测试必须先失败
2. 不允许跳过红灯阶段
3. 重构后必须重新运行测试
4. 测试必须有实际断言，不允许空测试
```

---

## 3. code-review

**参考来源**：obra/superpowers requesting/receiving-code-review

```yaml
---
name: code-review
description: 代码评审。技术评估，非情感表演。
invoked_by: agent
---
```

### 评审维度

- 功能正确性
- 代码规范
- 性能考量
- 安全问题

### Prompt 模板

```markdown
# Code Review Skill

## 核心原则
**技术评估，非情感表演**：关注代码质量，而非个人风格。

## 评审流程

### Step 1: 获取变更
1. 读取 `workspace/logs/T-xxx.yaml` 获取变更文件
2. 使用 `git diff` 查看具体变更

### Step 2: 分维度评审

"""
## 🔍 代码评审 - T-{id}

### 1. 功能正确性
| 检查项 | 状态 | 说明 |
|--------|------|------|
| 实现是否符合需求 | ✅/⚠️/❌ | {说明} |
| 边界条件处理 | ✅/⚠️/❌ | {说明} |
| 异常处理 | ✅/⚠️/❌ | {说明} |

### 2. 代码规范
| 检查项 | 状态 | 说明 |
|--------|------|------|
| 命名规范 | ✅/⚠️/❌ | {说明} |
| 代码风格 | ✅/⚠️/❌ | {说明} |
| 注释完整性 | ✅/⚠️/❌ | {说明} |

### 3. 性能考量
| 检查项 | 状态 | 说明 |
|--------|------|------|
| 查询效率 | ✅/⚠️/❌ | {说明} |
| 内存使用 | ✅/⚠️/❌ | {说明} |

### 4. 安全问题
| 检查项 | 状态 | 说明 |
|--------|------|------|
| SQL 注入 | ✅/⚠️/❌ | {说明} |
| XSS 防护 | ✅/⚠️/❌ | {说明} |
| 权限校验 | ✅/⚠️/❌ | {说明} |
"""

### Step 3: 输出评审结果

"""
### 📋 评审结论

**整体评价**: {通过/需修改/不通过}

**必须修改**:
1. {issue_1} - {修改建议}

**建议优化**:
1. {suggestion_1}

**亮点**:
1. {highlight_1}
"""

### Step 4: 保存评审记录
保存到 `artifacts/reviews/T-xxx.md`

## 硬性约束
1. 必须覆盖四个评审维度
2. 每个问题必须有具体修改建议
3. 区分"必须修改"和"建议优化"
4. 评审结果必须保存
```

---

## 4. debugging

**参考来源**：obra/superpowers systematic-debugging

```yaml
---
name: debugging
description: 系统化调试。先找根因再修复。
invoked_by: agent
---
```

### 铁律

**没有根因分析，不提出修复方案**

### Prompt 模板

```markdown
# Debugging Skill

## 核心原则
**先找根因再修复**：禁止盲目尝试修复。

## 调试流程

### Step 1: 收集错误信息
"""
## 🐛 错误信息

**错误类型**: {error_type}
**错误位置**: {file}:{line}

**错误信息**:
```
{完整错误堆栈}
```

**触发条件**: {如何复现}
"""

### Step 2: 根因分析
"""
## 🔍 根因分析

### 假设 1: {假设描述}
- **验证方法**: {如何验证}
- **验证结果**: {结果}
- **结论**: ✅ 确认 / ❌ 排除

### 假设 2: {假设描述}
...

### 根因确认
经分析，根因是：**{根因描述}**

**证据**:
1. {证据1}
2. {证据2}
"""

### Step 3: 修复方案
"""
## 🔧 修复方案

**根因**: {根因描述}

**修复方法**:
```java
// 修复前
{old_code}

// 修复后
{new_code}
```

**影响范围**: {affected_files}
"""

### Step 4: 验证修复
"""
## ✅ 修复验证

**测试命令**: `{command}`

**测试结果**:
```
{test_output}
```

**结论**: 修复成功 ✅
"""

## 硬性约束
1. 必须先分析根因，再提出修复
2. 根因分析必须有验证过程
3. 修复后必须验证
4. 禁止"试试看"的盲目修复
```

---

## 相关文档

- [00_概览](00_概览.md) - 返回概览
- [11_Skills_工作流](11_Skills_工作流.md) - 工作流 Skills
- [13_Skills_自动化](13_Skills_自动化.md) - 自动化 Skills
