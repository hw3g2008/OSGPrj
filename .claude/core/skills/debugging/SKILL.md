# Debugging Skill

---
name: debugging
description: "Use when encountering errors or failures - systematic debugging following 4-phase process"
invoked_by: agent
auto_execute: true
---

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

### Phase 4: 实施修复

```
[实施修复]
    │
    ▼
[验证修复]
    │ - 原问题解决
    │ - 没有新问题
    │
    ▼
[记录根因]
```

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
- 三次失败必须升级
- 必须记录所有尝试
