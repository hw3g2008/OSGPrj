---
name: quality-gate
description: "通用多维度校验引擎 — 被其他 Skill 的 Phase 3 全局终审引用的参考文档"
metadata:
  invoked-by: "reference"
  auto-execute: "false"
---

# Quality Gate — 通用多维度校验引擎

## 概览

本文档定义了 RPIV 各环节共用的**增强全局终审**逻辑。各 Skill（brainstorming、story-splitter、ticket-splitter、deliver-ticket、verification）在 Phase 3 全局终审中引用本文档的维度定义和校验规则。

**本文档不是可独立执行的 Skill**，而是被其他 Skill 引用的参考文档。

## 核心理念

```
领域专项校验（Phase 2）→ 增强全局终审（Phase 3）
       ↑                         ↑
   "做对了吗"              "做全了吗 + 做好了吗"

增强全局终审 = 三维度终审（原有）+ 多维度旋转校验（新增）
```

- **领域专项校验**（正向/反向/INVEST/质量6项等）只能发现"领域内"的问题
- **多维度旋转校验**（A~I 维度）能发现"跨领域"的问题（边界场景、数据流、安全、交叉影响等）
- 两者互补，缺一不可

## 9 个校验维度

| 维度 | 代号 | 关注点 | 示例问题 |
|------|------|--------|----------|
| **结构正确性** | A | 编号、格式、命名 | 编号是否连续？格式是否统一？ |
| **边界场景** | B | 空值、极端情况、异常输入 | 如果列表为空会怎样？超大输入？ |
| **数据流** | C | 字段定义、参数传递、状态一致 | 写入的字段和读取的字段是否一致？ |
| **兼容性** | D | 与已有组件/模块的交互 | 新增内容是否与已有系统兼容？ |
| **安全性** | E | 权限、输入校验、防御性编程 | 是否有权限越权风险？输入消毒？ |
| **可维护性** | F | 粒度、职责、命名、可读性 | 是否过大需要拆分？命名清晰？ |
| **语义准确性** | G | 描述与意图是否匹配 | 验收标准是否准确反映需求？ |
| **交叉影响** | H | 修改项之间的关联 | 新增项是否影响已有项？ |
| **回归风险** | I | 是否破坏已有功能 | 现有测试是否仍然通过？ |

## 各环节维度优先级

各环节按自身特点定义维度的检查顺序。优先维度在前几轮检查，次要维度在后续轮次。

| 环节 | 维度顺序（从高到低） |
|------|---------------------|
| **brainstorming** | B → C → E → H → A → D → G → F → I |
| **story-splitter** | A → G → H → C → B → D → F → E → I |
| **ticket-splitter** | C → H → B → D → A → G → F → E → I |
| **deliver-ticket** | E → I → H → B → C → D → G → A → F |
| **verification** | I → H → C → D → B → E → G → A → F |

**优先级设计依据**：
- **brainstorming**：需求阶段最容易遗漏边界场景（B）和数据流（C），安全（E）也常被忽略
- **story-splitter**：Story 拆分最关注结构（A）和语义（G），交叉影响（H）防止 Story 重叠
- **ticket-splitter**：Ticket 间数据传递（C）和交叉影响（H）最关键，粒度边界（B）次之
- **deliver-ticket**：代码实现阶段安全（E）和回归（I）最重要，交叉影响（H）防止改坏其他
- **verification**：验收阶段回归（I）是核心价值，交叉影响（H）和数据一致性（C）次之

## 各环节维度含义映射

| 维度 | brainstorming | story-splitter | ticket-splitter | deliver-ticket | verification |
|------|--------------|----------------|-----------------|----------------|-------------|
| **A** | REQ编号连续、格式统一 | Story编号、AC格式 | Ticket编号、依赖链格式 | 代码结构、命名规范 | 测试结构完整 |
| **B** | 空值/极端/异常场景 | Story过大/过小 | Ticket粒度超限 | 边界输入/空值处理 | 边界测试覆盖 |
| **C** | 字段定义一致性 | Story间数据依赖 | Ticket间数据传递 | API参数/返回值一致 | 数据一致性验证 |
| **D** | 与已有模块交互 | 与已有Stories交互 | 与已有Tickets交互 | 与已有代码兼容 | 与已有功能兼容 |
| **E** | 权限/输入校验需求 | 安全相关AC完整 | 安全相关Ticket存在 | 安全编码实践 | 安全测试覆盖 |
| **F** | 需求粒度/命名清晰 | Story大小/职责单一 | Ticket大小/职责单一 | 代码可读性 | 测试可维护性 |
| **G** | 描述与意图匹配 | AC与需求匹配 | Ticket与AC匹配 | 代码与Ticket匹配 | 测试与AC匹配 |
| **H** | REQ间关联影响 | Story间关联影响 | Ticket间关联影响 | 修改间关联影响 | 功能间关联影响 |
| **I** | 与已有需求冲突 | 与已有Stories冲突 | 与已有Tickets冲突 | 破坏已有功能 | 回归测试通过 |

## 增强全局终审 — 执行流程

```
[Phase 2 领域专项校验通过]
    │
    ▼
[Phase 3 增强全局终审] ◄──────────────────┐
    │                                       │
    ├── 3a. 三维度终审                      │
    │   ├── 上游一致性                      │
    │   ├── 下游可行性                      │
    │   └── 全局完整性                      │
    │                                       │
    ├── 3b. 多维度旋转校验                  │
    │   ├── 上轮有修改？→ 维度 H（交叉）   │
    │   └── 上轮无修改？→ 按优先级轮换      │
    │                                       │
    ├── 有问题？→ 修复 ────────────────────┘
    │
    ├── 无问题？→ 无修改轮次 += 1
    │   ├── 连续 2 轮无修改？→ ✅ 通过
    │   └── 否则 → 继续下一轮
    │
    └── 达到 max_rounds(10)？→ ❌ 失败退出
```

## 增强全局终审 — 伪代码

```python
def enhanced_global_review(artifact, artifact_type, context):
    """
    增强版全局终审 = 三维度终审 + 多维度旋转校验
    替换各 Skill 原有的 Phase 3

    参数:
      artifact: 待校验的产物（需求文档/Stories/Tickets/代码变更/测试报告）
      artifact_type: "brainstorm" | "story" | "ticket" | "code" | "verification"
      context: 上下文（PRD、已有代码、config等）

    引用:
      DIMENSION_PRIORITY: 从本文档"各环节维度优先级"表获取
      DIMENSION_MEANINGS: 从本文档"各环节维度含义映射"表获取
    """
    dim_priority = DIMENSION_PRIORITY[artifact_type]
    dim_meanings = DIMENSION_MEANINGS[artifact_type]

    max_rounds = 10
    no_change_rounds = 0
    dim_index = 0
    last_had_changes = False

    for round_num in range(1, max_rounds + 1):
        all_issues = []

        # === 3a. 三维度终审（每轮都做） ===
        # 上游一致性：产物是否与上游输入（PRD/需求/Story/Ticket）完全对齐？
        all_issues += check_upstream_consistency(artifact, context)

        # 下游可行性：产物能被下游正确使用吗？
        all_issues += check_downstream_feasibility(artifact, context)

        # 全局完整性：产物内部是否有逻辑矛盾或遗漏？
        all_issues += check_global_integrity(artifact, context)

        # === 3b. 多维度旋转校验（每轮选一个维度） ===
        if last_had_changes:
            dim = "H"  # 上轮有修改，优先检查交叉影响
        else:
            dim = dim_priority[dim_index % len(dim_priority)]
            dim_index += 1

        dim_issues = check_dimension(artifact, dim, dim_meanings[dim])
        all_issues += dim_issues

        # === 输出进度 ===
        print(f"  🔍 终审轮次 {round_num}/{max_rounds} (维度 {dim})")

        # === 判断 ===
        if all_issues:
            print(f"    ❌ {len(all_issues)} 个问题")
            for issue in all_issues:
                print(f"      - {issue}")
            artifact = fix_issues(artifact, all_issues)
            no_change_rounds = 0
            last_had_changes = True
        else:
            print(f"    ✅ 无问题")
            no_change_rounds += 1
            last_had_changes = False
            if no_change_rounds >= 2:
                print(f"  🎉 连续 {no_change_rounds} 轮无修改，终审通过")
                break
    else:
        return {"status": "failed", "reason": f"增强终审经过 {max_rounds} 轮仍未通过，请人工介入"}

    return artifact
```

## 三维度终审 — 各环节具体检查内容

### brainstorming

| 维度 | 检查内容 |
|------|---------|
| 上游一致性 | PRD 功能点 100% 覆盖？ |
| 下游可行性 | 每个 REQ 可拆分为 Story？ |
| 全局完整性 | REQ 之间无矛盾？ |

### story-splitter

| 维度 | 检查内容 |
|------|---------|
| 上游一致性 | 需求文档 FR 100% 覆盖？ |
| 下游可行性 | 每个 Story 有 AC 且可拆为 Tickets？估算 ≤5 天？ |
| 全局完整性 | Stories 之间无重叠？ |

### ticket-splitter

| 维度 | 检查内容 |
|------|---------|
| 上游一致性 | Story AC 100% 覆盖？ |
| 下游可行性 | 每个 Ticket 可独立执行？依赖存在？ |
| 全局完整性 | 依赖无环？allowed_paths 无冲突（或有依赖）？ |

### deliver-ticket

| 维度 | 检查内容 |
|------|---------|
| 上游一致性 | Ticket AC 全满足？ |
| 下游可行性 | 不破坏其他 Ticket 的代码？全量测试通过？ |
| 全局完整性 | 修改都在 allowed_paths 内？ |

### verification

| 维度 | 检查内容 |
|------|---------|
| 上游一致性 | 所有 Tickets 证据有效？ |
| 下游可行性 | 与其他已完成 Stories 无文件冲突？ |
| 全局完整性 | 所有 AC 满足？ |

## 进度输出格式

各 Skill 在执行增强全局终审时，必须按以下格式输出进度：

```
🔍 终审轮次 1/10 (维度 B — 边界场景)
  三维度终审:
    - 上游一致性: ✅
    - 下游可行性: ✅
    - 全局完整性: ✅
  多维度校验 (B 边界场景):
    ❌ 2 个问题
      - 缺少空列表场景处理
      - 缺少超大输入校验

🔍 终审轮次 2/10 (维度 H — 交叉影响)
  三维度终审: ✅ 3/3
  多维度校验 (H 交叉影响):
    ✅ 无问题

🔍 终审轮次 3/10 (维度 C — 数据流)
  三维度终审: ✅ 3/3
  多维度校验 (C 数据流):
    ✅ 无问题

🎉 连续 2 轮无修改，终审通过
```

## 硬约束

- **max_rounds = 10** — 增强全局终审最多 10 轮，超过则失败退出
- **连续两轮无修改** — 退出条件，不是"一轮无修改"
- **上轮有修改 → 维度 H** — 任何修改后必须优先检查交叉影响
- **每轮必须输出进度** — 格式见上方"进度输出格式"
- **禁止跳过三维度终审** — 每轮都必须做三维度终审 + 多维度旋转
- **禁止在终审未通过时输出结果或更新状态**

## 失败退出规则

```
⚠️ 当 max_rounds（10 轮）后仍有问题：
1. 输出失败报告（列出最后一轮的所有未通过项）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 停止自动继续 — 提示用户人工介入
4. 用户可以修复后重新执行对应命令
```

## 各 Skill 引用方式

各 Skill 在 Phase 3 伪代码中按以下方式引用本文档：

```python
# ========== Phase 3: 增强全局终审 ==========
# 参见 quality-gate/SKILL.md 的 enhanced_global_review()
# 本环节维度优先级: {从本文档"各环节维度优先级"表获取}
# 本环节维度含义: {从本文档"各环节维度含义映射"表获取}
# 本环节三维度检查: {从本文档"三维度终审 — 各环节具体检查内容"获取}

enhanced_global_review(artifact, "{artifact_type}", context)
```
