# Security Contract Guard Design

Date: 2026-03-03  
Status: Approved & Implemented (Validated on 2026-03-03)  
Owner: workflow-framework

---

## 1. 目标

在不把业务逻辑塞进框架的前提下，实现“跨项目可复用”的安全契约自动校验能力：

1. 业务意图通过项目声明表达（contract），不是散落在聊天和文档中。
2. 框架只做一致性校验与门禁裁决，不承载业务实现。
3. 在 `/brainstorm` 与 `/final-gate` 两个阶段同时控制，做到“早发现 + 最终不放过”。

---

## 2. 范围与约束

1. 首期技术栈：`Spring Boot + Vue`。
2. 默认策略：`fail-closed`。
3. 标准与实例分离：
   - 框架标准（schema + guard 规则 + 退出码语义）放在 workflow-framework。
   - 项目实例真源放在仓库根目录：`contracts/security-contract.yaml`。
   - `osg-spec-docs` 只存投影文档与审计产物，不作为判定真源。

---

## 3. 双门点架构（推荐方案）

### 3.1 Brainstorm 门点（前置）

在 `/brainstorm` 过程中执行：

1. `security_contract_init --mode sync`：自动扫描并生成/更新 contract 初稿。
2. `security_contract_guard --stage brainstorm`：对 contract 与代码进行一致性校验。
3. 命中以下任一条件即阻断：
   - contract 缺失
   - `decision_required=true` 未清零
   - `auth_mode_drift / rate_limit_drift / anti_enumeration_drift`

### 3.2 Final Gate 门点（后置）

在 `bin/final-gate.sh` 中将安全契约守卫插入 E2E 前固定步骤，失败直接 `EXIT 12`。

### 3.3 Final Closure 审计

`bin/final-closure.sh` 强制校验安全审计产物存在并写入报告字段；缺失即 `EXIT 15`。

---

## 4. Security Contract Schema v1

文件：`contracts/security-contract.yaml`

```yaml
schema_version: 1
project_type: springboot-vue
contract_version: "2026-03-03.1"
generated_by: security_contract_init
generated_at: "2026-03-03T00:00:00Z"

endpoints:
  - id: password_send_code
    method: POST
    path: /system/password/sendCode
    auth_mode: anonymous
    rate_limit:
      required: true
      key: "pwd_reset_send:${ip}:${email_hash}"
      window_sec: 300
      max_requests: 5
    anti_enumeration:
      required: true
      response_policy: generic_msg
    source:
      backend_controller: ruoyi-admin/src/main/java/.../SysPasswordController.java
    status: active
    decision_required: false
```

强约束：

1. `method + path` 全局唯一。
2. `auth_mode` 必填，值仅 `anonymous|authenticated`。
3. `rate_limit.required=true` 时，`key/window_sec/max_requests` 必填。
4. `anti_enumeration.required=true` 时，`response_policy` 必填。
5. `decision_required=true` 的条目在任何门禁均视为失败。

---

## 5. 自动生成与漂移检测

### 5.1 生成器（Init）

`security_contract_init.py` 读取 Spring Boot + Vue 项目并生成初稿：

1. 后端扫描：
   - `@RestController/@Controller`
   - `@RequestMapping + @Get/Post/...Mapping`
   - `@Anonymous`
   - `SecurityConfig` 中 `requestMatchers(...).permitAll()`
   - `@RateLimiter`
2. 前端扫描（辅助）：
   - `src/api/**` 的请求路径与 method
   - 输出前后端不一致告警
3. 任何不可判定项标记为 `decision_required=true`。

### 5.2 守卫（Guard）

`security_contract_guard.py` 执行 contract 与代码一致性校验，输出分类：

1. `missing_contract_entry`
2. `auth_mode_drift`
3. `rate_limit_drift`
4. `anti_enumeration_drift`
5. `decision_required_unresolved`

任一命中即非零退出（fail-closed）。

---

## 6. 执行顺序与退出码

### 6.1 Final Gate 固定顺序（含新增守卫）

1. API smoke
2. 登录契约预检
3. 登录锁预检
4. 安全契约守卫（新增）
5. 验证码基线守卫
6. E2E gate

### 6.2 退出码

1. `EXIT 12`：安全契约门禁失败（包括 unresolved / drift）。
2. `EXIT 15`：安全契约审计产物缺失或报告字段不完整。

不新增新退出码，复用现有语义，避免外部消费方兼容风险。

---

## 7. 审计产物

1. `osg-spec-docs/tasks/audit/security-contract-{module}-{date}.md`
2. `final-closure` 报告新增：
   - `security_contract_log`
   - `security_first_failure_evidence`

要求：

1. 失败时记录日志原文首条证据行。
2. 通过时填 `none`，禁止留空。

---

## 8. 风险与控制

1. 解析不全导致误报：
   - 首期只支持明确可解析模式，其他一律 `decision_required=true`。
2. 代码漂移导致漏检：
   - 双门点策略：`brainstorm` 与 `final-gate` 均执行 guard。
3. 换项目不可用：
   - schema 保持通用，解析器做技术栈适配；首期限定 `springboot-vue`。
4. 维护复杂度上升：
   - 分批上线：先 auth，再 rate limit，再 anti-enumeration。

---

## 9. 设计决策摘要

1. 采用“双门点”而非仅 final gate。
2. 采用 `fail-closed`，不引入 warn-only 主路径。
3. 标准与实例分离：标准在框架，实例在 `contracts/`。
4. 文档投影不参与判定，判定只认真源 contract。

---

## 10. 实施映射

对应实施文档：`docs/plans/2026-03-03-security-contract-guard-implementation-plan.md`  
当前实现证据（2026-03-03）：
1. `python3 .claude/skills/workflow-engine/tests/security_contract_schema_test.py` -> PASS
2. `python3 .claude/skills/workflow-engine/tests/security_contract_init_test.py` -> PASS
3. `python3 .claude/skills/workflow-engine/tests/security_contract_guard_selftest.py` -> PASS
4. `bash bin/final-closure.sh permission --cc-mode off` -> PASS（含 security contract 审计字段）
