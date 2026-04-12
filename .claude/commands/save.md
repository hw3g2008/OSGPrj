# /save 命令

## 用法

```
/save                     # 保存当前状态
/save "完成用户模块"       # 带备注的保存
```

## 说明

`/checkpoint` 的别名，保存当前状态到检查点。

除 `workflow.*` 外，也要一并保存 execution plane 投影，确保恢复后不会丢失当前 lease / workspace / scheduler 视图。

## 执行流程

等同于 `/checkpoint`：

```
1. 触发 checkpoint-manager Skill
2. 读取当前状态
3. 压缩上下文
4. 生成 Checkpoint 文件
   - 保存 workflow 快照
   - 保存 execution projection
5. 更新 STATE.yaml
```

## 输出

等同于 `/checkpoint` 的输出。

## 相关命令

- `/checkpoint` - 完整命令
- `/restore` - 恢复检查点
