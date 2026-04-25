# 课程记录修复 — Absent 契约彻底落实 + Assistant 测试基建清理

> 实施日期: 2026-04-23
> 范围: 助教端课程记录 absent（旷课未到场）契约 + 关联后端/DB/测试
> 前置文档: [index.md](./index.md) · [assistant.md](./assistant.md) · [shared.md](./shared.md)
> 状态: ✅ 已完成（Phase 0–7 全绿）

---

## 1. 背景与触发

在 Assistant 端 `AssistantClassReportFlowModal.vue` 上线后，QA 回放发现一个数据质量问题：

- 当助教把学员标为"**旷课未到场（absent）**"时，弹窗仍然会把 `courseType / durationHours / feedbackContent / topics` 一起提交；
- 后端旧契约要求这些字段必填，于是前端用"占位值"填入（如 `courseType=mock_practice`、`durationHours=0`、`feedbackContent='（旷课）'`），绕过校验；
- 结果：DB `osg_class_record` 里出现大量**伪字段**——absent 行挂着一个假的课程类型、0 课时、一段占位反馈，既误导列表展示，也污染统计口径。

用户的核心诉求是：

> "不能逃避，要从根本解决问题。有就是有，没有就没有，没有就不能存。"

因此这次修复不是打补丁，而是**重新定义 absent 的字段契约**：absent 行除了 `recordId / classDate / studentUserId / assistantUserId / classStatus='absent' / comments`（备注）之外，**所有业务字段都必须为 NULL**，并在整条链路（DB → Service → API → 前端弹窗 → 前端展示 → 测试 → E2E）上强制一致。

---

## 2. 契约总定义

### 2.1 Absent 行字段规则

| 字段 | absent 值 | 非 absent 值 |
|---|---|---|
| `class_status` | `'absent'` | 业务状态（technical/behavioral/mock_interview/...） |
| `course_type` | **NULL** | job_coaching / mock_practice / basic_course |
| `duration_hours` | **NULL** | DECIMAL(5,1) > 0 |
| `feedback_content` | **NULL** | 富文本反馈 |
| `topics` | **NULL** | 辅导主题 JSON |
| `comments` | `"学员状态: 旷课未到场\n旷课备注: ..."` | 可选备注 |
| `class_date` | 必填 | 必填 |
| `student_user_id` | 必填 | 必填 |

### 2.2 API Payload 契约

#### Absent 场景（`POST /assistant/class-records`）

```json
{
  "classDate": "2026-04-14",
  "classStatus": "absent",
  "comments": "学员状态: 旷课未到场\n旷课备注: 学员未到场，已通知班主任跟进",
  "studentUserId": 123
}
```

**不得出现** `courseType` / `durationHours` / `feedbackContent` / `topics` 字段。

#### 非 absent 场景

按原有字段契约（`courseType` / `classStatus` / `durationHours` / `feedbackContent` / `topics` / `comments` 都可传）。

### 2.3 UI 行为

| 视图 | absent 时的行为 |
|---|---|
| Assistant 上报弹窗 | 学员状态切到"旷课未到场"时，**隐藏**学习时长输入，**隐藏**辅导内容/反馈相关区块；提交只带契约里的 4 个字段 |
| Assistant 列表 `index.vue` | 辅导内容列空值展示 `-`；详情 Modal 辅导内容项空时 `-` |
| Assistant 详情 Modal | 新增"旷课备注"独立行（从 `comments` 中解析，`extractAbsenceRemark`） |
| 后端 label 映射 `toCoachingTypeLabel` | 遇 `null` 返回 `null`，不再输出误导性中文标签 |

---

## 3. 改动清单

所有改动按 Phase 0–7 分层落盘：

### Phase 0 — DB schema + 历史数据清理

- **新增** `@/Users/hw/workspace/OSGPrj/sql/migrations/2026-04-23-class-record-absent-allow-null.sql`
  - `course_type NOT NULL → NULL`
  - `duration_hours NOT NULL → NULL`
  - 历史 absent 行 `course_type / duration_hours / feedback_content / topics` 置 NULL（仅保留 comments）

### Phase 1 — 后端校验 + 默认值 + Null 安全

- **修改** `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgClassRecordServiceImpl.java`
  - `validateLeadMentorCreate()`：absent 分支跳过 `courseType / durationHours / feedbackContent` 必填校验
  - `normalizeCreateDefaults()`：absent 分支强制将 `courseType / durationHours / feedbackContent / topics` 归零为 NULL
  - `toCoachingTypeLabel()`：null 安全，入参 null 直接返回 null
  - `toClassRecordPayload()`：返回时增加原始 `classStatus` + `comments` 字段，供前端细粒度展示

### Phase 2 — 前端弹窗 payload 契约 + 时长字段隐藏

- **修改** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/views/class-records/AssistantClassReportFlowModal.vue`
  - `handleSubmit()`：absent 时 payload 只带 `classDate / classStatus / comments / studentUserId`
  - 表单布局：学员状态为 absent 时隐藏学习时长 / 辅导内容相关区块
- **修改** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/api/assistantClassRecords.ts`
  - `CreateAssistantClassRecordPayload` 将 `courseType / durationHours / feedbackContent / topics` 改为 optional
- **修改** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/api/admin/classRecord.ts`
  - `coachingType` 允许 `null`；新增 `classStatus` / `comments` 字段

### Phase 3 — Assistant 列表 + 详情 UI 兼容

- **修改** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/views/class-records/index.vue`
  - 列表"辅导内容"列空值 → `-`
  - 详情 Modal 辅导内容项空值 → `-`
  - 新增"旷课备注"独立行（仅 absent 渲染）
  - 新增 `extractAbsenceRemark(comments)` 解析 comments 中的旷课备注

### Phase 4 — 单元测试

- **修改** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/__tests__/class-records.spec.ts`
  - 新增 absent 场景下列表/详情 UI 断言；删除已废弃的旧断言
- **修改** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/__tests__/assistant-class-report-flow-modal.spec.ts`
  - 新增 absent 隐藏学习时长 + payload 精简断言
- `assistant-class-report-payload.spec.ts` 中的 absent 契约 case 之前已覆盖，本次保持

### Phase 5 — E2E 脚本

- **修改** `@/Users/hw/workspace/OSGPrj/bin/assistant-class-record-e2e.sh`
  - 旷课未到场 case 按新契约构造 payload（仅 4 个字段）
  - 列表打印阶段 null 安全（允许 `courseType / durationHours / feedbackContent` 为 null），新增 `dur` 列直观观察契约

### Phase 6 — SQL migration 落盘

执行 `sql/migrations/2026-04-23-class-record-absent-allow-null.sql` 到远端 `47.94.213.128:23306/ry-vue`，完成 schema 放松 + 历史数据清洗。

### Phase 7 — 构建 / 重启 / 全量回归（见 §5）

### Phase 附加（2026-04-23）— Assistant 测试基建清理

本次 Phase 7 回归时顺带发现并清理了 3 处与 absent 契约无关的测试基建债，避免长期污染 CI 红线：

- **新增** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/__tests__/setup.ts`
  内存 Storage polyfill，覆盖 Node 25+ 内置的 experimental `localStorage` 空壳实现
- **修改** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/vitest.config.ts`
  注册 `setupFiles`；增加 `exclude: ['tests/e2e/**']` 防止 vitest 误扫 Playwright E2E
- **修改** `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/assistant/src/__tests__/main-layout.spec.ts`
  - `.nav-section` 期望 6 → 4（本期 V1 仅 Career / Students / Teaching / Profile 四组，Finance/Resources 整组过滤消失）
  - 显式断言 `Finance` / `Resources` 不应出现
  - 路由切换目标从已下线的 `Expense` 换为本期内的 `Class Records`

---

## 4. 关键决策

### 4.1 Absent = NULL 还是占位符？选 A（NULL）

Absent 设计有两种走法：

- **方案 A（NULL）**：字段为 NULL，表示"事实上不存在"；DB/API/UI 都靠 null-safe 路径处理
- **方案 B（占位符）**：字段存固定占位值（`course_type='absent_sentinel'`、`duration_hours=0`），字段非空但无意义

用户明确选 A。理由：

1. 数据真实性——absent 时这些字段在现实中就是不存在，不该有任何值；
2. 统计口径——`SUM(duration_hours)`、`COUNT(course_type)` 等聚合不会被占位值扭曲；
3. 未来扩展——新增聚合分析时不需要每次记得排除哨兵值。

代价：整链路必须 null-safe。本次已在后端 label 映射、前端列表/详情、E2E 脚本打印 4 处系统性补上 null 安全路径。

### 4.2 历史数据是否保留？清洗

发现历史只有 1 条 absent 行 (`#R274221`) 存在伪字段。未上线环境，一次性清洗，迁移 SQL 带 `UPDATE` 语句。

### 4.3 前端校验位置

校验放在前端提交前的 `handleSubmit()`，而非全局 payload 层。理由：`handleSubmit` 是唯一出口，集中处理清楚；payload 类型把可选性表达出来即可，不需要在类型层搞条件判别式。

---

## 5. 验证证据

### 5.1 DB 终态（4 条 absent 行全部合契约）

```
record_id   class_status  course_type  duration_hours  feedback_content  topics   comments
274221      absent        <NULL>       <NULL>          <NULL>            <NULL>   学员状态: 旷课未到场\n旷课备注: ...
274238      absent        <NULL>       <NULL>          <NULL>            <NULL>   学员状态: 旷课未到场\n旷课备注: ...
274255      absent        <NULL>       <NULL>          <NULL>            <NULL>   学员状态: 旷课未到场\n旷课备注: ...
274272      absent        <NULL>       <NULL>          <NULL>            <NULL>   学员状态: 旷课未到场\n旷课备注: ...
```

### 5.2 API E2E (`bin/assistant-class-record-e2e.sh`)

**17 / 17 PASS，0 FAIL**，覆盖：

- 岗位辅导 × 8 种课程内容
- 模拟面试 / 人际关系 / 模拟期中 各 1
- 基础课程 × 5 种课程内容
- 旷课未到场 × 1（新契约）

列表回放：

```
ID=274272  type=(null)  status=absent  date=2026-04-14  dur=-  fb=
```

### 5.3 Assistant 前端单元测试

`npx vitest run`（`osg-frontend/packages/assistant/`）：

```
Test Files  15 passed (15)
Tests       91 passed (91)
```

本次新增/改动的 spec 全绿：
- `assistant-class-report-payload.spec.ts`（24）
- `assistant-class-report-flow-modal.spec.ts`（17，含 absent 隐藏 + payload 精简）
- `class-records.spec.ts`（1，含 absent 列表/详情兼容 + 旷课备注行）
- `main-layout.spec.ts` / `home.spec.ts`（测试基建清理后恢复绿）

### 5.4 本地环境

- 后端：`bin/run-backend-dev.sh deploy/.env.dev`，监听 `28080`，连接阿里云 MySQL `47.94.213.128:23306` / Redis `47.94.213.128:26379`
- SQL migration 已落阿里云

---

## 6. 风险与回滚

### 回滚路径

- **DB**：执行反向 SQL（`ALTER TABLE ... MODIFY COLUMN ... NOT NULL`）；但历史 absent 行已清洗为 NULL，反向前需先回填占位值，否则违反 NOT NULL。建议**不回滚**，继续迭代。
- **后端**：回退 `OsgClassRecordServiceImpl.java` 的相关方法到上一版 commit 即可。
- **前端**：回退三个 Vue/TS 文件即可。
- **测试**：本次新增的 spec 与业务强绑定，若 UI 重大变更需同步更新。

### 已知限制

- 本次只改了 Assistant 端上报链路；Lead-Mentor / Mentor 的上报弹窗如果未来也允许 absent，需要同步对齐（目前产品范围里这俩端无此场景）。
- 其他端（Admin / Student）的课程记录查看链路已经通过 shared API 承接 NULL，视觉兼容已就绪（详见 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/api/admin/classRecord.ts` 的类型变更）。

---

## 7. 相关 Memory / 规则

- "有就是有，没有就没有，没有就不能存" — 本次契约设计的 SSOT
- V1 功能边界（Memory 2c14519e）— Assistant 端 IA 仅 4 组，指导 `main-layout.spec.ts` 清理
- 本地开发数据库（Memory 229559a1）— 后端连阿里云 MySQL/Redis，`.env.dev` 参数权威
