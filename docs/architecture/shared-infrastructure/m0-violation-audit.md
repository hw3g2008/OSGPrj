# M0.0 全量存量违反项审计

- **日期**：2026-04-24
- **作者**：Cascade（自动审计）
- **关联**：`docs/architecture/2026-04-24-assistant-as-ssot-roadmap.md` §4.1.1 M0.0

## 0. 审计命令

```bash
# 命令 1：找所有 Controller 的类级 + 方法级 URL 前缀
for f in $(find ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg -name "*Controller.java"); do
  name=$(basename "$f" .java)
  class_mapping=$(grep -E '^@RequestMapping' "$f" | head -1)
  method_mappings=$(grep -oE '@(Get|Post|Put|Delete)Mapping\("[^"]+' "$f" | sed 's/.*("//' | sort -u)
  echo "=== $name ==="
  echo "  class: ${class_mapping:-NONE}"
  echo "  methods:"
  echo "$method_mappings" | sed 's/^/    /'
done

# 命令 2：找 Service 跨端引用
for svc in IOsgLeadMentor IOsgMentor IOsgAssistant OsgLeadMentor OsgMentor OsgAssistant; do
  grep -rl "\b${svc}[A-Z][a-zA-Z]*Service\b" ruoyi-admin/src/main/java/com/ruoyi/web/controller/
done
```

## 1. 审计范围

- **目录**：`ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/`
- **Controller 总数**：36 个
- **原则对标**：路线图 §1.1 原则 A（Controller 硬独立）+ §1.5 原则 E（YAGNI 但不跨端借用）

## 2. 🔴 违反项总表

### 2.1 Controller 合并（原则 A 违反）

| # | Controller | 类级 `@RequestMapping` | 方法级挂的端 URL | 严重度 |
|---|---|---|---|---|
| **V1** | `OsgJobOverviewController` | ❌ 无 | `/admin/job-overview/*`（8 个）+ `/api/mentor/job-overview/*`（4 个）| 🔴 严重（已在路线图 §3 列为 M0.1 目标）|
| **V2** | `OsgMockPracticeController` | ❌ 无 | `/admin/mock-practice/*`（3 个）+ `/api/mentor/mock-practice/*`（2 个）| 🔴 严重（新发现）|
| **V3** | `OsgClassRecordController` | ❌ 无 | `/admin/class-record/*`（3 个）+ `/api/mentor/class-records/*`（3 个）+ `/assistant/class-records`（1 个）| 🔴 **最严重 — 挂 3 端**（新发现）|

### 2.2 Service 跨端引用（原则 E YAGNI 但避免跨端借用）

| # | Service | 自身端 | 被跨端借用的 Controller | 严重度 |
|---|---|---|---|---|
| **V4** | `IOsgLeadMentorJobOverviewService` | Lead-Mentor | `OsgJobOverviewController` 的 mentor 部分方法借用 | 🔴 严重（与 V1 一体，M0.1-M0.3 一起清理）|
| **V5** | `IOsgMentorScheduleService` | Mentor | `OsgAssistantScheduleController` 借用 | 🟡 新发现（schedule 模块，M6 边缘页之一）|

### 2.3 权限校验类 Service 跨端注入（合规，非违反）

以下 Service 跨端注入是**合理场景**（权限校验工具性质），不算违反：

| Service | 被多端 Controller 引用 | 合理性 |
|---|---|---|
| `OsgAssistantAccessService` | `OsgClassRecordController` / `OsgPositionController` / `OsgStudentController` / `OsgAssistant*Controller`（9 处）| ✅ Admin 端检查"资源是否属于某 Assistant" |
| `OsgLeadMentorAccessService` | `OsgLeadMentor*Controller`（仅自己端，8 处）| ✅ 单端内注入 |
| `OsgMentorAccessService` | `OsgMentorAuthController`（仅自己端）| ✅ 单端内注入 |

## 3. 违反项清理计划

### 3.1 P0 本期必清（M0 范围）

| # | 违反项 | 关联任务 | 预估工作量 |
|---|---|---|---|
| V1 + V4 | Job Overview Controller 合并 + Service 跨端借用 | **M0.1-M0.3**（路线图已列）| 4h |

### 3.2 P1 子 Epic 期间清理

| # | 违反项 | 关联子 Epic | 触发点 |
|---|---|---|---|
| V2 | Mock Practice Controller 合并 | **M3 Mock Practice 子 Epic** | 子 Epic 启动时作为前置清理 |
| V3 | ClassRecord Controller 合并（3 端！）| **M4 Class Records 子 Epic** | 子 Epic 启动时作为前置清理（注意：已有 `docs/plans/class-records-fix/` 计划，需协调）|

### 3.3 P2 延后（边缘模块）

| # | 违反项 | 关联 | 触发点 |
|---|---|---|---|
| V5 | Assistant Schedule 借用 Mentor Service | Schedule 模块（M6 边缘 4 页之一）| 如 Schedule 子 Epic 启动则一起做；否则保持观察 |

### 3.4 替代方案评估

| 违反项 | 方案 A：M0 一次性全清 | 方案 B：按子 Epic 逐个清 |
|---|---|---|
| V1 + V4 | ✅ 必做 | ✅ 必做 |
| V2 | 工作量 +4h，M0 变 8h | 延后到 M3 时机更自然 |
| V3 | 工作量 +6h（3 端拆分更复杂），M0 变 10h+ | 延后到 M4 时更合适（协调 class-records-fix） |
| V5 | 工作量 +2h | 延后到 Schedule 子 Epic（如做）|

## 4. 建议

**采用方案 B（按子 Epic 逐个清）**：
- M0 范围保持为"仅清理日历样板 V1+V4"
- V2 / V3 / V5 登记在本 audit 文档，在对应子 Epic 启动前作为前置清理
- 避免 M0 膨胀（原路线图预估 M0 为 1-2 周，若 M0 扩到清所有违反项会变 3-4 周）
- 每个子 Epic 启动时先读本 audit 文档 + 清理对应违反项

**例外情况**：如用户明确要求一次性全清，走方案 A（M0 扩展为"全量存量违反项清理"）。

## 5. 审计时间戳

- **最后扫描**：2026-04-24 21:07 (UTC+08:00)
- **扫描命令版本**：§0 所列

## 6. 后续更新

当发现新违反项 → 补充到 §2 违反项总表 + 调整 §3 清理计划 + 更新 memory。

## 7. M0.6 OverlaySurfaceModal 决策（2026-04-26）

**判据**：路线图 §4.1 表格条件 "如果三端都用"。

| 端 | 是否使用 OverlaySurfaceModal | 备注 |
|---|---|---|
| Assistant | ✅ 1 个组件（AssistantClassReportFlowModal）| 391 行本地 fork |
| Lead-Mentor | ❌ 不用 | — |
| Mentor | ❌ 不用 | — |
| Admin (Vue3) | ✅ 5 个组件 | 385 行本地 fork（与 Assistant 实现差异主要在主题色 CSS 变量）|

**结论**：三端覆盖率 33%（仅 Assistant），不满足 "三端都用" 条件 → **M0.6 跳过**（不抽 shared）。

**理由**：
1. 三端中仅 1 端使用，反模式判据触发（抽出后 LM/Mentor 不会接入）
2. Admin/Assistant 的实现差异主要在主题色变量层（设计上已为各端独立 fork）
3. Assistant 单一使用场景（1 个组件），抽 shared 收益 vs 维护成本不划算

**未来重启条件**：如 LM 或 Mentor 在后续子 Epic 中新增 Modal 需求且与 OverlaySurfaceModal 模式一致，可触发 M0.6 补做（按 §1.6.1 D5 升级触发器逻辑处理）。
