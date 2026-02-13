---
paths:
  - "**/test/**"
  - "**/tests/**"
  - "**/__tests__/**"
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/*Test.java"
  - "**/*Tests.java"
---

# 测试规范

## 覆盖率门槛

| 类型 | 分支覆盖率 | 行覆盖率 | 说明 |
|------|-----------|---------|------|
| backend | **100%** | ≥ 90% | 后端代码必须 100% 分支覆盖 |
| database | **100%** | ≥ 90% | 数据库相关代码必须 100% 分支覆盖 |
| test | **100%** | ≥ 90% | 测试代码本身必须 100% 分支覆盖 |
| frontend | ≥ 90% | ≥ 80% | 前端功能代码 |
| frontend-ui | ≥ 80% | ≥ 70% | UI 还原代码 |

## 测试用例设计方法（必须应用）

1. **等价类划分** (Equivalence Partitioning) - 划分有效/无效输入类
2. **边界值分析** (Boundary Value Analysis) - 测试边界条件
3. **决策表测试** (Decision Table Testing) - 覆盖条件组合

## 测试类型（必须覆盖）

- ✅ 正向测试 (Happy Path)
- ✅ 负向测试 (Negative Testing)
- ✅ 边界测试 (Boundary Testing)
- ✅ 异常测试 (Exception Testing)
- ✅ null/空值测试

## 分支覆盖检查点

编写测试时，必须覆盖以下分支点：

- if/else 语句
- switch/case 语句
- 三元运算符
- 短路求值 (&&, ||)
- try/catch 块
- 循环边界（0次、1次、多次）

## 相关 Skills

- `test-design`: 测试用例设计，确保 100% 分支覆盖
- `test-execution`: 测试执行与覆盖率验证
- `tdd`: TDD 开发流程（Red-Green-Refactor）

## 验证命令

后端：
```bash
mvn test jacoco:report
# 覆盖率报告: target/site/jacoco/index.html
```

前端：
```bash
cd osg-frontend && pnpm test:coverage
# 覆盖率报告: osg-frontend/coverage/index.html
```
