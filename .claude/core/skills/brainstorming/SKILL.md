# Brainstorming Skill

---
name: brainstorming
description: "Use when user triggers /brainstorm - performs requirement analysis with automatic multi-round validation"
invoked_by: user
auto_execute: true
---

## 概览

需求头脑风暴与分析，自动迭代正向/反向校验，直到输出完美需求文档。

## 何时使用

- 用户执行 `/brainstorm {模块名}`
- 需要进行需求分析和细化
- 产出 IEEE 830 兼容的需求规格

## ⚠️ 执行模式 - 自动迭代

```
⚠️ 铁律：
1. 不等待用户确认 - 自动继续执行
2. 必须循环迭代 - 直到所有检查项都是 ✅
3. 有任何问题就补充，然后重新校验
```

## 执行流程

```
开始
  │
  ▼
[收集输入]
  │ - 用户需求描述
  │ - 相关规格文档
  │ - 已有代码参考
  │
  ▼
[生成初稿] ◄────────────────────┐
  │                              │
  ▼                              │
[正向校验] ──── 有问题？──────────┤
  │ ✅ 全部通过                  │ 补充需求
  ▼                              │
[反向校验] ──── 有问题？──────────┘
  │ ✅ 全部通过
  │
  ▼
[输出结果]
```

## 正向校验项（5 项）

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| 细节层级 | 每个功能点是否有输入/输出/约束？ | 全部有 | 任一缺失 |
| 最小路径 | 能否找到遗漏的步骤？ | 不能 | 能找到 |
| 影响分析 | 是否分析了对其他模块的影响？ | 是 | 否 |
| 错误处理 | 每个操作的异常情况是否定义？ | 是 | 否 |
| 标准合规 | 是否符合 IEEE 830 要素？ | 是 | 否 |

## 反向校验项（6 项）

| 检查项 | 检查问题 | 通过条件 | 不通过条件 |
|--------|----------|----------|------------|
| 用户视角 | 用户能完成目标吗？ | 能 | 不能 |
| 测试视角 | 能写出验收测试吗？ | 能 | 不能 |
| 场景覆盖 | 正常/异常/边界都覆盖了吗？ | 是 | 否 |
| 代码必要 | 需求都需要开发吗？ | 是 | 有冗余 |
| 重复检查 | 有重复的需求吗？ | 没有 | 有 |
| 可复用性 | 有可复用的模块吗？ | 已标注 | 未考虑 |

## 校验维度矩阵

| 维度 | 检查内容 | 方法 |
|------|----------|------|
| 结构层 | 编号连续、导航完整 | 逐个计数 |
| 格式层 | ID格式、时间格式、路径格式 | 正则验证 |
| 语义层 | 技术版本、配置值、业务术语 | 与 config.yaml 核对 |
| 逻辑层 | 流程完整、依赖正确、边界处理 | 走读验证 |

## 执行伪代码

```python
def brainstorming(user_input):
    # Step 1: 收集输入
    context = {
        "user_request": user_input,
        "spec_docs": read_spec_docs(),
        "existing_code": search_related_code()
    }
    
    # Step 2: 生成初稿
    requirement_doc = generate_requirement(context)
    
    # Step 3: 循环校验
    max_iterations = 10
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        
        # 正向校验
        forward_issues = []
        for check in FORWARD_CHECKS:
            result = check.execute(requirement_doc)
            if not result.passed:
                forward_issues.append(result.issue)
        
        if forward_issues:
            requirement_doc = enhance_doc(requirement_doc, forward_issues)
            continue  # 重新校验
        
        # 反向校验
        backward_issues = []
        for check in BACKWARD_CHECKS:
            result = check.execute(requirement_doc)
            if not result.passed:
                backward_issues.append(result.issue)
        
        if backward_issues:
            requirement_doc = enhance_doc(requirement_doc, backward_issues)
            continue  # 重新正向校验
        
        # 全部通过
        break
    
    # Step 4: 输出结果
    return format_output(requirement_doc)
```

## 输出格式

```markdown
## 📋 需求分析结果

### 校验轮次
- 总轮次: {iteration}
- 正向校验: ✅ 全部通过
- 反向校验: ✅ 全部通过

### 需求规格

#### 1. 概述
{功能概述}

#### 2. 功能需求
| ID | 需求描述 | 优先级 | 验收标准 |
|----|----------|--------|----------|
| REQ-001 | ... | P0 | ... |

#### 3. 非功能需求
...

#### 4. 接口定义
...

### ⏭️ 下一步
执行 `/split story` 将需求拆解为 Stories
```

## 硬约束

- 禁止跳过任何校验项
- 禁止在校验未全部通过时输出
- 禁止停下来等待用户确认
- 必须循环直到全部 ✅
