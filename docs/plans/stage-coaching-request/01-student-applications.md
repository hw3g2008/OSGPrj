# 学生端「我的求职」阶段级辅导申请方案

- **优先级**：P1
- **范围**：学生端「我的求职」页面、申请辅导、岗位行展开、辅导详情与修改
- **核心对象**：`osg_job_application` 作为岗位父记录，`osg_coaching` 作为阶段级辅导申请子记录

---

## 1. 业务目标

学生端「我的求职」列表展示学生已求职的岗位。

每个岗位行只表达岗位本身，学生可以针对该岗位的不同面试阶段多次申请辅导。

申请辅导后，岗位行可以展开显示该岗位下的辅导申请记录。

---

## 2. 主表：岗位行

### 2.1 行维度

行维度：`application_id`。

一行表示学生已求职/已投递的一个岗位。

### 2.2 展示字段

岗位行显示：

- 岗位名称
- 公司
- 行业
- 岗位分类
- 地区
- 招聘周期
- 投递时间
- 求职状态

### 2.3 操作区

操作区只有一个按钮：

- 申请辅导

点击后打开申请辅导弹窗。

---

## 3. 申请辅导弹窗

### 3.1 可申请面试阶段

学生可以申请以下阶段的辅导：

1. HireVue or Online Test（在线测试）
2. Screening Call（Phone Screen / HR Screen / Initial Call / Recruiter Call）
3. First Round
4. Second Round
5. Third Round and Beyond
6. Case study Round
7. Superday / Assessment Centre / AC

### 3.2 表单字段

建议字段：

- 面试阶段
- 面试时间
- 城市
- 公司面试官
- 申请导师数量
- 备注/辅导需求
- 偏好导师
- 排除导师

其中「公司面试官」来自用户需求中的“公司的面试官可以修改”，应作为该次辅导申请的可编辑字段。

### 3.3 提交行为

提交后新增一条阶段级辅导申请。

建议写入：

```text
osg_coaching.application_id = 当前岗位 application_id
osg_coaching.student_id = 当前学生
osg_coaching.interview_stage = 表单面试阶段
osg_coaching.interview_time = 表单面试时间
osg_coaching.city = 表单城市
osg_coaching.company_interviewer = 表单公司面试官
osg_coaching.requested_mentor_count = 表单申请导师数量
osg_coaching.status = pending
```

不要覆盖岗位父记录的 `current_stage` 来表达本次辅导阶段。

---

## 4. 展开行：辅导申请记录

### 4.1 行维度

展开行维度：`coaching_id`。

一条记录表示该岗位下的一次阶段辅导申请。

### 4.2 展示字段

辅导记录行显示：

- 面试阶段
- 面试时间
- 城市
- 导师
- 最近评分
- 操作栏

### 4.3 最近评分

最近评分应从当前 `coaching_id` 下的课消记录中取。

建议口径：

```text
reference_type = job_coaching
reference_id = coaching_id
member_status = normal
rate IS NOT NULL AND rate <> ''
按 class_date DESC 取第一条
```

无符合记录显示 `-`。

---

## 5. 查看详情

### 5.1 操作入口

辅导记录行操作栏包含：

- 查看详情

### 5.2 详情内容

详情展示导师填写的课消详情。

查询范围：当前 `coaching_id` 下的全部课消记录。

建议展示：

- 上课日期
- 课时时长
- 导师
- 学员状态
- 评分
- 反馈内容
- 旷课备注
- 附件/截图

### 5.3 多条课消

一条辅导申请可以有多条课消记录。

详情应按上课日期倒序展示。

---

## 6. 修改

### 6.1 操作入口

辅导记录行操作栏包含：

- 修改

### 6.2 可修改字段

用户明确要求：修改只能修改：

- 面试时间
- 公司面试官

### 6.3 不可修改字段

以下字段不在学生修改范围：

- 面试阶段
- 导师
- 状态
- 已上报课消
- 评分

### 6.4 状态限制

建议第一版不增加复杂状态限制，只要业务允许学生更新面试安排，就允许修改上述两个字段。

如产品后续要求，可单独补充“已完成/已取消不可修改”等规则。

---

## 7. 后端接口建议

### 7.1 列表接口

学生端我的求职列表返回岗位父记录，并附带辅导申请子记录。

建议结构：

```json
{
  "applicationId": 1,
  "positionName": "...",
  "companyName": "...",
  "industryLabel": "...",
  "categoryLabel": "...",
  "regionLabel": "...",
  "recruitmentCycle": "...",
  "submittedAt": "...",
  "applicationStatus": "...",
  "coachings": [
    {
      "coachingId": 101,
      "interviewStage": "first_round",
      "interviewStageLabel": "First Round",
      "interviewTime": "...",
      "cityLabel": "...",
      "mentorNames": "...",
      "latestRating": "..."
    }
  ]
}
```

### 7.2 新增辅导申请接口

建议：

```text
POST /student/applications/{applicationId}/coachings
```

提交一次阶段级辅导申请。

### 7.3 修改辅导申请接口

建议：

```text
PUT /student/applications/{applicationId}/coachings/{coachingId}
```

只接受：

- `interviewTime`
- `companyInterviewer`

### 7.4 查看详情接口

建议：

```text
GET /student/applications/{applicationId}/coachings/{coachingId}/class-records
```

返回当前辅导申请下导师填写的课消详情。

---

## 8. 与现有代码的关系

当前实现里：

- 学生申请辅导主要更新 `osg_job_application.coaching_status/current_stage`；
- 导师分配按 `applicationId` 找一条 `osg_coaching`；
- 课消统计多处按 `applicationId` 聚合。

后续应增量校正为：

- 学生申请辅导新增 `osg_coaching`；
- 同一个 `applicationId` 下允许多条 `osg_coaching`；
- 学生端展开行读取 `coaching` 列表；
- 课消详情和最近评分按 `coaching_id` 查询。

---

## 9. 验收标准草案

- 学生端我的求职主表按岗位维度展示 8 个字段。
- 每行操作区只显示「申请辅导」。
- 点击申请辅导可选择 7 个面试阶段之一。
- 同一个岗位可以连续申请多个不同阶段的辅导。
- 申请后岗位行可展开，展示多条辅导记录。
- 每条辅导记录显示面试阶段、面试时间、城市、导师、最近评分。
- 查看详情只展示当前辅导申请下的课消记录。
- 修改只允许修改面试时间和公司面试官。
- 不同辅导申请可以分配不同导师。
- 课消与评分不会在同一岗位的不同辅导申请之间串数据。
