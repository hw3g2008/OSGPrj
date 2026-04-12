# /restore 命令

## 用法

```
/restore latest           # 恢复最新检查点
/restore CP-xxx           # 恢复指定检查点
```

## 说明

从检查点恢复状态，用于会话恢复或回滚。

恢复时不仅回填 `workflow.*`，也要恢复 execution plane 投影，确保 scheduler / backend 视角连续：
- `current_story` / `current_ticket`
- `execution.active_stories`
- `execution.active_tickets`
- `execution.story_leases`
- `execution.ticket_leases`
- `execution.workspaces`
- `execution.scheduler`

## 执行流程

```
1. 触发 checkpoint-manager Skill
2. 读取 Checkpoint 文件
3. 恢复 STATE.yaml
   - 恢复 workflow 快照
   - 恢复 execution projection
4. 加载上下文摘要
5. 输出恢复报告
```

## 输出示例

```markdown
## 🔄 Checkpoint 已恢复

**来源**: CP-20260203T123000Z
**创建时间**: 2026-02-03T12:30:00Z

### 恢复的状态
- Story: S-001
- Ticket: T-003
- 进度: 3/7 Tickets
- Execution backend: inline
- Active tickets: 1

### 上下文摘要
- 使用 JWT Token 认证
- Vue 3 Composition API
- 已完成登录后端接口

### 工作记忆
- 最近修改: LoginController.java, LoginService.java
- 测试状态: 通过

### ⏭️ 继续执行
执行 `/next` 继续下一个 runnable Ticket
```

## 使用场景

1. **新会话恢复**
   - 新开会话时自动或手动恢复
   - `/restore latest`

2. **回滚到特定点**
   - 遇到问题需要回滚
   - `/restore CP-xxx`

3. **上下文满后恢复**
   - 自动创建了 Checkpoint
   - 新会话中 `/restore latest`

## 相关命令

- `/checkpoint` - 创建检查点
- `/status` - 查看当前状态
