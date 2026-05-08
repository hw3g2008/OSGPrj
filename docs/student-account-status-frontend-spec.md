# 学员账号状态联动 — 前端 Min Spec

> 状态：草稿 v1
> 创建：2026-05-08
> 范围：student / lead-mentor / assistant / admin 4 端，mentor 不入场
> 依赖：后端 `docs/student-account-status-spec.md` v2（T0~T5 已落地，commit a01c4ed）

---

## 1. 设计原则

1. **后端是真源** — 任何前端拦截都是 UX 优化，不是安全边界。绕过前端 → 后端继续抛 ServiceException
2. **零新接口** — 复用 admin/lead-mentor/assistant 已有列表接口的 `accountStatus` 字段；缺字段的端补一行 SQL 即可
3. **不重复实现 tag 组件** — 复用 `@osg/shared/components` 的 `StudentStatusTag.vue`
4. **错误文案以后端 i18n 为准** — 前端不另写一份"账号已冻结"，统一从 axios 拦截器吐出来的 `msg` 渲染
5. **本期不做** — 5 端徽章一致化重构、列表行整行变灰高亮、定时任务、邮件/站内信通知、状态字典化

---

## 2. 改动清单（共 4 处）

### #1 student 端：路由守卫 + 错误页

**问题**：status=2（已结束）或黑名单学员可登录，进入 `/positions` 时后端返回 `合同已结束 / 黑名单` toast，但用户看到一个"加载失败"的空页面，不知道发生了什么。

**现状校对**：
- 学生端目前共用系统 `getInfo()`（`@osg/shared/api/auth.ts:36 → /getInfo`），不返回学员账号状态
- `OsgStudentAuthController` 当前**只有** `/student/login`，无 `/student/getInfo`（assistant / lead-mentor 都已有自己的 getInfo）
- 学员登录态用 `@osg/shared/utils/storage.ts` 的 `getUser/setUser`（localStorage），**不依赖 Pinia**

**改动**：

| 文件 | 变更 |
|---|---|
| `ruoyi-admin/.../osg/OsgStudentAuthController.java` | **新增** `@GetMapping("/getInfo")`，body 返回 `{ user, accountStatus, blacklisted, mustChangePassword }`；照 `OsgAssistantAuthController:77-89` 模板，blacklisted 复用 `OsgStudentServiceImpl.selectBlacklistedStudentIds(List.of(studentId)).isEmpty()` |
| `osg-frontend/packages/shared/src/api/auth.ts` | 新增 `getStudentInfo()` 调 `/student/getInfo`（不要污染原 `getInfo()`，admin 等端继续走系统 `/getInfo`） |
| `osg-frontend/packages/student/src/views/login/index.vue` | `import { studentLogin, getStudentInfo as getInfo }` 替换原 `getInfo`；调用 `setUser` 时把 `accountStatus / blacklisted` 一并塞进 user 对象 |
| `osg-frontend/packages/student/src/router/index.ts:237 beforeEach` | 在已有守卫链末段加一段：从 `getUser()` 读 `accountStatus / blacklisted`，命中 `=== '2'` 或 `blacklisted === true` 时 `next({ name: 'AccountLocked', query: { reason: ... } })` |
| `osg-frontend/packages/student/src/views/account-locked/index.vue`（新增） | 静态页：根据 `query.reason ∈ {'contract_ended','blacklisted'}` 渲染文案 + "联系班主任续签" CTA |
| `osg-frontend/packages/student/src/router/index.ts` routes | 新增 public route `{ path: '/account-locked', name: 'AccountLocked', meta: { public: false, rolloutBypass: true } }` |

**测试**：student spec 单测 2 个 — 守卫对 status=2 / blacklisted=true 跳转；e2e 可选 1 用例。

---

### #2 lead-mentor 申报弹窗：学员选择 disable

**文件**：`osg-frontend/packages/lead-mentor/src/views/teaching/class-records/index.vue`

学员下拉的 `getLeadMentorStudentList` 已返回 `accountStatus`。改动：

```diff
-const studentOptions = computed(() => students.value.map(s => ({
-  value: s.studentId, label: s.studentName
-})))
+const studentOptions = computed(() => students.value.map(s => {
+  const blocked = s.accountStatus === '1' || s.accountStatus === '3'
+  return {
+    value: s.studentId,
+    label: s.studentName,
+    disabled: blocked,
+    tagStatus: s.accountStatus,
+  }
+}))
```

a-select 选项 slot 渲染 `<StudentStatusTag :account-status="option.tagStatus" />`，disabled 项 antd 自动灰显。

**为什么不做黑名单 disable**：spec § 2 明确 黑名单 + 申报 = 不拦。

**测试**：单测 1 个 — `studentOptions` 对 frozen/refunded 输出 `disabled: true`。

---

### #3 assistant 申报弹窗：同 #2

**文件**：`osg-frontend/packages/assistant/src/views/class-records/AssistantClassReportFlowModal.vue:817 loadStudents`

**现状校对**：
- 后端 `OsgAssistantStudentController:85` 已经在 row map 里写了 `accountStatus`，且 `selectBlacklistedStudentIds` 也已贯通到 `isBlacklisted`，**不需要后端改动**
- 前端 `AssistantStudentListItem` 类型继承自 `StudentListItem`（`@osg/shared/api/admin/student.ts:15`），已含 `accountStatus?: string` + `isBlacklisted?: boolean`
- `loadStudents` 当前 map 时只取了 `studentId / studentName`，丢掉了 status 字段——只需让它带上即可

改动逻辑同 #2，仅文件不同。

**测试**：单测 1 个，同形态。

---

### #4 admin 学员管理：补 end_contract action

**文件**：`osg-frontend/packages/admin/src/views/users/students/index.vue:143` 操作下拉菜单

```diff
 <a-menu-item key="freeze">冻结</a-menu-item>
+<a-menu-item key="end_contract">结束合同</a-menu-item>
 <a-menu-item key="restore">恢复</a-menu-item>
 <a-menu-item key="refund">退费</a-menu-item>
```

并在以下位置扩 `'end_contract'` 分支：

| 文件:行 | 当前 | 需要改 |
|---|---|---|
| `index.vue:288` | `type StudentActionKey = ... 'freeze'\|'restore'\|...\|'refund'` | + `'end_contract'` |
| `index.vue:289` | `type StudentStatusAction = Extract<...,'freeze'\|'restore'\|'refund'>` | + `'end_contract'` |
| `index.vue:310` | `pendingStatusAction = ref<StudentStatusAction>('freeze')` | 类型自动扩展，无需改值 |
| `index.vue:834` | `if (action === 'freeze' \|\| action === 'restore' \|\| action === 'refund')` | 加 `\|\| action === 'end_contract'` |
| `StatusChangeModal.vue:74` | `type StatusAction = 'freeze' \| 'refund' \| 'restore'` | + `'end_contract'` |
| `StatusChangeModal.vue:93 reasonOptionMap` | 仅 freeze/refund 两类 | end_contract 通常不需要 reason 选择，参考 restore 走 "no reason" 路径，必要时加固定原因列表 |
| `StatusChangeModal.vue:110 requiresReason` | `freeze \|\| refund` | 决定 end_contract 是否需要 reason — 建议**不需要**（与 restore 一致） |
| `StatusChangeModal.vue:112 targetStatusLabel` | freeze/refund/restore 三分支 | + `'已结束'` |
| `StatusChangeModal.vue:118 modalDescription` | 三分支 | + `'结束合同后，学员仍可登录但无法查看求职信息，需续签合同恢复正常状态'` |
| `StatusChangeModal.vue:128 actionIcon` | 三分支 | + `'mdi-file-document-remove'` 或类似图标 |
| `StatusChangeModal.vue:134 reasonOptions` | restore 返 [] | end_contract 同 restore 返 [] |

`changeStudentStatus(action='end_contract')` → 后端 T1 commit 29160f1 已支持，无需后端改动。

**为什么必要**：admin 端目前唯一可达 status=2 的方式是 `accountStatus="2"` 直传，UI 上没有按钮入口 → 实际等于做不到。后端 T1 加了别名就是为了这里。

**测试**：admin spec 单测 1 用例 — 点 "结束合同" → modal 弹出（无 reason 表单）→ 提交 → API payload `{ action: 'end_contract' }`，列表 row 的 `accountStatus` 变 `'2'`。

---

## 3. 不在本次范围

- ❌ 5 端 `StudentStatusTag` 视觉对齐 — 等 staff/contract 同形态需求一起做
- ❌ student 求职页 disable 投递/收藏按钮 — status=1/3 进不来，status=2/bl 已被路由守卫拦在外
- ❌ lead-mentor / assistant 学员列表行整行变灰 — 信息密度不值得
- ❌ admin 状态切换 confirm modal 的全量文案审 — 现有"冻结/恢复/退费"可读，end_contract 文案对齐即可
- ❌ mentor 端 — 不做申报，不需要

---

## 4. 实施次序（建议）

校对后调整：原 F1（assistant list 加 accountStatus）取消（后端已就绪）；F0 改为新增 `/student/getInfo` 端点。

| 顺序 | 内容 | 依赖 | 估时 |
|---|---|---|---|
| F0 | 后端新增 `OsgStudentAuthController#getInfo` | 无 | 1h |
| F2 | 前端 #4 admin end_contract action | T1（已落地） | 1h |
| F3 | 前端 #2 lead-mentor 学员下拉 disable | 无 | 1.5h |
| F4 | 前端 #3 assistant 学员下拉 disable | 无（后端已就绪） | 1.5h |
| F5 | 前端 #1 student 路由守卫 + lock 页 | F0 | 2.5h |

合计 **约 7.5 小时**，单人一天内交付。每条独立 commit、独立可测。

**推荐做的顺序**：F2（最简单 / 即刻可见）→ F3 / F4（单端独立）→ F0 + F5（连体，后端→前端联调）。

---

## 5. 验收标准

| # | 场景 | 期望 |
|---|---|---|
| FE-1 | admin 点学员 "结束合同" → confirm → 提交 | API `PUT /admin/student/status` body `action=end_contract`，成功后列表行 accountStatus=2，徽章变"已结束" |
| FE-2 | lead-mentor 申报弹窗，学员下拉里 status=1 学员 | option 灰显 + tag "冻结"，无法选中 |
| FE-3 | assistant 申报弹窗，学员下拉里 status=3 学员 | option 灰显 + tag "退费"，无法选中 |
| FE-4 | status=2 学员登录 student 端 | 路由跳 `/account-locked?reason=contract_ended`，文案"合同已结束，请联系班主任续签" |
| FE-5 | status=0 + 黑名单学员登录 student 端 | 同 FE-4 但 reason=blacklisted |
| FE-6 | status=0 学员登录 student 端 | 正常进 `/positions` |

---

## 6. 信号 → 升级 Mid

跑一段时间，下面任一出现 → 启动 Mid spec：
- "为什么 admin 切到已结束没生效" — 说明 #4 文案/反馈不够
- "导师不知道学员退费了，浪费 30 分钟备课" — 说明列表/日历视图也要徽章
- "学员投诉看不到说明就被踢出去" — 说明 lock 页文案不够 / 需要邮件通知

---

## 修改历史

| 日期 | 改动 | 作者 |
|---|---|---|
| 2026-05-08 | 初版 v1（Min 范围）| hw |
