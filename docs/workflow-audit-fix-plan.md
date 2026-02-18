# workflow-engine + framework-audit 漏洞修复方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- 修复 workflow-engine、framework-audit、config.yaml 中发现的 6 个漏洞
- 验收标准：所有状态映射与 state-machine.yaml 一致，auto_continue 字段被正确使用，config.yaml 审批配置完整

## 二、前置条件与假设

- 假设 1: state-machine.yaml 是单一事实来源（Single Source of Truth）
- 假设 2: brainstorming Skill 已稳定，其写入 auto_continue 的行为不变
- 假设 3: 所有 RPIV 主流程 Skill 已完成严谨性对齐

## 三、现状分析

### 相关文件

| 文件 | 角色 |
|------|------|
| `.claude/skills/workflow-engine/SKILL.md` | 状态机引擎伪代码 |
| `.claude/skills/workflow-engine/state-machine.yaml` | 状态机定义（SSOT） |
| `.claude/skills/framework-audit/SKILL.md` | 框架审计维度定义 |
| `.claude/skills/brainstorming/SKILL.md` | 写入 auto_continue 的唯一 Skill |
| `.claude/templates/state.yaml` | STATE.yaml 模板（定义 auto_continue 字段） |
| `.claude/project/config.yaml` | 审批配置（approval 节） |

### 上下游依赖

```
brainstorming → 写入 STATE.yaml (auto_continue=False)
                    ↓
workflow-engine → 读取 STATE.yaml → 判断是否自动继续
                    ↓
/approve → 写入 STATE.yaml (auto_continue=True)
```

### 发现的漏洞

| # | 文件 | 严重度 | 问题 | 根因 |
|---|------|--------|------|------|
| L-0 | workflow-engine/SKILL.md | 🔴高 | `auto_continue` 字段被写入但从未被读取 | 自动继续循环伪代码缺少 auto_continue 检查 |
| L-1 | workflow-engine/SKILL.md | 🟡中 | `requires_approval()` 缺少 `approve_brainstorm` 映射 | 硬编码字典不完整 |
| L-2 | workflow-engine/SKILL.md | 🟡中 | `get_next_command()` 缺少 `approve_brainstorm` 映射 | 硬编码字典不完整 |
| L-3 | framework-audit/SKILL.md | 🟡中 | 工作流链路 `ticket_approved` → 应为 `tickets_approved` | 拼写错误 |
| L-4 | framework-audit/SKILL.md | 🟡中 | 工作流链路缺少 3 个状态分支 | 链路定义过时 |
| L-5 | config.yaml | 🔴高 | approval 节缺少 `brainstorm_confirm` 键 | 审批配置不完整 |

### 影响分析

**L-0 的实际影响**：
- brainstorming 写 `auto_continue = False` 意图阻塞自动继续
- 但 workflow-engine 不检查此字段
- 当前"碰巧"能停下来，因为 L-1 导致找不到命令而停止
- 如果修复 L-1/L-2 但不修复 L-0，brainstorm 需求确认会被自动执行（因为 `requires_approval()` 依赖 config.approval 配置，而不是 auto_continue）

**L-1/L-2 的实际影响**：
- 自动继续循环遇到 `approve_brainstorm` 时输出"未知步骤"错误
- 功能上安全（会停止），但错误信息误导

**L-5 影响分析**：
即使修复 L-1（补全 approve_brainstorm 映射），`requires_approval("approve_brainstorm")` 会执行 `config.approval.get("brainstorm_confirm", "auto")`。由于 config.yaml 缺少 `brainstorm_confirm` 键，默认返回 `"auto"` → 不需要审批 → **自动执行 /approve brainstorm**。

这意味着 3 层阻塞机制全部失效：
1. `auto_continue = False` → workflow-engine 不检查（死代码）
2. `requires_approval()` → config.yaml 缺少键，默认 auto
3. `state-machine.yaml approval_required: true` → workflow-engine 不读取

当前“碰巧”能停下来的唯一原因是 L-2（get_next_command 返回 None → “未知步骤”停止）。

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | auto_continue 处理方式 | A: workflow-engine 检查 auto_continue / B: 删除 auto_continue，统一用 approval_required | A | auto_continue 已在模板和 brainstorming 中使用，删除影响范围大 |
| 2 | 硬编码字典 vs 读取 YAML | A: 补全硬编码 / B: 改为从 state-machine.yaml 读取 | A | 伪代码是指导性的，不是可执行代码；补全更简单 |
| 3 | framework-audit 链路修复范围 | A: 只修拼写 / B: 重写完整链路 | B | 链路缺少 3 个状态，只修拼写不够 |
| 4 | config.yaml 审批配置 | A: 添加 brainstorm_confirm: required / B: 不添加，依赖 auto_continue | A | 双重保险：auto_continue 是第一层阻塞，approval 配置是第二层 |

## 五、目标状态

### workflow-engine 自动继续循环（修复后）

```python
def auto_continue_loop():
    while True:
        state = get_workflow_state()

        # 检查 1: next_step 为空 → 停止
        if not state.next_step:
            break

        # 检查 2: auto_continue 为 False → 停止（新增）
        if state.auto_continue == False:
            print(f"⏸️ 自动继续已禁用，请手动执行: {get_next_command(state.next_step)}")
            break

        # 检查 3: 需要审批 → 停止
        if requires_approval(state.next_step, config):
            print(f"⏸️ 需要审批: {state.next_step}")
            break

        # 执行命令
        command = get_next_command(state.next_step, state)
        if not command:
            print(f"⚠️ 未知步骤: {state.next_step}")
            break

        result = execute(command)
        if not result.success:
            break
```

### framework-audit 工作流链路（修复后）

```
brainstorm_done → split_story → story_split_done → approve_stories →
stories_approved → split_ticket → ticket_split_done → approve_tickets →
tickets_approved → next → implementing → ticket_done → next → ...
  → all_tickets_done → verify → story_verified → [/cc-review 或 /approve]
  → story_done → approve_story → story_approved → next_story → [循环或结束]

分支:
  brainstorm → brainstorm_pending_confirm → approve_brainstorm → brainstorm_done
  verify → verification_failed → /verify → story_verified
  story_verified → /approve（跳过CC）→ story_approved
```

## 六、执行清单

### L-0: workflow-engine 自动继续循环补充 auto_continue 检查（🔴高）

**文件**: `.claude/skills/workflow-engine/SKILL.md`
**位置**: 第 159-196 行（自动继续循环流程图）
**操作**: 在“next_step 为空？”检查之后、“需要审批？”检查之前，插入 auto_continue 检查节点

具体修改：

1. **流程图**（第 164-195 行）：替换为以下完整流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    自动继续循环                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                           │
│  │ 读取 STATE   │                                           │
│  └──────┬───────┘                                           │
│         ▼                                                   │
│  ┌──────────────┐     是                                    │
│  │ next_step    ├────────────► 停止（工作流结束）            │
│  │ 为空？       │                                           │
│  └──────┬───────┘                                           │
│         │ 否                                                │
│         ▼                                                   │
│  ┌──────────────┐     否                                    │
│  │auto_continue├────────────► 停止，输出“自动继续已禁用”    │
│  │ 为 true？   │             + 下一步命令提示              │
│  └──────┬───────┘                                           │
│         │ 是                                                │
│         ▼                                                   │
│  ┌──────────────┐     是                                    │
│  │ 需要审批？   ├────────────► 停止，输出审批提示            │
│  └──────┬───────┘                                           │
│         │ 否                                                │
│         ▼                                                   │
│  ┌──────────────┐                                           │
│  │ 执行命令     │                                           │
│  └──────┬───────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐     失败                                  │
│  │ 命令结果？   ├────────────► 停止，输出错误                │
│  └──────┬───────┘                                           │
│         │ 成功                                              │
│         │                                                   │
│         └────────────────────► 回到「读取 STATE」           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

2. **边界情况表**（第 198-212 行）：新增一行
   ```
   | auto_continue 为 False | 停止，输出“自动继续已禁用”和下一步命令提示 |
   ```

### L-1: requires_approval() 补充 approve_brainstorm（🟡中）

**文件**: `.claude/skills/workflow-engine/SKILL.md`
**位置**: 第 59-64 行
**操作**: 在字典中新增一行

```python
    approval_config_keys = {
        "approve_brainstorm": "brainstorm_confirm",  # 新增
        "approve_stories": "story_split",
        "approve_tickets": "ticket_split",
        "approve_story": "story_done",
        "next": "ticket_done"
    }
```

### L-2: get_next_command() 补充 approve_brainstorm（🟡中）

**文件**: `.claude/skills/workflow-engine/SKILL.md`
**位置**: 第 84-94 行
**操作**: 在字典中新增一行

```python
    action_to_command = {
        "brainstorm": "/brainstorm",
        "approve_brainstorm": "/approve brainstorm",  # 新增
        "split_story": "/split story",
        ...
    }
```

### L-3 + L-4: framework-audit 工作流链路修复（🟡中）

**文件**: `.claude/skills/framework-audit/SKILL.md`
**位置**: 第 67-74 行（维度 2 链路定义）+ 第 76-80 行（检查项）
**操作**: 替换

旧链路（第 69-73 行）：
```
brainstorm_done → split_story → story_split_done → approve_stories →
stories_approved → split_ticket → ticket_split_done → approve_tickets →
ticket_approved → next → ticket_done/all_tickets_done → verify →
story_done → approve_story → story_approved → next_story → [循环或结束]
```

新链路：
```
brainstorm_done → split_story → story_split_done → approve_stories →
stories_approved → split_ticket → ticket_split_done → approve_tickets →
tickets_approved → next → implementing → ticket_done → next → ...
  → all_tickets_done → verify → story_verified → [/cc-review 或 /approve]
  → story_done → approve_story → story_approved → next_story → [循环或结束]

分支:
  brainstorm → brainstorm_pending_confirm → approve_brainstorm → brainstorm_done
  verify → verification_failed → /verify → story_verified
  story_verified → /approve（跳过CC）→ story_approved
```

检查项（第 76-80 行）：
- “10 个转换节点” → “15 个状态节点（含 2 个分支状态：brainstorm_pending_confirm、verification_failed）”

### L-5: config.yaml 补充 brainstorm_confirm 审批配置（🔴高）

**文件**: `.claude/project/config.yaml`
**位置**: 第 155-159 行（approval 节）
**操作**: 新增 `brainstorm_confirm: required`

```yaml
approval:
  brainstorm_confirm: required  # 新增：需求确认必须人工审批
  story_split: required
  ticket_split: auto
  ticket_done: auto
  story_done: auto
```

## 七、自校验结果

### 第 1 轮（通用 G1-G9）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 目标明确 | ✅ | 5 个漏洞，每个有明确修复内容 |
| G2 影响范围完整 | ✅ | 2 个文件，无下游影响（伪代码修改） |
| G3 执行清单可操作 | ✅ | 有文件、行号、具体内容 |
| G4 设计决策有理由 | ✅ | 3 个决策都有理由 |
| G5 前置条件满足 | ✅ | RPIV 主流程 Skill 已对齐 |
| G6 违反设计原则 | ✅ | 无 |
| G7 执行顺序正确 | ✅ | L-5 → L-0 → L-1 → L-2 → L-3+L-4（config 先于伪代码） |
| G8 遗漏修改项 | ✅ | 见第 2/3 轮，无遗漏 |
| G9 自洽 | ✅ | L-0 的 auto_continue 检查与 brainstorming 的写入一致 |

### 第 2 轮（交叉引用 F3）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| F3-1 state-machine.yaml 需要更新？ | ✅ | 不需要，已有 approval_required: true |
| F3-2 approve.md 需要更新？ | ✅ | 不需要，已有 brainstorm 审批流程 |
| F3-3 brainstorming/SKILL.md 需要更新？ | ✅ | 不需要，auto_continue 写入逻辑正确 |
| F3-4 templates/state.yaml 需要更新？ | ✅ | 不需要，已有 auto_continue 字段定义 |

### 第 3 轮（G8 遗漏检查 + L-5 交叉验证）

检查是否有其他 Skill 也写入 auto_continue 但未被检查：

| Skill | 写入 auto_continue？ | 说明 |
|-------|---------------------|------|
| brainstorming | ✅ 写入 False/True | 唯一写入者 |
| story-splitter | ❌ | 不写入 |
| ticket-splitter | ❌ | 不写入 |
| deliver-ticket | ❌ | 不写入 |
| verification | ❌ | 不写入 |
| approve.md (windsurf) | ✅ 写入 True | 审批后恢复 |
| commands/approve.md (claude) | ✅ 写入 True | 审批后恢复 |

只有 brainstorming 和 approve 写入 auto_continue。修复 L-0 后，workflow-engine 会正确检查此字段。✅ 无遗漏。

L-5 交叉验证：
- state-machine.yaml 第 41 行 `approval_key: brainstorm_confirm` → 与 config.yaml 新增键名一致 ✅
- workflow-engine 第 59 行（L-1 修复后）`"approve_brainstorm": "brainstorm_confirm"` → 与 config.yaml 键名一致 ✅
- approve.md 第 22-28 行 brainstorm 审批流程 → 无需修改 ✅

全部通过。
