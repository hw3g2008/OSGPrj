# /verify 命令

## 用法

```
/verify S-xxx             # 验收指定 Story
/verify T-xxx             # 验证指定 Ticket
```

## 说明

触发测试验收，由 QA Agent 执行。

## 执行流程

```
1. 触发 QA Agent
2. 加载 verification Skill
3. 检查所有 Tickets 完成状态
4. 验证验收标准
5. 运行测试（含 frontend Ticket 时追加 E2E: bash bin/e2e-api-gate.sh {module} full）+ 场景义务完整性校验（required_test_obligations 是否被 TC 覆盖且已执行，pending 状态阻断）
6. 输出验证报告
7. 更新 workflow:
   - current_step = "story_verified" 或 "verification_failed"
   - next_step = null  # 用户自行选择 /cc-review 或 /approve
8. 事件审计（W6a）:
   - 调用 append_workflow_event(build_event(command="/verify", state_from=old_step, state_to=new_step))
   - 写入失败时回滚 STATE.yaml 并终止（见 workflow-engine/SKILL.md §6）
```

## 输出示例

```markdown
## 📋 验证报告

**Story**: S-001 - 用户登录

### Tickets 状态
| ID | 标题 | 状态 |
|----|------|------|
| T-001 | 创建 LoginController | ✅ |
| T-002 | 实现登录逻辑 | ✅ |
| T-003 | 创建登录页面 | ✅ |

### 验收标准
| 标准 | 状态 | 证据 |
|------|------|------|
| 可以使用手机号登录 | ✅ | 测试通过 |
| 登录后跳转首页 | ✅ | E2E 测试通过 |

### 测试结果
- 单元测试: 15 passed
- 集成测试: 5 passed

### 结论
✅ 验证通过

### ⏭️ 下一步
- `/cc-review` — 调用 Claude Code 交叉审核（推荐）
- `/approve S-001` — 跳过 CC 审核，直接审批完成 Story
```
