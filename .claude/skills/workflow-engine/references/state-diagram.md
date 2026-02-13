# 状态转换图

## 完整工作流

```
                              RPIV 工作流状态机
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────┐                                                            │
│  │ not_started │  ← 项目初始化后的状态                                       │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         │ /brainstorm                                                       │
│         ▼                                                                   │
│  ┌─────────────────┐                                                        │
│  │ brainstorm_done │  ← 需求分析完成                                         │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           │ auto: /split story                                              │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ story_split_done│  ← Story 拆分完成                                       │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           │ ⚠️ 需要审批 (config.approval.story_split)                        │
│           │ /approve stories                                                │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ stories_approved│  ← Stories 审批通过                                     │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           │ auto: /split ticket {story_id}                                  │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ticket_split_done│  ← Ticket 拆分完成                                      │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           │ ⚠️ 需要审批 (config.approval.ticket_split)                       │
│           │ /approve tickets                                                │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ tickets_approved│  ← Tickets 审批通过                                     │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           │ auto: /next                                                     │
│           ▼                                                                 │
│  ┌─────────────────┐ ◄───────────────────────┐                              │
│  │   ticket_done   │  ← Ticket 执行完成       │                              │
│  └────────┬────────┘                         │                              │
│           │                                  │                              │
│           ▼                                  │                              │
│     ┌───────────┐                            │                              │
│     │ 还有      │                            │                              │
│     │ pending   │───── 是 ────► auto: /next ─┘                              │
│     │ Tickets?  │              (循环执行)                                    │
│     └─────┬─────┘                                                           │
│           │ 否                                                              │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │all_tickets_done │  ← 当前 Story 的所有 Tickets 完成                       │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           │ auto: /verify {story_id}                                        │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │   story_done    │  ← Story 验收完成                                       │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           │ ⚠️ 需要审批 (config.approval.story_done)                         │
│           │ /approve {story_id}                                             │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │  story_approved │  ← Story 审批通过                                       │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│     ┌───────────┐                                                           │
│     │ 还有      │                                                           │
│     │ pending   │───── 是 ────► 回到 stories_approved                       │
│     │ Stories?  │              (处理下一个 Story)                            │
│     └─────┬─────┘                                                           │
│           │ 否                                                              │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │all_stories_done │  ← 所有 Stories 完成，工作流结束                         │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

图例：
  ⚠️ 需要审批  = 需要用户执行 /approve 命令（可通过 config.approval 配置为 auto）
  auto        = 自动继续，无需用户干预
  ───►        = 状态转换方向
  ◄───        = 循环回到此状态
```

## 审批配置

审批发生在**执行动作之前**。当 `next_step` 为以下动作时，检查对应的配置键：

| 动作 (next_step) | config.approval 键 | 默认值 | 说明 |
|------------------|-------------------|--------|------|
| `approve_stories` | `story_split` | required | Story 拆分后需要审批才能继续 |
| `approve_tickets` | `ticket_split` | required | Ticket 拆分后需要审批才能继续 |
| `approve_story` | `story_done` | required | Story 验收后需要审批才能继续 |
| `next` | `ticket_done` | auto | Ticket 完成后是否自动执行下一个 |

## 阶段划分

| 阶段 | 状态 | 触发命令 |
|------|------|----------|
| Init | not_started | /init-project |
| Research | brainstorm_done | /brainstorm |
| Plan | story_split_done, stories_approved, ticket_split_done, tickets_approved | /split, /approve |
| Implement | ticket_done, all_tickets_done | /next |
| Validate | story_done, story_approved, all_stories_done | /verify, /approve |

## 术语说明

- **状态 (state)**：`current_step` 的值，表示工作流当前位置，用 `_done` / `_approved` 后缀
- **动作 (action)**：`next_step` 的值，表示下一步要执行的操作，用动词形式
