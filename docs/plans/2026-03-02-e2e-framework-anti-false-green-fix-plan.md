# E2E Framework Anti-False-Green Fix Plan (Plan Only)

Date: 2026-03-02  
Status: Completed (Implemented & verified on 2026-03-03)  
Owner: workflow-framework
Design Doc: `docs/plans/2026-03-02-e2e-framework-anti-false-green-design.md`
Standard Baseline: `docs/plans/FOUR-PACK-STANDARD.md`

## 0. 执行快照（2026-03-03）

### 0.1 文档边界（本计划负责什么）

1. 负责“运行态 E2E 防假绿”：
   - 统一 E2E 入口
   - `@api` 硬断言门禁
   - final-gate/final-closure 审计字段与失败语义
2. 不负责视觉基线契约（`UI-VISUAL-CONTRACT`、视觉截图对照），该部分由 `2026-03-02-prd-visual-contract-evolution-plan.md` 负责。

### 0.2 当前落地状态（按仓库现状）

1. 已落地：
   - `e2e_api_guard.py` 已存在并接入主链。
   - `bin/e2e-api-gate.sh` 已存在并被 `final-gate` 调用。
   - `final-closure` 已记录 `e2e_api_gate_log` / `first_failure_evidence` / `first_proxy_error_evidence`。
   - G1/G2/G3/G4/G5 已全部落地并通过 `final-closure permission --cc-mode off` 验证。
2. 备注：
   - `cc_mode=optional|required` 依赖当前终端登录态；未登录时会给出 `PARTIAL`（非框架逻辑失败）。

### 0.3 与视觉计划的执行顺序

1. 本计划先落地（先保证“不会假绿”）。
2. 再落视觉计划（保证“视觉一致性可审计”）。
3. 最终 `final-gate` 同时包含：运行态门禁 + 视觉门禁。

### 0.4 本计划收敛标准（Done）

1. `final-closure` 报告具备 `first_failure_evidence` 与 `first_proxy_error_evidence`（PASS 时为 `none`）。
2. `mode=full|api` 下日志出现 `worker_policy=serial`。
3. 命中登录锁或登录契约失败时，E2E 不执行且直接 FAIL（`EXIT 12`）。

### 0.5 与上位标准关系（2026-03-03）

1. 本计划遵循 `docs/plans/FOUR-PACK-STANDARD.md`：
   - 文档治理与执行门禁按该标准第 1~6 节执行；
   - 涉及视觉验收语义时，复用该标准第 7 节统一口径。
2. 若本计划内容与上位标准冲突，以上位标准为准，并先更新上位标准再回改本计划。

## 1. 目标

把“E2E 误通过/漏拦截”的风险做成框架级硬约束，确保：

1. `@api` 用例必须验证真实后端返回，不允许“页面还在 login 也算通过”。
2. 所有关键流程（`final-gate` / `final-closure` / `cc-review`）使用统一 E2E 门禁入口。
3. 审计产物可追溯，失败原因可复盘，不依赖临时日志。

## 2. 回源审计结论（计划前快照）

> 说明：本节是“制定计划前”的历史快照，仅用于解释为何要修复；不代表当前代码现状。当前落地状态以 §10~§13 与最新审计产物为准。

### High

1. `@api` 用例仍存在“弱断言可通过”漏洞（真实存在）
   - 证据：`osg-frontend/tests/e2e/forgot-password.e2e.spec.ts:22`
   - 现状：仅点击按钮，不校验 API 响应状态/业务码，不校验流程达成。
   - 风险：后端异常时仍可能 PASS（本轮实测中该用例在其他 `@api` 失败时仍通过）。

2. 缺少 E2E 质量静态守卫（真实存在）
   - 证据：`.claude/skills/workflow-engine/tests` 下无 `e2e_api_guard.py`（当前列表仅 runtime/event/traceability 等）。
   - 现状：框架无法在“执行前”拦截弱模式（如 `@api` 无 API 断言）。
   - 风险：后续 AI/人工新增用例时，弱断言会再次进入主干。

3. 没有“单一必经 E2E API 门禁脚本”（真实存在）
   - 证据：`.claude/project/config.yaml` 的 E2E 命令仍是直接 `pnpm --dir osg-frontend test:e2e`
   - 现状：存在直接跑 `pnpm` 的旁路，语义不统一。
   - 风险：执行入口分叉，容易出现“本地通过/门禁失败”或“门禁规则被绕开”。

### Medium

4. E2E 代理错误日志为临时文件，不进入审计链
   - 证据：`bin/final-gate.sh:76` 写入 `/tmp/final-gate-e2e-*.log`
   - 风险：跨会话/跨机器无法复盘，审计链不完整。

5. `final-closure` 仅 grep 两类 WARNING，未对代理错误文案做二次兜底
   - 证据：`bin/final-closure.sh:321`
   - 现状：依赖 `final-gate` 当前实现非零退出；若后续脚本变更，可能漏拦截。

6. `cc-review`（story 类型）未要求 E2E API 质量守卫证据
   - 证据：`.windsurf/workflows/cc-review.md:28`
   - 现状：只跑 runtime/done-ticket 守卫。
   - 风险：Story 可进入审批，但 E2E API 质量未被硬性门禁覆盖。

## 3. 设计决策（本次计划）

1. 新增“静态质量守卫” + “运行时统一门禁”双保险。
2. `@api` 测试契约从“建议”升级为“硬性规则”。
3. 所有 E2E 关键日志进入 `osg-spec-docs/tasks/audit/`，禁止只写 `/tmp`。
4. 统一入口优先于“到处补丁”，减少未来漂移。

## 4. 修复批次计划

## Batch A: `@api` 契约与静态守卫（最高优先级）

### A1. 补齐弱用例
- Modify: `osg-frontend/tests/e2e/forgot-password.e2e.spec.ts`
- 目标：
  - 显式等待并断言关键 API（例如 `/api/system/password/sendCode`、`/api/system/password/verify`、`/api/system/password/reset`）；
  - 每步至少断言 HTTP 2xx + 业务 `code=200`；
  - 去掉“仅点击不验证结果”的路径。

### A2. 新增静态守卫脚本
- Create: `.claude/skills/workflow-engine/tests/e2e_api_guard.py`
- 规则（至少）：
  1. `@api` 用例必须包含 API 断言函数调用（如 `assertRuoyiSuccess`）；
  2. 禁止 URL 容错模式：`/dashboard|/login`、`/permission/...|/login`；
  3. 禁止“检测登录页后直接 return”；
  4. 禁止 `@api` 用例仅 UI 可见性断言无接口断言。

### A3. 接入总门禁
- Modify: `bin/final-gate.sh`
- 位置：E2E 执行前新增步骤（建议 Step 4.5 或 Step 8 前）
- 失败策略：`e2e_api_guard.py` 非 0 则立即 FAIL。

## Batch B: 统一运行时入口（消除旁路）

### B1. 新增统一脚本
- Create: `bin/e2e-api-gate.sh`
- 职责：
  1. 解析并统一 `BASE_URL/BASE_HEALTH_URL`；
  2. 注入 `E2E_API_PROXY_TARGET="${BASE_URL}"`；
  3. 运行 `pnpm --dir osg-frontend test:e2e:api`；
  4. 扫描并拦截 `proxy error/ECONNREFUSED`；
  5. 输出结构化审计日志到 `osg-spec-docs/tasks/audit/`。

### B2. `final-gate` 复用统一脚本
- Modify: `bin/final-gate.sh`
- 目标：移除内联 E2E 逻辑重复，实现“单一真源”。

### B3. 配置收敛
- Modify: `.claude/project/config.yaml`
- 目标：新增 `commands.ops.e2e_api_gate`，并由 `final-gate/final-closure/workflow 文档`统一引用，避免死配置与旁路执行。

## Batch C: 工作流与审计链闭环

### C1. workflow 命令口径统一
- Modify: `.windsurf/workflows/final-closure.md`
- Modify: `.windsurf/workflows/cc-review.md`
- 目标：文档中 E2E/API 相关执行入口统一为 `bin/e2e-api-gate.sh` 或 `final-gate`，禁止散落命令。

### C2. 产物落盘硬约束
- Modify: `bin/final-gate.sh`
- Modify: `bin/final-closure.sh`
- 目标：
  - E2E 日志写入 `osg-spec-docs/tasks/audit/e2e-api-gate-{module}-{date}.log`
  - 日志由 `bin/e2e-api-gate.sh` 负责创建（单一责任）
  - `final-gate` 内 E2E 失败归类 `exit 12`
  - `final-closure` 校验该产物存在，否则 `EXIT 15`
  - `final-closure` 增加对 `proxy error/ECONNREFUSED` 的防回归 grep 兜底

## Batch D: 反向回归（防再次发生）

### D1. 守卫脚本反向测试
- Create: `.claude/skills/workflow-engine/tests/e2e_api_guard_selftest.py`
- 目标：用“故意违规样例”验证守卫确实会失败。

### D2. 门禁行为反向测试
- Create: `.claude/skills/workflow-engine/tests/e2e_gate_regression.py`
- 目标：
  - 后端不可达时，`@api` 门禁必须 FAIL（非 SKIP/PASS）；
  - 存在 proxy error 时，门禁必须 FAIL。

## 5. 验收标准（DoD）

1. `python3 .claude/skills/workflow-engine/tests/e2e_api_guard.py` 对当前仓库返回 0。
2. `forgot-password @api` 在后端不可达时 FAIL，在后端可达时按真实 API 断言通过。
3. `bin/final-gate.sh` 不再依赖 `/tmp` 作为唯一 E2E 证据。
4. `bin/final-closure.sh` 能校验 E2E API 审计产物存在，缺失即失败。
5. `.windsurf/workflows/*.md` 不再出现直接裸跑 `pnpm ... test:e2e:api` 的主路径说明。
6. `bin/final-gate.sh` 不再直接调用 `pnpm --dir osg-frontend test:e2e*`，仅调用 `bin/e2e-api-gate.sh`。

## 6. 实施顺序（建议）

1. A1 -> A2 -> A3
2. B1 -> B2 -> B3
3. C1 -> C2
4. D1 -> D2

## 7. 风险与控制

1. 风险：规则过严导致误报
   - 控制：`e2e_api_guard.py` 提供明确错误码与违规行号；先 warn 模式试跑 1 轮再切 hard fail。

2. 风险：统一入口改造影响现有命令习惯
   - 控制：保留旧命令兼容期，但在 workflow 文档中降级为“不推荐”。

3. 风险：日志文件增多
   - 控制：审计目录按日期归档；保留策略在后续运维计划定义。

## 8. 本文档边界

1. 本文档只定义修复计划，不包含具体代码变更。
2. 代码修复需按本计划逐批执行并逐批验收。
3. 本计划不改写视觉验收基础口径；视觉规则由 `FOUR-PACK-STANDARD.md` 第 7 节统一定义。

## 9. 新增问题吸纳（2026-03-02 回源确认）

### 9.1 问题归因矩阵（是否应由框架固化）

1. `request.ts` 响应拦截器只返回 `data`，导致 `/captchaImage`（无 `data` 包装）返回 `undefined`
   - 证据：`osg-frontend/packages/shared/src/utils/request.ts:31`
   - 定性：业务层契约兼容缺陷（一次性代码修复）+ 框架层应增加契约守卫（防回归）。

2. E2E 登录断言使用 `loginBody.data.token`，与后端真实结构不一致（token 顶层）
   - 证据：`osg-frontend/tests/e2e/support/auth.ts:57`，`ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysLoginController.java:64`
   - 定性：测试代码缺陷（一次性代码修复）+ 框架层应增加登录契约 smoke（防回归）。

3. 登录页验证码可见性与必填规则未绑定 `captchaEnabled`
   - 证据：`osg-frontend/packages/admin/src/views/login/index.vue:64`、`osg-frontend/packages/admin/src/views/login/index.vue:148`
   - 定性：业务页面实现缺陷（一次性代码修复），不应由 workflow 引擎承担。

4. 并行 worker 竞争同一 `admin` 账号，触发重试锁定，导致 E2E 级联失败
   - 证据：`osg-spec-docs/tasks/audit/final-gate-permission-2026-03-02.log`（多条 `/api/login` 失败），`ruoyi-framework/.../SysPasswordService.java:63`
   - 定性：框架执行策略缺陷（必须固化在门禁层）。

5. 直接运行 `playwright test` 时未注入 `E2E_API_PROXY_TARGET`，默认打到 8080 产生误判
   - 证据：`osg-frontend/packages/admin/vite.config.ts:6`
   - 定性：执行入口一致性缺陷（必须固化在 workflow/gate）。

### 9.2 结论

1. 这批问题不是“只改业务代码”可以长期解决，必须“业务修复 + 框架固化”双轨。
2. 固化目标：后续新需求不再反复改同类代码。

## 10. 框架必须固化项（防反复改代码）

### G1. 登录契约预检（新增硬门禁）
- 在 `bin/final-gate.sh` 增加 `login contract smoke`：
  - 校验 `/login` 成功响应包含 token（兼容 `token` 或 `data.token`）。
  - 不满足直接 FAIL（`EXIT 12`）。
- 实施细化：
  - 新增独立步骤（建议在 E2E 前，API smoke 后）；
  - 使用固定 E2E 账号（`E2E_ADMIN_USERNAME`/`E2E_ADMIN_PASSWORD`）执行真实登录请求；
  - 审计日志写入 `osg-spec-docs/tasks/audit/final-gate-{module}-{date}.log`，并打印首条失败证据行。

### G2. 登录锁预检（新增硬门禁）
- 在 `bin/final-gate.sh` E2E 前检查 Redis 锁键：`pwd_err_cnt:<E2E_ADMIN_USERNAME>`。
- 命中即 FAIL，并输出明确解锁指令，不进入 E2E 盲跑。
- 实施细化：
  - 支持通过环境变量注入 Redis 连接参数（host/port/password/db）；
  - 当 Redis 不可达时按“环境失败”处理，不得静默跳过；
  - 失败时输出标准解锁命令模板并写入 final-gate 日志。

### G3. `@api` E2E 串行化（门禁模式）
- `bin/e2e-api-gate.sh` 在 `mode=full|api` 时强制 `--workers=1`（或等效串行参数）。
- 目标：避免共享账号并发竞争导致级联误报。
- 说明：仅门禁串行，本地开发可保留并行。
- 实施细化：
  - `mode=full|api`：统一传入串行参数；
  - `mode=ui-only`：不强制串行，保留本地效率；
  - 在 gate 日志开头打印本次 worker 策略（便于审计）。

### G4. 执行入口强收敛
- workflow 与文档统一声明：主链路只允许 `bin/e2e-api-gate.sh`（或 `final-gate` 间接调用）。
- 禁止在验收流程中直接使用裸命令 `pnpm ... playwright test` 作为判定依据。
- 实施细化：
  - `.claude/project/config.yaml` 的 `testing.e2e.command` 与 `commands.ops.e2e_api_gate` 指向统一入口；
  - `.windsurf/workflows/*.md` 删除主链路中的裸 `pnpm ... test:e2e*`；
  - 允许在“本地调试说明”中保留裸命令，但必须标注“非验收依据”。

### G5. 审计证据可追溯
- `final-closure` 报告必须记录：
  - 本次 `final-gate` 日志路径
  - 本次 `e2e-api-gate` 日志路径
  - 失败首条证据行（用于快速定位）
- 实施细化：
  - 在 `bin/final-closure.sh` 生成报告时新增字段：
    - `first_failure_evidence`
    - `first_proxy_error_evidence`
  - 若本次全 PASS，字段填 `none`，禁止留空。

### G6. 固化执行顺序（强制）
- `final-gate` 中 E2E 相关步骤顺序必须固定，禁止调整：
  1. API smoke
  2. 登录契约预检（G1）
  3. 登录锁预检（G2）
  4. 验证码基线守卫
  5. E2E gate（G3）
- 任一前置步骤失败，必须立即退出，不得继续后续步骤。

### G7. 统一退出码语义（强制）
- `EXIT 12`：E2E 门禁相关失败（契约失败、锁定命中、proxy error、@api 跳过、E2E 执行失败）。
- `EXIT 11`：环境不可用（后端/Redis/依赖不可达）。
- `EXIT 15`：审计产物缺失或报告字段不完整。
- 禁止“仅打印 WARNING 但返回 0”的降级实现。

## 10.1 强约束执行协议（必须逐条遵守）

### P1. 登录契约预检协议（G1）
1. 请求端点固定：`POST /api/login`。
2. 入参来源固定：
   - `username=${E2E_ADMIN_USERNAME:-admin}`
   - `password=${E2E_ADMIN_PASSWORD:-admin123}`
3. 成功判定必须同时满足：
   - HTTP 2xx
   - JSON `code == 200`
   - 存在 `token` 或 `data.token`
4. 失败证据必须包含：
   - HTTP 状态码
   - 响应体前 200 字符
   - 命中的失败规则名（如 `LOGIN_TOKEN_MISSING`）

### P2. 登录锁预检协议（G2）
1. 锁键固定：`pwd_err_cnt:${E2E_ADMIN_USERNAME}`。
2. 连接参数环境变量固定：
   - `REDIS_HOST`（默认 `127.0.0.1`）
   - `REDIS_PORT`（默认 `6379`）
   - `REDIS_PASSWORD`（可空）
   - `REDIS_DB`（默认 `0`）
3. 判定规则：
   - 键不存在或值为 `0`：通过
   - 值 `>=1`：立即 FAIL（`EXIT 12`）
   - Redis 不可达/鉴权失败：环境失败（`EXIT 11`）
4. 失败输出必须包含标准解锁模板：
   - `redis-cli -h $REDIS_HOST -p $REDIS_PORT [-a ***] -n $REDIS_DB DEL pwd_err_cnt:$E2E_ADMIN_USERNAME`

### P3. E2E worker 策略协议（G3）
1. `mode=full|api`：强制 `--workers=1`，且日志必须打印 `worker_policy=serial`。
2. `mode=ui-only`：可并行，日志必须打印 `worker_policy=default`。
3. 禁止通过环境变量覆盖掉门禁串行策略（本地调试除外，但不得作为验收依据）。

### P4. 入口治理协议（G4）
1. 验收主链路只认可：
   - `bash bin/final-closure.sh ...`
   - `bash bin/final-gate.sh ...`（final-closure 内部调用）
   - `bash bin/e2e-api-gate.sh ...`（final-gate 内部调用）
2. 下列命令可用于本地调试，但不得作为“验收通过”证据：
   - `pnpm --dir osg-frontend test:e2e`
   - `playwright test`
3. 报告中若未出现 `final-gate log + e2e-api-gate log` 两条路径，一律判定无效验收。

### P5. 审计字段协议（G5）
`final-closure` 报告最小字段必须包含：
1. `final_gate_log`
2. `e2e_api_gate_log`
3. `first_failure_evidence`
4. `first_proxy_error_evidence`
5. `conclusion`
字段规则：
- 若无失败：`first_failure_evidence=none`，`first_proxy_error_evidence=none`
- 若有失败：字段值必须为“日志原文单行摘录”，禁止写“见日志”。

### P6. 首条失败证据提取优先级（强制）
1. 先匹配 `FAIL:` 开头行。
2. 若无，再匹配 `proxy error|ECONNREFUSED` 第一行。
3. 若仍无，再匹配 `ERROR` 第一行。
4. 若全无且退出非 0，填 `unknown_nonzero_exit`（并附 exit code）。

## 11. 一次性业务修复项（非框架职责）

### B1. 响应拦截器兼容两类成功格式
- Modify: `osg-frontend/packages/shared/src/utils/request.ts`
- 规则：`code===200` 时，若存在 `data` 字段则返回 `data`，否则返回完整 `response.data`。

### B2. E2E 登录 token 读取兼容
- Modify: `osg-frontend/tests/e2e/support/auth.ts`
- 规则：`token = body.token ?? body.data?.token`，并保留 `code=200` 与 HTTP 2xx 断言。

### B3. 登录页验证码联动
- Modify: `osg-frontend/packages/admin/src/views/login/index.vue`
- 要求：
  1. `captchaEnabled=false` 时隐藏验证码输入与图片；
  2. 表单规则仅在 `captchaEnabled=true` 时要求 `code`；
  3. 提交参数与开关联动（避免传空 uuid/code 造成噪音）。

## 12. 落地顺序（Windsurf 执行口径）

1. 先做 B1/B2/B3（修复当前真实失败）。
2. 再做 G1/G2/G3/G4/G5（固化框架，防回归）。
3. 最后执行：
   - `/final-closure permission`
   - 以本次新生成审计文件为唯一结论来源。
4. 失败时只接受“最新审计文件”复判，不使用历史日志回推结论。

## 13. 更新后的 DoD（增量）

1. `final-closure` 不再出现“账号锁定导致的级联失败”。
2. `@api` E2E 失败时，日志第一时间给出契约或锁定原因，不再靠人工猜测。
3. 新增或修改 E2E 用例时，若写出 `body.data.token` 这类脆弱断言，可被门禁识别并阻断。
4. 验收结论以最新审计产物为准，不接受旧日志/旧报告口径。
5. 主链路验收命令入口唯一：`final-gate -> e2e-api-gate`。
6. `mode=full|api` 必须串行执行且日志中可见 worker 策略。
7. final-closure 报告必须带 `first_failure_evidence/first_proxy_error_evidence`（PASS 时为 `none`）。
8. 登录契约预检失败时，报告中必须看到规则名（如 `LOGIN_TOKEN_MISSING`）与响应片段。
9. Redis 锁命中时必须直接阻断，不得进入 E2E 执行步骤。

## 14. 实施后回归检查（新增）

1. `bash bin/e2e-api-gate.sh permission full` 日志必须出现串行策略标记。
2. `bash bin/final-gate.sh permission` 在账号被锁场景下必须直接 FAIL，不进入 E2E 主执行。
3. `bash bin/final-closure.sh permission --cc-mode optional` 生成报告包含：
   - `final_gate_log`
   - `e2e_api_gate_log`
   - `first_failure_evidence`
   - `first_proxy_error_evidence`
4. `.claude/project/config.yaml` 中 `testing.e2e.command` 与 `commands.ops.e2e_api_gate` 不得漂移到裸 Playwright 命令。
5. 人工抽查 1 次失败样例，确认 `first_failure_evidence` 为日志原文单行摘录而非泛化描述。
