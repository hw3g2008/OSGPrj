---
metadata:
  invoked-by: "agent"
  auto-execute: "true"
  related-skills: "verification-before-completion, when-stuck, fix"
---

# Debugging Skill

## 概览

系统化调试，遵循四阶段流程定位和修复问题。

## ⚠️ 铁律

```
1. 不要猜测 - 使用证据
2. 测试假设 - 不要假设
3. 三次相同失败后升级
4. 记录所有尝试
```

## 四阶段流程

### Phase 1: 根因调查

```
[收集错误信息]
    │ - 错误消息
    │ - 堆栈跟踪
    │ - 相关日志
    │
    ▼
[复现问题]
    │ - 记录复现步骤
    │ - 确认可重复
    │
    ▼
[定位范围]
    │ - 确定出错的文件/函数
    │ - 确定出错的行号
```

### Phase 2: 模式分析

```
[检查常见模式]
    │ - 空指针/undefined
    │ - 类型错误
    │ - 边界条件
    │ - 异步问题
    │
    ▼
[查找相似问题]
    │ - 搜索代码库
    │ - 检查历史决策
```

### Phase 3: 假设测试

```
[形成假设]
    │ - 基于证据
    │ - 可测试
    │
    ▼
[设计测试]
    │ - 最小化测试
    │ - 隔离变量
    │
    ▼
[执行测试]
    │
    ├── 假设正确 ──→ Phase 4
    │
    └── 假设错误 ──→ 新假设
```

### Phase 4: Fix Plan 生成

```
[生成 Fix Plan]
    │
    ▼
[输出 Fix Plan]
    │ - root_cause：一句话根因 + 代码位置 + 证据
    │ - fix_plan：最小修改方案（文件 + 具体变更 + 最小化理由）
    │ - impact：影响范围 + 回归风险评估
    │ - evidence：为什么这个方案正确的证据链
    │
    ▼
[返回给调用者]
```

**注意**：此阶段**仅生成 Fix Plan**，不执行代码实施。代码实施由调用者（`fix` skill Phase 3）负责。

## 三次失败规则

```
失败 1: 分析错误，调整方法
失败 2: 检查假设，扩大搜索范围
失败 3: 停止，请求人工介入或搜索外部资源
```

## 反合理化表格

| 借口 | 现实检查 |
|------|----------|
| "肯定是这里的问题" | 证据在哪？ |
| "重启应该能解决" | 这不是修复 |
| "环境问题" | 先验证 |
| "之前工作的" | 什么改变了？ |

## 红旗 - 停止并遵循流程

- ❌ 随机修改代码希望能工作
- ❌ 没有复现就开始修复
- ❌ 忽略错误消息的内容
- ❌ 同一个修复尝试多次

## 执行伪代码

```python
def debug(error):
    attempts = 0
    max_attempts = 3
    
    # Phase 1: 根因调查
    error_info = collect_error_info(error)
    reproduction = reproduce_error(error_info)
    
    if not reproduction.success:
        return {"status": "cannot_reproduce", "info": error_info}
    
    while attempts < max_attempts:
        attempts += 1
        
        # Phase 2: 模式分析
        patterns = analyze_patterns(error_info)
        similar = find_similar_issues(error_info)
        
        # Phase 3: 假设测试
        hypothesis = form_hypothesis(patterns, similar)
        test_result = test_hypothesis(hypothesis)
        
        if test_result.confirmed:
            # Phase 4: 实施修复
            fix = implement_fix(hypothesis)
            verify_result = verify_fix(fix, reproduction)
            
            if verify_result.success:
                record_root_cause(error, hypothesis, fix)
                return {"status": "fixed", "fix": fix}
        
        # 记录失败尝试
        log_attempt(attempts, hypothesis, test_result)
    
    # 三次失败，升级
    return {
        "status": "escalate",
        "attempts": attempts,
        "hypotheses": get_all_hypotheses()
    }
```

## 输出格式

```markdown
## 🐛 调试报告

### 错误信息
```
{error_message}
```

### 根因分析
**假设**: {hypothesis}
**验证**: {test_result}
**确认**: ✅/❌

### 修复
**文件**: {file_path}
**变更**: {change_description}

### 验证
- 原问题: ✅ 已解决
- 回归测试: ✅ 通过

### 经验记录
**根因**: {root_cause}
**预防**: {prevention_suggestion}
```

## 硬约束

- 禁止随机修改
- 禁止跳过复现步骤
- 三次失败必须升级（假设级别内部重试，上限 3 次）
- 必须记录所有尝试
- **被 `fix` skill 调用时**：输出格式必须包含 `root_cause` / `fix_plan` / `impact` / `evidence` 四个字段

## 升级语义说明

**debugging 的三次失败**：是**假设级别的内部重试**（同一 hypothesis 的不同验证路径），不触发 `when-stuck`。三次失败后返回 `status: escalate` 给调用者。

**fix 的升级触发**：是 `attempt_count` 级别的全局重试（换 hypothesis），`attempt_count ≥ 2` 才触发 `when-stuck`。两套升级规则各自独立，不可混淆。
