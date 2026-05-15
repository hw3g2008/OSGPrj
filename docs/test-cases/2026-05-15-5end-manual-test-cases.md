# 5 端串联手测用例 — 求职辅导 + 模拟应聘双主线

- **日期**：2026-05-15
- **基线 commit**：`844cd739`（含 FIX-1/2/3 + 全部 deps + 5 端验证）
- **测试主体**：单人手测，浏览器实测
- **估时**：完整跑 60–90 分钟（一次性）。重跑只验关键 TC 约 20 分钟
- **总用例**：11 个 TC（5 端 × 求职辅导 + 6 步 × 模拟应聘）

---

## §0 跑测前必读

### 0.1 失败处理流程

任何 TC 失败：
1. 当前页 F12 → DevTools 截屏（保留 Network/Console panel）
2. 在 TC 表里写实测现象（什么不符预期、API status code、报错弹窗文字）
3. 如果环境异常（白屏/404/502），先验 §1 环境准备清单，重启对应服务后再判断
4. 不要往下跑下一个 TC — 上游断了下游必然失败

### 0.2 跑测顺序约束

- §1 → §2 → 主线 A（A1→A5 任意顺序）→ 主线 B（**B1→B2→B3→B4→B5→B6 严格顺序**，B 链上下游依赖）
- 同主线内 TC 互不依赖，可乱序

---

## §1 环境准备（一次性，约 15 分钟）

### 1.1 检查并启动 backend

```powershell
# 1) 端口检测
Get-NetTCPConnection -State Listen -LocalPort 28080 -ErrorAction SilentlyContinue

# 2) health 探测
try { (Invoke-WebRequest -Uri "http://127.0.0.1:28080/actuator/health" -UseBasicParsing -TimeoutSec 5).Content }
catch { Write-Output "backend DOWN" }
```

**预期**：返回 `{"status":"UP"}` 等含 UP 字样。

如未启动：
```bash
# Git Bash 里跑（脚本是 bash 不是 PowerShell）
bash bin/run-backend-dev.sh deploy/.env.dev
# 等 60-120 秒，看日志 "Started RuoYiApplication"
```

### 1.2 启动 5 个前端

```powershell
# 端口表
$ports = @{
  student = 3001; mentor = 3002; 'lead-mentor' = 3003
  assistant = 3004; admin = 3005
}
foreach ($app in $ports.Keys) {
  $port = $ports[$app]
  $c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  if ($c) { Write-Output "OK   $app on $port" } else { Write-Output "DOWN $app on $port" }
}
```

如 DOWN 的端口，启动方式（**串行，并发会触发 npm cache 冲突**）：

```powershell
# 每端一行，等上一行 vite ready（看到 "Local:   http://localhost:xxxx/"）再开下一个
# 用 cmd 包一层让 vite 在后台不占当前 shell
$env:NPM_CONFIG_CACHE = "$env:TEMP\npm-cache-student"
cmd /c "cd /d H:\workspace\java\OSGPrj\osg-frontend\packages\student && start /b pnpm exec vite --port 3001 > H:\workspace\java\OSGPrj\logs\student-dev.log 2>&1"

$env:NPM_CONFIG_CACHE = "$env:TEMP\npm-cache-mentor"
cmd /c "cd /d H:\workspace\java\OSGPrj\osg-frontend\packages\mentor && start /b pnpm exec vite --port 3002 > H:\workspace\java\OSGPrj\logs\mentor-dev.log 2>&1"

$env:NPM_CONFIG_CACHE = "$env:TEMP\npm-cache-lm"
cmd /c "cd /d H:\workspace\java\OSGPrj\osg-frontend\packages\lead-mentor && start /b pnpm exec vite --port 3003 > H:\workspace\java\OSGPrj\logs\lm-dev.log 2>&1"

$env:NPM_CONFIG_CACHE = "$env:TEMP\npm-cache-assistant"
cmd /c "cd /d H:\workspace\java\OSGPrj\osg-frontend\packages\assistant && start /b pnpm exec vite --port 3004 > H:\workspace\java\OSGPrj\logs\assistant-dev.log 2>&1"

$env:NPM_CONFIG_CACHE = "$env:TEMP\npm-cache-admin"
cmd /c "cd /d H:\workspace\java\OSGPrj\osg-frontend\packages\admin && start /b pnpm exec vite --port 3005 > H:\workspace\java\OSGPrj\logs\admin-dev.log 2>&1"
```

启动后再跑 1.2 端口表确认全 OK。

### 1.3 浏览器准备

**推荐 Chrome（独立 profile，避免和日常 Chrome 冲突）**：

```powershell
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  -ArgumentList '--remote-debugging-port=9222', "--user-data-dir=$env:TEMP\chrome-cdp-profile"
```

启动后在地址栏分别试访问 5 个 URL 确认能加载页面（不需要登录）：
- http://127.0.0.1:3001 → 学生端登录页
- http://127.0.0.1:3002 → 导师端登录页
- http://127.0.0.1:3003 → 班主任端登录页
- http://127.0.0.1:3004 → 助教端登录页
- http://127.0.0.1:3005 → 后台登录页

### 1.4 DB fixture 一次性核对 + 补齐

打开 PowerShell，跑 fixture 校验 SQL：

```powershell
$env:MYSQL_PWD='app123456'
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

# 1) hw01 主链 IDs
& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' --default-character-set=utf8mb4 -e @"
SELECT 'hw01 关系链' AS section;
SELECT student_id, student_name, lead_mentor_id, lead_mentor_ids, assistant_ids
  FROM osg_student WHERE student_id=25112;

SELECT 'hw01 求职申请' AS section;
SELECT application_id, position_id, current_stage, lead_mentor_id, submitted_at
  FROM osg_job_application WHERE student_id=25112 ORDER BY application_id DESC;

SELECT 'hw01 阶段辅导' AS section;
SELECT coaching_id, application_id, interview_stage, mentor_ids, status
  FROM osg_coaching WHERE student_id=25112 ORDER BY coaching_id DESC;

SELECT '5 账号密码状态' AS section;
SELECT user_name, first_login,
       password = (SELECT password FROM sys_user WHERE user_name='hwyellow222@126.com') AS pwd_is_admin123
  FROM sys_user
  WHERE user_name IN ('admin', 'hwyellow222@126.com', '525086@qq.com', 'daoshi58@qq.com', 'zhujiao58@qq.com');
"@
```

**预期**：

| 表 | 行 | 字段 | 期望 |
|---|---|---|---|
| osg_student | 1 | lead_mentor_id / lead_mentor_ids / assistant_ids | 12858 / `12858` / `12813,12867` |
| osg_job_application | 3 | application_id / current_stage / lead_mentor_id | 300 first 12858 / 301 second 12858 / 302 hirevue 12858 |
| osg_coaching | 2 | coaching_id / mentor_ids / status | 5221 NULL pending / 5220 `13067,12866` assigned |
| sys_user | 5 | pwd_is_admin123 | 5 个账号全部 1（true） |

**如缺失，补齐 SQL**：

```sql
-- coaching 5220 加 daoshi58 (12866)（如 mentor_ids 不含）
UPDATE osg_coaching SET mentor_ids='13067,12866',
       update_time=NOW(), update_by='手测_fixture_5220'
  WHERE coaching_id=5220 AND NOT FIND_IN_SET('12866', mentor_ids);

-- 重置 5 账号密码到 admin123（复制 hw01 hash）
UPDATE sys_user SET
  password = (SELECT password FROM (SELECT password FROM sys_user WHERE user_name='hwyellow222@126.com') t),
  pwd_update_date = NOW(),
  update_by = '手测_fixture_admin123'
WHERE user_name IN ('admin', '525086@qq.com', 'daoshi58@qq.com', 'zhujiao58@qq.com');
```

---

## §2 账号矩阵 + 切换法

### 2.1 5 账号详情

| 角色 | 端口 | 登录账号 | 密码 | user_id | 关联 |
|---|---|---|---|---|---|
| **Student** | 3001 | `hwyellow222@126.com` | `admin123` | 12878 | hw01 / student_id=25112 |
| **Mentor** | 3002 | `daoshi58@qq.com` | `admin123` | 12866 | daoshi58 / staff_id=98187 |
| **Lead-mentor** | 3003 | `525086@qq.com` | `admin123` | 12858 | yanyabanzhuren / 培训主管 |
| **Assistant** | 3004 | `zhujiao58@qq.com` | `admin123` | 12867 | zhujiao58 |
| **Admin** | 3005 | `admin` | `admin123` | 1 | 超级管理员 |

### 2.2 端切换法（推荐：5 端 5 个浏览器 tab 同时开）

**5 端独立 tab，互不影响**：
1. Chrome 新建 5 个 tab
2. 各 tab 分别访问 5 端登录 URL（§2.1 端口列）
3. 5 端走各自的 localStorage（同源策略），登录互不干扰
4. 测试时直接在 tab 间切换，无需重复登录

**优点**：跑 A 主线时所有 5 端账号已就位，TC 之间秒切。

### 2.3 单 tab 切换（如 Chrome 资源紧张）

```text
当前端 → 点用户头像 → 退出登录 → 跳登录页 → 输新账号 → 提交
```

如登录后跳到上一个用户的页面（cache），按 F12 → Application → Local Storage → 清当前 origin 的 `osg_token`/`osg_user`/`osg_must_change_pwd`，再硬刷（Ctrl+Shift+R）。

### 2.4 Admin 端 captcha 处理

Admin 登录页有图形验证码（4 位数字/字母）。**必须人眼识别**，没有自动绕过。如刷新验证码图，URL 是 `/api/captchaImage`（GET 一次拿新图 + uuid）。

如果验证码反复看不清，可临时禁用 captcha：DB 改 `sys_config WHERE config_key='sys.account.captchaEnabled'` 的值改 'false'，重启 backend 或重新登录即可。**测完记得改回 'true'**。

### 2.5 关于「请修改默认密码」弹窗

修复后规则：**当前 sys_user.password 的 bcrypt hash 是否 match "Osg@2026"** → 是则弹。

已重置 admin123 的 5 个账号都不会弹。如果跑测过程中弹了，说明：
- 账号被改回 Osg@2026（admin 端误重置）
- 或 backend 缓存过期前请稍等

跑 §1.4 验 `pwd_is_admin123 = 1`。

---

## §3 主线 A — 求职辅导申请（学员求职总览）

**数据流**：student 端 hw01 已有 3 条申请 → coaching 5220 已分配 mentor (13067 + 12866) → coaching 5221 second round 待分配。
**估时**：5 个 TC 共约 20 分钟。

---

### TC-A1 学生端「我的求职」列表 + 详情

**估时**：3 min  
**端**：Student / 3001  
**账号**：`hwyellow222@126.com`  
**密码**：`admin123`

#### 登录步骤
1. 浏览器开 http://127.0.0.1:3001
2. 在「邮箱」框输 `hwyellow222@126.com`
3. 在「密码」框输 `admin123`
4. 点「登录」按钮
5. **预期**：toast `登录成功`，跳到 `/positions` 岗位信息页

#### 测试步骤

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航点「我的求职 My Applications」 | URL 跳 `/job-tracking`，页面标题"我的求职 My Applications" |
| 2 | 顶部 4 个 Tab | 全部(3) / 已投递(0) / 面试中(3) / 已结束(0) |
| 3 | 列表渲染 3 行 | 行 1: Summer Analyst - IB / Goldman Sachs<br>行 2: Spring Insight / Morgan Stanley<br>行 3: Off-cycle Analyst / JPMorgan |
| 4 | 各行操作列「申请辅导」按钮 | 可点击 |
| 5 | 点行 1 左侧 `+` 图标展开 | 展开行显示 application 300 详情：first round / 5/14 19:23 / coaching 5220 / mentor `e2e_mt_mp2mda0y54s` |

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

#### 清理 / 切换准备
不需要登出，保留 tab 给后续 TC 用（如 TC-B2 仍用 hw01）。

---

### TC-A2 班主任端「学员求职总览-我管理学员」

**估时**：4 min  
**端**：Lead-mentor / 3003  
**账号**：`525086@qq.com`  
**密码**：`admin123`

#### 登录步骤
1. 浏览器开 http://127.0.0.1:3003 （新 tab 或切端）
2. 在「邮箱」框输 `525086@qq.com`
3. 在「密码」框输 `admin123`
4. 点「登 录」按钮
5. **预期**：跳到 `/career/positions`（默认页），左下显示 `YA yanyabanzhuren 培训主管`

#### 测试步骤

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航点「学员求职总览 Job Overview」 | URL 跳 `/career/job-overview` |
| 2 | 顶部「学员面试安排」日历区，看到 5 月视图 | 5/13、5/16 两个日期单元格显示红色徽标 + 文本 "hw01" |
| 3 | 中部 3 个 Tab，默认选中「我管理的学员 4」 | 3 Tab: 我管理的学员(4) / 我辅导的学员(1) / 待分配导师(2) |
| 4 | 列表渲染 4 行 | hw01 三条（Goldman/Morgan/JPMorgan）+ yanyan 一条 |
| 5 | hw01 / Goldman Sachs 行 | 面试阶段 `first` / 时间 `2026-05-14 19:23` / 导师 `e2e_mt_mp2mda0y54s` / 最近评分 `8/10` |
| 6 | hw01 / Morgan Stanley 行 | 面试阶段 `second` / 时间 `2026-05-16 10:00` / 导师 `待分配` |
| 7 | 点 hw01 / Goldman 行「查看详情」 | 弹出详情面板，显示 coaching 5220、已上报课消 1 条记录 |
| 8 | 关闭详情弹窗 → 切 Tab「待分配导师 2」 | 列表显示 2 条 second/pending 待分配的 coaching（其中应有 hw01 Morgan）|

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

#### 清理 / 切换准备
不需要登出。保留 tab。

---

### TC-A3 助教端「学员求职总览」

**估时**：3 min  
**端**：Assistant / 3004  
**账号**：`zhujiao58@qq.com`  
**密码**：`admin123`

#### 登录步骤
1. 浏览器开 http://127.0.0.1:3004
2. 输 `zhujiao58@qq.com` / `admin123`
3. 点「登录」
4. **预期**：跳到 `/career/positions`，左下角 `ZH zhujiao58 Assistant`

#### 测试步骤

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航点「学员求职总览 Job Overview」 | URL 跳 `/career/job-overview` |
| 2 | 顶部「学员面试安排」日历 + "我管理的学员 Managed Students 7" 标题 | 单 Tab 模式 |
| 3 | 列表渲染 7 行 | hw01 三条 + 其他 4 个学生 |
| 4 | hw01 / Goldman 行 | mentor `e2e_mt_mp2mda0y54s` + 评分 `8/10` |
| 5 | 点 hw01 / Goldman 行「查看详情」 | 跟进详情弹窗打开，**圆角白底 modal**（OverlaySurfaceModal 公共基线），标题 `跟进详情 hw01 · ID: 25112` |
| 6 | 弹窗内容 | 显示岗位/公司/城市/面试阶段/面试时间/导师 + 总课时/平均评分/课消条数 + 课消记录列表 |
| 7 | 点右上 × 或 ESC | 弹窗干净关闭，无遗留遮罩 |

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

#### 清理 / 切换准备
保留 tab。

---

### TC-A4 导师端「学员求职总览」

**估时**：3 min  
**端**：Mentor / 3002  
**账号**：`daoshi58@qq.com`  
**密码**：`admin123`

#### 登录步骤
1. 浏览器开 http://127.0.0.1:3002
2. 输 `daoshi58@qq.com` / `admin123`
3. 点「登录」
4. **预期**：跳到 `/courses`（默认课程记录页），左下角 `DA daoshi58 导师`

#### 测试步骤

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航点「学员求职总览 Job Overview 5」（徽标显示 5）| URL 跳 `/job-overview` |
| 2 | 列表渲染 5 行 | hw01 / Goldman Sachs 在内 + 其他 4 个学员 |
| 3 | hw01 / Goldman 行 | first / 5/14 19:23 / **已上报课消数 1** / 操作列只有「上报课消」按钮 |
| 4 | 点 hw01 / Goldman 行「上报课消」 | shared `ClassReportFlowModal` 弹出 — section 卡片化（白底+轻阴影）、外圆角 12px + 多层阴影（C8 视觉打磨） |
| 5 | 弹窗内字段 prefilled | 学员=hw01 / 关联类型=求职辅导申请 / 关联申请=coaching 5220 first round |
| 6 | 点右上 × 或按 ESC | 弹窗关闭，不残留 |

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

#### 清理 / 切换准备
保留 tab — 后续 TC-B3/B4/B6 会再用 daoshi58。

---

### TC-A5 后台「学员求职总览」

**估时**：5 min（含 captcha）  
**端**：Admin / 3005  
**账号**：`admin`  
**密码**：`admin123`

#### 登录步骤
1. 浏览器开 http://127.0.0.1:3005
2. 输用户名 `admin` / 密码 `admin123`
3. 看「请输入验证码」框边的图片（4 位字符），人眼识别后填入
4. 点「登录」
5. **预期**：跳 `/dashboard`，看到「欢迎回来，管理员」标题
6. **不应弹**「请修改默认密码」窗（如弹，说明 §1.4 fixture 步骤没生效）

#### 测试步骤

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「求职中心 CAREER → 学员求职总览」按钮 | URL 跳 `/career/job-overview` |
| 2 | 顶部 KPI 区 | 52 已投递 / 2 面试中 / 0 已获 Offer / 求职转化漏斗 |
| 3 | 中部 2 个 Tab，默认「待分配导师 21」 | 共 21 条待分配 coaching |
| 4 | 列表第一条 | hw01 / Morgan Stanley / Spring Insight / second / 待安排 / 1 位需求 / 暂无意向导师 / 3 天前 — 对应 **coaching 5221** |
| 5 | 点 hw01 行「分配导师」 | 分配导师弹窗打开，多选下拉里搜得到 daoshi58 / e2e_mt_xxx 等 mentor |
| 6 | 不勾任何 mentor，点取消 | 弹窗关闭，不写库（**重要：不要点确认，否则会影响 TC-A2 数据**） |
| 7 | 切 Tab「全部学员 52」 | 应含 hw01 全部 3 条 application 300/301/302 |

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

#### 清理 / 切换准备
保留 tab — TC-B5 / B6 仍用 admin。

---

## §4 主线 B — 模拟应聘 + 课消上报

**数据流**：DB 直插一条 mock_practice 给 hw01 → student 端看 → mentor 端上报课消 → admin 审核 → 驳回 → mentor 重提交。
**估时**：6 个 TC 共约 30 分钟。
**严格顺序**：B1 → B2 → B3 → B4 → B5 → B6。

---

### TC-B1 DB 插入 hw01 模拟面试 fixture

**估时**：2 min  
**执行端**：PowerShell + MySQL（不需要登录任何前端）

#### 步骤

```powershell
$env:MYSQL_PWD='app123456'
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' --default-character-set=utf8mb4 -e @"
INSERT INTO osg_mock_practice
  (student_id, student_name, practice_type, request_content, status,
   mentor_ids, mentor_names, scheduled_at, submitted_at, del_flag)
VALUES
  (25112, 'hw01', 'mock_interview', '手测 mock interview', 'scheduled',
   '12866', 'daoshi58', '2026-05-21 10:00:00', NOW(), '0');

SELECT practice_id, student_id, mentor_ids, scheduled_at, status
  FROM osg_mock_practice
  WHERE student_id=25112 AND request_content='手测 mock interview';
"@
```

#### 预期

返回 1 行：practice_id 是新分配（5177 或类似），student_id=25112，mentor_ids='12866'，scheduled_at='2026-05-21 10:00:00'，status='scheduled'。

**记下 practice_id**，后续 TC 会用到：practice_id = **___________**

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

---

### TC-B2 学生端「模拟应聘」详情显示预约时间 — 🔴 FIX-2 验证

**估时**：3 min  
**端**：Student / 3001  
**账号**：`hwyellow222@126.com`  
**密码**：`admin123`

#### 登录步骤
如 TC-A1 tab 还在则切到该 tab；否则按 TC-A1 §登录步骤重新登录。

#### 测试步骤

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航点「模拟应聘 Mock Practice」 | URL 跳 `/mock-practice` |
| 2 | 顶部 3 个发起卡片：「模拟面试 / 人际关系测试 / 期中考试」可见 | 「我的模拟应聘记录」标题下有列表 |
| 3 | 列表含 B1 插入的「手测 mock interview」行 | 类型=`模拟面试` / 申请时间=B1 提交时刻 / 导师=`daoshi58` / 已上课时=`-` / 操作列「查看申请」按钮 |
| 4 | 点该行「查看申请」 | 详情弹窗打开（OverlaySurfaceModal） |
| 5 | **关键断言**：弹窗内「预约时间」字段值 | 显示 **`2026-05-21 10:00`**（**非「待安排」**） |
| 6 | 关闭弹窗 → 列表保留 | 列表不变 |

**🔴 FIX-2 验收**：第 5 步预约时间必须是真实值，不能是「待安排」。修复前因 `StudentMockPracticeServiceImpl.projectPracticeRecords` 漏 put `scheduledAt`，前端总是兜底显示「待安排」。

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

#### 清理 / 切换准备
保留 student tab。

---

### TC-B3 导师端「模拟应聘管理」列表 — 🔴 FIX-1 验证

**估时**：4 min  
**端**：Mentor / 3002  
**账号**：`daoshi58@qq.com`  
**密码**：`admin123`

#### 登录步骤
如 TC-A4 tab 还在则切到该 tab；否则按 TC-A4 §登录步骤重新登录。

#### 测试步骤

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「模拟应聘管理 Mock Practice」 | URL 跳 `/mock-practice` |
| 2 | 顶部筛选区 | 4 个筛选项：公司 / 面试阶段 / 面试时间 / 是否上报课消（**无任何统计卡片**） |
| 3 | **关键断言**：列表至少 4 行 | xuesheng58 三条（practice 5158/5159/5160）+ hw01 一条（B1 新插入） |
| 4 | hw01 行内容 | 学生 ID `25112` / 类型 `模拟面试` / 分配时间=B1 时间戳 / 已上报课消数 `0` |
| 5 | **关键断言**：hw01 行操作列 | **只有「上报课消」蓝色 link 按钮**（无「确认」绿色 button） |
| 6 | 点 hw01 行「上报课消」 | `ClassReportFlowModal` 弹出 — section 卡片化（C8 视觉打磨）|
| 7 | 弹窗 prefilled 字段 | 学员=hw01 / 课程类型 radio 默认岗位辅导（如未 prefilled mock_interview 是已知 UX 改进点）/ 关联类型=模拟面试 prefilled / 关联申请=`模拟面试 / [B1 时间] / scheduled` |
| 8 | 关闭弹窗 → 不提交 | 弹窗干净关闭 |

**🔴 FIX-1 验收**：
- 第 3 步：daoshi58 必须看到 mentor_ids 含 user_id 12866 的全部记录。修复前 service 调错 mapper + PageHelper 先分页再 Java filter，返回 0 条。
- 第 5 步：操作列**无确认按钮**。修复前有 `<a-button v-if="status==='new'">确认</a-button>` 但 normalizeMentorVisibleStatus 永远不输出 'new'，按钮永远不显示——按需求 §2.3 已删按钮 + confirmMock + .btn-confirm css。

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

#### 清理 / 切换准备
保留 mentor tab。

---

### TC-B4 导师端「课程记录」上报课消完整流程

**估时**：5 min  
**端**：Mentor / 3002  
**账号**：`daoshi58@qq.com`  
**密码**：`admin123`

#### 登录步骤
保持 TC-B3 mentor tab，无需重登。

#### 测试步骤

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「课程记录 Class Records」 → 切 Tab「我管理的学员」 | 显示 8 条左右历史课消 |
| 2 | 右上方点「+ 上报课程记录」 | `ClassReportFlowModal` 打开 — 单屏滚动版（C3 改造）、5 个 section 卡片化、modal 圆角 12px + 多层外阴影（C8） |
| 3 | 「学员」下拉框点开 | **下拉应包含 hw01(25112) + xuesheng58(38849) + 其他 daoshi58 管理的学员** |
| 4 | 选学员 = hw01 | 学员框显示 `hw01`，关联申请下拉自动加载 |
| 5 | 填字段（自上而下）：<br>- 学员：hw01<br>- 上课日期：today<br>- 课时时长：1<br>- 学员状态：正常上课<br>- 课程类型：模拟面试<br>- 关联类型：模拟面试<br>- 关联申请：选 B1 插入的 practice<br>- 反馈摘要：「手测课消反馈 B4」<br>- 评分：8 | 各字段填入后，「提交」按钮亮起 |
| 6 | 点「提 交」 | toast `上报成功`，弹窗关闭 |
| 7 | DB 验证 | PowerShell 跑：<br>`SELECT record_id, mentor_id, reference_type, reference_id, course_type, status FROM osg_class_record WHERE student_id=25112 AND mentor_id=12866 ORDER BY record_id DESC LIMIT 1;`<br>**预期**：返回最新行，reference_type=`mock_interview`，reference_id=B1 practice_id，course_type=`mock_interview`，status=`pending`（待审核） |
| 8 | 课程记录列表 Tab「我的申报」刷新（或 F5） | 新课消行 status=`待审核` 出现 |
| 9 | 记下新 record_id | record_id = **___________**（B5/B6 要用）|

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

#### 清理 / 切换准备
保留 mentor tab。

---

### TC-B5 admin 端审核课消 + student 端看反馈

**估时**：4 min  
**前置**：TC-B4 已产生 1 条 status=pending 的课消。

#### Step 5.1 admin 审核通过

**端**：Admin / 3005 | 账号 `admin` | 密码 `admin123`

切到 TC-A5 admin tab，或按 TC-A5 §登录步骤重新登录。

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「教学中心 TEACHING → 课程记录」 | URL 跳 `/teaching/class-records` |
| 2 | 顶部 Tab 切「待审核」 | 看到 TC-B4 产生的新课消行（record_id 同 B4 §9） |
| 3 | 点该行「审核」/「通过」操作 | 审核弹窗打开 |
| 4 | 选「通过」/ 填备注（可空）→ 确认 | toast `审核成功`，行 status 改为 `已通过` |
| 5 | DB 验证 | `SELECT status FROM osg_class_record WHERE record_id=__(B4 §9)__;` 返回 `approved` |

#### Step 5.2 student 看反馈

**端**：Student / 3001 | 账号 `hwyellow222@126.com` | 密码 `admin123`

切到 TC-A1 student tab。

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「课程记录 Class Records」 | URL 跳 `/courses` |
| 2 | 列表含 B4 新课消行 | status=`已通过` / 含反馈摘要「手测课消反馈 B4」 |
| 3 | 切「模拟应聘 Mock Practice」 | 列表 B1 那条「手测 mock interview」行 |
| 4 | 该行字段 | 已上课时=`1` / 已上报课消数=`1`（或显示 1 条课消明细）|

**实测结果**（Step 5.1 + 5.2 都过才算 Pass）：☐ Pass / ☐ Fail（fail 记现象：________________）

#### 清理 / 切换准备
保留所有 tab。

---

### TC-B6 驳回后重提交走 ClassReportFlowModal — 🔴 FIX-3 验证

**估时**：5 min  
**前置**：TC-B5 完成（B4 那条已 approved，需要先驳回它）。

#### Step 6.1 admin 驳回 B4 的课消

**端**：Admin / 3005 | 账号 `admin` | 密码 `admin123`

> ⚠️ 已 approved 的不能直接驳回。建议 TC-B6 跑前**重新走一次 TC-B4**（再插一条新课消 status=pending），然后 admin 在 §6.1 把这条新课消「驳回」。
>
> 或直接 DB 模拟驳回（更快）：
>
> ```sql
> UPDATE osg_class_record
> SET status='rejected', review_remark='时长信息错误（手测_B6）',
>     update_time=NOW()
> WHERE record_id=__(B4 §9)__;
> ```

| # | 操作 | 预期 |
|---|---|---|
| 1 | admin 课程记录 → Tab「已驳回」 | 出现 B4 那条课消 |
| 2 | DB 验证 status='rejected' | OK |

#### Step 6.2 mentor 端「重新提交」

**端**：Mentor / 3002 | 账号 `daoshi58@qq.com` | 密码 `admin123`

切到 TC-A4/B3/B4 mentor tab。

| # | 操作 | 预期 |
|---|---|---|
| 1 | 左导航「课程记录 Class Records」 | URL 跳 `/courses` |
| 2 | 顶部 Tab 切「已驳回」 | B4 课消行出现，操作列「查看原因」按钮 |
| 3 | 点「查看原因」 | 驳回原因 modal 弹出，内容 `时长信息错误（手测_B6）`，底部「关闭 / 重新提交」按钮 |
| 4 | **关键断言**：点「重新提交」 | **shared `ClassReportFlowModal` 弹出**（标题「上报课程记录」，5 个 section 卡片）<br>**不应**出现旧的 inline confirm modal（标题「确认课程并填写反馈」，含 `#confirm-class-type` 自定义 select、`#confirm-feedback` textarea） |
| 5 | 弹窗字段 prefilled | 学员=hw01 / 关联类型=模拟面试 / 关联申请=B1 practice |
| 6 | 修改时长字段：1 → 1.5 | 字段值变化 |
| 7 | 点「提 交」 | toast `上报成功`，**无 400 错误** |
| 8 | DB 验证新行 | `SELECT record_id, status, duration_hours FROM osg_class_record WHERE student_id=25112 AND mentor_id=12866 ORDER BY record_id DESC LIMIT 1;` 返回 duration_hours=1.5，status=pending |

**🔴 FIX-3 验收**：
- 第 4 步：「重新提交」打开 **shared `ClassReportFlowModal`**。修复前是自定义 inline modal（HTML 含 `#confirm-class-type` `#confirm-feedback` 等 ID）。
- 第 7 步：提交走 modal 内部 validator。修复前裸 POST `/mentor/class-records` 缺 referenceType/Id → validator 抛 400「课程类型非法」「reference 不一致」。

**实测结果**：☐ Pass / ☐ Fail（fail 记现象：________________）

---

## §5 测试数据清理（手测完成后）

跑完所有 TC 后，**如果不想保留 fixture**，清理 SQL：

```powershell
$env:MYSQL_PWD='app123456'
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"

& $mysql -h 47.94.213.128 -P 23306 -u ruoyi -D 'ry-vue' --default-character-set=utf8mb4 -e @"
-- 删 B1 fixture
DELETE FROM osg_mock_practice WHERE request_content = '手测 mock interview';

-- 删 B4 + B6 产生的 class_record（按反馈关键词或操作人）
DELETE FROM osg_class_record
  WHERE student_id = 25112
    AND mentor_id = 12866
    AND (feedback_summary LIKE '%手测课消%' OR review_remark LIKE '%手测_B6%');

-- coaching 5220 mentor_ids 是否保留 12866 由你决定：
-- (如要恢复原状) UPDATE osg_coaching SET mentor_ids='13067' WHERE coaching_id=5220;

-- 验证清理结果
SELECT COUNT(*) AS remaining_mock FROM osg_mock_practice WHERE student_id=25112;
SELECT COUNT(*) AS remaining_class FROM osg_class_record WHERE student_id=25112 AND mentor_id=12866;
"@
```

---

## §6 附录

### 6.1 已修复 Bug 速查

| Bug | FIX | TC 验证点 | 关键断言 |
|---|---|---|---|
| 1 mentor 模拟应聘列表空 | FIX-1 (commit `fdcadc79`) | TC-B3 §3, §5 | daoshi58 看到 mentor_ids 含 12866 的全部记录 + 无确认按钮 |
| 2 排课后学生端无更新 | FIX-2 (commit `fdcadc79`) | TC-B2 §5 | 预约时间显示 `2026-05-21 10:00` 非「待安排」 |
| 3 mentor 无法 log 课时（reject 重提交） | FIX-3 (commit `fe71c077`) | TC-B6 §4, §7 | reject 重提交走 shared `ClassReportFlowModal` + 无 400 |
| 4 未加学生 list 的导师无法 log | placeholder | TC-B4 §3 | 学员下拉聚合 coaching/mock_practice mentor_ids |
| A 密码弹窗误弹 | FIX-1 auth (commit `9a1fd0e0`) | 各端登录后 | admin/admin123 不再弹（前提是 password 不是 Osg@2026） |
| Audit B - assistant 4 modal 迁移 | refactor (commit `008c43ed`) | TC-A3 §5 | assistant 跟进详情用 OverlaySurfaceModal |
| C8 弹窗视觉打磨 | style (commit `7cfef7c7`) | TC-A4 §4, TC-B4 §2 | section 卡片化 + modal 多层外阴影 + 圆角 12px |

### 6.2 通用排错

| 现象 | 排查方向 |
|---|---|
| 登录后白屏 | F12 Console 看 JS 错；Network 看 `/getInfo` 返回 |
| 登录提示「用户不存在/密码错误」 | DB 验密码 hash（§1.4 SQL）+ 重置 |
| 「请修改默认密码」弹窗反复弹 | DB 该账号 password 当前 hash matches "Osg@2026" → §2.5 + §1.4 重置 |
| 表格空 / 永远 loading | F12 Network 看对应 API 状态码 / response body |
| Modal 关不掉 | F12 → DOM 看是否多个 modal 嵌套；ESC 或强刷 |
| 后端 500 | backend log 看 stacktrace（控制台或 `logs/backend-dev-*.log`） |
| 5 端某端启不来 | 看 `logs/<app>-dev.log`；如 `EADDRINUSE` 清端口 |
| Captcha 看不清 | 刷新登录页或临时禁 captcha（§2.4） |

### 6.3 修改历史

| 日期 | 修改 |
|---|---|
| 2026-05-15 | 首版，11 个 TC（A1~A5 + B1~B6）覆盖 5 端 + 双主线 |
| 2026-05-15 | 完善版（v2）：每个 TC 顶部加 端口/账号/密码/登录步骤；新增 §0/1/2/5 含环境准备 + 账号矩阵 + 切换法 + Captcha + 数据清理；通用排错 + Bug 速查 |
