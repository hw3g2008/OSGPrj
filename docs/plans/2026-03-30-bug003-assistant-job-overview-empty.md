# BUG-003 助教端学员求职总览 Assistant 链路修复实施方案

> 日期：2026-03-30
> 状态：已按代码与 git 历史重新校验
> 结论来源：当前仓库实现、提交历史、接口映射关系、服务层查询逻辑

## 1. 目标

把助教端 `Job Overview` 从“复用 mentor carrier route”改成“助教专属读取链路”，修复助教端页面空数据问题，同时保持 mentor 现有链路不回归。

## 2. 已校验结论

### 2.1 真正根因

当前问题的根因不是单纯的 `assistant_id` 数据缺失，也不是某次 `userId` 修复把页面改坏了，而是：

1. 助教前端当前调用的是 mentor URL：
   - `GET /api/mentor/job-overview/list`
   - `GET /api/mentor/job-overview/calendar`
2. mentor 后端链路的 `coaching` 视图只会补 mentor / lead-mentor 可见记录，不会补 assistant 专属记录。
3. list 端点在进入 service 之前先执行了 `startPage()`，导致第一页之外的 assistant 名下投递根本进不到后续 `hasAssistantOwnership(...)` 判断。

换句话说，当前是“助教页面借了 mentor 路由名和 mentor 查询语义”，不是只借了一个 URL 名字。

### 2.2 为什么原文档结论不准确

原文档把三个层面的东西混在了一起：

- `list` 分页截断现象
- `assistant_id` / `user_id` 历史风险
- `calendar` 也空时的运行库数据问题

这三者不能等价。

按当前代码和 git 历史，能够 100% 坐实的根因只有一条：

> 助教端没有自己的 job overview 查询链路，assistant 名下 application 从未被专门补查回来。

### 2.3 为什么不是“那次 userId 修复”导致的

经 git 历史核对：

- `5613ef5e`：助教页接入真实页面，开始直接请求 mentor job overview 接口。
- `0180572e`：引入 assistant ownership 判断，但只是在已有 `rows` 上过滤，没有 assistant 专属补查。
- `756b8a16`：补了 mentor / lead-mentor 相关回填逻辑（`managedRows`、`coachingApplicationIds`），仍未增加 assistant 专属回填。
- `e97e8a4e`：修的是 admin 分配导师流程把 `staffId` 转成真实 `userId` 写入 `mentor_ids`，不属于 assistant job overview 读取链路。

仓库历史中不存在这些 assistant 修复痕迹：

- `selectJobApplicationByStudentIds`
- `resolveAssistantRows`
- `assistantRows`

因此，这不是“修过但没合进去”，而是“历史上根本没有实现 assistant 专属 job overview 补查”。

## 3. 当前代码证据

### 3.1 助教前端仍在请求 mentor URL

文件：`osg-frontend/packages/shared/src/api/assistantCareer.ts`

```ts
export function getAssistantJobOverviewList(filters: AssistantJobOverviewFilters = {}) {
  return http.get<AssistantTableResponse<AssistantJobOverviewRecord>>('/api/mentor/job-overview/list', {
    params: toRequestParams(filters),
  })
}

export function getAssistantJobOverviewCalendar() {
  return http.get<AssistantJobOverviewRecord[]>('/api/mentor/job-overview/calendar')
}
```

### 3.2 mentor list 端点先分页

文件：`ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`

```java
@GetMapping("/api/mentor/job-overview/list")
public TableDataInfo mentorList(OsgJobApplication query)
{
    if (RequestContextHolder.getRequestAttributes() != null)
    {
        startPage();
    }
    List<Map<String, Object>> rows = leadMentorJobOverviewService.selectOverviewList("coaching", query, SecurityUtils.getUserId()).stream()
        .map(this::toLegacyMentorOverviewRow)
        .toList();
    return getDataTable(rows);
}
```

### 3.3 service 不会专门查询 assistant 名下 application

文件：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImpl.java`

```java
if (SCOPE_COACHING.equals(scope))
{
    OsgJobApplication managedQuery = normalizeQuery(rawQuery);
    managedQuery.setLeadMentorId(currentUserId);
    List<OsgJobApplication> managedRows = jobApplicationMapper.selectJobApplicationList(managedQuery);
    List<OsgJobApplication> visibleRows = mergeApplications(rows, managedRows);
    Set<Long> coachingApplicationIds = resolveCoachingApplicationIds(currentUserId);
    visibleRows = mergeApplications(visibleRows,
        filterRowsByQuery(selectMissingApplications(coachingApplicationIds, visibleRows), normalizedQuery));
    Map<Long, OsgStudent> studentMap = loadStudentMap(visibleRows.stream()
        .map(OsgJobApplication::getStudentId)
        .filter(Objects::nonNull)
        .toList());
    return visibleRows.stream()
        .filter(row -> coachingApplicationIds.contains(row.getApplicationId())
            || canManage(row, currentUserId)
            || hasAssistantOwnership(row, currentUserId, studentMap))
        .toList();
}
```

这里没有任何 assistant 专属 application 查询。

## 4. 修复原则

### 4.1 assistant 必须走 assistant 链路

本次修复不再把 assistant 页面继续挂在 mentor 语义上。

明确拆分为：

- assistant 前端请求 assistant URL
- backend 提供 assistant job overview 入口
- service / mapper 用 assistant 专属查询直接取“我名下学员的 application”

### 4.2 避免再次踩 PageHelper 第一条查询陷阱

不能采用“先查 assistant 名下 student，再查 application”的两段式分页链路，因为 list 端点的 `startPage()` 会劫持第一条查询，仍然存在截断风险。

因此 assistant list 必须走“一条 application join student”的 SQL，让分页作用在正确的数据集上。

## 5. 方案设计

### 5.1 接口改造

新增 assistant 专属端点：

- `GET /api/assistant/job-overview/list`
- `GET /api/assistant/job-overview/calendar`

保留现有 mentor 端点：

- `GET /api/mentor/job-overview/list`
- `GET /api/mentor/job-overview/calendar`

### 5.2 查询设计

新增 assistant 专属 mapper 方法，直接查询 assistant 名下 application：

```sql
select app.*
from osg_job_application app
join osg_student stu on stu.student_id = app.student_id
where stu.assistant_id = #{assistantUserId}
  -- 继续附加 keyword / companyName / currentStage / month / status 等筛选
order by app.submitted_at desc, app.application_id desc
```

这样：

- list 端分页会落在 assistant 可见 application 集合上
- calendar 端可复用同一查询，但不启用分页
- 不再依赖 mentor 的 `coaching` 补查逻辑

### 5.3 service 设计

保持现有 `selectOverviewList("coaching", ...)` 给 mentor / lead-mentor 使用。

新增 assistant 专属读取入口，建议二选一：

1. 在同一 service 中新增 assistant 专属方法
2. 或增加 `assistant` scope，但实现上必须走独立查询分支

本次建议采用“同一 service 内新增 assistant 专属方法”，避免继续扩大 `coaching` scope 的歧义。

### 5.4 本次不改

本轮只覆盖助教端页面实际使用的两个读取接口：

- list
- calendar

本轮不扩这些内容：

- assistant detail 接口
- assistant confirm 接口
- assistant export 接口

原因：当前助教页实现只依赖 list + calendar，页面里“查看详情”是本地选中行，不是后端 detail API。

## 6. 改动文件

### 6.1 前端

- 修改：`osg-frontend/packages/shared/src/api/assistantCareer.ts`

改动：

- 把 job overview list URL 改成 `/api/assistant/job-overview/list`
- 把 calendar URL 改成 `/api/assistant/job-overview/calendar`

### 6.2 后端 controller

- 修改：`ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`

改动：

- 新增 `assistantList(...)`
- 新增 `assistantCalendar(...)`
- mentor 原有方法保持不变

### 6.3 后端 service

- 修改：`ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImpl.java`
- 可选同步修改：`ruoyi-system/src/main/java/com/ruoyi/system/service/IOsgLeadMentorJobOverviewService.java`

改动：

- 新增 assistant 专属读取方法
- 复用现有 payload 映射逻辑
- 不再让 assistant list / calendar 走 `coaching` 分支

### 6.4 mapper

- 修改：`ruoyi-system/src/main/java/com/ruoyi/system/mapper/OsgJobApplicationMapper.java`
- 修改：`ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml`

改动：

- 新增 assistant 专属 list 查询方法
- SQL 直接 join `osg_student`

## 7. 实施任务

### Task 1：锁住 assistant API 合同

**Files**

- Modify: `osg-frontend/packages/shared/src/api/assistantCareer.ts`
- Add or Modify Test: `osg-frontend/packages/assistant/src/__tests__/career-api-contract.spec.ts`

- [ ] 先写失败测试，断言 assistant job overview 不再请求 mentor URL：

```ts
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('assistant career api contract', () => {
  it('uses assistant job overview endpoints', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../shared/src/api/assistantCareer.ts'),
      'utf-8'
    )

    expect(source).toContain(\"/api/assistant/job-overview/list\")
    expect(source).toContain(\"/api/assistant/job-overview/calendar\")
    expect(source).not.toContain(\"/api/mentor/job-overview/list\")
  })
})
```

- [ ] 运行失败测试，确认当前仍引用 mentor URL：

```bash
pnpm --dir osg-frontend vitest run packages/assistant/src/__tests__/career-api-contract.spec.ts
```

- [ ] 修改 assistantCareer API 路径后重新运行，确认通过。

### Task 2：新增 assistant controller 入口

**Files**

- Modify: `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java`
- Add or Modify Test: `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgJobOverviewAssistantControllerTest.java`

- [ ] 先写 controller 失败测试，断言 assistant URL 可返回 legacy rows：

```java
@Test
void assistantListShouldUseAssistantChainRows()
{
    when(leadMentorJobOverviewService.selectAssistantOverviewList(any(OsgJobApplication.class), eq(200L)))
        .thenReturn(List.of(Map.of(
            "applicationId", 9L,
            "studentId", 501L,
            "studentName", "Assistant Owned Student",
            "companyName", "Goldman Sachs",
            "positionName", "IB Analyst",
            "currentStage", "First Round",
            "interviewTime", Timestamp.valueOf(LocalDateTime.of(2026, 3, 29, 14, 30)),
            "submittedAt", Timestamp.valueOf(LocalDateTime.of(2026, 3, 28, 9, 15))
        )));

    mockMvc.perform(get("/api/assistant/job-overview/list")
            .header("Authorization", "Bearer assistant-token"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.rows[0].studentName").value("Assistant Owned Student"));
}
```

- [ ] 运行测试，确认当前失败，因为 assistant 端点不存在。

- [ ] 在 controller 中新增：

```java
@GetMapping("/api/assistant/job-overview/list")
public TableDataInfo assistantList(OsgJobApplication query)
{
    if (RequestContextHolder.getRequestAttributes() != null)
    {
        startPage();
    }
    List<Map<String, Object>> rows = leadMentorJobOverviewService.selectAssistantOverviewList(query, SecurityUtils.getUserId()).stream()
        .map(this::toLegacyMentorOverviewRow)
        .toList();
    return getDataTable(rows);
}

@GetMapping("/api/assistant/job-overview/calendar")
public AjaxResult assistantCalendar()
{
    OsgJobApplication query = buildMentorQueryFromRequest();
    List<Map<String, Object>> rows = leadMentorJobOverviewService.selectAssistantOverviewList(query, SecurityUtils.getUserId()).stream()
        .map(this::toLegacyCalendarEvent)
        .filter(event -> event.get("time") != null)
        .toList();
    return success(rows);
}
```

- [ ] 重新运行 controller 测试，确认通过。

### Task 3：新增 assistant 专属 service / mapper 查询

**Files**

- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/IOsgLeadMentorJobOverviewService.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImpl.java`
- Modify: `ruoyi-system/src/main/java/com/ruoyi/system/mapper/OsgJobApplicationMapper.java`
- Modify: `ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml`
- Modify Test: `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImplTest.java`

- [ ] 先写 service 失败测试，断言 assistant 读取不依赖 mentor 全局第一页：

```java
@Test
void selectAssistantOverviewListShouldReturnAssistantOwnedRowsWithoutMentorCarrierFallback()
{
    OsgJobApplication ownedRow = new OsgJobApplication();
    ownedRow.setApplicationId(8010L);
    ownedRow.setStudentId(3010L);
    ownedRow.setStudentName("Assistant Owned Student");
    ownedRow.setCompanyName("Goldman Sachs");
    ownedRow.setPositionName("IB Analyst");
    ownedRow.setCurrentStage("First Round");
    ownedRow.setSubmittedAt(new Date());

    when(jobApplicationMapper.selectAssistantJobApplicationList(any(), eq(920L))).thenReturn(List.of(ownedRow));
    when(coachingMapper.selectCoachingList(any(OsgCoaching.class))).thenReturn(List.of());

    List<Map<String, Object>> rows = service.selectAssistantOverviewList(new OsgJobApplication(), 920L);

    assertEquals(1, rows.size());
    assertEquals(8010L, rows.get(0).get("applicationId"));
}
```

- [ ] 运行失败测试，确认当前缺少方法和 mapper。

- [ ] 新增 service 接口：

```java
List<Map<String, Object>> selectAssistantOverviewList(OsgJobApplication query, Long currentUserId);
```

- [ ] 在 impl 中实现 assistant 专属读取：

```java
@Override
public List<Map<String, Object>> selectAssistantOverviewList(OsgJobApplication query, Long currentUserId)
{
    if (currentUserId == null)
    {
        return List.of();
    }

    OsgJobApplication normalizedQuery = normalizeQuery(query);
    List<OsgJobApplication> rows = jobApplicationMapper.selectAssistantJobApplicationList(normalizedQuery, currentUserId);
    rows = filterRowsByQuery(rows, normalizedQuery);
    Map<Long, OsgCoaching> coachingMap = selectCoachingMap();
    return rows.stream()
        .sorted(Comparator.comparing(OsgJobApplication::getSubmittedAt, Comparator.nullsLast(Date::compareTo)).reversed())
        .map(row -> toOverviewPayload(row, coachingMap.get(row.getApplicationId())))
        .toList();
}
```

- [ ] 新增 mapper 方法声明：

```java
List<OsgJobApplication> selectAssistantJobApplicationList(@Param("query") OsgJobApplication query,
        @Param("assistantUserId") Long assistantUserId);
```

- [ ] 新增 SQL：

```xml
<select id="selectAssistantJobApplicationList" resultMap="OsgJobApplicationResult">
    select
    <include refid="selectJobApplicationColumns"/>
    from osg_job_application app
    join osg_student stu on stu.student_id = app.student_id
    <where>
        stu.assistant_id = #{assistantUserId}
        <if test="query.studentName != null and query.studentName != ''">
            and app.student_name like concat('%', #{query.studentName}, '%')
        </if>
        <if test="query.companyName != null and query.companyName != ''">
            and app.company_name = #{query.companyName}
        </if>
        <if test="query.currentStage != null and query.currentStage != ''">
            and app.current_stage = #{query.currentStage}
        </if>
        <if test="query.assignStatus != null and query.assignStatus != ''">
            and app.assign_status = #{query.assignStatus}
        </if>
        <if test="query.status != null and query.status != ''">
            and app.coaching_status = #{query.status}
        </if>
        <if test="query.month != null and query.month != ''">
            and date_format(app.interview_time, '%Y-%m') = #{query.month}
        </if>
        <if test="query.keyword != null and query.keyword != ''">
            and (
                app.student_name like concat('%', #{query.keyword}, '%')
                or app.company_name like concat('%', #{query.keyword}, '%')
                or app.position_name like concat('%', #{query.keyword}, '%')
            )
        </if>
    </where>
    order by app.submitted_at desc, app.application_id desc
</select>
```

- [ ] 运行 service 测试，确认通过。

### Task 4：回归验证

**Files**

- Verify: `ruoyi-system/src/test/java/com/ruoyi/system/service/impl/OsgLeadMentorJobOverviewServiceImplTest.java`
- Verify: `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgJobOverviewAssistantControllerTest.java`
- Verify: `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgJobOverviewMentorControllerTest.java`
- Verify: `osg-frontend/packages/assistant/src/__tests__/career-api-contract.spec.ts`

- [ ] 运行后端 service 测试：

```bash
mvn -q -pl ruoyi-system -Dtest=OsgLeadMentorJobOverviewServiceImplTest test
```

- [ ] 运行后端 controller 测试：

```bash
mvn -q -pl ruoyi-admin -Dtest=OsgJobOverviewAssistantControllerTest,OsgJobOverviewMentorControllerTest test
```

- [ ] 运行前端接口合同测试：

```bash
pnpm --dir osg-frontend vitest run packages/assistant/src/__tests__/career-api-contract.spec.ts
```

- [ ] 手工核对：

```text
1. 助教端 /career/job-overview 列表有数据
2. 助教端 calendar 有数据
3. mentor 端 /career/job-overview 不回归
4. 关键词 / 状态 / 月份筛选仍生效
```

## 8. 风险与回退点

### 8.1 风险

- 如果运行库里 `osg_student.assistant_id` 仍有历史脏数据，本次修复后 list 逻辑会正确，但仍可能出现“assistant 无归属数据”的现象。
- 如果后续 assistant 页面需要后端 detail / export / confirm，则必须继续走 assistant 专属链路，不应再复用 mentor path。

### 8.2 回退点

本次改动是“新增 assistant 专属读取链路”，mentor 现有链路保持不动，因此回退简单：

- assistant 前端 URL 可单独回滚
- assistant controller 新增方法可单独回滚
- assistant mapper 方法可单独移除

## 9. 最终建议

推荐按本方案执行，不继续在 mentor `coaching` scope 中叠加 assistant 特殊逻辑。

原因：

- 语义更清晰
- 风险更小
- 分页问题一次解决
- 后续 assistant 能力可继续独立扩展
