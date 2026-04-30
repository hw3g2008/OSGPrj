# Bug 诊断报告 — LM 端"分配/更换导师"流程

**日期**：2026-04-29
**报告人**：Cascade（AI 协作会话）
**状态**：待第三方 AI 校验
**目标**：把会话中所有 bug 发现、修复动作、认知校正都摊在桌面上，请第三方 AI 验证我的分析是否正确、是否有遗漏

---

## 0 · 阅读须知（给校验 AI）

本文档目的不是说服你，而是请你**反向证伪**。我可能错了。请按以下顺序校验：

1. 读 §1（事件起点）确认场景
2. 读 §2（已修复）→ 跑 §6.1 SQL 查现状是否吻合
3. 读 §3（已回滚）→ 跑 §6.2 SQL 校验
4. 读 §4（未修）→ 自己判断这些是不是 bug
5. **重点**：读 §5（认知校正）→ 我撤回了"BUG-D"判断，请你独立判断这个撤回是否正确，或我又错了
6. §7 是开放问题，欢迎补充

所有代码引用都是**绝对路径 + 行号**格式，可直接定位。所有 SQL 都可在测试库执行（连接信息见 §6.0）。

---

## 1 · 事件起点

### 用户原始报告

> "LM 端为什么改不了导师"

具体场景（复现路径）：

1. 登录 LM 端 `http://127.0.0.1:3003/`
2. 进入 `/career/job-overview`
3. 任选一条 job overview 行 → 点「查看详情」→ 弹窗内点「更换导师」
4. 在 `AssignMentorModal` 弹窗中选某位 mentor → 点「确认分配」
5. **后端报错**：`员工账号不存在，无法完成导师分配`（来自 `OsgIdentityResolver.resolveUserIdByStaffId`）

### 测试环境

- 远端共享测试库：`47.94.213.128:23306` schema `ry-vue`
- 当前登录：lead-mentor 端（用户邮箱具体未确认，但能登录证明 LM 端访问 OK）
- 前端：本地启动 `lead-mentor` 包 dev server (端口 3003)
- 后端：远端测试环境

---

## 2 · 已修复的 Bug

### BUG-A：字典 `osg_schedule_status` 缺失

**现象**

`AssignMentorModal` 弹窗顶部「全部排期状态」下拉为空，前端报字典加载失败。

**根因**

`sys_dict_type` 与 `sys_dict_data` 表中**完全没有** `osg_schedule_status` 类型记录。

仓库存有初始化 SQL 但**未执行过**：

```@/Users/hw/workspace/OSGPrj/sql/osg_dict_schedule_status_init.sql:1-30
-- 文件存在但从未在测试库执行
INSERT INTO sys_dict_type (dict_name, dict_type, status, create_by, ...) VALUES (...)
ON DUPLICATE KEY UPDATE ...;

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, ...) VALUES
('10', '有空闲', 'available', 'osg_schedule_status', ...),
('20', '正常', 'normal', 'osg_schedule_status', ...),
('30', '排期紧张', 'busy', 'osg_schedule_status', ...)
ON DUPLICATE KEY UPDATE ...;
```

**修复动作**

执行了上述 SQL（实际过程**误执行 2 次**，导致 sys_dict_data 累积 6 条；后通过 `DELETE FROM sys_dict_data WHERE dict_code IN (1828,1829,1830)` 清理回 3 条）。

**意外发现 issue-1**：`sys_dict_data` 表上**没有** `(dict_type, dict_value)` UNIQUE 索引，所以 `ON DUPLICATE KEY UPDATE` 失效，**这个 SQL 文件本质上不可重入**。`sys_dict_type` 表则有 `dict_type` UNIQUE 索引，所以 dict_type 那部分是幂等的。

**当前状态**：✅ 修复完成

校验 SQL 见 §6.1。

---

### BUG-B：19 位 mentor 缺 sys_user 账号（真根因）

**现象**

`OsgIdentityResolver.resolveUserIdByStaffId` 抛 `员工账号不存在，无法完成导师分配`。

**根因链**

```
@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgIdentityResolver.java:52-62
public Long resolveUserIdByStaffId(Long staffId) {
    OsgStaff staff = requireStaff(staffId);
    String email = requireEmail(staff.getEmail(), "员工邮箱缺失，无法完成导师分配");
    SysUser account = resolveAccountByEmail(email);
    if (account == null || account.getUserId() == null) {
        throw new ServiceException("员工账号不存在，无法完成导师分配");
    }
    return account.getUserId();
}
```

→ `osg_staff` 表里 `staff_type='mentor'` AND `account_status='active'` 共 **20 条**

→ 但 `sys_user` 表里只能匹配上 1 条（`Alex Ren`，user_id=12824）

→ 其余 19 位 mentor 通过 `osg_staff.email` 在 sys_user 中查不到 → 抛"员工账号不存在"

**为什么 19 位会缺 sys_user？**

代码 `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffServiceImpl.java:59-70` 的 `insertStaff` 调用 `ensureStaffAccount` 同步建账号。但：

- `osg_staff` 这 20 条的 `create_by` 都是空字符串、`create_time` 都是 `2026-04-08 07:15:20`（同秒批量）
- → **是直接 SQL seed 导入的，绕过了 Service 层**，所以 `ensureStaffAccount` 没被触发
- Alex Ren 的 `sys_user` 是后来单独补的（`create_by='system'`）

**修复动作**

执行 INSERT，跟 Alex Ren 现状对齐：

```sql
INSERT INTO sys_user (
  dept_id, user_name, nick_name, user_type,
  email, phonenumber, sex, avatar,
  password, status, del_flag,
  create_by, create_time, update_by, update_time,
  remark, first_login
)
SELECT
  NULL, s.email, s.staff_name, '00',
  s.email, '', '0', '',
  '$2a$10$/pPXTdM0CG8i8sqtR/wfoe4A1aF3nypx1rddKw5bju5Kk./oPoeZO',  -- 复用 Alex Ren bcrypt 哈希
  '0', '0',
  'cascade-fix-bug-b', NOW(), 'cascade-fix-bug-b', NOW(),
  'BUG-B: backfill mentor sys_user for assign-mentor flow', '0'
FROM osg_staff s
LEFT JOIN sys_user u ON u.email = s.email
WHERE s.staff_type = 'mentor' AND s.account_status = 'active' AND u.user_id IS NULL;
```

**关键设计决策**

| 决策 | 理由 |
|---|---|
| 复用 Alex Ren 的 bcrypt 哈希 | 测试库批量补账号；OsgIdentityResolver 不需要登录验证只查 user_id；明文密码=Alex Ren 现密码（未知，但 mentor 端登录走派生身份不需密码匹配验角色） |
| `dept_id = NULL` | 与 Alex Ren 对齐 |
| `phonenumber = ''`（空） | osg_staff.phone 实际可达 16 字符（国际号码），但 sys_user.phonenumber 限 11 字符（VARCHAR(11)），直接复制会触发 `Data truncated`（详见 BUG-E） |
| `first_login = '0'` | 避免触发"首次登录强制改密"拦截 |
| `user_name = email` | 跟 Alex Ren 对齐，且符合 OSG"邮箱即登录名"模型 |

**当前状态**：✅ 修复完成

校验 SQL 见 §6.3。

---

## 3 · 已回滚的冗余操作

### BUG-B Step 2（已回滚）：误绑 19 条 `sys_user_role(role_id=10)`

**初始动作**

我以为"绑 mentor 角色让该用户能登录 mentor 端"，所以在 BUG-B 修复中追加了 Step 2：

```sql
INSERT INTO sys_user_role (user_id, role_id)
SELECT u.user_id, 10  -- 10 = role_key='mentor'
FROM sys_user u JOIN osg_staff s ON s.email = u.email
LEFT JOIN sys_user_role ur ON ur.user_id = u.user_id AND ur.role_id = 10
WHERE s.staff_type='mentor' AND s.account_status='active' AND ur.user_id IS NULL;
```

**为什么是误判**

`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMentorAccessService.java:88-105` 的 `hasMentorAccess` 判定：

```java
return isActiveUser(user) && (user.isAdmin() || hasMentorRole(user));

private boolean hasMentorRole(SysUser user) {
    return hasActiveMentorStaff(user.getEmail()) || hasMentorBusinessOwnership(userId);
    // 注意：方法名叫 hasMentorRole，但实际查的是 osg_staff 派生身份 + 业务表，不是 sys_user_role
}
```

`hasActiveMentorStaff` 查的是 `osg_staff WHERE staff_type='mentor'`，**不是 `sys_user_role`**。所以 mentor 端登录**不依赖**任何角色绑定。

`OsgIdentityResolver` 也不查角色，只查 user_id。

→ 这 19 条 `sys_user_role` 绑定**对登录、对分配导师都不起作用**，是纯冗余数据。

**回滚动作**

```sql
DELETE ur FROM sys_user_role ur
INNER JOIN sys_user u ON u.user_id = ur.user_id
WHERE ur.role_id = 10 AND u.create_by = 'cascade-fix-bug-b';
```

**当前状态**：✅ 已回滚（19 条删除，Alex Ren 的 role_id=10 保留）

校验 SQL 见 §6.4。

---

## 4 · 未修复的 Bug / 隐藏问题

### BUG-C：弹窗 wrap DOM 残留导致点击失灵

**现象**（用户实测体感）

`AssignMentorModal` 关闭后，页面其他按钮全部点不动，必须刷新整个页面才能恢复。

**未深入诊断**。本会话未触及前端代码。

**怀疑方向**

`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/components/AssignMentorModal.vue` 的 modal 关闭后某层 wrap DOM（可能 ant-design `<a-modal>` 或自定义 `<div class="assign-mentor-modal-wrap">`）pointer-events 没释放，或 `destroy-on-close` 配置缺失。

**优先级**：P0（用户当前看得到，影响日常使用）

---

### BUG-E：sys_user.phonenumber VARCHAR(11) 容不下国际号码

**实际证据**

```
SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA='ry-vue' AND TABLE_NAME='sys_user' AND COLUMN_NAME='phonenumber';
→ phonenumber VARCHAR(11)

osg_staff 中 19 位 mentor 的 phone 长度分布：
  '+44 7951444704' (14 字符) - Fulin Ming
  '447925705653'   (12 字符) - Claire Tu
  '447464665050'   (12 字符) - Kevin Li
  '15861863166(+86)' (16 字符) - Kevin Zhao
  其余 10-11 字符
```

**触发场景**

`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffServiceImpl.java:441-469` 的 `ensureStaffAccount`：

```java
user.setPhonenumber(staff.getPhone());  // 直接复制，没截断
```

→ admin UI 用国际号码新建 mentor 时会触发 `Data truncated for column 'phonenumber'` → 抛 `导师账号创建失败`。

**与已知 BUG 关系**

跟 `@/Users/hw/workspace/OSGPrj/docs/bugs/2026-04-25-sys-user-name-length-fix-plan.md` 是**同类问题**（schema 字段长度不匹配业务实际数据），是其姊妹 bug。

**优先级**：P1（暂未触发，但 admin UI 用国际号码会必现）

---

### issue-1：`sql/osg_dict_schedule_status_init.sql` 不可重入

**根因**

`sys_dict_data` 表无 `(dict_type, dict_value)` UNIQUE 约束，但 SQL 文件依赖 `ON DUPLICATE KEY UPDATE` 实现幂等。

**结果**

任何人重跑这个 SQL，都会复制 3 条字典数据。

**修复方案选项**

- **A**（推荐）：改 SQL 为 `DELETE FROM sys_dict_data WHERE dict_type='osg_schedule_status'; INSERT ...`
- **B**（侵入大）：给 sys_dict_data 加 `UNIQUE (dict_type, dict_value)`，但这是 RuoYi 上游表

**优先级**：P3

---

## 5 · 我的认知校正历程（关键）

### 误判 BUG-D（已撤回）

**错误结论**

> "admin 端创建 `staff_type='lead_mentor'` 时不绑 `clerk` 角色，导致该 lead-mentor 用邮箱登 lead-mentor 端会失败"

**错误根源**

只看了 `OsgLeadMentorAccessService` 一个方法：

```@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorAccessService.java:79-92
private boolean hasClerkRole(SysUser user) {
    Integer count = jdbcTemplate.queryForObject("""
        select count(1) from sys_user_role ur
        inner join sys_role r on r.role_id = ur.role_id
        where ur.user_id = ? and r.role_key = 'clerk' and ...
    """, ...);
    return count != null && count > 0;
}
```

就武断说"必须有 clerk 角色"。

**真相**

`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorAccessService.java:49-53` 的 `hasLeadMentorAccess` 是 **4 路 OR**：

```java
return isActiveUser(user)
    && (user.isAdmin()                                 // 路径 1: 超管
        || hasClerkRole(user)                          // 路径 2: clerk 角色
        || hasActiveLeadMentorStaff(user.getEmail())   // 路径 3: osg_staff 派生 ← 关键
        || hasLeadMentorBusinessOwnership(...));        // 路径 4: 业务表派生
```

**任意 1 路** OK 即可登录。**clerk 角色不是必需**。

**数据印证**

`Test Lead Mentor` (staff_id=99901) 对应 user_id=12814，**没有 clerk 角色**（roles=NULL）。但因为 osg_staff 里有 `staff_type='lead_mentor'` 记录 → 走路径 3 派生身份 → **能登 lead-mentor 端**。

→ 跟用户实测"现在 lead-mentor 用邮箱可以登录"完全吻合。

**校正结论**

**admin 创建任何类型 staff 后都能登对应端**，**不存在"漏绑角色"BUG**。

`OsgStaffServiceImpl.ensureStaffAccount` 只建 sys_user 不绑角色 = **符合系统设计**（角色不是登录所必需）。

**请校验 AI 重点验证**：上述"4 路 OR" 解读是否正确？我有没有再次错过某个其它 access 入口？

---

## 6 · 校验 SQL 与连接信息

### 6.0 · 连接信息

```bash
mysql -h 47.94.213.128 -P 23306 -u ruoyi -papp123456 ry-vue
```

### 6.1 · 校验 BUG-A（字典）

```sql
-- 期望：3 条且都在
SELECT dict_code, dict_label, dict_value, dict_sort, status, remark
FROM sys_dict_data WHERE dict_type='osg_schedule_status' ORDER BY dict_sort;
-- 应输出: 1825/有空闲/available/10  1826/正常/normal/20  1827/排期紧张/busy/30

-- 期望：dict_type 表 1 条
SELECT dict_id, dict_name, dict_type, status FROM sys_dict_type
WHERE dict_type='osg_schedule_status';
```

### 6.2 · 校验 sys_dict_data 索引（issue-1）

```sql
-- 期望：仅 PRIMARY；不应有 (dict_type, dict_value) UNIQUE
SHOW INDEX FROM sys_dict_data WHERE Key_name != 'PRIMARY';
```

### 6.3 · 校验 BUG-B Step 1（19 个 sys_user 在）

```sql
-- 期望：active_mentors=20  has_account=20
SELECT
  COUNT(*) AS active_mentors,
  SUM(CASE WHEN u.user_id IS NOT NULL THEN 1 ELSE 0 END) AS has_account
FROM osg_staff s
LEFT JOIN sys_user u ON u.email = s.email AND u.del_flag = '0'
WHERE s.staff_type = 'mentor' AND s.account_status = 'active';

-- 抽查：本次新建的 19 个用户应该存在
SELECT COUNT(*) FROM sys_user
WHERE create_by='cascade-fix-bug-b' AND del_flag='0';
-- 应输出: 19
```

### 6.4 · 校验 BUG-B Step 2 已回滚

```sql
-- 期望：本次新建的 19 个用户都没有 role_id=10 绑定
SELECT COUNT(*) FROM sys_user_role ur
INNER JOIN sys_user u ON u.user_id = ur.user_id
WHERE ur.role_id=10 AND u.create_by='cascade-fix-bug-b';
-- 应输出: 0

-- Alex Ren (12824) 应保留 role_id=10
SELECT u.user_id, u.user_name, ur.role_id
FROM sys_user u LEFT JOIN sys_user_role ur ON ur.user_id=u.user_id AND ur.role_id=10
WHERE u.user_id=12824;
-- 应输出: 12824 / alex.ren@osg-staff.local / 10
```

### 6.5 · 校验"派生身份"系统设计

```sql
-- 当前 lead_mentor 类型 staff
-- Test Lead Mentor 应无 clerk 角色但仍能登 LM 端（用户实测过）
SELECT s.staff_id, s.staff_name, s.email, u.user_id,
       GROUP_CONCAT(r.role_key) AS roles
FROM osg_staff s
LEFT JOIN sys_user u ON u.email = s.email AND u.del_flag = '0'
LEFT JOIN sys_user_role ur ON ur.user_id = u.user_id
LEFT JOIN sys_role r ON r.role_id = ur.role_id AND r.del_flag='0'
WHERE s.staff_type = 'lead_mentor'
GROUP BY s.staff_id, s.staff_name, s.email, u.user_id;
```

### 6.6 · 校验 BUG-E（phonenumber 长度）

```sql
-- 期望: phonenumber=11
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA='ry-vue' AND TABLE_NAME='sys_user' AND COLUMN_NAME='phonenumber';

-- 期望: 见到 16 字符的 phone
SELECT staff_name, phone, CHAR_LENGTH(phone) AS plen FROM osg_staff
WHERE staff_type='mentor' AND CHAR_LENGTH(phone) > 11;
```

---

## 7 · 系统设计要点（请校验）

### 7.1 · 三个端的访问判定（基于 grep + 代码阅读）

| 端 | 文件 | 入口方法 | 判定（OR 逻辑） |
|---|---|---|---|
| Mentor | `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgMentorAccessService.java:47-79` | `hasMentorAccess` | admin **OR** osg_staff.staff_type='mentor' **OR** 业务表(job_coaching/class_record/mentor_schedule/mock_practice)有 mentor_id |
| Lead-Mentor | `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorAccessService.java:49-53` | `hasLeadMentorAccess` | admin **OR** sys_user_role.role_key='clerk' **OR** osg_staff.staff_type='lead_mentor' **OR** osg_student/osg_job_application 有 lead_mentor_id |
| Assistant | `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgAssistantAccessService.java:49-52` | `hasAssistantAccess` | admin **OR** osg_staff.staff_type='assistant' **OR** osg_student.assistant_id 关联 |

**结论**：3 个端都不强制依赖 sys_user_role。lead-mentor 是唯一一个能用 clerk 角色登的，但也只是 4 路之一。

### 7.2 · `OsgStaffServiceImpl.ensureStaffAccount` 行为

```@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgStaffServiceImpl.java:441-469
private SysUser ensureStaffAccount(OsgStaff staff, String operator) {
    SysUser account = sysUserService.selectUserByUserName(staff.getEmail());
    if (account != null) return account;
    // 创建 sys_user：user_name=email, password=DEFAULT_STAFF_PASSWORD("Osg@2026")
    // status 派生自 staff.accountStatus
    // 不绑任何 sys_user_role
    ...
}
```

→ **没有任何角色绑定逻辑**。结合 §7.1，admin UI 创建后 staff 仍能登（osg_staff 派生路径），所以这是 **by design**。

### 7.3 · `OsgIdentityResolver.resolveUserIdByStaffId` 行为

```@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgIdentityResolver.java:52-62
public Long resolveUserIdByStaffId(Long staffId) {
    OsgStaff staff = requireStaff(staffId);
    String email = requireEmail(staff.getEmail(), ...);
    SysUser account = resolveAccountByEmail(email);  // 只查 user_id
    if (account == null || account.getUserId() == null) {
        throw new ServiceException("员工账号不存在，无法完成导师分配");
    }
    return account.getUserId();
}
```

→ 不验角色、不验业务关系，**只要求 sys_user 中有该 email 对应账号**。这就是为什么 BUG-B Step 1 必要、Step 2 不必要。

---

## 8 · 待校验 AI 验证的开放问题

### Q1：我对 §7.1 三个端 access 判定的解读是否完整？

**潜在风险**：是否还有其它访问入口（gateway 层、interceptor、Spring Security 过滤器、SaToken 等）我漏看？

建议校验：

```bash
# grep 全仓库其它 access service 实现
grep -r "hasLeadMentorAccess\|hasMentorAccess\|hasAssistantAccess" /Users/hw/workspace/OSGPrj/ruoyi-*

# grep 登录 / 鉴权拦截器
grep -r "AuthenticationProvider\|@PreAuthorize\|filterChain" /Users/hw/workspace/OSGPrj/ruoyi-* --include="*.java"
```

### Q2：BUG-B 复用 Alex Ren 密码哈希是否合规？

我用了 Alex Ren 的 bcrypt password 复制给 19 个新建账号。明文密码不知道。

- 测试库：能接受（OsgIdentityResolver 不需登录）
- 但如果产品要求 19 位 mentor 用统一默认密码"Osg@2026"，应该改为 `SecurityUtils.encryptPassword(DEFAULT_STAFF_PASSWORD)` 的等效哈希
- 可校验：执行 `select password from sys_user where create_by='cascade-fix-bug-b' limit 1` 看哈希值是否符合预期

### Q3：BUG-C 我没诊断的真根因是什么？

请校验 AI 直接查看 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/lead-mentor/src/components/AssignMentorModal.vue` 找出 modal 关闭后 DOM 不释放的原因。

### Q4：是否还有其它 staff 类型（如 `assistant`）也存在历史 seed 缺账号问题？

我只查了 `staff_type='mentor'`。建议校验：

```sql
-- 每种 staff_type 的 has_account 比例
SELECT s.staff_type, COUNT(*) AS total,
       SUM(CASE WHEN u.user_id IS NOT NULL THEN 1 ELSE 0 END) AS has_account
FROM osg_staff s
LEFT JOIN sys_user u ON u.email=s.email AND u.del_flag='0'
WHERE s.account_status='active'
GROUP BY s.staff_type;
```

如果 assistant 也有缺账号，可能影响某些"分配助教"流程（但本次会话未触及）。

### Q5：BUG-A 误执行 2 次时插入的 6 条数据，回滚是否完全干净？

```sql
-- 应输出 3 条且 dict_code 应为 1825/1826/1827（最早的批次）
SELECT dict_code, dict_label, dict_value, create_time
FROM sys_dict_data WHERE dict_type='osg_schedule_status' ORDER BY dict_code;
```

如果出现 1828/1829/1830 dict_code，说明回滚不彻底。

### Q6：我最后一次说"原报问题已解决"是否过早？

**我没做端到端实测**。具体地：

- 我用 Playwright 触发了「查看详情」+「更换导师」按钮
- Playwright 在尝试 fetch `/api/lead-mentor/job-overview/252/assign-mentor` 时被重定向到 `/login`（token 过期或 Playwright 起的会话不带身份）
- **没有走完"选 mentor → 确认分配 → 看到成功"完整路径**

**建议校验 AI 让用户手动跑一次 E2E 验证**：

1. 在 LM 端登录后
2. 进入 `/career/job-overview`
3. 点任一行「查看详情」→「更换导师」
4. 选 Maggie Miao（之前不能选的）→ 确认
5. 看后端是否仍报 `员工账号不存在` —— 如果还报，说明 BUG-B 修复**不充分**或还有其它隐藏分支

---

## 9 · 时间线（事件顺序）

```
1. 用户报"换不了导师"
2. 我查 OsgIdentityResolver.resolveUserIdByStaffId → 锁定 "员工账号不存在" 错误
3. 查 osg_staff vs sys_user → 发现 19/20 mentor 缺 sys_user，1 位（Alex Ren）有
4. 查字典 → 发现 osg_schedule_status 完全没数据 → BUG-A
5. 修复 BUG-A：执行 osg_dict_schedule_status_init.sql（误跑 2 次→清理）
6. 修复 BUG-B Step 1：INSERT 19 个 sys_user
7. 误判：以为还需绑 mentor 角色 → INSERT 19 个 sys_user_role(role_id=10) [Step 2]
8. 用户问"admin 正常建数据会出现这问题吗" → 我开始查 admin 流程
9. 我查 OsgStaffServiceImpl.ensureStaffAccount → 发现"建 user 不绑角色"
10. 我武断结论："这是 BUG-D（创建 lead_mentor 时不绑 clerk 角色）"
11. 用户反馈"现在 lead_mentor 用邮箱可以登录"
12. 我重读 OsgLeadMentorAccessService 完整代码 → 发现 4 路 OR
13. 撤回 BUG-D 误判
14. 用户决策回滚 Step 2 的 19 条角色绑定
15. 执行回滚 → DELETE 19 条 → Alex Ren 保留
16. 整理本文档
```

---

## 10 · 给校验 AI 的最终请求

请你按以下结构回复你的校验结果：

```markdown
## 校验报告

### 我同意的部分
- BUG-A：[同意 / 有保留 / 反对] - 理由
- BUG-B Step 1：...
- BUG-B Step 2 回滚：...
- BUG-C：...
- BUG-E：...
- issue-1：...
- §7.1 三端 access 判定：...
- BUG-D 撤回：...

### 我发现 Cascade 漏掉的
- ...

### 我发现 Cascade 错的
- ...

### Open Q1-Q6 我的答案
- Q1: ...
- Q2: ...
- ...

### 推荐下一步
- ...
```

谢谢校验。
