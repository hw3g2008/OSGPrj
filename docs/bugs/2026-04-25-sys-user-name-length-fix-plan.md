# Bug Fix Plan — sys_user.user_name 字段长度不足

**严重度**：High（阻塞业务流程）
**状态**：待用户决策
**发现于**：2026-04-25 M0.5 Phase 2 Step 7 视觉验收时
**与 M0.5 PageHeader 关系**：无（pre-existing，与本任务并行暴露）

---

## 1 · 现象

在 admin 端对 `99901 Test Lead Mentor` 执行**重置密码**或**编辑保存**时，backend 报错：

```
Data truncation: Data too long for column 'user_name' at row 1
SQL: insert into sys_user(user_name, nick_name, email, ...) values(?,?,?,...)
Mapper: SysUserMapper.insertUser-Inline (ruoyi-system-3.9.1.jar)
```

前端表现：编辑 modal 不关闭，密码重置 modal 不弹出，无任何用户可见的错误提示。

---

## 2 · 根因（Phase 2 Investigation）

「30 字符」限制实际散布在 **4 处**，构成完整阻塞链：

| # | 位置 | 现状 | 影响 |
|---|------|------|------|
| 1 | **DB schema** `@/Users/hw/workspace/OSGPrj/deploy/mysql-init/00_ry_20250522.sql:47` | `user_name varchar(30) not null` | INSERT 时 MysqlDataTruncation |
| 2 | **Java entity** `@/Users/hw/workspace/OSGPrj/ruoyi-common/src/main/java/com/ruoyi/common/core/domain/entity/SysUser.java:149` | `@Size(min = 0, max = 30)` | Bean validation 拒绝 |
| 3 | **登录前置校验** `@/Users/hw/workspace/OSGPrj/ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/SysLoginService.java:166-171` | `if (username.length() > USERNAME_MAX_LENGTH) throw UserPasswordNotMatchException` | **登录直接 401「用户不存在/密码错误」（误导性错误码）** |
| 4 | **常量定义** `@/Users/hw/workspace/OSGPrj/ruoyi-common/src/main/java/com/ruoyi/common/constant/UserConstants.java:74` | `USERNAME_MAX_LENGTH = 30` | 被 #3 + SysRegisterService 引用 |
| 5 | **注册校验** `@/Users/hw/workspace/OSGPrj/ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/SysRegisterService.java:63-66` | `账户长度必须在2到30个字符之间` | 注册端阻塞 |
| 6 | **业务流程** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/users/staff/index.vue:414-418` | `handleResetPassword` 用 `osg_staff.email` 作 `sys_user.user_name` INSERT | email 可能 > 30 |
| 7 | **email 长度** | DNS 标准允许 254 字符；`@Size(max = 50)` (`SysUser.java:161`) | 已 > user_name(30) |

**实测排查链**：
1. ALTER TABLE 修复 #1 → 重置密码成功（INSERT 通过）
2. 但登录仍 401 → backend 走 `loginPreCheck` 命中 #3 的 `username.length() > 30`
3. UserPasswordNotMatchException → 误导性错误码"用户不存在/密码错误"

**冲突链**：
```
osg_mentor.email = "test-lead-mentor@osg-test.local"  (31 chars)
                   ↓ admin 端重置密码
backend INSERT INTO sys_user(user_name, ...) VALUES(email, ...)
                   ↓
sys_user.user_name VARCHAR(30) → MysqlDataTruncation
```

**根本设计缺陷**：ruoyi 上游 `sys_user.user_name VARCHAR(30)` 是其默认值，但 OSG 业务采用"邮箱即登录名"模型，且邮箱实际可达 50 字符 → schema 不匹配。

---

## 3 · 受影响范围（grep-verified）

实际数据库 `osg_mentor` / `osg_assistant` / `osg_student` 表中 email 长度统计（推断，未真跑 SQL，需 ALTER 生效后再核对）：

| 邮箱 | 长度 | 重置密码 |
|------|------|----------|
| `test-assistant@osg-test.local` | 29 | ✅ 刚好 fits |
| `e2e-test-mentor@test.com` | 23 | ✅ |
| `kevin.li@osg-staff.local` | 24 | ✅ |
| `test-lead-mentor@osg-test.local` | 31 | ❌ 阻塞 |
| `e2e-student@osg.test`（推断） | 19 | ✅ |
| `general@1strategygroup.com` | 26 | ✅ |
| `alex.ren@osg-staff.local` | 24 | ✅ |

实际还可能有更长邮箱阻塞 - 需 schema 修复后做一次全量校核。

---

## 4 · 修复方案（3 选 1 决策）

### 选项 A · DB schema 升级到 VARCHAR(64) ⭐推荐

**变更（共 5 处）**：

1. **migration SQL** ✅ `@/Users/hw/workspace/OSGPrj/sql/migrations/2026-04-25-sys-user-name-length-64.sql`：
   ```sql
   ALTER TABLE sys_user MODIFY COLUMN user_name VARCHAR(64) NOT NULL COMMENT '用户账号';
   ```
2. **Java entity** ✅ `@/Users/hw/workspace/OSGPrj/ruoyi-common/src/main/java/com/ruoyi/common/core/domain/entity/SysUser.java:149`：
   ```diff
   - @Size(min = 0, max = 30, message = "用户账号长度不能超过30个字符")
   + @Size(min = 0, max = 64, message = "用户账号长度不能超过64个字符")
   ```
3. **常量** ✅ `@/Users/hw/workspace/OSGPrj/ruoyi-common/src/main/java/com/ruoyi/common/constant/UserConstants.java:74`：
   ```diff
   - public static final int USERNAME_MAX_LENGTH = 30;
   + public static final int USERNAME_MAX_LENGTH = 64;
   ```
4. **注册错误信息** ✅ `@/Users/hw/workspace/OSGPrj/ruoyi-framework/src/main/java/com/ruoyi/framework/web/service/SysRegisterService.java:66`：
   ```diff
   - msg = "账户长度必须在2到30个字符之间";
   + msg = "账户长度必须在2到64个字符之间";
   ```
5. **种子 schema**（保证 fresh deploy 一致性）：
   - ✅ `@/Users/hw/workspace/OSGPrj/deploy/mysql-init/00_ry_20250522.sql:47` `varchar(30)` → `varchar(64)`
   - ✅ `@/Users/hw/workspace/OSGPrj/sql/ry_20250522.sql:45` 同步

**步骤**：
1. ⚠️ **用户授权后**：执行 `ALTER TABLE` 到当前 dev DB（`47.94.213.128:23306`）—— **修改生产 DB schema**，违反"禁止修改生产数据库"规则除非用户明确同意
2. 改 `SysUser.java`
3. 改 `00_ry_20250522.sql` / `ry_20250522.sql`
4. 重启 backend（`bin/run-backend-dev.sh`）
5. 验证：admin → 99901 编辑邮箱 + 重置密码 → 无 truncation 报错
6. follow-up：跑一次 `SELECT MAX(LENGTH(email)) FROM osg_mentor; ...` 全表扫描检查是否还有其他 > 64 字符邮箱

**优点**：
- 一处改动，根治问题
- 64 字符覆盖 DNS 实际邮箱（已观察 31 + buffer）
- 符合"最少概念"+"修一次根因"原则

**风险**：
- DDL 改 dev DB —— 需用户授权
- ALTER TABLE 在 InnoDB 上一般 metadata-only，秒级
- ⚠️ ruoyi 上游升级时该字段可能被覆盖回 30 → 用 migration SQL + comment 标注

---

### 选项 B · 跳过 LM 端视觉验收，bug 留 follow-up

**变更**：
- 不动代码 / DB
- PR Summary 标注："LM 端视觉验收因 sys_user.user_name 长度阻塞，暂用 admin/asst/mentor 已抓 6 张截图代证（PageHeader 组件层面 4 端等价）"
- 把本 fix plan 转 follow-up ticket

**优点**：
- 不动 schema，零风险
- 不阻塞 M0.5 PR 合入
- LM 端 PageHeader 是同一 shared 组件，视觉验证可推断

**缺点**：
- LM 端**没有**直接视觉证据
- bug 仍存在，下一个 31+ 字符邮箱用户仍踩坑

---

### 选项 C · 临时改 LM 邮箱绕过

**变更**：
- 通过 admin → 99901 编辑 → 把邮箱从 `test-lead-mentor@osg-test.local`(31) 改为 `tlm@test.local`(14)
- 重置密码 → 登录 LM 端 → 抓 PageHeader 截图
- 完后改回原邮箱（如果保存能成功）

**问题**：
- 实测 `编辑` 操作的"保存修改"也走同一 `sys_user.user_name` insert 路径，会触发同一 truncation 错误
- ⚠️ 因此选项 C **不可行**（编辑也被同一 bug 阻塞）

---

## 5 · 推荐 + 询问

**推荐**：**选项 A**（修根因）+ **选项 B 兜底**（如果用户暂不想动 schema）。

**等待用户决策**：

1. 请选择修复路径：A / B / 其他
2. 若选 A，请确认是否授权对 dev DB 执行：
   ```sql
   ALTER TABLE sys_user MODIFY COLUMN user_name VARCHAR(64) NOT NULL COMMENT '用户账号';
   ```
   （这是 DDL schema 变更，非 DML 数据变更；InnoDB 一般 metadata-only，秒级；不影响业务数据；可回滚 `MODIFY VARCHAR(30)` 但生产数据若超 30 会失败）
3. 若选 B，本 fix plan 转 follow-up ticket，M0.5 视觉验收用 6 张已抓截图收尾

---

## 附录 A · 已抓截图（6 张，覆盖 admin / assistant / mentor）

| # | 端 | 路由 | PageHeader 形态 | 文件 |
|---|----|----|----|----|
| 1 | admin | `/permission/roles` | 双语 + 紫色 actions 按钮 | `m05-admin-permission-roles.png` |
| 2 | admin | `/permission/dicts` | 单语 + 无 actions | `m05-admin-dicts-no-actions.png` |
| 3 | admin | `/permission/users` | 双语 + 描述 + 操作右对齐 | `m05-admin-permission-users.png` |
| 4 | assistant | `/career/positions` | 双语 + 切换 actions | `m05-assistant-career-positions.png` |
| 5 | assistant | `/profile` | V1→shared 改造，双语 + pill + 编辑按钮 | `m05-assistant-profile.png` |
| 6 | mentor | `/schedule` | 双语 + 无 actions | `m05-mentor-schedule.png` |
| 7 | mentor | `/job-overview` | 嵌套 a-config-provider + 导出 actions | `m05-mentor-job-overview.png` |

视觉判断：D-Bilingual P1（22px 中文 + 14px 英文 + 14px 描述）默认值在所有端表现 OK。
