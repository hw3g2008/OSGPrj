# Fix 计划：求职状态 + 11 个零散 bug

- **日期**：2026-05-10
- **范围**：用户当日提出的 11 条 bug，全部按 `/fix` 轻流程拆解，不走 RPIV
- **拆分原则**：单 fix ≤ 30 分钟、单一职责、单文件或紧密耦合的几个文件、可独立验收

---

## 0. 前置共识与待确认事项

### 0.1 已落地事实（昨天 commit `e7fffec6` T1-T7）

- 求职状态字典已治理为 5 项：`applied / interviewing / offer / rejected / withdraw`（中文「主动放弃」）
- `osg_coaching` 表已加 `interview_stage / interview_time / city / company_interviewer / requested_mentor_count / request_note`
- 学生端「我的求职」`applications/index.vue` 操作列已是状态下拉（5 项）
- 学生端「岗位列表」`positions/index.vue` 操作列仍是「投递/已投递」toggle 按钮（旧）

### 0.2 已知数据脏点

`PositionServiceImpl.deleteMainApplicationIfPresent` (L529) 写入 `withdrawn`（多一个 n），字典 value 是 `withdraw`。所有"取消投递"的存量数据在 DB 里都是孤值，前端按字典渲染会找不到 label。

### 0.3 ⚠ 待产品确认（HOLD 项，先不做）

| 编号 | 待确认问题 | 倾向方案 | 影响范围 |
|---|---|---|---|
| **HOLD-A** | 「我的求职」页 `applications/index.vue` 是否同步加第 6 状态 `cancelled`？两个页面的状态集是否一致？ | 倾向是 — 用户原话「只要更新了求职状态，那么这条岗位信息就会同步到我的求职列表」 | FIX-15 是否启动 |
| **HOLD-B** | "取消投递"后能否在状态下拉里直接切回 `applied`/其他？还是必须重新走"标记投递"流程？ | FIX-12 实时聚合方案已自动覆盖（切回则 +1） | 已被 FIX-12 解决 |
| **HOLD-C** | "取消投递"的记录是否仍出现在「我的求职」列表？ | 倾向保留（与 HOLD-A 一致） | 学生端列表过滤逻辑 |
| **HOLD-D** | "主动放弃"和"取消投递"的精确业务边界（什么场景算放弃 / 什么场景算取消） | 现倾向：取消=撤销投递动作；放弃=投后选择不继续 | 仅文档语义，不影响代码 |
| **HOLD-E** | 学生端「岗位列表」(positions) 操作列改造后保留几个按钮？ | 用户原话只说"保留收藏 + 新加求职状态"，未提及「申请辅导」 | FIX-13 操作列设计（2 按钮 vs 3 按钮） |
| **HOLD-F** | 「待审核」tag UI 是否真有审批流，还是孤立 UI？ | grep 显示生产代码无 `osg_student_profile_change` 引用，只在 .claude/worktrees agent 沙箱有 → 大概率是孤立 UI | FIX-07 改造范围 |

→ 这些项确认前不动，方案保留弹性。

---

## 1. Tier A — 文案 / 复测类（每个 ≤15 分钟）

### FIX-01 lead-mentor 登录页文案改纯邮箱 — ✅ 已完成

- **已落地**（`packages/lead-mentor/src/views/login/index.vue`）：
  - L29 subtitle: `使用邮箱登录（主导师/班主任）`
  - L38 label: `邮箱`
  - L40 input type: `email`
  - L43 placeholder: `请输入邮箱`
  - L44 autocomplete: `email`
  - L144 校验: `请输入邮箱和密码`
  - L171 错误: `邮箱或密码错误`

### FIX-02 assistant 登录页文案改纯邮箱 — ✅ 已完成

- **已落地**（`packages/assistant/src/views/login/index.vue`）：
  - L41 subtitle: `使用邮箱登录（助教）`
  - L51 label: `邮箱`
  - L55 input type: `email`
  - L56 placeholder: `请输入邮箱`
  - L57 autocomplete: `email`
  - L173 校验: `请输入邮箱`
  - L221 错误: `邮箱或密码错误`

### FIX-03 复测：导师列表新增用户排序

- **现状**：`OsgStaffMapper.xml` 已 `ORDER BY create_time DESC, staff_id DESC`（commit T1）
- **动作**：复测，新增一个导师确认排在第一行；如未生效则查前端是否传了 orderByColumn 覆盖
- **验收**：新增导师立即排首行

### FIX-04 复测：编辑导师弹窗账号/密码回显

- **现状校验**（已查代码）：
  - L232/241：`:disabled="isEditing"` 生效
  - L536-537：handleSubmit 时 `loginAccount: isEditing ? undefined : ...`、`initialPassword` 同样，**编辑模式不会送这两字段**
  - L413-414：编辑模式 `loginAccount = props.staff?.email || ''`、`initialPassword = '********'`
- **真问题**：用户报"账号和密码为空" → 大概率是 `props.staff?.email` 后端返回为空，导致 L413 fallback 到空串
- **动作**：
  1. 复测：编辑导师时打开网络面板看 `/staff/{id}` 接口返回的 email 字段
  2. 若空，查后端 `OsgStaffServiceImpl` 详情接口返回 DTO 是否漏了 email
  3. 若返回正常，看前端 props 传递路径
- **验收**：编辑模式下登录账号显示真实 email，初始密码显示 ********，两字段 disabled，提交不带这两字段

### FIX-05 合同 PDF 上传：本地 OK / 云端 fail 排查

- **关键信息**：用户反馈**本地好使、云端不好使** → 代码本身无问题，必然是部署环境差异
- **常见根因**（按概率排序）：
  1. 云端 nginx `client_max_body_size` 默认 1M，PDF 超限被 413 截掉
  2. 云端 Spring Boot `spring.servlet.multipart.max-file-size` / `max-request-size` 配置不一致
  3. 反代层 `proxy_request_buffering` / `proxy_max_temp_file_size` 限制
  4. 云端文件落盘目录不存在或无写权限（看 OsgContractController 落地路径）
  5. 云端 endpoint 路径与本地不同（path prefix / context-path）
  6. CDN/WAF 拦截 multipart/form-data
- **动作**：
  1. 在云端复现，看浏览器 Network 面板看 status code（413? 500? 502?）
  2. 看后端容器日志 `/admin/contract/upload` 是否被打到
  3. 没打到 → nginx 层；打到了 → Spring 配置 / 文件系统
- **关键文件**：
  - `OsgContractController.upload` 落盘路径
  - 云端 nginx 配置 / k8s ingress
  - `application-prod.yml` multipart 配置
- **验收**：云端能上传 5MB+ PDF
- **优先级**：中（视部署节奏，云端排查需要登服务器）

### FIX-06 复测：合同金额上限

- **现状**：T6 已 clamp 到 1,000,000，DB 列 `DECIMAL(10,2)` 容 9999w
- **动作**：复测，确认输入 9999999 时 clamp 到 1000000 并给提示，提交不报错
- **验收**：超大额输入自动截断且 toast 提示

---

## 2. Tier B — 学生端独立 bug（每个 30 分钟内）

### FIX-07 修改求职意向：学生端无感审核 — ✅ 已完成（方案 2D）

- **HOLD-F 答复（含义 2）**：保留 admin 审核流程，但学生端体验无感
- **方案 2D**：后端在 GET /profile 时把 pending 中的新值覆盖到 profile，让学生立即看到自己改的值；admin 端审批流程完全不动
- **后端改动**：`StudentProfileServiceImpl.java`
  - `selectProfileView` 调用新增 `overlayPendingChanges` 助手
  - `overlayPendingChanges`：遍历 pendingChanges，把 fieldKey 对应的 newValue 覆盖到 profile
  - `updateProfile` 不动（仍写 osg_student_change_request status=pending）
  - admin 端 `approveChangeRequest` / `rejectChangeRequest` API 不动
- **前端改动**：`student/views/profile/index.vue`
  - 删顶部 pending-banner alert
  - 删 9 处「待审核」橙 tag (`pendingFieldKeys.has(...)`)
  - 删整个「待审核的信息变更」modal
  - 删 modal 内"以下信息修改需后台审核"、"以下信息修改后直接生效"section title 和审核说明
  - 删 pendingOpen / pendingBannerTitle / pendingBannerText / pendingFieldKeys / displayPendingValue 等 ref/computed/function
  - 改保存 toast 文案：「保存成功！后台文员和班主任已收到您的信息变更通知。」 → 「保存成功」
- **流转效果**：
  - 学生改完 → 立即看到新值（无 tag、无 banner）
  - admin 在「学员详情弹窗」审批 → approve 落表 / reject 删 pending
  - reject 后学生下次刷新看到 DB 旧值（自己改的回退，**一期不通知，二期可加通知中心**）
- **验证**：vue-tsc typecheck 通过

### FIX-08 学生端岗位列表「全部地区」筛选对齐 — ✅ 已完成

- **决策**：「地区」字段统一显示 **region（大区）**，缺失才回退 city
- **已落地（生产代码 6 处反转 + 1 处测试同步）**：
  - `PositionServiceImpl.publicPositionLocation` L2226（学生端公共岗位）
  - `PositionServiceImpl.reviewPositionLocation` L2239（学生端待审核岗位）
  - `OsgUserJobOverviewServiceImpl` L492（班主任求职总览）
  - `OsgUserJobOverviewServiceImpl` L1417（助教求职总览）
  - `OsgUserJobOverviewServiceImpl` L1433（助教 calendar）
  - `OsgJobTrackingServiceImpl` L149（求职追踪）
  - `PositionServiceImplTest:805` 测试断言同步：`"San Francisco"` → `"na"`（reviewRow fixture 同时设了 region/city）
- **统一改法**：
  ```java
  // 改前：firstText(getCity, getRegion)  /  优先 city
  // 改后：firstText(getRegion, getCity)  /  优先 region
  ```
- **效果**：
  - 学生端岗位列表 + 班主任/导师/助教求职总览 location 字段统一为 region 大区粒度
  - filterOptions 与 record.location 同源，严格比较自动一致
  - 用户选「亚太」 → 筛出全部亚太岗位
- **⚠ 提交策略**：`PositionServiceImpl.java` 改动叠加到已有 319 行 stage-coaching 主线未提交。提交时 cherry-pick 区分 commit

### FIX-09 ~~取消投递不动收藏~~ → 推迟合并到 FIX-13

- **代码层推断**（已查代码）：
  - 前端 `handleAppliedButton` (L1405-1417) 没调 unfavorite
  - 后端 `upsertApplyState` ON DUPLICATE 子句不动 favorited
  - 后端 `overlayMainApplicationState` (L1186-1213) 在 application 匹配时强制 set favorited=true
  - **代码层无法解释 favorited 丢失**，必在某条隐蔽路径或前端列表合并逻辑
- **决定**：本地复现成本高，且 FIX-13 落地后整个 positions 操作列重写、这段代码被替换 → **不单独修，合并到 FIX-13 一起处理**
- **FIX-13 实施时**：操作列改成 6 状态下拉后，要保证状态切换不影响 favorited 字段

---

## 3. Tier C — 求职状态 6 项核心改造（确定部分）

### FIX-10 字典加第 6 项 `cancelled`「取消投递」 — ✅ 已完成

- **已落地**：`PositionServiceImpl.PROGRESS_STAGE_SEEDS` 加第 6 项
  ```java
  new DictSeed(DICT_TYPE_POSITION_PROGRESS_STAGE, 6L, "取消投递", "cancelled", "default", null, "求职状态")
  ```
- 启动时 dict seed 自动 upsert，字典立即 6 项齐全

### FIX-11 后端取消投递逻辑改写 `cancelled` — ✅ 已完成

- **已落地**：
  - `deleteMainApplicationIfPresent` → 重命名 `markCancelledApplicationIfPresent`
  - `setCurrentStage("withdrawn")` → `setCurrentStage("cancelled")`
  - remark `"学生取消投递标记"` → `"学生取消投递"`
  - 调用方注释从「删除 main_application 中对应记录」更新为「将 main_application 标记为 cancelled」
- **migration**：`sql/migrations/2026-05-10-osg-job-application-cancelled-stage.sql`
  ```sql
  UPDATE osg_job_application SET current_stage = 'cancelled' WHERE current_stage = 'withdrawn';
  ```
- **mvn 编译通过 ✅**

### FIX-12 后端 `student_count` 统计排除 cancelled — ✅ 已完成

- **已落地**：`OsgPositionMapper.xml` L69-76 加 `where current_stage <> 'cancelled'`
- **当前状态**：cancelled 字典还没加（FIX-10 待做），DB 里也没 cancelled 值，**当前等同 noop**；FIX-10/11 落地后自动生效
- **副作用确认**：`current_stage` NOT NULL DEFAULT 'applied'，无 NULL 行需要兜底
- **应用范围**：`selectPositionStudentJoin` 被 `selectPositionByPositionId` (L81) 和 `selectPositionList` (L161) include 引用，admin 端两处统计同步生效
- **HOLD-B 自动满足**：cancelled → applied 切回时实时聚合 +1，无需额外回滚逻辑

### FIX-13 学生端岗位列表操作列改造 — ✅ 已完成

- **HOLD-E 答复**：保留「收藏 + 求职状态」，**删掉申请辅导**（申请辅导功能在「我的求职」页操作）
- **已落地**：`positions/index.vue` 三个视图模式的操作列全改：
  - 收藏视图（`fav-action-cell` L395-423）
  - 卡片视图（drilldown actions L202-235）
  - 列表视图（listColumns actions L306-353）
- **改造内容**：
  - 删：投递 toggle 按钮（`handleAppliedButton`）
  - 删：申请辅导按钮（`openCoachingModal`）
  - 加：求职状态下拉（`<a-select :options="filterOptions.progressStages">`）
  - 保留：收藏按钮
- **新函数**：`handleActionStageChange` — 处理状态切换
  - 选 `cancelled / withdrawn`（取消投递）→ 调 `updateStudentPositionApply({applied: false})`
  - 已投递 + 选其他状态 → 调 `updateProgressInline` inline 更新
  - 未投递 + 选非取消状态 → 打开投递信息弹窗（先填投递日期再切其他状态）
- **dead code 清理**：删 `handleAppliedButton` / `openCoachingModal`，删 `CheckOutlined` 未用 import
- **验证**：vue-tsc typecheck 通过；vitest 6 个失败均为 HEAD 预存（与本 fix 无关）

### FIX-14 admin 岗位列表「学员」列改名「投递学员」 — ✅ 已完成（4 处）

- **已落地**：
  - `columns.ts:16` `'学员'` → `'投递学员'`
  - `index.vue:132` `'{{ industry.studentCount }} 学员'` → `投递学员`
  - `index.vue:374` 表头 `'学员'` → `'投递学员'`（width 60→80）
  - `index.vue:392` 表头 `'学员'` → `'投递学员'`（width 60→80）
- **待 HOLD-D 决定**：
  - `index.vue:477` 卡片标签 `'学员申请'` 是否改成 `'投递学员'`
- **关联 FIX-12**：列名改后还需 FIX-12 把 cancelled 排除出统计才能让"投递学员"语义准确

---

## 4. Tier D — 等 HOLD 解锁后再做（占位）

### FIX-15（待 HOLD-A 确认）「我的求职」页同步加第 6 状态

- **触发条件**：HOLD-A = 是
- **改造**：`applications/index.vue` L676 colorMap 加 `cancelled`、L751 order 加 `cancelled`
- **关联**：与 FIX-13 状态集一致

### ~~FIX-16~~ 已被 FIX-12 实时聚合方案覆盖，删除

### FIX-17 「我的求职」操作列状态只读化 — ✅ 已完成

- **HOLD-A 答复**：「我的求职」只**显示**状态（read-only tag），**操作只在「岗位列表」做**
- **改造**：`student/views/applications/index.vue`
  - 操作列从 `<a-select stage 下拉>` 改为 `<a-tag :color="record.stageColor">`
  - 删除 `bucket === 'completed'` 的「已结束」按钮（统一用 tag 表达终态）
  - 删 dead code：`stageDropdownChanged` / `openProgressModal` 函数
- **效果**：
  - 学生在我的求职页只能看状态、不能改
  - 改求职状态必须回岗位列表（FIX-13 操作列下拉）
  - 现状 5 状态字典保持不动
- **验证**：vue-tsc typecheck 通过

### FIX-15 「我的求职」列表过滤 cancelled — ✅ 已完成

- **HOLD-C 答复**：取消投递的记录从「我的求职」列表移出
- **已落地**：`OsgJobApplicationMapper.xml:158` SQL 过滤
  ```xml
  <!-- 取消投递（cancelled）记录从「我的求职」列表移出；'withdrawn' 是 FIX-10 migration 前的历史脏数据，向后兼容一起排除 -->
  and app.current_stage not in ('cancelled', 'withdrawn')
  ```
- **效果**：cancelled 状态记录立即从我的求职列表消失；其他 5 状态保留

---

## 5. 推荐执行顺序

按依赖与风险递增：

```
第 1 批（独立、零风险，可并行）— ✅ 已完成：
  FIX-01  lead-mentor 文案     ✅ 已落地
  FIX-02  assistant 文案       ✅ 已落地
  FIX-03  导师排序复测         ✅ 代码 OK，需云端复测
  FIX-04  导师编辑字段        ✅ 代码 OK，需查接口返回
  FIX-05  合同 PDF 上传        ⏸ 云端排查
  FIX-06  合同金额复测         ✅ 代码 OK，需云端复测

第 2 批（学生端独立 bug，可立即推）：
  FIX-08  地区筛选脏数据 migration   ✓ 无冲突
  FIX-09  收藏-投递耦合（后端 SQL）  ✓ 无冲突
  FIX-10  字典加 cancelled           ✓ 无冲突

第 3 批（需先 commit 主线改动，再做）：
  ⚠ 前置：把当前未提交的 stage-coaching-request 改动收口为独立 commit
  FIX-11  后端写 cancelled
  FIX-12  统计 SQL 排除 cancelled
  FIX-14  admin 列名（4 处确定 + 1 处待 HOLD）

⏸ 等产品确认：
  FIX-07  求职意向待审核 UI（HOLD-F）
  FIX-13  positions 操作列改造（HOLD-E）
  FIX-15  我的求职页扩 6 状态（HOLD-A/C）
```

---

## 6. 待回答的产品问题（可直接抄给产品经理）

1. **HOLD-A**：「我的求职」页和「岗位列表」页的求职状态集**是否完全一致**（都是 6 项）？
2. **HOLD-C**：学生「取消投递」后，这条岗位**仍在我的求职列表里展示**吗？
3. **HOLD-D**：「主动放弃」与「取消投递」的**精确业务边界**：什么场景算放弃 / 什么场景算取消？
4. **HOLD-E**：学生端「岗位列表」(positions) 操作列改造后保留几个按钮？需要保留「申请辅导」吗？
5. **HOLD-F**：求职意向「待审核」流程是否真存在？还是孤立 UI 残留？（生产代码 grep 无 change 表引用）

> HOLD-B 已被 FIX-12 实时聚合方案自动覆盖，无需 PM 决策

得到答复后填回本文件 §0.3 表格，并解锁对应 FIX。
