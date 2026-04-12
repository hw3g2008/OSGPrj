# /plan-deliver 命令

## 用法

```bash
/plan-deliver
/plan-deliver {module-or-requirement}
```

## 说明

`/plan-deliver` 是一个薄编排入口，用来把现有 RPIV 主流程串起来，减少用户记忆多条命令的成本。

它**不会**重写现有工作流逻辑，而是根据当前 `STATE.yaml` 判断此刻该继续哪一条规范命令：

- `/brainstorm`
- `/split story`
- `/split ticket S-xxx`
- `/next`
- `/approve`
- `/final-closure`

## 核心原则

1. 先读取 `STATE.yaml` 和 `.claude/project/config.yaml`
2. 只分发现有规范命令
3. 不直接写 `STATE.yaml`
4. 不绕过既有审批门
5. 遇到现有 pause state 立即停止

## 继续规则

| 当前状态 | 动作 |
|---|---|
| `not_started` | `/brainstorm {arg or current_requirement}` |
| `brainstorm_done` | `/split story` |
| `story_split_done` | 若审批必需则停下，否则 `/approve stories` |
| `stories_approved` | `/split ticket {current_story}` |
| `ticket_split_done` | 若审批必需则停下，否则 `/approve tickets` |
| `tickets_approved` | `/next` |
| `implementing` | `/next` |
| `story_verified` | 若审批必需则停下，否则 `/approve {current_story}` |

## 暂停规则

| 当前状态 | 停止原因 | 下一步 |
|---|---|---|
| `brainstorm_pending_confirm` | 有待裁决项 | `/approve brainstorm` |
| `story_verified` | 若 `approval.story_done=required` 则等待审批；若 `approval.story_done=auto` 则自动继续 | `required` → `/approve {current_story}`；`auto` → 自动分发 `/approve {current_story}` |
| `verification_failed` | 当前 Story 验收失败 | 修复后 `/verify {current_story}` |
| `all_stories_done` | 主链完成 | `/final-closure {module}` |

## 参数规则

1. 传入参数时，优先用于尚未开始或需要重新进入 brainstorm 的场景
2. 无参数时，默认使用 `STATE.current_requirement`
3. 若既没有参数，也没有可用的 `current_requirement`，命令应停止并提示补充模块信息

## 示例

```bash
# 从当前状态继续
/plan-deliver

# 从模块入口开始
/plan-deliver admin
```

## 输出语义

- **继续型输出**：告诉用户即将继续哪条既有命令
- **暂停型输出**：明确为什么停下、应该执行哪条下一步命令
- **完成型输出**：主链结束后，提示 `/final-closure {module}`
