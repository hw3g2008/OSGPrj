# S-056 三端课消上报弹窗 手动测试用例

> 范围：mentor / lead-mentor / assistant 三端的「上报课消」弹窗（shared/ClassReportFlowModal）。
> 共 13 条 AC，48 个 case。`[P0]` 必测主流程，`[P1]` 重要边界，`[P2]` 次要补充。
> 前端入口：mentor `/courses` 卡片「上报课消」、lead-mentor `/teaching/class-records`、assistant `/class-records`。
> 后端 API：`POST /class-report/submit`、上传走 `/class-report/upload/screenshot|resume`。

---

## 0. 准备工作

### 0.1 账号
| 端 | 账号 | 关键关系 |
|---|---|---|
| mentor | 至少 1 位有 coaching/mock_practice 关联学员的 | `osg_coaching.mentor_ids` / `osg_mock_practice.mentor_ids` 含其 user_id |
| lead-mentor | 至少 1 位 | `osg_student.lead_mentor_id` 或 `lead_mentor_ids` 含其 user_id |
| assistant | 至少 1 位 | `osg_student.assistant_id` 或 `assistant_ids` 含其 user_id |
| student | 任意 | 用于验证 `student` 端调用 → 403 |

### 0.2 数据
- 至少 1 名学员有：
  - 1 条 `osg_job_application`（关联 mentor 的 coaching）
  - 1 条 `osg_mock_practice`，practice_type=mock_interview
  - 1 条 `osg_mock_practice`，practice_type=relation_test
  - 1 条 `osg_mock_practice`，practice_type=communication_test
- 1 名学员**没有**任何上述关联（用于校验下拉为空）

### 0.3 测试文件
- 截图：`a.png`、`b.jpg`、`c.pdf`（每个 < 10MB），1 个 `bad.txt` 改后缀为 `.png`（用于 MIME 二次校验）
- 简历：`resume.pdf`、`resume.docx` 各 1，1 个 `evil.exe` 改后缀为 `.pdf`

---

## 1. AC-S-056-01 — 5 步流程 + 学员下拉权限过滤

### TC-01-01 [P0] 5 步流程基础渲染
1. mentor 端打开「上报课消」
2. 弹窗依次出现 5 步骤标题：基本信息 → 课程类型 → 关联申请 → 学员状态 → 反馈
3. 「下一步」在每步必填项满足前置灰
4. 「上一步」可回退、表单值保留

### TC-01-02 [P0] 学员下拉按端权限过滤
1. mentor 登录，打开弹窗 → 学员下拉只显示该 mentor 在 `osg_coaching.mentor_ids` 或 `osg_mock_practice.mentor_ids` 中的学员
2. lead-mentor 登录 → 学员下拉显示其 lead_mentor_id/ids 名下学员
3. assistant 登录 → 学员下拉显示其 assistant_id/ids 名下学员

### TC-01-03 [P0] 学员下拉为空场景
1. 创建一个 mentor 账号无任何 coaching/practice 关联
2. 用该账号打开弹窗
3. 学员下拉显示文案「当前账号暂无可上报学员」
4. 「提交」按钮置灰

### TC-01-04 [P1] 三端弹窗一致性
1. 三端分别打开，对比标题/步骤/字段/按钮，应完全一致（仅入口路径不同）

---

## 2. AC-S-056-02 — 关联申请下拉按 course_type 过滤 + 仅显示当前用户被分配项

### TC-02-01 [P0] 岗位辅导 → 求职申请下拉
1. 步骤 2 选 `岗位辅导(job_coaching)`
2. 步骤 3 关联申请下拉数据来自 `osg_job_application`
3. 显示模板：`公司 / 岗位 / 阶段 / 面试时间`
4. 仅显示当前 mentor 在该 application 的 coaching.mentor_ids 内的项

### TC-02-02 [P0] 模拟面试/人际/期中 → 模拟应聘下拉
1. 步骤 2 选 `mock_interview` → 步骤 3 数据来自 `osg_mock_practice` 且 `practice_type=mock_interview`
2. 同理验证 `relation_test`、`communication_test`
3. 显示模板：`类型 / 提交时间 / 状态`

### TC-02-03 [P1] 切换课程类型清空已选 reference
1. 步骤 2 选 mock_interview，步骤 3 选某项
2. 回退步骤 2 改成 relation_test
3. 步骤 3 已选项被清空，下拉数据已切到 relation_test 范围

### TC-02-04 [P1] 时间倒序
1. 进入步骤 3，列表按 `interview_time`（兜底 submitted_at）降序

---

## 3. AC-S-056-03 — 反推锁定（从 ②栏带 applicationId 进入）

### TC-03-01 [P0] 锁定字段
1. mentor 端「我的求职辅导」②栏点击某 application 的「上报课消」按钮
2. 弹窗自动设置：courseType=`job_coaching`、关联申请预选该 application、学员预选
3. 学员、课程类型、关联申请 3 个字段 readonly（鼠标 hover 显示禁用样式）
4. 步骤 4「学员状态」开始可编辑

### TC-03-02 [P1] 反推后切回流程能正常提交
1. 同 TC-03-01 后，正常填写步骤 4-5
2. 提交成功，DB 中 `application_id` = 反推的那个

---

## 4. AC-S-056-04 — 旷课分支

### TC-04-01 [P0] 旷课基础流程（非基础课）
1. 步骤 2 选 `mock_interview` 任一课程类型
2. 步骤 3 选 reference
3. 步骤 4「学员状态」选 `旷课(absent)`
4. 步骤 5 跳过反馈区，仅显示「旷课备注」textarea
5. `durationHours` 默认 0.5（可改）
6. 必填旷课备注；评分隐藏
7. 提交 → DB 记录：`member_status=absent`、`rate=NULL`、`feedback_content=NULL`、`reference_id` 仍存在

### TC-04-02 [P0] 旷课基础课分支
1. 步骤 2 选 `base_course` → 步骤 3 选二级类型（如 tech）
2. 三级题目可不选
3. 步骤 4 选 absent
4. 提交 → DB：`reference_id=NULL`、不进 ②栏统计

### TC-04-03 [P1] absentRemark 必填
1. 旷课分支不填备注 → 提交按钮置灰

### TC-04-04 [P1] 旷课时长可改
1. absent 默认 0.5，改成 1.0、0.25 提交成功

---

## 5. AC-S-056-05 — 重复上报允许

### TC-05-01 [P0] 同 application + mentor + 同天多次正常上报
1. 同 mentor、同学员、同 application、同 classDate 连续上报 2 次
2. 两次都成功，DB 中 2 条独立记录、create_time 不同

### TC-05-02 [P0] 基础课旷课重复
1. 同 mentor、同学员、同天、`courseType=base_course`、`absent`、`reference_id=NULL` 上报 2 次
2. 都成功

---

## 6. AC-S-056-06 — 岗位辅导/模拟面试/期中考试反馈区

### TC-06-01 [P0] 岗位辅导反馈 5 项
1. courseType=job_coaching，进入步骤 5
2. 显示 5 个字段：目的(purpose)、概念(concept)、改进(improvement)、表现(performance)、希望做但没做的(wishedButNotDone)
3. performance 是 4 档 emoji 单选（😞😐🙂😀 之类）
4. 提交后 DB.feedback_content JSON：`{schemaVersion:1, type:"job_coaching", ...}`

### TC-06-02 [P0] 模拟面试反馈 = 岗位辅导结构
1. courseType=mock_interview → 步骤 5 渲染与岗位辅导相同 5 字段
2. JSON 里 `type="mock_interview"`

### TC-06-03 [P0] 期中考试反馈
1. courseType=communication_test，步骤 5 显示：
   - 总分输入框（0-100，输入 -1 / 101 阻止「下一步」并提示）
   - 逐题分析 textarea
   - 进度评估 5 档单选
2. 进度档顺序与方案 §3.5.4 一致，提交后 JSON `{score, perItemAnalysis, progressAssessment}`

### TC-06-04 [P1] performance 4 档分别提交
1. 4 档分别选一次，DB 中存的是 emoji key 而非 label

---

## 7. AC-S-056-07 — 人际关系反馈（5 项 + 推荐 + 截图 + rate）

### TC-07-01 [P0] 人际关系基础渲染
1. courseType=relation_test，步骤 5 显示：
   - 5 项评分（命名 metric1~metric5），每项下方有详细说明（先 TBD）
   - 是否推荐 3 选 1（强烈推荐 / 可继续 / 不推荐）
   - 通用 narrative textarea
   - 截图上传（多文件，png/jpg/pdf）

### TC-07-02 [P0] 截图上传成功路径
1. 上传 2 张 png + 1 张 pdf
2. 列表显示文件名 + 删除按钮
3. 提交成功 → DB.`screenshot_urls` 列存 3 个 URL（**不在 feedback_content 里**）

### TC-07-03 [P1] 截图限制
1. 单文件 > 10MB → 前端拒绝并提示
2. 上传第 11 张 → 前端拒绝并提示
3. 上传 .txt 改名 .png → 前端 accept 通过，**后端 probeContentType 拒绝并返回错误**

### TC-07-04 [P0] 总评分落 rate 列
1. rate 输入「9/10」或「A+」（任意文本）
2. 提交 → DB.osg_class_record.rate = 该字符串

---

## 8. AC-S-056-08 — 基础课二级 6 选 1 + 三级题目分组

### TC-08-01 [P0] 二级 6 选 1
1. courseType=base_course，步骤 3 出现 6 个二级单选：
   - 技术(tech) / 行为训练(behavior) / 新简历制作(new_resume) / 简历更新(resume_update) / 咨询案例准备(case_study) / 其它(other)

### TC-08-02 [P0] 二级=tech 三级题目
1. 选 tech → 出现题目分组：
   - 必修组 T01-T19（多选）
   - 选修组 T20-T24（多选）

### TC-08-03 [P0] 二级=behavior 三级题目
1. 选 behavior → 出现 B0-B7 多选

### TC-08-04 [P1] 其它 4 个二级类型
1. new_resume / resume_update / case_study / other 不出现三级题目（resume_update 出简历上传槽位见 AC-10）

---

## 9. AC-S-056-09 — 三级题目必选规则（前端 + 后端双校验）

### TC-09-01 [P0] tech 必修组未选 → 前端阻止
1. base_course + tech，T01-T19 都不选，仅选选修组
2. 「下一步」按钮置灰，提示「技术类基础课必修题目至少选 1 项」

### TC-09-02 [P0] behavior 至少 1 项
1. base_course + behavior，B0-B7 都不选 → 「下一步」灰

### TC-09-03 [P0] 旷课分支三级全可不选
1. base_course + tech + absent → 不选三级题目能继续到学员状态步骤 → 提交成功

### TC-09-04 [P0] 后端二次校验
1. 用 Postman / curl 直接 POST 提交 base_course + tech 但 `requiredTopicIds=[]`（绕过前端）
2. 后端返回 4xx，错误码体含「技术类基础课必修题目至少选 1 项」

---

## 10. AC-S-056-10 — 简历更新双槽位上传

### TC-10-01 [P0] 双槽位渲染
1. base_course + resume_update，步骤 5 出现两个上传槽位：
   - 原简历（pdf/doc/docx，单文件 ≤10MB）
   - 修改后简历（同上）

### TC-10-02 [P0] 上传成功路径
1. 原简历传 resume.pdf，修改后简历传 resume.docx
2. 提交 → DB.feedback_content JSON 含 `originalResumeUrl` / `updatedResumeUrl`
3. **不新增 DB 列**，只在 JSON 里

### TC-10-03 [P1] 真实 MIME 二次校验
1. evil.exe 改名 evil.pdf 上传
2. 后端 `Files.probeContentType` 探测真实类型 → 返回错误「简历文件格式不支持」
3. 服务端临时文件被删除（检查 `upload/class-report/resume/` 无残留）

### TC-10-04 [P1] 存储文件名 = UUID + ext
1. 上传 resume.pdf
2. 检查服务器存储路径：文件名应为 32 位 hex + `.pdf`
3. 接口返回 `originalFileName` 仍是 `resume.pdf`（仅展示）

---

## 11. AC-S-056-11 — rate 必填 + 不显示课时费

### TC-11-01 [P0] 正常上课所有课程类型 rate 必填
1. 5 类课程逐个测：rate 留空 → 提交按钮灰 + 提示
2. rate 输任意非空字符串 → 通过

### TC-11-02 [P0] 旷课不评分
1. absent 分支步骤 5 不显示 rate 输入框
2. 提交 DB.rate=NULL

### TC-11-03 [P0] 不显示课时费
1. 弹窗任何步骤都不应出现「课时费」「单价」「金额」字样
2. 提交后审核列表的「课时费」字段由后端独立计算（不影响）

---

## 12. AC-S-056-12 — feedback_content JSON 按 course_type 路由

### TC-12-01 [P0] 5 类 schema 各自正确
逐一提交 5 类，DB.feedback_content JSON 顶层都含 `schemaVersion: 1`，且字段结构：

| courseType | 关键字段 |
|---|---|
| job_coaching | ratings + highlights + improvements + nextSteps + narrative |
| mock_interview | 同上 |
| relation_test | ratings(5项) + recommendation + narrative + screenshotUrls |
| communication_test | **同 relation_test schema**（共享 RelationFeedback）|
| base_course | baseCourseCategory + baseCourseTopics + narrative + (resumeUrl?) |

> 重点验证 `communication_test` 走的是 RelationFeedback 而不是 MidtermFeedback（后端刚修过 bug）。

### TC-12-02 [P0] schemaVersion 缺失 → 后端拒绝
1. curl 直接 POST 一个不含 schemaVersion 的 feedback
2. 后端返回错误「feedbackContent 缺少 schemaVersion 字段」

### TC-12-03 [P0] schemaVersion ≠ 1 → 拒绝
1. POST schemaVersion=2 → 拒绝「schemaVersion 必须为 1」

---

## 13. AC-S-056-13 — 服务端双层防护（§5.2）

### TC-13-01 [P0] reference_type 与 course_type 不一致
1. curl POST `courseType=job_coaching` 但 `referenceType=mock_interview`
2. 后端返回业务错误「课程类型与关联类型不一致」

### TC-13-02 [P0] 基础课带 reference
1. POST `courseType=base_course` 但 `referenceId=123`
2. 错误「基础课不能携带关联记录」

### TC-13-03 [P0] 学员越权
1. mentor A 用 mentor B 名下学员的 studentId 发起提交
2. 错误「无权为该学员上报课消」

### TC-13-04 [P0] reference 越权
1. mentor A 用属于学员 X 但 mentor_ids 不含 A 的 application_id
2. 错误「无权为该辅导申请提交课消」

### TC-13-05 [P0] student 端调用直接 403
1. 用 student 账号调上报接口（end=student）
2. HTTP 403 + 错误「学员无权提交课消」

### TC-13-06 [P1] 三端 end 越权
1. mentor 账号但 header/body 传 end=lead-mentor → 用 lead-mentor 校验路径但 lead_mentor_id 不匹配 → 拒绝

---

## 14. 跨场景回归（必跑）

### TC-R-01 [P0] 三端各跑通一次完整提交
mentor / lead-mentor / assistant 各自完整走 5 步并提交一条 job_coaching 记录，DB 都能查到。

### TC-R-02 [P0] 提交中状态
1. 弹窗提交按钮点击后立刻显示「提交中...」
2. body-class 加上 `submitting`（DOM inspect）
3. 期间禁用所有输入与「上一步/取消」

### TC-R-03 [P0] 提交失败错误展示
1. 故意触发后端错误（如 TC-13-01）
2. 弹窗顶部出现 a-alert（红色）显示后端错误文案
3. 用户改字段后 alert 自动 clearError

### TC-R-04 [P1] 字典/枚举展示一致
1. 列表页对应记录详情页的「课程类型」「学员状态」显示中文 label（不是 key）

---

## 15. 接口直连用 curl 模板

```bash
# 提交（替换 token / 字段）
curl -X POST http://localhost:8080/class-report/submit \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": 1001,
    "classDate": "2026-05-09",
    "durationHours": 1.0,
    "courseType": "job_coaching",
    "referenceType": "application",
    "referenceId": 2001,
    "memberStatus": "normal",
    "rate": "9/10",
    "feedbackContent": {
      "schemaVersion": 1,
      "type": "job_coaching",
      "ratings": {"preparation":5,"communication":5,"technical":5,"confidence":5,"overall":5},
      "highlights": "ok"
    }
  }'

# 上传截图（multipart）
curl -X POST http://localhost:8080/class-report/upload/screenshot \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@a.png"
```

---

## 16. 已知风险点（重点观察）

1. **communication_test feedback 路由**：刚修复 → 用 TC-12-01 重点验证。
2. **进度档顺序**（T-509）：远超预期 vs 远低于预期，方案 §3.5.4 与 constants 顺序可能不一致 → 用 TC-06-03 比对方案文档。
3. **screenshot_urls 落 DB 列还是 JSON**：必须落列，不进 JSON → 看 TC-07-02。
4. **resume URL 落 JSON 不新增列**：看 TC-10-02。
5. **重复上报无 unique 索引**：DB 直查 `osg_class_record` 表确认无相关 unique。

---

## 17. 测试执行记录模板

| TC | 状态 | 备注 |
|---|---|---|
| TC-01-01 | ☐ Pass / ☐ Fail | |
| TC-01-02 | | |
| ... | | |

发现 Bug 时填：复现路径 + 期望 vs 实际 + 截图。
