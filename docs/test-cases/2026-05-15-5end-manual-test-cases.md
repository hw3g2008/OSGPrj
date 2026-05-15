# 5 端串联手测用例 — 求职辅导 + 模拟应聘双主线

- **日期**：2026-05-15
- **范围**：admin / lead-mentor / mentor / assistant / student 五端
- **基线 commit**：`50186f61` (含 FIX-1/2/3 + 全部 deps)
- **测试主体**：手动 CDP / 浏览器实测

---

## 0. 测试 fixture（必须先确认在位）

### 0.1 账号（password 全部 `admin123`，pwd_update_date 已写）

| 角色 | 账号 | user_id | DB key |
|---|---|---|---|
| Student | `hwyellow222@126.com` | 12878 | hw01 / student_id=25112 |
| Lead-mentor | `525086@qq.com` | 12858 | yanyabanzhuren |
| Mentor | `daoshi58@qq.com` | 12866 | daoshi58 |
| Assistant | `zhujiao58@qq.com` | 12867 | zhujiao58 |
| Admin | `admin` | 1 | super_admin |

### 0.2 服务端口

| 服务 | URL | 验证 |
|---|---|---|
| backend | `http://127.0.0.1:28080/actuator/health` | `{"status":"UP"}` |
| student | `http://127.0.0.1:3001` | 200 |
| mentor | `http://127.0.0.1:3002` | 200 |
| lead-mentor | `http://127.0.0.1:3003` | 200 |
| assistant | `http://127.0.0.1:3004` | 200 |
| admin | `http://127.0.0.1:3005` | 200 |

### 0.3 主线数据（DB 现状，跑测前用 SQL 核对）

```sql
-- 主线 1：求职辅导
SELECT application_id, position_id, current_stage, lead_mentor_id, submitted_at
  FROM osg_job_application WHERE student_id=25112 ORDER BY application_id DESC;
-- 期望：3 行（300 first / 301 second / 302 hirevue），lead_mentor_id=12858

SELECT coaching_id, application_id, interview_stage, mentor_ids, status
  FROM osg_coaching WHERE student_id=25112 ORDER BY coaching_id DESC;
-- 期望：2 行
--   5221 / 301 / second / mentor_ids=NULL / pending
--   5220 / 300 / first  / mentor_ids='13067,12866' / assigned

-- hw01 的关系链
SELECT student_id, lead_mentor_id, lead_mentor_ids, assistant_ids
  FROM osg_student WHERE student_id=25112;
-- 期望：lead_mentor_id=12858, lead_mentor_ids='12858', assistant_ids='12813,12867'
```

---

## 主线 A — 求职辅导申请（学员求职总览）

> 数据流：student 提交辅导申请 → backend 写 osg_job_application / osg_coaching → LM 看到分配 → mentor 看到课程 → assistant 协助 → admin 全量监控。

### TC-A1 学生端「我的求职」列表 + 详情

**前置**：登录 `hwyellow222@126.com / admin123` → 学生端 `http://127.0.0.1:3001`

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 点左导航「我的求职 My Applications」 | URL 跳 `/job-tracking`，标题"我的求职" |
| 2 | 顶部 Tab 默认"全部 3" | Tab 显示 全部(3) / 已投递(0) / 面试中(3) / 已结束(0) |
| 3 | 列表渲染 3 行 | 行 1: Summer Analyst - IB / Goldman Sachs<br>行 2: Spring Insight / Morgan Stanley<br>行 3: Off-cycle Analyst / JPMorgan |
| 4 | 操作列每行都有「申请辅导」 / 状态下拉 | 都可点击 |
| 5 | 点行 1 左侧 `+` 展开（如有） | 显示 application 300 详情 — first round / 5/14 19:23 / coaching 5220 / mentor e2e_mt_mp2mda0y54s |

**实测结果**：☐ Pass / ☐ Fail （fail 时记现象）

---

### TC-A2 班主任端「学员求职总览-我管理学员」

**前置**：登录 `525086@qq.com / admin123` → LM 端 `http://127.0.0.1:3003`

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「学员求职总览 Job Overview」 | URL 跳 `/career/job-overview` |
| 2 | 顶部「学员面试安排」日历显示 5 月 | 5/13、5/16 两个红色标签含 "hw01" |
| 3 | 顶部 Tab 默认「我管理的学员 4」 | 3 个 Tab：我管理(4) / 我辅导(1) / 待分配(2) |
| 4 | 列表渲染 4 行 | hw01 三条（Goldman/Morgan/JPMorgan）+ yanyan 一条 |
| 5 | hw01 Goldman 行 | 面试阶段 first / 时间 2026-05-14 19:23 / 导师 e2e_mt_mp2mda0y54s / 最近评分 8/10 |
| 6 | hw01 Morgan 行 | 面试阶段 second / 时间 2026-05-16 10:00 / 导师 「待分配」 |
| 7 | 点 hw01 Goldman 行「查看详情」 | 弹出详情，显示 coaching 5220 已上报课消 1 条 |
| 8 | Tab 切「待分配导师 2」 | 应含 hw01 Morgan + 另一条 second/pending |

**实测结果**：☐ Pass / ☐ Fail

---

### TC-A3 助教端「学员求职总览」

**前置**：登录 `zhujiao58@qq.com / admin123` → 助教端 `http://127.0.0.1:3004`

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「学员求职总览」 | URL 跳 `/career/job-overview` |
| 2 | 显示 "我管理的学员 Managed Students 7" | 仅一个 Tab，共 7 条 |
| 3 | 列表含 hw01 三条 + 其他 4 条 | hw01 / Goldman 行 mentor=e2e_mt_mp2mda0y54s + 评分 8/10 |
| 4 | 点 hw01 Goldman 行「查看详情」| 跟进详情弹窗（OverlaySurfaceModal）— Bug-Audit B 已修，标题 "跟进详情 hw01 · ID: 25112" |
| 5 | 关闭弹窗 — 点 × | 弹窗关闭，不留遮罩 |

**实测结果**：☐ Pass / ☐ Fail

---

### TC-A4 导师端「学员求职总览」

**前置**：登录 `daoshi58@qq.com / admin123` → 导师端 `http://127.0.0.1:3002`

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 顶部左导航「学员求职总览 Job Overview」徽标 5 | URL 跳 `/job-overview` |
| 2 | 列表显示 5 行 | hw01 Goldman 第一条 + 4 个其他学员 |
| 3 | hw01 Goldman 行 | first / 5/14 19:23 / 已上报课消 1 / 操作=「上报课消」按钮 |
| 4 | 点「上报课消」 | shared `ClassReportFlowModal` 弹出 — 学员 prefilled hw01 / 关联类型 求职辅导申请 prefilled |
| 5 | 关闭弹窗 → 不提交 | modal 干净关闭 |

**实测结果**：☐ Pass / ☐ Fail

---

### TC-A5 后台「学员求职总览」

**前置**：登录 `admin / admin123` → admin 端 `http://127.0.0.1:3005`（首次过 captcha；admin 密码已重置为 admin123，不再弹 "请修改默认密码"）

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「求职中心 CAREER → 学员求职总览」 | URL 跳 `/career/job-overview` |
| 2 | 顶部 KPI | 52 已投递 / 2 面试中 / 0 offer / 求职转化漏斗 |
| 3 | Tab 默认「待分配导师 21」 | 共 21 条 |
| 4 | 第一条 | hw01 / Morgan Stanley / Spring Insight / second / 待安排 / 1 位需求 / 暂无意向导师 / 3 天前 → **coaching 5221** |
| 5 | 点 hw01 行「分配导师」 | 分配 mentor 弹窗（多选）打开，可搜索 mentor，确认按钮 disabled until 选中 |
| 6 | 取消弹窗 | 不写库，回列表 |
| 7 | Tab 切「全部学员 52」 | 应含 hw01 全部 3 条 application 300/301/302 |

**实测结果**：☐ Pass / ☐ Fail

---

## 主线 B — 模拟应聘 + 课消上报

> 数据流：student 申请 mock_practice → LM 分配 mentor + 排课 → mentor 看到列表 + 上报课消 → student 看预约时间 + 课消反馈。

### TC-B1 后台 / 班主任为 hw01 创建一条模拟面试（前置数据准备）

**前置**：登录 admin **或** LM。这条用于产生测试数据，跑完后续 B2~B5。

> 如不想产生新 fixture，可跳过直接用现有 daoshi58 已分配的 3 条（student=38849 xuesheng58, practice 5158/5159/5160）走 B4/B5 mentor 视角；但 student 视角看不到 hw01。  
> 推荐：DB 直插一条给 hw01。SQL：
> ```sql
> INSERT INTO osg_mock_practice
>   (student_id, student_name, practice_type, request_content, status,
>    mentor_ids, mentor_names, scheduled_at, submitted_at, del_flag)
> VALUES
>   (25112, 'hw01', 'mock_interview', '手测 mock interview', 'scheduled',
>    '12866', 'daoshi58', '2026-05-21 10:00:00', NOW(), '0');
> ```

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 跑上面 SQL | 新增 practice_id 5177（或类似），status=scheduled，scheduled_at 落库 |
| 2 | DB SELECT 验证 | `SELECT practice_id, student_id, mentor_ids, scheduled_at FROM osg_mock_practice WHERE student_id=25112 ORDER BY practice_id DESC LIMIT 1` 返回新行 |

**实测结果**：☐ Pass / ☐ Fail

---

### TC-B2 学生端「模拟应聘」详情显示预约时间（**FIX-2 验证点**）

**前置**：B1 完成。登录 hw01 → 学生端

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「模拟应聘 Mock Practice」 | URL 跳 `/mock-practice` |
| 2 | 顶部三个卡片「模拟面试 / 人际关系测试 / 期中考试」可见 | 「我的模拟应聘记录」列表渲染 |
| 3 | 列表含 B1 插入的「手测 mock interview」行 | 类型=模拟面试 / 申请时间最新 / 导师=daoshi58 / 已上课时=- / 操作=查看申请 |
| 4 | 点「查看申请」 | 详情弹窗，**「预约时间」显示 `2026-05-21 10:00`**（非「待安排」）— FIX-2 关键断言 |
| 5 | 关闭弹窗 | modal 干净关闭 |

**实测结果**：☐ Pass / ☐ Fail

**🔴 FIX-2 验收**：步骤 4 必须显示真实预约时间。修复前永远显示「待安排」。

---

### TC-B3 导师端「模拟应聘管理」列表（**FIX-1 验证点**）

**前置**：登录 daoshi58 → 导师端

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「模拟应聘管理 Mock Practice」 | URL 跳 `/mock-practice` |
| 2 | 顶部筛选区：公司 / 面试阶段 / 面试时间 / 是否上报课消 | 显示 4 个筛选（无统计卡片） |
| 3 | 列表至少 4 行 | xuesheng58 三条（5158/5159/5160）+ B1 新加 hw01 一条 |
| 4 | hw01 行 | 类型=模拟面试 / 分配时间=B1 时间戳 / 已上报课消数=0 / 操作列**只有「上报课消」按钮**（无「确认」按钮）— FIX-1 关键断言 |
| 5 | 点 hw01 行「上报课消」 | `ClassReportFlowModal` 弹出 — 学员=hw01 prefilled / 关联类型=模拟面试 prefilled |
| 6 | 关闭弹窗 → 不提交 | 弹窗干净关闭 |

**实测结果**：☐ Pass / ☐ Fail

**🔴 FIX-1 验收**：
- 步骤 3：daoshi58 必须看到 mentor_ids 含 12866 的全部记录（修复前 service mapper 错调 + PageHelper 切割 → 显示 0 条）
- 步骤 4：操作列**无确认按钮**（修复前有 `<a-button v-if="status==='new'">确认</a-button>` 但永远不显示）

---

### TC-B4 导师端「课程记录」上报课消完整流程

**前置**：TC-B3 已确认 hw01 在列表中。登录 daoshi58 → 导师端

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「课程记录 Class Records」→ Tab「我管理的学员」 | 显示历史课消 8 条左右 |
| 2 | 右上方「+ 上报课程记录」按钮点击 | `ClassReportFlowModal` 打开，单屏滚动版（C3 改造），section 卡片化（P2-5 视觉打磨） |
| 3 | 学员下拉打开 → 应含 hw01 (25112) + xuesheng58 (38849) 等 | reportable-students API 正确聚合 coaching/mock_practice mentor_ids |
| 4 | 选学员 hw01 / 上课日期 today / 课时 1 / 学员状态 正常上课 / 课程类型 模拟面试 / 关联申请 选 B1 插入的 practice / 评分 8 / 提交 | 提交成功 toast "上报成功" |
| 5 | DB 检查 | `SELECT * FROM osg_class_record WHERE student_id=25112 ORDER BY record_id DESC LIMIT 1` 返回新行 reference_type=mock_interview reference_id=practice_id |
| 6 | 列表刷新 | 新课消行出现 status=pending（待审核）|

**实测结果**：☐ Pass / ☐ Fail

---

### TC-B5 admin 端审核课消 + student 端看反馈

**前置**：TC-B4 完成。

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | admin 登录 → 课程记录 → 待审核 Tab | 新课消行可见 |
| 2 | 点新课消「通过」 | status 改为 approved，toast 提示成功 |
| 3 | 切 hw01 学生端 → 课程记录 Class Records | 新课消行 status=approved 出现，含反馈摘要 |
| 4 | 学生端「模拟应聘」详情弹窗 | 已上课时 = B1 课时 / 已上报课消数=1 |

**实测结果**：☐ Pass / ☐ Fail

---

### TC-B6 驳回后重提交（**FIX-3 验证点**）

**前置**：admin 端把 TC-B4 那条课消「驳回」，填驳回原因 "时长信息错误"。然后 daoshi58 回到 mentor 端。

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | mentor 课程记录 Tab「已驳回」 | 出现刚才被驳回的课消行，操作=「查看原因」 |
| 2 | 点「查看原因」 | 驳回原因 modal 弹出，显示 "时长信息错误"，底部「关闭 / 重新提交」两按钮 |
| 3 | 点「重新提交」 | **shared `ClassReportFlowModal` 弹出**（不是旧的自定义 inline confirm modal），所有字段 prefilled（学员/关联类型/关联申请 = 原驳回记录字段）— FIX-3 关键断言 |
| 4 | 修改时长 → 提交 | 提交成功 toast，无 400 错误（旧 path 会因 courseType 映射 + 缺 referenceType/Id 触发 validator 400） |
| 5 | DB 验证 | 新课消行写入 status=pending |

**实测结果**：☐ Pass / ☐ Fail

**🔴 FIX-3 验收**：
- 步骤 3：点击「重新提交」打开 **shared ClassReportFlowModal**（修复前是自定义 inline modal，HTML 含 `#confirm-class-type` `#confirm-feedback` 等）
- 步骤 4：提交走 modal 内部 validator（修复前裸 POST `/mentor/class-records` 缺 referenceType 触发 400）

---

## 主线 B 数据清理（手测完成后）

```sql
-- 删 B1 插入的测试 fixture（如不再需要）
DELETE FROM osg_mock_practice WHERE request_content = '手测 mock interview';

-- 删 B4 + B6 产生的 class_record（如不再需要）
DELETE FROM osg_class_record WHERE student_id = 25112 AND remark LIKE '%手测%';
```

---

## 附录 — 已修复 Bug 速查

| Bug | FIX | TC | 关键断言 |
|---|---|---|---|
| 1 mentor 模拟应聘列表空 | FIX-1 | TC-B3 步骤 3 | daoshi58 看到 mentor_ids 含他的全部记录 |
| 2 排课后学生端无更新 | FIX-2 | TC-B2 步骤 4 | 预约时间显示真实值 |
| 3 mentor 无法 log 课时 | FIX-3 | TC-B4 + TC-B6 | reject 重提交走 shared ClassReportFlowModal |
| 4 未加学生 list 导师无法 log | placeholder | TC-B4 步骤 3 | 学员下拉聚合 coaching/mock_practice mentor_ids |
| A 密码弹窗 | FIX-1 (auth) | 登录后无弹窗（除 admin123 → Osg@2026 场景） | admin 端密码已重置 admin123，无弹窗 |
| Audit B 4 modal 迁移 | refactor commit `008c43ed` | TC-A3 步骤 4 | assistant 跟进详情用 OverlaySurfaceModal |
| C8 视觉打磨 | commit `7cfef7c7` | TC-B4 步骤 2 | section 卡片化 + 立体阴影 |

---

## 修改历史

| 日期 | 修改 |
|---|---|
| 2026-05-15 | 首版，11 个 TC（A1~A5 + B1~B6）覆盖 5 端 + 双主线 |
