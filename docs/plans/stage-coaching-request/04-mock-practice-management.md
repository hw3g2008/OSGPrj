# 模拟应聘管理需求方案

- **范围**：导师端、班主任端、助教端、后台模拟应聘管理
- **核心对象**：`osg_mock_practice`
- **与岗位辅导区别**：模拟应聘本身就是一次申请一条记录，不需要 `application -> coaching` 父子结构

---

## 1. 统一口径

模拟应聘类业务包括：

- 模拟面试
- 人际关系
- 模拟期中考试

这些记录本身可由 `osg_mock_practice` 表示。

课消上报时 reference 口径：

| 课程类型 | reference_type | reference_id |
|---|---|---|
| 模拟面试 | `mock_interview` | `practice_id` |
| 人际关系 | `relation_test` | `practice_id` |
| 模拟期中考试 | `communication_test` | `practice_id` |

---

## 2. 导师端【模拟应聘管理】

### 2.1 页面调整

用户需求：删除统计卡片。

页面保留：

- 筛选
- 列表

### 2.2 筛选项

筛选：

- 公司
- 面试阶段
- 面试时间
- 是否上报课消

说明：如果模拟应聘数据中没有“公司/面试阶段/面试时间”字段，需要确认字段来源或映射关系；不应硬拼不存在字段。

### 2.3 列表字段

列表字段：

- 学生 ID
- 学生姓名
- 类型
- 分配时间
- 已上报课消数
- 操作：上报课消

### 2.4 数据范围

导师端只展示当前导师被分配的模拟应聘记录：

```text
osg_mock_practice.mentor_ids 包含当前导师
```

---

## 3. 班主任端【模拟应聘管理】

### 3.1 页面调整

用户需求：删除统计卡片。

页面分三栏，默认第一栏：

1. 我管理的学员
2. 待辅导的学员
3. 待分配导师

### 3.2 我管理的学员

筛选：

- 类型

列表字段：

- 学生 ID
- 学生姓名
- 类型
- 申请时间
- 辅导老师
- 已上报课消数
- 操作：详情

详情：导师上报的多条课消反馈。

数据范围建议：

```text
student.lead_mentor_id / lead_mentor_ids 包含当前班主任
JOIN osg_mock_practice
```

### 3.3 待辅导的学员

筛选：

- 类型

列表字段：

- 学生 ID
- 学生姓名
- 类型
- 申请时间
- 辅导老师
- 操作：上报课消

数据范围建议：

```text
osg_mock_practice.mentor_ids 包含当前班主任
```

### 3.4 待分配导师

列表字段：

- 学生 ID
- 学生姓名
- 类型
- 申请时间
- 操作：分配导师

数据范围建议：

```text
student.lead_mentor_id / lead_mentor_ids 包含当前班主任
AND osg_mock_practice.mentor_ids 为空
AND osg_mock_practice.status 为待分配类状态
```

---

## 4. 助教端【模拟应聘管理】

### 4.1 页面调整

用户需求：删除统计卡片。

只显示一栏：

- 我管理的学员

### 4.2 筛选项

筛选：

- 类型

### 4.3 列表字段

列表字段：

- 学生 ID
- 学生姓名
- 类型
- 申请时间
- 辅导老师
- 已上报课消数
- 操作：详情

详情展示导师上报的多条课消反馈。

### 4.4 数据范围

```text
student.assistant_id / assistant_ids 包含当前助教
JOIN osg_mock_practice
```

---

## 5. 后台【模拟应聘管理】

用户需求：

```text
后台模拟应聘管理默认显示全部记录列
```

建议明确：

- 默认不过滤状态；
- 默认展示全部模拟应聘记录；
- 仍保留筛选条件；
- 不因当前管理员角色只看部分记录。

---

## 6. 分配导师数量限制

用户需求中明确：

```text
班主任端分配导师的时候要根据填写的分配导师数去分配，目前分配数量没有限制
```

该规则同样适用于模拟应聘。

建议：

```text
选择导师数量 == mock_practice.requested_mentor_count / mentor_count
```

如果现有字段命名不同，应以真实表字段为准。

前端和后端都要校验。

---

## 7. 课消详情与统计

### 7.1 已上报课消数

按 practice 维度统计：

```text
reference_type IN ('mock_interview', 'relation_test', 'communication_test')
AND reference_id = practice_id
```

### 7.2 详情

详情展示该 `practice_id` 下的多条课消反馈。

按上课日期倒序。

### 7.3 最近评分

如页面需要最近评分，按同一 `practice_id` 下正常上课且有评分的课消记录取最新。

---

## 8. 与三端课消弹窗的关系

模拟应聘上报课消应复用 S-055/S-056 已抽取的 shared 弹窗。

从模拟应聘管理列表点击“上报课消”时：

- 根据当前记录类型反推 `course_type`；
- 预填并锁定 `reference_type/reference_id`；
- 学员、课程类型、关联申请 readonly；
- 学员状态与反馈区正常填写。

映射：

| practice_type | course_type | reference_type |
|---|---|---|
| `mock_interview` | `mock_interview` | `mock_interview` |
| `relation_test` | `relation_test` | `relation_test` |
| `communication_test` | `communication_test` | `communication_test` |

---

## 9. 验收标准草案

- 导师端模拟应聘管理不显示统计卡片。
- 导师端列表按需求字段展示，并能上报课消。
- 班主任端模拟应聘管理不显示统计卡片，默认展示「我管理的学员」。
- 班主任端三栏数据范围正确。
- 助教端模拟应聘管理只展示「我管理的学员」。
- 后台模拟应聘管理默认显示全部记录。
- 分配导师时必须满足申请导师数量。
- 模拟应聘课消详情只展示当前 `practice_id` 下的课消记录。
- 模拟面试反馈包含“你在这个模拟面试中有哪些你希望做但是没有做的事情？”。
- 人际关系反馈支持截图上传和详细说明字段。
