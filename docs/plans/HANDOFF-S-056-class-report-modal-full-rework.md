# 接力提示词：S-056 三端弹窗按 §3 全量业务改造

> 目标：完成 31 个 ticket（T-500~T-530），把 S-055 抽取出来的 shared 弹窗按方案文档 §3 实装全量业务字段。
> 要求：跳过所有测试 ticket，**只做实施层**。

---

## ⚠️⚠️⚠️ 强制要求：必须多 Agent 并行 ⚠️⚠️⚠️

**禁止**用单一主对话顺序干 31 个 ticket（token 必爆 + 速度慢）。

**必须**按下面的方式启动多个 background agent 并行干活：

```
Phase 1（并行启 5 个 background agent）:
  Agent A: 旷课与基础课分支     (~6 ticket)  background=true
  Agent B: 课程类型与反馈区     (~7 ticket)  background=true
  Agent C: 人际关系+简历+评分   (~5 ticket)  background=true
  Agent D: 提交链路             (~2 ticket)  background=true
  Agent E: 后端 validator+service (~7 ticket) background=true

Phase 2（等所有 background agent 完成 notification 后）:
  - 主对话只负责汇总 / 推进 STATE.yaml / 处理冲突
  - 不要在主对话里写代码
```

**铁律**：
1. 每个 dev agent 必须用 `subagent_type=developer` + `run_in_background=true`
2. 5 个 agent 必须在**同一个 message 内**用多个 Agent tool calls 并行启动（不要串行启）
3. 每个 agent 范围 ≤ 10 个 ticket（防单 agent token 爆）
4. 每个 agent 文件冲突域不能交叉（同一个 .vue 文件不要让两个 agent 改）
5. 主对话不要 Read 大文件 — 让 agent 在它自己的 context 里读
6. 主对话只在所有 agent 完成后做汇总，不参与实施

**反模式（绝对禁止）**：
- ❌ 主对话直接 Edit / Write 一堆 ticket 的代码
- ❌ 串行启 background agent（一个完了再启下一个）
- ❌ 单 agent 干 > 10 个 ticket
- ❌ 在 agent 还在跑时主对话先开始改其它文件

---

## 0. 你是谁

你是接手 S-056 实施的 AI（Sonnet 4.6）。S-055 公共抽取已完成，shared 弹窗已具备骨架。你的任务是基于这个 shared 弹窗，按方案文档 §3 加全量业务功能。

**不要碰**：mentor / lead-mentor / assistant 三端的薄壳（< 50 行），它们已经稳定。所有改动**全部在 shared 里**做，否则违背 §4A 公共抽取语义。

---

## 1. 项目根

```
/Users/hw/workspace/OSGPrj
```

---

## 2. 必读文件（约 30 分钟）

按这个顺序：

1. `.claude/CLAUDE.md` — 项目工作流总规则、5 端弹窗强约束、字段级权限双层防护、文件上传安全约束
2. `osg-spec-docs/tasks/STATE.yaml` — 当前状态（current_story=S-056）
3. `docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md` — **核心方案文档**，重点读：
   - §3 全部 9 条三端弹窗需求
   - §3.5 五种课程类型反馈区
   - §3.4 / §3.4.1 / §3.4.2 旷课分支与重复策略
   - §3.6 评分必填
   - §5.2 server-side 5 条防护
4. `osg-spec-docs/tasks/stories/S-056.yaml` — Story AC 清单
5. `.claude/templates/ticket.yaml` — Ticket 字段格式
6. `docs/modal-form-style-guide.md` — 5 端弹窗强约束
7. `osg-frontend/packages/shared/src/components/ClassReportFlowModal/index.vue` — S-055 抽取的主弹窗骨架（你要在这上面加业务）

---

## 3. 当前状态快照

| Story | 状态 |
|---|---|
| S-053 基础设施 | ✅ done（DB schema + 字典 + 常量） |
| S-054 求职总览三栏 | ✅ done（功能层） |
| S-055 公共抽取 | ✅ done（实施层） |
| **S-056 弹窗全量改造** | ⏸️ **你的任务** |
| S-057 spec/e2e | 后续 |

S-056 全部 31 个 ticket 待干（T-500~T-530），全部 status=pending。

---

## 4. S-055 已抽取的 shared 资产（你的工作基础）

```
osg-frontend/packages/shared/src/components/ClassReportFlowModal/
├── index.vue                       (主弹窗，5 step v-show 切换)
├── StepBasicInfo.vue               (学员/日期/时长)
├── StepCourseType.vue              (5 选 1 RadioGroup)
├── StepReference.vue               (关联申请下拉 + 基础课二级)
├── StepMemberStatus.vue            (normal/absent + absentRemark)
├── feedbacks/
│   ├── JobCoachingFeedback.vue     (5 项)
│   ├── MockInterviewFeedback.vue   (5 项 + 希望做但没做)
│   ├── RelationFeedback.vue        (5 项评分 + 推荐 + 截图槽位 + narrative)
│   ├── MidtermFeedback.vue         (score/questionAnalysis/progress)
│   └── BaseCourseFeedback.vue      (narrative + 简历更新双槽位)
└── widgets/
    ├── RatingInput.vue
    ├── ScreenshotUpload.vue        (multi, png/jpg/pdf, ≤10MB/≤10 张)
    ├── ResumeUpload.vue            (single, pdf/doc/docx, ≤10MB)
    └── BaseCourseTopicPicker.vue   (T01-T24 必修/选修分组 + B0-B7)

osg-frontend/packages/shared/src/composables/
├── useClassReport.ts               (form state / step / submit / reset)
├── useBaseCourseTopic.ts           (字典加载 + 分组)
├── useStudentScopeFinder.ts        (按 end 的学员下拉)
└── useReferenceFinder.ts           (按 referenceType 的候选)

osg-frontend/packages/shared/src/api/class-records.ts
└── submitClassReport / getReportableStudents / getReferenceCandidates / getClassReportDetail

osg-frontend/packages/shared/src/types/classReport.ts
└── ClassReportPayload + 5 个 Feedback payload union + StudentOption + ReferenceOption

osg-frontend/packages/shared/src/constants/classReport.ts
└── COURSE_TYPE_OPTIONS / MEMBER_STATUS / BASE_CATEGORY_OPTIONS / ABSENT_DEFAULT_HOURS / RELATION_RATING_ITEMS
```

```
ruoyi-system/.../service/impl/
├── OsgClassReportValidator.java    (5 条 server-side 防护，validateSubmit 主入口)
└── OsgClassRecordServiceImpl.java  (3 处 inject + listReportableStudents/listReferenceCandidates)

三端 controller endpoints：
- /mentor/class-records/reportable-students
- /mentor/class-records/reference-candidates
- (lead-mentor / assistant 同样两个)
```

**三端薄壳已稳定**（≤ 50 行各端），你**不能改三端薄壳**：
- `osg-frontend/packages/mentor/src/views/courses/components/ReportModal.vue` (17 行)
- `osg-frontend/packages/lead-mentor/src/views/teaching/class-records/LeadMentorClassReportFlowModal.vue` (31 行)
- `osg-frontend/packages/assistant/src/views/class-records/AssistantClassReportFlowModal.vue` (28 行)

---

## 5. S-056 全部 31 个 Ticket（T-500~T-530）

### 5.1 Ticket 列表（按依赖逻辑分组）

**A. 旷课分支精化（4 个）**：
- T-500: StepMemberStatus 旷课分支（时长默认 0.5h + 仅显示 absentRemark）
- T-501: ClassReportFlowModal 旷课分支跳过反馈区与评分（路由到 absentRemark-only 提交体）
- T-516: BaseCourseFeedback 实现"新简历/咨询案例/其它"通用反馈分支
- T-517: RelationFeedback 5 项评分详细说明 inline（绑 RELATION_RATING_ITEMS.description，TBD 占位）

**B. 课程类型路由（3 个）**：
- T-502: StepCourseType 5 选 1 + 切换清空已填反馈
- T-503: StepReference 按 courseType 路由 4 类 reference + 模板渲染
- T-504: ②栏反推锁定升级（applicationId → courseType=job_coaching readonly）

**C. 5 类反馈区精化（5 个）**：
- T-505: JobCoachingFeedback §3.5.1 五项（含希望做但没做）
- T-506: MockInterviewFeedback §3.5.2 五项
- T-507: RelationFeedback §3.5.3 五项评分 + 推荐 + narrative
- T-508: RelationFeedback 截图上传整合（screenshot_urls 列）
- T-509: MidtermFeedback §3.5.4 score 0-100 + questionAnalysis + progress 5 档

**D. 基础课程精化（5 个）**：
- T-510: BaseCourseFeedback 二级类型 6 选 1
- T-511: BaseCourseTopicPicker 三级题目（必修 T01-T19 + 选修 T20-T24 + 行为 B0-B7）
- T-512: BaseCourseTopicPicker 必选规则前端校验（tech 必修 ≥1、behavior ≥1，旷课全免）
- T-513: BaseCourseFeedback 简历更新分支双槽位上传 + 落 JSON
- T-514: ClassReportFlowModal 评分 rate 输入与必填校验（正常上课全类型必填，旷课跳过）

**E. 端权限与提交链路（5 个）**：
- T-515: StepBasic 学员下拉端权限过滤 + 空态文案 + 提交按钮 disabled
- T-518: ClassReportFlowModal 提交链路串联（submit + loading + 错误展示）
- T-519: 三端 ReportModal 薄壳重新对接（**注：可能与 S-055 已做的薄壳重叠，谨慎处理，不要回退薄壳**）

**F. 后端 server-side 防护（5 个）**：
- T-520: OsgClassReportValidator 实现 §5.2 规则 1：reference_type/course_type 一致性
- T-521: OsgClassReportValidator 实现 §5.2 规则 2-3：学员归属 + reference 归属
- T-522: OsgClassReportValidator 实现 §5.2 规则 4-5：student 端 403 + 字段级权限
- T-523: OsgClassRecordServiceImpl.serializeFeedback 按 course_type 路由解析器（schemaVersion=1）
- T-524: 后端 OsgClassReportValidator 单元测试（**跳过**：测试 ticket）

**G. 后端 controller / endpoint 校验（4 个）**：
- T-525~T-528（细看 ticket YAML）

**H. 后端文档/契约**:
- T-529, T-530（细看 ticket YAML）

> ⚠️ 实际范围以每个 ticket YAML 的 acceptance_criteria 为准，上面是分组指南。

### 5.2 关键策略

**S-055 与 S-056 边界**：
- S-055 = "行为不变重构"，shared 弹窗已经能跑（占位/简化实现）
- S-056 = 在 shared 弹窗里加全量业务字段、校验、JSON 序列化、安全约束

**OsgClassReportValidator 当前已存在**（S-055 创建），但 5 条规则可能仅是骨架。S-056 要把每条规则的真实业务校验写实。

---

## 6. 关键技术约束（违反必返工）

### 6.1 §4A 公共抽取语义（最重要）
- ❌ **禁止**改 mentor / lead-mentor / assistant 三端薄壳（已 ≤ 50 行稳定）
- ❌ **禁止**在 mentor / lead-mentor / assistant 各自包内重新实现业务逻辑
- ✅ 所有业务改动放进 `shared/src/components/ClassReportFlowModal/**`
- ✅ 后端业务改动放进 `OsgClassReportValidator` / `OsgClassRecordServiceImpl`

### 6.2 5 端弹窗强约束（CLAUDE.md）
- 弹窗套 `.osg-modal-form` 公共类（高度 36px / 圆角 6px / line-height 34px / textarea ≥ 80px）
- 多选用 `@osg/shared/components` 的 `MultiSelect`，禁止 `<a-select mode="multiple">`
- 字典字段渲染 `dictValue → dictLabel`，禁止 `{{ tech }}` 这种 key
- 字段级权限**双层防护**：前端 `v-if` + 后端 `@PreAuthorize`
- 文件上传：前端 `accept` + `before-upload` + 后端 `Files.probeContentType()` + UUID 文件名

### 6.3 后端
- Java 21 + Spring Boot 3.x + MyBatis
- 阿里巴巴 Java 开发手册
- 三端 controller 仅鉴权 + 调 service，业务全在 service / validator

### 6.4 前端
- Vue 3 + ant-design-vue + pnpm workspace
- 弹窗内套 `.osg-modal-form` 公共类

---

## 7. 执行原则（必须遵守）

1. ⚠️ 不要停下来问用户 — 自动迭代直到全部 31 个 ticket done
2. ⚠️ 不要凭记忆 — 每次读 STATE.yaml 和 config.yaml
3. ⚠️ 不要假设 — 信息从文件读取
4. ⚠️ **不要跑测试**（用户授权跳过测试）：
   - 不执行 `pnpm test` / `vitest`
   - 不执行 `mvn test`
   - 不写 `verification_evidence` 字段
5. ⚠️ 不要违反 ticket.allowed_paths
6. ⚠️ **不要破坏 §4A 公共抽取**（不要回退到三端各改各的）
7. ⚠️ 不要走 /fix 轻流程，这是 RPIV 重流程

---

## 8. 单 Ticket 实施 SOP

```
1. 读 ticket YAML：osg-spec-docs/tasks/tickets/T-XXX.yaml
   - 关注 type / allowed_paths.modify / acceptance_criteria / dependencies
2. 严格按 allowed_paths.modify 改文件，不许碰其他文件
3. 完成后改 ticket YAML：
   - status: done
   - completed_at: '2026-05-09T??:??:??+08:00'
4. 不要写 verification_evidence（跳过测试）
5. 不要改 STATE.yaml（最后由主 agent 统一改）
6. 检查下一个 ticket 依赖是否解锁，继续干
```

---

## 9. 强制多 Agent 分工（首章已说，这里是详细配方）

**5 个 background agent 必须在同一 message 内并行启动**。下面是每个 agent 的 prompt 模板大纲：

### Agent A：旷课与基础课分支（6 ticket）
- **范围**：T-500, T-501, T-516, T-510, T-511, T-512
- **冲突文件域**：StepMemberStatus.vue / BaseCourseFeedback.vue / BaseCourseTopicPicker.vue
- **核心交付**：旷课时长 0.5h 默认 + 仅显示 absentRemark；基础课二三级题目联动；必修必选规则

### Agent B：课程类型与基础反馈区（7 ticket）
- **范围**：T-502, T-503, T-504, T-505, T-506, T-507, T-509
- **冲突文件域**：StepCourseType.vue / StepReference.vue / 4 个 feedback (除 BaseCourse)
- **核心交付**：5 选 1 + 切换清空；reference 路由；②栏反推锁定；JobCoaching/MockInterview/Relation/Midterm 反馈区

### Agent C：人际关系 + 简历 + 评分（5 ticket）
- **范围**：T-508, T-513, T-514, T-515, T-517
- **冲突文件域**：RelationFeedback.vue / BaseCourseFeedback.vue（resume 槽位）/ RatingInput.vue / StepBasicInfo.vue
- **核心交付**：截图整合 / 简历双槽位 / rate 必填 / 学员下拉空态 / 评分项详细说明

### Agent D：提交链路（2 ticket）
- **范围**：T-518, T-519
- **冲突文件域**：ClassReportFlowModal/index.vue
- **核心交付**：submit + loading + 错误展示 + 三端薄壳对接（注：不要回退薄壳）
- **依赖**：Agent A/B/C 全部完成（最后启动）

### Agent E：后端 validator + service 实化（7-9 ticket）
- **范围**：T-520, T-521, T-522, T-523 + T-525~T-528（后端 controller / endpoint）+ T-529, T-530（如非测试）
- **冲突文件域**：OsgClassReportValidator.java / OsgClassRecordServiceImpl.java / 三端 controller
- **核心交付**：5 条 server-side 防护实化、feedback JSON 序列化、controller endpoint 校验

### 启动顺序

**Phase 1（同 message 内并行启 4 个）**：A + B + C + E
**Phase 2（A/B/C 完成后启 1 个）**：D（提交链路依赖前面的字段就位）

```
正确启动方式（伪代码）：
  message_1: Agent(A) + Agent(B) + Agent(C) + Agent(E)   # 4 个并行
  wait notifications
  message_2: Agent(D)                                      # 提交链路
```

### 单 agent prompt 模板（必备字段）
每个 agent 的 prompt 必须含：
- 项目根 `/Users/hw/workspace/OSGPrj`
- 你的范围 ticket id 列表
- 必读文件（方案文档章节锚点 + 各 ticket YAML 路径）
- 强约束：禁止跑测试、不改 STATE.yaml、不改三端薄壳、严格 allowed_paths
- 完成后改 ticket YAML：status=done + completed_at
- 输出回执："Agent X 完成 N/M ticket + 实际改/建文件清单"

### Token 预算建议
- 每个 agent 起跑前给充足 prompt（500-1000 字），包含所有它需要的文件路径，避免它去 grep 浪费 token
- 不要让 agent 自由发挥，给具体文件 path 和锚定章节
- agent 内部禁止跑测试（节省 token + 用户授权）

### 反模式（违反必返工）
- ❌ 单 agent 干 > 10 ticket
- ❌ 串行启动（一个一个等）
- ❌ 主对话亲自写代码
- ❌ 让 agent 自己定范围（必须明确 ticket id 清单）
- ❌ 让 agent 跑测试浪费 token

---

## 10. 完成后的 STATE.yaml 推进

干完所有实施 ticket 后（测试 ticket 跳过保留 pending），手动更新 STATE.yaml：

```yaml
current_story: S-057  # 或下一个
completed_stories:
  - S-053
  - S-054
  - S-055
  - S-056  # 加进来
completed_tickets:
  - ... 已有
  # S-056 实施 ticket
  - T-500
  - T-501
  - ...（按实际 status=done 的列）
stats:
  completed_stories: 4
  completed_tickets: 70 + N（N=本轮干完的实施 ticket 数）
workflow:
  current_step: stories_approved
  next_step: next
  next_requires_approval: false

changelog:
  - date: '...'
    action: s056_implementation_done
    details: 'S-056 弹窗全量改造实施完成（X/31 ticket，跳过 N 个测试 ticket，用户授权）：...'
```

---

## 11. 风险提示

- T-519 三端薄壳重新对接 — 可能与 S-055 薄壳重叠，**仔细看薄壳现状**，不要把已经精简的薄壳改回 fat 弹窗
- T-504 ②栏反推锁定 — 这是从 S-054 求职总览跳过来的入口，前端用 `prefilledReferenceType + prefilledReferenceId` 锁定
- 截图上传 / 简历上传后端接口可能需要新建（方案 §6 TBD 项 3 / 4），实施前先 grep 现有附件上传通道
- 人际关系 5 项详细说明文案是 TBD 占位，**不要自己编中文**，保持 'TBD' 字符串

---

## 12. 完成判定

- 31 个 ticket 中所有非测试 ticket（约 23-25 个）status=done
- 跳过的测试 ticket（约 6-8 个）status=pending（不动）
- shared 弹窗内所有 §3 描述的字段、校验、JSON 序列化、上传安全都实装
- mentor / lead-mentor / assistant 三端薄壳保持 ≤ 50 行不变
- STATE.yaml 推进到 current_story=S-057, completed_stories=[..., S-056]

---

## 13. 第一步立刻做什么

1. 读必读文件（§2 8 个文件）
2. 读 5 个 S-056 ticket 抽样（T-500 / T-510 / T-518 / T-520 / T-525）确认粒度
3. 读 S-055 已落地的 shared 弹窗代码（`ClassReportFlowModal/index.vue` + 5 step + 5 feedback + 4 widget），理解骨架
4. 按 §9 拆 4-5 个并行 agent 启动
5. 进入主循环，每个 agent 完成 → 改 ticket YAML

去吧。**三端"完全一致"的价值**靠你不破坏 §4A 抽取。任何"我在 mentor 端单独加一个字段"的念头都是错的。
