# 5 端 13 Stage 状态机门禁 — Reviewer Guide

## 这是什么

`state-machine.yaml` 是 `state-machine-gate.e2e.spec.ts` 的**唯一可信期望源**。
spec 内禁止 inline expect 数值/字符串，所有期望都从此文件读。

## 为什么这样设计 — 防 Claude 糊弄

LLM agent 跑测时常见糊弄模式：
1. 改 spec 内联期望，把 `expect(x).toBe(20)` 改 `21` 配合实际值
2. 用 `expect(...).toBeTruthy()` 等永真断言占位
3. `.skip` 跳过失败 test 后宣称"全过"
4. mock DB 结果伪造写入

本 gate 三层防御：

### Layer 1 — Baseline lock

- 所有 expect 写在 `state-machine.yaml`
- spec 中**不许**出现 inline 业务字符串/数字
- 改 baseline 必须独立 commit，PR diff 一眼可见
- Reviewer 检查改动是否合理：「为什么 mentor_badge 从 5 变 6 是对的？」

### Layer 2 — Evidence files

每次跑测产生 `tests/e2e/evidence/state-machine-gate/<timestamp>/<stage>/`：
- `dbAssert.json` — 原始 SQL + 实际返回 rows + timestamp
- `action-result.json` — driving API 调用 + body + result
- `<end>.png` — 5 端 full-page screenshot

PR 中 reviewer 可:
- 看 dbAssert.json 验证 SQL 真的查了 ride table
- 看 screenshot 眼检 UI 真状态
- 时间戳防伪造（PR 时间窗外的 evidence 应被质疑）

### Layer 3 — Invariants

每个 stage `invariants:` 字段是**对 pre/post 数字关系的语义断言**。例如：

```yaml
A1:
  pre:
    leadmentor_pending_tab: 2
  post:
    leadmentor_pending_tab: 1
  invariants:
    - 'post.leadmentor_pending_tab === pre.leadmentor_pending_tab - 1'
```

糊弄者要骗过此 invariant 必须**同时**改 pre + post + invariant 三处。

## Reviewer 检查清单

收到 PR 改 `state-machine.yaml` 或 `state-machine-gate.e2e.spec.ts` 时：

1. **baseline.yaml diff**: 期望值变更是否对应需求变更？
   - 譬如 admin_pending_tab 从 21 → 20 必须有对应的 stage action 解释
2. **invariants 完整性**: 修改 pre/post 数值是否对应 invariant 也调整？
3. **新 stage 必有 dbAssert**: 仅 UI 断言的 stage 算"软"——reviewer 拒签
4. **fix*Assert 字段**: FIX-1/FIX-2/FIX-3 三个修复点有显式断言条款
5. **evidence/ 目录是否被 .gitignore?**:
   - `tests/e2e/evidence/` 是临时跑测产物，**不应** commit
   - 但 CI artifact 应上传保留
6. **spec.ts 不许 inline 业务期望**:
   - 检查 `grep -n "toBe\|toEqual" state-machine-gate.e2e.spec.ts`
   - 期望右侧不应为字面常量（除非来自 baseline 解析）

## 跑测命令

```bash
# 本地
cd osg-frontend
E2E_MODULE=state-machine-gate pnpm test:e2e -- state-machine-gate

# 看 trace
pnpm exec playwright show-trace test-results/<...>/trace.zip

# 看 evidence
ls tests/e2e/evidence/state-machine-gate/<最新 timestamp>/
```

## CI 集成

`.github/workflows/state-machine-gate.yml` 在 PR 触发跑此 spec，失败 block merge.
Evidence 作为 artifact 上传，链接贴在 PR comment。

## 改 baseline 的合法场景

- 真实需求变更（如 UI 文案改了，badge 计数逻辑变了）
- 旧 baseline 本身就错（曾经 fix 过 bug 后未更新）

不合法场景：
- 「为了让 test 过」而改 expect
- 把 invariant 删除
- 把 dbAssert.expect 字段删掉
