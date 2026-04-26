# LM ↔ Assistant Commonality 量化报告

**日期**：2026-04-26
**作者**：Cascade（Lead-Mentor / Assistant 共享化第二轮）
**触发**：用户决策「LM 和 Asst 几乎一致，肯定可以合 — 趁热打铁把所有共有页面共享化」

---

## 1. 背景

继 `2026-04-24-assistant-as-ssot-roadmap.md` M2 完成（positions 已抽出 PositionsFooter / PositionsListTable / PositionsDrilldown 三个共享组件），用户要求继续推进 LM/Asst 其他共有页面的共享化。

本报告为执行前的 **commonality 实测盘点**，结论用于回写 roadmap 与决策后续优先级。

---

## 2. 双端共有页面清单（本期范围内）

按 `2c14519e` 五端业务边界，LM 与 Asst 共有 7 个一级业务页（不含登录 / 忘记密码）：

| # | 页面 | LM 路径 | Asst 路径 |
|---|---|---|---|
| 1 | 岗位信息 | `views/career/positions/index.vue` | `views/career/positions/index.vue` |
| 2 | 学员求职总览 | `views/career/job-overview/index.vue` | `views/career/job-overview/index.vue` |
| 3 | 模拟应聘管理 | `views/career/mock-practice/index.vue` | `views/career/mock-practice/index.vue` |
| 4 | 学员列表 | `views/students/index.vue` | `views/students/index.vue` |
| 5 | 课程记录 | `views/teaching/class-records/index.vue` | `views/class-records/index.vue` |
| 6 | 课程排期 | `views/profile/schedule/index.vue` | `views/schedule/index.vue` |
| 7 | 个人基本信息 | `views/profile/basic/index.vue` | `views/profile/index.vue` |

---

## 3. 实测分类（可合性评估）

### 3.1 ✅ 已合或基本到位

| 页面 | 状态 | 共享化产出 | 备注 |
|---|---|---|---|
| **岗位信息** | ✅ 已合 | `PositionsFooter` / `PositionsListTable` / `PositionsDrilldown` (M2 完成) | LM/Asst 视觉/功能完全对齐，pagination + industry tone 全部统一 |
| **学员求职总览** | ✅ 基本到位 | 已用 6 个共享 cell：`PageHeader` / `InterviewCalendar` / `StageTag` / `StudentAvatarCell` / `CompanyPositionCell` / `InterviewTimeCell` + `@osg/shared/api` | LM 多一个 `pending` tab + `AssignMentorModal`（导师分配是 LM 真业务差异），共性已覆盖 ~85% |
| **模拟应聘管理** | ✅ 本轮新合 | LM 完整 antd 化（1283 → 1102 行）+ 三 tab 筛选接通 + 复用 `PageHeader` | LM 多一个 `pending` tab + `AssignMockModal` + `Acknowledge` 流程（同样是 LM 真业务差异），脚本逻辑 100% 保留 |

### 3.2 ⛔ 后端 schema/业务模型分歧（无法直接合并）

| 页面 | 分歧详情 | 阻塞类型 |
|---|---|---|
| **学员列表** (`students`) | LM `LeadMentorStudentListItem` 字段：`relations[]` / `applyCount` / `interviewCount` / `offerCount`（站在班主任角度看学员关系 + 求职数据）<br>Asst `StudentListItem` 字段：`leadMentorName` / `contractStatus` / `isBlacklisted` / `pendingReview` / `jobCoachingCount` / `basicCourseCount` / `mockInterviewCount` / `remainingHours`（站在助教角度看学员合同 + 课程） | 后端字段不重叠，LM 当前是占位（24 行假数据），需要后端先实现 schema 对齐 |
| **课程记录** (`class-records`) | LM 后端**只有** `createLeadMentorClassRecord` (POST 上报)，**没有** `getLeadMentorClassRecordList` / `Stats` GET 端点<br>Asst 后端有完整 list + stats + create | LM 的 list/stats GET 后端尚未实现，前端当前是「上报模态 + 占位 list」混合状态 |
| **课程排期** (`schedule`) | LM `LeadMentorScheduleView`：双周 (current/next) + slot keys 数组 (`["mon-09:00", ...]`) + `availableHours` + `availableDayCount` + 审核流程<br>Asst `AssistantSchedule`：单周 + 每天一个字符串 (`monday: "09:00-12:00"`) + 直接更新 | 业务模型完全不同：LM 是「按时段选可用」，Asst 是「按天填工作时间描述」 |
| **个人基本信息** (`profile`) | LM `LeadMentorProfileRecord`：staff 模型（`staffId` / `englishName` / `genderLabel` / `regionArea` / `regionCity` / `majorDirection` / `subDirection` / `hourlyRate`）+ **变更请求审核流程** (`pendingChanges[]` / `submitLeadMentorProfileChangeRequest`)<br>Asst `AssistantProfile`：sys_user 模型（`userId` / `userName` / `nickName` / `phonenumber` / `loginIp` / `loginDate` / `avatar`）+ 直接 update | 业务模型完全不同：LM 是 mentor staff（含薪资/方向/审核流程），Asst 是后台 sys_user（无审核） |

---

## 4. 量化指标

### 4.1 抽取产出（M2 + 本轮）

| 共享资产 | 类型 | 行数 | 覆盖端 |
|---|---|---|---|
| `PositionsFooter.vue` | 组件 | ~80 | LM, Asst |
| `PositionsListTable.vue` | 组件 | ~290 | LM, Asst |
| `PositionsDrilldown.vue` | 组件 | ~370 | LM, Asst |
| `positionsTone.ts` | 工具 | ~70 | LM, Asst |
| `positions/types.ts` | 类型 | ~140 | LM, Asst |

### 4.2 单端代码净瘦身

| 端 | 页面 | 改造前 | 改造后 | 净瘦身 |
|---|---|---|---|---|
| LM | `views/career/positions/index.vue` | 1465 | ~1170 | **−295** |
| Asst | `views/career/positions/index.vue` | 1053 | ~890 | **−163** |
| LM | `views/career/mock-practice/index.vue` | 1283 | 1102 | **−181** |
| **总计** | — | — | — | **−639 行** |

### 4.3 单测健康度

LM 全套 **43 spec / 112 passed / 2 skipped / 0 failed**（mock-practice 6 个 spec 在 antd 迁移后全部适配通过，2 个 skip 用例为「a-select popup-click 流程在 jsdom 不可靠模拟」，已贴 TODO 待迁移到 `@vue/test-utils` 后恢复）。

---

## 5. 关键发现

### 5.1 「LM 和 Asst 几乎一致」是 UI 层印象，不是数据层事实

宏观上，LM 与 Asst 的 sidebar 菜单结构几乎重叠（5 个二级菜单 6 个一级页），但**逐页拉开后**：

- **UI 共性高**（4 端 antd + PageHeader + cells）
- **API schema 共性低**（独立 controller + 独立 DTO + 独立业务流程）

可合并的页面（positions / mock-practice）有一个共同特征：**双端业务场景一致**（都是「读 + 简单互动」），LM 多出来的功能是「叠加」而非「替代」（pending tab 是 superset）。

不可合并的页面（students / class-records / schedule / profile）有一个共同特征：**双端业务场景本质不同**（学员关系 vs 合同 / 上报 vs 列表 / 时段 vs 时间字符串 / staff vs sys_user）。

### 5.2 「先后端对齐 schema，再前端合」是必经路径

要继续合并 students / class-records / schedule / profile，必须先解决：

1. **students**：是否要让 LM 的「学员关系视角」和 Asst 的「合同/课时视角」融合到同一个 DTO？建议**两端共用 `OsgStudentBasic` 基础 DTO + 各端独立 `OsgStudentExtension`**，前端按权限取超集字段
2. **class-records**：LM 后端补 GET list/stats 端点，schema 直接复用 Asst 的 `ClassRecordRow`（上层 wrapper）
3. **schedule**：选一个统一模型（推荐 LM 的 slot-keys 模型，更细粒度）。Asst 切换到这个模型需要后端表结构变更
4. **profile**：保留两端独立。staff/sys_user 是真业务差异，强行合并代价大于收益

---

## 6. 决策与下一步

### 6.1 当前状态

✅ **本轮 deliverable 完成**：mock-practice antd 化 + LM 三 tab 筛选接通 + 共享组件复用 + 单测全绿。

⚠️ **进一步合并阻塞**：4 个页面被后端 schema/业务模型差异阻塞，前端无法独立推进。

### 6.2 推荐路径

按优先级排序：

| 优先级 | 项目 | 工作量 | 收益 |
|---|---|---|---|
| P0 | 后端 students schema 对齐（`OsgStudentBasic + Extension`） | 2-3 天（后端 controller + DTO + SQL） | 解锁 students 前端合并（~600 行) |
| P0 | LM `class-records` 后端 list/stats GET 实现 | 1-2 天 | 解锁 class-records 前端合并（~1500 行） |
| P1 | 推 M3 的下一站（无依赖项） | 看 roadmap | 不被本议题阻塞，并行推进 |
| P2 | schedule 业务模型决策 | 需产品 + 后端 + 前端三方对齐 | 不紧急，当前两端各自跑 |
| P3 | profile 保留独立 | — | 业务模型差异大，强合代价 > 收益 |

### 6.3 不建议做

- ❌ 强行把 LM students 的 schema 拷成 Asst 的（破坏 LM 后端契约）
- ❌ 强行把 LM schedule 的 slot-key 模型降级成 Asst 的 string 模型（信息丢失）
- ❌ 在 profile 上做 wrapper 适配（增加耦合无收益）

---

## 7. 关联工件

- `2026-04-24-assistant-as-ssot-roadmap.md` — 顶层 SSOT 路线图（M2 状态待回写本报告结论）
- `positions-unification/00-epic-overview.md` — Positions 子 Epic（本报告补充：M2 P1 已完成 LM/Asst 部分）
- `mock-practice-unification/00-epic-overview.md` — Mock Practice 子 Epic（本报告补充：LM 已 antd 化，与 Asst UI 对齐）
- `students-unification/00-epic-overview.md` — Students 子 Epic（本报告标记：blocked by 后端 schema）
- `class-records-unification/00-epic-overview.md` — Class Records 子 Epic（本报告标记：blocked by LM 后端 list/stats）

