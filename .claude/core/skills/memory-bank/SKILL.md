# Memory-Bank Skill

---
name: memory-bank
description: "Use when needing to record/retrieve decisions - manages project decisions and context"
invoked_by: agent
auto_execute: true
---

## 概览

管理项目决策和上下文记忆，持久化关键决策以便跨会话访问。

## 何时使用

- 做出重要技术决策时
- 需要查阅历史决策时
- 会话结束前保存关键信息

## 记忆类型

| 类型 | 说明 | 示例 |
|------|------|------|
| decision | 技术决策 | "选择 Vue 3 Composition API" |
| architecture | 架构决策 | "前后端分离，使用 RESTful API" |
| convention | 约定 | "组件命名使用 PascalCase" |
| blocker | 阻塞项 | "等待后端 API 文档" |

## 文件结构

```yaml
# .claude/memory/decisions.yaml

decisions:
  - id: "D-001"
    type: "decision"
    timestamp: "2026-02-03T12:00:00Z"
    context: "用户登录模块技术选型"
    decision: "使用 JWT Token 进行认证"
    rationale: "无状态、易扩展、业界标准"
    impact:
      - "需要配置 Redis 存储 Token"
      - "前端需要处理 Token 刷新"
    
  - id: "D-002"
    type: "convention"
    timestamp: "2026-02-03T12:30:00Z"
    context: "前端代码规范"
    decision: "Vue 组件使用 script setup 语法"
    rationale: "更简洁、更好的 TypeScript 支持"
    impact:
      - "所有新组件使用新语法"
```

## 执行伪代码

```python
def record_decision(decision_type, context, decision, rationale):
    # 读取现有记忆
    memory = read_yaml(".claude/memory/decisions.yaml")
    
    # 生成新决策 ID
    decision_id = f"D-{len(memory.decisions) + 1:03d}"
    
    # 创建决策记录
    new_decision = {
        "id": decision_id,
        "type": decision_type,
        "timestamp": now_iso8601(),
        "context": context,
        "decision": decision,
        "rationale": rationale,
        "impact": analyze_impact(decision)
    }
    
    # 追加到记忆
    memory.decisions.append(new_decision)
    
    # 保存
    write_yaml(".claude/memory/decisions.yaml", memory)
    
    return decision_id


def retrieve_decisions(query=None, type=None):
    memory = read_yaml(".claude/memory/decisions.yaml")
    
    results = memory.decisions
    
    if type:
        results = [d for d in results if d.type == type]
    
    if query:
        results = [d for d in results if query.lower() in d.decision.lower()]
    
    return results
```

## 输出格式

### 记录决策

```markdown
## 📝 决策已记录

**ID**: D-001
**类型**: decision
**时间**: 2026-02-03T12:00:00Z

### 决策
使用 JWT Token 进行认证

### 背景
用户登录模块技术选型

### 理由
无状态、易扩展、业界标准

### 影响
- 需要配置 Redis 存储 Token
- 前端需要处理 Token 刷新
```

### 检索决策

```markdown
## 🔍 相关决策

查询: "认证"

| ID | 类型 | 决策 | 时间 |
|----|------|------|------|
| D-001 | decision | 使用 JWT Token | 2026-02-03 |
```

## 硬约束

- 决策必须有 rationale
- 决策必须有 context
- 时间戳必须是 ISO 8601 UTC
- 不能删除历史决策（只能追加）
