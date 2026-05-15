# 状态机门禁手工测试用例（v2，57 子用例）

> 求职辅导 + 模拟应聘双主线，5 端联动 + Layer 3 不变量 + 负向校验
> **17 个父用例 / 57 个子断言点**，每条独立可勾选
> 业务方 / QA 可按本文档逐条执行

---

## 总览数据

| 类别 | 父用例 | 子用例 | 说明 |
|---|---|---|---|
| A 主流程（求职辅导） | 7 (A0/A1/A3-A7) | 35 | 含 dbAssert / 跨端 / invariants / FIX 断言 |
| B 主流程（模拟应聘） | 6 (B0-B5) | 15 | 含 fix1/fix2/fix3Assert + multi-step + finalDbAssert |
| NA 负向（拒绝路径） | 4 (NA1/2/3/5) | 7 | expectStatus + expectErrorContains + dbAssert |
| **总计** | **17** | **57** | |

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
| DB | 47.94.213.128:23306 ry-vue (ruoyi/app123456) |

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
| hw01 student_id | 25112 | osg_student.student_id |
| daoshi58 user_id | 12866 | sys_user.user_id |
| daoshi58 staff_id | 98187 | osg_staff.staff_id（分配接口入参用 staff_id） |
| coaching_id | 5221 | 测试用辅导申请 |
| application_id | 301 | 关联 application |

### 每轮测试前 SQL reset（必须做）

```sql
UPDATE sys_config SET config_value='false' WHERE config_key='sys.account.captchaEnabled';
DELETE FROM osg_mock_practice WHERE request_content IN ('gate B-Flow mock practice','手测 B-Flow mock practice');
DELETE FROM osg_class_record WHERE student_id=25112 AND mentor_id=12866
  AND (reference_id=5221 OR reference_id IN
       (SELECT practice_id FROM osg_mock_practice WHERE student_id=25112 AND request_content LIKE '%gate%'));
UPDATE osg_coaching SET mentor_ids=NULL, mentor_name=NULL, mentor_names=NULL, status='pending'
  WHERE coaching_id=5221;
```

> ⚠️ captchaEnabled 改完后需重启 backend 让 Redis cache 刷新，否则登录仍报「验证码失效」

---

## A 主流程：求职辅导（job_coaching）

### TC-A0 初始状态快照（6 子用例）

**操作端**：5 端只读 / 前置：DB reset 完成

| 编号 | 验证点 | 操作 | 期望 | 通过 |
|---|---|---|---|---|
| **TC-A0.1** | DB coaching_5221 初始状态 | SQL: `SELECT mentor_ids, mentor_name, status FROM osg_coaching WHERE coaching_id=5221` | mentor_ids=NULL, mentor_name=NULL, status=pending | ☐ |
| **TC-A0.2** | Student 端 `/job-tracking` 表格 | 登录 hw01 → 我的求职 | 可见: Spring Insight / Morgan Stanley / 面试中；**不可见**: 辅导导师 daoshi58 | ☐ |
| **TC-A0.3** | LeadMentor 端 `/career/job-overview` | 登录 LM | 可见 sidebar「**待分配导师 2**」（标签 + 数字分开 DOM）+ 表格有 hw01 | ☐ |
| **TC-A0.4** | Mentor 端 `/job-overview` | 登录 daoshi58 | 可见 sidebar「**学员求职总览 5**」；表格里**不含** hw01+Morgan Stanley 行 | ☐ |
| **TC-A0.5** | Assistant 端 `/career/job-overview` | 登录 zhujiao58 | 可见 hw01、Morgan Stanley | ☐ |
| **TC-A0.6** | Admin 端 `/career/job-overview` | 登录 admin | 可见 sidebar「**待分配导师 21**」、Morgan Stanley；表格**不含** hw01+Morgan Stanley 行 | ☐ |

---

### TC-A1 LeadMentor 分配 daoshi58 给 coaching 5221（10 子用例）

**操作端**：LeadMentor / 前置：A0 通过

**操作**：LM `/career/job-overview` → hw01/Morgan Stanley 待分配行 → 点「分配导师」→ 选 daoshi58 → 确认

**等价 API**：
```http
POST /lead-mentor/job-overview/coaching/5221/assign-mentor
Authorization: Bearer <LM token>
{ "mentorIds": [98187], "note": "test" }
```

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-A1.1** | backend response | `code=200, msg=操作成功, data.mentorIds=[12866], data.mentorNames="daoshi58"` | ☐ |
| **TC-A1.2** | DB coaching_5221 | `SELECT...` → mentor_ids='12866', mentor_name='daoshi58', status='assigned' | ☐ |
| **TC-A1.3** | 不变量：mentor 徽标增量 | mentor「学员求职总览」徽标实测 post=pre+1（5→6） | ☐ |
| **TC-A1.4** | 不变量：admin 待分配数减量 | admin「待分配导师」徽标实测 post=pre-1（21→20） | ☐ |
| **TC-A1.5** | 不变量：LM 待分配数减量 | LM「待分配导师」徽标实测 post=pre-1（2→1） | ☐ |
| **TC-A1.6** | Student `/job-tracking` 跨端 | 展开 Morgan Stanley 行 → 可见「辅导导师 daoshi58」 | ☐ |
| **TC-A1.7** | LeadMentor 跨端 | 「待分配导师 1」 | ☐ |
| **TC-A1.8** | Mentor 跨端 | sidebar「学员求职总览 6」+ 表格出现 Morgan Stanley | ☐ |
| **TC-A1.9** | Assistant 跨端 | 该行出现 hw01 + Morgan Stanley + daoshi58 | ☐ |
| **TC-A1.10** | Admin 跨端 | 「待分配导师 20」+ 表格中该行消失（已分配） | ☐ |

---

### TC-A2 —（baseline 文档约定 SKIP，无须测）

---

### TC-A3 Mentor 上报第一笔课消（6 子用例，FIX Bug X — feedbackContent JSON 序列化）

**操作端**：Mentor / 前置：A1 通过

**操作**：daoshi58 进「学员求职总览」找 hw01/Morgan Stanley → 「上报课消」→ 填表提交

**填写内容**：课程类型=岗位辅导，关联=5221，日期=今天，时长=1，评分=8，反馈结构化（目的 `gate A3 feedback purpose`、概念 STAR、改进点 logic、表现 great、叙述 `gate A3 narrative`）

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-A3.1** | backend response | `code=200, msg=操作成功, recordId=<新 int>` | ☐ |
| **TC-A3.2** | DB latest record | status=pending, reference_type=job_coaching, reference_id=5221 | ☐ |
| **TC-A3.3** | 不变量：课消数+1 | SQL count 实测 post=pre+1（0→1） | ☐ |
| **TC-A3.4** | 不变量：admin 待审核数+1 | SQL count 实测 post=pre+1 | ☐ |
| **TC-A3.5** | Mentor 跨端 | `/courses` 可见 hw01 + 「待审核」 | ☐ |
| **TC-A3.6** | Admin 跨端 | `/teaching/class-records` 搜 hw01 → 可见 daoshi58 + 「待审核」 | ☐ |

> 注：Student `/class-records` 此时显示「敬请期待」占位（页面未交付）— 不作硬验

---

### TC-A4 Admin 审核通过 A3（4 子用例）

**操作端**：Admin / 前置：A3 通过

**操作**：Admin `/teaching/class-records` 搜 hw01 → A3 那条 pending → 「通过」

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-A4.1** | backend response | code=200 | ☐ |
| **TC-A4.2** | DB record | status=approved，reviewed_at 非 NULL | ☐ |
| **TC-A4.3** | 不变量：admin 待审核数-1 | post=pre-1 | ☐ |
| **TC-A4.4** | Mentor 跨端 | `/job-overview` 找 hw01/Morgan Stanley 行 → 「已上报课消 1」 | ☐ |

---

### TC-A5 Mentor 再上报第二笔（备 A6 驳回用，2 子用例）

**操作端**：Mentor / 前置：A4 通过

**操作**：同 A3，反馈目的改 `gate A5 ready-to-reject`，评分 7

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-A5.1** | DB latest record | status=pending | ☐ |
| **TC-A5.2** | 不变量：课消数+1 | post=pre+1（1→2） | ☐ |

---

### TC-A6 Admin 驳回 A5（1 子用例）

**操作端**：Admin / 前置：A5 通过

**操作**：Admin 找 A5 pending → 「驳回」→ 原因「课时时长有误」、备注「gate A6 reject」

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-A6.1** | DB record | status=rejected，review_remark 含「课时时长有误」 | ☐ |

---

### TC-A7 Mentor 重新提交（6 子用例，FIX-3 关键 — 验「重新提交」按钮打开 shared modal 非旧 confirm）

**操作端**：Mentor / 前置：A6 通过

**操作**：
1. Mentor `/courses` 找「已驳回」行 → 操作列「**查看原因**」（不是「查看驳回原因」）
2. 驳回详情面板点「**重新提交**」按钮
3. 在打开的弹窗中确认标题 + 修正后提交

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-A7.1** | backend response | code=200, recordId 非 NULL | ☐ |
| **TC-A7.2** | DB latest record | status=pending, reference_type=job_coaching | ☐ |
| **TC-A7.3** | 不变量：课消数+1 | post=pre+1 | ☐ |
| **TC-A7.4** | FIX-3 regression: 不出现 JSON parse error | response body 不含「JSON parse error」 | ☐ |
| **TC-A7.5** | FIX-3 regression: 不出现类型不一致 | response body 不含「课程类型与关联类型不一致」 | ☐ |
| **TC-A7.6** | uiAssert: modal 是 shared ClassReportFlowModal | 弹窗标题=「上报课程记录」，**不出现** `#confirm-class-type` 旧 modal 选择器 | ☐ |

---

## B 主流程：模拟应聘（mock_practice）

### TC-B0 准备 mock_practice 数据 + 5 端可见性（6 子用例）

**操作端**：DB insert / 前置：mock_practice 表无 'gate B-Flow' 行

**操作**：执行 SQL
```sql
INSERT INTO osg_mock_practice (student_id, student_name, practice_type, request_content, status,
  mentor_ids, mentor_names, scheduled_at, submitted_at, del_flag)
VALUES (25112,'hw01','mock_interview','gate B-Flow mock practice','scheduled',
        '12866','daoshi58','2026-05-21 10:00:00', NOW(), '0');
```

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-B0.1** | DB | practice_id 新建，status=scheduled, mentor_ids='12866', scheduled_at='2026-05-21 10:00:00' | ☐ |
| **TC-B0.2** | Student `/mock-practice` | 可见 'gate B-Flow mock practice' + 'daoshi58' | ☐ |
| **TC-B0.3** | LeadMentor `/career/mock-practice` | 可见 hw01 + 模拟面试 | ☐ |
| **TC-B0.4** | Mentor `/mock-practice` | 可见 hw01 + 「上报课消」；**不可见**「确认」按钮（FIX-1） | ☐ |
| **TC-B0.5** | Assistant `/career/mock-practice` | 可见 hw01（Bug Y 修复后必须可见） | ☐ |
| **TC-B0.6** | Admin `/career/mock-practice` | 切「**全部记录**」tab → 可见 hw01 + 「已安排」 | ☐ |

---

### TC-B1 Student 查看模拟应聘预约时间（1 子用例，FIX-2）

**操作端**：Student / 前置：B0 通过

**操作**：student `/mock-practice` → 找「gate B-Flow mock practice」→ 点「查看」详情

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-B1.1** | FIX-2 预约时间字段 | 详情面板「预约时间」显示 `2026-05-21 10:00`，**不出现** 「待安排」字串 | ☐ |

---

### TC-B2 Mentor 模拟应聘列表（1 子用例，FIX-1）

**操作端**：Mentor / 前置：B0 通过

**操作**：mentor `/mock-practice`

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-B2.1** | FIX-1 列表 + 操作列 | 列表非空，hw01 可见；hw01 行操作列**有**「上报课消」link、**无**「确认」按钮；筛选区**无** `.osg-stats-card` 统计卡片 | ☐ |

---

### TC-B3 Mentor 上报 mock 课消（1 子用例）

**操作端**：Mentor / 前置：B0 完成

**操作**：在 `/mock-practice` 点 hw01 行「上报课消」→ 填表（课程类型=模拟面试，关联类型=模拟面试，关联 ID=B0_practice_id，时长 1h，评分 7，反馈目的 `gate B3 mock`）→ 提交

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-B3.1** | DB latest record | status=pending, reference_type='mock_interview', course_type='mock_interview', reference_id=B0_practice_id | ☐ |

---

### TC-B4 Admin 审核通过 B3（1 子用例）

**操作端**：Admin / 前置：B3 通过

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-B4.1** | DB record | status=approved | ☐ |

---

### TC-B5 驳回 + 重提（5 子用例，FIX-3 mock_practice path 链）

**操作端**：Mentor → Admin → Mentor / 前置：B4 通过

**操作链**：
- B5.1 Mentor 再上报 mock（评分 6，目的 `gate B5.1 ready-to-reject`）
- B5.2 Admin 驳回 B5.1，原因「课程类型选择错误」
- B5.3 Mentor `/courses` 找驳回行 → 查看原因 → 重新提交（评分 8，目的 `gate B5.3 resubmit FIX-3 mock path`）

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-B5.1** | step B5.1 提交 | code=200, recordId 非 NULL；DB 新增一条 status=pending | ☐ |
| **TC-B5.2** | step B5.2 驳回 | DB 该 record status=rejected | ☐ |
| **TC-B5.3** | step B5.3 重提 | code=200; response **不含** `JSON parse error` | ☐ |
| **TC-B5.4** | FIX-3 regression（B5.3） | response body 不含 `JSON parse error` 字串 | ☐ |
| **TC-B5.5** | finalDbAssert 3 行终态 | SQL 倒序 LIMIT 3 → row0 pending(B5.3), row1 rejected(B5.1), row2 approved(B3) | ☐ |

---

## NA 负向：后端拒绝路径（7 子用例）

### TC-NA1 LeadMentor 提交空 mentorIds → 400（2 子用例）

**API**：
```http
POST /lead-mentor/job-overview/coaching/5221/assign-mentor
{ "mentorIds": [], "note": "empty" }
```

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-NA1.1** | backend response | code=400，msg 含「请至少选择」 | ☐ |
| **TC-NA1.2** | DB 未变 | coaching_5221 仍是 A1 后的 assigned 状态（mentor_ids='12866'） | ☐ |

---

### TC-NA2 LeadMentor 提交未知 staffId → 400（2 子用例）

**API**：
```http
POST /lead-mentor/job-overview/coaching/5221/assign-mentor
{ "mentorIds": [99999999], "note": "unknown" }
```

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-NA2.1** | backend response | code=400，msg 含「员工主数据不存在」 | ☐ |
| **TC-NA2.2** | DB 未变 | coaching_5221 仍是 assigned 状态 | ☐ |

---

### TC-NA3 Mentor 提交不存在的 student → 500（2 子用例）

**API**：
```http
POST /mentor/class-records
{ "studentId": 99999999, "referenceId": 5221, "referenceType": "job_coaching", ... }
```

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-NA3.1** | backend response | code=500，msg 含「学员不存在」 | ☐ |
| **TC-NA3.2** | DB 未新增 99999999 record | SELECT COUNT(*) WHERE student_id=99999999 → 0 | ☐ |

---

### TC-NA5 Admin 审批不存在的 record → 500（1 子用例）

**API**：
```http
PUT /admin/report/9999999/approve
{ "remark": "x" }
```

| 编号 | 验证点 | 期望 | 通过 |
|---|---|---|---|
| **TC-NA5.1** | backend response | code=500，msg 含「课时记录不存在」 | ☐ |

---

## 跑测策略

### 顺序

A 系列有顺序依赖：A0 → A1 → A3 → A4 → A5 → A6 → A7
B 系列也有：B0 → B1/B2（可并）→ B3 → B4 → B5
NA 必须在 A1 之后跑（NA1/NA2 期望 DB 已 assigned 状态作为「未变」基线）

### 每轮 reset

跑完一整轮（57 子用例）后回到「每轮 reset SQL」执行，再跑下一轮

### 失败排查

| 现象 | 排查 |
|---|---|
| 登录验证码失效 | 确认 `sys_config.captchaEnabled='false'` + backend 已重启 |
| Student 端 page 空白 | 看 vite 控制台是否 i18n 500（`packages/shared` 缺 vue-i18n） |
| Mentor `/job-overview` 0 行 | 看 mentor token 是否 inject + page.goto URL 是否对 |
| DB 数据没变 | 看 backend response.code 是否真 200 |

### Evidence 留存（推荐）

每个子用例通过/失败留：
- DB 查询结果截图或 JSON 导出
- 跨端 UI 截图（每端 fullPage）
- 失败时 backend response body 完整 JSON

---

## 已知设计偏差（非 bug，QA 不必再 raise）

| 偏差 | 解释 |
|---|---|
| Student `/class-records` 显示「敬请期待」 | 学员端课程记录页面未交付，A3/A4 期望此占位 |
| Sidebar「标签 + 数字」分两个节点 | 用例期望两个独立 token 都可见（如「待分配导师」+「2」） |
| Backend AjaxResult 包装错误：HTTP 200 + body code 非 200 | NA3/NA5 期望 HTTP 仍是 200，看 body 里 `code` 字段判定 |
| LM 端 `mentorIds` 入参用 staff_id 不是 user_id | A1/NA2 期望传 staff_id（osg_staff.staff_id），backend 内部转 user_id 写 DB |

---

## 附录 A：完整 57 子用例总览

| ID | 父用例 | 类型 | 操作端 | 主要验证点 |
|---|---|---|---|---|
| TC-A0.1 | A0 | dbAssert | DB | coaching_5221 初始 |
| TC-A0.2 | A0 | crossEnd | Student | /job-tracking 表格 |
| TC-A0.3 | A0 | crossEnd | LeadMentor | sidebar 待分配 2 |
| TC-A0.4 | A0 | crossEnd | Mentor | sidebar 总览 5 |
| TC-A0.5 | A0 | crossEnd | Assistant | 表格可见 |
| TC-A0.6 | A0 | crossEnd | Admin | 待分配 21 |
| TC-A1.1 | A1 | API response | LM | code=200 + mentorIds |
| TC-A1.2 | A1 | dbAssert | DB | coaching status=assigned |
| TC-A1.3 | A1 | invariant | UI | mentor 徽标 +1 |
| TC-A1.4 | A1 | invariant | UI | admin 待分配 -1 |
| TC-A1.5 | A1 | invariant | UI | LM 待分配 -1 |
| TC-A1.6 | A1 | crossEnd | Student | 辅导导师 daoshi58 |
| TC-A1.7 | A1 | crossEnd | LeadMentor | 待分配 1 |
| TC-A1.8 | A1 | crossEnd | Mentor | 总览 6 + Morgan Stanley |
| TC-A1.9 | A1 | crossEnd | Assistant | daoshi58 显示 |
| TC-A1.10 | A1 | crossEnd | Admin | 待分配 20 |
| TC-A3.1 | A3 | API response | Mentor | code=200 + recordId |
| TC-A3.2 | A3 | dbAssert | DB | record pending/job_coaching |
| TC-A3.3 | A3 | invariant | DB | 课消数 +1 |
| TC-A3.4 | A3 | invariant | DB | 待审核 +1 |
| TC-A3.5 | A3 | crossEnd | Mentor | 待审核可见 |
| TC-A3.6 | A3 | crossEnd | Admin | 搜 hw01 待审核 |
| TC-A4.1 | A4 | API response | Admin | code=200 |
| TC-A4.2 | A4 | dbAssert | DB | status=approved |
| TC-A4.3 | A4 | invariant | DB | 待审核 -1 |
| TC-A4.4 | A4 | crossEnd | Mentor | 已上报课消 1 |
| TC-A5.1 | A5 | dbAssert | DB | record pending |
| TC-A5.2 | A5 | invariant | DB | 课消数 +1 |
| TC-A6.1 | A6 | dbAssert | DB | status=rejected + remark |
| TC-A7.1 | A7 | API response | Mentor | code=200 + recordId |
| TC-A7.2 | A7 | dbAssert | DB | status=pending |
| TC-A7.3 | A7 | invariant | DB | 课消数 +1 |
| TC-A7.4 | A7 | FIX-3 regression | API | 无 JSON parse error |
| TC-A7.5 | A7 | FIX-3 regression | API | 无类型不一致 |
| TC-A7.6 | A7 | uiAssert | Mentor | 重提 modal 是 shared |
| TC-B0.1 | B0 | dbAssert | DB | mock_practice scheduled |
| TC-B0.2 | B0 | crossEnd | Student | gate B-Flow + daoshi58 |
| TC-B0.3 | B0 | crossEnd | LeadMentor | hw01 + 模拟面试 |
| TC-B0.4 | B0 | crossEnd | Mentor (FIX-1) | 上报课消 + 无确认按钮 |
| TC-B0.5 | B0 | crossEnd | Assistant | hw01 可见 |
| TC-B0.6 | B0 | crossEnd | Admin | 全部记录 tab hw01 |
| TC-B1.1 | B1 | fix2Assert | Student | 预约时间真实值 |
| TC-B2.1 | B2 | fix1Assert | Mentor | 列表 + 无确认 + 无 stats card |
| TC-B3.1 | B3 | dbAssert | DB | mock record pending |
| TC-B4.1 | B4 | dbAssert | DB | mock record approved |
| TC-B5.1 | B5 | step submit | Mentor | B5.1 pending |
| TC-B5.2 | B5 | step reject | Admin | B5.1 → rejected |
| TC-B5.3 | B5 | step resubmit | Mentor | B5.3 code=200 |
| TC-B5.4 | B5 | FIX-3 regression | API | 无 JSON parse error |
| TC-B5.5 | B5 | finalDbAssert | DB | 3 行终态 pending/rejected/approved |
| TC-NA1.1 | NA1 | API response | API | code=400 + msg |
| TC-NA1.2 | NA1 | dbAssert | DB | coaching 未变 |
| TC-NA2.1 | NA2 | API response | API | code=400 + 员工主数据 |
| TC-NA2.2 | NA2 | dbAssert | DB | coaching 未变 |
| TC-NA3.1 | NA3 | API response | API | code=500 + 学员不存在 |
| TC-NA3.2 | NA3 | dbAssert | DB | 0 行新增 |
| TC-NA5.1 | NA5 | API response | API | code=500 + 课时记录不存在 |

**共 57 子用例**：6+10+6+4+2+1+6+6+1+1+1+1+5+2+2+2+1 = 57 ✓

---

## 附录 B：API curl 模板

```bash
# 拿 token
curl -X POST http://127.0.0.1:28080/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'

# 后续请求：
# Authorization: Bearer <token>
```

---

## 附录 C：两批工作 → 回归用例溯源（人工校验用）

> 本节供 QA 校验「两批改造」每项回归点都被用例覆盖到。
> 跑测时按 ID 勾选完，即可证明该批工作的所有改动有用例兜底。

### 第 1 批：5 个 CASE 修复

| 批次 ID | 修复内容 | 验证用例 ID | 期望结果（核心） |
|---|---|---|---|
| **CASE-1** | LM assign-mentor 后端接 staff_id（前端 frontend 也传 staffId） | TC-A1.1, TC-A1.2, TC-NA2.1 | 传 staffId=98187 → 200; 传 unknown staffId → 400「员工主数据不存在」 |
| **CASE-2** | Admin `/career/mock-practice` 需切「全部记录」tab 才能看到已 scheduled 行 | TC-B0.6 | 切「全部记录」tab → hw01 + 「已安排」可见 |
| **CASE-3** | POST `/mentor/class-records` 后端返 recordId（之前 `toAjax(int)` 丢失） | TC-A3.1, TC-A7.1, TC-B5.1, TC-B5.3 | response 含 `recordId` 字段（非 NULL） |
| **CASE-4** | spec runner 处理 ui action + fix*Assert / uiAssert（之前 false-pass） | TC-A7.6, TC-B1.1, TC-B2.1 | A7 modal 标题=「上报课程记录」；B1 预约时间真实值；B2 列表无确认按钮 |
| **CASE-5** | Sidebar badge「标签 + 数字」拆 token 验证 | TC-A0.3, TC-A0.4, TC-A0.6, TC-A1.7, TC-A1.8, TC-A1.10 | 「待分配导师」+「2」、「学员求职总览」+「5」分别可见 |

### 第 2 批：Layer 3 invariants 真 eval + 负向路径 + 门禁卡死

| 批次 ID | 改造内容 | 验证用例 ID | 期望结果（核心） |
|---|---|---|---|
| **LAYER3-A1** | A1 不变量真验（3 条）：UI 实时取 mentor/admin/LM 徽标数 | TC-A1.3, TC-A1.4, TC-A1.5 | post=pre+1 (mentor) / pre-1 (admin) / pre-1 (LM) |
| **LAYER3-A3** | A3 不变量真验（2 条）：DB 实时 count | TC-A3.3, TC-A3.4 | 课消数+1，待审核数+1 |
| **LAYER3-A4** | A4 不变量真验（1 条） | TC-A4.3 | 待审核数-1 |
| **LAYER3-A5** | A5 不变量真验（1 条） | TC-A5.2 | 课消数+1 |
| **LAYER3-A7** | A7 不变量真验（1 条） | TC-A7.3 | 课消数+1 |
| **NEG-NA1** | LM 提交空 mentorIds 应 400 | TC-NA1.1, TC-NA1.2 | code=400「请至少选择」，DB 未变 |
| **NEG-NA2** | LM 提交未知 staffId 应 400 | TC-NA2.1, TC-NA2.2 | code=400「员工主数据不存在」，DB 未变 |
| **NEG-NA3** | Mentor 提交未知 studentId 应 500 | TC-NA3.1, TC-NA3.2 | code=500「学员不存在」，DB 0 新增 |
| **NEG-NA5** | Admin 审批未知 recordId 应 500 | TC-NA5.1 | code=500「课时记录不存在」 |
| **STRICT-A7** | fix*Assert / uiAssert 失败硬 RED（不再 evidence-only false-pass） | TC-A7.4, TC-A7.5, TC-A7.6 | 不出现 JSON parse error / 类型不一致 / 旧 modal selector |
| **STRICT-B5** | FIX-3 regression strict | TC-B5.4 | B5.3 response 不含 JSON parse error |
| **FIX3-AjaxResult** | Backend AjaxResult 包装错误时（HTTP 200 + body code != 200）spec 真验 body.code | TC-NA1.1, TC-NA2.1, TC-NA3.1, TC-NA5.1 | code 字段被 spec 取出且比对 |

### 跨批次工作合计

- **第 1 批**: 5 CASE → 覆盖 14 个子用例编号（去重后）
- **第 2 批**: 12 个改造点 → 覆盖 22 个子用例编号
- **两批合计**：36 个子用例直接覆盖回归点；其余 21 个子用例（dbAssert / 跨端可见性等）是基础流程验证，不依赖 fix 但门禁必须过

### 校验策略

QA 跑完所有 57 子用例后：
1. 看附录 C 表，每个「批次 ID」对应的「验证用例 ID」是否**全部勾选通过**
2. 任一批次 ID 下有任何用例未通过 → 该 fix 可能有 regression，需排查
3. CASE-1 / NEG-NA2 同时验证 staff_id contract（正反两侧），互为兜底
