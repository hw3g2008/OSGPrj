# 以 Assistant 为 SSOT — 三端统一战略路线图 (v1.0)

- **日期**：2026-04-24
- **作者**：Cascade（与用户协作制定）
- **状态**：🚀 规划完成，等待 `/validate-doc` 通过后启动 M0
- **适用范围**：Assistant / Lead-Mentor / Mentor 三端的**核心业务页面**前后端统一
- **关联 Epic / 子文档**：
  - `docs/architecture/job-overview-unification/00-epic-overview.md`（子 Epic 1 / Job Overview）
  - `docs/architecture/job-overview-unification/03-shared-extraction-plan.md`（子 Epic 1 的前端组件抽取方案）
  - `docs/architecture/2026-04-24-shared-frontend-roadmap.md`（前置：三端 shared 基础设施）
  - `docs/plans/class-records-fix/`（子 Epic 4 的已有修复计划，需协调）

---

## 0. 战略背景

### 0.1 起源

原 Job-Overview Epic 规划按"4-Phase 线性执行"：
1. LM antd 化 ✅
2. Mentor antd 化（进行中发现是重复造轮子）❌
3. 抽 shared 组件
4. 三端接入

**用户洞察（2026-04-24）**：

> "以 Assistant 为参考标准，回推其他两个端，抽取公共组件——Assistant 的代码为主，三端导入同样的代码。"

> "一整个 Assistant 为 SSOT，不只是 job-overview 页面。"

> "能共用的共用，不能共用的一定要独立。"

> "Controller 层肯定是不能复用的，每个端要独立的，这个是原则。下面呢，可以根据数据结构对吧，再来看。如果能统一数据结构，一定统一数据结构。"

### 0.2 战略升级

| 维度 | 旧 Job-Overview Epic | 新 Assistant SSOT 战略 |
|---|---|---|
| **SSOT 基准** | 单页（job-overview）| **整个 Assistant 端**（所有核心业务页面）|
| **抽取对象** | 1 页的组件 | Assistant 所有页面的共性（前端组件 + 后端 Service / Mapper）|
| **三端对齐** | 单页三端对齐 | **多页面逐步推进**，每页三端对齐 |
| **后端边界** | 未明确 | **Controller 硬独立 + 数据结构统一优先** |
| **规模** | 1 Epic | 6+ 子 Epic，长期战略 |

### 0.3 路线图定位

本文档是**顶层战略路线图**，下挂多个子 Epic 文档：

```
2026-04-24-assistant-as-ssot-roadmap.md   ← 本文档（顶层）
├── job-overview-unification/               ← 子 Epic 1（进行中）
├── positions-unification/                  ← 子 Epic 2（待启动）
├── mock-practice-unification/              ← 子 Epic 3
├── class-records-unification/              ← 子 Epic 4（协调已有 class-records-fix 计划）
├── students-unification/                   ← 子 Epic 5
└── shared-infrastructure/                  ← M0 前置（基础设施）
```

---

## 1. 核心原则

### 1.1 原则 A：Controller 层硬独立（硬规则）

**无条件独立** — 每端有自己的 Controller 类：

```
AssistantXxxController   @RequestMapping("/assistant/xxx")
LeadMentorXxxController  @RequestMapping("/lead-mentor/xxx")
MentorXxxController      @RequestMapping("/api/mentor/xxx")
AdminXxxController       @RequestMapping("/admin/xxx")
```

**理由**：
- URL 前缀各异（硬差异）
- 权限注解各异（`@PreAuthorize`）
- 参数校验可能不同
- 审计 / 日志维度可能不同

**反例（违反此原则）**：
- ❌ 一个 Controller 同时挂 `/admin/*` + `/api/mentor/*`（现状 `OsgJobOverviewController`）
- ❌ Controller 类名带多端前缀（如 `OsgJobOverviewController` 混合 admin+mentor）

### 1.2 原则 B：数据结构能统一则一定统一（优先级原则）

Entity / DTO / Mapper 参数 / Service in/out — **数据结构能对齐就一定对齐**。

**理由**：
- 数据载体是"类型层 SSOT"，不统一会导致各端写各端的映射逻辑
- 统一数据结构 → Service / Mapper 自动可共用
- 维护成本：一处改、多端同步

### 1.3 原则 C：Controller 以下看"数据结构统一性"决定共用/独立

**不引入 DDD 的 Domain / Application 层分离**（之前讨论过度工程化）。决策流程：

```
一段逻辑该共用还是独立？
  ↓
它的 in/out 数据结构，三端（或多端）是否一致？
  ├── 一致 → 共用（放在同一个 Service 类的同一个方法里 OR 多方法放同一个 Service 类）
  └── 不一致 → 独立（各端有自己的 Service 类或方法）
```

### 1.4 原则 D：端特有业务永远在端内

不变原则：

- LM 的"分配导师 Modal" / "未分配 Tab" 永远在 LM 本地
- Mentor 的"4 统计卡" / "确认收徒按钮" 永远在 Mentor 本地
- Assistant 的"2 Tab 切换" 永远在 Assistant 本地

**反模式**：把端特有业务抽到 shared，用 `:show-for="mentor"` 这种 prop 做分支。

### 1.5 原则 E：YAGNI — 不过度隔离

**不做**：
- 每端 Service 独立类（除非出现端分支逻辑才拆）
- 每端独立 Mapper（Entity 共用即可）
- DDD 的 Domain Service 额外层

**做**：
- 共用 Service 的方法按业务维度命名（`listByMentor` / `listByLeadMentor`），**不按端命名**（`listForLeadMentorSide`）
- 有端分支逻辑出现时再拆

---

## 2. 分层共用判据总表

### 2.1 前端

| 层 | 规则 | 原因 | 样板 |
|---|---|---|---|
| **API Client 函数** | ❌ 独立 | URL 各异（硬差异）| `getAssistantXxx()` / `getLeadMentorXxx()` / `getMentorXxx()` |
| **前端 DTO 类型** | ✅ 共用 | 数据结构优先统一 | `LeadMentorCalendarRecord` |
| **UI 组件（无业务）** | ✅ 共用 | 数据结构 + 视觉可收敛 | `<InterviewCalendar>` / `<StageTag>` |
| **composable（纯逻辑）** | ✅ 共用 | 无路由 / HTTP 耦合 | `useInterviewCalendar` |
| **页面 view** | ❌ 独立 | 端特有业务组合 | 各端 `job-overview/index.vue` |
| **Layout / 路由** | ✅ 共用（M0 抽）| 结构可收敛 | `<MainLayout>` / `<PageHeader>` |

### 2.2 后端

| 层 | 规则 | 原因 | 判据 |
|---|---|---|---|
| **Controller 类** | ❌ **硬独立** | 硬规则（URL + 权限 + 类名）| 原则 A |
| **Controller 方法参数** | ✅ 尽量统一 | 数据结构优先统一 | DTO 参数 shape 一致 |
| **Service 类** | ✅ 共用 | 数据结构统一时 | in/out 一致 |
| **Service 方法名** | 按业务拆 | 不按端拆 | `listByMentor` 而非 `listForMentorSide` |
| **Mapper / Entity** | ✅ 共用 | 数据载体优先统一 | `OsgJobApplication` |
| **SQL 参数** | 纯参数化 | 权限 ID 由 Service 组装传入 | Mapper 不直接读 `SecurityUtils` |
| **权限注解** | ❌ 独立 | 各端权限码不同 | `@PreAuthorize` 在 Controller 层 |
| **审计日志** | ❌ 独立 | 各端维度不同 | Controller 层或 AOP |

### 2.3 跨层的"不做"清单

| 反模式 | 原因 |
|---|---|
| 抽 `JobOverviewPage` 整页组件 | 业务差异堆在 props/slots，反模式 |
| Service 内部 `if (端 == X)` 分支 | 应拆方法或拆类 |
| Mapper SQL 直接调 `SecurityUtils.getUserId()` | Mapper 应纯参数化，权限由上层组装 |
| 一个 Controller 挂多端 URL | 违反原则 A |
| 前端组件加 `:for-end="mentor"` prop | 端特有业务不抽进 shared |

---

## 3. 日历样板现状清理（M0 前置必做）

### 3.1 现状违反项

日历样板（`<InterviewCalendar>` + 后端 `/*/job-overview/calendar`）**前端已共用**（Round 1 完成），但**后端有 3 处违反原则**：

#### 违反 1：Controller 合并（🔴 严重）

`@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgJobOverviewController.java` 同时挂 `/admin/*` + `/api/mentor/*`：

```java
@GetMapping("/admin/job-overview/stats")      // admin 端
@GetMapping("/admin/job-overview/funnel")     // admin 端
@GetMapping("/admin/job-overview/list")       // admin 端
...
@GetMapping("/api/mentor/job-overview/list")        // mentor 端！
@PutMapping("/api/mentor/job-overview/{id}/confirm")
@GetMapping("/api/mentor/job-overview/calendar")
@GetMapping("/api/mentor/job-overview/export")
```

**违反原则 A**：一个 Controller 挂两端。

#### 违反 2：Service 命名误导（🟡 中）

`IOsgLeadMentorJobOverviewService` 实际被 Mentor Controller 跨端使用：

```java
@Autowired
private IOsgLeadMentorJobOverviewService leadMentorJobOverviewService;

// Mentor 端方法
@GetMapping("/api/mentor/job-overview/calendar")
public AjaxResult calendar() {
  leadMentorJobOverviewService.selectOverviewList("coaching", query, SecurityUtils.getUserId())...
}
```

**违反原则 E（YAGNI 命名清晰）**：名字带"LeadMentor"前缀给跨端使用造成认知负担。

#### 违反 3：Service 返回 `Map` 非强类型（🟡 中）

```java
List<Map<String, Object>> rows = leadMentorJobOverviewService.selectOverviewList(...)
  .stream().map(this::toLegacyMentorOverviewRow).toList();
```

**违反原则 B（数据结构统一）**：各 Controller 自己做 Map → 前端 DTO 的映射，shape 散落各处。

### 3.2 修正动作（M0）

**采纳用户推荐的"中等改动（1 + 2 + 4）"**（详见 §6.1）：

| # | 动作 | 类别 | 工作量 | 本期做 |
|---|---|---|---|---|
| 1 | `OsgJobOverviewController` 拆为 `OsgAdminJobOverviewController` + `OsgMentorJobOverviewController` | Controller 硬独立（原则 A）| 2h | ✅ |
| 2 | `IOsgLeadMentorJobOverviewService` / `OsgLeadMentorJobOverviewServiceImpl` → `IOsgJobOverviewService` / `OsgJobOverviewServiceImpl` | 命名清理 | 1h | ✅ |
| 3 | Service 返回值从 `List<Map>` 改为强类型 `List<JobOverviewRecordDTO>` | 数据结构强化 | 4-8h | ❌ 本期不做（延后至独立 Story）|
| 4 | Service 方法按业务拆：`listCoachingByMentor` / `listPendingByLeadMentor` 等 | 方法命名 | 1h | ✅ |
| 5 | 全拆 Service（每端独立 Service 类）| 硬拆 | 8-16h | ❌ **不推荐**（违反 YAGNI / 原则 E）|

### 3.3 M0 后的目标结构

```
后端（ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/）
├── OsgAdminJobOverviewController    @RequestMapping("/admin/job-overview")   ← 新增（拆自旧 OsgJobOverviewController）
├── OsgAssistantJobOverviewController @RequestMapping("/assistant/job-overview") ← 已存在
├── OsgLeadMentorJobOverviewController @RequestMapping("/lead-mentor/job-overview") ← 已存在
└── OsgMentorJobOverviewController    @RequestMapping("/api/mentor/job-overview")  ← 新增（拆自旧 OsgJobOverviewController）

后端 Service（ruoyi-system/src/main/java/com/ruoyi/system/service/）
├── IOsgJobOverviewService                 ← 改名（原 IOsgLeadMentorJobOverviewService）
└── impl/OsgJobOverviewServiceImpl.java    ← 改名（原 OsgLeadMentorJobOverviewServiceImpl）
    · listCoachingByMentor(mentorId, query)     ← 按业务拆
    · listPendingByLeadMentor(leadMentorId, query)
    · listManagedByLeadMentor(leadMentorId, query)
    · listByAssistant(assistantId, query)
    · confirmCoaching(jobAppId, mentorId, operator)
    · assignMentor(jobAppId, mentorId, assignedBy)  ← LM 端独有，但方法签名数据结构统一，放一起 OK
```

---

## 4. 路线图（M0 - M5 + M6 待定）

### 4.1 M0 前置清理 + 基础设施抽取（第一步）

**工作量**：1-2 周（含前端基础设施抽取）

| # | 任务 | 类别 |
|---|---|---|
| M0.1 | 日历样板 Controller 拆分（§3.2 动作 1）| 后端 |
| M0.2 | Service 重命名（§3.2 动作 2）| 后端 |
| M0.3 | Service 方法按业务拆（§3.2 动作 4）| 后端 |
| M0.4 | `MainLayout` 三端共性分析 → 抽取到 shared | 前端 |
| M0.5 | `PageHeader` 抽取到 shared（Assistant 已有基础版）| 前端 |
| M0.6 | `OverlaySurfaceModal` 抽取到 shared（如果三端都用）| 前端 |

**M0 完成标志**：日历样板后端结构对齐原则 A + 前端有 MainLayout/PageHeader shared 组件。

### 4.2 M1 Job Overview 子 Epic（进行中）

**工作量**：1-2 周
**状态**：🚀 进行中（StageTag ✅ 已完成，commit `e5bd8f56`）
**详细方案**：`docs/architecture/job-overview-unification/03-shared-extraction-plan.md`

| # | 任务 | 状态 | Commit |
|---|---|---|---|
| M1.1 | 前端 P0 原子组件 5 个（StageTag / CoachingStatusTag / StudentAvatarCell / CompanyPositionCell / InterviewTimeCell）| 1/5 ✅ | `e5bd8f56` |
| M1.2 | 前端 P1 复合结构 3 个（JobOverviewFilterBar / JobOverviewTable / useJobOverviewFilters）| ⏳ | — |
| M1.3 | 三端页面接入 shared 组件 | 🚀 进行中（Assistant ✅ / LM ✅ / Mentor ⚠️）| — |
| M1.4 | Mentor 中间态收尾（详见子文档 §6）| ⏳ 待 P1 完成后统一做 | — |
| M1.5 | 后端 Mentor Controller 拆出（M0 完成后自动继承结构）| ⏳ | — |

### 4.3 M2 Positions 子 Epic

**工作量**：2-3 周
**子文档**：`docs/architecture/positions-unification/`（待创建）

预期产出（沿用 M1 模式）：
- 前端：原子组件（如 `<PositionCompanyCell>` / `<RecruitmentCycleTag>` / `<AppliedCountBadge>` 等）+ 复合结构（`<PositionFilterBar>` / `<PositionTable>`）
- 后端：Controller 已独立（三端已有），Service 统一重命名

### 4.4 M3 Mock Practice 子 Epic

**工作量**：2 周
**子文档**：`docs/architecture/mock-practice-unification/`（待创建）

### 4.5 M4 Class Records 子 Epic

**工作量**：3-4 周
**注意**：已有 `docs/plans/class-records-fix/` 修复计划，本 Epic 需协调
**子文档**：`docs/architecture/class-records-unification/`（待创建）

### 4.6 M5 Students 子 Epic

**工作量**：2-3 周
**子文档**：`docs/architecture/students-unification/`（待创建）

### 4.7 M6 边缘页面（待定，逐个决策）

**原则**："能统一的顺手做" — 走到对应节点时，评估三端共性，决策"做 / 不做 / 推迟"。

| 页面 | 三端情况（待调研）| 决策时机 | 候选决策 |
|---|---|---|---|
| `schedule` | 三端都有日程页 | M5 完成后 | 🟡 待定 |
| `profile` | 三端都有个人信息 | M5 完成后 | 🟡 待定（端差异大，可能不做）|
| `materials` | 未确认三端都有 | M5 完成后 | 🟡 待定 |
| `feedback` | 未确认三端都有 | M5 完成后 | 🟡 待定 |

### 4.8 本期**明确不做**

| 类别 | 页面 | 理由 |
|---|---|---|
| 登录 | `login` / `forgot-password` | 用户明确："按现有的就挺好" |
| 入口 | `dashboard` / `home` | 用户明确："本期不落地" |
| 占位 | `placeholder` | 非业务页 |

---

## 5. 每个子 Epic 的标准结构

每个子 Epic 都应产出以下文档（参考 Job Overview 子 Epic）：

```
docs/architecture/<module>-unification/
├── 00-epic-overview.md              ← 子 Epic 总览
├── 01-<module>-current-state.md     ← 现状分析（三端代码量 / 共性 / 差异）
├── 02-<module>-antd-migration.md    ← 如果需要先 antd 化的 antd 迁移
├── 03-shared-extraction-plan.md     ← shared 组件抽取方案（P0/P1/P2 清单）
└── 99-completion-report.md          ← 完工报告（实际成果 / commit 链 / 经验沉淀）
```

**命名规律**：`NN-` 数字前缀表示工作流顺序。子 Epic 文档**不必一次性写完**，按需迭代。

---

## 6. 进度追踪机制

### 6.1 顶层追踪（本文档）

**§4 路线图的状态列必须与实际进度同步**：

- 每个 M 里程碑开始时：状态标"🚀 进行中"
- 完成后：状态标"✅ 已完成"+ commit 链
- 延期 / 暂停：状态标"⏸️ 暂停"+ 原因

### 6.2 子 Epic 追踪

每个子 Epic 的 `03-shared-extraction-plan.md` 的 §4 进度总览表维护组件级别进度：

```
| # | 组件 | 优先级 | 状态 | Commit | Assistant | LM | Mentor |
```

### 6.3 Memory 追踪

**关键 memory key**：
- `Job-Overview 3 端统一 Epic 节点`（当前子 Epic 1）
- 后续每启动一个子 Epic，新建对应 memory

### 6.4 进度回填触发点

| 完成什么 | 回填哪里 |
|---|---|
| 一个组件抽取 + 三端接入 | 子 Epic 文档 §2 对应小节 + §4 总览表 + memory |
| 一个 M 里程碑 | 本文档 §4 路线图 + memory |
| 发现新的现状违反项 | 本文档 §3 / 原则章节补充 |

---

## 7. 风险与应对

### 7.1 工程风险

| 风险 | 影响 | 缓冲 |
|---|---|---|
| Controller 拆分引入回归 | 高 | 每次拆分都有独立 commit + 跑 MVT 验证 |
| Service 重命名影响面大 | 中 | IDE 全局重命名 + 跑全量测试 |
| 前端组件抽取 API 不稳定 | 中 | 先 3 端接入验证，稳定后 commit |
| 子 Epic 之间依赖混乱 | 中 | 明确 M0 → M1 → M2 串行依赖 |

### 7.2 范围风险

| 风险 | 影响 | 缓冲 |
|---|---|---|
| 边缘 4 页（M6 待定）决策反复 | 中 | 逐个走到时决策，不预先承诺 |
| 基础设施（M0）发现比预期复杂 | 中 | 如果 MainLayout 三端差异过大，降级为"只抽 PageHeader"，MainLayout 留各端 |
| Mentor 中间态（job-overview）拖延 M1 | 中 | 按方案 A 保留，不阻塞 P1 启动 |

### 7.3 回滚策略

- **组件级**：每个抽取 = 1 commit，`git revert <hash>` 回退
- **Controller 拆分级**：一个 M0 子任务 = 1 commit，独立回退
- **子 Epic 级**：每个子 Epic 的改动独立于其他子 Epic，可单独暂停

---

## 8. 关联资源与术语

### 8.1 关联文档

- 本文档（顶层路线图）
- `docs/architecture/job-overview-unification/00-epic-overview.md`（子 Epic 1 overview）
- `docs/architecture/job-overview-unification/03-shared-extraction-plan.md`（子 Epic 1 抽取方案）
- `docs/architecture/2026-04-24-shared-frontend-roadmap.md`（前置 shared 基础设施）

### 8.2 术语

| 术语 | 含义 |
|---|---|
| **SSOT** | Single Source of Truth — 单一事实来源。本项目中 Assistant 的实现是 SSOT |
| **三端** | Assistant / Lead-Mentor / Mentor |
| **四端** | 含 Admin 的四端 |
| **五端** | 含 Student 的五端 |
| **核心 5 页** | job-overview / positions / mock-practice / class-records / students |
| **子 Epic** | 本路线图下的 M1-M6 各自对应的独立交付单位 |
| **端特有业务** | 只有某一端需要的业务逻辑（如 LM 的"分配导师"）|

---

## 9. 下一步（执行入口）

### 9.1 启动条件

- [x] 本文档 `/validate-doc` 通过（4 轮思辨 + 一致性校验无阻塞级问题）
- [ ] 用户确认 M0 工作量（约 1-2 周）可接受
- [ ] M0 的拆分 commit 范围划定（每个 Controller 拆分 1 commit）

### 9.2 M0 第一个执行单元

建议顺序：

1. **M0.1 + M0.2 + M0.3 日历样板后端清理**（4h）
   - 独立分支或直接 main
   - 每个动作 1 commit
   - 合并前跑全量后端测试
2. **M0.4 MainLayout 三端共性分析**（0.5 天）
3. **M0.5 PageHeader 抽取**（0.5-1 天）
4. **M0.6 OverlaySurfaceModal 抽取或搁置**（视三端共性决定）

**M0 完成后 → M1 Job Overview 继续（当前在 StageTag 之后）**

---

*文档结束。下一步：对本路线图跑 `/validate-doc` Round 1-4 + 一致性校验。*
