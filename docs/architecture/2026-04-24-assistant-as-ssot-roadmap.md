# 以 Assistant 为 SSOT — 三端统一战略路线图 (v1.1)

- **日期**：2026-04-24
- **作者**：Cascade（与用户协作制定）
- **版本**：v1.1（2026-04-24 `/validate-doc` Round 1-4 + Step 3 全面修订）
- **状态**：🚀 规划完成，等待 `/validate-doc` 通过后启动 M0
- **适用范围**：Assistant / Lead-Mentor / Mentor **三端**的**核心业务页面**前后端统一
- **关联文档**：见 §8.1

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

### 0.4 Admin 端的 scope 声明

> **Admin 端不是本路线图的 SSOT 对齐目标**。

- **SSOT 对齐目标**：Assistant（基准）/ Lead-Mentor / Mentor 三端
- **Admin 端的处理**：
  - ✅ 如果 Admin 的 Controller 违反原则 A（如日历样板的 `OsgJobOverviewController` 混合 admin+mentor），**顺带拆分**（M0 清理）
  - ❌ **不**对齐前端 shared 组件（Admin 端有独立 Vue2 代码库 `ruoyi-ui/`，技术栈不兼容）
  - ❌ **不**抽 Admin 端到任何子 Epic
- **理由**：Admin 使用 `ruoyi-ui/`（Vue2 + Element UI），三端 Assistant/LM/Mentor 使用 `osg-frontend/packages/*`（Vue3 + Ant Design Vue），技术栈不兼容无法共用前端组件

### 0.5 前置假设（本路线图的成立前提）

以下假设必须成立，本路线图才有效。**如果假设被打破，本路线图暂停并重新评估**：

| # | 假设 | 打破触发器 |
|---|---|---|
| PA-1 | Assistant 技术栈（Vue3 + antd-vue + TypeScript）稳定 | 出现技术栈大升级（Vue3→Vue4 / antd→其他）|
| PA-2 | 三端 osg-frontend 的 shared 包结构足以承载新抽取组件 | shared 包需要大规模重构 |
| PA-3 | 各端 `package.json` / `pom.xml` 依赖版本兼容 | 发现跨端依赖冲突 |
| PA-4 | Assistant 代码在子 Epic 实施期间相对稳定 | Assistant 某页在子 Epic 期间变更 >20% 行（见 §4.0 SSOT drift 处理）|
| PA-5 | 核心 5 页三端都有对应实现 | 某页某端未实现或即将废弃 |

---

## 1. 核心原则

> **一句话总结**：**端独立的外壳（A/D）+ 数据结构驱动的内部共用（B/C）+ YAGNI 不过度隔离（E）**

5 条原则（ABCDE）详情见子节。

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

### 1.6 决策的可逆性声明

> **本节来自 `/validate-doc` Round 4 Tensions cascade：把散落在各处的“升级触发器”收敛为一张总表。**

本路线图的关键决策按可逆性分三类，每类有明确的升级/重评触发器。

#### 1.6.1 可逆决策（有升级触发器）

| # | 决策 | 当前选择 | 升级触发器 | 触发后动作 |
|---|---|---|---|---|
| D3 | Service 共用 vs 独立 | 共用（数据结构统一）| Service 方法内出现 `if (端 == X)` 分支 ≥ 3 次，或某端业务规则与其他端完全不同 | 拆为每端独立 Service 类 |
| D4 | 日历修正中等 vs 最大 | 中等（1+2+4）不做强类型 DTO | 3+ 子 Epic 遇到 `List<Map>` 映射痛点，或前端接入 shared 后 DTO shape 频繁变化 | 补做§3.2 动作 3（强类型 DTO迁移）|
| D5 | 基础设施 M0 vs M6 | M0 抽取 | 三端 MainLayout 结构差异 >50%（§4.1 M0.4 分析结果）| 降级为“只抽 PageHeader，MainLayout 各端保留”（§4.1）|
| D11 | 不引入 DDD 分层 vs 引入 Domain Service | 不引入 | 某子 Epic Service 出现 ≥ 5 处端分支逻辑，或业务规则需跨模块复用 ≥ 3 个子 Epic | 引入 Domain Service 层，拆分 Domain/Application 职责 |
| D9 | Mentor 中间态方案 A（保留）| 保留，等 M1 P1 完成 | P1 shared 组件不能覆盖 Mentor antd 化改动的 ≥ 40% | 回退到方案 B，或切换为方案 C （§7.2）|

#### 1.6.2 强制长期决策（不可逆）

| # | 决策 | 理由 |
|---|---|---|
| D1 | 以 Assistant 为 SSOT 基准 | 路线图的基础，换基准 = 重新站 |
| D2 | Controller 硬独立 | 硬规则，非决策 |
| D6 | 核心 5 页为本期 scope | 本期承诺，如改需 scope 声明 |
| D8 | 明确不做 login/dashboard 等 | 用户明确决策 |

#### 1.6.3 Deferred 决策（延后）

| # | 决策 | 决策时机 |
|---|---|---|
| D7 | 边缘 4 页做不做 | M5 完成后逐个评估 |

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

### 2.4 粒度约束

> **本节来自 `/validate-doc` Round 2 Scale Game 测试 D：防止抽取粒度过细导致 shared 包爆炸。**

**每页 shared 组件数量上限**：每个子 Epic 的 P0 + P1 shared 组件（原子 + 复合）**总数不超过 ~15 个**。

**超过上限的处置**：
- 重新审视粒度是否过细（如 Avatar + AvatarCell + AvatarGroup 可合并为 AvatarCell）
- 考虑拆分为多个子 Epic（按业务维度）
- 考虑是否某些组件应留在各端本地

**推荐结构模板**（来自 job-overview 样板）：
- **P0 原子 UI 组件** 3-7 个（Tag / Cell / Badge 等无业务纯视觉）
- **P1 复合结构 + composable** 2-4 个（FilterBar / Table / useFilters 等）
- **P2 可选（业务差异大，暂不抽）** 不设上限但列清楚

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

### 3.2 修正动作（M0）— 决策摘要

**采纳用户推荐的"中等改动"**（5 个候选动作中做 1+2+4，不做 3 和 5）：

| # | 动作 | 类别 | 本期做 |
|---|---|---|---|
| 1 | Controller 拆分 | Controller 硬独立（原则 A）| ✅ 做 |
| 2 | Service 命名去端前缀 | 命名清理 | ✅ 做 |
| 3 | Service 返回值强类型 DTO | 数据结构强化 | ❌ 延后至独立 Story（见 §1.6 D4 升级触发器）|
| 4 | Service 方法按业务拆 | 方法命名 | ✅ 做 |
| 5 | 全拆 Service 为每端独立类 | 硬拆 | ❌ 不推荐（违反 YAGNI / 原则 E，见 §1.6 D11 升级触发器）|

**→ 具体执行任务清单见 §4.1 M0.1-M0.3**

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

### 4.0 子 Epic 依赖关系图 + 并发约束

> **本节来自 `/validate-doc` Round 2 Scale Game 测试 E：明确 M0 的依赖关系，避免盲目并行。**

#### 4.0.1 依赖关系图

```
M0.0 全量存量违反项审计（最先）
    ↓
M0.1-M0.3 日历样板后端清理（后端模板）
    ↓ （强依赖：M1-M5 后端改动复用此模板）
M0.4-M0.6 前端基础设施抽取
    ↓ （软依赖：M1-M5 前端可用 shared layout；不做也可先各端接入业务组件）
┌─────┬─────┬─────┬─────┐
M1    M2    M3    M4    M5
job-  posi- mock- class- stud-
over  tions prac- recor ents
view        tice  ds
```

#### 4.0.2 并发约束

- **M0.1-M0.3** 是 M1-M5 **所有后端改动**的强依赖 → M0.1-M0.3 完成前**禁止**启动任何子 Epic 后端部分
- **M0.4-M0.6** 是 M1-M5 前端的软依赖 → 未完成时，子 Epic 前端可先做组件抽取（最后接入 MainLayout）
- **同时进行的子 Epic ≤ 2 个**（避免 shared 包 merge 冲突 + review 堆积）
- **建议串行**：M1 → M2 → ... 顺次推进，除非多个子 Epic 业务完全独立且有人力

#### 4.0.3 SSOT drift 处理

> **本节来自 `/validate-doc` Round 2 Scale Game 测试 B：如果 Assistant 代码在子 Epic 期间演进，如何处理 SSOT 漂移。**

每个子 Epic 启动时需要：
1. **快照 Assistant 相关文件路径 + commit hash**（记录在子 Epic 的 `01-<module>-current-state.md` §1 三端代码清单里）
2. **实施期间监控**：Assistant 相关文件如变更 >20% 行（相对快照），回到 `01` 重新审计

**drift 后的处置**：
- 如变更仅修 bug：忽略 drift，继续实施
- 如变更涉及业务/视觉规则：子 Epic 暂停，更新 01 审计，重新评估 scope

### 4.1 M0 前置清理 + 基础设施抽取（第一步）

**工作量**：1-2 周（含前端基础设施抽取 + 全量审计）

| # | 任务 | 类别 | 依赖 |
|---|---|---|---|
| **M0.0** | **全量存量违反项审计**（grep `@RequestMapping` 找所有挂多端 URL 的 Controller / Service 跨端引用）| 审计 | 无（最先做）|
| M0.1 | 日历样板 Controller 拆分（§3.2 动作 1）| 后端 | M0.0 |
| M0.2 | Service 重命名（§3.2 动作 2）| 后端 | M0.1 |
| M0.3 | Service 方法按业务拆（§3.2 动作 4）| 后端 | M0.2 |
| M0.4 | `MainLayout` 三端共性分析 → 抽取到 shared（见降级策略）| 前端 | 无（可并行 M0.1-M0.3）|
| M0.5 | `PageHeader` 抽取到 shared（Assistant 已有基础版）| 前端 | 无 |
| M0.6 | `OverlaySurfaceModal` 抽取到 shared（如果三端都用）| 前端 | 无 |

#### 4.1.1 M0.0 全量存量违反项审计

**目标**：确保 M0 清理范围完整，不只处理日历样板，找出**所有**违反原则 A 的 Controller。

**审计命令**：
```bash
# 找出挂多端 URL 的 Controller
grep -rn '@RequestMapping\|@GetMapping\|@PostMapping\|@PutMapping\|@DeleteMapping' \
  ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/ \
  | grep -E '(/admin/|/api/mentor/|/lead-mentor/|/assistant/)' \
  | sort | uniq

# 找出 Service 跨端引用（类名含端前缀但被不同 Controller 注入）
grep -rn 'IOsgLeadMentorJobOverviewService\|IOsgAssistantJobOverviewService\|IOsgMentorJobOverviewService' \
  ruoyi-admin/src/main/java/
```

**产出**：`docs/architecture/shared-infrastructure/m0-violation-audit.md`（违反清单 + 优先级）

**处置**：
- P0 日历样板（§3.1 已列）→ M0.1-M0.3 做
- P1 其他发现的违反项 → 登记到 m0-violation-audit.md，排入 M0.7+ 或后续子 Epic

#### 4.1.2 M0.4 MainLayout 降级策略

> **源于 Round 1 假设 5 翻转**：如果三端 MainLayout 差异过大，硬抽 shared 会引入复杂 prop/slot。

**降级判据**：
- M0.4 分析阶段计算三端 MainLayout 共性覆盖率（按 §5.1.3 方法）
- ≥ 70%：按计划抽 `<MainLayout>` 到 shared
- 50%-70%：降级为"抽 `<BaseLayout>` + 各端包 `<MainLayout>`"
- < 50%：**降级为"只抽 PageHeader，MainLayout 各端保留"**（D5 升级触发器触发）

#### 4.1.3 M0 完成 acceptance

> **源于 Round 1 假设 7 翻转**：Controller 拆分可能引入 hardcode 类名的回归。

**M0 完成标志**（全部满足才算完成）：
- ✅ 日历样板后端结构对齐原则 A（§3.3 目标结构）
- ✅ 前端有 MainLayout/PageHeader shared 组件（或降级版）
- ✅ `grep` 全工程无 `OsgJobOverviewController` 类名 hardcode 引用（除 deprecated 注释外）
- ✅ 全量后端测试通过（`mvn test -DskipTests=false`）
- ✅ 三端前端 smoke test 通过（对应子 Epic 未启动前仅验证未回归）

### 4.2 M1 Job Overview 子 Epic（进行中）

**工作量**：1-2 周
**状态**：🚀 进行中（StageTag ✅ 已完成，commit `e5bd8f56`）
**详细方案**：`docs/architecture/job-overview-unification/03-shared-extraction-plan.md`

| # | 任务 | 状态 | Commit |
|---|---|---|---|
| M1.1 | 前端 P0 原子组件 5 个（StageTag / CoachingStatusTag / StudentAvatarCell / CompanyPositionCell / InterviewTimeCell）| 1/5 ✅ | `e5bd8f56` |
| M1.2 | 前端 P1 复合结构 3 个（JobOverviewFilterBar / JobOverviewTable / useJobOverviewFilters）| ⏳ | — |
| M1.3 | 三端页面接入 shared 组件 | 🚀 进行中（Assistant ✅ / LM ✅ / Mentor ⚠️）| — |
| M1.4 | Mentor 中间态收尾（详见 `job-overview-unification/03-shared-extraction-plan.md` §6）| ⏳ 待 P1 完成后统一做 | — |
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
├── 01-<module>-current-state.md     ← 【🔴 阻塞性前置】现状分析 + 共性审计
├── 02-<module>-antd-migration.md    ← 如果需要先 antd 化的 antd 迁移
├── 03-shared-extraction-plan.md     ← shared 组件抽取方案（P0/P1/P2 清单）
└── 99-completion-report.md          ← 完工报告（实际成果 / commit 链 / 经验沉淀）
```

**命名规律**：`NN-` 数字前缀表示工作流顺序。

### 5.1 阻塞性前置：`01-<module>-current-state.md`

> **本节源于顶层路线图 `/validate-doc` Round 1 Inversion 发现：假设 6 "其他 4 页三端共性未审计" 为阻塞级问题。**

**本路线图规定**：**每个子 Epic（M1-M5）启动实施前**，必须先完成 `01-<module>-current-state.md`，否则不得进入 `03-shared-extraction-plan.md` 的组件抽取阶段。

#### 5.1.1 必填内容（以下是子文档 `01-<module>-current-state.md` 内部章节）

| 子文档章节 | 内容 | 量化要求 |
|---|---|---|
| **§0 SSOT 合理性审查** | 审视 Assistant 对应页面的实现质量：规则合理性 / 代码质量 / 技术栈新程度 | 如不合理，下单之前先修 Assistant 或换基准端 |
| **§1 三端代码清单 + Assistant 快照** | 三端对应页面的 .vue / composable / API / Service / Mapper 文件清单 + 行数 **+ Assistant 相关文件的 commit hash**（SSOT 快照，见 §4.0.3）| 必须给出具体路径、行数、commit hash |
| **§2 共性审计** | 逐个 UI 组件 / 逻辑块识别三端共性 | 每个组件标记：✅ 三端都有 / ⚠️ 两端有 / ❌ 单端有 |
| **§3 共性覆盖率** | 量化三端代码共性比例 | **共性行数 / 总行数**（必须是量化百分比，不接受"大部分""少量"等模糊描述）|
| **§4 差异清单** | 端特有业务 / UI 差异 / 数据结构差异 | 必须列出，不能遗漏 |
| **§5 决策建议** | 基于覆盖率给出子 Epic 可行性判断 | ✅ 继续 / ⚠️ 降级 / ❌ 推迟（判据见 §5.1.2）|

> 注：以上 §0-§5 指的是子文档 `01-<module>-current-state.md` 的内部章节，不是本路线图的章节。

#### 5.1.2 共性覆盖率判据与降级策略

| 覆盖率区间 | 子 Epic 决策 | 说明 |
|---|---|---|
| **≥ 70%** | ✅ **继续** 按标准流程抽取 P0+P1 | 理想情况 |
| **50% - 70%** | ⚠️ **降级**：只抽 P0 原子组件（不抽 P1 复合结构）| 避免 P1 复合结构变成"可选装配套件"，反模式 |
| **30% - 50%** | ⚠️ **仅抽纯 UI 组件**：仅抽 tag / cell 等纯视觉组件，不抽 composable / 业务逻辑 | 共性太低，共用会引入 slot/prop 爆炸 |
| **< 30%** | ❌ **推迟本子 Epic**（或明确"不做"）| 子 Epic ROI 反转，反模式，应保留各端独立实现 |

**推迟后的再评估机制**（来自 Round 2 Scale Game 测试 C）：
- 被推迟的子 Epic **每 3 个月自动触发 `01` 重新审计**（可配置）
- 如共性涨至 ≥ 30%：可重启（走降级档）
- 如共性涨至 ≥ 50%：可重启（走仅抽 P0 档）
- 如共性涨至 ≥ 70%：可重启（走标准档）
- 如 12 个月后仍 < 30%：升级为“明确不做”，迁移到 §4.8 清单

#### 5.1.3 共性覆盖率的计算方法

```
总共性行数 = Σ (每个可共用组件/模块的行数)
总代码行数 = Σ (三端对应页面的总行数) / 3    # 取平均值避免单端代码量过大扭曲
共性覆盖率 = 总共性行数 / 总代码行数
```

**"共用"定义**：三端代码逻辑可以用同一份 shared 实现覆盖的部分。仅视觉相似但逻辑不同的不算共用。

#### 5.1.4 前置文档的 review 机制

- **作者**：可由 Cascade / Claude / 人工完成
- **评审**：用户必须 review `01-<module>-current-state.md` 并 **显式 approve** 后才进入 `03`
- **变更管理**：如实施过程发现审计结论偏差（如实际共性远低于预估），必须**回到 01 修订**，重新判断可行性

**review 模板化**（来自 Round 2 Scale Game 测试 A）：
- 为降低 review 认知负担，`01-<module>-current-state.md` 推荐使用统一模板
- 模板路径：`docs/architecture/_templates/01-current-state-template.md`（待创建，首次子 Epic 执行时从 job-overview 的 01 文档提炼为模板）
- 模板包含：§0-§5 标准章节框架 + 共性覆盖率计算可执行命令

### 5.2 子 Epic 文档迭代规则

- `00-epic-overview.md` 可随时写（scope 声明 + 关联）
- `01-<module>-current-state.md` **阻塞性前置**（见 §5.1）
- `02-<module>-antd-migration.md` 仅在**存在 antd 化前置需求**时创建
- `03-shared-extraction-plan.md` **必须在 01 approve 后才写**
- `99-completion-report.md` 子 Epic 完成后写

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
| 基础设施（M0）发现比预期复杂 | 中 | 如果 MainLayout 三端差异过大，降级为"只抽 PageHeader"（见 §4.1.2 降级策略）|
| Mentor 中间态（job-overview）拖延 M1 | 中 | 按方案 A 保留，不阻塞 P1 启动（前提评估见 §7.4）|
| SSOT 漂移（Assistant 演进影响子 Epic）| 中 | §4.0.3 SSOT drift 处理 |
| 某端未能参与（三端 → 两端降级）| 中 | 见 §7.5 |
| 某页中途被废弃（需求变更）| 中 | 见 §7.6 |
| SSOT 基准稳定性假设被打破（Vue3→Vue4 等）| 高 | §0.5 前置假设 PA-1 指定，触发后路线图暂停 |

### 7.3 回滚策略

- **组件级**：每个抽取 = 1 commit，`git revert <hash>` 回退
- **Controller 拆分级**：一个 M0 子任务 = 1 commit，独立回退
- **子 Epic 级**：每个子 Epic 的改动独立于其他子 Epic，可单独暂停

### 7.4 Mentor 中间态方案 A 的前提评估

> **来自 `/validate-doc` Round 1 假设 8 翻转**：方案 A（保留中间态等 P1 覆盖）的前提是“P1 shared 组件能覆盖 Mentor antd 化的大部分改动”，但 Mentor 有端特有业务（4 统计卡 / 确认收徒 / 内嵌 Modal）不会被 shared 覆盖。

**评估时机**：M1 P1 核心组件抽出后（`JobOverviewFilterBar` / `JobOverviewTable` 完成），评估 Mentor antd 化中间态的“可覆盖部分”占比：

| 覆盖占比 | 决策 |
|---|---|
| ≥ 60% | ✅ 维持方案 A（无损失，列出不被覆盖的 ≤40% antd 改动保留为端特有）|
| 40% - 60% | ⚠️ 混合策略：已抽的 shared 覆盖主要结构，antd 改动保留端特有部分 |
| < 40% | ❌ 触发§1.6 D9 升级触发器：回退为方案 B，或切换为方案 C（修测试后 commit）|

**遗留态 antd 改动风险**：如 Mentor antd 化中间态在 P1 完成后仍保留 >60% “不被覆盖的端特有 antd 改动”，需重新评估“方案 A 的工作量的浪费比例”。

### 7.5 端参与度降级（三端 → 两端）

> **来自 `/validate-doc` Round 2 Scale Game 测试 H**：如某端本期无力参与，是否可以降级为两端？

**规则**：
- ✅ **允许降级**：LM + Assistant 两端先抽 shared 组件，Mentor 保留原状（或反之）
- ⚠️ **前提**：shared 组件的 API 设计必须满足未来**无损扩展到第三端**：
  - 数据结构 DTO 以三端共性为准（不因两端而合并共性）
  - 组件 props API 保留扩展 slot / prop 空间给第三端
- **记录**：`01-<module>-current-state.md` §4 差异清单里明确标注哪端本期不参与 + 未来接入规划

### 7.6 子 Epic 中途废弃（需求变更）

> **来自 `/validate-doc` Round 2 Scale Game 测试 I**：如某页被产品中途废弃，已抽组件怎么办？

**处置**：
- 子 Epic 未开始：直接移除至 §4.8（本期不做清单）
- 子 Epic 进行中：
  - 已抽组件**仅供废弃页使用** → `git revert` 组件 commit
  - 已抽组件**跨页通用** → 保留，在 shared 包 README 标明来源子 Epic 但已废弃
- 子 Epic 已完成：保留全部组件，在 `99-completion-report.md` 标注“页面已废弃但组件仍通用”

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

- [ ] 本文档 `/validate-doc` 通过（4 轮思辨 + 一致性校验无阻塞级问题）
- [ ] 用户确认 M0 工作量（约 1-2 周）可接受
- [ ] M0 的拆分 commit 范围划定（每个 Controller 拆分 1 commit）
- [ ] **每个子 Epic（M1-M5）启动前**，对应 `01-<module>-current-state.md` 已完成且用户 approve（见 §5.1）

### 9.2 M0 执行入口

**详细任务清单**：见 §4.1 M0.0-M0.6。

**建议启动顺序**：
1. M0.0 全量存量违反项审计（最先）
2. M0.1-M0.3 日历样板后端清理（作为后端模板）
3. M0.4-M0.6 前端基础设施（可与 M0.1-M0.3 并行）

**acceptance 标准**：见 §4.1.3。

**M0 完成后 → M1 Job Overview 继续（当前在 StageTag 之后）**

---

## 10. 修订历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-04-24 | 初版（451 行）：战略背景、5 条原则、路线图 M0-M6、关联文档 |
| v1.1 | 2026-04-24 | `/validate-doc` Round 1-4 + Step 3 全面修订（710 行）：<br>- §0.4 Admin scope 明确（不在 SSOT 对齐范围）<br>- §0.5 前置假设 PA-1~PA-5<br>- §1.6 决策可逆性总表（Round 4 cascade，含 D3/D4/D5/D9/D11 升级触发器）<br>- §2.4 粒度约束（每页 P0+P1 ≤ 15 组件）<br>- §3.2 修正动作表压缩（避免与 §4.1 M0 重复）<br>- §4.0 子 Epic 依赖图 + 并发约束 + SSOT drift 处理<br>- §4.1.1 M0.0 全量存量违反项审计 + §4.1.2 MainLayout 降级策略 + §4.1.3 M0 acceptance 标准<br>- §5.1.1 子文档章节升级为 §0-§5（SSOT 合理性审查 + Assistant 快照）<br>- §5.1.2 <30% 推迟后再评估机制<br>- §5.1.4 review 模板化<br>- §7.2 补 SSOT 漂移 / 端降级 / 子 Epic 废弃 / SSOT 稳定性打破 4 条风险<br>- §7.4 Mentor 方案 A 前提评估 + §7.5 端参与度降级 + §7.6 子 Epic 中途废弃<br>- §9.2 M0 执行入口压缩（避免与 §4.1 重复）<br>- 一致性修正：§3.2 "详见 §6.1" 错引 / §5.1.1 章节编号歧义 / §4.2 M1.4 子文档引用歧义 |

---

*文档结束。v1.1 `/validate-doc` 4 轮思辨 + 一致性校验通过。下一步：§9.1 启动条件 check → M0 启动。*
