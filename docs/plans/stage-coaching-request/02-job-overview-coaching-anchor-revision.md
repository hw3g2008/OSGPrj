# 求职总览 coaching 锚点修订方案

- **关联主文档**：`docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md`
- **关联 Story**：S-054 班主任端学员求职总览三栏改造
- **修订目标**：保留页面结构和三栏业务，但将行维度从 `application` 修正为阶段级 `coaching` 申请

---

## 1. 为什么需要修订

现有 S-054 文档口径：

```text
行维度：application
最近评分：reference_type=application AND reference_id=application.id
已上报课消数：application 维度统计
分配导师：/{applicationId}/assign-mentor
```

产品确认后的真实业务：

```text
同一个岗位 application 下可以有多次阶段辅导申请 coaching。
每次 coaching 可以分配不同导师。
课消、评分、详情应归属于具体 coaching。
```

因此求职总览页面不能继续只按 `application_id` 作为业务行主键。

---

## 2. 保留内容

5/9 主文档中以下内容保留：

- 班主任端仍分三栏：
  - 我管理的学员
  - 待辅导的学员
  - 待分配导师
- 默认打开「我管理的学员」。
- 「我管理的学员」展示面试日历。
- 筛选项保留：公司、面试阶段、面试时间；待辅导栏额外保留是否上报课消。
- 列结构基本保留：学生 ID、学生姓名、岗位、公司、城市、面试阶段、面试时间、导师、最近评分、已上报课消数、提交时间。
- 查看详情仍展示导师填写的多条课消详情。
- 分配导师操作仍只在待分配导师栏出现。

---

## 3. 需要修订的核心口径

### 3.1 行维度

修订前：

```text
application 维度
```

修订后：

```text
coaching 维度
```

即：

```text
一条岗位下有几个阶段辅导申请，总览里就可以出现几行。
```

### 3.2 主键

前端表格 row key 建议从：

```text
applicationId
```

修正为：

```text
coachingId
```

同时保留 `applicationId` 作为父记录字段，用于展示岗位信息和反查岗位。

### 3.3 详情锚点

修订前：

```text
GET /lead-mentor/job-overview/{applicationId}
```

修订后建议：

```text
GET /lead-mentor/job-overview/coachings/{coachingId}
```

或保留旧路径兼容，但内部必须能定位到具体 `coachingId`。

---

## 4. 班主任端三栏修订

### 4.1 我管理的学员

范围：

```text
osg_job_application.lead_mentor_id = 当前用户
JOIN osg_coaching ON coaching.application_id = application.application_id
```

字段：

- 学生 ID
- 学生姓名
- 岗位
- 公司
- 城市
- 面试阶段
- 面试时间
- 导师
- 最近评分
- 操作：查看详情

最近评分按 `coaching_id` 聚合。

### 4.2 待辅导的学员

范围：

```text
osg_coaching.mentor_ids 包含当前用户
```

字段：

- 学生 ID
- 学生姓名
- 岗位
- 公司
- 城市
- 面试阶段
- 面试时间
- 已上报课消数
- 操作：上报课消

点击上报课消时，预选当前 `coaching_id`。

### 4.3 待分配导师

范围：

```text
osg_job_application.lead_mentor_id = 当前用户
AND osg_coaching.status = pending
AND osg_coaching.mentor_ids 为空
```

字段：

- 学生 ID
- 学生姓名
- 岗位
- 公司
- 城市
- 面试阶段
- 面试时间
- 提交时间
- 操作：分配导师

提交时间应使用辅导申请提交时间，而不是岗位投递时间。

---

## 5. 助教端与导师端求职总览

### 5.1 助教端

用户需求：助教端只显示一栏「我管理的学员」。

范围建议：

```text
student.assistant_id / assistant_ids 包含当前用户
JOIN application
JOIN coaching
```

行维度：`coaching_id`。

列：

- 学生 ID
- 学生姓名
- 岗位
- 公司
- 城市
- 面试阶段
- 面试时间
- 导师
- 最近评分
- 操作：查看详情

### 5.2 导师端

用户需求：导师端只显示一栏「待辅导的学员」。

范围建议：

```text
osg_coaching.mentor_ids 包含当前导师
```

行维度：`coaching_id`。

列：

- 学生 ID
- 学生姓名
- 岗位
- 公司
- 城市
- 面试阶段
- 面试时间
- 已上报课消数
- 操作：上报课消

---

## 6. 分配导师数量限制

用户明确提出：

```text
班主任端分配导师的时候要根据填写的分配导师数去分配，目前分配数量没有限制。
```

修订规则：

```text
选择导师数量必须等于 coaching.requested_mentor_count
```

建议前后端双层校验：

- 前端：选择数量不一致时禁用确认或提示；
- 后端：`assignMentors(coachingId, payload)` 中强制校验，不满足则返回业务错误。

---

## 7. 统计口径

### 7.1 最近评分

```text
osg_class_record.reference_type = job_coaching
osg_class_record.reference_id = coaching_id
member_status = normal
rate IS NOT NULL AND rate <> ''
按 class_date DESC 取第一条
```

### 7.2 已上报课消数

```text
osg_class_record.reference_type = job_coaching
osg_class_record.reference_id = coaching_id
```

包含旷课记录，包含该辅导申请下所有导师上报的记录。

### 7.3 查看详情

只展示当前 `coaching_id` 下的课消记录。

如需按导师分组，分组范围仍限定在当前 `coaching_id`。

---

## 8. 对 S-054 的影响

S-054 的页面布局、三栏和多数 UI 验收可保留。

需要修订的点：

- AC 中的 “application 维度” 改为 “coaching 维度”；
- `reference_type=application` 改为 `reference_type=job_coaching`；
- `reference_id=application.id` 改为 `reference_id=coaching.id`；
- 待分配导师栏的提交时间从 `application.submitted_at` 改为 `coaching.submitted_at/create_time`；
- 分配导师接口从 `applicationId` 语义迁移为 `coachingId`；
- 多 mentor 统计一致性从 application 维度调整为 coaching 维度。

---

## 9. 验收标准修订草案

- 班主任端「我管理的学员」同一岗位下多个辅导申请显示为多行。
- 每行的面试阶段、面试时间、城市、导师来自当前 `coaching`。
- 最近评分只统计当前 `coaching_id` 下的正常上课评分。
- 查看详情只展示当前 `coaching_id` 下的课消详情。
- 待辅导栏只展示当前用户被分配的 `coaching`。
- 待分配栏只展示未分配导师的 `coaching`。
- 分配导师时选择数量必须等于申请导师数量。
- 助教端和导师端求职总览同样按 `coaching_id` 作为行维度。
