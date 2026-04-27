# OSG 五端辅导主链状态机收口实施计划

> Goal：按 `docs/plans/five-end-course-flow/2026-04-27-osg-coaching-mainline-fix-design.md` 的设计，把五端辅导主链状态机、字段口径、跨端能力对齐落地。
>
> Scope：`osg_job_application` / `osg_coaching` / `osg_mock_practice` / `osg_class_record` 四表的状态机、五端 controller / service、前端 status 展示 SSOT。
>
> Strategy：先做不可跳过的 schema 升级 + 前端表单改造（A.0 是 F5 回写的前置），再修生产 bug（F5 审核不回写、F1 跳态），再做字段值口径迁移（F2 中文转英文），再补三辅导者端能力（F8 + F3），最后做前端 SSOT 收口（F6）与派生展示（F4）。

## 0. 执行原则

1. 主链三表（`osg_job_application` / `osg_mock_practice` / `osg_coaching`）不修改 schema，只迁移字段值。
2. `osg_class_record` 按设计稿 §4 例外允许新增 2 个 nullable 关联字段（`practice_id` / `application_id`），作为 F5 回写的前置。
3. 不引入新业务按钮（不加"标记完成 / 取消"等按钮）。
4. 后端 service 层在三辅导者端之间复用，controller 层做 access guard 隔离。
5. 前端 status 展示通过 shared composable 收口，后端不固化 statusLabel / statusTone。
6. 每个 workstream 完成后必须有可运行的回归测试，不允许"代码改了但测试没跑"。

## 1. Workstream A：schema 升级 + 生产 bug 修复（P0）

### A.0 `osg_class_record` schema 升级 + 表单改造（F5 前置）

**问题**：`osg_class_record` 当前没有 `practice_id` / `application_id` 字段，后端无法准确知道一条课时属于哪条申请，F5 回写无法落地。

**整体策略**：拆为 4 个子任务 A.0.1-A.0.4，每个子任务独立可交付、独立可测、独立可回滚。**A.0.1 → A.0.2 → A.0.4 严格顺序**；A.0.3 与 A.0.2 可并行。

#### A.0.1 schema 升级（独立 PR，估时 0.5d）

**涉及文件**：
- `migration/2026-04-27-class-record-add-source-fk.sql`（新增）
- `OsgClassRecord.java`（实体加字段）
- `OsgClassRecordMapper.xml`（resultMap / insert / update / select 补字段）

**任务**：

1. 写迁移脚本 `migration/2026-04-27-class-record-add-source-fk.sql`：
   ```sql
   ALTER TABLE osg_class_record ADD COLUMN practice_id BIGINT NULL COMMENT '关联 osg_mock_practice.practice_id';
   ALTER TABLE osg_class_record ADD COLUMN application_id BIGINT NULL COMMENT '关联 osg_job_application.application_id';
   CREATE INDEX idx_class_record_practice_id ON osg_class_record (practice_id);
   CREATE INDEX idx_class_record_application_id ON osg_class_record (application_id);
   ```
2. `OsgClassRecord` 实体加 getter/setter：
   ```java
   private Long practiceId;
   private Long applicationId;
   ```
3. `OsgClassRecordMapper.xml` 中 resultMap / insert / update / select 补上两个字段（保证写入 / 读取链路完整）。
4. 在测试库跑迁移脚本，写一条 class_record 验证两个新字段可写可读。

**完成判据**：
- 迁移后 `DESCRIBE osg_class_record` 含两个新字段
- 既有读写链路无回归（用 `OsgClassRecordServiceImplTest` 跑通现有测试）

#### A.0.2 后端 service 校验（依赖 A.0.1，估时 0.5d）

**涉及文件**：
- `OsgClassRecordServiceImpl.java`（`createMentorClassRecord` / `createLeadMentorClassRecord` / `createAssistantClassRecord` 三个方法）

**任务**：

1. 在三个 create 方法的入口加校验：
   - `practiceId` 与 `applicationId` 必有且仅有一个非空
   - 校验 `studentId` 与 `practiceId/applicationId` 一致（防止为其他学员的申请提交课时）
   - 校验当前操作者（mentor / asst / lead-mentor 三者之一）在该申请的 `mentor_ids` CSV 中

**测试**：

- `OsgClassRecordServiceImplTest`
  - createXxxClassRecord 不传 practiceId/applicationId 报错
  - createXxxClassRecord 同时传 practiceId 与 applicationId 报错
  - createXxxClassRecord 传了但当前操作者不在该申请的 mentorIds 中报错

**完成判据**：
- 三个 service 方法的入口校验跑通
- 单元测试 100% 通过

#### A.0.3 my-targets 接口（独立可并行 A.0.2，估时 1d）

**涉及文件**：
- `IOsgClassRecordService.java`（接口加 listMyActiveCoachingTargets 方法签名）
- `OsgClassRecordServiceImpl.java`（实现）
- `OsgCoachingMapper.xml` / `OsgMockPracticeMapper.xml`（如需新增查询语句）
- 三端 controller：`OsgClassRecordController.java`（mentor）/ `OsgLeadMentorClassRecordController.java` / `OsgAssistantClassRecordController.java`

**任务**：

1. service 方法 `IOsgClassRecordService.listMyActiveCoachingTargets(userId)` 实现：
   - 查询 `osg_coaching` 中 `FIND_IN_SET(#{userId}, mentor_ids) > 0` 且 `status IN ('assigned','coaching')` 的记录
   - 查询 `osg_mock_practice` 中 `FIND_IN_SET(#{userId}, mentor_ids) > 0` 且 `status IN ('scheduled','confirmed')` 的记录
   - 合并返回三辅导者端共用的 DTO：`{ type: 'practice'|'application', id, studentId, studentName, summary }`
2. 三端 controller 各补 `GET /xxx/class-record/my-targets` 路由，调用同一 service 方法：
   - mentor: `OsgClassRecordController` 中 `/api/mentor/class-records/my-targets`
   - assistant: `OsgAssistantClassRecordController` 中 `/assistant/class-record/my-targets`
   - lead-mentor: `OsgLeadMentorClassRecordController` 中 `/lead-mentor/class-record/my-targets`
3. 三端各走自己的 access guard（`mentorAccessService` / `assistantAccessService` / `leadMentorAccessService`）

**测试**：

- `OsgClassRecordServiceImplTest`
  - listMyActiveCoachingTargets 返回包含 mock-practice 与 job-application 两类记录
  - listMyActiveCoachingTargets 不返回已 cancelled / completed 的记录
- 三端 controller 测试：access guard 不跨权

**完成判据**：
- 三端接口可调，返回数据正确
- access guard 测试通过

#### A.0.4 前端表单改造（依赖 A.0.2 + A.0.3，估时 1d）

**涉及文件**：
- mentor / asst / lead-mentor 三端的提交课时表单组件（具体路径需在 frontend 仓库中确认）

**任务**：

1. 表单顶部增加"为哪个申请提交课时"下拉
2. 下拉数据源：调用 A.0.3 的 `my-targets` 接口
3. 选中后填充 `practiceId` 或 `applicationId`（二选一），调用 create 接口时一并提交
4. 选中后锁定 `studentId` / `studentName`，避免与申请不一致
5. 冲突处理：同一辅导者同一学员同一天同一课时又存在多个申请时，前端必选

**测试**：

- 三端前端表单测试：
  - 渲染"为哪个申请提交"下拉选项
  - 选中后填充 practiceId / applicationId
  - studentId 被锁定不可改

**完成判据**：
- 三端表单提交正常
- 表单未选下拉时提交按钮不可点
- E2E 测试覆盖

> **A.0 整体回滚**：A.0.1 schema 可独立 revert（DROP COLUMN）；A.0.2 / A.0.3 / A.0.4 可独立 revert commit。**强烈建议作为一组 atomic commit 同步上线**（schema + 后端校验 + my-targets + 前端表单），避免单独上 schema 导致提交课时被 service 拒绝。

### A.1 审核回写 completedHours / totalHours（F5）

**问题**：`OsgClassRecordServiceImpl.reviewRecord()` 当前仅更新 `osg_class_record` 自身字段，从不回写上游主链。

**前置**：A.0 已完成（`practice_id` / `application_id` 字段可用）。

**任务**：

1. 在 `OsgClassRecordServiceImpl.reviewRecord()` 的 `targetStatus='approved'` 分支中补充：
   - 若 `record.practiceId != null`：调用 `osgMockPracticeMapper.incrementCompletedHours(practiceId, durationHours)`
   - 若 `record.applicationId != null`：调用 `osgCoachingMapper.incrementTotalHours(applicationId, durationHours)`
2. 在 `OsgMockPracticeMapper` / `OsgMockPracticeMapper.xml` 新增 `incrementCompletedHours(practiceId, durationHours)` 方法，底层 SQL：
   ```sql
   UPDATE osg_mock_practice SET completed_hours = COALESCE(completed_hours, 0) + #{durationHours} WHERE practice_id = #{practiceId}
   ```
3. 在 `OsgCoachingMapper` / `OsgCoachingMapper.xml` 新增 `incrementTotalHours(applicationId, durationHours)` 方法，底层 SQL：
   ```sql
   UPDATE osg_coaching SET total_hours = COALESCE(total_hours, 0) + #{durationHours} WHERE application_id = #{applicationId}
   ```
   > **SQL 为什么不带 mentor_id 条件**：`osg_coaching` 表的 `application_id` 有唯一索引 `uk_coaching_application`（见 `@/Users/hw/workspace/OSGPrj/sql/osg_job_application_init.sql:59`），一个 application 只可能有一行记录。多位辅导者装在 `mentor_ids` CSV 串里，不会产生多行。“提交课时的人是否在该申请的 mentorIds 列表中”这一权限校验已在 A.0 step 4 的 service 层强制执行，不需在 SQL where 子句重复。
4. 整个回写动作必须在原有 `@Transactional` 事务内完成，回写失败时审核回滚
5. 处理并发：使用 SQL `UPDATE ... SET col = COALESCE(col, 0) + ?` 而不是先查再写，规避竞态

**测试**：

- `OsgClassRecordServiceImplTest`
  - approveRecord 关联 mock_practice 时 completedHours 累加正确
  - approveRecord 关联 application 时 totalHours 累加正确
  - rejectRecord 不影响累加
  - 关联表更新失败时整个事务回滚（mock 一个 mapper 抛异常验证）
  - 同一 mock_practice 并发审核两条 class_record 累加结果正确

**验收**：

- 历史已审核 class_record 不需要补刷（这是渐进数据，不回填历史）
- 新审核动作必须保证 mock_practice.completedHours / coaching.totalHours 累加可见

**历史数据上线警示**（设计稿 §F5 / §8.3.2 补偿措施落地）：

- 上线后"历史已完成"的模拟应聘 raw status 可能不是 `completed` 但业务上已完结（因 completedHours=0 < plannedHours），会被派生为 `assigned` 或 `coaching`。需上线公告同步说明。
- **部署者责任**：部署前必须提交 release notes 含「历史记录状态临时可能不准确」警示；产品需提供外部客服口径讲话
- **拒绝补刷脚本**：本轮**不提供**主动补刷历史 mock_practice.completedHours 的脚本，原因是历史 class_record 无 practice_id 关联，模糊匹配可能造成全量跨年误计

### A.2 LM/admin 分配后不再设 coachingStatus（F1）

**问题**：`OsgUserJobOverviewServiceImpl.assignMentors()` 直接 `setCoachingStatus("辅导中")`，跳过"已分配导师"业务态。

**任务**：

1. **修三辅导者端 service**：`OsgUserJobOverviewServiceImpl.assignMentors()`（`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java:91-154`）：
   - 删除 `patch.setCoachingStatus("辅导中")` 一行
   - 改为只设 `patch.setAssignStatus("assigned")`，`coachingStatus` 保持 `'none'` 不变
   - `osg_coaching` 新建记录时 `status='assigned'`（不是 `'辅导中'`）
   - **重新分配场景（upsert update 分支）**同步重置已 confirm 状态：
     ```java
     coaching.setConfirmedAt(null);
     coaching.setStatus("assigned");
     ```
     同时 `osg_job_application` 重置 `coachingStatus='none'`。原因：原 mentor A 已 confirm 后 LM 替换为 B，如不重置则 B 会看到"已确认"，状态卡死。
2. **修 admin 端 service**：`OsgJobOverviewServiceImpl.assignMentors()`（`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java:146-225`）：
   - admin 端走的是**另一个 service**（设计稿 §6.3.0 明确），同样存在 F1 bug 必须同步修
   - 同样的 4 项修改：删除设 coachingStatus + status 改 assigned + confirmedAt 重置 + 重分配重置
3. 代码判重：两个 service 的 assignMentors 逻辑高度重复，可作为后续重构机会（本轮不抽公共）

**测试**：

- `OsgUserJobOverviewServiceImplTest`
  - assignMentors 后 osg_job_application.coachingStatus 仍为 `'none'`
  - assignMentors 后 osg_coaching.status='assigned'
  - assignMentors 后 osg_job_application.assignStatus='assigned'
  - **重新分配**：已 confirm 的 osg_coaching（confirmedAt 非 null + status='coaching'）被重新分配后 confirmedAt=null + status='assigned'
  - **重新分配**：已 coaching 的 osg_job_application 被重新分配后 coachingStatus 重置为 'none'
- `OsgJobOverviewServiceImplTest`（admin 端独立 service）
  - 与三辅导者端同样的 4 个验证（coachingStatus / status / assignStatus / 重新分配重置）

**验收**：

- LM 分配 mentor 后，五端展示业务态都是 `assigned`（待 F6 接入后才能跨端校验）
- 不影响存量已经是 `'辅导中'` 或 `null` 的数据（A.3 处理）

### A.3 中文 coachingStatus 数据迁移（F2 一部分）

**任务**：

1. 写迁移脚本 `migration/2026-04-27-coaching-status-zh-to-en.sql`：
   ```sql
   -- coaching_status: 中文转英文
   UPDATE osg_job_application SET coaching_status = 'coaching' WHERE coaching_status = '辅导中';
   UPDATE osg_job_application SET coaching_status = 'completed' WHERE coaching_status IN ('已完成', '完成');
   UPDATE osg_job_application SET coaching_status = 'cancelled' WHERE coaching_status IN ('已取消', '取消');
   -- coaching_status: NULL 归一为 'none'（避免与设计稿 §7.1 不一致）
   UPDATE osg_job_application SET coaching_status = 'none' WHERE coaching_status IS NULL;
   -- osg_coaching: 中文转英文
   UPDATE osg_coaching SET status = 'coaching' WHERE status = '辅导中';
   UPDATE osg_coaching SET status = 'completed' WHERE status IN ('已完成', '完成');
   UPDATE osg_coaching SET status = 'cancelled' WHERE status IN ('已取消', '取消');
   ```
2. 迁移前 dump 备份：`mysqldump osg_job_application osg_coaching > backup-2026-04-27.sql`
3. 在测试库先跑迁移 + 跑回归测试
4. 生产环境迁移窗口：低峰期执行，跑完后立即跑五端冒烟测试

**测试**：

- 迁移脚本本地跑通
- 跑完后五端 status 展示无中文乱码
- coaching_status 字段无 NULL、无中文值

**回滚**：

- 备份表恢复

## 2. Workstream B：字段值英文 enum 收口（F2 剩余部分）

### B.1 后端代码全量改用英文常量

**任务**：

1. 全仓搜索 `"辅导中"`、`"待分配"`、`"已分配"`、`"已完成"`、`"已取消"` 字面量
2. 在 `OsgJobApplicationConstants` / `OsgCoachingConstants` 定义英文常量：
   ```java
   public static final String COACHING_STATUS_PENDING = "pending";
   public static final String COACHING_STATUS_ASSIGNED = "assigned";
   public static final String COACHING_STATUS_COACHING = "coaching";
   public static final String COACHING_STATUS_COMPLETED = "completed";
   public static final String COACHING_STATUS_CANCELLED = "cancelled";
   ```
3. 替换所有 hardcode 中文判等逻辑
4. 后端返回给前端的 raw 字段值统一为英文

**测试**：

- 全量编译通过
- 已有 service 测试全部通过

**验收**：

- `git grep "辅导中"` 在生产代码（非中文展示文案、非测试 fixture）中无匹配

### B.2 字典数据同步

**任务**：

1. 检查 `sys_dict_data` 表中 `osg_coaching_status` / `osg_application_coaching_status` 字典项
2. 确保 dict_value 是英文 enum，dict_label 是中文展示
3. 不一致的 dict 项更新

## 3. Workstream C：三辅导者端能力对齐（F8 + F3）

> **本 Workstream 工作量分类**（详见设计稿 §6.3.3）：
> - **修 1 处**（C.1）：mentor 真实岗位 `confirm` 现有实现的 2 个 bug
> - **改造 2 处**（C.2）：mentor 模拟应聘 `confirm` + LM 模拟应聘 `ack-assignment`，底层 service 均迁至统一共用方法
> - **补 6 个**（C.3 三端补 controller）：mentor 1 个 + asst 4 个 + LM 1 个
> - 前端按钮接入（C.4）

### C.1 共用 service 方法定义（含 mentor confirmCoaching bug 修复）

**问题说明**：mentor 真实岗位 `confirm` 接口在 controller 层与 service 层都已存在（`@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMentorJobOverviewController.java:56-60` + `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgUserJobOverviewServiceImpl.java:181-216`）。本节任务是**修改现有 `confirmCoaching()` 实现**（补两个 bug） + **新增其他 3 个共用 service 方法**。

**任务**：

1. 在 `IOsgUserJobOverviewService` 中确认 `confirmCoaching` 方法签名（已存在）并新增 `acknowledgeStageUpdate` 方法签名：
   ```java
   /**
    * 辅导者确认接受新分配（mentor / asst / lead-mentor 共用）
    * 【本轮修改】：原实现不写 osg_job_application.coachingStatus + 不防重复 confirm，本节修复
    */
   Map<String, Object> confirmCoaching(Long applicationId, Long userId, String operator);
   
   /**
    * 辅导者确认学生进度更新（mentor / asst / lead-mentor 共用，本轮新增）
    */
   Map<String, Object> acknowledgeStageUpdate(Long applicationId, Long userId, String operator);
   ```
2. 在 `IOsgMockPracticeService` 新增方法签名：
   ```java
   /**
    * 辅导者确认接受 mock-practice 分配（mentor / asst / lead-mentor 共用，本轮新增）
    */
   Map<String, Object> confirmAssignment(Long practiceId, Long userId, String operator);
   
   /**
    * 辅导者确认已知悉 mock-practice 分配（mentor / asst / lead-mentor 共用，本轮新增）
    */
   Map<String, Object> acknowledgeAssignment(Long practiceId, Long userId, String operator);
   ```
3. 实现/修改这些方法的核心逻辑：
   - **`confirmCoaching` 修改现有实现（修 2 个 bug + 防并发竟态）**：
     - 保留原有：校验 userId 在 `osg_coaching.mentor_ids` 中（`resolveCoachingApplicationIds`）
     - **原子 SQL 防并发**（代替"先查后写"模式）：不要先调 `selectCoachingByApplicationId` + Java 代码判 confirmedAt；直接发一条 SQL：
       ```xml
       <!-- OsgCoachingMapper.xml 新增 -->
       <update id="confirmCoachingIfPending" parameterType="map">
           UPDATE osg_coaching
           SET status='coaching', confirmed_at=NOW(), update_by=#{operator}, update_time=NOW()
           WHERE application_id=#{applicationId} AND confirmed_at IS NULL
       </update>
       ```
       Java 调用后检查 affectedRows：
       ```java
       int affected = coachingMapper.confirmCoachingIfPending(applicationId, operator);
       if (affected == 0) throw new ServiceException("该申请已被确认");
       ```
     - **补 bug 2**：在 `osg_coaching` 原子更新成功后（affected=1）补充 `osg_job_application` 更新：
       ```java
       OsgJobApplication patch = new OsgJobApplication();
       patch.setApplicationId(applicationId);
       patch.setCoachingStatus("coaching");
       patch.setUpdateBy(operator);
       jobApplicationMapper.updateJobApplicationAssignment(patch);
       ```
     - **原则**：“bug 1 + 防并发”两件事用同一条原子 SQL 同时解决，避免 Java 层 check-then-act 走入竟态问题
   - **`acknowledgeStageUpdate` 新实现**（可参考现有 LM 端的实现迁移）：
     - 校验 userId 是申请的辅导者（复用 `resolveCoachingApplicationIds`）
     - 设 `osg_job_application.stageUpdated=false` + `updateBy=operator`
   - **`confirmAssignment` 新实现（同样原子 SQL 防并发）**：
     - 校验 userId 在 `osg_mock_practice.mentor_ids` 中
     - 原子 SQL：`UPDATE osg_mock_practice SET status='confirmed', confirmed_at=NOW() WHERE practice_id=#{id} AND confirmed_at IS NULL`
     - affectedRows=0 时抛 `ServiceException("该应聘已被确认")`
   - **`acknowledgeAssignment` 新实现**（可参考 `IOsgLeadMentorMockPracticeService.acknowledgeAssignment` 现有实现迁移）：
     - 校验 userId 在 `osg_mock_practice.mentor_ids` 中
     - 设 acknowledged 状态位（如现有逻辑写入某个 flag）
4. 重复 confirm 返回业务错误（"该申请已被确认"）而不是静默成功

**测试**：

- `OsgUserJobOverviewServiceImplTest`（现有测试 `confirmCoachingShouldUpdateConfirmedAtAndReturnLegacyStatus` 需修）：
  - **新增**：confirmCoaching 后 `osg_job_application.coachingStatus='coaching'`被写入（captor 验证）
  - **新增**：confirmCoaching 重复调用（`confirmedAt` 非 null 返回的 coaching）抛 ServiceException("该申请已被确认")
  - 保留原有：非授权辅导者抛 ServiceException("无权确认该求职申请")
  - 保留原有：`osg_coaching` 表 status 与 confirmedAt 写入
- 三个新增 service 方法各自的单元测试覆盖：成功、重复调用、非授权辅导者、申请不存在

### C.2 改造 2 处现有接口的 service 调用

**问题说明**：有两个现有接口路由已存在但底层 service 是独立写的，导致三端逻辑不一致。本节任务是**路由保留不变**（前端不感知），只把底层 service 调用迁到 C.1 的共用方法。

**任务**：

1. **改造 mentor 模拟应聘 confirm**：
   - 现状：`@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgMockPracticeController.java:77-92` 调用 `mockPracticeService.confirmMentorMockPractice(record)`。
   - 改造：修改 controller 调用点，改调 `IOsgMockPracticeService.confirmAssignment(id, getUserId(), resolveOperator())`
   - 原 `confirmMentorMockPractice` 方法可保留 alias（内部委托到 `confirmAssignment`）或标记为 deprecated
2. **改造 LM 模拟应聘 ack-assignment**：
   - 现状：`@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgLeadMentorMockPracticeController.java:111-127` 调用 `leadMentorMockPracticeService.acknowledgeAssignment(...)`。
   - 改造：修改 controller 调用点，改调 `IOsgMockPracticeService.acknowledgeAssignment(id, getUserId(), resolveOperator())`
   - 原 `IOsgLeadMentorMockPracticeService.acknowledgeAssignment` 方法保留 alias 或标记 deprecated
3. 保证路由不变：`PUT /api/mentor/mock-practice/{id}/confirm` 与 `POST /lead-mentor/mock-practice/{id}/ack-assignment` URL 仍然可用，前端无需修改

**测试**：

- `OsgMockPracticeControllerTest` / `OsgLeadMentorMockPracticeControllerTest`：原有接口行为不变的回归测试（status 变迁 / access guard 仍然生效）
- 新增测试：改造后两个接口经过 `IOsgMockPracticeService` 共用方法（可验证 service 被调用）

### C.3 mentor 端 controller 补 ack-stage-update（1 个接口）

**任务**：

1. 在 `OsgMentorJobOverviewController` 新增：
   ```java
   @PostMapping("/{applicationId}/ack-stage-update")
   public AjaxResult ackStageUpdate(@PathVariable Long applicationId)
   ```
2. 调 `userJobOverviewService.acknowledgeStageUpdate(applicationId, getUserId(), resolveOperator())`（C.1 新增的共用方法）
3. 走 `mentorAccessService` access guard

### C.4 asst 端 controller 补 4 个接口

**任务**：

1. 在 `OsgAssistantJobOverviewController` 新增：
   ```java
   @PutMapping("/{applicationId}/confirm")
   public AjaxResult confirm(@PathVariable Long applicationId)
   
   @PostMapping("/{applicationId}/ack-stage-update")
   public AjaxResult ackStageUpdate(@PathVariable Long applicationId)
   ```
2. 在 `OsgAssistantMockPracticeController` 新增：
   ```java
   @PutMapping("/{practiceId}/confirm")
   public AjaxResult confirm(@PathVariable Long practiceId)
   
   @PostMapping("/{practiceId}/ack-assignment")
   public AjaxResult ackAssignment(@PathVariable Long practiceId)
   ```
3. 全部走 `assistantAccessService` access guard
4. 调用 C.1 的共用 service 方法（`confirmCoaching` / `acknowledgeStageUpdate` / `confirmAssignment` / `acknowledgeAssignment`）

### C.5 lead-mentor 端补 1 个接口

**任务**：补 LM job-overview confirm 接口（原型中 LM「我辅导的学员」tab 有 [确认] 按钮，但后端缺失）：

```java
// OsgLeadMentorJobOverviewController
@PutMapping("/{applicationId}/confirm")
public AjaxResult confirm(@PathVariable Long applicationId)
{
    if (!hasLeadMentorAccess()) {
        return AjaxResult.error(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
    }
    try {
        return AjaxResult.success(
            userJobOverviewService.confirmCoaching(applicationId, getUserId(), resolveOperator())
        );
    } catch (ServiceException ex) {
        return handleServiceException(ex);
    }
}
```

> 注：LM 端 `ack-stage-update` 与 `ack-assignment` 已在 C.2 中改造为调用共用 service，本节只处理全新补的 `confirm` 路由。

### C.6 前端按钮接入新接口

**任务**：

1. 在 `osg-frontend/packages/shared` 引入辅导动作 API client：
   ```typescript
   confirmCoaching(role, applicationId)
   ackStageUpdate(role, applicationId)
   confirmMockAssignment(role, practiceId)
   ackMockAssignment(role, practiceId)
   ```

   **前后端命名映射表**（前端语义化加 Mock 前缀以区分 confirmCoaching；后端 service 不加前缀因 IOsgMockPracticeService 已有命名空间）：
   
   | 前端 API client | 后端 service | URL 路由 |
   |---|---|---|
   | `confirmCoaching(role, id)` | `IOsgUserJobOverviewService.confirmCoaching(id, userId, op)` | `PUT /{role}/job-overview/{id}/confirm` |
   | `ackStageUpdate(role, id)` | `IOsgUserJobOverviewService.acknowledgeStageUpdate(id, userId, op)` | `POST /{role}/job-overview/{id}/ack-stage-update` |
   | `confirmMockAssignment(role, id)` | `IOsgMockPracticeService.confirmAssignment(id, userId, op)` | `PUT /{role}/mock-practice/{id}/confirm` |
   | `ackMockAssignment(role, id)` | `IOsgMockPracticeService.acknowledgeAssignment(id, userId, op)` | `POST /{role}/mock-practice/{id}/ack-assignment` |
2. mentor / asst / lead-mentor 三端的求职总览页面接入 confirm / ack-stage-update 按钮
3. 三端的模拟应聘页面接入 confirm / ack-assignment 按钮
4. 按钮点击成功后刷新列表，状态展示通过 composable 输出
5. 按钮可见性判断：根据 `osg_coaching.confirmedAt` / `osg_mock_practice.confirmedAt` 是否为 null 来决定是否展示 `[确认]` 按钮，避免第二位辅导者误点发生重复 confirm 报错
6. **asst 端按钮位置原型定位**（设计稿 §2.2 已列，实施时对齐）：
   - `osg-spec-docs/source/prototype/assistant.html:482` → `confirmCoaching` 按钮位置（求职总览 / “新申请”）
   - `:523` → `acknowledgeStageUpdate` 按钮位置（求职总览 / “阶段更新通知”）
   - `:644` → `acknowledgeStageUpdate` 按钮位置（另一 tab 阶段更新通知）
   - `:860` & `:873` → `confirmAssignment` 按钮位置（模拟应聘 / “新分配”）
   - mentor / LM 原型位置参考 `mentor.html` / `lead-mentor.html` 中同语义表格列

**测试**：

- 三端 Playwright 测试：confirm / ack 后状态变化校验
- 服务测试覆盖三端 access guard 不跨权
- `confirmedAt` 非 null 时按钮不渲染的前端快照测试

## 4. Workstream D：前端 SSOT 收口（F6）

### D.1 引入 shared composable

**任务**：

1. **先建立 fixtures 单一真相源**（设计稿 §8.3.1 方案 C）：
   - 创建 `ruoyi-system/src/test/resources/coaching-status-fixtures.json`，全枚举 5 态 + 边界用例（同设计稿 §8.3.1 示例）
   - 创建 `osg-frontend/packages/shared/src/__tests__/coaching-status.fixtures.ts`，通过相对路径 `import fixtures from '../../../../../ruoyi-system/src/test/resources/coaching-status-fixtures.json'` 引用 JSON
   - 不维护 TS / JSON 双份，JSON 是唯一真相
2. 创建 `osg-frontend/packages/shared/src/composables/useCoachingStatusDisplay.ts`：
   - `useApplicationStatusDisplay(input): CoachingStatusDisplay`
   - `useMockPracticeStatusDisplay(input): CoachingStatusDisplay`
3. 实现五态映射：

   ```typescript
   // 真实岗位
   if (bucket === 'completed') return { value: 'completed', label: '已完成', tone: 'success' }
   if (coachingStatus === 'cancelled') return { value: 'cancelled', label: '已取消', tone: 'default' }
   if (coachingStatus === 'coaching') return { value: 'coaching', label: '辅导中', tone: 'info' }
   if (assignStatus === 'assigned') return { value: 'assigned', label: '已分配导师', tone: 'warning' }
   return { value: 'pending', label: '待分配导师', tone: 'danger' }
   
   // 模拟应聘
   if (rawStatus === 'cancelled') return { value: 'cancelled', label: '已取消', tone: 'default' }
   if (rawStatus === 'completed') return { value: 'completed', label: '已完成', tone: 'success' }
   if (completedHours >= plannedHours && plannedHours > 0) return { value: 'completed', label: '已完成', tone: 'success' }
   if (rawStatus === 'confirmed' && completedHours > 0) return { value: 'coaching', label: '辅导中', tone: 'info' }
   if (rawStatus === 'scheduled' || rawStatus === 'confirmed') return { value: 'assigned', label: '已分配导师', tone: 'warning' }
   return { value: 'pending', label: '待分配导师', tone: 'danger' }
   ```

4. 单元测试覆盖五态全部分支 + 边界（completedHours == 0 / == plannedHours / > plannedHours），通过 import fixtures.ts 遍历断言

### D.2 五端引用 composable

**任务**：

1. 学生端 `mock-practice` 列表 + 详情：替换为 composable 输出
2. mentor 端 `mock-practice` + `job-overview`：同上
3. asst 端 `mock-practice` + `job-overview`：同上
4. lead-mentor 端 `mock-practice` + `job-overview`：同上
5. admin 端 `mock-practice` + `job-overview`：同上

### D.3 后端去除 statusLabel / statusTone 字段

**任务**：

1. 移除 `OsgLeadMentorMockPracticeServiceImpl` 中的 statusLabel / statusTone 输出字段
2. 同样移除 `OsgLeadMentorJobOverviewServiceImpl` 等其他端的固化 label 输出
3. 仅返回 raw 字段（assignStatus / coachingStatus / bucket / completedHours / plannedHours）

**注意**：必须先 D.2 完成（前端不再依赖 statusLabel）才能 D.3，否则会导致前端展示空白。

### D.4 学生端服务端派生公式校正

**任务**：

1. 修改 `StudentMockPracticeServiceImpl.toPracticeStatusValue` 与 `toPracticeStatusLabel`，按 §6.2 新公式实现
2. 把 `completedHours > 0` 判断改为 `approvedHours > 0`（如有区分）；本轮假设 `completedHours` 已经是审核通过累加
3. 保证学生端 service 输出与前端 composable 输出一致（用同一组测试用例校验）

## 5. Workstream E：派生展示 plannedHours（F4）

### E.1 plannedHours 计算逻辑

**任务**：

1. **本轮拍板“独立子字典，dict_label 直接作为课时数”方案**（不动 mock_practice schema）：
   - 新增 dict_type = `osg_practice_type_planned_hours`
   - 字典条目示例（dict_value 存 practiceType key，dict_label 直接存课时数）：
     - dict_value=`mock_interview`，dict_label=`2.0`
     - dict_value=`communication_test`，dict_label=`1.0`
     - dict_value=`midterm_exam`，dict_label=`1.5`
   - 不使用 css_class / remark 扩展字段存业务数值，避免未来误改
   - 后端读字典时 `Float.parseFloat(dictLabel)` 转成数值
2. 公式：`plannedHours = mock_practice.requestedMentorCount × 字典中该 practiceType 的课时数`
3. 后端各 service 在返回 mock-practice 列表时：
   - 读字典 + parseFloat(dictLabel)，计算 plannedHours，作为 raw 返回字段
   - 字典缺失 / parseFloat 失败 fallback：使用 E.2 中固化的默认值常量（shared 模块中）避免五端 fallback 不一致
4. 前端 composable 接收 plannedHours 派生

> **为什么不动 mock_practice schema 增加 plannedHours 字段**：设计稿 §4 明确主链三表不动 schema。字典方案可调节性更高（调标准课时不需 schema migration）。

**测试**：

- 字典缺失时使用兜底值
- 不同 practiceType 派生结果正确

### E.2 完成口径业务校对

**任务**：

1. 与产品方确认每种 practiceType 的标准课时数：
   - mock_interview（模拟面试）：默认 2h × mentorCount
   - communication_test（人际关系测试）：默认 1h × mentorCount
   - midterm_exam（期中考试）：默认 1.5h × mentorCount
2. 在字典或常量中固化

## 6. 测试计划

### 6.1 后端服务测试

- `OsgClassRecordServiceImplTest`：covered in Workstream A.1
- `OsgUserJobOverviewServiceImplTest`：covered in A.2 + C.1
- `OsgMockPracticeServiceImplTest`：covered in C.1
- `OsgAssistantJobOverviewControllerTest`：access guard + confirm + ack 路径
- `OsgAssistantMockPracticeControllerTest`：同上
- `OsgMentorJobOverviewControllerTest`：补 ack-stage-update 路径

### 6.2 前端单元测试

- `useApplicationStatusDisplay.spec.ts`：五态全覆盖 + 边界
- `useMockPracticeStatusDisplay.spec.ts`：同上 + plannedHours 边界
- 五端列表页 status 列渲染快照（5 × 2 = 10 个 spec）

### 6.3 跨端 Playwright e2e

至少跑两条闭环：

1. 真实岗位辅导申请闭环（学生 → LM 分配 → mentor confirm → mentor 提交课时 → admin 审核 → 学生回看）
2. 模拟应聘辅导申请闭环（同上但走 mock-practice）

每条闭环必须断言：

- 五端 status 展示一致
- 状态变迁时点正确（pending → assigned → coaching → completed）
- 课时累加正确反映在 5 端展示

### 6.4 数据迁移测试

- 在测试库跑迁移脚本前后状态展示
- 备份恢复测试

### 6.5 测试矩阵（统一跑测命令 + 覆盖 task）

| 测试层级 | 测试文件 / 位置 | 跑测命令 | 覆盖 task |
|---|---|---|---|
| 后端单元 - service | `OsgClassRecordServiceImplTest` | `mvn test -Dtest=OsgClassRecordServiceImplTest -pl ruoyi-system` | A.0.1 / A.0.2 / A.0.3 / A.1 |
| 后端单元 - service | `OsgUserJobOverviewServiceImplTest` | `mvn test -Dtest=OsgUserJobOverviewServiceImplTest -pl ruoyi-system` | A.2 / C.1 |
| 后端单元 - service | `OsgJobOverviewServiceImplTest` (admin) | `mvn test -Dtest=OsgJobOverviewServiceImplTest -pl ruoyi-system` | A.2 (admin 端) |
| 后端单元 - service | `OsgMockPracticeServiceImplTest` | `mvn test -Dtest=OsgMockPracticeServiceImplTest -pl ruoyi-system` | C.1 / C.2 |
| 后端单元 - controller | `OsgAssistantJobOverviewControllerTest` (新增) | `mvn test -Dtest=OsgAssistantJobOverviewControllerTest -pl ruoyi-admin` | C.4 |
| 后端单元 - controller | `OsgAssistantMockPracticeControllerTest` (新增) | `mvn test -Dtest=OsgAssistantMockPracticeControllerTest -pl ruoyi-admin` | C.4 |
| 后端单元 - controller | `OsgMentorJobOverviewControllerTest` (补 ack-stage-update) | `mvn test -Dtest=OsgMentorJobOverviewControllerTest -pl ruoyi-admin` | C.3 |
| 后端单元 - controller | `OsgLeadMentorJobOverviewControllerTest` (补 confirm) | `mvn test -Dtest=OsgLeadMentorJobOverviewControllerTest -pl ruoyi-admin` | C.5 |
| 前端单元 - composable | `useCoachingStatusDisplay.spec.ts` | `pnpm --filter shared test useCoachingStatusDisplay` | D.1 |
| 前端单元 - fixtures 一致 | 使用嵌入式 fixtures 测后端同一公式 | `mvn test -Dtest=StudentMockPracticeServiceImplTest -pl ruoyi-system` | D.4 + 学生端 |
| 前端 E2E | `tests/e2e/coaching-mainline.spec.ts` (新增) | `pnpm --filter osg-frontend playwright test coaching-mainline` | 跨端闭环 |
| 数据迁移 dry-run | `migration/2026-04-27-coaching-status-zh-to-en.sql` | `mysql -u<user> -p<pw> -h<host> osg_test < migration/...sql` | A.3 |
| schema dry-run | `migration/2026-04-27-class-record-add-source-fk.sql` | 同上 | A.0.1 |

**全量跑测命令**（收尾验收）：
```bash
# 后端全量
mvn test
# 前端全量
pnpm test
# Playwright 全量
pnpm playwright test
```

## 7. 任务依赖图（DAG）与实施顺序

### 7.1 任务依赖图（DAG）

```
A.0.1 schema 升级 (0.5d)
        │
        ↓
A.0.2 后端 service 校验 (0.5d) ──────────┐
        │                                │
        │        ┌────────────────────┐  │
        │        │                    │  │
        │        ↓                    ↓  │
A.0.3 my-targets 接口 (1d)     A.0.4 前端表单 (1d) [依赖 A.0.2 + A.0.3]
        │
        ↓
A.1 reviewRecord 回写 (1d) [依赖 A.0.1+A.0.2]
        │
        ↓
A.2 F1 不再设 coachingStatus (0.5d) [独立，可并行 A.1]
        │
        ↓
B.1 枚举常量收口 (1d) [独立，可并行 A.x]
        │
        ↓
A.3 数据迁移 (0.5d) [依赖 B.1，必须低峰期执行]
        │
        ↓
C.1 共用 service 方法 (2d) [修 1 + 新增 3]
        │
        ↓
C.2 改造 2 处现有接口 (1d) [依赖 C.1]
        │
        ↓
C.3 mentor 补 1 (0.5d) ──┐
C.4 asst 补 4 (1d)      ─┼─→ 三个并行 [依赖 C.1]
C.5 LM 补 1 (0.5d) ──────┘
        │
        ↓
C.6 前端按钮接入 (1d) [依赖 C.3-C.5 + D.1]
        │
        ↓
D.1 shared composable (1d) [独立，可并行 A.x / B.x / C.1-C.5]
        │
        ↓
D.2 五端引用 composable (1.5d) [依赖 D.1]
        │
        ↓
D.3 后端去 statusLabel (0.5d) [依赖 D.2]
        │
        ↓
D.4 学生端 service 派生公式 (0.5d) [独立]
        │
        ↓
E.1 plannedHours 字典 (1d) [可并行 D.x]
        │
        ↓
E.2 完成口径业务校对 (0.5d) [依赖 E.1]
```

### 7.2 关键路径与并行策略

**关键路径**（最长路径，决定整体工期）：

```
A.0.1 → A.0.2 → A.0.4 → A.1 → C.1 → C.2 → C.6
0.5d   0.5d    1d     1d   2d    1d    1d     = 7d (严格串行)
```

**并行机会**：

- **A.0 内部**：A.0.3 可与 A.0.2 并行（节省 0.5d）
- **Workstream 间**：A.2 / B.1 可与 A.1 并行；D.1 可与 C.x 并行；E.1 可与 D.x 并行
- 单人交付建议按串行；2 人协作按"A 分支 / D 分支"分工，预计可缩到 5d

### 7.3 实施优先级总图

| 优先级 | Workstream | 估时 | 是否可并行 |
|---|---|---|---|
| P0 | A.0.1 + A.0.2 + A.0.3 + A.0.4 + A.1 + A.2 | 4d | A.0.3⇋A.0.2，A.2⇋A.1 |
| P0 | A.3（数据迁移） | 0.5d | 必须 B.1 完成后 |
| P0 | B.1 + B.2（字段值收口） | 1d | 与 A.x 并行 |
| P1 | C.1 + C.2 + C.3-C.5 + C.6 | 5d | C.3/4/5 三者并行 |
| P1 | D.1 + D.2 + D.3 + D.4 | 3.5d | D.1 可早起，与 C.x 并行 |
| P2 | E.1 + E.2 | 1.5d | 与 D.x 并行 |

> **严格顺序**：A.0.1 是 A.0.2/A.0.4 的前置；A.0 整体是 A.1 的前置；C.1 是 C.2-C.6 的前置；D.1 是 D.2 的前置；D.2 是 D.3 的前置。

## 8. 完成定义

满足以下条件才算本轮完成：

1. `osg_class_record` 完成 schema 升级（新增 `practice_id` / `application_id` 两个 nullable 字段）
2. 三辅导者端（mentor / asst / lead-mentor）提交课时表单均包含"为哪个申请提交"下拉，提交时必传 `practiceId` 或 `applicationId`
3. `OsgClassRecordServiceImpl.reviewRecord()` 审核通过时回写 completedHours / totalHours，单元测试覆盖
4. `OsgUserJobOverviewServiceImpl.assignMentors()` 不再直接设 coachingStatus
5. 全仓 `git grep "辅导中"` 在非测试 fixture / 非中文展示文案中无匹配
6. asst 端 4 个新增接口 + mentor 端 1 个新增接口 + LM 端 1 个新增接口全部上线，access guard 测试覆盖
7. shared composable 落地，五端 mock-practice + job-overview 列表 / 详情都通过 composable 输出 status
8. 后端 controller 不再返回 statusLabel / statusTone 字段
9. 两条闭环 Playwright e2e 跑通，五端 status 展示断言一致
10. 数据迁移脚本在生产环境执行完毕，无残留中文 status 值、无 NULL coachingStatus

## 9. 风险与回滚

### 9.1 主要风险

- **A.0 schema 升级**：作为本轮唯一的 schema 变更，必须在测试库验证后才能进生产；nullable 字段不破坏存量，但三端提交表单未同步上线时会导致提交被 service 拒绝；推荐将 schema + 后端校验 + 前端表单作为一组 atomic commit 同步上线
- **A.0 三端表单数据源 `my-targets` 接口**：依赖 `osg_coaching.mentor_ids` 与 `osg_mock_practice.mentor_ids` （CSV 串）查询，需验证 `FIND_IN_SET(#{userId}, mentor_ids)` 能准确定位到包含当前用户的记录，且同一用户同时出现于 mentor / asst / lead-mentor 多角色场景下查询结果不重复
- A.1 审核回写引入并发竞态：必须用 SQL `UPDATE ... SET col = COALESCE(col, 0) + ?` 而不是先查后写
- **C.1 confirm 并发竞态**：mentor / asst / LM 多人同时点击 [确认] 时，"先查后写"模式存在时间窗口；本轮采用原子 SQL `UPDATE ... WHERE confirmedAt IS NULL` 然后查 affectedRows，详见 C.1 实施
- **A.2 重新分配 vs 老 mentor 提交课时并发**：老 mentor A 提交课时与 LM 重新分配为 B 同时发生时，A 提交走 `createMentorClassRecord` 路径，校验 mentor_ids 不通过则被 `ServiceException` 拒绝，预期行为；详见设计稿 §F1 并发场景裁决
- A.3 数据迁移失败：必须先备份，先在测试库验证
- C.5 前端按钮接入：访客视角下点 confirm 按钮可能命中权限边界，要测三端 access guard
- D.3 移除 statusLabel：必须确保 D.2 已完全 ship 才能动，否则会导致前端展示空白

### 9.2 回滚策略

- **A.0 schema**：`ALTER TABLE ... DROP COLUMN` 可回滚，但需同步 revert 后端实体 + service 校验代码；前端表单改造为独立 commit，可独立 revert
- A.1：单条回滚 commit 即可
- A.3：备份表恢复（保留 7 天）
- C.5：feature flag 控制，关闭即可
- D.3：revert commit + 后端临时恢复 statusLabel 字段

### 9.3 已知技术债（本轮不解决，记录跟踪）

本轮为收敛范围、避免拆得过大，以下技术债**显式遗留到下一轮收口**：

- **admin 端 vs 三辅导者端两个独立 assignMentors service 长期演进发散风险**：
  - 现状：`OsgUserJobOverviewServiceImpl.assignMentors()` 与 `OsgJobOverviewServiceImpl.assignMentors()` 是两份高度重复代码（参 A.2）
  - 本轮：A.2 同步修两边 4 项行为（删除 setCoachingStatus / status='assigned' / confirmedAt 重置 / 重分配重置）
  - 风险：未来其他修复（新加状态分支、字段、校验）只改一边的概率高，两份代码会逐渐发散
  - 后续治理建议：抽取共用方法 `IOsgJobApplicationAssignmentService.assignMentors()`，admin 端 + 三辅导者端 service 都委托
  - 跟踪文档：`docs/architecture/tech-debt/osg-job-overview-services-duplication.md`（本轮收口结束后创建并 link 到本计划）

- **mock-practice 共用 service 内部还存在 LM 端独立 service alias**（C.2）：
  - 现状：`IOsgLeadMentorMockPracticeService.acknowledgeAssignment` 与 `IOsgMockPracticeService.acknowledgeAssignment` 共存，前者作为 alias 委托
  - 后续治理：删除 LM 端 service alias，controller 直接调共用方法

## 10. 与既有计划的关系

本计划与以下既有计划共存且不冲突：

- `2026-03-25-osg-five-end-curl-closure-implementation-plan.md`：本计划是其后续延展，专注主链状态机收口
- `2026-03-27-five-end-course-application-flow-alignment-implementation-plan.md`：本计划与之兼容，§324"不动 schema 用映射收口"决策本计划严格遵守
- `2026-03-27-student-formal-dataflow-closure-implementation-plan.md`：本计划承接其学生端写主链能力，重点向下游辅导者端 + admin 端扩展

## 11. 上线观察指标

上线后 24 小时内必须主动观察以下指标，发现异常立即走 §9.2 回滚策略：

| 指标 | 期望值 | 监控位置 | 异常处理 |
|---|---|---|---|
| 五端 LM/admin 求职总览页 status 分布 | `pending+assigned+coaching+completed+cancelled = 100%`，无 NULL，无中文 | `SELECT coaching_status, COUNT(*) FROM osg_job_application GROUP BY coaching_status` | 出 NULL / 中文 → 立即停止 A.3 后续，回滚迁移脚本 |
| confirm 接口失败率 | < 1%（不超过历史水平） | nginx access log 或 `osg_action_log` 表 | 失败率 > 5% 持续 10 分钟 → 走 §9.2 回滚 C.5（feature flag 关闭） |
| 课时审核回写完整性 | `mock_practice.completed_hours` 累加值 ≡ `class_record.duration_hours` 总和 | `SELECT mp.practice_id, mp.completed_hours, SUM(cr.duration_hours) FROM osg_mock_practice mp JOIN osg_class_record cr ON mp.practice_id=cr.practice_id WHERE cr.status='approved' GROUP BY mp.practice_id HAVING mp.completed_hours != SUM(cr.duration_hours)` | 不一致 → 立即回滚 A.1 |
| 学生端 status 投诉数 | < 5 件/天 | 客服系统 | > 5 件/天 ⌁ 加快历史数据补刷决策（本轮拒绝，作为应急 plan B） |
| `osg_class_record.practice_id`/`application_id` 堆积占比 | 上线后新增记录中该两字段非 null 占比 ≡ 100% | `SELECT COUNT(*) FROM osg_class_record WHERE submitted_at > '<上线时间>' AND practice_id IS NULL AND application_id IS NULL` | 不为 0 → A.0.2 校验漏洞，立即修补 |
| repeat confirm 拒绝率 | 如发生重复 confirm 请求，后端应 100% 招出 `已被确认` | controller log | 出现“staically success” → C.1 原子 SQL 未生效，立即检查 |

**观察指标拓权**：由当値 oncall 负责人负责记录此表中所有指标连续 24 小时的取值。不同指标阅透不同个体负责人：
- 状态分布与课时完整性：后端开发
- confirm 接口失败率 / repeat 拒绝率：后端开发
- 学生端投诉数：产品 / 运营
- A.0 校验漏洞：全栈 oncall
