# 后端 Ticket A：Lead-Mentor ClassRecord GET endpoints 补齐

**日期**：2026-04-26  
**触发**：`2026-04-26-three-ends-overall-extraction-survey.md` §3.2 第 2 批 — 解锁 M4 Class Records shared 抽取  
**接收方**：后端组

---

## 1. 背景

按 `2026-04-26-lm-asst-commonality-quantification.md` §3.2 + §6.2 决策：

> **课程记录** (`class-records`)：LM 后端**只有** `createLeadMentorClassRecord` (POST 上报)，**没有** `getLeadMentorClassRecordList` / `Stats` GET 端点。Asst 后端有完整 list + stats + create。

→ **LM 端 `views/teaching/class-records/index.vue` (1488 行) 当前是「上报 modal + 占位 list」混合状态**，无法和 asst/mentor 端做 shared 抽取。

补齐 LM list/stats GET endpoints 后，可解锁 M4 Class Records shared 抽取（预计净瘦身 ~80 行 Tag 组件 + 长期解锁 LM 1488 行视图重构）。

---

## 2. 当前后端现状（`OsgClassRecordController.java` 实测）

### 2.1 已有端点

| 路径 | 方法 | 端 | 实现 |
|---|---|---|---|
| `/admin/class-record/list` | GET | admin + asst（权限分支） | `selectClassRecordList` / `selectAssistantClassRecordList` |
| `/admin/class-record/stats` | GET | admin + asst（权限分支） | `selectClassRecordStats` / `selectAssistantClassRecordStats` |
| `/admin/class-record/export` | GET | admin only | `selectClassRecordExportList` |
| `/api/mentor/class-records/list` | GET | mentor | `selectMentorClassRecordList` |
| `/api/mentor/class-records/{id}` | GET | mentor | `selectMentorClassRecordById` |
| `/api/mentor/class-records` | POST | mentor | `createMentorClassRecord` |
| `/assistant/class-records` | POST | asst | `createAssistantClassRecord` |

### 2.2 LM 端缺失

```
❌ GET  /lead-mentor/class-record/list
❌ GET  /lead-mentor/class-record/stats
✅ POST /lead-mentor/class-record（已有 createLeadMentorClassRecord，路径待核实）
```

---

## 3. 期望补齐的端点

### 3.1 端点 1：`GET /lead-mentor/class-record/list`

**入参**（参考 admin/asst 已有）：

```
keyword?: string         // 学员姓名/ID 搜索
courseType?: string      // 辅导类型（job_coaching / mock_interview / midterm 等）
classStatus?: string     // 审核状态（pending / approved / rejected）
courseSource?: string    // 课程来源
tab?: string             // tab key
classDateStart?: yyyy-MM-dd
classDateEnd?: yyyy-MM-dd
+ pageNum, pageSize（分页）
```

**出参**：`TableDataInfo<Map<String, Object>>` — schema **直接复用 asst** 的 `selectAssistantClassRecordList` 返回结构（关键字段：`recordId / studentId / studentName / mentorId / mentorName / coachingType / courseContent / classDate / durationHours / status / submittedAt / ...`）

**业务过滤逻辑**：按当前登录 LM 的"学员关系"过滤（仅返回该班主任名下学员的课程记录）

**实现建议**（参考 M0.2 `IOsgUserJobOverviewService` 三端共用模式）：

```java
public interface IOsgUserClassRecordService {
    List<Map<String, Object>> selectList(Long userId, ClassRecordQuery query, AccessRole role);
    Map<String, Object> selectStats(Long userId, ClassRecordQuery query, AccessRole role);
}
```

`AccessRole` 枚举：`MENTOR / ASSISTANT / LEAD_MENTOR`，由 controller 根据登录用户权限传入。

### 3.2 端点 2：`GET /lead-mentor/class-record/stats`

**入参**：与 list 同  
**出参**：`AjaxResult` 含 `{ totalCount, pendingCount, approvedCount, rejectedCount, totalHours, byCoachingType: { ... } }`（参考 asst 已有 stats 结构）

### 3.3 控制器骨架（参考已有实现）

```java
@RestController
public class OsgClassRecordController extends BaseController {

    // ... 已有端点保留

    @GetMapping("/lead-mentor/class-record/list")
    public TableDataInfo leadMentorList(@RequestParam(value = "keyword", required = false) String keyword,
                                        // ... 其他 params
                                        )
    {
        if (!hasLeadMentorAccess())
        {
            return forbiddenTable();
        }
        startPage();
        List<Map<String, Object>> rows = classRecordService.selectLeadMentorClassRecordList(
            keyword, courseType, classStatus, courseSource, tab,
            classDateStart, classDateEnd,
            SecurityUtils.getUserId()
        );
        return getDataTable(rows);
    }

    @GetMapping("/lead-mentor/class-record/stats")
    public AjaxResult leadMentorStats(...) { /* 同上 */ }

    private boolean hasLeadMentorAccess() {
        // 复用 leadMentorAccessService 或新增
    }
}
```

---

## 4. SQL 查询要点

### 4.1 LM 学员关系过滤

LM 名下学员通过 `osg_lead_mentor_student_relation` 关联：

```sql
SELECT cr.* 
FROM osg_class_record cr
INNER JOIN osg_lead_mentor_student_relation rel
  ON cr.student_id = rel.student_id
WHERE rel.lead_mentor_id = #{userId}
  AND cr.del_flag = '0'
  -- + 其他 filter
```

### 4.2 stats 聚合

```sql
SELECT 
  COUNT(*) AS total_count,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
  SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
  SUM(duration_hours) AS total_hours
FROM osg_class_record cr
INNER JOIN osg_lead_mentor_student_relation rel ON cr.student_id = rel.student_id
WHERE rel.lead_mentor_id = #{userId}
  -- + filter
```

---

## 5. 验收标准

### 5.1 接口契约一致性

- [ ] `GET /lead-mentor/class-record/list` 返回结构 = `GET /admin/class-record/list`（asst 分支）的字段超集
- [ ] `GET /lead-mentor/class-record/stats` 返回结构 = `GET /admin/class-record/stats`（asst 分支）字段一致

### 5.2 权限验证

- [ ] 非 LM 角色访问返回 403
- [ ] LM 仅能看到自己名下学员的课程记录（其他 LM 名下的看不到）

### 5.3 功能测试

- [ ] keyword 搜索能命中学员姓名/ID
- [ ] courseType / classStatus / classDate 过滤正确
- [ ] 分页参数 pageNum + pageSize 工作正常

### 5.4 性能

- [ ] list 查询在 10000 条数据下 < 500ms
- [ ] stats 查询在 10000 条数据下 < 300ms

### 5.5 回归

- [ ] 现有 admin / asst / mentor 端点不受影响（已有测试通过）

---

## 6. 工作量估算

| 任务 | 工作量 |
|---|---:|
| 设计 `IOsgUserClassRecordService` 接口（参考 M0.2 模式） | 0.2 天 |
| 实现 `selectLeadMentorClassRecordList` + SQL | 0.4 天 |
| 实现 `selectLeadMentorClassRecordStats` + SQL | 0.3 天 |
| Controller 端点 + 权限验证 | 0.2 天 |
| 单元测试 + 集成测试 | 0.4 天 |
| **总计** | **1.5 天** |

---

## 7. 前端联动

后端解锁后，前端需做：

1. `osg-frontend/packages/shared/src/api/class-records.ts` 增加 `getLeadMentorClassRecordList` / `Stats` binding
2. `lead-mentor/src/views/teaching/class-records/index.vue` 把 mock list 改为真实 GET 调用
3. 启动 M4 抽取：`ClassRecordStatusTag.vue` + `ClassRecordTypeTag.vue`
4. 三端接入新 Tag 组件（asst / mentor (`courses`) / LM）

---

## 8. 关联文档

- `docs/architecture/2026-04-26-lm-asst-commonality-quantification.md` §3.2 / §6.2
- `docs/architecture/class-records-unification/00-epic-overview.md` (M4 quick assessment)
- `docs/architecture/2026-04-26-three-ends-overall-extraction-survey.md` §3.2 第 2 批
- `docs/plans/class-records-fix/`（如有 - 可能需协调）

---

## 9. 状态

⏳ 待后端组排期 + 实施
