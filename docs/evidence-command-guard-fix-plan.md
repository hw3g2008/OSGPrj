# 证据命令模式校验 — 守卫加固方案

## 问题

| 编号 | 问题 | 严重度 |
|------|------|--------|
| G-001 | `done_ticket_evidence_guard.py` 只检查 evidence 存在性和 exit_code，不校验 command 是否匹配 ticket type | Medium |

## 根因

SKILL.md line 737-741 定义了 `type → command` 映射规则：

| type | 要求的命令模式 |
|------|---------------|
| `backend` | 包含 `mvn` |
| `database` | 包含 `mvn compile` |
| `test` | 包含 `test`（mvn test 或 pnpm test） |
| `frontend-ui` | 包含 `build` |
| `frontend` | 同时包含 `test` **且** `build` |
| `config` | 具体语法检查命令（如 `yamllint`、`jsonlint`），不可为通用 "code review" |

但守卫脚本 line 108-110 只检查 `command` 非空，未按 type 做模式匹配。

## 修复方案

### 批次 1：在 `done_ticket_evidence_guard.py` 中新增命令模式校验

**修改文件**: `.claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py`

**新增内容**:

1. 在 `REQUIRE_ALL_DONE_STEPS` 常量后面新增 `COMMAND_PATTERNS` 字典：

```python
# type → (必须包含的关键词列表, 描述)
# command 必须同时包含列表中所有关键词（大小写不敏感）
COMMAND_PATTERNS = {
    "backend":     (["mvn"],               "必须包含 mvn"),
    "database":    (["mvn", "compile"],     "必须包含 mvn compile"),
    "test":        (["test"],              "必须包含 test"),
    "frontend-ui": (["build"],             "必须包含 build"),
    "frontend":    (["test", "build"],     "必须同时包含 test 和 build"),
    "config":      ([],                   "须为可执行命令，不可为空（由上层非空检查保证）"),
    # config 不做关键词校验，但上层已保证非空；SKILL.md 要求具体语法检查命令
}
```

2. 新增校验函数 `check_command_pattern(ticket_type, command)`：

```python
import re
from typing import Optional

def check_command_pattern(ticket_type: str, command: str) -> Optional[str]:
    """校验 command 是否匹配 ticket type 的命令模式。返回 None 表示通过，否则返回错误信息。
    
    注意: 要求 Python >= 3.9（项目当前环境 3.12）。
    """
    pattern = COMMAND_PATTERNS.get(ticket_type)
    if not pattern:
        return None  # 未注册的 type，跳过
    keywords, desc = pattern
    if not keywords:
        return None  # 空关键词列表（如 config），由上层非空检查保证
    # 使用正则词边界匹配，避免子串误判（如 "attest" 不应匹配 "test"）
    missing = [kw for kw in keywords if not re.search(r'\b' + re.escape(kw) + r'\b', command, re.IGNORECASE)]
    if missing:
        return f"type={ticket_type} 的 command 不符合规则（{desc}），缺少: {missing}"
    return None
```

3. 在主循环 line 108-110（command 非空检查后）插入调用：

```python
# 现有: command 非空检查
if not isinstance(command, str) or not command.strip():
    issues.append(f"{ticket_id}: verification_evidence.command 缺失或为空")
else:
    # 新增: 命令模式校验
    ticket_type = ticket.get("type", "")
    pattern_err = check_command_pattern(ticket_type, command)
    if pattern_err:
        issues.append(f"{ticket_id}: {pattern_err}")
```

### 影响范围

- 只影响 `done_ticket_evidence_guard.py`，单文件修改
- 向后兼容：T-030、T-039 已在本轮修复为 `test && build`，加固后应通过校验
- 新增校验不影响 `frontend-ui` 类型（只要求 build）

### 验证方法

```bash
# 对已修复的 S-004、S-006 跑守卫
python3 .claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py --story-id S-004
python3 .claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py --story-id S-006

# 对所有已完成 Story 跑守卫
for s in S-001 S-002 S-003 S-004 S-005 S-006; do
  python3 .claude/skills/workflow-engine/tests/done_ticket_evidence_guard.py --story-id $s
done
```
