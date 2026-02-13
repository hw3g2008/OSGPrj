---
description: 保存当前进度到 STATE.yaml
---

# 保存进度

## 使用方式

```
/save
```

## 执行步骤

1. **读取当前状态**
   - 读取 `osg-spec-docs/tasks/STATE.yaml`

2. **更新会话信息**
   - 更新 `last_session_end` 为当前时间
   - 确保所有进行中的任务状态正确

3. **汇总未完成项**
   - 列出当前 Story 的剩余 Tickets
   - 列出任何阻塞项

4. **输出摘要**
   - 本次会话完成了什么
   - 下次会话应该从哪里继续
   - 提示：下次启动时使用 `/status` 查看进度
