---
description: 轻量 E2E 验收 - 按指定测试用例文档用 Playwright MCP 逐条执行网页实测
---

# /e2e — 轻量 E2E 验收测试

**适用场景**：
- /fix 完成后，跑 plan 文档中的验收用例
- 单模块/单功能的快速端到端验证
- 不需要启动全部 5 端的场景

**不适用**：全系统验收（用 /yanshou）

---

## Step 1 — 确认测试用例来源

接受以下任一形式：
- 用户指定 plan 文件路径（如 `docs/plans/xxx-plan.md`），从中提取验收标准/测试用例表
- 用户直接贴测试用例列表
- 默认：检查最近修改的 `docs/plans/*-plan.md` 中是否包含测试用例

读取文档，提取测试用例，输出：

> 找到 N 条测试用例：
> 1. xxx
> 2. xxx
>
> 确认执行？

⛔ 等用户确认后才继续。

---

## Step 2 — 环境检查

1. 后端健康检查：`curl -fsS http://127.0.0.1:28080/actuator/health`
2. 用 `mcp1_browser_navigate` 访问目标前端（默认 `http://127.0.0.1:3005`），确认页面加载
3. 如需登录，用 MCP Playwright 完成登录：
   - `mcp1_browser_navigate` → 登录页
   - `mcp1_browser_type` → 输入账号密码
   - `mcp1_browser_click` → 点击登录
   - `mcp1_browser_wait_for` → 等待首页加载
4. 默认账号：admin / Osg@2026（用户可指定其他）

环境不可达则 **停止并报告**。

---

## Step 3 — 逐条执行测试用例

### Reconnaissance-Then-Action 模式

对每条测试用例，遵循先侦察后行动：

1. **导航**：`mcp1_browser_navigate` 到目标页面
2. **侦察**：`mcp1_browser_snapshot` 或 `mcp1_browser_evaluate` 获取页面状态
3. **操作**：`mcp1_browser_click` / `mcp1_browser_type` / `mcp1_browser_select_option` 执行用户操作
4. **等待**：`mcp1_browser_wait_for` 等待结果渲染
5. **断言**：`mcp1_browser_evaluate` 检查 DOM 内容是否符合预期

### 验证手段优先级

1. **UI 断言**：`mcp1_browser_evaluate` 检查 DOM 文本/属性
2. **API 断言**：`mcp1_browser_evaluate` + `fetch()` 检查接口返回
   - 认证 token：`localStorage.getItem('osg_token')`
   - 示例：`fetch('/api/xxx', { headers: { 'Authorization': 'Bearer ' + token } })`
3. **DB 断言**：`run_command` + mysql CLI（只读 SELECT）
   - 连接：`mysql -h 47.94.213.128 -P 23306 -u ruoyi -p'app123456' ry-vue`

### 执行规则

- 单条失败不阻塞，记录后继续下一条
- 如果某条依赖前一条且前一条失败，标记 ⚠️ SKIP（依赖失败）
- 每条之间 `mcp1_browser_wait_for` 适当等待（1-2秒）

---

## Step 4 — 输出结果报告

输出 Markdown 表格：

```
## E2E 验收结果

| # | 测试用例 | 预期 | 实际 | 状态 |
|---|---------|------|------|------|
| 1 | xxx | xxx | xxx | ✅ PASS |
| 2 | xxx | xxx | xxx | ❌ FAIL |

**通过率**: X/N (XX%)
```

- 全部通过：输出 "✅ 全部 N 条通过"
- 有失败：列出失败详情 + 建议修复方向
