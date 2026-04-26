# 后端 Ticket B：Student DTO Schema 对齐（Basic + Extension）

**日期**：2026-04-26  
**触发**：`2026-04-26-three-ends-overall-extraction-survey.md` §3.2 第 2 批 — 解锁 M5 Students shared 抽取  
**接收方**：后端组

---

## 1. 背景

按 `2026-04-26-lm-asst-commonality-quantification.md` §3.2：

> **学员列表** (`students`)：
> - LM `LeadMentorStudentListItem` 字段：`relations[]` / `applyCount` / `interviewCount` / `offerCount`（**班主任视角**：学员关系 + 求职数据）
> - Asst `StudentListItem` 字段：`leadMentorName` / `contractStatus` / `isBlacklisted` / `pendingReview` / `jobCoachingCount` / `basicCourseCount` / `mockInterviewCount` / `remainingHours`（**助教视角**：学员合同 + 课程）
> - **后端字段不重叠**

→ 强行把 LM/Asst Student DTO 合一会破坏后端契约；强行抽 shared StudentTable 会变成"if-else 大杂烩"。

按 §6.2 推荐路径：**两端共用 `OsgStudentBasic` 基础 DTO + 各端独立 `OsgStudentExtension`**，前端按权限取超集字段。

---

## 2. 当前 schema 现状

### 2.1 LM `LeadMentorStudentListItem`（班主任视角）

字段（推断）：

| 字段 | 类型 | 含义 |
|---|---|---|
| `studentId` | Long | 学员 ID |
| `studentName` | String | 学员姓名 |
| `englishName` | String | 英文名 |
| `school` | String | 学校 |
| `major` | String | 专业 |
| `relations[]` | List<RelationInfo> | 与学员的关系（mentor 关联、合同关联等） |
| `applyCount` | Integer | 求职申请数 |
| `interviewCount` | Integer | 面试数 |
| `offerCount` | Integer | offer 数 |

### 2.2 Asst `StudentListItem`（助教视角）

字段：

| 字段 | 类型 | 含义 |
|---|---|---|
| `studentId` | Long | 学员 ID |
| `studentName` | String | 学员姓名 |
| `englishName` | String | 英文名 |
| `school` | String | 学校 |
| `leadMentorName` | String | 所属 LM 姓名 |
| `contractStatus` | String | 合同状态 |
| `isBlacklisted` | Boolean | 是否黑名单 |
| `pendingReview` | Boolean | 待审核 |
| `jobCoachingCount` | Integer | 岗位辅导数 |
| `basicCourseCount` | Integer | 基础课程数 |
| `mockInterviewCount` | Integer | 模拟面试数 |
| `remainingHours` | Number | 剩余课时 |

### 2.3 字段对比矩阵

| 字段 | LM | Asst |
|---|:---:|:---:|
| studentId | ✅ | ✅ |
| studentName | ✅ | ✅ |
| englishName | ✅ | ✅ |
| school | ✅ | ✅ |
| major | ✅ | ?（待核） |
| **共有字段** | **5** | **5** |
| relations[] | ✅ | ❌ |
| applyCount | ✅ | ❌ |
| interviewCount | ✅ | ❌ |
| offerCount | ✅ | ❌ |
| **LM 独有** | **4** | — |
| leadMentorName | ❌ | ✅ |
| contractStatus | ❌ | ✅ |
| isBlacklisted | ❌ | ✅ |
| pendingReview | ❌ | ✅ |
| jobCoachingCount | ❌ | ✅ |
| basicCourseCount | ❌ | ✅ |
| mockInterviewCount | ❌ | ✅ |
| remainingHours | ❌ | ✅ |
| **Asst 独有** | — | **8** |

**字段重叠率**：5 / 17 = **~29%**

---

## 3. 推荐方案：Basic + Extension 拆分

### 3.1 设计模式

```java
// 共用基础 DTO（5 端共享）
public class OsgStudentBasic {
    private Long studentId;
    private String studentName;
    private String englishName;
    private String school;
    private String major;
    // 通用学员状态字段
    private String studentStatus;       // active / paused / completed
    private String studentStatusLabel;
}

// 班主任视角 extension
public class OsgLeadMentorStudentExtension extends OsgStudentBasic {
    private List<RelationInfo> relations;
    private Integer applyCount;
    private Integer interviewCount;
    private Integer offerCount;
}

// 助教视角 extension
public class OsgAssistantStudentExtension extends OsgStudentBasic {
    private String leadMentorName;
    private String contractStatus;
    private Boolean isBlacklisted;
    private Boolean pendingReview;
    private Integer jobCoachingCount;
    private Integer basicCourseCount;
    private Integer mockInterviewCount;
    private Number remainingHours;
}
```

### 3.2 端点变更

**保持现有端点路径不变**（避免前端调用改动），但响应 DTO 字段：

```
GET /lead-mentor/student/list   返回 List<OsgLeadMentorStudentExtension>
GET /assistant/student/list     返回 List<OsgAssistantStudentExtension>
```

两端响应都**继承自 OsgStudentBasic**，前端可：
- 用 `OsgStudentBasic` 类型接收基础字段（用于共享组件）
- 用各端 Extension 类型接收完整字段（用于端独有逻辑）

### 3.3 前端 API 类型

```ts
// shared/api/students.ts
export interface OsgStudentBasic {
  studentId: number
  studentName: string
  englishName: string
  school: string
  major: string
  studentStatus: 'active' | 'paused' | 'completed'
  studentStatusLabel: string
}

export interface LeadMentorStudentRow extends OsgStudentBasic {
  relations: RelationInfo[]
  applyCount: number
  interviewCount: number
  offerCount: number
}

export interface AssistantStudentRow extends OsgStudentBasic {
  leadMentorName: string
  contractStatus: string
  isBlacklisted: boolean
  pendingReview: boolean
  // ...
}
```

---

## 4. 验收标准

### 4.1 后端契约

- [ ] `OsgStudentBasic` 基类定义清晰，含通用 status enum
- [ ] `OsgLeadMentorStudentExtension` 继承 Basic 并加 LM 字段
- [ ] `OsgAssistantStudentExtension` 继承 Basic 并加 Asst 字段
- [ ] 现有 `/lead-mentor/student/list` 端点字段**只增不减**（向后兼容）
- [ ] 现有 `/assistant/student/list` 端点字段**只增不减**（向后兼容）

### 4.2 现有功能不破坏

- [ ] LM 端 `views/teaching/students/index.vue` 行为不变
- [ ] Asst 端 `views/students/index.vue` 行为不变

### 4.3 student status enum 统一

- [ ] 三端 `studentStatus` 取值统一为：`active / paused / completed`（业务侧确认）
- [ ] DB migration（如需）：将 LM/asst 历史 status 字段值迁移到统一 enum

---

## 5. 工作量估算

| 任务 | 工作量 |
|---|---:|
| 设计 `OsgStudentBasic` + 业务侧 student status enum 收敛 | 0.5 天（含跨组对齐） |
| 实现 `OsgLeadMentorStudentExtension` + DTO 改造 | 0.5 天 |
| 实现 `OsgAssistantStudentExtension` + DTO 改造 | 0.5 天 |
| 修改 LM/asst Service 层返回新 DTO | 0.5 天 |
| 单元测试 + 集成测试 | 0.5 天 |
| 现有前端 LM/asst students view 适配新字段（向后兼容应不需改动） | 0.3 天 |
| **总计** | **2.8 天** |

---

## 6. 前端联动

后端解锁后，前端做：

1. `osg-frontend/packages/shared/src/api/students.ts` 加 `OsgStudentBasic` 类型
2. 启动 M5 抽取：`StudentStatusTag.vue`（基于 Basic.studentStatus）
3. asst + LM 接入（mentor 端不参与，stub 不动）
4. （未来扩展）`StudentTable.vue` 用 `OsgStudentBasic` 渲染共性列 + slot 让端注入端独有列

---

## 7. 关联文档

- `docs/architecture/2026-04-26-lm-asst-commonality-quantification.md` §3.2 / §5.2 / §6.2
- `docs/architecture/students-unification/00-epic-overview.md` (M5 quick assessment)
- `docs/architecture/2026-04-26-three-ends-overall-extraction-survey.md` §3.2 第 2 批

---

## 8. 状态

⏳ 待后端组排期 + 业务侧 student status enum 对齐 + 实施
