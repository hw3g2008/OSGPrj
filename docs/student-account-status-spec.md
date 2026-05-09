# 学员账号状态规范（Student Account Status Spec）

> 状态：草稿 v2（v1 校对修订）
> 创建：2026-05-08
> 范围：admin / student / mentor / lead-mentor / assistant 五端联动
> 模块：`OsgStudent.account_status` + `osg_student_blacklist`

---

## 1. 状态枚举

DB 字段 `osg_student.account_status CHAR(1) NOT NULL DEFAULT '0'`，与黑名单表 `osg_student_blacklist` 共同决定学员业务状态：

| 值 | 业务术语 | 系统/前端展示 | 进入方式 | 退出方式 |
|----|----------|----------------|----------|----------|
| `0` | 正常 | 正常 | 默认 / 合同生效 | — |
| `1` | 冻结 | 冻结 | admin 手动冻结 | admin 恢复 → `0` |
| `2` | 合同结束 | **已结束** | admin 手动标记 | 续签合同 → `0` |
| `3` | 退费 | 退费 | admin 手动退费 | 续签合同 → `0` |
| 黑名单 | （独立维度） | 黑名单标签 | admin 加入黑名单 | admin 移出 |

**展示术语统一**：本文档业务上称"合同结束"，但代码与 UI 现状一律展示为"已结束"（见 `OsgStudentController.formatAccountStatus:484`、`OsgLeadMentorStudentServiceImpl.formatAccountStatus:450`、`StudentStatusTag.spec.ts`、Excel 导出）。本次不改命名。

**合同到期 ≠ 自动合同结束**：合同到期但 `account_status` 未被手动改为 `2` 时，仍显示为正常（`0`）。该规则由"业务方手动管理合同生命周期"决定，不引入定时任务。

---

## 2. 状态 × 行为矩阵

| 状态 | 能登录 | 能查求职信息 | 导师能申报课消（有课时） |
|------|:------:|:------------:|:------------------------:|
| 正常（0） | ✅ | ✅ | ✅ |
| 冻结（1） | ❌ | — | ❌ |
| 合同结束/已结束（2） | ✅ | ❌ | ✅ |
| 退费（3） | ❌ | — | ❌ |
| 黑名单（叠加） | ✅ | ❌ | ✅ |

> "—" 表示该状态登不上，行为不可达，不需单独定义。

**叠加规则**：`account_status` 与黑名单是两个独立维度，**任一维度限制成立即拦截**。
- 合同结束 + 黑名单 → 行为完全相同（无新冲突）
- 正常 + 黑名单 → 拦求职、不拦登录与申报

---

## 3. 错误响应约定

项目用 Ruoyi 框架，业务异常通过 `ServiceException`/`BlockedException` 抛出，由 `GlobalExceptionHandler:58-64` 统一包装为 `AjaxResult.error`：
- **HTTP 状态码：200**
- Body：`{"msg":"<提示文案>","code":<int>}`，未指定 code 默认 500
- 前端 axios 拦截 `code != 200` 时按 `msg` 直接弹 toast

约定文案（用 `MessageUtils.message(key)` 抽 i18n key，建议放 `i18n/messages_zh_CN.properties`）：

| 场景 | 异常类型 | 文案 / i18n key |
|------|----------|----------|
| 冻结禁登 | `ServiceException`（同 `user.blocked` 风格） | `账号已冻结，请联系管理员` / `student.account.frozen` |
| 退费禁登 | `ServiceException` | `账号已退费，请联系管理员` / `student.account.refunded` |
| 合同结束查求职 | `ServiceException` | `合同已结束，无法查看求职信息，请续签合同` / `student.position.contract_ended` |
| 黑名单查求职 | `ServiceException` | `账号已加入黑名单，无法查看求职信息` / `student.position.blacklisted` |
| 冻结申报课消 | `ServiceException` | `学员处于冻结状态，无法申报课消` / `class_record.student.frozen` |
| 退费申报课消 | `ServiceException` | `学员已退费，无法申报课消` / `class_record.student.refunded` |

> 所有错误均 HTTP 200 + `code=500` + 约定 msg，不引入 401/403/400 等 HTTP 错误码。回归断言以 `msg` 文本为准。

---

## 4. 后端实现要求

### 4.1 改动点（共 4 处源文件）

#### #1 登录拦截

文件：`ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/UserDetailsServiceImpl.java`

当前 `loadUserByUsername`（行 38-60）只校验 `SysUser.delFlag` / `SysUser.status`。

**改造**：在第 55 行（`DISABLE` 检查）之后、第 57 行 `passwordService.validate(user)` 之前，插入"学员维度"校验：

```
// 仅当 user_name 是某 osg_student.email 时执行
OsgStudent student = osgStudentMapper.selectByEmail(user.getUserName());
if (student != null) {
    String s = student.getAccountStatus();
    if ("1".equals(s)) throw new ServiceException(MessageUtils.message("student.account.frozen"));
    if ("3".equals(s)) throw new ServiceException(MessageUtils.message("student.account.refunded"));
    // 注意: 黑名单不拦登录, 不查 osg_student_blacklist
}
```

新增依赖：`OsgStudentMapper.selectByEmail(String email)`（如已有 `selectStudentByEmail` 复用之；否则新增）。

#### #2 求职信息查看（合同结束 / 黑名单）

文件：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java`

学生端求职接口实际入口在 `IPositionService`，全部带 `userId` 参数。校验放在 `PositionServiceImpl` 抽公共方法 `requireActiveStudentForPositionAccess(userId)`，并在以下方法首行调用：

| 方法 | 行号（v2 时） | 备注 |
|------|--------------|------|
| `selectPositionList(Long userId)` | 145 | 列表 |
| `selectPositionMeta(Long userId)` | 暂未确认 | 元数据 |
| `updateApplyStatus(...)` | — | 投递写操作 |
| `updateFavoriteStatus(...)` | — | 收藏写操作 |
| `insertProgress(...)` | — | 进度写操作 |
| `requestCoaching(...)` | — | 辅导申请（两个 overload）|
| `createManualPosition(...)` | — | 手动添加 |

校验逻辑：
```
private void requireActiveStudentForPositionAccess(Long userId) {
    OsgStudent s = osgStudentMapper.selectByUserId(userId); // 或 selectByEmail
    if (s == null) return; // 非学员调用，由其他鉴权处理
    if ("2".equals(s.getAccountStatus())) {
        throw new ServiceException(MessageUtils.message("student.position.contract_ended"));
    }
    if (osgStudentBlacklistMapper.existsByStudentId(s.getStudentId()) > 0) {
        throw new ServiceException(MessageUtils.message("student.position.blacklisted"));
    }
}
```

> 不修改 `OsgStudentPositionVisibilityServiceImpl` —— 该 service 是 per-position 三维过滤（招聘周期/地区/方向），与"学员账号状态"语义正交，不在此处叠加学员状态判断。

#### #3 lead-mentor 申报课消

文件：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java`，方法 `validateLeadMentorCreate`（行 827-862）。

在现有字段非空校验后追加：
```
OsgStudent student = osgStudentMapper.selectByPrimaryKey(record.getStudentId());
if (student == null) throw new ServiceException("学员不存在");
String s = student.getAccountStatus();
if ("1".equals(s)) throw new ServiceException(MessageUtils.message("class_record.student.frozen"));
if ("3".equals(s)) throw new ServiceException(MessageUtils.message("class_record.student.refunded"));
// 合同结束(2) / 黑名单 不拦
```

#### #4 assistant 申报课消

同文件，方法 `validateAssistantCreate`（与 `validateLeadMentorCreate` 同级私有方法），追加同样的校验逻辑。可抽取共同私有方法 `validateStudentAccountForClassRecord(Long studentId)` 由两处复用。

### 4.2 状态变更接口对称性（可选小项）

`OsgStudentController.resolveAccountStatus`（`:445-464`）当前 action 别名：`freeze` / `restore` / `refund` 三种 + `accountStatus="2"` 直传。

**建议补**：`action=end_contract` → `2`，与其他 action 对称（前端 UI 可用统一动词调用，无需 hardcode `accountStatus`）。

> 此项不影响功能正确性，前端可直接传 `accountStatus="2"`，工程上是可选项。

---

## 5. 验收标准

### 5.1 curl 回归用例（共 18 个）

测试文件：`docs/student-account-status-curl-test.sh`（修复 T1 之前先生成）

| # | 场景 | 状态 | 接口 | 期望 |
|---|------|------|------|------|
| 登 1 | 正常登录 | `0` | POST /login | `code=200, token` |
| 登 2 | 冻结禁登 | `1` | POST /login | `code=500, msg≈"账号已冻结"` |
| 登 3 | 已结束登录 | `2` | POST /login | `code=200, token` |
| 登 4 | 退费禁登 | `3` | POST /login | `code=500, msg≈"账号已退费"` |
| 登 5 | 黑名单登录 | bl | POST /login | `code=200, token` |
| 求 1 | 正常查求职 | `0` | GET /student/position/list | `code=200, data 非空` |
| 求 2 | 已结束禁查 | `2` | GET /student/position/list | `code=500, msg≈"合同已结束"` |
| 求 3 | 黑名单禁查 | bl | GET /student/position/list | `code=500, msg≈"黑名单"` |
| 申 LM 1-5 | lead-mentor 申报 | `0`/`1`/`2`/`3`/bl | POST /lead-mentor/class-records | 0/2/bl 200; 1 frozen; 3 refunded |
| 申 AS 1-5 | assistant 申报 | `0`/`1`/`2`/`3`/bl | POST /assistant/class-records | 同上 |

合计 = 5（登录）+ 3（求职）+ 5（lead 申报）+ 5（assistant 申报） = **18 用例**。

> status `1`/`3` 求职接口不可达（登不上），不出现在用例中。

### 5.2 单测覆盖率（按 `.claude/rules/testing.md` backend 100% 分支）

| 测试类 | 必测分支 |
|--------|----------|
| `UserDetailsServiceImplTest` | 学员分支：`account_status` ∈ {`0`,`1`,`2`,`3`} 共 4 用例 |
| `PositionServiceImplTest` 或新建 `RequireActiveStudentTest` | 学员分支：`account_status` ∈ {`0`,`2`} + 黑名单存在 / 不存在 = 共 5 用例（`1`/`3` 由 #1 拦不会到这里） |
| `OsgClassRecordServiceImplTest`（lead 分支） | 学员 `account_status` ∈ {`0`,`1`,`2`,`3`} 共 4 用例 |
| `OsgClassRecordServiceImplTest`（assistant 分支） | 同上 4 用例 |

---

## 6. 不在本次范围

- ❌ 合同到期自动改 `account_status` —— 业务明确手动管理
- ❌ 状态变更触发邮件/站内信通知 —— 现有 changeStatus 接口已写操作日志，足够
- ❌ 重构 `account_status` 与 `sys_user.status` 关系 —— 两套独立，分别校验
- ❌ 字典化 `account_status` —— 现状直接硬编码，与代码风格一致
- ❌ 状态展示术语统一（"合同结束" → "已结束"）—— 已统一到"已结束"，不改

---

## 7. 修复任务拆分

按"每修一项跑一遍 curl"节奏：

| Ticket | 内容 | 影响文件 | 回归用例 |
|--------|------|----------|----------|
| **T0** | 生成 `docs/student-account-status-curl-test.sh`（含 18 用例 + 数据准备/还原 + admin token 自动获取）| 新文件 | — |
| **T1** | 状态变更补 `action=end_contract` 别名 | `OsgStudentController:445-464` | 单测 + 1 个 curl |
| **T2** | 登录拦截（冻结/退费） | `UserDetailsServiceImpl` + `OsgStudentMapper` | 登 1-5 |
| **T3** | 求职可见性（已结束/黑名单） | `PositionServiceImpl` + `OsgStudentBlacklistMapper.existsByStudentId` | 求 1-3 |
| **T4** | lead-mentor 申报课消校验 | `OsgClassRecordServiceImpl.validateLeadMentorCreate` | 申 LM 1-5 |
| **T5** | assistant 申报课消校验（复用 T4 私有方法） | `OsgClassRecordServiceImpl.validateAssistantCreate` | 申 AS 1-5 |

每个 ticket 独立 commit，每个完成后跑对应回归。最后一个 ticket 完成跑全量 18 用例收口。

---

## 修改历史

| 日期 | 改动 | 作者 |
|------|------|------|
| 2026-05-08 | 初版 v1 | hw |
| 2026-05-08 | v2：修正错误响应码（HTTP 200+code=500，非 403/400）；行号校对；用例数公式（5+3+5+5=18）；术语统一到"已结束"；求职校验入口改为 `PositionServiceImpl.selectPositionList(userId)` 等 7 处；删除冲突规则过度设计 | hw |
