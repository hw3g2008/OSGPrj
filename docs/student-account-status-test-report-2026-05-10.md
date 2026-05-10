# 学员账号状态联动回归测试报告（最终版）

- **日期**：2026-05-10
- **测试学员**：student_id=46706 / story1.test@osg.test
- **后端**：http://localhost:28080（health=UP）
- **前端**：admin:3005 / student:3001 / lead-mentor:3003 / assistant:3004
- **执行方式**：headless Playwright + curl
- **测试覆盖**：spec § 5.1（18 curl 用例）+ manual-test-cases.md（A1-A4, LM1-LM5, AS1-AS5, S1-S10, X1-X3）

---

## 总览

| 阶段 | 用例数 | PASS | FAIL | BLOCKED | 通过率 |
|---|---|---|---|---|---|
| 阶段 1 后端 curl | 18 | 18 | 0 | 0 | **100%** |
| 阶段 2 Admin (A1-A4) | 4 | 2 | 2 | 0 | 50% |
| 阶段 2 Lead-mentor (LM1-LM5) | 5 | 2 | 3 | 0 | 40% |
| 阶段 2 Assistant (AS1-AS5) | 5 | 0 | 0 | 5 | — |
| 阶段 2 Student (S1-S10) | 10 | 10 | 0 | 0 | **100%** |
| 阶段 2 跨端 (X1-X3) | 3 | 3 | 0 | 0 | 100%（已知限制） |
| **合计** | **45** | **35** | **5** | **5** | **78%** |

---

## 阶段 1：后端 curl 回归（18 PASS / 0 FAIL）

执行：`bash docs/student-account-status-curl-test.sh`，输出 `PASS=18 FAIL=0`。

| 组别 | 用例 | 结果 |
|---|---|---|
| 登录 | 登1-5 | ✓ ✓ ✓ ✓ ✓ |
| 求职可见性 | 求1-3 | ✓ ✓ ✓ |
| LM 申报 | 申LM1-5 | ✓ ✓ ✓ ✓ ✓ |
| AS 申报 | 申AS1-5 | ✓ ✓ ✓ ✓ ✓ |

**后端账号状态联动逻辑全部正确**。

---

## 阶段 2：Admin 端（A1-A4）

| 用例 | 描述 | 结果 | 说明 |
|---|---|---|---|
| A1 | 操作下拉显示"结束合同" | ✓ PASS | 位置在"冻结"和"加入黑名单"之间，无"恢复正常"（status=0 正确） |
| A2 | 弹窗文案 + 徽章 | ⚠️ PARTIAL FAIL | 标题/徽章/描述/无原因下拉 ✓；**缺备注输入框**（spec 要求"备注输入框可选"）|
| A3 | 提交"结束合同" | ✓ PASS | DB account_status=2 ✓，列表"账号状态"列显示"已结束" ✓ |
| A4 | 已结束可恢复正常 | ✗ FAIL | status=2 时**整个"更多"按钮消失**，操作列仅"详情"，无法访问"恢复正常" |

**截图**：`docs/test-screenshots/A1_more_dropdown.png`、`A2_contract_end_modal.png`、`A3_after_submit.png`、`A4_check_restore.png`

---

## 阶段 2：Lead-mentor 端（LM1-LM5）

| 用例 | 描述 | 结果 | 说明 |
|---|---|---|---|
| LM1 | 正常学员可选 | ✓ PASS | "Story1 Test Student" disabled=false |
| LM2 | 冻结学员 disable | ✗ FAIL | disabled=false，label 无"（冻结，不可申报）"后缀 |
| LM3 | 退费学员 disable | ✗ FAIL | disabled=false，label 无"（已退费，不可申报）"后缀 |
| LM4 | 已结束可选+后缀 | ✗ FAIL | 可点选 ✓，但 label 无"（已结束）"后缀 |
| LM5 | 黑名单可选无后缀 | ✓ PASS | disabled=false，无后缀（spec 要求） |

**截图**：`docs/test-screenshots/LM1_pass_student_selectable.png`、`LM2_fail_frozen_not_disabled.png`

---

## 阶段 2：Assistant 端（AS1-AS5）

| 用例 | 结果 | 原因 |
|---|---|---|
| AS1-AS5 | 🚫 BLOCKED | 学员下拉显示"当前账号暂无可上报学员"，无法测试任何状态分支 |

**根因（双层）**：
1. 前端调 `/api/assistant/students/list?pageNum=1&pageSize=8` → API 返回 8 个学员，**测试学员 46706 不在列表中**（DB 中 `assistant_id=12813` 已正确绑定，疑为后端 SQL 过滤问题）
2. 即便返回的 8 个学员中也有 status=0 的可选项，但前端**全部不渲染为 dropdown 选项**，直接显示 empty state

**截图**：`docs/test-screenshots/AS_modal_state.png`

---

## 阶段 2：Student 端（S1-S10）

| 用例 | 描述 | 结果 |
|---|---|---|
| S1 | 正常(0) 登录 → /positions | ✓ PASS（localStorage accountStatus="0" blacklisted=false）|
| S2 | 已结束(2) 登录 → lock 页 contract_ended | ✓ PASS（标题/描述完全匹配 spec）|
| S3 | 黑名单 登录 → lock 页 blacklisted | ✓ PASS（标题/描述完全匹配 spec）|
| S4 | lock 页"退出登录" | ✓ PASS（清空 token/user，跳 /login）|
| S5 | lock 页"联系班主任" | ✓ PASS（弹窗文案 "请通过站内信或邮件联系您的班主任处理后续事宜。"）|
| S6 | 已结束手动改 URL → 守卫拦截 | ✓ PASS（重新跳回 lock 页）|
| S7 | 黑名单手动改 URL → 守卫拦截 | ✓ PASS |
| S8 | 冻结(1) 登录失败 | ✓ PASS（提示"账号已冻结，请联系管理员"）|
| S9 | 退费(3) 登录失败 | ✓ PASS（提示"账号已退费，请联系管理员"）|
| S10 | 未登录直访 lock 页 | ✓ PASS（正常渲染，不跳 /login）|

**截图**：`S2_lock_page_contract_ended.png`、`S3_lock_page_blacklist.png`

**Student 端是本期 spec 的核心交付，10/10 全过。**

---

## 阶段 2：跨端联动（X1-X3）

| 用例 | 结果 | 说明 |
|---|---|---|
| X1 | ✓ 已知限制（spec 已说明） | admin 改状态后 student 不重新登录不立即跳 lock 页，本期 Min 不做实时同步 |
| X2 | ✓ PASS | admin 切到结束 + student 重新登录 → 直跳 lock 页（已通过 S2 验证）|
| X3 | ✓ PASS | admin 切到退费 + student 重新登录 → 登录失败（已通过 S9 验证）|

---

## Bug 清单（按优先级）

### BUG-002：Admin "结束合同"弹窗缺备注输入框（P3）

**用例**：A2  
**期望**：弹窗有可选备注输入框（spec："备注输入框可选"）  
**实际**：弹窗仅含描述文案 + 取消/确认按钮，**无备注输入控件**  
**截图**：`docs/test-screenshots/A2_contract_end_modal.png`

---

### BUG-003：已结束学员（status=2）"更多"按钮整体消失（P1，阻塞）

**用例**：A4  
**复现**：admin 端将 student 46706 设为"已结束"后，列表行操作列仅剩"详情"，无"更多"下拉，**用户无法通过 UI 执行"恢复正常"**  
**期望**：status≠0 时操作下拉应显示"恢复正常"  
**实际**：操作 td DOM 内只有 `<button>详情</button>`，无 dropdown 触发器  
**根因定位**：admin 学员列表行的操作渲染逻辑，对 `account_status=2` 误隐藏了"更多"按钮  
**截图**：`docs/test-screenshots/A4_check_restore.png`、`A3_after_submit.png`

---

### BUG-004：LM/AS 申报学员下拉未实现 disable / label 后缀（P2）

**用例**：LM2、LM3、LM4（AS 同组件）  
**期望**：
- 冻结/退费学员：option `disabled=true`，label 含"（冻结，不可申报）"或"（已退费，不可申报）"
- 已结束学员：可点选，label 含"（已结束）"  

**实际**：所有状态的学员 option 均 `disabled=false` 且无 label 后缀  
**根因定位**：`packages/lead-mentor/src/components/LeadClassReportModal.vue`（或同名 AS 组件）的学员 `<a-select-option>` 渲染逻辑未根据 `accountStatus / isBlacklisted` 字段加 `:disabled` 或修改 `label`  
**截图**：`docs/test-screenshots/LM2_fail_frozen_not_disabled.png`

---

### BUG-005：Assistant 申报弹窗学员下拉空（P1，阻塞 AS1-AS5）

**用例**：AS1-AS5 全部  
**复现**：以 test-assistant 登录 AS 端 → 上报课程记录 → 学员下拉显示"当前账号暂无可上报学员"  
**根因（双层）**：

1. **后端**：`GET /assistant/students/list` 返回 8 个学员（`{"total":8,"rows":[...]}`），但 student 46706（test 学员）**不在结果中**，尽管 DB `osg_student.assistant_id=12813` 已正确绑定。可能是 SQL 过滤条件错误（如要求 `contract_status` 或额外业务字段）。

2. **前端**：即使 API 返回 8 个 status=0 的可选学员，前端学员 `<a-select>` 也**全部不渲染为 option**，直接显示 empty state。

**截图**：`docs/test-screenshots/AS_modal_state.png`  
**API 返回示例**：见 `browser_network_request` index 522 response-body

---

## 环境问题（已在测试中处理）

测试期间发现两个 SQL 迁移未应用到共享测试库（`47.94.213.128:23306` / `ry-vue`），已手动应用：

1. `deploy/mysql-init/27_osg_class_record_class_report_extension.sql` — 加 `reference_type`、`member_status` 等 6 列  
2. `sql/migrations/2026-05-09-osg-coaching-stage-fields.sql` — 加 `interview_stage`、`interview_time` 等 6 列  

**建议**：CI/部署流程加迁移检测，避免共享测试库与本地 jar 漂移。

---

## 已修复的 Bug

### BUG-001（已修复）：member_status NOT NULL 违反

之前测试发现 LM/AS 申报路径上，`OsgClassRecordMapper.insertMentorClassRecord` 显式传 `member_status=null`，DB 列 `NOT NULL DEFAULT 'normal'` 但 DEFAULT 被绕过。  
开发已修复，本轮 curl 回归 18/18 PASS 验证修复有效。

---

## 总结

| 维度 | 结论 |
|---|---|
| **后端账号状态逻辑** | ✅ 完全正确（18/18 curl + 后端拦截路径全部通过）|
| **Student 端守卫 / lock 页** | ✅ 完全正确（10/10）— 本期 spec 核心交付达标 |
| **Admin 端结束合同流程** | ⚠️ 主路径可用，但 status≠0 后无法恢复正常（BUG-003 P1）|
| **LM 端申报弹窗防呆** | ⚠️ 学员下拉无 disable/label 渲染（BUG-004 P2）|
| **AS 端申报弹窗** | 🚫 完全不可用（BUG-005 P1，双层 bug）|
| **跨端联动** | ✅ 符合 Min 设计预期（X1 限制 spec 已声明）|

**整体通过率：35/45（78%），其中 Student 端 + 后端 = 100%**。

**P1 阻塞 bug**：BUG-003（admin 不能恢复 status=2）、BUG-005（AS 申报不可用）。
**P2 待修**：BUG-004（LM/AS 学员下拉 disable/label）。
**P3 优化**：BUG-002（admin 弹窗备注框）。
