# /checkpoint 命令

## 用法

```
/checkpoint               # 创建检查点
/checkpoint {描述}        # 创建带描述的检查点
```

## 说明

手动创建状态检查点，用于后续恢复。

Checkpoint 不仅保存 `workflow.*`，还要保存 execution plane 投影，确保会话恢复后仍能理解：
- 当前 materialized focus（`current_story` / `current_ticket`）
- `STATE.execution.*` 中的 active set
- ticket/story lease
- workspace/worktree 绑定
- scheduler 最近一次投影

## 执行流程

```
1. 触发 checkpoint-manager Skill
2. 读取当前状态
3. 压缩上下文
4. 生成 Checkpoint 文件
   - 包含 state_snapshot.workflow
   - 包含 state_snapshot.execution
5. 更新 STATE.yaml
```

## 自动触发时机

除手动创建外，以下情况会自动创建 Checkpoint：

- Ticket 完成后
- 上下文使用率 > 80%
- 会话结束前

## 输出示例

```markdown
## 💾 Checkpoint 已创建

**ID**: CP-20260203T123000Z
**触发**: manual
**描述**: "完成登录模块后端"

### 状态快照
- Story: S-001
- Ticket: T-003 (刚完成)
- 已完成: 3/7 Tickets
- Execution backend: inline
- Active tickets: 1

### 上下文摘要
- 关键决策: 3 条
- 当前任务: 实现登录模块
- 修改文件: 5 个

### 恢复命令
```
/restore CP-20260203T123000Z
```

或

```
/restore latest
```
```

## Checkpoint 文件位置

`.claude/checkpoints/CP-{timestamp}.yaml`

## 相关命令

- `/restore` - 恢复检查点
- `/status` - 查看当前状态
