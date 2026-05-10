# 三端课消上报 reference 锚点修订方案

- **关联主文档**：`docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md`
- **关联 Story**：S-053 / S-055 / S-056 / S-057
- **核心修订**：岗位辅导课消从绑定 `application_id` 修正为绑定 `coaching_id`

---

## 1. 当前主文档口径

5/9 主文档当前设计：

```text
课程类型 = 岗位辅导
reference_type = application
reference_id = application.id
```

并据此定义：

- 最近评分；
- 已上报课消数；
- 查看详情；
- ②栏上报课消预填；
- validator 的 reference 归属校验。

---

## 2. 产品口径修订后目标

岗位辅导应绑定具体阶段级辅导申请：

```text
course_type = job_coaching
reference_type = job_coaching
reference_id = coaching_id
```

含义：

- 一条课消记录属于某一次阶段辅导申请；
- 同一个岗位下不同阶段的课消不会混在一起；
- 最近评分、已上报课消数和详情都只围绕当前 `coaching_id` 计算。

---

## 3. 常量修订

### 3.1 后端常量

建议 `OsgClassReportConstants` 中 reference type 保留或新增：

```text
REFERENCE_TYPE_JOB_COACHING = job_coaching
REFERENCE_TYPE_MOCK_INTERVIEW = mock_interview
REFERENCE_TYPE_RELATION_TEST = relation_test
REFERENCE_TYPE_COMMUNICATION_TEST = communication_test
```

如当前已有 `application`，需要确认是否：

- 作为历史兼容值保留；或
- 后续新增迁移/兼容读取逻辑；或
- 新数据不再使用。

### 3.2 前端常量

`shared/src/constants/classReport.ts` 中课程类型与 reference 类型映射应为：

| course_type | reference_type |
|---|---|
| `job_coaching` | `job_coaching` |
| `mock_interview` | `mock_interview` |
| `relation_test` | `relation_test` |
| `communication_test` | `communication_test` |
| `base_course` | null |

---

## 4. 弹窗流程修订

### 4.1 主路径

三端上报课程记录时：

1. 选择学员；
2. 选择课程类型；
3. 如果课程类型为岗位辅导，选择该学员下当前用户可见的辅导申请；
4. 提交时携带 `reference_type=job_coaching` 和 `reference_id=coaching_id`。

### 4.2 ②栏反向预填路径

从求职总览「待辅导的学员」点击上报课消时：

- 当前行主键应为 `coaching_id`；
- 弹窗反推并锁定：

```text
course_type = job_coaching
reference_type = job_coaching
reference_id = coaching_id
```

- 学员、课程类型、关联申请 readonly；
- 学员状态及后续字段可编辑。

---

## 5. reference candidates 修订

岗位辅导候选项不再返回求职申请，而应返回辅导申请。

候选项展示模板仍可使用业务友好文案：

```text
公司 / 岗位 / 阶段 / 面试时间
```

但数据主键必须是：

```text
coachingId
```

建议返回结构：

```json
{
  "referenceType": "job_coaching",
  "referenceId": 101,
  "applicationId": 1,
  "studentId": 2001,
  "companyName": "...",
  "positionName": "...",
  "interviewStage": "first_round",
  "interviewStageLabel": "First Round",
  "interviewTime": "..."
}
```

---

## 6. validator 修订

### 6.1 course_type 与 reference_type 一致性

修订前：

```text
job_coaching -> application
```

修订后：

```text
job_coaching -> job_coaching
```

### 6.2 reference 归属校验

当 `reference_type=job_coaching`：

- 根据 `reference_id` 查询 `osg_coaching.coaching_id`；
- 校验 `coaching.student_id == class_record.student_id`；
- mentor 端校验当前用户在 `coaching.mentor_ids` 中；
- lead-mentor 端校验当前用户可管理该 coaching 对应的 application/student；
- assistant 端校验当前用户可管理该 student。

### 6.3 旷课分支

课程类型不是基础课时，即使旷课也应携带具体 reference。

岗位辅导旷课时：

```text
reference_type = job_coaching
reference_id = coaching_id
member_status = absent
```

旷课记录参与当前 `coaching_id` 的已上报课消数统计，但不参与最近评分。

---

## 7. 统计修订

### 7.1 已上报课消数

```text
COUNT(*)
WHERE reference_type = 'job_coaching'
  AND reference_id = coaching_id
```

包含：

- 正常上课；
- 旷课；
- 当前辅导申请下所有导师上报的记录。

### 7.2 最近评分

```text
SELECT rate
WHERE reference_type = 'job_coaching'
  AND reference_id = coaching_id
  AND member_status = 'normal'
  AND rate IS NOT NULL
  AND rate <> ''
ORDER BY class_date DESC
LIMIT 1
```

### 7.3 查看详情

```text
SELECT *
FROM osg_class_record
WHERE reference_type = 'job_coaching'
  AND reference_id = coaching_id
ORDER BY class_date DESC
```

---

## 8. 对现有 Story/Ticket 的影响

### 8.1 S-053

S-053 已完成 DB schema 和常量基础设施。

需要检查：

- `reference_type` 是否允许 `job_coaching`；
- 常量里是否仍用 `application` 表达岗位辅导；
- 字典或前端常量是否需要补 `job_coaching` reference type。

### 8.2 S-055

S-055 是公共抽取，原则上组件结构和 API 封装可以保留。

需要修订：

- `useReferenceFinder` 返回岗位辅导候选时返回 coaching；
- shared 类型中的 reference option 使用 `coachingId` 作为岗位辅导 reference。

### 8.3 S-056

S-056 弹窗业务实现大多可保留。

需要修订：

- AC-S-056-02 的“岗位辅导→求职申请”改为“岗位辅导→辅导申请”；
- AC-S-056-03 的 `applicationId` 预填改为 `coachingId` 预填；
- AC-S-056-05 的“同一 application 重复上报”改为“同一 coaching 重复上报”。

### 8.4 T-433 / T-520 / T-521

validator 相关 ticket 需要重点修订：

- `job_coaching → application` 改为 `job_coaching → job_coaching`；
- `selectCoachingByApplicationId(referenceId)` 改为按 `coachingId` 查询；
- 权限校验围绕 `coaching_id`。

---

## 9. 兼容策略

如果已有数据已经写入：

```text
reference_type = application
reference_id = application_id
```

可选择：

### 方案 A：新数据使用新口径，旧数据不回填

优点：风险小。

缺点：旧课消不出现在新 coaching 详情中。

### 方案 B：补迁移脚本把旧 application 课消迁到唯一 coaching

前提：某个 application 下只有一条 coaching 时可安全迁移。

风险：如果已存在多条 coaching，无法自动判断旧课消归属哪个阶段。

建议第一版采用方案 A，除非产品明确要求历史数据完整迁移。

---

## 10. 验收标准修订草案

- 岗位辅导课消提交后，`reference_type=job_coaching`。
- 岗位辅导课消 `reference_id` 是 `coaching_id`，不是 `application_id`。
- 求职总览待辅导栏点击上报课消时预填当前 `coaching_id`。
- validator 拒绝 `course_type=job_coaching` 但 `reference_type=application` 的新提交。
- 同一岗位下两个不同阶段的辅导申请，课消数和最近评分互不串数据。
- 学生端查看某条辅导申请详情时，只看到该 `coaching_id` 下的课消。
