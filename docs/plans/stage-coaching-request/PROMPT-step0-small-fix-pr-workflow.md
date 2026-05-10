# Prompt：Step 0 小 fix / 小 PR 高质量推进

请复制以下内容给 Claude Code 执行。

---

```md
你现在接手 OSGPrj 项目。请推进「阶段级辅导申请」主线的 Step 0，但不要走完整 Story/Ticket 拆分流程。

本次目标不是降低质量，而是把 Step 0 拆成多个小 fix / 小 PR，逐个完成、逐个验证、逐个标记。

项目根目录：

```text
/Users/hw/workspace/OSGPrj
```

## 0. 工作方式

采用「小 fix / 小 PR」方式推进：

```text
短审计
→ 拆 4~6 个小 fix 任务
→ 每个 fix 独立执行 / 独立验证 / 独立 commit
→ 每完成一个 fix 就更新状态标记
→ 最后做 Step 0 总回归
```

明确要求：

- 不走大 RPIV Story/Ticket 重拆；
- 不新增 Ticket YAML；
- 不为了快而跳过根因分析；
- 不为了快而跳过测试；
- 不把多个高风险变更揉成一个大 PR；
- 每个小 fix 都必须能单独 review、单独 rollback；
- 每个小 fix 完成后都要在计划文档里做状态标记。

优先使用 `/fix` workflow 执行每个小任务。

---

## 1. 必读文档

先阅读：

1. `docs/plans/stage-coaching-request/00-overview.md`
2. `docs/plans/stage-coaching-request/06-requirement-index-by-end.md`
3. `docs/plans/stage-coaching-request/03-class-report-reference-revision.md`
4. `docs/plans/stage-coaching-request/02-job-overview-coaching-anchor-revision.md`
5. `docs/plans/stage-coaching-request/01-student-applications.md`
6. `docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md`

只提取 Step 0 相关信息，不要扩散到模拟应聘、学生资料、排期问题。

---

## 2. 产品口径

产品经理已确认：

1. `application` 是学生已求职/已投递的岗位父记录。
2. `coaching` 是学生针对某个岗位、某个面试阶段发起的一次辅导申请。
3. 同一个 `application` 下允许多条 `coaching`。
4. 不同 `coaching` 可以分配不同导师。
5. 岗位辅导的导师、课消详情、最近评分、已上报课消数、查看详情，都应该锚定 `coaching_id`。
6. 新的岗位辅导课消口径是：

```text
course_type = job_coaching
reference_type = job_coaching
reference_id = coaching_id
```

不是：

```text
reference_type = application
reference_id = application_id
```

---

## 3. 先做短审计，不要直接改

请先只读审计，并输出简短结论。

重点确认：

- `osg_coaching.application_id` 是否有唯一约束；
- mapper 是否按 `application_id` upsert 单条 coaching；
- `OsgCoaching` 是否缺阶段级字段；
- `job_coaching` 的 class record reference 是否仍写成 `application`；
- reference candidates 当前返回的是 `application_id` 还是 `coaching_id`；
- validator 是否写死 `job_coaching -> application`；
- 哪些 S-053~S-056 资产可以复用，不能推倒重做。

短审计输出格式：

```text
Root Cause:
- ...

Reusable Assets:
- ...

Required Small Fixes:
- Fix 1 ...
- Fix 2 ...
- Fix 3 ...
```

短审计结束后，再开始第一个小 fix。

---

## 4. Step 0 小 fix 建议拆分

请按下面顺序推进。实际执行时可根据代码现状微调，但每个 fix 必须保持小范围、可验证、可回滚。

### Fix 0：补状态跟踪区

目的：先在计划文档中建立可回顾的进度表。

修改：

- `docs/plans/stage-coaching-request/06-requirement-index-by-end.md`

增加或更新 Step 0 状态表：

```text
Step0-F0：状态跟踪区
Step0-F1：DB/Mapper 支持多 coaching
Step0-F2：OsgCoaching 阶段级字段
Step0-F3：class_record reference 改为 coaching_id
Step0-F4：reference candidates 返回 coaching
Step0-F5：validator 校验 coaching_id
Step0-F6：总回归
```

验收：

- 文档中能清楚看到每个小 fix 的状态；
- 后续每完成一个 fix 都能更新该表。

### Fix 1：DB / Mapper 支持 application 下多 coaching

范围：

- migration / SQL；
- `OsgCoachingMapper.xml`；
- 必要 mapper interface。

目标：

- 取消或替换 `application_id` 唯一约束；
- 保留 `application_id` 普通索引；
- 不再用 `application_id` 覆盖唯一 coaching；
- 支持按 `coaching_id` 查询、更新、分配导师。

不要做：

- 不要改学生端 UI；
- 不要改求职总览页面；
- 不要顺手重构 unrelated mapper。

验收：

- grep 不再出现新的“按 application_id 唯一 upsert coaching”路径；
- mapper 单测或最小编译通过；
- 更新 Step 0 状态表。

### Fix 2：OsgCoaching 阶段级字段补齐

范围：

- `OsgCoaching.java`；
- 必要 DTO / mapper resultMap；
- 必要 SQL 字段。

目标：

一次 coaching 应能表达：

- 面试阶段；
- 面试时间；
- 城市；
- 公司面试官；
- 申请导师数量；
- 申请备注。

原则：

- 如果已有等价字段，复用现有字段，不重复造字段；
- `OsgJobApplication` 仍保留岗位父记录字段；
- 不破坏旧 application 展示。

验收：

- domain / mapper 字段一致；
- 编译通过；
- 更新 Step 0 状态表。

### Fix 3：class_record 岗位辅导 reference 新写入口

范围：

- class report 常量；
- `OsgClassRecordServiceImpl`；
- shared API 类型；
- shared 弹窗中 reference type 相关逻辑。

目标：

新提交岗位辅导课消时使用：

```text
course_type = job_coaching
reference_type = job_coaching
reference_id = coaching_id
```

不是：

```text
reference_type = application
reference_id = application_id
```

兼容策略：

- 旧数据 `reference_type=application` 可只读展示；
- 新提交不再允许走旧口径；
- 不自动迁移无法判断归属的旧课消。

验收：

- grep 确认新写入口不再把 job_coaching 绑定到 application；
- class record 相关测试通过；
- 更新 Step 0 状态表。

### Fix 4：reference candidates 返回 coaching 候选

范围：

- `OsgClassRecordServiceImpl` 或对应 candidates service；
- mapper 查询；
- shared `useReferenceFinder`；
- shared API 类型。

目标：

- 岗位辅导候选项返回 `coaching_id`；
- label 仍展示公司、岗位、阶段、面试时间；
- 权限范围仍按当前角色限制；
- 不影响 mock practice / base course 等其它 reference candidates。

验收：

- 候选项 ID 是 coaching id；
- 前端类型不报错；
- 相关测试或类型检查通过；
- 更新 Step 0 状态表。

### Fix 5：validator 校验 coaching_id

范围：

- `OsgClassReportValidator.java`；
- validator tests。

目标：

- `job_coaching` 必须匹配 `reference_type=job_coaching`；
- `reference_id` 必须是有效 `coaching_id`；
- 校验 `coaching.student_id`；
- 校验当前上报人对该 coaching 有权限；
- 不影响其它 course type。

验收：

- 合法 coaching reference 通过；
- 错误 reference type 被拒绝；
- 不存在的 coaching_id 被拒绝；
- 无权限 coaching_id 被拒绝；
- 原有非 job_coaching 分支测试不退化；
- 更新 Step 0 状态表。

### Fix 6：Step 0 总回归与完成标记

范围：

- 测试；
- grep；
- 计划文档状态标记。

必须执行至少以下验证：

```text
后端相关单测或模块编译
shared 前端测试或类型检查
grep 检查 job_coaching -> application 旧写入口
grep 检查 reference_type=application 是否只剩兼容/旧数据读取场景
```

完成后更新：

- `docs/plans/stage-coaching-request/06-requirement-index-by-end.md`

标记 Step 0：

```text
✅ Step 0 全局底座完成
```

如果有未完成项，必须标为：

```text
⚠️ 部分完成：剩余问题是 ...
```

---

## 5. 每个小 fix 的固定执行格式

每个 fix 都按以下格式执行：

```text
1. Root Cause / Current State
2. Fix Plan
3. Files to Change
4. Implement Minimal Change
5. Run Verification
6. Update Status Marker
7. Commit as one small PR-sized commit
```

commit 信息建议：

```text
fix(class-report): anchor job coaching records to coaching id
fix(coaching): allow multiple coaching requests per application
fix(class-report): validate job coaching references by coaching id
```

---

## 6. 禁止事项

本轮禁止：

- 不要新增 Story YAML；
- 不要新增 Ticket YAML；
- 不要重写 S-053~S-056；
- 不要直接进入学生端完整 UI；
- 不要做模拟应聘管理；
- 不要做学生资料字典化；
- 不要做课程排期强制弹窗；
- 不要把多个端闭环混在 Step 0；
- 不要做无关重构。

---

## 7. 最终输出

完成 Step 0 后，请输出：

1. 每个小 fix 的状态；
2. 每个 commit hash；
3. 修改文件清单；
4. DB / mapper 变化；
5. reference 口径变化；
6. validator 变化；
7. 兼容旧数据策略；
8. 实际验证命令和结果；
9. 状态标记更新位置；
10. 下一步建议：进入学生端闭环。

请记住：

```text
不走慢的 Ticket 流程，但不能降低质量。
用小 fix / 小 PR 保证速度、质量和可回滚。
```
```
