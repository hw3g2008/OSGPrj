# 接力提示词：OSG 班主任求职总览 + 三端课消上报改造（实施阶段）

> 复制本文件全部内容粘贴给接手的 AI 即可。

---

## 0. 你是谁

你是接手这个 RPIV 工作流实施阶段的 AI。前置 AI 已经完成：
- 需求分析
- 方案文档（7 轮校验通过）
- Story 拆分（5 个 Story）
- Ticket 拆分（138 个 Ticket，类/方法级粒度）
- S-053 全部 7 个 Ticket 实施完成

你的任务：把剩下 131 个 Ticket 干完，验收 4 个 Story（S-054~S-057），收尾。

---

## 1. 项目根目录

```
/Users/hw/workspace/OSGPrj
```

所有路径如未特别说明，都相对于此根。

---

## 2. 必读文件（按顺序，约 30 分钟读完）

按这个顺序读，不要跳：

1. `.claude/CLAUDE.md` — 项目工作流总规则、禁止行为、Agent 分派、5 端弹窗强约束
2. `.claude/project/config.yaml` — 命令、技术栈、路径
3. `osg-spec-docs/tasks/STATE.yaml` — 当前工作流状态
4. `docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md` — **核心方案文档**（必读全文，含 §4A 公共抽取架构）
5. `.claude/templates/ticket.yaml` — Ticket 模板
6. `.claude/skills/workflow-engine/state-machine.yaml` — 状态机定义
7. `docs/modal-form-style-guide.md` — 5 端弹窗强约束
8. 抽样 Ticket 看粒度标准：`osg-spec-docs/tasks/tickets/T-250.yaml`（database）、`T-400.yaml`（frontend）、`T-500.yaml`（frontend）

---

## 3. 当前状态快照

- 模块名：`lead-mentor-job-overview-class-report`
- 当前 Story：S-053（已完成全部 ticket，待 `/verify`）
- 工作流状态：`current_step=all_tickets_done`，`next_step=verify`

### Story 总览

| Story | 标题 | 估算 | 依赖 | Ticket 数 | 状态 |
|---|---|---|---|---|---|
| S-053 | DB schema + 字典 + 后端常量 | 2d | — | 7 (T-250~T-256) | ✅ 全部 done |
| S-054 | 班主任求职总览三栏改造 | 4d | S-053 | 30 (T-300~T-329) | ⏸️ 全 pending |
| S-055 | §4A 公共抽取（前后端集中化） | 5d | S-053 | 50 (T-400~T-449) | ⏸️ 全 pending |
| S-056 | 三端弹窗按 §3 全量改造 | 6d | S-055 | 31 (T-500~T-530) | ⏸️ 全 pending |
| S-057 | spec 迁移 + e2e 回归 + TBD 收尾 | 2d | S-055, S-056 | 20 (T-600~T-619) | ⏸️ 全 pending |

### 依赖图

```
S-053 ──┬─→ S-054
        └─→ S-055 ──→ S-056 ──┐
                              ├─→ S-057
                  S-055 ──────┘
```

S-054 与 S-055 可以**并行**（都依赖 S-053，互不依赖）。

---

## 4. 主链路（按这个顺序跑，禁止跳跃）

### 阶段 1：S-053 验收

S-053 的 7 个 ticket 已经全部 status=done，产物已落地。你只需要：

1. 跑 `/verify S-053` — 跑 Story 级验证（覆盖率 + 集成测试）
2. 通过 → `/approve S-053` → STATE 推进，进入阶段 2

### 阶段 2：S-054 + S-055 并行实施

启 2 个并行 dev agent（subagent_type=`developer`），各负责一个 Story 的 ticket 队列：
- **agent A**：S-054（30 ticket，求职总览三栏改造）
- **agent B**：S-055（50 ticket，§4A 公共抽取）

**S-055 是重头戏（5d）也是高风险节点**：
- 是"行为不变重构"，**不引入新业务字段**（新字段在 S-056 加）
- 抽取 ~1.2k 行 shared 代码 + 三端薄壳改造（每端 ≤ 50 行）
- 完成后必须 e2e 回归验证三端原行为不变

每个 Story 全部 ticket 完成 → `/verify S-XXX` → `/approve S-XXX`。

### 阶段 3：S-056 实施（依赖 S-055 完成）

31 个 ticket，三端弹窗按 §3 全量改造。

**关键**：必须基于 S-055 抽取的 `shared/src/components/ClassReportFlowModal/` 改，避免一改三改。

完成后 `/verify S-056` → `/approve S-056`。

### 阶段 4：S-057 收尾（依赖 S-055 + S-056）

20 个 ticket，spec 迁移 + 三端 e2e 回归 + TBD 收口。

完成后 `/verify S-057` → `/approve S-057`。

最后 STATE → `all_stories_done`，**不要跑 `/final-closure`**（用户已说不必走标准收口）。

---

## 5. 单个 Ticket 实施 SOP（每个 Ticket 都按这个跑）

```
1. 读 ticket YAML：osg-spec-docs/tasks/tickets/T-XXX.yaml
   - 关注 type / allowed_paths.modify / acceptance_criteria / test_cases / dependencies
2. 按 type 分派 dev agent（subagent_type=developer）：
   - database  → 跑 mvn 测试 + 迁移脚本可重入测试
   - backend   → 加单元测试，分支覆盖率 100%、行覆盖率 ≥ 90%
   - frontend  → 加 vitest spec，行覆盖率 ≥ 80%
   - frontend-ui → 加 vitest spec，行覆盖率 ≥ 70%
   - test      → 跑现有/新增测试
   - config    → 加单测
3. agent 严格遵守 ticket.allowed_paths.modify（不许碰其他文件）
4. agent 完成后跑验证命令（mvn test / pnpm test）
5. exit_code=0 才算通过
6. 把 verification_evidence 写回 ticket YAML：
     - command（实际执行的命令）
     - exit_code: 0
     - timestamp: ISO8601
     - output_summary（关键输出摘要）
     - test_result（total/passed/failed/skipped/duration_ms）
     - coverage（line/branch/method 覆盖率）
7. ticket.status = done，ticket.completed_at = ISO8601
8. 更新 STATE.yaml：
     - completed_tickets += [T-XXX]
     - stats.completed_tickets += 1
9. 检查是否本 Story 全部完成 → 是则推进 STATE 到 all_tickets_done，触发 /verify
```

---

## 6. 关键技术约束（违反必返工）

### 6.1 后端

- Java 21 + Spring Boot 3.x + MyBatis（详见 `.claude/project/config.yaml`）
- 阿里巴巴 Java 开发手册 + `.claude/project/rules/java.md`
- 测试：分支覆盖率 100%、行覆盖率 ≥ 90%（backend / database / test）
- 字段级权限**双层防护**：前端 v-if + 后端 @PreAuthorize（违反 5 端弹窗规范第 6 条）
- 文件上传：`Files.probeContentType()` 二次校验 + UUID 文件名 + @PreAuthorize（5 端弹窗规范第 7 条）
- 三端 controller 共用 `OsgClassRecordServiceImpl`，业务逻辑不在 controller 层
- 5 条 server-side 校验集中在新建的 `OsgClassReportValidator`，三端 service 调用同一份

### 6.2 前端

- Vue 3 + ant-design-vue + pnpm workspace
- `.claude/project/rules/vue.md` + `docs/modal-form-style-guide.md`
- 弹窗套 `.osg-modal-form` 公共类（高度 36px、圆角 6px、line-height 34px、textarea 至少 80px）
- 多选用 `@osg/shared/components` 的 `MultiSelect`，**禁止** `<a-select mode="multiple">`
- 字典字段渲染 `dictValue → dictLabel`，模板里禁止直接 `{{ tech }}` 这种 key
- 测试覆盖率：frontend ≥ 80% 行 / frontend-ui ≥ 70% 行

### 6.3 公共抽取（§4A，极重要）

- 三端"完全一致"靠 `osg-frontend/packages/shared/src/components/ClassReportFlowModal/` **一份实现**
- 三端 ReportModal.vue 总行数 **≤ 50**（仅 import + props 透传）
- 后端 `OsgClassRecordServiceImpl` 三端共用，三端 controller 仅 @PreAuthorize 鉴权 + 调 service
- 4 个 composable 在 `shared/src/composables/`：
  - `useClassReport.ts`
  - `useReferenceFinder.ts`
  - `useBaseCourseTopic.ts`
  - `useStudentScopeFinder.ts`
- 4 个 API 在 `shared/src/api/class-records.ts`：
  - `submitClassReport(end, payload)`
  - `getReportableStudents(end)`
  - `getReferenceCandidates(end, studentId, refType)`
  - `getClassReportDetail(applicationId)`
- 公共类型：`shared/src/types/classReport.ts`（已存在）
- 公共常量：`shared/src/constants/classReport.ts`（已存在）

### 6.4 命令（从 .claude/project/config.yaml 读取，不要硬编码）

- 后端测试：`mvn test` / `mvn test -Dtest={class}`
- 后端构建：`mvn -DskipTests package`
- 后端检查：`mvn checkstyle:check`
- 后端启动：`bash bin/run-backend-dev.sh deploy/.env.dev`
- 前端测试：`pnpm --dir osg-frontend/packages/{end} test {file}`

---

## 7. 执行原则（来自 CLAUDE.md，全部必须遵守）

1. ⚠️ **不要停下来问用户** — 自动迭代直到全部 Story done 或遇到硬阻塞
2. ⚠️ **不要凭记忆** — 每次读 STATE.yaml 和 config.yaml
3. ⚠️ **不要假设** — 所有信息从文件读取
4. ⚠️ **不要硬编码** — 路径/命令从 config.yaml 读取
5. ⚠️ **不要跳过验证** — Ticket 完成前必须跑验证命令并记录证据
6. ⚠️ **不要伪造证据** — verification_evidence 必须来自实际命令执行结果
7. ⚠️ **不要违反 ticket.allowed_paths** — 非允许路径不能改
8. ⚠️ **不要破坏 §4A 公共抽取语义** — S-055 是行为不变重构，不引入新业务字段；新业务字段在 S-056 加
9. ⚠️ **不要走 /fix 轻流程** — 这是 RPIV 重流程任务，不能混用

---

## 8. STATE.yaml 推进协议（每完成一个动作必须做）

### 完成一个 Ticket 后

```yaml
# 改 ticket.yaml
status: done
completed_at: '2026-05-09T??:??:??+08:00'
verification_evidence:
  command: ...
  exit_code: 0
  ...

# 改 STATE.yaml
current_ticket: null  # 或下一个
completed_tickets:
  - ...
  - T-XXX  # 加进来
stats:
  completed_tickets: N+1
changelog:
  - date: '2026-05-09'
    action: ticket_done
    details: T-XXX 完成（实际命令 / 覆盖率）
```

### 一个 Story 全部 Ticket 完成后

```yaml
workflow:
  current_step: all_tickets_done
  next_step: verify
```

→ 触发 `/verify S-XXX`

### /verify 通过后

```yaml
workflow:
  current_step: story_verified
  next_step: approve_story
```

→ 触发 `/approve S-XXX`

### /approve 后

```yaml
current_story: S-下一个
completed_stories:
  - ...
  - S-XXX  # 加进来
stats:
  completed_stories: N+1
workflow:
  current_step: stories_approved  # 或 implementing
  next_step: split_ticket  # 或 next
```

每次推进都加 changelog 一行（date / action / details）。

---

## 9. TBD 5 项（不要假装写文案）

方案文档 §6 列出 5 项 TBD，由用户后续提供，**不要自己编**：

1. 人际关系评分 5 项详细说明文案 — 前端先 `'TBD'` 占位（已含 T-517）
2. 进度评估 5 档中文确认 — 暂用方案默认（远低于预期 / 低于预期 / 符合预期 / 高于预期 / 远高于预期）
3. 截图上传后端接口 — 实施前 grep 现有附件上传通道，复用
4. 简历上传后端接口 — 同上，复用截图上传接口
5. `osg_admin_dict_registry` 表结构 — 实施前 `DESC osg_admin_dict_registry` 校验列名

---

## 10. 风险提示

- S-055 是**最高风险节点**（重构 ~1.2k 行 shared 代码 + 三端薄壳化）
- 大批量改动分多个 PR commit，避免一次性回归过大
- 如某个 ticket 卡住超过 1 小时，记录到 STATE.blockers 字段，移到下一个，不要硬磕
- 5 端弹窗规范是强约束，特别注意`.osg-modal-form` 公共类与 `MultiSelect` 公共组件
- 字段级权限必须双层防护，server-side 校验不能漏

---

## 11. 完成判定

全部 5 个 Story 状态 done + 测试覆盖率全部达标 + 三端 e2e 通过 → 任务完成。

最后输出：
- STATE.completed_stories 实际列表
- 总耗时
- 各 Story 实际工时 vs 估算
- 5 项 TBD 哪些已经收口、哪些仍待用户补

---

## 12. 已交付产物（前置 AI 已完成）

- ✅ 方案文档 7 轮校验通过：`docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md`
- ✅ 5 个 Story YAML：`osg-spec-docs/tasks/stories/S-053.yaml` ~ `S-057.yaml`
- ✅ 138 个 Ticket YAML：`osg-spec-docs/tasks/tickets/T-250.yaml` ~ `T-619.yaml`
- ✅ S-053 全部 7 个 ticket 实施完成（DB 迁移 + 字典 + 后端常量 + 前端常量/类型）
- ✅ 已落地代码文件：
  - `deploy/mysql-init/27_osg_class_record_class_report_extension.sql`
  - `deploy/mysql-init/28_osg_base_course_topic_dict_type.sql`
  - `deploy/mysql-init/29_osg_base_course_topic_dict_data.sql`
  - `ruoyi-system/src/main/java/com/ruoyi/system/constant/OsgClassReportConstants.java`
  - `osg-frontend/packages/shared/src/constants/classReport.ts`
  - `osg-frontend/packages/shared/src/constants/index.ts`
  - `osg-frontend/packages/shared/src/types/classReport.ts`

---

## 13. 第一步立刻做什么

1. 读完第 2 节列出的 8 个文件
2. 跑 `/verify S-053` 启动 Story 级验证
3. 通过则 `/approve S-053`
4. 启 2 个并行 dev agent 干 S-054 + S-055
5. 进入主循环（每个 ticket 按第 5 节 SOP 跑）

去吧。**最重要的事**：别把 §4A 公共抽取语义跑偏成"三端各改各的"，那是这次改造最大的价值点。三端 ReportModal.vue ≤ 50 行薄壳化是硬指标。
