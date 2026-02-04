# TDD Skill

---
name: tdd
description: "Use when implementing any code change - follows strict Red-Green-Refactor cycle"
invoked_by: agent
auto_execute: true
---

## 概览

测试驱动开发，严格遵循 Red-Green-Refactor 循环。

## ⚠️ 铁律

```
1. 永远不要在没有失败测试的情况下写代码
2. 永远不要在测试失败时说"完成"
3. 信心 ≠ 证据，必须运行验证
```

## Red-Green-Refactor 循环

```
┌─────────────────────────────────────────┐
│  RED: 写一个失败的测试                  │
│  ├── 测试必须能运行                     │
│  └── 测试必须失败（预期原因）           │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  GREEN: 写最少的代码让测试通过          │
│  ├── 只写让测试通过的代码               │
│  ├── 不要提前优化                       │
│  └── 运行测试：必须通过                 │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  REFACTOR: 优化代码                     │
│  ├── 消除重复                           │
│  ├── 改善命名                           │
│  ├── 保持测试通过                       │
│  └── 再次运行测试：必须仍然通过         │
└───────────────┬─────────────────────────┘
                │
                ▼
            下一个测试
```

## 反合理化表格

| 借口 | 现实 |
|------|------|
| "应该现在工作了" | 运行验证 |
| "我很有信心" | 信心 ≠ 证据 |
| "就这一次" | 无例外 |
| "Linter 通过了" | Linter ≠ 编译器 |
| "测试太慢" | 跳过测试 = 技术债 |

## 红旗 - 停止并重新开始

- ❌ 发现自己在没有失败测试的情况下写代码
- ❌ 测试失败但继续添加新功能
- ❌ 重构时测试失败但继续重构
- ❌ 跳过"简单"的测试

## 降级策略

当测试框架不可用或有问题时：

```
1. 尝试手动验证
2. 记录验证步骤到 Ticket 日志
3. 创建 TODO 补充自动化测试
4. 继续，但标记为 "partial_test"
```

## 测试命名规范

```
// Java (JUnit)
@Test
void should_返回成功_when_参数有效() { }

// TypeScript (Vitest)
it('should 返回成功 when 参数有效', () => { })

// Python (pytest)
def test_should_返回成功_when_参数有效():
```

## 执行伪代码

```python
def tdd_cycle(requirement):
    # RED
    test = write_test(requirement)
    run_test(test)
    assert test.result == FAILED, "测试应该失败"
    
    # GREEN
    code = write_minimal_code(requirement)
    run_test(test)
    assert test.result == PASSED, "测试应该通过"
    
    # REFACTOR
    refactored_code = refactor(code)
    run_test(test)
    assert test.result == PASSED, "重构后测试仍应通过"
    
    return refactored_code
```

## 硬约束

- 禁止在测试失败时说"完成"
- 禁止跳过测试步骤
- 禁止假设代码正确
- 必须运行实际验证
