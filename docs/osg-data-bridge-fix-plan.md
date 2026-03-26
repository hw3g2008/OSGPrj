# OSG 五端数据桥接修复方案

更新日期：2026-03-24  
目的：补齐学生端与后台主业务链之间的数据桥接，统一身份映射，使 5 端数据真正串联。  
前置文档：
- `docs/osg-data-flow-current-state.md`（现状审计）
- `docs/osg-business-flow-target.md`（目标业务流转）
- `docs/osg-curl-chain-checklist.md`（测试清单）

## 0. 总体策略

| 决策 | 结论 |
|------|------|
| 学生独立表 | 废弃，学生端改写主表 |
| 身份映射 | 统一到 `user_id`（`sys_user.user_id`） |
| 推进方式 | 按主链顺序逐条推进，每条链修改后 curl 验证 |
| 学生端独立表处理 | 代码层面不再写入/读取，但不删表不删数据 |

## 1. 缺口总览

| 编号 | 缺口 | 影响主链 | 优先级 | 改动量 |
|------|------|---------|--------|--------|
| GAP-D-02 | 身份映射不一致（staff_id vs user_id） | C/D/E | P0 | 中 |
| GAP-C-01 | 学生求职中心未接入 osg_job_application | C | P1 | 大 |
| GAP-D-01 | 学生模拟应聘未接入 osg_mock_practice | D | P1 | 大 |
| GAP-E-01 | 学生课程记录未消费 osg_class_record | E | P1 | 中 |
| GAP-C-02 | 导师求职总览读旧表 osg_job_coaching | C | P2 | 小 |
| GAP-BD-01 | 基础数据管理是内存 seedRows 不是真实字典源 | 全局 | P2 | 中 |

## 2. 建议执行顺序

```
Step 1: GAP-D-02  身份映射统一（所有跨端链路的前置）
Step 2: GAP-C-01  学生求职 → osg_job_application
Step 3: GAP-C-02  导师求职总览 → osg_coaching（与 Step 2 同链验证）
Step 4: GAP-D-01  学生模拟应聘 → osg_mock_practice
Step 5: GAP-E-01  学生课程记录 → osg_class_record
Step 6: GAP-BD-01 基础数据管理 → sys_dict_data
```

---

## 3. GAP-D-02：身份映射统一（P0）

### 3.1 问题

班主任分配模拟应聘时，前端传的 `mentorIds` 来自 `osg_staff.staff_id`。  
导师端查询时用 `SecurityUtils.getUserId()`（即 `sys_user.user_id`）。  
`FIND_IN_SET(#{currentMentorId}, mentor_ids)` 匹配不上，导师看不到自己的任务。

同样的问题存在于求职总览分配导师、课程记录的 mentor 关联等场景。

### 3.2 现状代码

| 文件 | 现状 |
|------|------|
| `OsgMockPracticeController.java:73` | `query.setCurrentMentorId(SecurityUtils.getUserId())` — 用 user_id 查 |
| `OsgMockPracticeServiceImpl.java:109` | `mentorIds` 存的是前端传入值（来自 staff 列表 = staff_id） |
| `OsgMockPracticeMapper.xml:95` | `FIND_IN_SET(#{currentMentorId}, mentor_ids)` |
| `OsgJobCoachingMapper.xml:40` | `jc.mentor_id=#{mentorId}` — mentorId 来源待确认 |
| `OsgLeadMentorJobOverviewServiceImpl` | 分配导师时写入 `osg_coaching` 或 `osg_job_application` 的 mentor 字段 |
| `OsgLeadMentorMockPracticeServiceImpl` | 分配导师时传入的也是 staff 列表 ID |

### 3.3 修改方案

**原则：所有业务表中存储的 mentor/lead_mentor/assistant ID 统一为 `sys_user.user_id`。**

#### 3.3.1 写入侧（分配时 staff_id → user_id 转换）

在以下 Service 的分配方法中，接收前端传入的 `staffId` 后，先通过 `osg_staff.staff_id → osg_staff.email → sys_user.user_name` 查到 `sys_user.user_id`，再写入业务表：

| 文件 | 方法 | 改动 |
|------|------|------|
| `OsgMockPracticeServiceImpl.java` | `assignMockPractice()` | `mentorIds` 转换为 user_id 再存储 |
| `OsgLeadMentorMockPracticeServiceImpl.java` | `assignMockPractice()` | 同上 |
| `OsgLeadMentorJobOverviewServiceImpl.java` | `assignMentor()` | mentor_id 转换为 user_id 再存储 |
| `OsgJobOverviewServiceImpl.java` | 若有后台分配方法 | 同上 |

#### 3.3.2 查询侧（不变）

导师端已经用 `SecurityUtils.getUserId()` 查询，这是正确的。统一存储 user_id 后自然匹配。

#### 3.3.3 辅助工具

新增一个工具方法（建议放在 `OsgStaffServiceImpl` 或新建 `OsgIdentityResolver`）：

```java
/**
 * 根据 staff_id 查找对应的 sys_user.user_id
 * 路径: osg_staff.staff_id → osg_staff.email → sys_user.user_name → sys_user.user_id
 */
public Long resolveUserIdByStaffId(Long staffId)
```

#### 3.3.4 数据迁移

已有 `osg_mock_practice` 记录中的 `mentor_ids` 字段如果存的是 staff_id，需要一次性修正。  
可以写一个 SQL 迁移脚本或在代码中兼容处理（查询时如果 FIND_IN_SET 没匹配到，尝试 staff_id → user_id 反查）。

**建议**：因为未上线，直接跑一次 SQL 迁移脚本把历史数据修正，不做运行时兼容。

---

## 4. GAP-C-01：学生求职中心 → osg_job_application（P1）

### 4.1 问题

学生端岗位操作（收藏、投递、更新进度、申请辅导）只写 `osg_student_job_position` / `osg_student_job_position_state`，不写后台主表 `osg_job_application`。

班主任/后台的求职总览读 `osg_job_application`，看不到学生发起的任何求职动作。

### 4.2 现状代码

| 文件 | 作用 | 写入表 |
|------|------|--------|
| `PositionServiceImpl.java` | 学生岗位列表/筛选/元数据 | 读 `osg_student_job_position` |
| `StudentJobPositionMapper.xml` | 学生岗位 SQL | 读写 `osg_student_job_position` |
| `StudentPositionController.java` | 学生岗位控制器 | — |
| `OsgApplicationController.java` | 学生"我的求职"控制器 | — |

### 4.3 修改方案

#### 4.3.1 学生投递岗位 → 同时写 osg_job_application

`PositionServiceImpl`（或对应 Controller 的投递/申请方法）中：

1. 接收 `positionId` + `userId`
2. 查 `osg_student_profile.user_id → osg_student.student_id`（或直接通过 user_id 关联）
3. 创建 `osg_job_application` 记录：
   - `student_id` = 从 osg_student 查到的 student_id
   - `position_id` = positionId
   - `current_stage` = "已投递"
   - `submitted_at` = now()
4. 返回 `applicationId` 给前端

#### 4.3.2 学生更新进度 → 更新 osg_job_application

当学生更新求职进度时，找到对应的 `osg_job_application` 记录，更新 `current_stage`。

#### 4.3.3 学生申请辅导 → 创建 osg_coaching

当学生申请辅导时：
1. 在 `osg_job_application` 中标记 `coaching_status = '待分配'`
2. 创建 `osg_coaching` 记录（等班主任分配导师）

#### 4.3.4 学生端读取改用主表

学生的"我的求职"列表改为读 `osg_job_application`（按 student_id 过滤），替代读 `osg_student_job_position_state`。

岗位列表仍然读 `osg_position`（公共岗位库），这部分已经是共享的。

#### 4.3.5 需要解决的前置问题

**学生 user_id → student_id 映射**：
- 当前学生登录用 `sys_user.user_id`
- 后台主表用 `osg_student.student_id`
- 需要确认两者的关联路径：`sys_user.user_name(email) → osg_student.email → osg_student.student_id`
- 或者在 `osg_student` 表中加 `user_id` 字段建立直接关联

**涉及文件（预估）**：

| 文件 | 改动 |
|------|------|
| `PositionServiceImpl.java` | 投递/进度/辅导写入 osg_job_application |
| `StudentJobPositionMapper.xml` | 废弃或保留只读兼容 |
| `OsgJobApplicationMapper.xml` | 新增按 student_id 查询的 SQL |
| `OsgApplicationController.java` | "我的求职"改读 osg_job_application |
| 前端 student 岗位/求职页 | API 响应字段可能变化 |

---

## 5. GAP-C-02：导师求职总览 → osg_coaching（P2）

### 5.1 问题

导师端求职总览读的是旧表 `osg_job_coaching`，而班主任/后台分配导师时写的是 `osg_coaching`。

### 5.2 现状代码

| 文件 | 读取表 |
|------|--------|
| `OsgJobCoachingMapper.xml` | `osg_job_coaching`（旧表） |
| `OsgCoachingMapper.xml` | `osg_coaching`（主表） |

`osg_job_coaching` 表字段：`mentor_id`, `student_id`, `interview_time`, `coaching_status` 等。  
`osg_coaching` 表字段：`application_id`, `student_id`, `mentor_id`, `total_hours` 等。

### 5.3 修改方案

将导师端求职总览的查询从 `osg_job_coaching` 切换到 `osg_coaching`（或 `osg_job_application` + `osg_coaching` join）。

| 文件 | 改动 |
|------|------|
| `OsgJobOverviewController.java`（导师端） | 改用 `osg_coaching` / `osg_job_application` 查询 |
| 导师端 job overview Service | 重写查询逻辑 |
| `OsgJobCoachingMapper.xml` | 废弃（不删文件，标记为 deprecated） |

---

## 6. GAP-D-01：学生模拟应聘 → osg_mock_practice（P1）

### 6.1 问题

学生发起模拟应聘/课程申请，只写 `osg_student_mock_request`。  
班主任/后台管理模拟应聘读的是 `osg_mock_practice`。两张表完全隔离。

### 6.2 现状代码

| 文件 | 写入表 |
|------|--------|
| `StudentMockPracticeServiceImpl.java` | `osg_student_mock_request`（独立表） |
| `StudentMockPracticeMapper.xml` | 同上 |
| `OsgMockPracticeServiceImpl.java` | `osg_mock_practice`（主表） |

### 6.3 修改方案

学生端发起申请时，同时写入 `osg_mock_practice`。

#### 6.3.1 createPracticeRequest 改造

在 `StudentMockPracticeServiceImpl.createPracticeRequest()` 中：

1. 查 student_id（同 GAP-C-01 的 user_id → student_id 映射）
2. 查 student_name
3. 创建 `osg_mock_practice` 记录：
   - `student_id` = student_id
   - `student_name` = student_name
   - `practice_type` = practiceType label
   - `request_content` = requestContent
   - `requested_mentor_count` = mentorCount
   - `preferred_mentor_names` = preferredMentor
   - `status` = "pending"
   - `submitted_at` = now()
4. 返回 `practiceId`

#### 6.3.2 学生端读取改用主表

学生的"我的模拟应聘记录"改为读 `osg_mock_practice`（按 student_id 过滤），这样学生能看到班主任分配的导师、状态变化和反馈。

#### 6.3.3 课程申请（class-request）

课程申请目前没有对应的后台主表。两种处理方式：
- **方案 A**：也写入 `osg_mock_practice`，用 `practice_type` 区分
- **方案 B**：保留在 `osg_student_mock_request` 中，作为独立流程

**建议方案 A**，因为后台的课程记录审核最终也要串联。

#### 6.3.4 涉及文件

| 文件 | 改动 |
|------|------|
| `StudentMockPracticeServiceImpl.java` | 写入改为 osg_mock_practice |
| `StudentMockPracticeMapper.xml` | 查询改为读 osg_mock_practice |
| `OsgMockPracticeMapper.xml` | 新增按 student_id 查询（学生视角） |
| 前端 student mock-practice 页 | API 响应字段适配 |

---

## 7. GAP-E-01：学生课程记录 → osg_class_record（P1）

### 7.1 问题

学生端课程记录读的是 `osg_student_course_record`（独立表，只有 6 条数据）。  
导师/班主任提交的课程记录在 `osg_class_record`（172 条数据）。  
后台审核通过后，学生看不到。

### 7.2 现状代码

| 文件 | 读取表 |
|------|--------|
| `StudentCourseRecordServiceImpl.java` | `osg_student_course_record` |
| `StudentCourseRecordMapper.xml` | 同上 |
| `OsgClassRecordServiceImpl.java` | `osg_class_record`（主表） |

### 7.3 修改方案

学生端课程记录改为读 `osg_class_record`（按 student_id 过滤，只读 status='approved' 的记录）。

#### 7.3.1 读取改造

`StudentCourseRecordServiceImpl.selectCourseRecordList()` 改为查 `osg_class_record`：

```sql
SELECT
    record_id as recordId,
    coaching_type as coachingType,
    coaching_detail as coachingDetail,
    course_content as courseContent,
    mentor_name as mentor,
    class_date as classDate,
    duration as duration,
    -- 评价字段从 osg_class_record 扩展或从关联表读
    rating_score, rating_tags, rating_feedback
FROM osg_class_record
WHERE student_id = #{studentId}
  AND status = 'approved'
ORDER BY class_date DESC
```

#### 7.3.2 评价写回

学生评价课程时，写回 `osg_class_record` 的评价字段（如果表中没有评价字段，需要加列）。

需要确认 `osg_class_record` 表结构中是否有 `rating_score`、`rating_tags`、`rating_feedback` 字段。如果没有，需要 ALTER TABLE 加字段。

#### 7.3.3 涉及文件

| 文件 | 改动 |
|------|------|
| `StudentCourseRecordServiceImpl.java` | 查询改为读 osg_class_record |
| `StudentCourseRecordMapper.xml` | SQL 改为读 osg_class_record |
| `osg_class_record` 表 | 可能需要加评价字段 |
| 前端 student class-records 页 | API 响应字段适配 |

---

## 8. GAP-BD-01：基础数据管理 → sys_dict_data（P2）

### 8.1 问题

`OsgBaseDataController` 用内存 `ArrayList<Map>` 存储基础数据，重启丢失，也不影响其他端的下拉项。  
其他端（学生岗位、模拟应聘、课程记录）的 meta/筛选项实际读的是 `sys_dict_data`。

### 8.2 现状代码

`OsgBaseDataController.java:29` — `private final List<Map<String, Object>> rows = seedRows();`

### 8.3 修改方案

将 `OsgBaseDataController` 的 CRUD 改为读写 `sys_dict_data`：

| 操作 | 现状 | 改为 |
|------|------|------|
| list | 内存 filter | `SysDictDataMapper.selectDictDataByType(type)` |
| add | 内存 add | `SysDictDataMapper.insertDictData()` |
| edit | 内存 put | `SysDictDataMapper.updateDictData()` |
| changeStatus | 内存 put | `SysDictDataMapper.updateDictData()` |

需要定义 tab ↔ dictType 的映射关系（如 `job_category → osg_position_category`）。

#### 8.3.1 涉及文件

| 文件 | 改动 |
|------|------|
| `OsgBaseDataController.java` | CRUD 改为调用 SysDictDataMapper |
| 可能需要新增 Service 层 | 封装基础数据与字典的映射 |

---

## 9. 公共前置：user_id ↔ student_id 映射

GAP-C-01、GAP-D-01、GAP-E-01 都需要 "学生 user_id → student_id" 映射。

### 9.1 当前映射路径

```
学生登录 → sys_user.user_id
sys_user.user_name (= email)
osg_student.email (= 同一个 email)
osg_student.student_id
```

### 9.2 建议方案

在 `osg_student` 表中增加 `user_id` 字段，建立直接关联：

```sql
ALTER TABLE osg_student ADD COLUMN user_id BIGINT DEFAULT NULL COMMENT '关联 sys_user.user_id';
-- 回填已有数据
UPDATE osg_student s
  JOIN sys_user u ON u.user_name = s.email
   SET s.user_id = u.user_id
 WHERE s.user_id IS NULL;
```

然后提供统一查询方法：

```java
// OsgStudentMapper 新增
Long selectStudentIdByUserId(Long userId);
```

这样所有学生端 Service 只需一步就能拿到 student_id。

---

## 10. 风险与注意事项

1. **不删表不删数据**：学生独立表（osg_student_job_position、osg_student_mock_request、osg_student_course_record、osg_student_profile）保留，但代码不再写入
2. **前端字段适配**：主表和独立表的字段名不同，前端可能需要调整字段映射
3. **历史数据**：独立表中的少量测试数据（student_job_position: 11, student_mock_request: 17, student_course_record: 6）可以不迁移，因为都是开发测试数据
4. **osg_student_profile vs osg_student**：学生个人资料目前也是独立表，本轮暂不合并（风险大，且对数据流转影响小）
5. **事务一致性**：桥接写入应在同一事务内完成，避免部分写入
6. **测试账号**：当前统一学生账号 `student(user_id=838)` 在 `osg_student` 中没有对应记录，需要在 FLOW-A 测试时通过后台创建真实链路账号

## 11. 验证方式

每完成一个 GAP，按 `docs/osg-curl-chain-checklist.md` 对应主链执行 curl 串联验证：

| GAP | 验证主链 |
|-----|---------|
| GAP-D-02 | FLOW-D + FLOW-C（导师能看到分配的任务） |
| GAP-C-01 | FLOW-C（学生投递 → 班主任/后台可见） |
| GAP-C-02 | FLOW-C（导师求职总览读到正确数据） |
| GAP-D-01 | FLOW-D（学生申请 → 班主任/后台可见） |
| GAP-E-01 | FLOW-E（导师提交 → 后台审核 → 学生可见） |
| GAP-BD-01 | AUDIT-BD-01（后台修改 → 各端 meta 变化） |

## 12. 下一步

用户确认本方案后，按 Step 1 → Step 6 顺序逐步执行：
1. 先做 GAP-D-02（身份映射统一）+ 公共前置（user_id ↔ student_id）
2. 每完成一步，curl 验证后再推进下一步
