# 学员账号状态联动 — 测试用例清单（链式）

> 按状态链路顺序排，**优先用 admin UI 切换状态**，仅 status=3→0（admin UI 没有路径）必须 SQL。
>
> 测试账号：admin/`Osg@2026` · lead-mentor `test-lead-mentor@osg-test.local`/`Osg@2026` · assistant `test-assistant@osg-test.local`/`Osg@2026` · student `story1.test@osg.test`/`Osg@2026`（student_id=46706）

## 标注约定

- `[UI]` 通过页面操作完成
- `[SQL]` 必须连测试 DB 执行
- `[API]` 通过 curl/Postman 直接打接口
- 状态记号 `s=0/1/2/3 + bl?` 表示当前 student 的 `account_status` 与黑名单

---

## Phase 0 — 准备（开测一次）

| 步骤 | 类型 | 内容 |
|---|---|---|
| 0.1 | [SQL] | `update osg_student set account_status='0' where student_id=46706; delete from osg_student_blacklist where student_id=46706;` |
| 0.2 | — | 启动后端（28080）+ admin/student/lead-mentor/assistant 四端前端 dev 服务 |

进入状态 **s=0**。

---

## Phase 1 — s=0 正常态

| ID | 类型 | 步骤 | 期望 | ✅ |
|---|---|---|---|---|
| **A1** | [UI] | admin: 用户管理 → 学员管理 → 找到 student 46706 行 → 点"更多" | 下拉**包含** `冻结 / 结束合同 / 加入黑名单 / 退费`（4 项） | ☐ |
| **LM1** | [UI] | lead-mentor: 教学/课程记录 → "申报课消" → 学员下拉展开 | student 46706 行可选；label 无后缀 | ☐ |
| **AS1** | [UI] | assistant: 课程记录 → 申报弹窗 → 学员下拉 | 同上 | ☐ |
| **S1** | [UI] | student: 登录 | 跳 `/positions`；DevTools → localStorage `osg_user.accountStatus="0"`、`blacklisted=false` | ☐ |
| **S10** | [UI] | 任意浏览器（无登录态）访问 `http://localhost:<student-port>/account-locked?reason=contract_ended` | 页面正常渲染，不跳登录 | ☐ |

---

## Phase 2 — s=0 → 2（admin UI 结束合同）

| ID | 类型 | 步骤 | 期望 | ✅ |
|---|---|---|---|---|
| **A2** | [UI] | admin 同行 → "更多" → 点"结束合同" | 弹窗弹；徽章="已结束"；描述含"结束合同后，学员仍可登录..."；**无原因下拉** | ☐ |
| **A3** | [UI] | A2 弹窗点"确认提交" | toast="学员状态已更新"；列表行账号状态="已结束" | ☐ |

进入状态 **s=2**。

| ID | 类型 | 步骤 | 期望 | ✅ |
|---|---|---|---|---|
| **LM4** | [UI] | lead-mentor 申报弹窗 → 学员下拉（先关后开或刷新） | 行**可选**；label 后缀="（已结束）" | ☐ |
| **AS4** | [UI] | assistant 申报弹窗 → 学员下拉 | 同 LM4 | ☐ |
| **S2** | [UI] | student: 退出登录 → 重新登录 | 直跳 `/account-locked?reason=contract_ended`；标题"合同已结束"；**灰色** lock 图标；含"续签合同"描述 | ☐ |
| **S5** | [UI] | 沿 S2 → 在 lock 页点"联系班主任" | 弹 antd Modal："请通过站内信或邮件联系您的班主任处理后续事宜。" | ☐ |
| **S6** | [UI] | 沿 S2 → 地址栏改 `/positions` 直访 | 守卫拦截，回 `/account-locked?reason=contract_ended`，不闪到求职页 | ☐ |
| **S4** | [UI] | 沿 S2 → 点"退出登录" | localStorage `osg_token / osg_user` 清空，跳 `/login` | ☐ |
| **X1** | [UI] | （可选）准备一个 status=0 时已登录的 student session（无痕窗口）；admin 改其状态为 status=2；该 session 尝试访问 `/positions` | 求职接口报错 toast"合同已结束"，前端**不会立即跳 lock**（已知限制：守卫读 localStorage 旧值） | ☐ |

---

## Phase 3 — s=2 → 0（admin UI 双步：冻结 → 恢复正常）

> **为什么双步**：admin 操作菜单的"恢复正常"只在 `accountStatus==='1'` 时显示，s=2/3 没有直接 UI 路径回 0。先 freeze 拉到 1，再 restore 到 0。

| ID | 类型 | 步骤 | 期望 | ✅ |
|---|---|---|---|---|
| **A4** | [UI] | admin: 该行 → "更多" → 点"冻结" → 提交 | 状态="冻结" | ☐ |
| **A4b** | [UI] | 该行 → "更多"（此时只显示"恢复正常"+"退费"）→ 点"恢复正常" → 提交 | 状态="正常" | ☐ |

进入状态 **s=0**。

---

## Phase 4 — s=0 → 1（admin UI 冻结）

| ID | 类型 | 步骤 | 期望 | ✅ |
|---|---|---|---|---|
| **A4-pre** | [UI] | admin: 点"冻结" → 提交 | 状态="冻结" | ☐ |

进入状态 **s=1**。

| ID | 类型 | 步骤 | 期望 | ✅ |
|---|---|---|---|---|
| **LM2** | [UI] | lead-mentor 申报弹窗 → 学员下拉（刷新） | 行 **disabled**，label 后缀="（冻结，不可申报）" | ☐ |
| **AS2** | [UI] | assistant 申报弹窗 → 学员下拉 | antd a-select 行灰显 + 鼠标变禁止图标；后缀同 LM2 | ☐ |
| **S8** | [UI] | student 尝试登录 | 失败；文案 ≈"账号已冻结，请联系管理员"；停在登录页 | ☐ |
| **LM6** | [API] | （可选回归）curl POST `/lead-mentor/class-records` body `{studentId:46706,classDate:"2026-05-08",classStatus:"completed",durationHours:1,courseType:"basic",feedbackContent:"x"}` 携带 lead-mentor token | code=400，msg 含"冻结"。已被 F1 自动覆盖，可跳过 | ☐ |

---

## Phase 5 — s=1 → 0（admin UI 恢复正常）

| 类型 | 步骤 |
|---|---|
| [UI] | admin: 该行 → "恢复正常" → 提交 |

进入状态 **s=0**。

---

## Phase 6 — s=0 → 3（admin UI 退费）

| 类型 | 步骤 |
|---|---|
| [UI] | admin: "退费" → 选原因 → 提交 |

进入状态 **s=3**。

| ID | 类型 | 步骤 | 期望 | ✅ |
|---|---|---|---|---|
| **LM3** | [UI] | lead-mentor 申报弹窗 → 学员下拉 | 行 disabled，label 后缀="（已退费，不可申报）" | ☐ |
| **AS3** | [UI] | assistant 申报弹窗 → 学员下拉 | 同 LM3 | ☐ |
| **S9** | [UI] | student 尝试登录 | 失败；文案 ≈"账号已退费，请联系管理员" | ☐ |

---

## Phase 7 — s=3 → 0（**SQL 必须**，admin UI 无路径）

| 类型 | 步骤 |
|---|---|
| [SQL] | `update osg_student set account_status='0' where student_id=46706;` |
| 或 [API] | `PUT /admin/student/status` body `{studentId:46706,accountStatus:"0"}`（admin token） |

> 这是产品现状的 UI 缺口，本期不修。

进入状态 **s=0**。

---

## Phase 8 — 黑名单（admin UI 加入）

| ID | 类型 | 步骤 | 期望 | ✅ |
|---|---|---|---|---|
| **A-bl-pre** | [UI] | admin: 该行 → "加入黑名单" → 选原因/写备注 → 提交 | 列表"黑名单"标记或行染色生效（按现有产品行为为准） | ☐ |

进入状态 **s=0 + bl**。

| ID | 类型 | 步骤 | 期望 | ✅ |
|---|---|---|---|---|
| **LM5** | [UI] | lead-mentor 申报弹窗 → 学员下拉 | 行**可选**（黑名单不拦申报）；label 无特殊后缀 | ☐ |
| **AS5** | [UI] | assistant 申报弹窗 → 学员下拉 | 同 LM5 | ☐ |
| **S3** | [UI] | student 退登 → 重登 | 直跳 `/account-locked?reason=blacklisted`；标题"账号已加入黑名单"；**红色** lock 图标 | ☐ |
| **S7** | [UI] | 沿 S3 → 地址栏改 `/positions` | 回 `/account-locked?reason=blacklisted` | ☐ |

---

## Phase 9 — 移出黑名单（admin UI）

| 类型 | 步骤 |
|---|---|
| [UI] | admin: 切到"黑名单"标签 → 该学员行 → "移出黑名单" |

进入状态 **s=0**。

---

## Phase 10 — 收尾

| 步骤 | 类型 | 内容 |
|---|---|---|
| 10.1 | [SQL] | `update osg_student set account_status='0' where student_id=46706; delete from osg_student_blacklist where student_id=46706;` 兜底 |
| 10.2 | [API/SQL] | 助教 staff 还原冻结：`update osg_staff set account_status='frozen' where email='test-assistant@osg-test.local';`（如先前为别的用例改过） |

---

## 独立任务（与 phase 无序依赖）

| ID | 类型 | 内容 | 期望 | ✅ |
|---|---|---|---|---|
| **A5** | [API] | `PUT /admin/student/status` body `{studentId:46706,accountStatus:"2"}`（不传 action） | 成功；`account_status=2`（兼容性） | ☐ |
| **F1** | [脚本] | `bash docs/student-account-status-curl-test.sh` | `PASS=18 FAIL=0`；脚本自带数据准备 / 还原 | ☐ |
| **X2** | [UI] | （X1 后）student 退登 → 重登 | 直跳 lock 页（验证重登后状态同步） | ☐ |
| **X3** | — | 文档记录已知限制：admin 改后 student 当前 token 仍有效，下次重登 / 申报路径由后端拦 | — | ☐ |

---

## SQL 总用量

| 来源 | 次数 |
|---|---|
| Phase 0 起手清场 | 1（也可以省，先跑一次 F1 替代） |
| Phase 7 status=3→0 | **1（不可省，UI 缺口）** |
| Phase 10 收尾 | 1（礼貌） |
| 合计 | **2 必要 + 1 可选** |

其余状态切换全部 [UI]，并顺便正向验证了 admin 端的状态变更路径。

---

## 测试结果汇总

- 总用例：30（A×5 + B×6 + C×5 + D×10 + E×3 + F×1）
- 通过：____ / 30
- 阻塞 / 失败：____
- 备注：

---

## 修改历史

| 日期 | 改动 | 作者 |
|---|---|---|
| 2026-05-08 | 初版抽出独立 case 清单 | hw |
| 2026-05-08 | 重构为状态链路 / Phase 形式，最小化 SQL（仅 1 必要 + 2 礼貌） | hw |
