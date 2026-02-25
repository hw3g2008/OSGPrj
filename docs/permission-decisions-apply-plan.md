# Permission 模块裁决应用计划

> 日期: 2026-02-23
> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- **一句话**: 将 old-question.md (D-001~D-006) + permission-DECISIONS.md (DEC-001~004) + OQ-001~004 的产品裁决统一应用到 PRD/SRS，消除所有待确认项和端内矛盾
- **验收标准**:
  1. 所有文件中角色总数 = 9，角色名称一致
  2. 角色标识全部为 snake_case
  3. 权限模块 checkbox = 23 项（与侧边栏 1:1）
  4. roleMenus 所有页面 ID ∈ SIDEBAR-NAV.md 集合
  5. OQ-001~004 全部已解决，C-P001~004 全部已解决
  6. DEC-001~004 全部 resolved + 已应用=true
  7. SRS 基于修正后 PRD 重新生成

## 二、前置条件与假设

- **假设 1**: SIDEBAR-NAV.md 是侧边栏分组/菜单项/页面ID 的唯一真相源 (SSOT)
- **假设 2**: 首页 (home) 不需要在权限弹窗中勾选，所有角色默认有首页权限
- **假设 3**: D-005 文员权限扩展由超管手工配置，不改 roleMenus 默认值
- **假设 4**: old-question.md 中 D-001~D-006 的裁决结果已经用户确认，不再变更
- **假设 5**: 01-admin-home.md 和 SIDEBAR-NAV.md 不引用受影响的角色名/权限分组（已验证）

## 三、裁决来源映射

| DECISIONS.md | 问题摘要　　　　　　　　　　　　　　　| old-question.md | 裁决内容　　　　　　　　　　　　　　　　　　　　 |
| --------------| ---------------------------------------| -----------------| --------------------------------------------------|
| DEC-001      | 角色字段：新增多选/编辑单选不一致　　 | D-002　　　　　 | **B - 统一多选**（新增和编辑都用 Checkbox 多选） |
| DEC-002      | 登录角色选择器键名与 roleMenus 不一致 | D-003　　　　　 | **B - 拆分**（在线题库管理员 + 面试题库管理员）　|
| DEC-003      | 权限弹窗分组与侧边栏分组/命名不一致　 | D-006(部分)　　 | **以侧边栏分组为准**（见下方详细映射）　　　　　 |
| DEC-004      | roleMenus 引用不存在的页面 ID　　　　 | —　　　　　　　 | **以侧边栏页面 ID 为准**　　　　　　　　　　　　 |
| —            | 首次登录是否强制改密　　　　　　　　　| D-001　　　　　 | **B - 强制改密**　　　　　　　　　　　　　　　　 |
| —            | 角色标识命名风格　　　　　　　　　　　| D-004　　　　　 | **B - snake_case**　　　　　　　　　　　　　　　 |
| —            | 文员权限范围　　　　　　　　　　　　　| D-005　　　　　 | **扩展**（+8 个页面，由超管手工配置）　　　　　　|
| —            | 权限模块列表补全　　　　　　　　　　　| D-006　　　　　 | **全部补入**　　　　　　　　　　　　　　　　　　 |

## 四、修改清单

### 文件 1: `osg-spec-docs/docs/02-requirements/srs/permission-DECISIONS.md`

> ⚠️ **执行时机: 步骤 12**（Phase E）— 所有 PRD/SRS 修改 + Pre-check 通过后才执行。

| 项 | 修改 |
|---|---|
| DEC-001 | status: rejected → resolved, 已应用: true, 裁决: "统一多选（参见 D-002）" |
| DEC-002 | status: rejected → resolved, 已应用: true, 裁决: "拆分为 online_qbank_admin + interview_qbank_admin（参见 D-003）" |
| DEC-003 | status: rejected → resolved, 已应用: true, 裁决: "以侧边栏分组为准（参见 OQ-003 裁决）" |
| DEC-004 | status: rejected → resolved, 已应用: true, 裁决: "以侧边栏页面 ID 为准（参见 OQ-004 裁决）" |

### 文件 2: `osg-spec-docs/docs/01-product/prd/permission/00-admin-login.md`

> 本文件修改分两部分：2a~2d 修改角色/权限映射，2e~2f 新增首次登录强制改密。

#### 2a. §3.1 角色选择器选项 (L44-56) — 应用 D-003 拆分

当前:
```
| online-qbank-admin | 在线测试题库管理员 |
| interview-qbank-admin | 真人面试题库管理员 |
```
修改: 无变化（已经是拆分状态）

#### 2b. §3.1 角色选择器 value (L46-56) — 应用 D-004 snake_case

old_string:
```
| super-admin | 超级管理员 |
| clerk | 文员 |
| auditor | 课时审核员 |
| accountant | 会计 |
| job-admin | 岗位管理员 |
| file-admin | 文件管理员 |
| online-qbank-admin | 在线测试题库管理员 |
| interview-qbank-admin | 真人面试题库管理员 |
| expense-auditor | 报销审核员 |
```
new_string:
```
| super_admin | 超级管理员 |
| clerk | 文员 |
| auditor | 课时审核员 |
| accountant | 会计 |
| job_admin | 岗位管理员 |
| file_admin | 文件管理员 |
| online_qbank_admin | 在线测试题库管理员 |
| interview_qbank_admin | 真人面试题库管理员 |
| expense_auditor | 报销审核员 |
```

#### 2c. §3.2 roleMenus (L60-69) — 应用 DEC-004 + D-004 snake_case + D-005

整表替换（snake_case 键名 + 页面ID修正 + 题库拆分）:

old_string:
```
| 角色标识 | 可访问页面 |
|---------|-----------|
| clerk | home, students, resumes, staff, contracts |
| auditor | home, reports |
| accountant | home, finance |
| job-admin | home, positions |
| file-admin | home, files |
| qbank-admin | home, qbank, questions |
| expense-auditor | home, expense |
| super-admin | home, roles, admins, students, contracts, staff, mentor-schedule, all-classes, feedback, positions, student-positions, job-overview, mock-practice, job-tracking, class-records, communication, finance, expense, files, online-test-bank, interview-bank, qbank, questions, mailjob, notice, base-data, complaints, logs |
```
new_string:
```
| 角色标识 | 可访问页面 |
|---------|-----------|
| clerk | home, students, staff, contracts |
| auditor | home, class-records |
| accountant | home, finance |
| job_admin | home, positions |
| file_admin | home, files |
| online_qbank_admin | home, online-test-bank |
| interview_qbank_admin | home, interview-bank, questions |
| expense_auditor | home, expense |
| super_admin | home, roles, admins, students, contracts, staff, mentor-schedule, positions, student-positions, job-overview, mock-practice, class-records, communication, finance, expense, files, online-test-bank, interview-bank, questions, mailjob, notice, base-data, complaints, logs |
```

变更明细:
- **clerk**: 移除 `resumes`（侧边栏无此页面）
- **auditor**: `reports` → `class-records`（对齐侧边栏页面ID）
- **job-admin → job_admin**: snake_case
- **file-admin → file_admin**: snake_case
- **qbank-admin → 拆分**: online_qbank_admin + interview_qbank_admin
- **expense-auditor → expense_auditor**: snake_case
- **super-admin → super_admin**: snake_case + 移除 `resumes`/`job-tracking`/`qbank` + `all-classes`→`class-records` + `feedback`→`communication`
- 注: D-005 扩展权限由超管手工配置，不改 roleMenus 默认值

#### 2d. §3.3 角色显示名称映射 (L71-83) — 应用 D-003 拆分 + D-004 snake_case

当前 kebab-case → 改为 snake_case:
```
| clerk → clerk |
| auditor → auditor |
| accountant → accountant |
| job-admin → job_admin |
| file-admin → file_admin |
| online-qbank-admin → online_qbank_admin |
| interview-qbank-admin → interview_qbank_admin |
| expense-auditor → expense_auditor |
| super-admin → super_admin |
```

#### 2e. §4.1 登录流程 (L87-93) — 补充首次登录强制改密 (D-001)

在步骤 4 "登录成功" 后补充:
```
4a. 首次登录检测 → 弹出强制改密弹窗（必须修改密码后才能进入系统）
```

#### 2f. 新增 §5.5 弹窗：首次登录强制改密

新增章节（插入在 §5 找回密码弹窗之后）:
```markdown
## 5.5 弹窗：首次登录强制改密

| 弹窗属性 | 值 |
|---------|-----|
| 标题 | 首次登录 - 请修改密码 |
| 说明 | 您正在使用初始密码，为了账户安全请设置新密码 |
| 字段 | 新密码(password, 必填, 8-20位) + 确认密码(password, 必填) |
| 不可关闭 | 无关闭按钮，必须修改密码后才能进入系统 |
| 裁决来源 | old-question D-001 |
```

### 文件 3: `osg-spec-docs/docs/01-product/prd/permission/02-admin-roles.md`

#### 3a. §3.1 权限模块 checkbox 列表 (L66-74) — 应用 DEC-003 + D-006

当前（7组22项）→ 修改后（7组23项，与侧边栏菜单项1:1对应，不含首页）:

| 分组　　　　　　　　　　　　| 图标　　　　　　　　　| 子项（修改后）　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| 变更说明　　　　　　　　　　　　|
| -----------------------------| -----------------------| ---------------------------------------------------------------------------------------------------| ---------------------------------|
| 权限管理　　　　　　　　　　| mdi-shield-key　　　　| 权限配置, 后台用户管理, **基础数据管理**　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| +基础数据管理（从系统设置移入） |
| 用户中心　　　　　　　　　　| mdi-account-group　　 | 学生列表, 合同管理, 导师列表, 导师排期管理　　　　　　　　　　　　　　　　　　　　　　　　　　　　| 无变化　　　　　　　　　　　　　|
| ~~课程管理~~ → **教学中心** | mdi-book-open-variant | ~~全部课程, 课程反馈~~ → **课程记录, 人际关系沟通记录**　　　　　　　　　　　　　　　　　　　　　 | 分组名+子项全部改　　　　　　　 |
| 求职中心　　　　　　　　　　| mdi-briefcase　　　　 | ~~岗位管理, 学员岗位追踪, 沟通记录~~ → **岗位信息, 学生自添岗位, 学员求职总览, 模拟应聘管理**　　 | 子项对齐侧边栏　　　　　　　　　|
| 财务中心　　　　　　　　　　| mdi-cash　　　　　　　| ~~结算中心~~ → **课时结算**, 报销管理　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | 结算中心→课时结算　　　　　　　 |
| 资源中心　　　　　　　　　　| mdi-folder　　　　　　| ~~文件管理, 题库管理, 面试真题~~ → **文件, 在线测试题库, 真人面试题库, 面试真题**　　　　　　　　 | 对齐侧边栏名称+补入　　　　　　 |
| ~~系统设置~~ → **个人中心** | mdi-cog　　　　　　　 | ~~邮件管理, 消息管理, 基础数据管理, 投诉建议, 操作日志~~ → **邮件, 消息管理, 投诉建议, 操作日志** | 分组名改+移除基础数据管理　　　 |

#### 3b. §2.2 预置数据 (L32-41) — 应用 D-003 拆分

当前:
```
| 6 | 题库管理员 | 负责题库内容管理 | 题库管理, 面试真题 (info) | 0人 | 编辑+删除 |
```
修改: 拆分为两行
```
| 6 | 在线题库管理员 | 负责在线测试题库管理 | 在线测试题库 (info) | 0人 | 编辑+删除 |
| 7 | 面试题库管理员 | 负责面试题库管理 | 真人面试题库, 面试真题 (info) | 0人 | 编辑+删除 |
```
后续行 ID 顺延（报销审核员→8, 超级管理员→9）

### 文件 4: `osg-spec-docs/docs/01-product/prd/permission/03-admin-admins.md`

#### 4a. §2 筛选栏角色下拉 (L21) — 应用 D-003 拆分

old_string:
```
| 角色筛选 | select | 140px | 全部角色, 文员, 课时审核员, 会计, 岗位管理员, 文件管理员, 题库管理员, 报销审核员, 超级管理员 |
```
new_string:
```
| 角色筛选 | select | 140px | 全部角色, 文员, 课时审核员, 会计, 岗位管理员, 文件管理员, 在线题库管理员, 面试题库管理员, 报销审核员, 超级管理员 |
```

#### 4b. §4.1 新增用户角色选项 (L85) — 应用 D-003 拆分

old_string:
```
文员, 课时审核员, 会计, 岗位管理员, 文件管理员, 题库管理员, 报销审核员, 超级管理员
```
new_string:
```
文员, 课时审核员, 会计, 岗位管理员, 文件管理员, 在线题库管理员, 面试题库管理员, 报销审核员, 超级管理员
```

#### 4c. §5 编辑用户弹窗角色字段 (L108) — 应用 DEC-001 (D-002)

old_string:
```
| 角色 | **select(单选)** | ✅ | 文员(selected) | ⚠️ 与新增弹窗不一致 |
```
new_string:
```
| 角色 | checkbox组(多选) | ✅ | 文员(checked) | 统一多选（D-002 裁决） |
```

#### 4d. §5 下方 C-P001 警告 (L111-113) — 已解决

old_string:
```
### ⚠️ 原型内部问题 C-P001

**新增用户弹窗**的角色字段使用 **checkbox 多选**（L4654），而**编辑用户弹窗**的角色字段使用 **select 单选下拉**（L4712）。同一字段在不同操作下的控件类型不一致。
```
new_string:
```
### ✅ 原型内部问题 C-P001（已解决）

**裁决**: 统一使用 checkbox 多选（参见 old-question D-002）。编辑用户弹窗角色字段从 select 单选改为 checkbox 多选。
```

### 文件 5: `osg-spec-docs/docs/01-product/prd/permission/DECISIONS.md` (PRD 级)

需要同步更新以下条目：

| 条目 | 当前状态 | 修改 |
|------|---------|------|
| D-003 | ⚠️ 原型内部矛盾 + 待决 | 补充裁决: "拆分为 online_qbank_admin + interview_qbank_admin（参见 old-question D-003）" |
| D-006 | ⚠️ 原型内部矛盾 + 待决 | 补充裁决: "统一多选 checkbox（参见 old-question D-002）" |
| D-014 | ⚠️ 原型内部差异 + 待决 | 补充裁决: "以侧边栏分组为准（参见 OQ-003 裁决）" |

> ℹ️ 文件 6 已合并到文件 2（同一文件 `00-admin-login.md`）。见上方 2e~2f。文件编号保留历史序号，不影响执行顺序。

### 文件 7: `osg-spec-docs/docs/01-product/prd/permission/MATRIX.md`

#### 7a. §4 全局组件 (L45) — 更新菜单项数量说明

old_string:
```
| 侧边栏导航 | 7个分组, 22个菜单项 | 01-admin-home.md §4 / SIDEBAR-NAV.md |
```
new_string:
```
| 侧边栏导航 | 7个分组, 23个菜单项 + 首页 = 24项 | 01-admin-home.md §4 / SIDEBAR-NAV.md |
```

#### 7b. §3 弹窗清单 — 补充首次登录强制改密弹窗

新增行:
```
| modal-force-change-pwd | login-page | 首次登录强制改密 | 00-admin-login.md §5.5 |
```

### 文件 8: `osg-spec-docs/docs/02-requirements/srs/permission.md` (SRS)

#### 8a. §1.3 角色清单 (L32-41) — 应用 D-003 拆分

old_string:
```
| 题库管理员 | 负责题库内容管理 | — |
```
new_string:
```
| 在线题库管理员 | 负责在线测试题库管理 | — |
| 面试题库管理员 | 负责面试题库管理 | — |
```

#### 8b. 其他引用角色名/权限分组的章节

> ⚠️ SRS 其余章节仍引用旧角色名/权限分组，需要在步骤 11 重新执行 `/brainstorm permission` 时自动对齐。本次只修改 §1.3 角色清单作为最小必要更新。

### 文件 9: `osg-spec-docs/docs/02-requirements/srs/permission-open-questions.md`

裁决落地后，4 个 OQ 全部已解决。更新状态并添加归档声明：

#### 9a. 文件头部添加归档声明

在文件开头 `> 来源:` 行下方插入:
```
> ℹ️ **已归档** — 本文档中的问题已全部解决并归入 `permission-DECISIONS.md`。本文件仅保留作为历史记录，决策以 `permission-DECISIONS.md` 为准。
```

#### 9b. 更新 OQ 状态：

| 条目 | 当前状态 | 修改 |
|------|---------|------|
| OQ-001 | 待确认 | ✅ 已解决: "统一多选 checkbox（old-question D-002）" |
| OQ-002 | 待确认 | ✅ 已解决: "拆分为在线题库管理员 + 面试题库管理员（old-question D-003）" |
| OQ-003 | 待确认 | ✅ 已解决: "以侧边栏分组为准（用户裁决）" |
| OQ-004 | 待确认 | ✅ 已解决: "以侧边栏页面 ID 为准（用户裁决）" |

同时更新统计表：高 0 / 中 0 / 低 0 / 总计 0（全部已解决）

### 文件 10: `osg-spec-docs/docs/01-product/prd/permission/CROSS-END-DIFF.md`

裁决落地后，4 个 C-P 问题全部已解决，需更新状态：

| 条目 | 当前状态 | 修改 |
|------|---------|------|
| C-P001 (§3.1) | 问题描述 | 补充: "✅ 已解决: 拆分为 online_qbank_admin + interview_qbank_admin（D-003）" |
| C-P002 (§3.2) | 问题描述 | 补充: "✅ 已解决: 统一 checkbox 多选（D-002）" |
| C-P003 (§3.3) | 问题描述 | 补充: "✅ 已解决: 以侧边栏分组为准（OQ-003）" |
| C-P004 (§3.4) | 问题描述 | 补充: "✅ 已解决: 以侧边栏页面 ID 为准（OQ-004）" |

## 五、影响范围

| 分类 | 文件 | 说明 |
|------|------|------|
| PRD 模块文件 | 00-login, 02-roles, 03-admins | 字段/角色/权限修正 |
| PRD 辅助文件 | DECISIONS.md, MATRIX.md, CROSS-END-DIFF.md | 裁决记录 + 矛盾标记已解决 |
| SRS 文件 | permission.md, permission-DECISIONS.md, permission-open-questions.md | 角色清单 + 状态更新 + OQ已解决 |
| 项目级文件 | docs/old-question.md | 历史裁决状态同步 |

| 指标 | 变化 |
|------|------|
| 角色总数 | 8 → 9（题库管理员拆分） |
| 权限模块总数 | 22 → 23（与侧边栏 23 个菜单项1:1对应，不含首页） |
| 新增弹窗 | +1（首次登录强制改密） |
| 待确认问题 | 4 → 0（OQ-001~004 全部已解决） |
| 端内矛盾 | 4 → 0（C-P001~004 全部已解决） |

## 六、执行顺序

### Phase A: PRD 修正（先修正真相源）

1. 更新 `00-admin-login.md` — 角色选择器 value(snake_case) + roleMenus(键名+页面ID+拆分) + 角色名称映射 + 首次登录强制改密弹窗
2. 更新 `02-admin-roles.md` — 权限弹窗分组(7组23项) + 预置数据(题库拆分, ID顺延)
3. 更新 `03-admin-admins.md` — 筛选栏(拆分) + 新增角色选项(拆分) + 编辑弹窗(统一多选) + C-P001标记已解决

### Phase B: 辅助文件同步

4. 更新 PRD `DECISIONS.md` — D-003/D-006/D-014 补充裁决
5. 更新 `MATRIX.md` — 菜单项数量修正 + 新增弹窗
6. 更新 `CROSS-END-DIFF.md` — C-P001~004 标记已解决

### Phase C: SRS 最小必要更新

7. 更新 SRS `permission.md` — §1.3 角色清单拆分
8. 更新 `permission-open-questions.md` — OQ-001~004 标记已解决

### Phase D: 历史文档状态同步

9. 更新 `old-question.md` — D-001~D-006 状态→已确认

### Phase E: 验证 + 闭环

10. **Pre-check** — 执行验证清单 V1~V6, V8~V11（见§七），这些项不依赖 DEC 状态
11. 重新执行 `/brainstorm permission` — 基于修正后的 PRD 重新生成 SRS，确保 SRS 全量对齐
11a. **Guard 检查** — 仅当同时满足以下条件才进入 Step 12：
    - `workflow.current_step == brainstorm_done`
    - `permission-DECISIONS.md` 无 `status: pending` 条目
    - 若不满足（如再次进入 `brainstorm_pending_confirm`），**停止执行，回到裁决流程**，解决新 pending 后重新从 Step 11 开始
12. **Guard 通过后** 一次性更新状态：
    - SRS `permission-DECISIONS.md` — 4 条记录 rejected→resolved + 已应用=true
13. **Post-check** — 执行 V7（确认 DEC 状态已正确更新），确认所有文件间无矛盾

> ⚠️ DEC 状态变更放在步骤 12，避免中间态被误读。V7 放在 Post-check 中验证状态已正确更新。

## 七、验证清单

### Pre-check（步骤 10，不依赖 DEC 状态）

| # | 验证项 | 检查方法 |
|---|---------|----------|
| V1 | 角色总数一致性 | 所有文件中角色数量 = 9 |
| V2 | 角色名称一致性 | 00-login §3.1 角色选择器 = 03-admins §2 筛选栏 = 02-roles §2.2 预置数据 = SRS §1.3 |
| V3 | 角色标识 snake_case | 00-login §3.1 value + §3.2 roleMenus 键名 + §3.3 映射表 全部为 snake_case |
| V4 | 权限模块数量一致性 | 02-roles §3.1 checkbox 子项总数 = 23（= SIDEBAR-NAV 24项 - 首页） |
| V5 | 权限分组与侧边栏一致 | 02-roles §3.1 分组名 = SIDEBAR-NAV.md 分组名 |
| V6 | roleMenus 页面ID有效性 | 00-login §3.2 所有页面ID ∈ SIDEBAR-NAV.md showPage ID 集合 |
| V8 | PRD DECISIONS 待决项清零 | D-003/D-006/D-014 全部有裁决内容 |
| V9 | old-question 状态同步 | D-001~D-006 全部已确认 |
| V10 | open-questions 已清零 | OQ-001~004 全部标记已解决，统计表总计=0 |
| V11 | CROSS-END-DIFF 已清零 | C-P001~004 全部标记已解决 |

### Post-check（步骤 13，依赖 DEC 状态）

| # | 验证项 | 检查方法 |
|---|---------|----------|
| V7 | DECISIONS.md 状态一致 | SRS DECISIONS 4条全部 resolved + 已应用=true |

## 八、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | 权限模块 checkbox 与侧边栏的对应关系 | A: 1:1对应 / B: 允许合并 | A | SIDEBAR-NAV 是 SSOT，权限控制粒度=菜单页面（PRD D-002） |
| 2 | 首页是否纳入权限弹窗 | A: 不纳入 / B: 纳入 | A | 所有角色默认有首页权限，无需勾选 |
| 3 | DEC 状态更新时机 | A: 先更新后修改 / B: 先修改后更新 | B | 避免中间态被误读，确保所有修改+验证通过后才标记 resolved |
| 4 | open-questions 文件处理 | A: 删除 / B: 归档+只读声明 | B | 保留历史记录，但明确指向 DECISIONS.md 为准 |
| 5 | SRS 更新策略 | A: 全量手动修正 / B: 最小修正+重新生成 | B | 手动修正容易遗漏，重新 /brainstorm 能确保全量对齐 |

## 九、自校验结果

### 第 1 轮（G1~G9 通用校验）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | §六执行顺序分 5 个 Phase，§五影响范围有汇总表 |
| G2 目标明确 | ✅ | §一目标有 7 条可度量验收标准 |
| G3 假设显式 | ✅ | §二列出 5 条假设 |
| G4 设计决策完整 | ✅ | §八列出 5 个决策点 |
| G5 执行清单可操作 | ✅ | 每项有文件/位置/old_string/new_string |
| G6 正向流程走读 | ✅ | Phase A→E 每步有输入/处理/输出 |
| G7 改动自洽 | ✅ | V1~V11 覆盖交叉一致性，01-admin-home.md 已验证不受影响 |
| G8 简约不等于省略 | ✅ | 包含目标/假设/决策/执行/验证/自校验全部节 |
| G9 场景模拟 | ✅ | 见下方场景走读 |

### 场景模拟

**场景 1: 新建用户并分配"在线题库管理员"角色**
1. 管理员打开“新增用户”弹窗 → 角色选项列表包含"在线题库管理员" ✅（文件 4 §4b）
2. 勾选角色，保存 → 用户列表筛选栏可选"在线题库管理员" ✅（文件 4 §4a）
3. 用户登录 → roleMenus 查找 `online_qbank_admin` → 可访问 home, online-test-bank ✅（文件 2 §2c）
4. 侧边栏只显示首页 + 在线测试题库 ✅

**场景 2: 编辑角色"文员"的权限模块**
1. 打开“编辑角色”弹窗 → 权限分组为 7 组 23 项 ✅（文件 3 §3a）
2. 分组名与侧边栏一致（教学中心而非课程管理） ✅
3. 基础数据管理在"权限管理"分组下 ✅

**场景 3: 首次登录强制改密**
1. 新用户使用初始密码 Osg@2025 登录 → 登录成功后弹出强制改密弹窗 ✅（文件 2 §2e~2f）
2. 弹窗不可关闭，必须修改密码 ✅
3. 修改完成后进入系统 ✅
