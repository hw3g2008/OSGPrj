# Job-Overview 3 端统一 Epic（总览）

- **日期**：2026-04-24
- **作者**：Cascade（与用户协作制定）
- **状态**：🚀 进行中（路线 A · 以 Assistant antd 为 SSOT）
  - ✅ Phase 1 已完成（2026-04-24）
  - 🔄 **Phase 2 战略转向**（2026-04-24）：不再独立 antd 化 Mentor，改为直接走 shared 抽取 + 三端接入
  - 📄 **Phase 3 + 4 被接管**：`@/Users/hw/workspace/OSGPrj/docs/architecture/job-overview-unification/03-shared-extraction-plan.md` 细化并合并 Phase 3+4 为"原子组件抽取"模式
  - ✅ StageTag 已抽并三端接入（commit `e5bd8f56`，见 03 方案文档 §2.1）
- **范围**：Assistant / Lead-Mentor / Mentor 三端的"学员求职总览"（job-overview）页面
- **关联路线图**：`docs/architecture/2026-04-24-shared-frontend-roadmap.md`
- **前置已完成**：
  - ✅ Round 1：`useInterviewCalendar` + `<InterviewCalendar>`（3 端日历统一）
  - ✅ 后端：`/assistant|lead-mentor|mentor/job-overview/calendar` 三端统一数据契约

---

## 一、目标

**一句话**：以 Assistant（antd 化）为 SSOT，把 Lead-Mentor 和 Mentor 的 job-overview 页面也 antd 化，同时抽出可复用的原子 UI 组件和业务 composable，彻底消除 3 端 job-overview 的代码重复。

**量化目标**：
- Lead-Mentor job-overview：`1,337 → ~500` 行（降 ~62%）
- Mentor job-overview：`740 → ~400` 行（降 ~46%）
- 3 端合计行数：`2,527 → ~1,350` 行（**消除 ~1,177 行重复代码**）
- shared 包新增 **6 组件 + 3 composable**，覆盖 3 端 job-overview 所有共性积木

---

## 二、为什么走这条路（选型决策记录）

### 2.1 3 端现状对比

| 项 | Assistant (450 行) | Lead-Mentor (1337 行) | Mentor (740 行) |
|---|---|---|---|
| 技术栈 | ✅ antd 完整 | ❌ 原生 HTML + 自定义 class | ❌ 原生 HTML + 自定义 class |
| 表格 | `<a-table>` 配置式 | `<table>` 原生 | `<table>` 原生 |
| 筛选 | `<a-input>` + `<a-select>` | `<input>` + `<select>` | `<input>` + `<select>` |
| Tab 数量 | 2（coaching / managed） | 3（+ pending 分配导师） | 0（单表格） |
| 统计卡 | 无 | 无 | 4 个（新/待/完成/取消） |
| 详情 | 内嵌 `<a-card>` | 独立 Modal 组件 | 内嵌原生 Modal |

### 2.2 为什么必须 antd 化 LM/Mentor

**技术锁死问题**：只要 LM/Mentor 仍用原生 HTML，任何"3 端共享的表格组件"都无法落地——因为 Assistant 用 `<a-table>`，LM/Mentor 用 `<table>`，两种 DOM 结构不兼容。

**5 个理由**：
1. 3 端 `package.json` 都已装 antd（零新依赖）
2. Assistant 已完整 antd 化，**SSOT 就在眼前**
3. LM 1337 行的原生实现本身就有大量冗余（重复的 tag/avatar/time 渲染逻辑）
4. 不做 antd 化，job-overview 之后还有 `class-records / mock-practice / schedule` 等页面——同样的瓶颈会再遇到 5 次
5. antd 化后测试更稳定（不依赖自定义 class 名，用 antd 语义化选择器）

### 2.3 保留的端特有业务（不抽共享）

| 端 | 保留内容 | 原因 |
|---|---|---|
| Assistant | 2 Tab（coaching/managed） | 业务范围差异 |
| Lead-Mentor | 3 Tab + pending 的"分配导师"按钮 + `<AssignMentorModal>` | LM 独有的班主任职能 |
| Mentor | 4 统计卡 + "确认收徒"按钮 + 大型详情 Modal（时间线/辅导/反馈） | Mentor 独有的 1v1 辅导业务 |

这些按路线图 §七 反模式原则**永远留在各端页面**，绝不通过 `if/else` 吸收到 shared 组件里。

---

## 三、4 Phase 规划

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Phase 1：LM job-overview antd 化（已完成 2026-04-24）
├── 输入：osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue (1337 行)
├── 实际产出：antd 版 1125 行（-212 行 / -16%；未达 ~500 行目标，保留 3 Tab 业务 + 完整 bodyCell slot）
├── 验证：LM 115 单测全绿（43 test files）+ 3 Tab 浏览器实拍通过
├── 其他端无回归：Assistant 106 passed 全绿；Mentor/Admin/Student 历史 fail 与本 Phase 无关（pnpm workspace 隔离）
└── 关键技术决策：全页包 <a-config-provider :auto-insert-space-in-button="false">、setup.ts 加 jsdom polyfills、测试 mock 改用 importActual
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 2：Mentor job-overview antd 化（前置工程）
├── 输入：osg-frontend/packages/mentor/src/views/job-overview/index.vue (740 行)
├── 产出：重写为 antd 版 (~400 行)，保留 4 统计卡 + 确认收徒 + 大 Modal
├── 工作量：3–4h
├── 验证：Mentor 基线 5 failed 不变，其他全绿 + 浏览器实拍
└── 独立性：✅ 不依赖 Phase 1，可并行（另一个窗口）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 3：抽共享积木（6 组件 + 3 composable）
├── 前置：Phase 1 + Phase 2 都完成（3 端都 antd 化）
├── 产出：
│   ├── @osg/shared/components/
│   │   ├── StudentAvatar.vue         头像 + 姓名 + ID
│   │   ├── CompanyPositionCell.vue   公司 + 岗位副行
│   │   ├── InterviewStageTag.vue     阶段 tag（语义色）
│   │   ├── CoachingStatusTag.vue     辅导状态 tag
│   │   ├── InterviewTimeCell.vue     时间 + 倒计时
│   │   └── JobDetailPanel.vue        详情展示（业务按钮走 slot）
│   └── @osg/shared/composables/
│       ├── useJobOverviewFilter.ts   关键字 + 公司 + 状态筛选
│       ├── useJobOverviewStats.ts    统计数据计算
│       └── useCoachingStatusMap.ts   状态 → label/color/icon
├── 工作量：4–6h
├── 验证：每个组件/composable 100% 单测覆盖，3 端现有测试不受影响
└── 独立性：依赖 Phase 1 + 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 4：3 端接入替换
├── 前置：Phase 3 完成
├── 产出：
│   ├── Assistant job-overview：本地 PageHeader/avatar/stage 全部替换为 shared
│   ├── LM job-overview：本地 antd 组件替换为 shared
│   └── Mentor job-overview：本地 antd 组件替换为 shared
├── 工作量：2–3h
├── 验证：3 端全绿 + 3 端浏览器实拍对比（视觉 100% 一致）
└── 独立性：依赖 Phase 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**总工作量**：12–17h（2–3 个完整工作日），可分 3 个窗口并行推进（Phase 1/2 并行，Phase 3 / 4 串行）。

---

## 四、并行化方案

```
时间轴 ─→

窗口 A：[Phase 1 LM 改造] ──┐
                           ├─→ [Phase 3 抽共享] ─→ [Phase 4 接入] ✅
窗口 B：[Phase 2 Mentor 改造] ┘

最短关键路径：Phase 1/2 (4h) + Phase 3 (6h) + Phase 4 (3h) = 13h
```

---

## 五、每 Phase 的独立验证标准

| Phase | 自验证 | 回归验证 | 视觉验证 |
|---|---|---|---|
| 1 | LM 115 passed 全绿 | maven + assistant 不受影响 | 浏览器 vs 原 LM 功能对照 |
| 2 | Mentor 回到基线（5 failed） | 其他端不受影响 | 浏览器 vs 原 Mentor 功能对照 |
| 3 | 新增 6 组件 + 3 composable 单测 100% | 3 端已有测试全绿 | — |
| 4 | 3 端全绿 | maven 编译 | **3 端 job-overview 浏览器实拍横向对比** |

---

## 六、禁止事项（反模式警戒）

| 禁止 | 正确做法 |
|---|---|
| 把 pending Tab 的"分配导师"业务抽到 shared | 留在 LM 本地页面，shared `<JobOverviewTable>` 通过 slot 扩展 |
| 把 Mentor 的"确认收徒"按钮抽到 shared | 留在 Mentor 本地页面 |
| 抽 `<JobOverviewPage>` 整页 | 只抽原子组件 + composable |
| 组件内发 HTTP 请求 | 组件纯展示，数据由 prop 传入 |
| 为单端特殊需求在 shared 加 prop | 先考虑 slot 降级 |

---

## 七、阶段性交付物清单

### ✅ Phase 1 后（已完成 2026-04-24）
- 📄 `docs/architecture/job-overview-unification/01-phase1-lm-antd-migration.md`（执行手册）
- 💻 LM `job-overview/index.vue` 从 1337 → 1125 行（-212 / -16%）
- ✅ LM 115 单测全绿（43 test files）
- ✅ 3 Tab 浏览器实拍：`e2e-review/lead-mentor/antd-phase1/` (pending/coaching/managed)
- ⚠️ 未达 ~500 行目标的原因：保留了各 Tab 独立 `<a-table>` + 完整 bodyCell slot 定义（避免 slot 抽取引入 Phase 3 预耦合），这些行数将在 Phase 3 抽共享组件时自然消除

### Phase 2 后
- 📄 `02-phase2-mentor-antd-migration.md`
- 💻 Mentor `job-overview/index.vue` 从 740 → ~400 行
- ✅ Mentor 基线不变 + 实拍验证

### Phase 3 后
- 📄 `03-phase3-shared-extraction.md`
- 💻 `@osg/shared/components/`（+6）和 `@osg/shared/composables/`（+3）
- ✅ 单测 100% 覆盖

### Phase 4 后
- 📄 `04-phase4-three-end-integration.md`
- 💻 3 端 job-overview 全部引用 shared 积木
- ✅ 3 端实拍对比视觉一致

### Epic 完成后
- 📄 本文件更新：所有 Phase 标记 ✅
- 📄 路线图文档 §4.1 / §4.2 对应候选项状态更新
- 📊 代码行数收益报告（消除 ~1,177 行重复代码）

---

## 八、下一步

**立即开工**：
- ✅ Phase 1 已完成（2026-04-24）
- ⏳ Phase 2 任务书待写（Mentor job-overview antd 化）

**推进策略**：
- ✅ Phase 1 验证 antd 化节奏 + 风险摸底：成功（技术栈稳定、测试修复套路可复用到 Phase 2）
- 用户决定 Phase 2 启动时机
- Phase 3 / 4 由用户主控推进节奏

**Phase 1 → Phase 2 可复用经验**：
1. `setup.ts` jsdom polyfills（matchMedia/ResizeObserver/IntersectionObserver）同样适用于 Mentor
2. 测试 mock 套路：`vi.mock('ant-design-vue', async () => importActual + 仅覆盖 message`
3. `<a-config-provider :auto-insert-space-in-button="false">` 避免两字按钮空格问题
4. mount 时 `app.use(Antd)` 全局注册
5. 测试选择器：`input.form-input` → `input[placeholder="..."]`、`.table` → `.ant-table`、`style.display` → `.ant-tabs-tabpane-active` 类名判断
