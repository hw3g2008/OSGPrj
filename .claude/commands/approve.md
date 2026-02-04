# /approve 命令

## 用法

```
/approve stories          # 审批 Story 拆分
/approve tickets          # 审批 Ticket 拆分
/approve S-xxx            # 审批 Story 完成
/approve T-xxx            # 审批 Ticket 完成
```

## /approve stories

### 说明

审批 Story 拆分结果，确认可以开始 Ticket 拆分。

### 执行流程

```
1. 显示所有 Stories 摘要
2. 等待用户确认
3. 更新 STATE.yaml: phase = "stories_approved"
```

### 下一步

执行 `/split ticket S-001` 拆分第一个 Story

---

## /approve tickets

### 说明

审批 Ticket 拆分结果，确认可以开始执行。

### 执行流程

```
1. 显示所有 Tickets 摘要
2. 显示依赖图
3. 等待用户确认
4. 更新 STATE.yaml: phase = "tickets_approved"
```

### 下一步

执行 `/next` 开始执行第一个 Ticket

---

## /approve S-xxx

### 说明

审批指定 Story 完成。

### 前提条件

- Story 的所有 Tickets 已完成
- 所有验收标准已验证

### 执行流程

```
1. 触发 QA Agent 验证
2. 显示验证报告
3. 等待用户确认
4. 更新 Story 状态为 completed
5. 更新 STATE.yaml
```

---

## /approve T-xxx

### 说明

审批指定 Ticket 完成（当 config.approval.ticket_done != "auto" 时需要）。

### 执行流程

```
1. 显示 Ticket 完成摘要
2. 显示代码审查结果
3. 等待用户确认
4. 更新 Ticket 状态为 completed
5. 更新 STATE.yaml
```

---

## 示例

```
# 审批 Stories
/approve stories

# 审批 Tickets
/approve tickets

# 审批 Story 完成
/approve S-001

# 审批 Ticket 完成
/approve T-003
```
