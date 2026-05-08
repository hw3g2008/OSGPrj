# 学员账号状态联动 — 测试用例清单

> 仅用例本身，按 case ID 编号。准备项 / 重置 SQL / 跨端说明见 `docs/student-account-status-manual-test-cases.md`。
>
> **测试账号**：admin/`Osg@2026` · lead-mentor `test-lead-mentor@osg-test.local`/`Osg@2026` · assistant `test-assistant@osg-test.local`/`Osg@2026` · student `story1.test@osg.test`/`Osg@2026`（student_id=46706）

---

## 共用 SQL 片段

```sql
-- 重置
RESET = update osg_student set account_status='0' where student_id=46706; delete from osg_student_blacklist where student_id=46706;

-- 设状态
SET_STATUS_X = update osg_student set account_status='X' where student_id=46706;
ADD_BL = insert ignore into osg_student_blacklist(student_id, blacklist_reason, added_at) values(46706, 'manual', now());
DEL_BL = delete from osg_student_blacklist where student_id=46706;
```

---

## A. Admin 端 — 结束合同（F2）

| ID | 前置 | 操作 | 期望 | ✅ |
|---|---|---|---|---|
| **A1** | RESET | admin 登录 → 用户管理 → 学员管理 → 找到 student 46706 行 → 点"更多" | 下拉菜单出现 4 项：冻结 / **结束合同** / 加入黑名单 / 退费 | ☐ |
| **A2** | A1 完成 | 点"结束合同" | 弹窗弹出；目标状态徽章="已结束"；描述="结束合同后，学员仍可登录，但无法查看求职信息。导师不可申报课消，需续签合同后恢复。"；**无原因下拉** | ☐ |
| **A3** | A2 弹窗已开 | 点"确认提交" | toast="学员状态已更新"；列表行账号状态="已结束"；DB 校验 `account_status=2` | ☐ |
| **A4** | A3 完成 | 同一行点"更多" → 点"恢复正常" → 提交 | 状态回到"正常"；DB `account_status=0` | ☐ |
| **A5** | RESET | 直接 PUT `/admin/student/status` body `{studentId:46706,accountStatus:"2"}`（不传 action） | 仍成功；DB `account_status=2`（兼容性回归 T1） | ☐ |

---

## B. Lead-mentor 端 — 申报弹窗防呆（F3）

| ID | 前置 | 操作 | 期望 | ✅ |
|---|---|---|---|---|
| **LM1** | RESET | lead-mentor 登录 → 教学/课程记录 → 点"申报课消" → 学员下拉展开 | 找到 student 46706 行；可点选；label="Story1 Test Student (46706)"（无后缀） | ☐ |
| **LM2** | SET_STATUS_1 | （刷新页面）打开申报弹窗 → 学员下拉 | 该行 disabled（鼠标无法选）；label 后缀="（冻结，不可申报）" | ☐ |
| **LM3** | SET_STATUS_3 | 同 LM2 | 行 disabled；后缀="（已退费，不可申报）" | ☐ |
| **LM4** | SET_STATUS_2 | 同 LM2 | 行**可选**（已结束不拦申报）；后缀="（已结束）" | ☐ |
| **LM5** | RESET + ADD_BL | 同 LM2 | 行**可选**（黑名单不拦申报）；label 无特殊后缀 | ☐ |
| **LM6**（可选） | SET_STATUS_1 | curl/Postman POST `/lead-mentor/class-records` 提交 frozen 学员申报 | code=400，msg 含"冻结"。已被 curl 脚本覆盖，可跳过 | ☐ |

---

## C. Assistant 端 — 申报弹窗防呆（F4）

| ID | 前置 | 操作 | 期望 | ✅ |
|---|---|---|---|---|
| **AS1** | RESET | assistant 登录 → 课程记录 → 申报弹窗 → 学员下拉 | 行可选；无后缀 | ☐ |
| **AS2** | SET_STATUS_1 | 同 AS1 | antd a-select 行 disabled（鼠标变禁止图标）；后缀="（冻结，不可申报）" | ☐ |
| **AS3** | SET_STATUS_3 | 同 AS1 | 行 disabled；后缀="（已退费，不可申报）" | ☐ |
| **AS4** | SET_STATUS_2 | 同 AS1 | 行可选；后缀="（已结束）" | ☐ |
| **AS5** | RESET + ADD_BL | 同 AS1 | 行可选；无特殊后缀 | ☐ |

---

## D. Student 端 — 路由守卫与 lock 页（F0+F5）

| ID | 前置 | 操作 | 期望 | ✅ |
|---|---|---|---|---|
| **S1** | RESET | 登录 student | 成功跳 `/positions`；localStorage `osg_user.accountStatus="0"`，`blacklisted=false` | ☐ |
| **S2** | SET_STATUS_2 | 退出登录 → 重新登录 student | 直接跳 `/account-locked?reason=contract_ended`；标题"合同已结束"；灰色 lock 图标；描述含"续签合同"；两个按钮 | ☐ |
| **S3** | RESET + ADD_BL | 退登录 → 重登 | 直跳 `/account-locked?reason=blacklisted`；标题"账号已加入黑名单"；**红色** lock 图标 | ☐ |
| **S4** | S2 或 S3 状态 | 在 lock 页点"退出登录" | localStorage `osg_token / osg_user` 清空；跳 `/login` | ☐ |
| **S5** | S2 或 S3 状态 | 在 lock 页点"联系班主任" | 弹 antd Modal，内容="请通过站内信或邮件联系您的班主任处理后续事宜。" | ☐ |
| **S6** | S2 完成（仍在 lock 页） | 地址栏改 `/positions` 直接访问 | 路由守卫拦截 → 跳回 `/account-locked?reason=contract_ended`；不闪到求职页 | ☐ |
| **S7** | S3 完成 | 地址栏改 `/positions` | 跳回 `/account-locked?reason=blacklisted` | ☐ |
| **S8** | SET_STATUS_1 | 尝试登录 student | 登录失败；错误文案 ≈"账号已冻结，请联系管理员"；停留登录页 | ☐ |
| **S9** | SET_STATUS_3 | 尝试登录 student | 失败；文案 ≈"账号已退费，请联系管理员" | ☐ |
| **S10** | 清空 localStorage（未登录） | 直接访问 `http://localhost:<student-port>/account-locked?reason=contract_ended` | 页面正常渲染（不跳登录） | ☐ |

---

## E. 跨端实时性 / 已知限制

| ID | 前置 | 操作 | 期望 | ✅ |
|---|---|---|---|---|
| **X1** | student 已登录态=0 | admin 改其状态为"结束合同"（不动 student session）→ 切回 student 页面访问 `/positions` | 求职接口返回错误 toast "合同已结束..."；**前端守卫不会立即跳 lock 页**（守卫读 localStorage 旧值）。已知限制 | ☐ |
| **X2** | X1 完成 | student 退登录 → 重登 | 直跳 `/account-locked?reason=contract_ended` | ☐ |
| **X3** | student 已登录态=0 | admin 改为"退费" | student 当前 token 仍可调接口；下次重登被 T2 拦；申报路径由后端拦 | ☐ |

---

## F. 后端真源回归（自动）

| ID | 命令 | 期望 | ✅ |
|---|---|---|---|
| **F1** | `bash docs/student-account-status-curl-test.sh` | `PASS=18 FAIL=0 TOTAL=18`，自动还原数据 | ☐ |

---

## 测试结果汇总

- 总用例：A×5 + B×6 + C×5 + D×10 + E×3 + F×1 = **30**
- 通过：____ / 30
- 阻塞 / 失败：____
- 备注：

---

## 修改历史

| 日期 | 改动 | 作者 |
|---|---|---|
| 2026-05-08 | 抽出独立 case 清单（来自 manual-test-cases.md） | hw |
