# 接力提示词：测试与收尾（跨 S-054/S-055/S-056/S-057）

> 目标：把前面跳过的 39 个 ticket（34 test + 4 config + 1 frontend-ui）全部干完，并验证三端 e2e 主链路。
> 模式：**强制多 Agent 并行**，禁止单对话顺序干。

---

## ⚠️⚠️⚠️ 强制要求：必须多 Agent 并行 ⚠️⚠️⚠️

**禁止**用单一主对话顺序干 39 个 ticket。

**必须**按下面的方式启动多个 background agent 并行：

```
Phase T1（同 message 内并行启 5 个）:
  Agent F1: S-054 测试补齐         (4 ticket)   background=true
  Agent F2: S-055 前端测试          (~6 ticket)  background=true
  Agent F3: S-055 后端测试          (~6 ticket)  background=true
  Agent F4: S-056 故事级测试        (2 ticket)   background=true
  Agent F5: S-057 spec 迁移与回归   (~10 ticket) background=true

Phase T2（等 Phase T1 完成后启 2 个）:
  Agent F6: S-057 e2e 三端 + 覆盖率收口  (~6 ticket)  background=true
  Agent F7: 4 个 config 收尾文档          (4 ticket)   background=true

Phase T3（最后由主对话）:
  /verify S-054 → /approve S-054
  /verify S-055 → /approve S-055
  /verify S-056 → /approve S-056
  /verify S-057 → /approve S-057
  STATE → all_stories_done
```

**铁律**：
1. 每个 dev / qa agent 必须 `subagent_type=qa` 或 `developer` + `run_in_background=true`
2. Phase T1 必须**同 message 内**启动 5 个 agent 并行
3. 每个 agent 范围 ≤ 10 ticket
4. 文件冲突域不交叉（spec 文件不让两个 agent 改同一个）
5. 主对话只汇总 / 推进 STATE / 处理冲突，不写测试代码

**反模式（禁止）**：
- ❌ 主对话直接写一堆 spec 文件
- ❌ 串行启动 background agent
- ❌ 单 agent 干 > 10 ticket
- ❌ 让某个 agent 既写 backend test 又写 frontend test（冲突域不同）

---

## 0. 你是谁

你是接手测试与收尾的 AI（推荐 Sonnet 4.6）。S-053~S-056 业务实施层 100% 完成（99 个 ticket done）。你的任务是跑通测试 + e2e 回归 + 文档收尾，把整个模块推进到 all_stories_done。

**不要碰**：业务代码（已稳定）、shared 弹窗骨架（已 100% 实装）、三端薄壳（已 ≤ 50 行）。
**只做**：测试用例、覆盖率、e2e、文档收尾。

---

## 1. 项目根

```
/Users/hw/workspace/OSGPrj
```

---

## 2. 必读文件（约 30 分钟）

1. `.claude/CLAUDE.md` — 项目工作流、测试覆盖率门槛
2. `.claude/rules/testing.md` — 测试规范
3. `osg-spec-docs/tasks/STATE.yaml` — 当前状态（S-053~S-056 已 done）
4. `docs/plans/2026-05-09-lead-mentor-job-overview-and-class-report-plan.md` — 方案文档（重点 §7.4 / §7.4.1 / §8 验收）
5. `docs/plans/HANDOFF-S-056-class-report-modal-full-rework.md` — 上一手交付清单
6. `osg-spec-docs/tasks/stories/S-054.yaml` ~ `S-057.yaml` — Story AC
7. 抽样 ticket 看测试粒度：T-326.yaml / T-440.yaml / T-441.yaml / T-529.yaml / T-600.yaml

---

## 3. 当前状态快照

| Story | 实施 ticket | 测试 ticket | 当前状态 |
|---|---|---|---|
| S-053 基础设施 | 7/7 ✅ | — | done + verified |
| S-054 求职总览 | 26/26 ✅ | 4 pending | 实施完成，等测试 |
| S-055 公共抽取 | 37/37 ✅ | 12 test + 1 config pending | 实施完成，等测试 |
| S-056 弹窗改造 | 29/29 ✅ | 2 test pending | 实施完成，等测试 |
| S-057 spec/e2e | 0/20 | 全部 pending | **本次任务主战场** |

总计 39 个 pending（34 test + 4 config + 1 frontend-ui）。

---

## 4. 已落地资产（你测的对象）

### 前端 shared 抽取
```
osg-frontend/packages/shared/src/components/ClassReportFlowModal/
├── index.vue + 4 step + 5 feedback + 4 widget
osg-frontend/packages/shared/src/composables/use{ClassReport,BaseCourseTopic,StudentScopeFinder,ReferenceFinder}.ts
osg-frontend/packages/shared/src/api/class-records.ts (4 个新 API)
osg-frontend/packages/shared/src/types/classReport.ts (含 union)
```

### 三端薄壳（≤ 50 行）
- `osg-frontend/packages/mentor/src/views/courses/components/ReportModal.vue` (~17 行)
- `osg-frontend/packages/lead-mentor/src/views/teaching/class-records/LeadMentorClassReportFlowModal.vue` (~31 行)
- `osg-frontend/packages/assistant/src/views/class-records/AssistantClassReportFlowModal.vue` (~28 行)

### lead-mentor 求职总览页（S-054）
- `osg-frontend/packages/lead-mentor/src/views/career/job-overview/index.vue`
- 三栏 + 后端接口已重构

### 后端
```
ruoyi-system/.../service/impl/
├── OsgClassReportValidator.java     (5 条规则集中实现)
└── OsgClassRecordServiceImpl.java   (3 处 inject + 共用方法)
```

### DB
- `osg_class_record` 加 7 列
- `osg_base_course_topic` 字典 32 条

---

## 5. 任务分解（5+2 个 agent）

### Agent F1：S-054 测试补齐（4 ticket）
- **Ticket**: T-326, T-327, T-328, T-329
- **范围**：lead-mentor `__tests__/` job-overview spec 更新 + 后端集成测试
- **冲突域**：`osg-frontend/packages/lead-mentor/src/__tests__/` + `ruoyi-admin/src/test/.../osg/`
- **覆盖率门槛**：frontend ≥ 80% 行 / backend 100% 分支 ≥ 90% 行

### Agent F2：S-055 前端测试（~6 ticket）
- **Ticket**：T-428, T-429, T-442, T-443, T-444, T-445（细看 YAML 哪些是前端 test）
- **范围**：shared 弹窗组件 spec + 三端薄壳 spec + 前端构建/类型检查收口
- **冲突域**：`osg-frontend/packages/shared/src/__tests__/ClassReportFlowModal/` + 三端 `__tests__/`
- **关键**：行为不变重构验证（三端原行为 e2e 保持）

### Agent F3：S-055 后端测试（~6 ticket）
- **Ticket**：T-439, T-440, T-441, T-446（细看 YAML 哪些是后端 test）
- **范围**：OsgClassReportValidator + OsgClassRecordServiceImpl 共用服务 + 三端 controller endpoint 测试
- **冲突域**：`ruoyi-system/src/test/.../service/impl/` + `ruoyi-admin/src/test/.../controller/osg/`

### Agent F4：S-056 故事级测试（2 ticket）
- **Ticket**：T-529, T-530
- **范围**：S-056 前端故事级回归（5 课程类型 + 旷课 + ②栏反推） + 后端 validator/service e2e
- **冲突域**：`__tests__/story-s056-regression.spec.ts` + `OsgClassReportValidatorStoryRegressionTest`

### Agent F5：S-057 spec 迁移与回归（~10 ticket）
- **Ticket**：T-600~T-609（细看 YAML 选属于"spec 迁移 + 单测覆盖"的）
- **范围**：方案 §7.4.1 — 三端原弹窗 spec 迁到 `shared/__tests__/ClassReportFlowModal/`，三端各保留薄壳级 spec
- **冲突域**：所有四个 packages 的 `__tests__/`（注意按文件路径分配）
- **依赖**：可与 F2/F4 并行，但需谨慎避免 spec 路径冲突

### Agent F6：S-057 e2e 三端 + 覆盖率（~6 ticket）—— Phase T2
- **Ticket**：T-610~T-615（细看 YAML 选属于"e2e + 覆盖率收口"的）
- **范围**：mentor 上报 → lead-mentor 求职总览 lessonCount 刷新 e2e；覆盖率达标验证报告
- **依赖**：F1~F5 全部完成

### Agent F7：4 个 config 收尾文档（4 ticket）—— Phase T2
- **Ticket**：T-448, T-612, T-616, T-618
- **范围**：方案文档 S-055 完成标记 + CI guard + 计划文档收尾 + 模块验收清单
- **冲突域**：`docs/plans/` + `bin/` + `osg-spec-docs/tasks/audit/`

---

## 6. 关键测试约束（违反必返工）

### 6.1 覆盖率门槛（来自 CLAUDE.md）
- **backend / database / test**：分支覆盖率 **100%**、行覆盖率 ≥ **90%**
- **frontend**：行覆盖率 ≥ **80%**
- **frontend-ui**：行覆盖率 ≥ **70%**

### 6.2 测试粒度
- 每个测试方法名清晰：`testReferenceTypeConsistencyRejectsApplicationWithMockInterview`
- 必填覆盖：positive / negative / boundary / null_empty / exception
- AC 全覆盖：每条 AC-S-xxx-NN 至少一个 test_case 关联

### 6.3 不要伪造证据（CLAUDE.md 铁律）
- `verification_evidence` **必须**来自实际命令执行结果
- 不能编 exit_code=0
- 不能编 coverage 数字
- 跑实际命令 → 把 stdout 摘要写入 ticket YAML

### 6.4 §7.4.1 spec 迁移规则（关键）
- 三端 `__tests__/` 下原弹窗内部行为类用例（字段渲染、条件分支、提交逻辑）→ 迁到 `shared/src/__tests__/ClassReportFlowModal/`
- 三端各自仅保留**薄壳级 spec**：import 测试 + 端权限相关 spec
- **删除**原三端弹窗的重复测试以避免双维护

### 6.5 上线前实施 grep 校准
按方案 §7.4 命令产出实际 spec 清单（替换 §7.1 "约 15 个" 估算）：
```bash
grep -rln "LeadMentorJobOverview\|ClassReport\|ClassRecord" osg-frontend/packages/{lead-mentor,mentor,assistant}/src/__tests__
grep -rln "LeadMentorJobOverview\|ClassRecord" ruoyi-{system,admin}/src/test
```

---

## 7. 执行原则

1. ⚠️ **不要凭空写测试** — 先读 ticket YAML 的 `test_cases` 字段，按那个写
2. ⚠️ **不要跳过实际跑测试** — 每个 ticket 必须跑命令拿 exit_code
3. ⚠️ **不要编造覆盖率** — 跑 `pnpm test --coverage` / `mvn test jacoco:report` 拿真实数字
4. ⚠️ **不要改业务代码** — 只改 `__tests__/` 和 `src/test/`，业务代码已稳定
5. ⚠️ **修复测试时若发现业务代码缺陷** — 改 ticket 的 blocker，记 STATE.blockers，不要随便改业务

---

## 8. 单 Ticket 测试 SOP

```
1. 读 ticket YAML：osg-spec-docs/tasks/tickets/T-XXX.yaml
   - 关注 test_cases / acceptance_criteria / allowed_paths.modify
2. 写 spec / 测试方法
3. 跑实际命令：
   - backend: mvn -pl ruoyi-{module} -am -Dtest={TestClass} test
   - frontend: pnpm --dir osg-frontend/packages/{end} test {file}
4. exit_code=0 才算通过
5. 跑覆盖率（如要求）：
   - backend: mvn jacoco:report
   - frontend: pnpm --dir ... test --coverage
6. 把 verification_evidence 写回 ticket YAML：
     command: 实际命令
     exit_code: 0
     timestamp: ISO8601
     output_summary: 关键摘要
     test_result: { total, passed, failed, skipped, duration_ms }
     coverage: { line, branch, method }
7. ticket.status = done，ticket.completed_at = ISO8601
```

---

## 9. STATE 推进协议

每个 Story 全部 ticket（含测试）完成后：

```yaml
workflow:
  current_step: all_tickets_done
  next_step: verify
```

→ 跑 `/verify S-XXX`（实际触发 `verification` skill）。通过则：

```yaml
workflow:
  current_step: story_verified
  next_step: approve_story
```

→ `/approve S-XXX`：

```yaml
current_story: S-下一个
completed_stories:
  - ...
  - S-XXX
```

最后 5 个 Story 全部 done → STATE 推进到 `all_stories_done`。

---

## 10. 完成判定

- [ ] S-054 4 个 test ticket done + 跑通 + 覆盖率达标
- [ ] S-055 13 个 test ticket done + 跑通 + 覆盖率达标
- [ ] S-056 2 个 test ticket done + 跑通 + 覆盖率达标
- [ ] S-057 20 个 ticket done（含 spec 迁移 + e2e + config 收尾）
- [ ] 所有 verification_evidence 来自实际命令（非编造）
- [ ] STATE.completed_stories = [S-053, S-054, S-055, S-056, S-057]
- [ ] STATE.workflow.current_step = all_stories_done

---

## 11. 风险提示

- 三端 spec 迁移可能破坏现有测试 — 用 `git stash` 或 worktree 隔离
- 业务代码稳定但测试可能暴露 bug — 记 blockers，不要随便改业务
- e2e 需要后端启动 + 数据库连接 — 看 `bin/run-backend-dev.sh`
- 覆盖率不达标时分析 uncovered_lines / uncovered_branches → 补 test case
- 5 个 TBD 项（方案 §6）不要假装写文案：
  1. 人际关系评分 5 项详细说明 — 保持 'TBD'
  2. 进度评估 5 档中文 — 保持默认
  3. 截图上传后端接口 — grep 现有附件通道复用
  4. 简历上传后端接口 — 同上
  5. osg_admin_dict_registry 表结构 — `DESC` 校验后 INSERT

---

## 12. 第一步立刻做什么

1. 读 §2 必读文件
2. 跑 §6.5 grep 命令产出实际 spec 清单
3. 按 §5 启 Phase T1 五个 agent（同 message 内并行）
4. 等所有 notification 后启 Phase T2 两个 agent
5. 主对话最后做 /verify + /approve 推进 STATE

去吧。**关键价值**：让所有 verification_evidence 来自真实命令、所有覆盖率达标，然后整个模块就完成了。
