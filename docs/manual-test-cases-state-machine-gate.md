# 状态机门禁手工测试用例

> 求职辅导 + 模拟应聘双主线，5 端联动验证。
> 17 个用例（13 正向流 + 4 负向校验），每个独立可手测。
> 业务方/测试工程师可按本文档逐条执行。

---

## 1. 环境前置

### 服务

| 服务 | URL |
|---|---|
| Backend | http://127.0.0.1:28080 |
| Student | http://127.0.0.1:3001 |
| Mentor | http://127.0.0.1:3002 |
| LeadMentor | http://127.0.0.1:3003 |
| Assistant | http://127.0.0.1:3004 |
| Admin | http://127.0.0.1:3005 |
| DB | 47.94.213.128:23306 ry-vue (账号 ruoyi / app123456) |

### 账号矩阵

| 角色 | 端 | 登录账号 | 密码 |
|---|---|---|---|
| 学生 hw01 | Student | hwyellow222@126.com | admin123 |
| 导师 daoshi58 | Mentor | daoshi58@qq.com | admin123 |
| 班主任 | LeadMentor | 525086@qq.com | admin123 |
| 助教 | Assistant | zhujiao58@qq.com | admin123 |
| 超管 admin | Admin | admin | admin123 |

### 关键数据 ID

| 实体 | ID | 备注 |
|---|---|---|
| hw01 student_id | 25112 | 学生数据 |
| daoshi58 user_id | 12866 | 导师 sys_user ID |
| daoshi58 staff_id | 98187 | 导师 osg_staff ID（分配接口入参用这个） |
| coaching_id | 5221 | 测试用辅导申请 |
| application_id | 301 | 关联 application |

### 每轮测试前数据 reset（必须做）

```sql
UPDATE sys_config SET config_value='false'
  WHERE config_key='sys.account.captchaEnabled';

DELETE FROM osg_mock_practice
  WHERE request_content IN ('gate B-Flow mock practice', '手测 B-Flow mock practice');

DELETE FROM osg_class_record
  WHERE student_id=25112 AND mentor_id=12866
    AND (reference_id=5221
         OR reference_id IN (SELECT practice_id FROM osg_mock_practice
                             WHERE student_id=25112 AND request_content LIKE '%gate%'));

UPDATE osg_coaching
  SET mentor_ids=NULL, mentor_name=NULL, mentor_names=NULL, status='pending'
  WHERE coaching_id=5221;
```

> 注：captchaEnabled 改完后需重启 backend 让 Redis cache 刷新，否则登录仍要验证码。

---

## A 主流程：求职辅导（job_coaching）

### A0 — 初始状态快照

**目的**：确认 5 端在 mentor 未分配状态下的初始显示

**操作端**：5 端只读

**前置**：DB reset 完成（coaching 5221 mentor_ids=NULL）

**步骤**：
1. 在 Student 端登录 hw01，进入「我的求职 My Applications」(`/job-tracking`)
2. 在 Mentor 端登录 daoshi58，进入「学员求职总览」(`/job-overview`)
3. 在 LeadMentor 端登录，进入「求职总览」(`/career/job-overview`)
4. 在 Assistant 端登录，进入「求职总览」(`/career/job-overview`)
5. 在 Admin 端登录，进入「求职总览」(`/career/job-overview`)

**预期结果**：

| 端 | 期望可见 | 期望不可见 |
|---|---|---|
| Student | 表格行: Spring Insight / Morgan Stanley / 面试中 | "辅导导师 daoshi58" |
| LeadMentor | sidebar「待分配导师 2」、表格有 hw01 | — |
| Mentor | sidebar「学员求职总览 5」、表格里没有 hw01/Morgan Stanley | hw01 + Morgan Stanley 同一行 |
| Assistant | hw01、Morgan Stanley | — |
| Admin | sidebar「待分配导师 21」、Morgan Stanley | hw01 + Morgan Stanley 同一行 |

**SQL 校验**：
```sql
SELECT mentor_ids, mentor_name, status FROM osg_coaching WHERE coaching_id=5221;
-- 期望: mentor_ids=NULL, mentor_name=NULL, status=pending
```

---

### A1 — LeadMentor 分配 daoshi58 给 coaching 5221

**目的**：验证「分配导师」流程及 5 端实时联动

**操作端**：LeadMentor (3003)

**前置**：A0 通过

**步骤**：
1. LeadMentor 进入「求职总览」(`/career/job-overview`)
2. 找到 hw01 / Morgan Stanley 的「待分配导师」行
3. 点击「分配导师」按钮
4. 在弹窗中选择 daoshi58（**注意**：勾选时传给后端的是 osg_staff.staff_id=98187，非 user_id）
5. 填写分配备注 → 确认

**API 请求**（如直接测接口）：
```http
POST http://127.0.0.1:28080/lead-mentor/job-overview/coaching/5221/assign-mentor
Authorization: Bearer <leadMentor token>
Content-Type: application/json

{ "mentorIds": [98187], "note": "test assign" }
```

**预期 backend 响应**：
```json
{ "code": 200, "msg": "操作成功", "data": {
  "coachingId": 5221, "coachingStatus": "assigned",
  "mentorIds": [12866], "mentorNames": "daoshi58"
}}
```

**SQL 校验**：
```sql
SELECT mentor_ids, mentor_name, status FROM osg_coaching WHERE coaching_id=5221;
-- 期望: mentor_ids='12866', mentor_name='daoshi58', status='assigned'
```

**5 端联动校验**：

| 端 | 期望变化 |
|---|---|
| Student | `/job-tracking` 展开 Morgan Stanley 行后可见「辅导导师 daoshi58」 |
| LeadMentor | 「待分配导师」徽标从 2 → 1 |
| Mentor | 「学员求职总览」徽标从 5 → 6，表格新增 Morgan Stanley 行 |
| Assistant | 该 application 行新增 mentor 字段 daoshi58 |
| Admin | 「待分配导师」徽标从 21 → 20，表格中该 hw01/Morgan Stanley 行消失 |

**关系不变量**（应同时成立）：
- mentor 徽标增量 = +1
- admin 待分配数增量 = -1
- leadMentor 待分配数增量 = -1

---

### A2 — （文档约定 SKIP，无须测）

> A2 编号保留位，本次跑测设计不覆盖。

---

### A3 — Mentor 上报 5221 第一笔课消

**目的**：验证课消提交流程 + Bug X (feedbackContent JSON 序列化) 修复

**操作端**：Mentor (3002)

**前置**：A1 通过（coaching 5221 已 assigned）

**步骤**：
1. Mentor 进入「学员求职总览」找 hw01 / Morgan Stanley 行
2. 点「上报课消」按钮
3. 弹窗填表：
   - 课程类型：岗位辅导
   - 关联辅导：选当前 coaching 5221
   - 上课日期：今天
   - 时长：1 小时
   - 评分：8
   - 反馈内容（结构化）：
     - 目的：`gate A3 feedback purpose`
     - 涉及概念：`STAR`
     - 改进点：`logic`
     - 整体表现：优秀（great）
     - 详细叙述：`gate A3 narrative`
4. 提交

**API 请求**：
```http
POST http://127.0.0.1:28080/mentor/class-records
Authorization: Bearer <mentor token>
Content-Type: application/json

{
  "studentId": 25112, "classDate": "<today>", "durationHours": 1,
  "courseType": "job_coaching", "referenceType": "job_coaching",
  "referenceId": 5221, "rate": "8", "memberStatus": "normal",
  "feedbackContent": "{\"schemaVersion\":1,\"purpose\":\"gate A3 feedback purpose\",\"concepts\":\"STAR\",\"improvements\":\"logic\",\"performanceLevel\":\"great\",\"narrative\":\"gate A3 narrative\"}"
}
```

**预期 backend 响应**：
```json
{ "code": 200, "msg": "操作成功", "recordId": <新的 record_id> }
```

**SQL 校验**：
```sql
SELECT status, reference_type, reference_id FROM osg_class_record
WHERE student_id=25112 AND mentor_id=12866 AND reference_id=5221
ORDER BY record_id DESC LIMIT 1;
-- 期望: status='pending', reference_type='job_coaching', reference_id=5221
```

**跨端校验**：

| 端 | 期望 |
|---|---|
| Student | `/class-records` 显示「敬请期待」占位（学员端课程记录页未交付，此项验占位文案） |
| Mentor | `/courses` 看到 hw01 + 「待审核」 |
| Admin | `/teaching/class-records` 搜「hw01」可见 daoshi58 + 「待审核」 |

**不变量**：
- 该 coaching 课消条数 = 上一笔 + 1
- admin 待审核总数 = 上一笔 + 1

---

### A4 — Admin 审核通过 A3 提交的课消

**操作端**：Admin (3005)

**前置**：A3 通过（有一条 status=pending 的 record）

**步骤**：
1. Admin 进入「课消管理 / 教学中心 - 课程记录」(`/teaching/class-records`)
2. 搜「hw01」找到 A3 提交的 pending 记录
3. 点击「通过」

**API**：
```http
PUT http://127.0.0.1:28080/admin/report/<A3_record_id>/approve
Authorization: Bearer <admin token>
Content-Type: application/json
{ "remark": "ok" }
```

**预期响应**：`{code:200, msg:"操作成功"}`

**SQL 校验**：
```sql
SELECT status, reviewed_at FROM osg_class_record WHERE record_id=<A3_record_id>;
-- 期望: status='approved', reviewed_at 非 NULL
```

**跨端校验**：

| 端 | 期望 |
|---|---|
| Student | `/class-records` 占位（同 A3） |
| Mentor | `/job-overview` 找 hw01/Morgan Stanley 行 — 「已上报课消」+「1」 |

**不变量**：
- admin 待审核总数 = 上一笔 - 1

---

### A5 — Mentor 再上报一笔课消（备 A6 驳回用）

**操作端**：Mentor

**前置**：A4 通过

**步骤**：同 A3，但反馈目的写为 `gate A5 ready-to-reject`，评分 7。

**SQL 校验**：
```sql
SELECT status FROM osg_class_record WHERE student_id=25112 AND mentor_id=12866 AND reference_id=5221
ORDER BY record_id DESC LIMIT 1;
-- 期望: status='pending'
```

**不变量**：该 coaching 课消条数 = 上一笔 + 1（A3 1 笔 → A5 后 2 笔）

---

### A6 — Admin 驳回 A5 的课消

**操作端**：Admin

**前置**：A5 通过

**步骤**：
1. Admin 进「课程记录」，找 A5 这条 pending
2. 点「驳回」
3. 驳回原因填：`课时时长有误`
4. 备注填：`gate A6 reject`
5. 提交

**API**：
```http
PUT http://127.0.0.1:28080/admin/report/<A5_record_id>/reject
{ "remark": "课时时长有误；gate A6 reject" }
```

**SQL 校验**：
```sql
SELECT status, review_remark FROM osg_class_record WHERE record_id=<A5_record_id>;
-- 期望: status='rejected', review_remark 含 '课时时长有误'
```

---

### A7 — Mentor 重新提交被驳回的课消（FIX-3 关键）

**目的**：验证「重新提交」按钮打开的是统一的「上报课程记录」弹窗，不是旧的 inline 确认弹窗

**操作端**：Mentor

**前置**：A6 通过（有一条 rejected record）

**步骤**：
1. Mentor 进「课程记录」(`/courses`)
2. 找到「已驳回」行，操作列点「查看原因」
3. 在驳回详情面板点「重新提交」按钮
4. 在打开的弹窗中确认：
   - **弹窗标题应该是 `上报课程记录`**（不是「确认课程类型」）
   - **页面不应该出现 `#confirm-class-type` 选择器对应的旧 modal**
5. 修正内容后提交（评分 8，反馈目的 `gate A7 resubmit FIX-3`）

**预期 backend 响应**：`{code:200, recordId: <new int>}`

**SQL 校验**：
```sql
SELECT status, reference_type FROM osg_class_record WHERE student_id=25112 AND mentor_id=12866 AND reference_id=5221
ORDER BY record_id DESC LIMIT 1;
-- 期望: status='pending', reference_type='job_coaching'
```

**回归断言**：
- response body 不含 `JSON parse error` 字串
- response body 不含 `课程类型与关联类型不一致` 字串

---

## B 主流程：模拟应聘（mock_practice）

### B0 — 准备 mock_practice 数据

**操作端**：DB 直接 insert（业务上对应「学员申请模拟应聘 + LM 安排导师」整链）

**步骤**：执行 SQL
```sql
INSERT INTO osg_mock_practice
  (student_id, student_name, practice_type, request_content, status,
   mentor_ids, mentor_names, scheduled_at, submitted_at, del_flag)
VALUES (25112, 'hw01', 'mock_interview', 'gate B-Flow mock practice',
        'scheduled', '12866', 'daoshi58', '2026-05-21 10:00:00', NOW(), '0');
```

**SQL 校验**：
```sql
SELECT practice_id, status, mentor_ids, scheduled_at FROM osg_mock_practice
WHERE request_content='gate B-Flow mock practice';
-- 期望: status='scheduled', mentor_ids='12866', scheduled_at = '2026-05-21 10:00:00'
-- 记下 practice_id 备 B1 用
```

**5 端校验**：

| 端 | 期望可见 |
|---|---|
| Student `/mock-practice` | "gate B-Flow mock practice" 行 + 「daoshi58」 |
| LeadMentor `/career/mock-practice` | hw01 行 + 「模拟面试」 |
| Mentor `/mock-practice` | hw01 行 + 操作列「上报课消」（**不应有「确认」按钮** — FIX-1 修复点） |
| Assistant `/career/mock-practice` | hw01 行（Bug Y 修复后必须可见） |
| Admin `/career/mock-practice` | 切「全部记录」tab — hw01 + 「已安排」 |

---

### B1 — Student 查看模拟应聘预约时间（FIX-2 关键）

**目的**：验证 student 端详情显示真实预约时间，不是「待安排」

**操作端**：Student

**前置**：B0 完成

**步骤**：
1. Student 进「模拟应聘 Mock Practice」(`/mock-practice`)
2. 找到「gate B-Flow mock practice」行
3. 点「查看」详情

**预期**：详情面板中「预约时间」字段显示 `2026-05-21 10:00`（不是「待安排」）

**禁止文案**：页面中不应出现「待安排」字串

---

### B2 — Mentor 模拟应聘列表（FIX-1 关键）

**目的**：验证 mentor 端列表非空，操作列只有「上报课消」无「确认」

**操作端**：Mentor

**前置**：B0 完成

**步骤**：进入 `/mock-practice`

**预期**：
- 列表非空，hw01 行可见
- hw01 这行操作列：**有**「上报课消」link，**无**「确认」按钮
- 筛选区**没有**统计卡片（`.osg-stats-card` 选择器找不到）

---

### B3 — Mentor 上报 mock_practice 课消

**操作端**：Mentor

**前置**：B0 完成（mock_practice 已 scheduled）

**步骤**：
1. Mentor 在 `/mock-practice` 找到 hw01 行
2. 点「上报课消」
3. 填表：
   - 课程类型：模拟面试 (mock_interview)
   - 关联类型：模拟面试 (mock_interview)
   - 关联 ID：B0 的 practice_id
   - 上课日期：今天
   - 时长：1 小时
   - 评分：7
   - 反馈：目的 `gate B3 mock`，表现 great，叙述 `gate B3 narrative`
4. 提交

**API**：
```http
POST /mentor/class-records
{
  "studentId": 25112, "courseType": "mock_interview",
  "referenceType": "mock_interview", "referenceId": <B0_practice_id>,
  ...
}
```

**预期响应**：`{code:200, recordId:<new>}`

**SQL 校验**：
```sql
SELECT status, reference_type, course_type FROM osg_class_record
WHERE student_id=25112 AND reference_type='mock_interview'
AND reference_id=<B0_practice_id> ORDER BY record_id DESC LIMIT 1;
-- 期望: status='pending', reference_type='mock_interview', course_type='mock_interview'
```

---

### B4 — Admin 通过 B3 提交的课消

**操作端**：Admin

**步骤**：admin 进课消管理，找 B3 那条 pending，点「通过」

**SQL 校验**：
```sql
SELECT status FROM osg_class_record WHERE record_id=<B3_record_id>;
-- 期望: status='approved'
```

---

### B5 — 驳回 + 重提交（FIX-3 mock_practice path）

**操作端**：Mentor → Admin → Mentor（3 步链）

**前置**：B4 完成（B0 practice 上已有 1 条 approved）

**步骤**：
1. **B5.1** Mentor 再上报 1 条 mock 课消（评分 6，反馈目的 `gate B5.1 ready-to-reject`）
2. **B5.2** Admin 驳回 B5.1，原因「课程类型选择错误」
3. **B5.3** Mentor 找到驳回行 → 点「查看原因」→ 点「重新提交」→ 修正后提交（评分 8，反馈目的 `gate B5.3 resubmit FIX-3 mock path`）

**SQL 终态校验**：
```sql
SELECT record_id, status FROM osg_class_record
WHERE student_id=25112 AND reference_id=<B0_practice_id>
AND reference_type='mock_interview' ORDER BY record_id DESC LIMIT 3;
-- 期望（按 record_id 倒序）:
--   row 0: status='pending'    (B5.3)
--   row 1: status='rejected'   (B5.1)
--   row 2: status='approved'   (B3)
```

**回归断言**（B5.3 提交时）：
- response code=200
- response body 不含「JSON parse error」

---

## 负向测试（NA）— 校验后端拒绝路径

### NA1 — LeadMentor 提交空 mentorIds 应被拒

**操作端**：API 直接测（或 LM 弹窗不选任何 mentor 强行提交）

**API**：
```http
POST /lead-mentor/job-overview/coaching/5221/assign-mentor
{ "mentorIds": [], "note": "empty" }
```

**预期响应**：
```json
{ "msg": "请至少选择1位导师", "code": 400 }
```

**SQL 校验（DB 未变）**：
```sql
SELECT mentor_ids, status FROM osg_coaching WHERE coaching_id=5221;
-- 期望: mentor_ids='12866', status='assigned'（保持 A1 后的状态）
```

---

### NA2 — LeadMentor 提交不存在的 staffId 应被拒

**API**：
```http
POST /lead-mentor/job-overview/coaching/5221/assign-mentor
{ "mentorIds": [99999999], "note": "unknown" }
```

**预期响应**：
```json
{ "msg": "员工主数据不存在，无法完成导师分配", "code": 400 }
```

**SQL 校验**：同 NA1，DB 未变。

---

### NA3 — Mentor 给不存在的 student 提交课消应被拒

**API**：
```http
POST /mentor/class-records
{ "studentId": 99999999, "referenceId": 5221, "referenceType": "job_coaching", ... }
```

**预期响应**：
```json
{ "msg": "学员不存在", "code": 500 }
```

**SQL 校验（DB 未新增 99999999 的 record）**：
```sql
SELECT COUNT(*) FROM osg_class_record WHERE student_id=99999999 AND mentor_id=12866;
-- 期望: 0
```

---

### NA5 — Admin 审批不存在的 record_id 应被拒

**API**：
```http
PUT /admin/report/9999999/approve
{ "remark": "x" }
```

**预期响应**：
```json
{ "msg": "课时记录不存在", "code": 500 }
```

---

## 用例总览表

| 用例 | 操作端 | 主要验证 | DB 校验 | UI 跨端校验数 |
|------|--------|---------|---------|--------------|
| A0 | 5 端（只读） | 初始状态 | osg_coaching | 5 |
| A1 | LeadMentor | 分配导师 | osg_coaching | 5 + 不变量 3 条 |
| A3 | Mentor | 上报课消 | osg_class_record | 3 + 不变量 2 条 |
| A4 | Admin | 审核通过 | osg_class_record | 2 + 不变量 1 条 |
| A5 | Mentor | 再上报 | osg_class_record | — |
| A6 | Admin | 驳回 | osg_class_record | — |
| A7 | Mentor | 重提交 + FIX-3 弹窗验证 | osg_class_record | UI 断言 4 条 |
| B0 | DB | 准备 mock | osg_mock_practice | 5 |
| B1 | Student | 预约时间显示 (FIX-2) | — | UI 断言 2 条 |
| B2 | Mentor | mock 列表 (FIX-1) | — | UI 断言 3 条 |
| B3 | Mentor | mock 上报 | osg_class_record | — |
| B4 | Admin | mock 通过 | osg_class_record | — |
| B5 | Mentor→Admin→Mentor | 驳回+重提 | osg_class_record (3 行终态) | — |
| NA1 | API | 空 mentorIds | DB 未变 | — |
| NA2 | API | 未知 staffId | DB 未变 | — |
| NA3 | API | 未知 student | DB 未变 | — |
| NA5 | API | 未知 record | — | — |

**总计 17 个用例。**

---

## 跑测策略

1. **逐条单跑**：每条用例独立，但 A 系列有顺序依赖（A3 需 A1 完成，A4 需 A3...）。建议按编号顺序跑。
2. **每轮 reset**：跑完一轮后回到「每轮测试前数据 reset」执行 SQL，再跑下一轮。
3. **失败排查**：
   - DB 数据没变 → 查 backend 日志、看 response 是否有 code != 200
   - UI 没显示 → 看 vite dev server 是否就绪 / token 是否注入 / page 路由是否正确
   - 验证码失效 → 确认 `sys_config.sys.account.captchaEnabled = 'false'` + backend 已重启读取
4. **记录 evidence**：每个用例完成后保留：
   - DB 查询结果截图或 JSON
   - 跨端 UI 截图（建议每端 fullPage）
   - 失败时的 backend response body

---

## 已知设计偏差（非 bug，但需告知）

| 偏差 | 解释 |
|---|---|
| Student `/class-records` 显示「敬请期待」 | 学员端课程记录页面未交付，A3/A4 期望此占位（待页面交付后改回验真实记录） |
| A0/A1 sidebar 「标签 + 数字」拆开显示 | 标签和数字分两个 DOM 节点（badge 样式），用例用 `expectVisible` 时按两个独立 token 分别验 |
| 后端 AjaxResult 错误包装 HTTP 200 + body code 非 200 | NA3/NA5 预期 HTTP 仍是 200，看 body 里 `code` 字段判定真实错误 |

---

## 附录：API 端口快速 curl 模板

获取 token：
```bash
curl -X POST http://127.0.0.1:28080/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

后续请求带：
```http
Authorization: Bearer <从上面拿到的 token>
```
