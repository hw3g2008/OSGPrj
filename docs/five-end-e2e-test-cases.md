# OSG 平台 5 端串联 E2E 测试用例（可执行版）

> **用途**：可直接喂给 `/e2e` 工作流执行的精确测试用例文档
>
> **前置条件**：5 个前端 dev server 运行中 + 后端 28080 运行中
>
> **依赖**：故事间有数据依赖，必须按 故事一 → 二 → 三 → 四 顺序执行
>
> **学员说明**：故事一中 Admin 新建的 `E2E测试学员`（e2e-student@osg.test）仅用于故事一的跨端可见性验证；故事二~四使用预置测试账号 `学员小王`（teststudent@osg.test）

---

## 环境信息

| 端 | URL | 登录方式 |
|----|-----|---------|
| Admin | http://127.0.0.1:3005 | 用户名+密码+验证码 |
| Student | http://127.0.0.1:4000 | 用户名+密码（无验证码） |
| Mentor | http://127.0.0.1:3002 | 用户名+密码（无验证码） |
| Lead-Mentor | http://127.0.0.1:3003 | 用户名+密码（无验证码） |
| Assistant | http://127.0.0.1:3004 | 用户名+密码（无验证码） |

## 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员小陈 | admin | Osg@2026 |
| 学员小王 | teststudent@osg.test | Osg@2026 |
| 导师张老师 | testmentor@osg.test | Osg@2026 |
| 班主任李老师 | leadmentor@osg.test | Osg@2026 |
| 助教小赵 | testassistant@osg.test | Osg@2026 |

---

## 故事一：管理员小陈的日常运营

### 1.1 Admin 登录

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.1.1 | http://127.0.0.1:3005/login | 1. 等待页面加载完成，出现 "管理员登录" 文本<br>2. 在 placeholder="请输入用户名" 的输入框中，清空默认值，输入 `admin`<br>3. 在 placeholder="请输入密码" 的输入框中，清空默认值，输入 `Osg@2026`<br>4. 如果验证码输入框可见（placeholder="请输入验证码"），点击验证码图片刷新<br>5. **验证码处理**：由于验证码无法自动识别，需调用 API `GET /captchaImage` 获取 uuid，然后通过后端临时禁用验证码或使用固定验证码<br>6. 点击 "登录" 按钮（class="login-btn"） | - 出现 "登录成功" 消息提示<br>- URL 跳转到 `/permission/roles`（默认首页）<br>- 页面左侧出现菜单导航 |
| 1.1.2 | http://127.0.0.1:3005/login | 1. 在登录页面，点击 "忘记密码？" 链接（class="forgot-link"） | - 出现忘记密码弹窗（ForgotPasswordModal 组件） |

### 1.2 权限管理

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.2.1 | http://127.0.0.1:3005/permission/roles | 1. 点击左侧菜单 "权限管理" 分组<br>2. 点击子菜单 "权限配置"（path="/permission/roles"） | - URL 为 `/permission/roles`<br>- 页面标题含 "权限配置"<br>- 存在角色列表表格 |
| 1.2.2 | http://127.0.0.1:3005/permission/users | 1. 点击子菜单 "后台用户管理"（path="/permission/users"） | - URL 为 `/permission/users`<br>- 页面标题含 "后台用户管理"<br>- 存在用户列表表格 |
| 1.2.3 | http://127.0.0.1:3005/permission/dicts | 1. 点击子菜单 "基础数据管理"（path="/permission/dicts"） | - URL 为 `/permission/dicts`<br>- 存在 Tabs 标签页<br>- 至少包含"求职方向"、"学校"、"公司名称"等字典类型 Tab |

### 1.3 新增学员

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.3.1 | http://127.0.0.1:3005/users/students | 1. 点击左侧菜单 "用户中心" 分组<br>2. 点击子菜单 "学生列表"（path="/users/students"） | - URL 为 `/users/students`<br>- PageHeader 标题为 "学员列表"<br>- 存在 "新增学员" 按钮（data-surface-trigger="modal-add-student"）<br>- 存在搜索 FilterBar<br>- 存在 a-table 数据表格 |
| 1.3.2 | 同上 | 1. 点击 "新增学员" 按钮<br>2. 等待 AddStudentModal 弹窗出现<br>3. 在弹窗中填写：<br>- 姓名：`E2E测试学员`<br>- 邮箱：`e2e-student@osg.test`<br>- 手机：`13800138099`<br>- 选择学校（下拉或输入）<br>- 选择专业<br>- 选择方向<br>- 合同课时：`30`<br>- 合同金额：`5000`<br>- 币种：`USD`<br>- 选择班主任 = 班主任李老师<br>- 选择助教 = 助教小赵<br>4. 点击 "保存" 提交 | - 出现 "新增学员成功" 消息提示<br>- 弹窗关闭<br>- 学员列表刷新<br>- 列表中出现 "E2E测试学员" |
| 1.3.3 | 同上 | 1. 在学员列表中找到 "E2E测试学员"<br>2. 点击该学员姓名链接（type="link"） | - StudentDetailModal 弹窗出现<br>- 显示姓名 "E2E测试学员"<br>- 显示邮箱 "e2e-student@osg.test"<br>- 显示班主任信息<br>- 显示助教信息<br>- 显示合同信息（30课时/$5000） |

### 1.3.🔗 跨端验证 — 学员可见性

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.3.4 | http://127.0.0.1:4000/login | 1. 在 Student 端登录页<br>2. 在 id="login-username" 输入 `e2e-student@osg.test`<br>3. 在 id="login-password" 输入 `Osg@2026`<br>4. 点击 id="login-btn" 登录按钮 | - 登录成功<br>- 跳转到 `/positions`（学生端默认首页）<br>- 页面正常显示 |
| 1.3.5 | http://127.0.0.1:3003/login | 1. Lead-Mentor 端登录<br>2. 在 id="login-username" 输入 `leadmentor@osg.test`<br>3. 在 id="login-password" 输入 `Osg@2026`<br>4. 点击 class="login-btn" 按钮 | - 登录成功，跳转首页 |
| 1.3.6 | http://127.0.0.1:3003/teaching/students | 1. 导航到 学员列表 | - 列表中出现 "E2E测试学员"<br>- 或能搜索到该学员 |
| 1.3.7 | http://127.0.0.1:3004/login | 1. Assistant 端登录<br>2. 在输入框输入 `testassistant@osg.test` / `Osg@2026`<br>3. 点击登录 | - 登录成功 |
| 1.3.8 | http://127.0.0.1:3004/students | 1. 导航到 学员列表 | - 列表中出现 "E2E测试学员" |

### 1.4 导师管理

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.4.1 | http://127.0.0.1:3005/users/staff | 1. Admin 端导航到 "用户中心" > "导师列表" | - URL 为 `/users/staff`<br>- PageHeader 标题 "导师列表"<br>- 存在 "新增导师" 按钮（data-surface-trigger="modal-add-staff"）<br>- 存在导师数据表格 |
| 1.4.2 | 同上 | 1. 点击 "新增导师" 按钮<br>2. 等待 StaffFormModal 弹窗<br>3. 填写：姓名、邮箱、类型选择<br>4. 验证类型下拉选项 | - 弹窗出现<br>- 类型下拉有 3 个选项："班主任"、"导师"、"助教" |
| 1.4.3 | http://127.0.0.1:3005/users/mentor-schedule | 1. 导航到 "用户中心" > "导师排期管理" | - URL 为 `/users/mentor-schedule`<br>- 页面标题含 "导师排期"<br>- 存在日历或排期列表 |

### 1.4.🔗 导师端验证

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.4.4 | http://127.0.0.1:3002/login | 1. Mentor 端登录<br>2. 输入 `testmentor@osg.test` / `Osg@2026`<br>3. 点击 class="login-btn" 登录 | - 登录成功<br>- 跳转到 `/dashboard` |

### 1.5 合同管理

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.5.1 | http://127.0.0.1:3005/users/contracts | 1. Admin 导航到 "用户中心" > "合同管理" | - URL 为 `/users/contracts`<br>- PageHeader 标题 "合同管理"<br>- 存在统计卡片（总合同数/有效合同/即将到期/已结束/合同总金额）<br>- 存在合同数据表格 |
| 1.5.2 | 同上 | 1. 在表格中找到学员小王（teststudent@osg.test）的合同<br>2. 点击学员姓名链接 | - ContractDetailModal 弹窗出现<br>- 显示合同金额/课时/日期/状态 |
| 1.5.3 | 同上 | 1. 点击某合同行的 "续签合同" 按钮（data-surface-trigger="modal-contract-renew"）<br>2. 在 RenewContractModal 弹窗中填写：<br>- 课时 = 50<br>- 金额 = 8000<br>- 币种 = USD<br>3. 点击提交 | - 出现续签成功消息<br>- 合同列表刷新<br>- 新合同出现在列表中 |
| 1.5.4 | 同上 | 1. 点击 "导出" 按钮 | - 浏览器下载 .xlsx 文件 |

### 1.6 求职中心管理

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.6.1 | http://127.0.0.1:3005/career/positions | 1. 导航到 "求职中心" > "岗位信息" | - URL 为 `/career/positions`<br>- 存在岗位列表/统计卡片 |
| 1.6.2 | 同上 | 1. 点击 "新增岗位" 或类似按钮<br>2. 填写：公司=Goldman Sachs，岗位=Analyst，地区=New York<br>3. 提交 | - 创建成功消息<br>- 岗位出现在列表中 |
| 1.6.3 | http://127.0.0.1:3005/career/student-positions | 1. 导航到 "求职中心" > "学生自添岗位" | - URL 为 `/career/student-positions`<br>- 页面正常加载<br>- 显示学员手动添加的岗位列表（可能为空） |
| 1.6.4 | http://127.0.0.1:3005/career/job-overview | 1. 导航到 "求职中心" > "学员求职总览" | - URL 为 `/career/job-overview`<br>- 页面正常加载 |
| 1.6.5 | http://127.0.0.1:3005/career/mock-practice | 1. 导航到 "求职中心" > "模拟应聘管理" | - URL 为 `/career/mock-practice`<br>- 模拟面试列表正确显示 |

### 1.6.🔗 跨端验证 — 岗位可见性

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.6.6 | http://127.0.0.1:4000/positions | 1. Student 端（小王账号已登录）<br>2. 导航到岗位信息页 | - 页面加载成功<br>- 能看到 "Goldman Sachs" 相关岗位 |
| 1.6.7 | http://127.0.0.1:3003/career/positions | 1. Lead-Mentor 端（已登录）<br>2. 导航到岗位信息 | - 能看到 "Goldman Sachs" 岗位 |
| 1.6.8 | http://127.0.0.1:3004/career/positions | 1. Assistant 端（已登录）<br>2. 导航到岗位信息 | - 能看到 "Goldman Sachs" 岗位 |

### 1.7 教学中心 + 个人中心

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 1.7.1 | http://127.0.0.1:3005/teaching/class-records | 1. 导航到 "教学中心" > "课程记录" | - URL 为 `/teaching/class-records`<br>- 课程记录列表正常加载 |
| 1.7.2 | http://127.0.0.1:3005/profile/logs | 1. 导航到 "个人中心" > "操作日志" | - URL 为 `/profile/logs`<br>- 操作日志列表正常显示 |
| 1.7.3 | （当前页面） | 1. 点击右上角用户头像区域<br>2. 在下拉菜单中点击 "个人设置" 按钮（data-surface-trigger="modal-setting"） | - ProfileModal 弹窗出现<br>- 可以查看/修改个人信息<br>- 弹窗可正常关闭 |

---

## 故事二：学员小王的求职之旅

### 2.1 学员登录

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.1.1 | http://127.0.0.1:4000/login | 1. 在 id="login-username" 输入 `teststudent@osg.test`<br>2. 在 id="login-password" 输入 `Osg@2026`<br>3. 点击 id="login-btn" 登录 | - 登录成功<br>- 跳转到 `/positions`（PHASE1_DEFAULT_PATH） |
| 2.1.2 | http://127.0.0.1:4000/login | 1. 点击 "忘记密码？" 链接（router-link to="/forgot-password"） | - 跳转到 `/forgot-password`<br>- 显示找回密码表单 |

### 2.2 岗位信息

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.2.1 | http://127.0.0.1:4000/positions | 1. 导航到岗位信息页面 | - URL 为 `/positions`<br>- 岗位列表正常显示<br>- 包含故事一中 Admin 创建的 Goldman Sachs 岗位 |
| 2.2.2 | 同上 | 1. 找到 Goldman Sachs 岗位<br>2. 点击 "收藏" 按钮 | - 收藏成功提示或图标状态改变 |
| 2.2.3 | 同上 | 1. 对 Goldman Sachs 岗位点击 "标记已投递" 或类似操作<br>2. 填写投递信息（日期/方式）<br>3. 提交 | - 投递状态更新 |
| 2.2.4 | 同上 | 1. 对已投递岗位记录面试进度<br>2. 选择进度阶段（如 Online Test → First Round）<br>3. 保存 | - 进度保存成功 |
| 2.2.5 | 同上 | 1. 点击 "申请辅导" 按钮 | - 辅导申请提交成功消息 |
| 2.2.6 | 同上 | 1. 找到 "手动添加岗位" 入口<br>2. 填写岗位信息<br>3. 提交 | - 添加成功<br>- 岗位出现在列表中 |

### 2.2.🔗 跨端验证

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.2.7 | http://127.0.0.1:3005/career/student-positions | 1. Admin 端查看 "学生自添岗位" | - 能看到小王手动添加的岗位 |
| 2.2.8 | http://127.0.0.1:3003/career/job-overview | 1. Lead-Mentor 端查看学员求职总览 | - 小王的投递数据出现 |
| 2.2.9 | http://127.0.0.1:3002/job-overview | 1. Mentor 端查看学员求职总览 | - 小王的投递数据出现 |
| 2.2.10 | http://127.0.0.1:3004/career/job-overview | 1. Assistant 端查看学员求职总览 | - 小王的投递数据出现 |

### 2.3 我的求职

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.3.1 | http://127.0.0.1:4000/applications | 1. 导航到 "我的求职"（路由 `/applications` 或 `/job-tracking`） | - URL 为 `/applications`<br>- 显示求职汇总（已收藏/已投递/面试中） |
| 2.3.2 | 同上 | 1. 按状态筛选 "已投递" | - Goldman Sachs 出现在结果中 |

### 2.4 模拟应聘

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.4.1 | http://127.0.0.1:4000/mock-practice | 1. 导航到 "模拟应聘"（路由 `/mock-practice`）<br>2. 提交模拟面试申请（选择类型/填写原因）<br>3. 提交 | - 申请提交成功<br>- 状态 = 待分配 |

### 2.4.🔗 跨端验证 — 模拟面试全链路

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.4.2 | http://127.0.0.1:3005/career/mock-practice | 1. Admin 端打开模拟应聘管理<br>2. 找到小王的待分配申请<br>3. 分配给导师张老师 | - 分配成功消息<br>- 状态变为 "已分配" |
| 2.4.3 | http://127.0.0.1:3002/mock-practice | 1. Mentor 端（张老师已登录）<br>2. 导航到模拟应聘管理<br>3. 找到分配给自己的任务<br>4. 点击 "确认" | - 状态变为 "已确认" |
| 2.4.4 | http://127.0.0.1:4000/mock-practice | 1. Student 端刷新模拟应聘页面 | - 状态 = 已确认<br>- 导师 = 导师张老师 |

### 2.5 课程记录

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.5.1 | http://127.0.0.1:4000/courses | 1. 导航到 "课程记录"（路由 `/courses` 或 `/myclass`） | - URL 为 `/courses`<br>- 课程列表正常显示（日期/导师/类型/时长） |
| 2.5.2 | 同上 | 1. 找到一条已完成课程<br>2. 点击评价<br>3. 打星 + 写反馈文字<br>4. 提交 | - 评价提交成功消息 |

### 2.5.🔗 跨端验证

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.5.3 | http://127.0.0.1:3002/courses | 1. Mentor 端（张老师）查看课程记录 | - 能看到学员的评价反馈 |

### 2.6 基本信息

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.6.1 | http://127.0.0.1:4000/profile | 1. 导航到 "基本信息"（路由 `/profile`） | - 个人资料正确显示<br>- 显示姓名、邮箱、学校等信息 |
| 2.6.2 | 同上 | 1. 修改某个可编辑字段（如手机号）<br>2. 保存 | - 保存成功消息 |

### 2.6.🔗 跨端验证

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 2.6.3 | http://127.0.0.1:3003/teaching/students | 1. Lead-Mentor 端查看小王学员详情 | - 信息与学员自己看到的一致 |

---

## 故事三：导师张老师的一天

### 3.1 导师登录

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 3.1.1 | http://127.0.0.1:3002/login | 1. 输入 `testmentor@osg.test`（placeholder="请输入用户名或邮箱"）<br>2. 输入 `Osg@2026`（placeholder="请输入密码"）<br>3. 点击 class="login-btn" 按钮 | - 登录成功<br>- 跳转到 `/dashboard` |
| 3.1.2 | http://127.0.0.1:3002/login | 1. 点击 "忘记密码？" → "点击重置"（router-link to="/forgot-password"） | - 跳转到 `/forgot-password`<br>- 显示找回密码表单 |

### 3.2 课程记录

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 3.2.1 | http://127.0.0.1:3002/courses | 1. 导航到 "课程记录" | - URL 为 `/courses`<br>- 显示自己的课程记录列表 |
| 3.2.2 | 同上 | 1. 点击 "新建" 按钮<br>2. 选择学员 = 学员小王<br>3. 填写上课内容/时长/类型<br>4. 提交 | - 创建成功消息<br>- 记录出现在列表中 |

### 3.2.🔗 跨端验证 — 课程记录 5 端联动

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 3.2.3 | http://127.0.0.1:4000/courses | 1. Student 端（小王）查看课程记录 | - 新记录出现在列表中 |
| 3.2.4 | http://127.0.0.1:3005/teaching/class-records | 1. Admin 端查看课程记录<br>2. 找到该记录并审核通过 | - 记录可见<br>- 审核通过操作成功 |
| 3.2.5 | http://127.0.0.1:3003/teaching/class-records | 1. Lead-Mentor 端查看课程记录 | - 该记录可见 |
| 3.2.6 | http://127.0.0.1:3004/class-records | 1. Assistant 端查看课程记录 | - 该记录可见 |

### 3.3 学员求职总览 + 模拟应聘

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 3.3.1 | http://127.0.0.1:3002/job-overview | 1. 导航到 "学员求职总览" | - URL 为 `/job-overview`<br>- 显示所辖学员的求职进度汇总 |
| 3.3.2 | http://127.0.0.1:3002/mock-practice | 1. 导航到 "模拟应聘管理" | - URL 为 `/mock-practice`<br>- 显示分配给自己的任务 |
| 3.3.3 | 同上 | 1. 查看在故事二中已确认的模拟面试记录 | - 状态 = 已确认<br>- 学员 = 学员小王<br>- 信息正确 |

### 3.4 个人中心

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 3.4.1 | http://127.0.0.1:3002/profile | 1. 导航到 "基本信息"（路由 `/profile`） | - 个人资料正确<br>- 可编辑部分字段 |
| 3.4.2 | http://127.0.0.1:3002/schedule | 1. 导航到 "课程排期"（路由 `/schedule`） | - URL 为 `/schedule`<br>- 日历/列表视图显示排课 |

### 3.4.🔗 跨端验证

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 3.4.3 | http://127.0.0.1:3005/users/mentor-schedule | 1. Admin 端查看导师排期管理<br>2. 找到导师张老师 | - 排期数据与导师端一致 |

---

## 故事四：班主任李老师管理学员

> 💡 助教端（小赵）功能与班主任端一致，每个步骤包含镜像验证。

### 4.1 登录

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 4.1.1 | http://127.0.0.1:3003/login | 1. 在 id="login-username" 输入 `leadmentor@osg.test`<br>2. 在 id="login-password" 输入 `Osg@2026`<br>3. 点击 class="login-btn" 按钮 | - 登录成功<br>- 跳转到 `/home` |
| 4.1.2 | http://127.0.0.1:3003/login | 1. 点击 "点击重置" 链接（data-surface-trigger="modal-forgot-password"） | - 出现忘记密码弹窗<br>- 弹窗含邮箱输入步骤 |
| 4.1.3 | http://127.0.0.1:3004/login | 1. Assistant 端登录<br>2. 输入 `testassistant@osg.test` / `Osg@2026`<br>3. 点击登录 | - 登录成功<br>- 跳转到 `/home` |
| 4.1.4 | http://127.0.0.1:3004/forgot-password | 1. 导航到忘记密码页面 | - 显示找回密码表单 |

### 4.2 学员列表

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 4.2.1 | http://127.0.0.1:3003/teaching/students | 1. Lead-Mentor 端导航到学员列表 | - 显示所辖学员<br>- 包含学员小王 |
| 4.2.2 | 同上 | 1. 点击学员小王查看详情 | - 学员档案完整：个人信息/合同/课时 |
| 4.2.3 | http://127.0.0.1:3004/students | 1. Assistant 端导航到学员列表 | - 同样能看到所辖学员<br>- 包含学员小王 |

### 4.2.🔗 跨端数据一致

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 4.2.4 | http://127.0.0.1:4000/profile | 1. Student 端（小王）查看基本信息 | - 信息与班主任/助教端看到的一致 |

### 4.3 求职中心

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 4.3.1 | http://127.0.0.1:3003/career/positions | 1. Lead-Mentor 端查看岗位信息 | - 岗位列表正确加载 |
| 4.3.2 | http://127.0.0.1:3003/career/job-overview | 1. 查看学员求职总览 | - 所辖学员求职进度汇总 |
| 4.3.3 | http://127.0.0.1:3003/career/mock-practice | 1. 查看模拟应聘管理 | - 模拟面试列表正确 |
| 4.3.4 | http://127.0.0.1:3004/career/positions | 1. 🔗 Assistant 端查看岗位信息 | - 岗位列表正确 |
| 4.3.5 | http://127.0.0.1:3004/career/job-overview | 1. 🔗 Assistant 端查看学员求职总览 | - 汇总数据正确 |
| 4.3.6 | http://127.0.0.1:3004/career/mock-practice | 1. 🔗 Assistant 端查看模拟应聘管理 | - 列表正确 |

### 4.3.🔗 实时联动验证

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 4.3.7 | http://127.0.0.1:4000/positions | 1. Student 端（小王）标记投递一个新岗位 | - 投递成功 |
| 4.3.8 | http://127.0.0.1:3003/career/job-overview | 1. Lead-Mentor 端刷新学员求职总览 | - 小王投递数 +1 |
| 4.3.9 | http://127.0.0.1:3004/career/job-overview | 1. 🔗 Assistant 端刷新学员求职总览 | - 小王投递数 +1 |

### 4.4 课程记录

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 4.4.1 | http://127.0.0.1:3003/teaching/class-records | 1. Lead-Mentor 端查看课程记录 | - 所辖学员课程记录列表正常 |
| 4.4.2 | http://127.0.0.1:3004/class-records | 1. 🔗 Assistant 端查看课程记录 | - 课程记录列表正确 |

### 4.4.🔗 跨端一致

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 4.4.3 | http://127.0.0.1:3002/courses | 1. Mentor 端查看课程记录 | - 同一条记录在导师/班主任/助教端一致 |

### 4.5 个人中心 + 排期

| # | URL | 操作 | 断言 |
|---|-----|------|------|
| 4.5.1 | http://127.0.0.1:3003/profile/basic | 1. Lead-Mentor 端查看基本信息 | - 个人资料正确 |
| 4.5.2 | http://127.0.0.1:3003/profile/schedule | 1. 查看课程排期 | - 排课日历正确 |
| 4.5.3 | http://127.0.0.1:3004/profile | 1. 🔗 Assistant 端查看基本信息 | - 个人资料正确 |
| 4.5.4 | http://127.0.0.1:3004/schedule | 1. 🔗 Assistant 端查看课程排期 | - 排课日历正确 |

---

## 附录 A：各端路由速查表

### Admin (port 3005)

| 功能 | 路由 | 菜单路径 |
|------|------|---------|
| 登录 | `/login` | - |
| 权限配置 | `/permission/roles` | 权限管理 > 权限配置 |
| 后台用户管理 | `/permission/users` | 权限管理 > 后台用户管理 |
| 基础数据管理 | `/permission/dicts` | 权限管理 > 基础数据管理 |
| 学员列表 | `/users/students` | 用户中心 > 学生列表 |
| 合同管理 | `/users/contracts` | 用户中心 > 合同管理 |
| 导师列表 | `/users/staff` | 用户中心 > 导师列表 |
| 导师排期管理 | `/users/mentor-schedule` | 用户中心 > 导师排期管理 |
| 岗位信息 | `/career/positions` | 求职中心 > 岗位信息 |
| 学生自添岗位 | `/career/student-positions` | 求职中心 > 学生自添岗位 |
| 学员求职总览 | `/career/job-overview` | 求职中心 > 学员求职总览 |
| 模拟应聘管理 | `/career/mock-practice` | 求职中心 > 模拟应聘管理 |
| 课程记录 | `/teaching/class-records` | 教学中心 > 课程记录 |
| 操作日志 | `/profile/logs` | 个人中心 > 操作日志 |

### Student (port 4000)

| 功能 | 路由 |
|------|------|
| 登录 | `/login` |
| 忘记密码 | `/forgot-password` |
| 岗位信息 | `/positions` ← 默认首页 |
| 我的求职 | `/applications` 或 `/job-tracking` |
| 模拟应聘 | `/mock-practice` 或 `/request` |
| 课程记录 | `/courses` 或 `/myclass` |
| 基本信息 | `/profile` |

> ⚠️ 学生端有路由守卫：只有 STUDENT_AVAILABLE_PATHS 中的路由可访问，其他会跳转到 "敬请期待" 页面

### Mentor (port 3002)

| 功能 | 路由 |
|------|------|
| 登录 | `/login` |
| 忘记密码 | `/forgot-password` |
| 课程记录 | `/courses` |
| 学员求职总览 | `/job-overview` |
| 模拟应聘管理 | `/mock-practice` |
| 基本信息 | `/profile` |
| 课程排期 | `/schedule` |

### Lead-Mentor (port 3003)

| 功能 | 路由 |
|------|------|
| 登录 | `/login` |
| 忘记密码 | 登录页内弹窗（data-surface-trigger="modal-forgot-password"） |
| 岗位信息 | `/career/positions` |
| 学员求职总览 | `/career/job-overview` |
| 模拟应聘管理 | `/career/mock-practice` |
| 学员列表 | `/teaching/students` |
| 课程记录 | `/teaching/class-records` |
| 基本信息 | `/profile/basic` |
| 课程排期 | `/profile/schedule` |

### Assistant (port 3004)

| 功能 | 路由 |
|------|------|
| 登录 | `/login` |
| 忘记密码 | `/forgot-password` |
| 岗位信息 | `/career/positions` |
| 学员求职总览 | `/career/job-overview` |
| 模拟应聘管理 | `/career/mock-practice` |
| 学员列表 | `/students` |
| 课程记录 | `/class-records` |
| 基本信息 | `/profile` |
| 课程排期 | `/schedule` |

---

## 附录 B：关键选择器参考

### Admin 登录页
- 用户名输入框：`input[placeholder="请输入用户名"]`
- 密码输入框：`input[placeholder="请输入密码"]`（a-input-password 渲染）
- 验证码输入框：`input[placeholder="请输入验证码"]`
- 登录按钮：`button.login-btn`
- 忘记密码：`a.forgot-link`

### Student 登录页
- 用户名输入框：`#login-username`
- 密码输入框：`#login-password`
- 登录按钮：`#login-btn`
- 忘记密码：`a[href="/forgot-password"]` (router-link)

### Mentor 登录页
- 用户名输入框：`input[placeholder="请输入用户名或邮箱"]`
- 密码输入框：`input[placeholder="请输入密码"]`
- 登录按钮：`button.login-btn`
- 忘记密码：`a[href="/forgot-password"]` (router-link)

### Lead-Mentor 登录页
- 用户名输入框：`#login-username`
- 密码输入框：`#login-password`
- 登录按钮：`button.login-btn`
- 忘记密码：`a[data-surface-trigger="modal-forgot-password"]`

### Assistant 登录页
- 用户名输入框：`#login-username`
- 密码输入框：`#login-password`
- 登录按钮：`#login-btn`
- 忘记密码：`a[href="/forgot-password"]` (router-link)
- 登录 URL：`http://127.0.0.1:3004/login`

### Admin 关键按钮
- 新增学员：`button[data-surface-trigger="modal-add-student"]`
- 新增导师：`button[data-surface-trigger="modal-add-staff"]`
- 新增合同：`button[data-surface-trigger="modal-add-contract"]`
- 续签合同：`button[data-surface-trigger="modal-contract-renew"]`
- 学员详情：点击学员姓名 `button[type="link"]` 或操作列 "详情"
- 导师详情：`button[data-surface-trigger="modal-staff-detail"]`

---

## 附录 C：API 端点参考

| 操作 | 方法 | 端点 | 备注 |
|------|------|------|------|
| Admin 登录 | POST | `/login` | 需 code + uuid |
| 获取验证码 | GET | `/captchaImage` | 返回 img + uuid |
| Student 登录 | POST | `/student/login` | 无验证码 |
| Mentor 登录 | POST | `/mentor/login` | 无验证码 |
| Lead-Mentor 登录 | POST | `/lead-mentor/login` | 无验证码 |
| Assistant 登录 | POST | `/assistant/login` | 无验证码 |
| 学员列表 | GET | `/admin/student/list` | |
| 创建学员 | POST | `/admin/student` | |
| 导师列表 | GET | `/admin/staff/list` | |
| 创建导师 | POST | `/admin/staff` | |
| 合同列表 | GET | `/admin/contract/list` | |
| 续签合同 | POST | `/admin/contract/renew` | |
| 岗位列表 | GET | `/admin/position/list` | |
| 课程记录 | GET | `/admin/class-record/list` | |
