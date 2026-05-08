# 学员账号状态联动 — 手动测试用例

> 范围：本期后端 T0~T5 + 前端 F0~F5 全量验收
> 创建：2026-05-08
> 测试账号 / 数据见 § 0 准备项

---

## 0. 测试准备

### 测试账号

| 角色 | user_id | 用户名 / 邮箱 | 密码 |
|---|---|---|---|
| Admin | 1 | `admin` | `Osg@2026` |
| Lead-mentor | 12814 | `test-lead-mentor@osg-test.local` | `Osg@2026` |
| Assistant | 12813 | `test-assistant@osg-test.local` | `Osg@2026` |
| Student | 46706 | `story1.test@osg.test` | `Osg@2026` |

绑定关系：student 46706 的 `lead_mentor_id=12814 / assistant_id=12813`。

### 端口

- 后端：`http://localhost:28080`
- admin：`http://localhost:3005`
- student：`http://localhost:3001`（按本地 vite 端口）
- lead-mentor / assistant：用对应端口启动

### 数据状态重置（每轮测试前后跑）

```sql
update osg_student set account_status='0' where student_id=46706;
delete from osg_student_blacklist where student_id=46706;
delete from osg_class_record where feedback_content like 'MANUAL_TEST_%';
update osg_staff set account_status='active' where email='test-assistant@osg-test.local';
```

或直接执行 `bash docs/student-account-status-curl-test.sh` 脚本，跑完会自动恢复。

---

## 1. Admin 端：结束合同（F2）

### A1 操作菜单显示 "结束合同"

**步骤**：
1. 用 admin 登录 `http://localhost:3005`
2. 进 "用户管理 → 学员管理"
3. 找到 `story1.test@osg.test` 行，点 "更多" 下拉

**期望**：
- 下拉菜单**应有** "结束合同" 项，位置在"冻结"和"加入黑名单"之间
- 学员当前状态=正常时，不显示"恢复正常"，显示"冻结 / 结束合同 / 加入黑名单 / 退费"

### A2 点 "结束合同" 弹窗文案

**步骤**：
1. 沿 A1 继续，点 "结束合同"

**期望**：
- 弹出 StatusChangeModal
- 标题区目标状态徽章显示 "已结束"
- 描述文案：`结束合同后，学员仍可登录，但无法查看求职信息。导师不可申报课消，需续签合同后恢复。`
- **不显示原因下拉**（与"恢复正常"一致，不要求原因）
- 备注输入框可选

### A3 提交结束合同

**步骤**：
1. 沿 A2 继续，点确认提交

**期望**：
- toast 显示 "学员状态已更新"
- 列表刷新后 `story1.test@osg.test` 行的"账号状态"列显示 **"已结束"**
- 后端 DB 验证：`select account_status from osg_student where student_id=46706` 返回 `2`

### A4 已结束状态可恢复正常

**步骤**：
1. A3 后，操作下拉应显示 "恢复正常"（status≠0 时的逻辑分支）
2. 点 "恢复正常" → 提交

**期望**：
- 状态变回 "正常"
- DB 验证：`account_status='0'`

### A5 直接传 accountStatus="2" 仍兼容（回归）

**步骤**：略（属于现有 T1 别名兼容性测试，curl 脚本已覆盖）

---

## 2. Lead-mentor 端：申报弹窗防呆（F3）

### LM1 正常学员可选

**步骤**：
1. lead-mentor 登录
2. 进 "教学 → 课程记录"
3. 点 "申报课消" 打开弹窗
4. 学员下拉展开

**期望**：
- `story1.test@osg.test`（status=0）行**可点选**，label 形如 `Story1 Test Student (46706)` 无后缀

### LM2 冻结学员 disable

**前置**：`update osg_student set account_status='1' where student_id=46706`

**步骤**：
1. 重新打开 lead-mentor 申报弹窗（或刷新页面）
2. 学员下拉展开

**期望**：
- 该学员 option 灰显（`disabled`），label 形如 `Story1 Test Student (46706)（冻结，不可申报）`
- 鼠标点该项**无法选中**

### LM3 退费学员 disable

**前置**：`update osg_student set account_status='3' where student_id=46706`

**期望**（同 LM2 但后缀为）：`（已退费，不可申报）`

### LM4 已结束学员可选但加后缀

**前置**：`update osg_student set account_status='2' where student_id=46706`

**期望**：
- option **可点选**（已结束不拦申报）
- label 形如 `Story1 Test Student (46706)（已结束）`

### LM5 黑名单学员可选

**前置**：`update osg_student set account_status='0'; insert into osg_student_blacklist(...)`

**期望**：option 可点选，label 无特殊后缀（黑名单只在求职可见性维度起作用，不在申报维度）

### LM6 后端兜底（绕过前端）

如有兴趣验证后端校验仍生效：用 Postman / curl 直接 POST `/lead-mentor/class-records` 提交 frozen 学员的申报，期望 `code=400, msg≈"冻结"`。**curl 脚本已覆盖**，可跳过。

---

## 3. Assistant 端：申报弹窗防呆（F4）

### AS1~AS5

同 § 2，仅入口不同：用 assistant 登录 → "课程记录" → 申报弹窗。

注意 assistant 端用的是 antd `<a-select>`，disable option 默认会灰显并且鼠标悬停时光标会变成"禁止"图标。

---

## 4. Student 端：账号锁定路由守卫与 lock 页（F0+F5）

### S1 正常状态登录

**前置**：`update osg_student set account_status='0' where student_id=46706; delete from osg_student_blacklist where student_id=46706`

**步骤**：
1. 打开 student 端登录页
2. 输入 `story1.test@osg.test / Osg@2026`，提交

**期望**：
- 登录成功 toast
- 跳转到 `/positions` 或既有默认页
- 浏览器 DevTools 的 localStorage `osg_user` 中 `accountStatus="0"` 且 `blacklisted=false`

### S2 已结束学员登录直跳 lock 页

**前置**：`update osg_student set account_status='2' where student_id=46706`

**步骤**：
1. （先 logout 清 localStorage 或开无痕窗口）重新登录 `story1.test@osg.test`

**期望**：
- 登录成功（后端 T2 spec：status=2 不拦登录）
- **直接跳转到 `/account-locked?reason=contract_ended`**
- 页面渲染：
  - 标题："合同已结束"
  - 描述："合同已结束，无法查看求职信息。续签合同后将自动恢复正常状态。"
  - 灰色 lock 图标
  - 两个按钮："联系班主任" / "退出登录"

### S3 黑名单学员登录直跳 lock 页

**前置**：`update osg_student set account_status='0'; insert ignore into osg_student_blacklist(student_id, blacklist_reason, added_at) values(46706, 'manual test', now())`

**步骤**：同 S2，重新登录

**期望**：
- 跳到 `/account-locked?reason=blacklisted`
- 标题："账号已加入黑名单"
- 描述："账号已加入黑名单，无法查看求职信息。如有疑问，请联系您的班主任。"
- **红色** lock 图标（区分于已结束的灰色）

### S4 lock 页 "退出登录" CTA

**步骤**：在 S2 或 S3 状态下点击 "退出登录"

**期望**：
- localStorage `osg_token / osg_user` 被清空
- 跳转到 `/login`

### S5 lock 页 "联系班主任" CTA

**步骤**：在 S2/S3 状态下点击 "联系班主任"

**期望**：弹出 antd Modal，内容 "请通过站内信或邮件联系您的班主任处理后续事宜。"

### S6 已结束学员手动改 URL 绕过守卫

**前置**：S2 之后，仍处于 `/account-locked` 页

**步骤**：在地址栏输入 `/positions` 直接访问

**期望**：
- 路由守卫拦截，重新跳回 `/account-locked?reason=contract_ended`
- 页面**不会闪到**求职页内容（即不出现"加载失败"或求职数据空白）

### S7 黑名单学员手动改 URL

同 S6，前置改成 S3。期望 → `/account-locked?reason=blacklisted`。

### S8 冻结学员尝试登录（回归 T2）

**前置**：`update osg_student set account_status='1' where student_id=46706`

**步骤**：尝试登录

**期望**：
- 登录失败
- 错误提示文案 ≈ "账号已冻结，请联系管理员"
- 不进入任何页面（停在登录页）

### S9 退费学员尝试登录（回归 T2）

**前置**：`update osg_student set account_status='3' where student_id=46706`

**期望**：同 S8，文案 "账号已退费，请联系管理员"

### S10 lock 页未登录可直接访问

**步骤**：清 localStorage，未登录直接访问 `http://localhost:3001/account-locked?reason=contract_ended`

**期望**：页面正常渲染（路由 meta `public:true`，不跳登录）

---

## 5. 跨端联动场景

### X1 admin 切到 "已结束" → 学生端立即生效

**步骤**：
1. admin 端：把 student 46706 改到 "结束合同"
2. **不重新登录**，在已登录的 student 端访问 `/positions`

**期望**：
- 后端拦截：求职接口返回 `code=500, msg≈"合同已结束"`
- 但前端守卫读的是 localStorage 旧值（accountStatus=0），**不会立即跳 lock 页**
- 用户看到求职页报错 toast "合同已结束..."

> 这是已知限制：守卫只在登录后写入 user。重新登录或下次刷新后调用 getInfo 才会更新 localStorage。本期 Min 不做实时同步。

### X2 admin 切到 "结束合同" + 学生重新登录

**步骤**：
1. admin 改状态为 "结束合同"
2. student 退出登录后重新登录

**期望**：直接跳 lock 页（reason=contract_ended）。**这是 Min 设计的预期行为**。

### X3 admin 切到 "退费" → student 仍在线

**步骤**：
1. student 已登录，状态原本=0
2. admin 切到 "退费"

**期望**：
- 学生当前 session 因 token 仍有效，可继续操作
- 但其 token 续期或重新登录时会被 T2 拦截
- 如学生触发申报路径，由后端拦（spec § 1 范围已说明）

---

## 6. 后端真源回归（一键自动）

```bash
bash docs/student-account-status-curl-test.sh
```

期望：`PASS=18  FAIL=0  TOTAL=18`。覆盖 5 登录 + 3 求职 + 5 lead-mentor 申报 + 5 assistant 申报。

---

## 7. 退出测试 / 数据清理

```sql
update osg_student set account_status='0' where student_id=46706;
delete from osg_student_blacklist where student_id=46706;
delete from osg_class_record where feedback_content like 'MANUAL_TEST_%';
update osg_staff set account_status='frozen' where email='test-assistant@osg-test.local';
-- ↑ 助教 staff 还原 frozen 是因为这是它的初始状态，避免污染共享测试环境
```

或直接跑一次 `bash docs/student-account-status-curl-test.sh`（脚本会自动还原）。

---

## 8. 不在测试范围（本期 Min 不做）

- ❌ 实时状态同步（admin 改完不重新登录 student 不会跳 lock）
- ❌ student 求职页对 status=2/bl 的细粒度按钮 disable（路由守卫已拦在外）
- ❌ list 行整行变灰高亮（仅 option 文本带后缀 + disabled）
- ❌ mentor 端
- ❌ 状态变更通知（邮件/站内信）

---

## 修改历史

| 日期 | 改动 | 作者 |
|---|---|---|
| 2026-05-08 | 初版 — 覆盖 T0~T5 + F0~F5 全部交付 | hw |
