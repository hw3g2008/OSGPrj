---
description: 保存当前工作检查点，记录状态快照
---

# 保存检查点

## 使用方式

```
/checkpoint [描述]
```

## 执行步骤

1. **读取当前状态**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`

2. **创建检查点**
   - 记录当前时间戳
   - 记录 `current_story`、`current_ticket`、`workflow.current_step`
   - 记录用户提供的描述（如有）

3. **更新状态文件**
   - 更新 `STATE.yaml` 的 `last_checkpoint` 字段
   - 格式：`{timestamp}_{description}`

4. **Git 提交**（可选）
   - 如果有未提交的变更，建议执行 git commit
   - 提交信息：`checkpoint: {描述}`

5. **输出确认**
   - 显示检查点信息
   - 提示可用 `/restore` 恢复
