# 5 端串联手测用例 v3 — 按业务状态流转设计

- **日期**：2026-05-15
- **基线 commit**：`3acf955c`
- **设计理念**：**每一次状态变化（state transition）都要在所有相关端验证一遍**。1 端 OK 不代表系统 OK，必须 4-5 端都通才算通。
- **估时**：完整跑约 90-120 分钟
- **结构**：2 条主线 (Flow A 求职辅导 / Flow B 模拟应聘)，每条主线划分 6-8 个 Stage（状态节点），每个 Stage 含 1 个驱动 Action + 多端验证清单

---

## §0 跑测前必读

### 0.1 v3 vs v2 区别

v2 按"端"组织（每端一个 TC，验该端能看到啥）—— 漏掉**状态流转的跨端一致性**。
v3 按"状态机"组织（每个 Stage = 一个动作 + 状态变化）—— 一次 Action 必须在**所有相关端**都验过才算通过。

例如：LM 给 hw01 分配 daoshi58 这一动作，会同时影响：
- 学生端「我的求职」该行的 mentor 字段
- mentor 端「学员求职总览」新增该学生
- assistant 端「学员求职总览」mentor 名更新
- admin 端「全部学员」可见 mentor 名 + 「待分配」不再有该条
- LM 端「我管理学员」mentor 字段更新 + 「待分配」不再有该条

必须 5 端都验，缺一端不算 Pass。

### 0.2 失败处理流程

任一 Stage 失败：
1. 截屏 + 抓 Network response（F12 → Network → 失败请求 → Response）
2. 在 Stage 表里写哪端、哪步、什么现象
3. **不要往下跑** — 状态机断了下游必然连锁失败
4. 把 fail 现象贴给我或 review

### 0.3 时间预算

| Section | 估时 |
|---|---|
| §1 环境准备 | 15 min（一次性，跑过可跳） |
| Flow A（7 Stage） | 50 min |
| Flow B（6 Stage） | 40 min |
| §5 清理 | 5 min |
| **总计** | **~110 min** |

---

## §1 环境准备（一次性）

> 已跑过 v2 的可跳到 §2。

### 1.1 backend health

```powershell
try { (Invoke-WebRequest -Uri "http://127.0.0.1:28080/actuator/health" -UseBasicParsing -TimeoutSec 5).Content }
catch { Write-Output "backend DOWN" }
```

未就绪则 git-bash 跑 `bash bin/run-backend-dev.sh deploy/.env.dev`，等 60-120s 看到 `Started RuoYiApplication`。

### 1.2 5 前端

```powershell
$ports = @{ student = 3001; mentor = 3002; 'lead-mentor' = 3003; assistant = 3004; admin = 3005 }
foreach ($app in $ports.Keys) {
  $port = $ports[$app]
  $c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  if ($c) { "OK   $app on $port" } else { "DOWN $app on $port" }
}
```

未就绪逐个启（**串行，并发会触发 npm cache 冲突**）：

```powershell
$env:NPM_CONFIG_CACHE = "$env:TEMP\npm-cache-student"
cmd /c "cd /d H:\workspace\java\OSGPrj\osg-frontend\packages\student && start /b pnpm exec vite --port 3001 > H:\workspace\java\OSGPrj\logs\student-dev.log 2>&1"
# 其余 mentor/lead-mentor/assistant/admin 同模式，npm cache 各自独立目录
```

### 1.3 Chrome 调试浏览器

```powershell
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  -ArgumentList '--remote-debugging-port=9222', "--user-data-dir=$env:TEMP\chrome-cdp-profile"
```

### 1.4 DB fixture 校验 + 自动补齐

```powershell
$env:MYSQL_PWD='app123456'
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

# 一次性校验
& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' --default-character-set=utf8mb4 -e @"
SELECT 'A: 主线 A 当前状态' AS section;
SELECT
  (SELECT COUNT(*) FROM osg_job_application WHERE student_id=25112) AS hw01_applications,
  (SELECT COUNT(*) FROM osg_coaching WHERE student_id=25112) AS hw01_coachings,
  (SELECT mentor_ids FROM osg_coaching WHERE coaching_id=5220) AS coaching_5220_mentors,
  (SELECT status FROM osg_coaching WHERE coaching_id=5221) AS coaching_5221_status;

SELECT 'B: 密码状态' AS section;
SELECT user_name,
       password = (SELECT password FROM sys_user WHERE user_name='hwyellow222@126.com') AS pwd_is_admin123
  FROM sys_user
  WHERE user_name IN ('admin', 'hwyellow222@126.com', '525086@qq.com', 'daoshi58@qq.com', 'zhujiao58@qq.com');
"@
```

**期望**：
- A 部分：hw01_applications=3, hw01_coachings=2, coaching_5220_mentors=`13067,12866`, coaching_5221_status=`pending`
- B 部分：5 账号 pwd_is_admin123 全部 = 1

**不符合则跑补齐 SQL**：

```sql
-- 修 coaching 5220 mentor_ids 含 daoshi58 (12866)
UPDATE osg_coaching SET mentor_ids='13067,12866', update_time=NOW(), update_by='手测_fixture_5220'
  WHERE coaching_id=5220 AND NOT FIND_IN_SET('12866', mentor_ids);

-- 修 coaching 5221 回到 pending（如 v2 测试中分配过）
UPDATE osg_coaching SET mentor_ids=NULL, status='pending', update_time=NOW(), update_by='手测_fixture_5221'
  WHERE coaching_id=5221;

-- 重置 5 账号密码到 admin123（复制 hw01 hash）
UPDATE sys_user SET
  password = (SELECT password FROM (SELECT password FROM sys_user WHERE user_name='hwyellow222@126.com') t),
  pwd_update_date = NOW(),
  update_by = '手测_fixture_admin123'
WHERE user_name IN ('admin', '525086@qq.com', 'daoshi58@qq.com', 'zhujiao58@qq.com');
```

---

## §2 账号矩阵 + 切换

### 2.1 5 账号

| 角色 | 端口 | 账号 | 密码 | user_id | 实体 |
|---|---|---|---|---|---|
| **Student** | 3001 | `hwyellow222@126.com` | `admin123` | 12878 | hw01 / student_id=25112 |
| **Mentor** | 3002 | `daoshi58@qq.com` | `admin123` | 12866 | daoshi58 / staff_id=98187 |
| **Lead-mentor** | 3003 | `525086@qq.com` | `admin123` | 12858 | yanyabanzhuren |
| **Assistant** | 3004 | `zhujiao58@qq.com` | `admin123` | 12867 | zhujiao58 |
| **Admin** | 3005 | `admin` | `admin123` | 1 | 超级管理员 |

### 2.2 推荐：5 端 5 tab 同时开

Chrome 开 5 个 tab，分别访问 5 端 URL，分别登录。每端 localStorage 独立。**跨端验证时直接切 tab，无需重登**。

### 2.3 Admin captcha

Admin 登录页有图形验证码。**只能人眼读图**。识别不清可临时禁：

```sql
UPDATE sys_config SET config_value='false'
  WHERE config_key='sys.account.captchaEnabled';
-- 测完恢复 'true'
```

### 2.4 密码弹窗规则

Fix 后规则：**当前 password hash matches "Osg@2026"** → 弹「请修改默认密码」。
5 账号已重置 admin123，理应不弹。如果弹了说明密码被改回 Osg@2026 → 回 §1.4 重置。

---

## §3 Flow A — 求职辅导申请全生命周期

**实体追踪**：
- application 300（hw01 / Goldman Sachs）→ coaching 5220（first round, 已分配 mentor）
- application 301（hw01 / Morgan Stanley）→ coaching 5221（**second round, 待分配 — Flow A 主测对象**）

**核心思想**：本次手测把 **coaching 5221 从 pending → assigned → 课消上报 → 审核 → 驳回 → 重提交** 整个状态机跑完，每个 stage 验 5 端。

---

### Stage A0 — 初始状态快照（baseline 验证）

**驱动 Action**：无（仅快照）  
**估时**：5 min

#### A0.1 DB 状态快照

```powershell
& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' --default-character-set=utf8mb4 -e @"
SELECT 'A0 coaching 5221 baseline' AS section;
SELECT coaching_id, application_id, interview_stage, mentor_ids, status, requested_mentor_count, interview_time
  FROM osg_coaching WHERE coaching_id=5221;
SELECT 'A0 application 301 baseline' AS section;
SELECT application_id, lead_mentor_id, current_stage
  FROM osg_job_application WHERE application_id=301;
"@
```

**预期**：
- coaching 5221: mentor_ids=NULL, status=pending, requested_mentor_count=1, interview_time=2026-05-16 10:00:00
- application 301: lead_mentor_id=12858, current_stage=second

#### A0.2 跨端 baseline 验证

| 端 | URL | 操作 | 预期 |
|---|---|---|---|
| **Student** | http://127.0.0.1:3001/job-tracking 登 hw01 | 我的求职列表行 Spring Insight / Morgan Stanley | 状态显示「面试中」/「待分配导师」字样 |
| **LM** | http://127.0.0.1:3003/career/job-overview 登 525086@qq.com | 「待分配导师」Tab | 应含 hw01 / Morgan Stanley 行 |
| **Mentor** | http://127.0.0.1:3002/job-overview 登 daoshi58 | 学员求职总览 | **不应**含 hw01 / Morgan Stanley 行（mentor 没被分配） |
| **Assistant** | http://127.0.0.1:3004/career/job-overview 登 zhujiao58 | 学员求职总览-我管理学员 | 应含 hw01 / Morgan Stanley 行，导师列显示 "-" 或「待分配」|
| **Admin** | http://127.0.0.1:3005/career/job-overview 登 admin | 「待分配导师」Tab | 应含 hw01 / Morgan Stanley 第一行（按申请时间排序） |

#### A0 实测勾选

- ☐ DB 快照符合预期
- ☐ Student 端 baseline OK
- ☐ LM 端 baseline OK
- ☐ Mentor 端 baseline OK（验证 mentor 不该看见）
- ☐ Assistant 端 baseline OK
- ☐ Admin 端 baseline OK

**5 端全过才进 A1**。如有端不符（如 mentor 已能看到 5221），说明 fixture 被污染，回 §1.4 重置 coaching 5221。

---

### Stage A1 — [LM] 给 coaching 5221 分配 mentor=daoshi58

**驱动端**：Lead-mentor / `525086@qq.com` / `admin123`  
**估时**：5 min  
**状态变化**：
- DB: `osg_coaching.mentor_ids` NULL → `12866` (daoshi58 user_id)
- DB: `osg_coaching.status` pending → assigned
- 业务态：待分配导师 → 已分配

#### A1.1 Action — LM 端分配

| # | 操作 | 预期 |
|---|---|---|
| 1 | LM tab 切到 `/career/job-overview` | URL 仍是该路径 |
| 2 | Tab 切「待分配导师 2」 | 列表含 hw01 / Morgan / second 行 |
| 3 | 点该行「分配导师」 | 分配 mentor 弹窗打开（多选下拉 + 可搜索）|
| 4 | 下拉搜「daoshi58」→ 勾选 | 已选 1 位，确认按钮亮起 |
| 5 | 点「确认分配」 | toast `分配成功`，弹窗关闭 |
| 6 | 切「我管理的学员」Tab | hw01 / Morgan 行出现，导师列显示「daoshi58」|

#### A1.2 DB 验证

```powershell
& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' -e "SELECT coaching_id, mentor_ids, status FROM osg_coaching WHERE coaching_id=5221;"
```
**预期**：mentor_ids=`12866`, status=`assigned`

#### A1.3 跨端验证（关键 — 5 端必须全过）

| 端 | 切 tab + 刷新 | 验证点 |
|---|---|---|
| **Student** | `/job-tracking` 列表 Spring Insight / Morgan 行 | 导师字段从「-」变为「daoshi58」；状态显示「已分配导师」/「面试中」|
| **LM** | `/career/job-overview` 我管理 Tab | hw01 / Morgan 行导师 = daoshi58；「待分配」Tab 不再有该条 |
| **Mentor** (daoshi58) | `/job-overview` | **新增** hw01 / Morgan / second 行；导师徽标数 +1 |
| **Assistant** (zhujiao58) | `/career/job-overview` | hw01 / Morgan 行导师列从「-」变为「daoshi58」|
| **Admin** | `/career/job-overview` 待分配 Tab | hw01 / Morgan 不再出现；切「全部学员」Tab 应能找到，导师=daoshi58 |

#### A1 实测勾选

- ☐ LM 端 Action 成功
- ☐ DB 状态变化符合
- ☐ Student 端跨端验证 Pass
- ☐ LM 端跨端验证 Pass（待分配 Tab 不再含该条）
- ☐ Mentor 端跨端验证 Pass（新增可见）
- ☐ Assistant 端跨端验证 Pass
- ☐ Admin 端跨端验证 Pass

---

### Stage A2 — [Mentor] 安排面试时间（如需调整 interview_time）

**驱动端**：Mentor / `daoshi58@qq.com`  
**估时**：3 min  
**状态变化**：DB `osg_coaching.interview_time` 已有值（baseline 2026-05-16 10:00），mentor 端可能可调整。**如需求文档未明确 mentor 端调整入口，此 Stage 跳过**，直接进 A3。

#### A2 实测勾选

- ☐ 跳过（需求未提供调整入口）/  ☐ 调整成功跨端验证

---

### Stage A3 — [Mentor] 上报课消（coaching 5221 - first 课时）

**驱动端**：Mentor / `daoshi58@qq.com`  
**估时**：8 min  
**状态变化**：
- DB: 新增 `osg_class_record` 行 (student_id=25112, mentor_id=12866, reference_type=`job_coaching`, reference_id=5221, status=pending)
- 业务态：无课消 → 已上报课消（待审）

#### A3.1 Action — mentor 上报

| # | 操作 | 预期 |
|---|---|---|
| 1 | Mentor tab → `/courses` 课程记录 | 默认 Tab「我的申报」加载 |
| 2 | 右上「+ 上报课程记录」点击 | `ClassReportFlowModal` 打开（单屏滚动版，section 卡片化）|
| 3 | 学员下拉 → 选「hw01 (25112)」 | 学员选中，关联申请下拉加载 |
| 4 | 课程类型 = 岗位辅导 | radio 选中 |
| 5 | 关联类型 = 求职辅导申请 / 关联申请下拉 | 应出现 coaching 5221 选项（second round / Morgan Stanley / 5/16 10:00 / assigned）|
| 6 | 选 coaching 5221 | 关联申请已选 |
| 7 | 上课日期 = today / 课时 = 1 / 状态 = 正常上课 / 反馈摘要 = `手测 A3 课消反馈` / 评分 = 8 | 字段已填，「提 交」按钮亮起 |
| 8 | 点「提 交」 | toast `上报成功`，弹窗关闭 |
| 9 | 列表刷新 → 新行 status=待审核 出现 | 行可见 |
| 10 | **记下 record_id**（看行内 CR-XXX 或行末 ID） | record_id = **___________** |

#### A3.2 DB 验证

```powershell
& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' -e @"
SELECT record_id, mentor_id, student_id, reference_type, reference_id, course_type, class_date, status, feedback_summary
  FROM osg_class_record
  WHERE student_id=25112 AND mentor_id=12866 AND reference_id=5221
  ORDER BY record_id DESC LIMIT 1;
"@
```

**预期**：1 行，reference_type=`job_coaching`, reference_id=5221, status=`pending`, feedback_summary=`手测 A3 课消反馈`

#### A3.3 跨端验证

| 端 | 操作 | 预期 |
|---|---|---|
| **Student** | `/courses` 学生课程记录 | 列表新增该课消行，status=「待审核」 |
| **LM** (yanyabanzhuren) | `/teaching/class-records`（如有） | 列表可见该课消（hw01 学生） |
| **Mentor** (daoshi58) | `/courses` Tab「待审核 1」 | 徽标数 +1，列表含该行 |
| **Assistant** (zhujiao58) | `/class-records` 助教课程记录 | 「我管理的学员」Tab 应可见该课消 |
| **Admin** | `/teaching/class-records` + dashboard | dashboard 「待审课时」+1，课程记录 Tab「待审核」含该行 |

#### A3 实测勾选

- ☐ Mentor 上报 Action 成功
- ☐ DB 状态正确
- ☐ Student 端验证 Pass
- ☐ LM 端验证 Pass
- ☐ Mentor 自端「待审核」Tab Pass
- ☐ Assistant 端验证 Pass
- ☐ Admin 端 dashboard 待审 +1 Pass
- ☐ Admin 端课程记录列表 Pass

---

### Stage A4 — [Admin] 审核通过 A3 课消

**驱动端**：Admin / `admin` / `admin123`  
**估时**：5 min  
**状态变化**：
- DB: 该 `osg_class_record.status` pending → approved
- 业务态：待审核 → 已通过

#### A4.1 Action — admin 审核

| # | 操作 | 预期 |
|---|---|---|
| 1 | Admin tab → 左导航「教学中心 → 课程记录」 | URL `/teaching/class-records` |
| 2 | 顶部 Tab「待审核」 | A3 那条课消可见 |
| 3 | 点行末「审核」/「通过」 | 审核操作弹窗或下拉 |
| 4 | 选「通过」（如需备注填「手测 A4 通过」）→ 确认 | toast `审核成功`，行状态变「已通过」|

#### A4.2 DB 验证

```powershell
& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' -e "SELECT record_id, status, review_remark FROM osg_class_record WHERE record_id=__A3.1.10__;"
```
**预期**：status=`approved`

#### A4.3 跨端验证

| 端 | 操作 | 预期 |
|---|---|---|
| **Student** | `/courses` 课程记录 | 该课消行 status=「已通过」，反馈摘要可见 |
| **LM** | 课程记录页 | status=「已通过」 |
| **Mentor** | `/courses` Tab「已通过」 | A3 那条迁移到「已通过」Tab；学员求职总览-hw01 行「已上报课消数」+1 |
| **Assistant** | 课程记录页 | status=「已通过」 |
| **Admin** | dashboard | 「待审课时」-1 |

#### A4 实测勾选

- ☐ Admin Action 成功
- ☐ DB status=approved
- ☐ Student 端 status 变更 Pass
- ☐ LM 端 status 变更 Pass
- ☐ Mentor 端 Tab 迁移 + 课消数 +1 Pass
- ☐ Assistant 端 status 变更 Pass
- ☐ Admin dashboard 待审 -1 Pass

---

### Stage A5 — [Mentor] 再上报一条课消（为驳回流程铺垫）

**估时**：4 min  
按 A3 流程**再上报 1 条** coaching 5221 课消（反馈摘要写「手测 A5 课消反馈（备驳回）」），快速完成。

跨端验证：参考 A3 验 5 端。

#### A5 实测勾选

- ☐ 上报 Action 成功（新 record_id = **___________**）
- ☐ 5 端各端 pending 状态可见

---

### Stage A6 — [Admin] 驳回 A5 课消

**驱动端**：Admin  
**估时**：4 min  
**状态变化**：DB A5 record.status pending → rejected

#### A6.1 Action

| # | 操作 | 预期 |
|---|---|---|
| 1 | Admin 课程记录 Tab「待审核」 → A5 行 | 可见 |
| 2 | 点行末「审核」/「驳回」 | 驳回弹窗 |
| 3 | 驳回原因 = `时长信息错误（手测_A6）` → 确认 | toast `驳回成功` |

#### A6.2 跨端验证

| 端 | 操作 | 预期 |
|---|---|---|
| **Student** | 课程记录列表 | A5 课消 status=「已驳回」，反馈摘要含驳回原因 |
| **Mentor** | `/courses` Tab「已驳回」 | A5 课消行可见，操作=「查看原因」按钮 |
| **Admin** | dashboard 待审 | -1 |
| **LM** / **Assistant** | 课程记录页 | A5 status=「已驳回」 |

#### A6 实测勾选

- ☐ Admin 驳回 Action 成功
- ☐ Student 端 Pass
- ☐ Mentor 端「已驳回」Tab Pass
- ☐ LM/Asst 端 Pass
- ☐ Admin 端 Pass

---

### Stage A7 — [Mentor] 重提交（🔴 FIX-3 关键验证）

**驱动端**：Mentor  
**估时**：5 min  
**状态变化**：新增 `osg_class_record` 行，prefilled from A5 record，status=pending

#### A7.1 Action

| # | 操作 | 预期 |
|---|---|---|
| 1 | Mentor `/courses` Tab「已驳回」→ A5 课消行 | 操作列「查看原因」 |
| 2 | 点「查看原因」 | 驳回原因 modal 弹出，含「关闭 / 重新提交」按钮 |
| 3 | **🔴 关键**：点「重新提交」 | **shared `ClassReportFlowModal` 弹出**（标题「上报课程记录」，5 个 section 卡片）<br>**不应**出现旧 inline confirm modal（标题「确认课程并填写反馈」，含 `#confirm-class-type` 等 ID） |
| 4 | 弹窗 prefilled 字段验证 | 学员=hw01 / 关联类型=求职辅导申请 / 关联申请=coaching 5221 / 反馈/评分等保留 |
| 5 | 修改时长 1 → 1.5 / 修改反馈摘要 = `手测 A7 重提交` | 字段值更新 |
| 6 | 点「提 交」 | toast `上报成功`，**无 400 错误**（修复前裸 POST 缺 referenceType 触发 400） |

#### A7.2 DB 验证

```powershell
& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' -e @"
SELECT record_id, status, duration_hours, reference_type, reference_id, feedback_summary
  FROM osg_class_record
  WHERE student_id=25112 AND mentor_id=12866 AND feedback_summary LIKE '%A7 重提交%'
  ORDER BY record_id DESC LIMIT 1;
"@
```
**预期**：新行 status=`pending`, duration_hours=1.5, reference_type=`job_coaching`, reference_id=5221

#### A7.3 跨端验证

| 端 | 验证点 |
|---|---|
| **Student** | 课程记录列表新增 status=「待审核」的 A7 行 |
| **Mentor** | `/courses` Tab「待审核」+1，A7 行可见 |
| **Admin** | dashboard 待审课时 +1 |
| LM/Asst | 同 student |

#### A7 实测勾选 — 🔴 FIX-3 关键

- ☐ 点「重新提交」打开 **shared ClassReportFlowModal**（非 inline confirm modal）
- ☐ Prefilled 字段正确
- ☐ 提交 200 + 无 400 错误
- ☐ DB 新行 reference_type/reference_id 正确
- ☐ Student 端可见
- ☐ Mentor 端「待审核」+1
- ☐ Admin 端 dashboard +1
- ☐ LM / Asst 端可见

---

## §4 Flow B — 模拟应聘申请全生命周期

**实体追踪**：DB 直插一条 mock_practice 给 hw01（模拟「student 申请 mock interview」状态），然后跑完状态机。

---

### Stage B0 — 初始数据 fixture

**驱动**：DB 直插（模拟 student 已提交申请，LM 已排课）  
**估时**：2 min  
**状态变化**：osg_mock_practice 新增 1 行 status=scheduled

#### B0.1 Action — DB 插入

```powershell
& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' --default-character-set=utf8mb4 -e @"
INSERT INTO osg_mock_practice
  (student_id, student_name, practice_type, request_content, status,
   mentor_ids, mentor_names, scheduled_at, submitted_at, del_flag)
VALUES
  (25112, 'hw01', 'mock_interview', '手测 B-Flow mock practice', 'scheduled',
   '12866', 'daoshi58', '2026-05-21 10:00:00', NOW(), '0');

SELECT practice_id, student_id, mentor_ids, scheduled_at, status
  FROM osg_mock_practice
  WHERE request_content='手测 B-Flow mock practice';
"@
```

**预期**：返回新行 practice_id（5177 或新分配），scheduled_at=`2026-05-21 10:00:00`，status=`scheduled`，mentor_ids=`12866`。
**记下 practice_id** = **___________**

#### B0.2 跨端 baseline 验证（5 端必查）

| 端 | URL/操作 | 预期 |
|---|---|---|
| **Student** | `/mock-practice` | 「我的模拟应聘记录」列表新增「手测 B-Flow mock practice」行，导师=daoshi58，状态=已分配 |
| **LM** | `/career/mock-practice` | 「我管理的学员」Tab 含该行 |
| **Mentor** (daoshi58) | `/mock-practice` | 列表含 hw01 行（mentor_ids 含 12866）— **🔴 FIX-1 验证点：列表非空** |
| **Assistant** (zhujiao58) | `/career/mock-practice` | 「我管理的学员」Tab 含该行 |
| **Admin** | `/career/mock-practice` | 全部记录列表含该行 |

#### B0 实测勾选

- ☐ DB 插入成功
- ☐ Student 端 baseline Pass
- ☐ LM 端 baseline Pass
- ☐ **Mentor 端 baseline Pass（FIX-1 验证）**
- ☐ Assistant 端 baseline Pass
- ☐ Admin 端 baseline Pass

---

### Stage B1 — [Student] 验证排课时间显示（🔴 FIX-2 关键验证）

**驱动端**：Student  
**估时**：3 min

#### B1.1 Action — Student 查看详情

| # | 操作 | 预期 |
|---|---|---|
| 1 | Student tab → `/mock-practice` → 列表找到 B0 那行 | 行可见 |
| 2 | 点「查看申请」 | 详情弹窗打开 |
| 3 | **🔴 关键**：弹窗内「预约时间」字段值 | 显示 **`2026-05-21 10:00`**（修复前永远显示「待安排」）|
| 4 | 其它字段 | 学员=hw01 / 类型=模拟面试 / 导师=daoshi58 / 申请内容=手测 B-Flow mock practice |
| 5 | 关闭弹窗 | modal 干净关闭 |

#### B1 实测勾选 — 🔴 FIX-2 关键

- ☐ 预约时间显示真实值 `2026-05-21 10:00`（非「待安排」）

---

### Stage B2 — [Mentor] 模拟应聘列表 + 操作列（🔴 FIX-1 验证）

**驱动端**：Mentor  
**估时**：3 min

#### B2.1 Action — Mentor 查看列表

| # | 操作 | 预期 |
|---|---|---|
| 1 | Mentor tab → `/mock-practice` | 列表加载 |
| 2 | 顶部筛选区 | 4 个筛选（公司/面试阶段/面试时间/是否上报课消），**无统计卡片** |
| 3 | **🔴 关键**：列表非空 | 至少 4 行：B0 的 hw01 一行 + xuesheng58 三行（practice 5158/5159/5160） |
| 4 | hw01 行操作列 | **只有「上报课消」蓝色 link**（**无「确认」绿色 button**） |

#### B2 实测勾选 — 🔴 FIX-1 关键

- ☐ 列表非空（4+ 行）
- ☐ 操作列无确认按钮

---

### Stage B3 — [Mentor] 上报 mock_practice 课消

**驱动端**：Mentor  
**估时**：8 min  
**状态变化**：新增 `osg_class_record` 行（reference_type=mock_interview, reference_id=B0 practice_id, status=pending）

#### B3.1 Action — mentor 从 mock-practice 入口上报

| # | 操作 | 预期 |
|---|---|---|
| 1 | Mentor `/mock-practice` → hw01 行点「上报课消」 | `ClassReportFlowModal` 打开，prefilled 学员=hw01 + 关联类型=模拟面试 + 关联申请=B0 practice |
| 2 | 课程类型 → 选「模拟面试」radio | radio 选中 |
| 3 | 上课日期 = today / 课时 = 1 / 状态 = 正常上课 | 字段已填 |
| 4 | 反馈表单（模拟面试 feedback） | 按 modal 引导填关键字段 |
| 5 | 反馈摘要 = `手测 B3 mock 课消` / 评分 = 7 | 填入 |
| 6 | 点「提 交」 | toast `上报成功` |
| 7 | 记 record_id = **___________** | |

#### B3.2 DB 验证

```powershell
& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' -e @"
SELECT record_id, mentor_id, student_id, reference_type, reference_id, course_type, status
  FROM osg_class_record
  WHERE student_id=25112 AND feedback_summary LIKE '%B3 mock%'
  ORDER BY record_id DESC LIMIT 1;
"@
```
**预期**：reference_type=`mock_interview`, reference_id=B0 practice_id, course_type=`mock_interview`, status=`pending`

#### B3.3 跨端验证

| 端 | 验证点 |
|---|---|
| **Student** | `/mock-practice` B0 那行「已上报课消数」从 0 → 1；`/courses` 列表新增该课消行 status=待审核 |
| **Mentor** | `/courses` 待审核 +1；`/mock-practice` B0 行「已上报课消数」+1 |
| **LM** | 课程记录 + 模拟应聘管理两处都能看到 |
| **Assistant** | 同上 |
| **Admin** | dashboard 待审 +1 |

#### B3 实测勾选

- ☐ Mentor 上报 Action 成功
- ☐ DB reference_type/reference_id 正确
- ☐ Student 端两处（模拟应聘 + 课程记录）都更新
- ☐ Mentor 端两处更新
- ☐ LM 端验证 Pass
- ☐ Assistant 端验证 Pass
- ☐ Admin dashboard Pass

---

### Stage B4 — [Admin] 审核通过 B3 课消

**驱动端**：Admin  
**估时**：4 min  
**状态变化**：B3 record.status pending → approved

#### B4.1 Action

参照 A4 流程：Admin → 课程记录 → 待审核 → B3 那条 → 通过

#### B4.2 跨端验证（5 端必查）

| 端 | 预期 |
|---|---|
| **Student** | 模拟应聘 + 课程记录两处状态更新 |
| **Mentor** | Tab 迁移到「已通过」/ mock-practice 列表「已上报课消数」依然 1（不增不减） |
| **LM** / **Assistant** | 状态更新 |
| **Admin** | dashboard -1 |

#### B4 实测勾选

- ☐ Admin Action 成功
- ☐ DB approved
- ☐ Student/Mentor/LM/Asst/Admin 5 端验证 Pass

---

### Stage B5 — [Admin → Mentor] 驳回 + 重提交（🔴 FIX-3 关键，mock_practice 路径）

**估时**：8 min  
按 A5+A6+A7 同模式：

1. **B5.1 mentor 再上报 1 条 mock_practice 课消**（反馈摘要 `手测 B5 课消（备驳回）`）
2. **B5.2 admin 驳回该条**（驳回原因 `手测_B5 驳回`）
3. **B5.3 mentor 走「重新提交」→ shared ClassReportFlowModal 弹出 → 修改 → 提交**

#### B5 实测勾选 — 🔴 FIX-3 mock_practice path

- ☐ B5.1 mentor 上报 + 5 端验证
- ☐ B5.2 admin 驳回 + 5 端验证
- ☐ B5.3 点「重新提交」打开 **shared ClassReportFlowModal**（mock_practice prefilled）
- ☐ B5.3 提交 200 + 无 400
- ☐ B5.3 新 record reference_type/Id 正确 + 5 端验证

---

## §5 测试数据清理（手测完成后）

跑完所有 Stage 后，**如果不想保留 fixture**：

```powershell
$env:MYSQL_PWD='app123456'
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' --default-character-set=utf8mb4 -e @"
-- 删 B0 fixture
DELETE FROM osg_mock_practice WHERE request_content = '手测 B-Flow mock practice';

-- 删 A3/A5/A7 + B3/B5 产生的 class_record
DELETE FROM osg_class_record
  WHERE student_id = 25112
    AND mentor_id = 12866
    AND (feedback_summary LIKE '%手测 A%' OR feedback_summary LIKE '%手测 B%');

-- coaching 5221 恢复 baseline（如 A1 改过）
UPDATE osg_coaching SET mentor_ids=NULL, status='pending', update_time=NOW(),
       update_by='手测_cleanup_5221'
  WHERE coaching_id=5221;

-- 验证清理结果
SELECT 'remaining class_record' AS section,
       COUNT(*) AS cnt
  FROM osg_class_record
  WHERE student_id=25112 AND feedback_summary LIKE '%手测%';
SELECT 'coaching 5221 status' AS section, status, mentor_ids
  FROM osg_coaching WHERE coaching_id=5221;
"@
```

---

## §6 附录

### 6.1 状态机总览

#### Flow A — 求职辅导

```
[Student/admin 创建 app] → application=submitted
        ↓
[Student 申请辅导] → coaching=pending（待分配导师）       ← 本次 A0 起点（用 5221 模拟）
        ↓
[LM/admin 分配 mentor] → coaching.mentor_ids 写入 + status=assigned   ← A1
        ↓
[Mentor 安排面试] → coaching.interview_time 写入 / 学生看到面试时间   ← A2（如有入口）
        ↓
[Mentor 上报课消] → class_record=pending                  ← A3
        ↓
[Admin 审核] → class_record=approved / rejected           ← A4 / A6
        ↓ (rejected)
[Mentor 重新提交] → 新 class_record=pending                ← A7（FIX-3）
        ↓ (approved)
继续累积课消，最终学员 stage 推进（offer/rejected/...）
```

#### Flow B — 模拟应聘

```
[Student/admin 创建 mock_practice] → status=pending（待分配导师）
        ↓
[LM/admin 分配 mentor + 排课] → mentor_ids + scheduled_at 写入 + status=scheduled  ← B0 起点
        ↓
[Mentor 上报课消] → class_record(reference_type=mock_interview) pending           ← B3
        ↓
[Admin 审核] → class_record=approved / rejected                                   ← B4
        ↓ (rejected)
[Mentor 重新提交] → 新 class_record=pending                                       ← B5（FIX-3 mock path）
        ↓
完成 mock_practice.status=completed（如有完结流程）
```

### 6.2 跨端可见性矩阵

> 一条 application/coaching/class_record 在 5 端的可见性规则。

| 实体 | Student | LM | Mentor | Asst | Admin |
|---|---|---|---|---|---|
| application (该 student 的) | ✓ | ✓（如是该生 lead_mentor） | ✗（应用本身无 mentor 概念）| ✓（如是该生 assistant） | ✓ 全部 |
| coaching pending（待分配）| ✓ | ✓（lead_mentor 匹配）| ✗ | ✓（assistant 匹配）| ✓ |
| coaching assigned（mentor_ids 含 X） | ✓ | ✓ | ✓（X 是 mentor 才看见）| ✓ | ✓ |
| mock_practice scheduled | ✓ | ✓ | ✓（mentor_ids 匹配）| ✓ | ✓ |
| class_record pending（mentor=X 上报）| ✓ | ✓（学生归属）| ✓（X 自己） | ✓（学生归属）| ✓ |
| class_record approved | ✓ | ✓ | ✓ | ✓ | ✓ |
| class_record rejected | ✓ | ✓ | ✓（自己的）| ✓ | ✓ |

### 6.3 已修复 Bug 速查

| Bug | FIX | Stage 验证点 | 关键断言 |
|---|---|---|---|
| 1 mentor 模拟应聘列表空 | FIX-1 (`fdcadc79`) | B0/B2 | mentor 列表非空 + 操作列无确认按钮 |
| 2 排课后学生端无更新 | FIX-2 (`fdcadc79`) | B1 §3 | 学生端预约时间显示真实值 |
| 3 mentor reject 重提交失败 | FIX-3 (`fe71c077`) | A7 §3 + B5 §B5.3 | 点重新提交走 shared ClassReportFlowModal + 无 400 |
| 4 未加学生 list 的导师无法 log | placeholder | A3 §3 + B3 §1 | 学员下拉聚合 coaching/mock_practice mentor_ids |
| A 密码弹窗误弹 | FIX auth (`9a1fd0e0`) | §1.4 fixture | 5 账号密码 admin123 时不弹 |
| Audit B - assistant 4 modal | refactor (`008c43ed`) | A0 asst 端 + B0 asst 端 | OverlaySurfaceModal + osg-modal-form |
| C8 弹窗视觉打磨 | style (`7cfef7c7`) | A3/B3 mentor 上报 | section 卡片化 + 多层阴影 |

### 6.4 通用排错

| 现象 | 排查 |
|---|---|
| 登录后白屏 | F12 Console 看 JS / Network 看 `/getInfo` |
| 「用户不存在/密码错误」 | §1.4 验密码 hash + 重置 |
| 「请修改默认密码」反复弹 | DB 该账号 hash matches Osg@2026 → §1.4 重置 |
| 表格永远 loading | F12 Network 看对应 API 状态码 |
| Modal 关不掉 | F12 → DOM 看是否多个嵌套；ESC 或强刷 |
| backend 500 | logs/backend-dev-*.log 看 stacktrace |
| 端口启不来 | logs/<app>-dev.log；EADDRINUSE 清端口 |
| Captcha 看不清 | §2.3 临时禁 captcha |

### 6.5 修改历史

| 日期 | 修改 |
|---|---|
| 2026-05-15 | v1 首版 11 个 TC（5 端 × 2 主线） |
| 2026-05-15 | v2 补环境/账号/切换/排错 |
| 2026-05-15 | **v3 重构按状态机** — 每个 Stage = 1 个 Action + 多端验证清单。Flow A 7 个 Stage，Flow B 6 个 Stage，每 Stage 显式列出 5 端可见性变化。新增 §6.1 状态机图 + §6.2 跨端可见性矩阵 |
