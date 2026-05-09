# 班主任求职总览 + 三端课消上报改造方案

- **日期**：2026-05-09
- **范围**：班主任端（lead-mentor）「学员求职总览」页 + 导师/班主任/助教三端「上报课程记录」弹窗
- **背景**：求职总览页需按业务视角拆三栏；课消记录与求职申请缺关联，导致评分/课消统计无法精确归属；三端课消上报弹窗内容不一致

---

## 一、需求概览

### 1.1 班主任端「学员求职总览」改造
- 路由 `/career/job-overview` 不变
- 三栏顺序：① 我管理的学员（默认）/ ② 待辅导的学员 / ③ 待分配导师
- 顶部删除「学员姓名搜索」「全部类型」筛选
- 面试日历仅在 ① 栏 tab 内显示
- 城市列只展示 `osg_city` 字典 label（不展示大区）

### 1.2 三端「上报课程记录」改造
- 三端表单字段、布局、条件分支完全一致
- 学员下拉范围按各端权限过滤（导师 / 班主任 / 助教）
- 课消记录与具体业务申请关联（求职申请 / 模拟面试 / 人际关系 / 模拟期中考试），基础课程不关联
- 统一表单流程支持「正常上课」「旷课未到场」分支
- 5 类课程类型对应不同反馈区
- 基础课程支持二级类型（6 项硬编码）+ 三级题目（T01-T24/B0-B7 字典化）
- 模拟面试反馈新增 1 题
- 人际关系反馈新增 5 项详细说明（文案 TBD）+ 截图上传
- 不显示课时费
- **三端公共组件抽到 `shared/`，弹窗只有一份实现**（详见 §4A 公共抽取架构）

---

## 二、班主任端「学员求职总览」详细方案

### 2.1 Tab 与默认

| 顺序 | 名称 | key | 默认 |
|---|---|---|---|
| 1 | 我管理的学员 | `managed` | ✓ |
| 2 | 待辅导的学员 | `coaching` | |
| 3 | 待分配导师 | `pending` | |

### 2.2 各栏定义

| 栏 | 数据范围（SQL 维度） |
|---|---|
| ① 我管理 | `osg_job_application.lead_mentor_id = 当前用户` |
| ② 待辅导 | `osg_coaching.mentor_ids` 含当前用户（无论是否上报课消） |
| ③ 待分配 | `lead_mentor_id = 当前用户` 且 `osg_coaching.mentor_ids` 为空 |

**重叠去重**：① 与 ② 数据可重叠（既管理又辅导 → 两栏都显示），不去重。

### 2.3 列与操作

#### ① 我管理的学员
- 筛选：公司、面试阶段、面试时间区间
- 列：学生 ID / 姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / 导师 / **最近评分**
- 操作：查看详情
- 行维度：application 维度（一个学生多场面试 → 多行）
- 顶部展示：面试日历（事件源 = 我管理的学员的所有面试）

**最近评分取值规则**（详见 §3.4.1 统一锚点）：
- 过滤：`reference_type='application' AND reference_id=该 application.id AND member_status='normal' AND rate IS NOT NULL AND rate <> ''`
- 排序：`class_date DESC` 取首条
- 跳过旷课记录与空 rate
- 无任一符合记录 → 显示 `-`

**导师列展示**：逗号拼接全部导师名

**查看详情弹窗**：
- 列出该 application 全部课消记录
- **按导师分组**展示，每个导师下汇总该导师的总课时与评分平均
- 课次明细按上课日期倒序

#### ② 待辅导的学员
- 筛选：公司、面试阶段、面试时间区间、**是否上报课消**（下拉：是 / 否）
- 列：学生 ID / 姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / **已上报课消数**
- 操作：上报课消（点击打开课消上报弹窗，预填学员 readonly + 关联申请预选当前 application 可改）

**已上报课消数口径**（详见 §3.4.1 统一锚点）：基于 `reference_type='application' AND reference_id=当前 application.id` 严格过滤，含旷课、含其他导师上报。基础课课消（reference_id NULL）天然不计入。

**是否上报课消筛选**：与「已上报课消数」口径一致。是 = 该 application 已存在 ≥ 1 条满足上述过滤的课消记录。

#### ③ 待分配导师
- 筛选：公司、面试阶段、面试时间区间
- 列：学生 ID / 姓名 / 岗位 / 公司 / 城市 / 面试阶段 / 面试时间 / **提交时间**（`application.submitted_at`）
- 操作：分配导师（保留现有逻辑）

### 2.4 顶部清理
- 删除「学员姓名」搜索框
- 删除「全部类型」下拉

### 2.5 后端接口改造

接口：`GET /lead-mentor/job-overview/list`
- scope：保留 `pending` / `coaching` / `managed`（语义重新对齐）
- **入参新增**：`interviewTimeStart`、`interviewTimeEnd`、`lessonReported`（仅 ② 栏使用）
- **入参删除**：`studentName`、`typeFilter`
- **出参字段新增**：
  - `cityLabel: string`（osg_city dict_value → label）
  - `latestRating: string \| null`（① 栏使用）
  - `lessonCount: number`（② 栏使用）
  - `lessonReported: boolean`（② 栏 server-side 计算）

接口：`GET /lead-mentor/job-overview/calendar`
- 出参口径**变更**：从原全量改为限定 `lead_mentor_id = 当前用户`
- 前端若有缓存（如 store），需同步刷新逻辑；前端 `loadCalendar` 函数确认无 stale cache 风险

接口：`GET /lead-mentor/job-overview/{applicationId}`
- 详情接口扩展返回该 application 下全部课消记录（按导师分组）

---

## 三、三端「上报课程记录」详细方案

### 3.1 三端学员下拉源

> **维度澄清**：`osg_coaching` 与 `osg_job_application` 都是 **application 维度**（一个 application 对应一条 coaching，UNIQUE 索引 `uk_coaching_application`），不是学员维度。学员下拉需通过这些表反查 student_id 并 **DISTINCT 去重**。

| 端 | 学员下拉数据范围（DISTINCT student_id） |
|---|---|
| 导师端 | 存在任一 `osg_coaching` 行其 `mentor_ids` 含当前用户 → 取 student_id |
| 班主任端 | 存在任一 `osg_job_application.lead_mentor_id = 当前用户` 或 `osg_coaching.mentor_ids` 含当前用户 → 取 student_id |
| 助教端 | `osg_student.assistant_id = 当前用户` 或 `osg_student.assistant_ids` 含当前用户 |

**关系字段已存在**，无需新建。后端 mapper 需在 SELECT 中加 `DISTINCT`。

> 上表 3 行差异在 §4A 抽取后由 `useStudentScopeFinder(end)` 统一暴露：前端组件不感知端差异，传 `end` 参数自动选对接口。

**空状态兜底**：当前账号在该端无任何匹配学员时，下拉显示空状态文案 `当前账号暂无可上报学员`，弹窗"提交"按钮 disabled，引导用户联系管理员核对分配关系。

### 3.2 表单流程（统一三端）

```
Step 1：基础信息
  ├─ 学员（下拉，按端权限过滤）
  ├─ 上课日期
  └─ 课时时长

Step 2：课程类型（5 选 1）
  ├─ 岗位辅导
  ├─ 模拟面试
  ├─ 人际关系
  ├─ 模拟期中考试
  └─ 基础课程

Step 3：按课程类型分支
  ├─ 课程类型 = 岗位辅导 → 求职申请下拉（关联申请）
  ├─ 课程类型 = 模拟面试 → osg_mock_practice (practice_type=mock_interview) 下拉
  ├─ 课程类型 = 人际关系 → osg_mock_practice (practice_type=relation_test) 下拉
  ├─ 课程类型 = 模拟期中考试 → osg_mock_practice (practice_type=communication_test) 下拉
  └─ 课程类型 = 基础课程 → 二级类型下拉（6 选 1）
        └─ 二级 = 技术 → 三级题目多选（必修 T01-T19 / 选修 T20-T24）
        └─ 二级 = 行为训练 → 三级题目多选（B0-B7）
        └─ 二级 = 新简历制作 / 简历更新 / 咨询案例准备 / 其它 → 跳过三级

Step 4：学员状态
  ├─ 正常上课
  └─ 旷课未到场（课时时长自动改为 0.5h，可改）

Step 5：根据学员状态分支
  ├─ 旷课未到场 → 仅显示「旷课备注」，提交即可
  └─ 正常上课 → 显示反馈区（按课程类型）+ 评分，提交
```

**Step 3 顺序约束**：基础课程在 Step 3 选"二级类型"（且若为技术/行为再选三级题目）后即进 Step 4；其它课程类型在 Step 3 选完关联申请后进 Step 4。**Step 4 学员状态固定排在 Step 3 之后**（旷课时上述 Step 3 仍需完整填写，用以反推 course_type / 标识基础课二级类型）。

**②栏「上报课消」按钮预填的特殊路径**：
- 从求职总览 ②栏点击"上报课消"打开弹窗时，传入 `applicationId`
- 弹窗按 `applicationId` **反推并锁定** `courseType=job_coaching`（求职申请只能对应岗位辅导）、关联申请预选该 application
- 学员、课程类型、关联申请此时均 readonly；学员状态及之后字段正常可编辑
- 用户原话需求 4-7 暗示「先选课程类型 → 选申请」是主路径；从 ②栏带入是"反向预填"特例

### 3.3 关联申请下拉过滤逻辑

| 课程类型 | 下拉数据范围 |
|---|---|
| 岗位辅导 | 该学员的求职申请，且当前用户被分配辅导 |
| 模拟面试 | 该学员的模拟应聘记录（type=mock_interview），且当前用户被分配 |
| 人际关系 | 该学员的模拟应聘记录（type=relation_test），且当前用户被分配 |
| 模拟期中考试 | 该学员的模拟应聘记录（type=communication_test），且当前用户被分配 |

**下拉显示模板**：
- 求职申请：`公司 / 岗位 / 阶段 / 面试时间`
- 模拟应聘：`类型 / 提交时间 / 状态`

**一对一约束**：一条课消记录只能关联一条申请。

### 3.4 旷课分支说明
- 旷课时 Step 1 / Step 2 / Step 3 仍需完整填写（学员、日期、时长、课程类型、关联申请 或 基础课二级/三级）
- 课程类型 ≠ 基础课程：旷课时关联申请用以填充 `reference_type / reference_id`，并参与 ② 栏统计
- 课程类型 = 基础课程：旷课时仍选二级类型（三级题目正常上课时按 §3.5.5 规则；旷课全可不选）；`reference_type / reference_id` 留 NULL → **不参与 ② 栏「已上报课消数」统计**
- 旷课不评分；不显示反馈区；仅显示「旷课备注」

### 3.4.1 「已上报课消数」与「最近评分」的统计口径（统一锚点）

**视角说明**：`lessonCount` 是 **application 维度**统计（"这条求职申请总共被辅导了多少次"），不是当前 mentor 个人维度。多 mentor 共同辅导一条 application 时，每个 mentor 在 ②栏看到的 `lessonCount` 一致。这是有意设计：②栏体现 application 整体进度，避免协作场景下多人重复辅导。

- ② 栏「已上报课消数」：基于 `osg_class_record.reference_type='application' AND reference_id=当前 application.id` 严格过滤，**含旷课、含全部 mentor 的上报**（与 §4.4 一致）
- 基础课课消（reference_id NULL）天然不计入 application 维度统计
- 旧数据 `reference_id` NULL 的同样不计入（与 §4.4 一致）
- ① 栏「最近评分」：基于上述同一过滤集合，且 `member_status='normal'`、`rate IS NOT NULL AND rate <> ''`，按 `class_date DESC` 取首条；不存在则显示 `-`

### 3.4.2 重复上报策略
- **允许同一 application 同一 mentor 同一天多次上报**（含旷课重复提交）
- DB 层不加唯一索引、后端不做幂等校验、前端不做去重
- 业务理由：一天可能上多节课、补录、修正等正当场景；强制去重反而造成回退困难
- 后续如有"误提交"投诉，再设计撤回/作废机制（独立工单）

### 3.5 各课程类型反馈区（仅正常上课显示）

#### 3.5.1 岗位辅导反馈
**字段同模拟面试反馈**：
1. 模拟面试的目的
2. 涉及的概念和主题
3. 学员需要改进的方面
4. 学员表现评价（4 档 emoji）
5. **新增**：你在这个模拟面试中希望做但没做的事情

#### 3.5.2 模拟面试反馈
- 同岗位辅导，5 项

#### 3.5.3 人际关系反馈
- 5 项评分（电子邮件质量 1-5、礼仪 1-5、闲聊 1-10、通话 1-10、感谢邮件 1-3）
- 每项评分后展示**详细说明**（文案 **TBD**，详见 §6）
- 是否推荐（3 选项，保留现状）：
  - `yes` → 推荐
  - `no` → 不推荐
  - `maybe` → 视情况
- **新增：截图上传**
  - 多文件，复用现有附件组件
  - 类型限制：png / jpg / pdf
  - 单文件 ≤ 10MB，总数 ≤ 10 张
  - **后端安全约束**（按 CLAUDE.md §7 强约束）：
    - 后端 `Files.probeContentType()` 二次校验真实 MIME（不只信 Content-Type header）
    - 存储文件名用 `UUID + ext`，不用原始 fileName（防 path traversal），原始 fileName 仅作展示返回
    - 上传接口 `@PreAuthorize` 鉴权 + Spring Security 默认 CSRF
- 通用反馈文本框
- **总评分**（落在 `osg_class_record.rate` 字段，详见 §3.6）

#### 3.5.4 模拟期中考试反馈
- 得分（0-100）
- 逐题分析
- 进度评估（5 档，保留现状文案；如需调整由业务方补 TBD）：
  - `level1` → 远低于预期
  - `level2` → 低于预期
  - `level3` → 符合预期
  - `level4` → 高于预期
  - `level5` → 远高于预期

#### 3.5.5 基础课程

> 注：用户原话列举二级类型为「技术的、行为训练、新简历制作、**建立更新**、咨询案例准备、其它」。其中「建立更新」按上下文推断为「**简历更新**」笔误，本方案统一按「简历更新」处理。

**二级类型**（6 选 1，硬编码）：
- 技术
- 行为训练
- 新简历制作
- 简历更新
- 咨询案例准备
- 其它

**二级 = 技术**：三级题目多选（字典化），UI 分两组：
- **必修组**：T01-T19
- **选修组**：T20-T24

**二级 = 行为训练**：三级题目多选 B0-B7（字典化）

**三级题目必选/可选规则**：
- 正常上课时：必修组（T01-T19）至少 1 项必选；选修组（T20-T24）可不选；行为训练 B0-B7 至少 1 项必选
- 旷课时：三级题目全可不选

**二级 = 新简历制作 / 咨询案例准备 / 其它**：仅一个通用反馈文本框

**二级 = 简历更新**：通用反馈文本框 + 原简历上传 + 修改后简历上传
- 文件 URL 落在 `feedback_content` JSON 中（`originalResumeUrl` / `updatedResumeUrl`），**不新增列**
- 简历单文件约束：
  - 两个槽位（原简历 + 修改后简历）各自一个文件
  - 类型限制 pdf / doc / docx
  - **每个文件各自 ≤ 10MB**（不是合计）
  - 后端 `Files.probeContentType()` 二次校验真实 MIME
  - 存储文件名 `UUID + ext`，原始 fileName 仅作展示
  - 上传接口 `@PreAuthorize` 鉴权 + Spring Security 默认 CSRF

### 3.6 评分（正常上课所有课程类型必填）
- 单一文本输入框，导师手输数字（不限分制）
- 复用 `osg_class_record.rate` 字段（VARCHAR(32)）
- 人际关系：5 项细化评分（落在 `feedback_content` JSON）+ **总评分**（落在 `rate` 字段，与其它课程类型一致）
- 校验：`rate` 必填且非空字符串；空字符串视同未填

### 3.7 不显示
- 课时费（mentor 端已有则去掉）

### 3.8 旧组件清理
- 删除 `packages/lead-mentor/src/components/LeadMentorClassReportModal.vue`（静态原型未联通）

---

## 四、数据库改造

### 4.1 `osg_class_record` 加字段

**幂等迁移脚本**（用 information_schema 判断列是否存在再加，避免重复执行报错）：
```sql
-- 迁移文件位置：deploy/mysql-init/27_osg_class_record_class_report_extension.sql
-- 注意：MySQL 8 才原生支持 ALTER TABLE ... ADD COLUMN IF NOT EXISTS，本项目沿用 information_schema 检查法兼容老版本

DROP PROCEDURE IF EXISTS osg_alter_class_record_for_report;
DELIMITER $$
CREATE PROCEDURE osg_alter_class_record_for_report()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema=DATABASE() AND table_name='osg_class_record' AND column_name='reference_type') THEN
    ALTER TABLE osg_class_record
      ADD COLUMN reference_type VARCHAR(32) DEFAULT NULL
        COMMENT '关联业务类型：application/mock_interview/relation_test/communication_test/null(基础课)' AFTER student_id,
      ADD COLUMN reference_id BIGINT DEFAULT NULL
        COMMENT '关联业务 ID（application_id 或 practice_id）' AFTER reference_type,
      ADD COLUMN base_course_category VARCHAR(32) DEFAULT NULL
        COMMENT '基础课二级类型：tech/behavior/new_resume/resume_update/case_study/other' AFTER course_type,
      ADD COLUMN base_course_topics VARCHAR(255) DEFAULT NULL
        COMMENT '基础课三级题目 dict_value 逗号分隔（T01,T03 / B0,B1）',
      ADD COLUMN absent_remark VARCHAR(512) DEFAULT NULL
        COMMENT '旷课备注（学员状态=absent 时填写）',
      ADD COLUMN screenshot_urls TEXT DEFAULT NULL
        COMMENT '人际关系反馈截图 URL JSON 数组（≤10 个 OSS path）',
      ADD COLUMN member_status VARCHAR(16) NOT NULL DEFAULT 'normal'
        COMMENT '学员状态：normal=正常上课 / absent=旷课未到场';
    CREATE INDEX idx_class_record_reference ON osg_class_record (reference_type, reference_id);
  END IF;
END$$
DELIMITER ;
CALL osg_alter_class_record_for_report();
DROP PROCEDURE IF EXISTS osg_alter_class_record_for_report;

-- 同时扩 feedback_content 容量（若现有 VARCHAR(1024) 不够 5 段长文本 + 简历 url + 人际关系 narrative）
ALTER TABLE osg_class_record MODIFY COLUMN feedback_content TEXT DEFAULT NULL COMMENT '反馈细节 JSON';
```

**字段总览**：本次共加 7 列 + 扩 1 列 + 加 1 索引。

### 4.2 字段复用与说明
- `rate VARCHAR(32)` 复用为「评分」（已查证生产用法即评分语义）
- `feedback_content` 复用，存反馈细节 JSON（按 course_type 解析不同 schema）

### 4.3 反馈细节 JSON 结构（存入 `feedback_content`）

> 所有反馈 JSON 顶层必含 `schemaVersion: 1`（用于后续演进）；后端读取时按 `course_type` + `schemaVersion` 选解析器。

#### 岗位辅导 / 模拟面试
```json
{
  "schemaVersion": 1,
  "purpose": "...",
  "concepts": "...",
  "improvements": "...",
  "performanceLevel": "excellent|good|fair|poor",
  "wishedToDo": "..."
}
```

#### 人际关系
```json
{
  "schemaVersion": 1,
  "emailQuality": 4,
  "etiquette": 5,
  "smallTalk": 8,
  "callQuality": 9,
  "thankYouEmail": 2,
  "recommendation": "yes|no|maybe",
  "narrative": "...通用反馈..."
}
```
- 总评分单独落在 `osg_class_record.rate`，**不进 JSON**
- 截图 URL 列表单独落在 `osg_class_record.screenshot_urls` 列（JSON 数组字符串：`["url1","url2",...]`），**不进 feedback_content JSON**，避免双写

#### 期中考试
```json
{
  "schemaVersion": 1,
  "score": 78,
  "questionAnalysis": "...",
  "progress": "level1|level2|level3|level4|level5"
}
```

#### 基础课程 - 简历更新
```json
{
  "schemaVersion": 1,
  "narrative": "...通用反馈...",
  "originalResumeUrl": "/oss/...",
  "updatedResumeUrl": "/oss/..."
}
```

#### 基础课程 - 新简历制作 / 咨询案例准备 / 其它
```json
{
  "schemaVersion": 1,
  "narrative": "...通用反馈..."
}
```

#### 基础课程 - 技术 / 行为训练
（三级题目 code 列表落在 `base_course_topics` 列；可选追加通用反馈）
```json
{
  "schemaVersion": 1,
  "narrative": "...可选通用反馈..."
}
```

### 4.4 旧数据策略
- 旧 `osg_class_record` 行 `reference_type / reference_id` 留 NULL，不回填
- 仅新增数据按新规则生效
- ① 栏「最近评分」、② 栏「已上报课消数」对未关联的旧记录**视为不存在**（仅统计含 reference_id 的记录）
- ① 栏「查看详情」弹窗也**不展示** `reference_id` NULL 的旧记录（与统计口径完全一致）；如需查看旧记录由教学中心模块单独入口承担

### 4.5 新增字典

#### `osg_base_course_topic`（共 32 条）

**字典 type 注册**（`sys_dict_type`）：
```sql
INSERT INTO sys_dict_type (dict_name, dict_type, status, remark, create_by, create_time)
VALUES ('基础课题目', 'osg_base_course_topic', '0',
  '{"groupKey":"course","groupLabel":"课程相关","icon":"mdi-book","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":40,"hasParent":false}',
  'admin', sysdate());
```

**字典数据**（`sys_dict_data`，dict_sort 按表中 dict_value 顺序号 ×10）：

> **字段命名澄清**：项目 `sys_dict_data` 实际无独立 `extra` 列，沿用 `remark VARCHAR(500)` 列存 JSON（与现有 `osg_region` / `osg_city` 字典惯例一致）。本表"extra (存于 remark 列)"仅作语义说明。

| dict_sort | dict_label | dict_value | dict_type | extra (存于 remark 列, JSON) |
|---:|---|---|---|---|
| 10  | 损益表 | T01 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 20  | 资产负债表 | T02 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 30  | 现金流量表 | T03 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 40  | 基础财务 | T04 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 50  | 企业价值与权益价值 | T05 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 60  | 稀释股份 | T06 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 70  | 商业意识_竞争战略 | T07 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 80  | WACC | T08 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 90  | DCF 估值 | T09 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 100 | 公众可比分析 | T10 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 110 | 先前交易分析 | T11 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 120 | 估值摘要 | T12 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 130 | 并购入门 | T13 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 140 | 吸积稀释分析 | T14 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 150 | 体育入门 | T15 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 160 | LBO 型号 | T16 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 170 | LBO 面试题及书面 LBO | T17 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 180 | 杠杆融资与杠杆债务 | T18 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 190 | 高级会计 | T19 | osg_base_course_topic | `{"category":"tech","required":true}` |
| 200 | 高级并购 | T20 | osg_base_course_topic | `{"category":"tech","required":false}` |
| 210 | DCM | T21 | osg_base_course_topic | `{"category":"tech","required":false}` |
| 220 | ECM | T22 | osg_base_course_topic | `{"category":"tech","required":false}` |
| 230 | OSG 股票推介指南 | T23 | osg_base_course_topic | `{"category":"tech","required":false}` |
| 240 | 私募股权案例研究教育 | T24 | osg_base_course_topic | `{"category":"tech","required":false}` |
| 250 | OSG 简历指南（不含 WM 功能） | B0 | osg_base_course_topic | `{"category":"behavior"}` |
| 260 | 网络交流 | B1 | osg_base_course_topic | `{"category":"behavior"}` |
| 270 | 自荐信 | B2 | osg_base_course_topic | `{"category":"behavior"}` |
| 280 | 谈谈你自己吧 | B3 | osg_base_course_topic | `{"category":"behavior"}` |
| 290 | 优势与劣势 | B4 | osg_base_course_topic | `{"category":"behavior"}` |
| 300 | 成功与失败 | B5 | osg_base_course_topic | `{"category":"behavior"}` |
| 310 | 领导故事 | B6 | osg_base_course_topic | `{"category":"behavior"}` |
| 320 | 动机 | B7 | osg_base_course_topic | `{"category":"behavior"}` |

**INSERT 模板**（remark 列存 JSON；`is_default='N'`、`status='0'`、`create_by='admin'`、`create_time=sysdate()` 全部一致）：

> **幂等保护**：本项目 `sys_dict_data` 表无 `(dict_type, dict_value)` 唯一索引（见 §00_ry_20250522.sql:482）。直接 INSERT 重复跑会产出重复行。建议每行用 `INSERT ... SELECT ... FROM dual WHERE NOT EXISTS (...)` 或在脚本头先 `DELETE FROM sys_dict_data WHERE dict_type='osg_base_course_topic'` 再 INSERT（部署只跑一次）。下方为简化展示，实施时按下列模板套：
>
> ```sql
> INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
> SELECT 10, '损益表', 'T01', 'osg_base_course_topic', NULL, NULL, 'N', '0',
>        '{"category":"tech","required":true}', 'admin', sysdate()
> FROM dual
> WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data
>                   WHERE dict_type='osg_base_course_topic' AND dict_value='T01');
> ```
> sys_dict_type 注册和 osg_admin_dict_registry 登记同样套 `WHERE NOT EXISTS` 保护。

```sql
-- 简化批量 INSERT（仅作字段值参考，部署脚本须按上述幂等模板逐行包装）
INSERT INTO sys_dict_data
  (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
VALUES
  (10,  '损益表',                       'T01', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (20,  '资产负债表',                   'T02', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (30,  '现金流量表',                   'T03', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (40,  '基础财务',                     'T04', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (50,  '企业价值与权益价值',           'T05', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (60,  '稀释股份',                     'T06', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (70,  '商业意识_竞争战略',            'T07', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (80,  'WACC',                         'T08', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (90,  'DCF 估值',                     'T09', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (100, '公众可比分析',                 'T10', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (110, '先前交易分析',                 'T11', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (120, '估值摘要',                     'T12', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (130, '并购入门',                     'T13', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (140, '吸积稀释分析',                 'T14', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (150, '体育入门',                     'T15', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (160, 'LBO 型号',                     'T16', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (170, 'LBO 面试题及书面 LBO',         'T17', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (180, '杠杆融资与杠杆债务',           'T18', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (190, '高级会计',                     'T19', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}',  'admin', sysdate()),
  (200, '高级并购',                     'T20', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate()),
  (210, 'DCM',                          'T21', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate()),
  (220, 'ECM',                          'T22', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate()),
  (230, 'OSG 股票推介指南',             'T23', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate()),
  (240, '私募股权案例研究教育',         'T24', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate()),
  (250, 'OSG 简历指南（不含 WM 功能）', 'B0',  'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}',              'admin', sysdate()),
  (260, '网络交流',                     'B1',  'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}',              'admin', sysdate()),
  (270, '自荐信',                       'B2',  'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}',              'admin', sysdate()),
  (280, '谈谈你自己吧',                 'B3',  'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}',              'admin', sysdate()),
  (290, '优势与劣势',                   'B4',  'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}',              'admin', sysdate()),
  (300, '成功与失败',                   'B5',  'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}',              'admin', sysdate()),
  (310, '领导故事',                     'B6',  'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}',              'admin', sysdate()),
  (320, '动机',                         'B7',  'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}',              'admin', sysdate());
```

**字典分组归属**：`groupKey="course"` / `groupLabel="课程相关"`。

**分组登记** — `osg_admin_dict_registry` 是数据库表（admin 字典管理页基于此驱动）。新增字典需 INSERT 一行：
```sql
INSERT INTO osg_admin_dict_registry
  (group_key, group_label, dict_type, dict_name, sort_order, icon, icon_color, icon_bg, has_parent, parent_dict_type, status, create_by, create_time)
VALUES
  ('course', '课程相关', 'osg_base_course_topic', '基础课题目', 40,
   'mdi-book', '#3B82F6', '#DBEAFE', 0, NULL, '0', 'admin', sysdate());
```
> 实施前先 `DESC osg_admin_dict_registry` 校验列名。

### 4.6 硬编码常量公共位置

#### 后端：`ruoyi-system/src/main/java/com/ruoyi/system/constant/OsgClassReportConstants.java`
```java
package com.ruoyi.system.constant;

import java.math.BigDecimal;

public final class OsgClassReportConstants {
    // 课程类型
    public static final String COURSE_TYPE_JOB_COACHING       = "job_coaching";
    public static final String COURSE_TYPE_MOCK_INTERVIEW     = "mock_interview";
    public static final String COURSE_TYPE_RELATION_TEST      = "relation_test";
    public static final String COURSE_TYPE_COMMUNICATION_TEST = "communication_test";
    public static final String COURSE_TYPE_BASE_COURSE        = "base_course";

    // 学员状态
    public static final String MEMBER_STATUS_NORMAL = "normal";
    public static final String MEMBER_STATUS_ABSENT = "absent";

    // 关联类型
    public static final String REFERENCE_TYPE_APPLICATION         = "application";
    public static final String REFERENCE_TYPE_MOCK_INTERVIEW      = "mock_interview";
    public static final String REFERENCE_TYPE_RELATION_TEST       = "relation_test";
    public static final String REFERENCE_TYPE_COMMUNICATION_TEST  = "communication_test";

    // 基础课二级类型
    public static final String BASE_CATEGORY_TECH           = "tech";
    public static final String BASE_CATEGORY_BEHAVIOR       = "behavior";
    public static final String BASE_CATEGORY_NEW_RESUME     = "new_resume";
    public static final String BASE_CATEGORY_RESUME_UPDATE  = "resume_update";
    public static final String BASE_CATEGORY_CASE_STUDY     = "case_study";
    public static final String BASE_CATEGORY_OTHER          = "other";

    // 旷课默认课时
    public static final BigDecimal ABSENT_DEFAULT_HOURS = new BigDecimal("0.5");

    private OsgClassReportConstants() {}
}
```

#### 前端：`osg-frontend/packages/shared/src/constants/classReport.ts`
```ts
export const COURSE_TYPE = {
  JOB_COACHING: 'job_coaching',
  MOCK_INTERVIEW: 'mock_interview',
  RELATION_TEST: 'relation_test',
  COMMUNICATION_TEST: 'communication_test',
  BASE_COURSE: 'base_course',
} as const

export const COURSE_TYPE_OPTIONS = [
  { value: 'job_coaching', label: '岗位辅导' },
  { value: 'mock_interview', label: '模拟面试' },
  { value: 'relation_test', label: '人际关系' },
  { value: 'communication_test', label: '模拟期中考试' },
  { value: 'base_course', label: '基础课程' },
]

export const MEMBER_STATUS = { NORMAL: 'normal', ABSENT: 'absent' } as const

export const BASE_CATEGORY_OPTIONS = [
  { value: 'tech', label: '技术' },
  { value: 'behavior', label: '行为训练' },
  { value: 'new_resume', label: '新简历制作' },
  { value: 'resume_update', label: '简历更新' },
  { value: 'case_study', label: '咨询案例准备' },
  { value: 'other', label: '其它' },
]

export const ABSENT_DEFAULT_HOURS = 0.5

// 人际关系评分项（含详细说明，文案 TBD）
export const RELATION_RATING_ITEMS = [
  { key: 'emailQuality',   label: '电子邮件质量', max: 5,  description: 'TBD' },
  { key: 'etiquette',      label: '礼仪',         max: 5,  description: 'TBD' },
  { key: 'smallTalk',      label: '闲聊',         max: 10, description: 'TBD' },
  { key: 'callQuality',    label: '通话质量',     max: 10, description: 'TBD' },
  { key: 'thankYouEmail',  label: '感谢邮件',     max: 3,  description: 'TBD' },
]
```

---

## 4A、公共抽取架构（强制执行）

> 编号说明：本章使用 `§4A` 标识，避免与 §4.5「新增字典」子节冲突。子节为 §4A.1～§4A.5。

> **架构原则**：三端弹窗"完全一致"（§3 需求 1）天然意味着 UI / 业务逻辑 / 校验器必须只有**一份实现**，否则后续任何一处修复都要改三处，违背 DRY。本节明确所有可抽取项的落位。

### 4A.1 前端公共抽取（osg-frontend/packages/shared/）

**现状**：shared 下已有 `components/` `composables/` `api/` `styles/` `types/` `utils/`，缺 `constants/` 目录（需新建）。

#### 公共组件（新增到 `shared/src/components/`）

| 组件 | 职责 | 三端使用方式 |
|---|---|---|
| `ClassReportFlowModal/index.vue` | 上报课消主弹窗（§3.2 全流程容器） | 三端各自包薄壳引用 |
| `ClassReportFlowModal/StepBasicInfo.vue` | Step 1 基础信息（学员/日期/时长） | 同上 |
| `ClassReportFlowModal/StepCourseType.vue` | Step 2 课程类型 5 选 1 | 同上 |
| `ClassReportFlowModal/StepReference.vue` | Step 3 关联申请下拉 + 基础课二三级 | 同上 |
| `ClassReportFlowModal/StepMemberStatus.vue` | Step 4 学员状态 | 同上 |
| `ClassReportFlowModal/feedbacks/JobCoachingFeedback.vue` | 岗位辅导反馈区（=模拟面试 5 项） | — |
| `ClassReportFlowModal/feedbacks/MockInterviewFeedback.vue` | 模拟面试反馈区 5 项 | — |
| `ClassReportFlowModal/feedbacks/RelationFeedback.vue` | 人际关系反馈（5 项评分 + 推荐 + 截图 + narrative） | — |
| `ClassReportFlowModal/feedbacks/MidtermFeedback.vue` | 期中考试反馈（得分/逐题/进度） | — |
| `ClassReportFlowModal/feedbacks/BaseCourseFeedback.vue` | 基础课程反馈（通用 narrative + 简历上传） | — |
| `ClassReportFlowModal/widgets/RatingInput.vue` | 评分输入（5 端复用，整数手输） | — |
| `ClassReportFlowModal/widgets/ScreenshotUpload.vue` | 截图上传（多文件 + MIME 二次校验） | — |
| `ClassReportFlowModal/widgets/ResumeUpload.vue` | 简历上传（单文件 + MIME 二次校验） | — |
| `ClassReportFlowModal/widgets/BaseCourseTopicPicker.vue` | 三级题目多选（必修 / 选修分组 + 字典加载） | — |
| `ClassRecordDetailDrawer.vue` | 求职总览①栏查看详情（按导师分组课消） | lead-mentor 用，未来其它端可复用 |

> 注：feedbacks/ 与 widgets/ 是 ClassReportFlowModal 内部子组件，不单独导出。三端各自只 import `ClassReportFlowModal`。

#### 公共 composables（新增到 `shared/src/composables/`）

| 文件 | 职责 |
|---|---|
| `useClassReport.ts` | 上报课消的状态机（form state / step state / 提交逻辑），三端复用 |
| `useReferenceFinder.ts` | 关联申请下拉数据获取（按 referenceType + studentId 调对应接口） |
| `useBaseCourseTopic.ts` | 基础课三级题目字典加载 + 必修/选修分组 |
| `useStudentScopeFinder.ts` | 学员下拉源（按 end 参数选 mentor / lead_mentor / assistant 接口） |

#### 公共 API（扩展 `shared/src/api/class-records.ts`）

```ts
// 三端共用上报接口（end 参数决定路由前缀）
export type ClassReportEnd = 'mentor' | 'lead-mentor' | 'assistant'

export function submitClassReport(end: ClassReportEnd, payload: ClassReportPayload): Promise<void>
export function getReportableStudents(end: ClassReportEnd): Promise<StudentOption[]>
export function getReferenceCandidates(end: ClassReportEnd, studentId: number, refType: ReferenceType): Promise<ReferenceOption[]>
export function getClassReportDetail(applicationId: number): Promise<ClassRecordDetail[]>
```

#### 公共类型（新增 `shared/src/types/classReport.ts`）

```ts
export type CourseType = 'job_coaching' | 'mock_interview' | 'relation_test' | 'communication_test' | 'base_course'
export type ReferenceType = 'application' | 'mock_interview' | 'relation_test' | 'communication_test'
export type MemberStatus = 'normal' | 'absent'
export type BaseCategory = 'tech' | 'behavior' | 'new_resume' | 'resume_update' | 'case_study' | 'other'

export interface ClassReportPayload {
  studentId: number
  classDate: string
  durationHours: number
  courseType: CourseType
  referenceType?: ReferenceType
  referenceId?: number
  baseCourseCategory?: BaseCategory
  baseCourseTopics?: string[]
  memberStatus: MemberStatus
  absentRemark?: string
  rate?: string
  feedbackContent?: object  // schemaVersion + 各 type 字段
  screenshotUrls?: string[]
}
```

#### 公共常量（新增 `shared/src/constants/classReport.ts`，目录待建）
（结构见 §4.6 前端段）

### 4A.2 后端公共抽取（ruoyi-system）

#### Service 层（共用一份）
- `OsgClassRecordServiceImpl` 集中实现，**三端 controller 仅做权限拦截 + 调用同一 service**
- 新增（或扩展）方法：
  - `submitClassReport(record, currentUserId, end)` — 三端共用上报，end 决定权限范围
  - `validateReferenceLegitimacy(refType, refId, studentId, currentUserId, end)` — 关联申请合法性校验
  - `serializeFeedback(courseType, payload)` — 按 course_type 序列化 JSON 写 feedback_content
  - `listReportableStudents(currentUserId, end)` — 学员下拉源

#### Controller 层（三端瘦身）
- `OsgMentorClassRecordController` / `OsgLeadMentorClassRecordController` / `OsgAssistantClassRecordController`
- 每个 controller 仅 `@PreAuthorize` 鉴权 + 调 `classRecordService.submitClassReport(record, userId, end)`
- **禁止在 controller 内重复写校验逻辑**（避免一改三改）

#### 校验器
- 新增 `OsgClassReportValidator`（位于 `ruoyi-system/src/main/java/com/ruoyi/system/validator/`）
- §5.2 五条 server-side 防护规则集中实现，三端 service 调用此校验器
- 单元测试覆盖率 100%（每条规则一个 case）

#### 常量
- §4.6 已规划 `OsgClassReportConstants` 三端共用 ✓

### 4A.3 抽取边界（哪些不抽）

| 不抽项 | 理由 |
|---|---|
| 学员求职总览页 (`job-overview/index.vue`) | 仅 lead-mentor 端，无复用诉求 |
| 各端 controller 类 | controller 是端的入口，不能合并；瘦身是目标，不是合并 |
| 各端 layout / sidebar | 端各自的导航与权限 |
| 各端登录 / 用户中心 | 端独立 |

### 4A.4 抽取后的三端代码量预期

| 端 | 上报弹窗代码量（改造前） | 改造后 |
|---|---:|---:|
| mentor `ReportModal.vue` | 675 行 | < 50 行（仅 import + props 透传） |
| lead-mentor `LeadMentorClassReportFlowModal.vue` | 1182 行 | < 50 行 |
| assistant `AssistantClassReportFlowModal.vue` | 1280 行 | < 50 行 |
| **shared `ClassReportFlowModal/`** | 0 | ~ 1200 行（一份实现） |

**收益**：三端各 1k 行 → 一份 1.2k 行，后续修复一次即可，符合"修一次解决三处"的诉求。

### 4A.5 抽取风险

- 现有三端弹窗各自有微妙业务差异（如某端学员下拉源、某端 feedback 字段缺失），抽取时需逐端 diff 比对，确保**功能并集 + 端权限差异参数化**，不丢失任何端的行为
- 抽取过程必须有 e2e 回归测试覆盖三端"原行为不变"
- 拆 ticket 时建议**抽取在阶段 1 末尾完成**，作为阶段 2 弹窗大改的基础

---

## 五、后端接口与服务改造

### 5.1 求职总览接口
- `OsgLeadMentorJobOverviewController.list`：按新 scope 语义重写过滤；新增入参；删除老入参
- `OsgUserJobOverviewServiceImpl.listByLeadMentor`：
  - 联表 `osg_class_record` 计算 `latestRating` / `lessonCount` / `lessonReported`
  - 联表 `sys_dict_data`（`osg_city`）解析 `cityLabel`
- `calendarForLeadMentor`：限定为 `lead_mentor_id = 当前用户` 范围
- `detailForLeadMentor`：扩展返回该 application 下全部课消记录（按导师分组）

### 5.2 课消上报接口

**三端现有接口路径**（实施时统一字段语义；具体接口名以代码为准）：
| 端 | Controller | 主要接口 |
|---|---|---|
| 导师端 | `OsgClassRecordController`（mentor 视角） | `POST /mentor/class-records` 上报，`GET /mentor/class-records` 列表 |
| 班主任端 | `OsgLeadMentorClassRecordController` | `POST /lead-mentor/class-records` 上报 |
| 助教端 | `OsgAssistantClassRecordController` | `POST /assistant/class-records` 上报 |

> 实施前先 Grep 校验：`grep -rn "@RequestMapping.*class-records" ruoyi-admin/src/main/java`，以现有路径为准。

**通用改造**（具体抽取范围见 §4A.2 / §4A.3）：
- 入参对象 `OsgClassRecord` 扩展新增字段（reference_type / reference_id / base_course_category / base_course_topics / absent_remark / screenshot_urls / member_status）
- 服务层根据 `reference_type` 校验 reference 合法性（属于该学员、当前用户被分配）
- 旷课分支（`member_status=absent`）：跳过反馈/评分校验，必填 `absent_remark`
- 反馈细节序列化为 JSON 写入 `feedback_content`，按 `course_type` 解析对应 schema
- 三端共用同一份 service 改造（`OsgClassRecordServiceImpl` 内统一，§4A.2），controller 仅做权限拦截

**Server-side 双层防护规则**（与 CLAUDE.md §6 一致）：
| 规则 | 说明 |
|---|---|
| reference_type / course_type 一致性 | `reference_type='application'` 必须 `course_type='job_coaching'`；`reference_type='mock_interview'` 必须 `course_type='mock_interview'`；以此类推。前端 readonly 仅作 UX，后端再校验一次 |
| 基础课无 reference | `course_type='base_course'` 必须 `reference_type IS NULL AND reference_id IS NULL` |
| 学员归属校验 | 入参 `student_id` 必须在当前用户该端权限范围内（导师→coaching.mentor_ids、班主任→lead_mentor_id 或 mentor_ids、助教→osg_student.assistant_id/_ids） |
| reference 归属校验 | `reference_id` 必须属于该 student_id，且当前用户在该 reference 的辅导关系中 |
| 字段级权限 | 评分（rate）等关键字段仅 mentor / lead-mentor / assistant 三端可写；**student 端调用任何课消上报接口直接返回 403**（即便伪造请求带上 rate 字段也禁止），违例统一返回 403 |

> 上述 5 条规则由 §4A.2 中新增的 `OsgClassReportValidator` 集中实现；三端 service 均调用同一 validator，单元测试覆盖率 100%。

### 5.3 ② 栏「上报课消」按钮联动
- 前端预填学员 + 关联申请；学员 readonly，关联申请预选可改

---

## 六、待补充清单（TBD）

| # | 项 | 章节 | 说明 | 谁补 |
|---|---|---|---|---|
| 1 | 人际关系 5 项评分详细说明文案 | §3.5.3 / §4.6 RELATION_RATING_ITEMS | 表单内每项展示评分细则；前端先用 `'TBD'` 占位 | 你后续提供 |
| 2 | 进度评估 5 档中文文案确认 | §3.5.4 | 默认按"远低于预期 / 低于预期 / 符合预期 / 高于预期 / 远高于预期"；如需调整由业务方补 | 你后续确认 |
| 3 | 截图上传后端接口 | §3.5.3 | 实施前先 grep 现有附件上传 controller；如已存在沿用，否则新建 | 实施时确认 |
| 4 | 简历上传后端接口 | §3.5.5 简历更新 | 同上，复用截图上传接口 | 实施时确认 |
| 5 | `osg_admin_dict_registry` 表结构 | §4.5 | 实施前 `DESC` 校验列名再 INSERT | 实施时确认 |

---

## 七、影响面与风险

### 7.1 改动面
- 数据库：1 张表加 7 列 + 1 张字典表新增 32 条
- 后端：
  - `OsgClassRecordServiceImpl` 三端共用方法新增（§4A.2）
  - 新增 `OsgClassReportValidator` 集中校验
  - 三端 controller 各自瘦身（仅鉴权 + 调 service）
  - 5 个接口的入参/出参字段更新（求职总览 list / calendar / detail / 课消上报 / 关联申请候选）
- 前端：
  - 1 个页面（lead-mentor 求职总览）
  - **新增** `shared/src/components/ClassReportFlowModal/`（一份实现，~ 1.2k 行）
  - **新增** `shared/src/components/ClassRecordDetailDrawer.vue`
  - **新增** 4 个 composable + 4 个 API 函数 + 公共类型 + 公共常量
  - 三端原弹窗瘦身至 < 50 行薄壳
- 测试：实施前 grep 校准（§7.4），spec 迁移规则见 §7.4.1

### 7.2 风险
- `rate` 字段语义切换：经代码 review 确认全部当评分用，**风险低**；上线后保留监控 1 个迭代
- 旧课消数据无 `reference_id`：① ② 栏统计「视为不存在」，旧学员页面历史数据不参与新统计；如业务方反馈需展示，再做迁移脚本
- 重叠不去重：① ② 栏数据可能同时显示同一 application；UX 验收若有反馈，再做去重决策

### 7.3 建议交付节奏（仅建议，待最终决定）
- **阶段 1（约 1 周）**：求职总览三栏改造 + 课消表 schema + 后端按 application 维度统计
  - ② 栏上报按钮**仅预填学员名**，打开**现有**弹窗（不带 reference 反推锁定，§3.2 描述的反推锁定属于阶段 2）
  - 阶段 1 期间，老弹窗提交时 `reference_id` 留 NULL（与 §4.4 旧数据策略一致）
  - ② 栏「已上报课消数」初期对全部历史数据为 0，符合 §3.4.1 锚点
  - ① 栏「查看详情」对 `reference_id` NULL 的旧记录**不展示**（与统计口径一致，§4.4 + §5.1 同步约束）
- **阶段过渡（约 1 周）**：完成 §4A 公共抽取
  - 前端：建 `shared/src/components/ClassReportFlowModal/`、composables、api、types、constants（§4A.1）
  - 后端：抽 `OsgClassReportValidator`、`OsgClassRecordServiceImpl` 三端共用化（§4A.2）
  - 三端弹窗薄壳改造（< 50 行，§4A.4）
  - 此阶段**不引入新业务字段**，仅做"行为不变重构"，配合三端 e2e 回归
  - 完成后阶段 2 才能开始（阶段 2 = 在 shared 弹窗里加新字段，避免一改三改）
- **阶段 2（约 2 周）**：基于 §4A 抽取的 shared 弹窗，按本方案 §3 全部改造 + 字典 / 常量 / 反馈 JSON / 截图上传
  - 阶段 2 上线后所有新课消都带 `reference_id`，② 栏统计开始累积
  - ② 栏按钮升级为 §3.2 描述的反推锁定模式

> **阶段 1 重复提交说明**：阶段 1 老弹窗提交规则不受 §3.4.2 约束（老弹窗的旧记录 reference_id NULL，天然不参与 ②栏统计与 §3.4.2 重复策略）。§3.4.2 仅适用于阶段 2 新弹窗提交且带 reference_id 的记录。

### 7.4 测试 spec 改动清单（实施前 grep 校准）
预估影响 spec 数量基于：
```
grep -rln "LeadMentorJobOverview\|ClassReport\|ClassRecord" osg-frontend/packages/{lead-mentor,mentor,assistant}/src/__tests__
grep -rln "LeadMentorJobOverview\|ClassRecord" ruoyi-{system,admin}/src/test
```
拆 ticket 前需运行上述命令产出实际清单（替换 §7.1 的"约 15 个"估算）。

### 7.4.1 公共抽取 PR 内的 spec 迁移规则（与 §4A 配套）
- 三端 `__tests__/` 下原弹窗内部行为类用例（字段渲染、条件分支、提交逻辑）→ 迁到 `shared/src/__tests__/ClassReportFlowModal/`
- 三端各自仅保留 **薄壳级 spec**：import 测试 + 端权限相关 spec（如 mentor 端学员下拉源限定）
- 删除原三端弹窗的重复测试以避免双维护
- 迁移动作随 §4A 抽取 PR 一并提交，禁止单独 PR（保持原子性）

---

## 八、验收标准

### 8.1 求职总览
- [ ] Tab 顺序与默认与 §2.1 一致
- [ ] 顶部无「学员姓名」「全部类型」筛选
- [ ] ① 栏面试日历仅在该 tab 内显示
- [ ] ① 栏「最近评分」按 §2.3 规则取值，旷课跳过
- [ ] ① 栏「查看详情」按导师分组、时间倒序，含总课时与评分平均
- [ ] ② 栏「已上报课消数」含旷课
- [ ] ② 栏「上报课消」按钮预填学员 readonly + 关联申请预选
- [ ] ③ 栏「提交时间」= `application.submitted_at`
- [ ] 城市列展示 `osg_city` label（不展示大区）
- [ ] ② 栏多 mentor 共辅导同一 application 时，每个 mentor 看到的「已上报课消数」一致（§3.4.1 视角说明）

### 8.2 三端弹窗
- [ ] 三端字段、布局、条件分支完全一致
- [ ] 学员下拉范围按各端权限过滤
- [ ] 学员下拉为空时显示空状态文案 + 提交按钮 disabled
- [ ] 表单流程符合 §3.2
- [ ] 旷课分支：时长默认 0.5、仅显示旷课备注、跳过反馈/评分
- [ ] 重复上报不阻断（§3.4.2）：覆盖正常上课重复 + **基础课旷课重复**两类用例
- [ ] 学员下拉空状态文案 `当前账号暂无可上报学员` + 提交按钮 disabled（spec 文件名 TBD，拆 ticket 时落点）
- [ ] 5 类课程类型反馈区符合 §3.5
- [ ] 基础课程二级硬编码 + 三级字典化 + 必修/选修分组
- [ ] 三级题目必修必选规则按 §3.5.5
- [ ] 模拟面试反馈含「希望做但没做的事情」
- [ ] 人际关系反馈含截图上传 + 总评分落 rate 字段
- [ ] 简历更新文件落 feedback_content JSON、不新增列
- [ ] 不显示课时费
- [ ] Server-side 双层防护规则（§5.2）：reference_type / course_type 一致性、学员归属、reference 归属、字段权限

### 8.3 数据库
- [ ] `osg_class_record` 新加 7 列
- [ ] `osg_base_course_topic` 字典 32 条
- [ ] 公共常量文件落位（后端 + 前端）
- [ ] 手测字典数据命令：`mysql -e "SELECT dict_sort,dict_value,dict_label FROM sys_dict_data WHERE dict_type='osg_base_course_topic' ORDER BY dict_sort"` 应返回 32 行，且 T01=损益表、T20=高级并购、B0=OSG 简历指南（不含 WM 功能）、B7=动机

### 8.3.1 公共抽取（§4A）
- [ ] 前端 `shared/src/components/ClassReportFlowModal/` 按 §4A.1 落位
- [ ] 前端 `shared/src/components/ClassRecordDetailDrawer.vue` 落位且供 lead-mentor 求职总览①栏复用
- [ ] 三端各自上报弹窗回归 spec 通过（mentor / lead-mentor / assistant 各自原行为不变）
- [ ] 前端 `shared/src/composables/useClassReport.ts` 等 4 个 composable 落位
- [ ] 前端 `shared/src/api/class-records.ts` 扩展 4 个 API 函数
- [ ] 前端 `shared/src/types/classReport.ts` 公共类型定义落位
- [ ] 前端 `shared/src/constants/classReport.ts`（含新建 constants 目录）
- [ ] 三端各自的 ReportModal 瘦身至 < 50 行（仅 import + props 透传）
- [ ] 后端 `OsgClassRecordServiceImpl` 三端共用（controller 仅鉴权 + 调用）
- [ ] 后端 `OsgClassReportValidator` 集中校验，单测覆盖 100%
- [ ] 三端 e2e 回归（mentor 上报 → lead-mentor 求职总览统计变化）

### 8.4 测试覆盖率（项目规范）
- [ ] backend / database / test：分支覆盖率 100%、行覆盖率 ≥ 90%
- [ ] frontend（求职总览页、上报弹窗 .vue）：行覆盖率 ≥ 80%
- [ ] frontend-ui（纯样式/布局组件，如有）：行覆盖率 ≥ 70%
- [ ] 现有 spec 同步更新（约 15 个相关 spec，详见 §7.1）

---

## 九、修改历史

| 日期 | 作者 | 变更 |
|---|---|---|
| 2026-05-09 | huangxin | 初稿 |
| 2026-05-09 | huangxin | 第一轮校验修正：补 §3.2 基础课分支、§3.4 基础课旷课处理、§3.5.3/3.5.4 枚举中文、§3.5.5 笔误注释、§4.5 字典 32 条全列、§4.6 常量补 import、§5.2 三端接口路径、§8.4 测试覆盖率 |
| 2026-05-09 | huangxin | 第二轮螺旋校验修正：§3.1 学员下拉源精确化（DISTINCT student）、§3.2 ②栏预填特殊路径、§3.4.1 已上报课消数与最近评分统一锚点、§3.5.3 截图上传安全约束、§3.5.5 简历更新落 JSON、§3.5.5 三级题目必修必选规则、§3.6 评分边界、§4.1 ALTER 幂等迁移 + feedback_content 扩 TEXT + screenshot_urls 改 TEXT、§4.3 JSON 加 schemaVersion、§4.5 remark 列存 JSON 澄清 + INSERT 32 行展开、§4.5 osg_admin_dict_registry 登记 SQL、§5.1 calendar 缓存提示、§6 TBD 收口至 5 项、§7.3 阶段过渡说明、§7.4 测试 spec grep 命令 |
| 2026-05-09 | huangxin | 第三轮螺旋校验修正：§3.4.1 lessonCount=application 维度语义澄清、§3.4.2 重复上报策略（允许）、§3.1 学员下拉空状态兜底、§3.5.5 简历单文件约束、§4.4 旧记录①栏详情不展示、§4.5 字典 INSERT 幂等保护（WHERE NOT EXISTS）、§5.2 Server-side 双层防护规则 5 条、§7.3 阶段 1/2 过渡明确、§8.2 验收清单补足 |
| 2026-05-09 | huangxin | 第四轮收口：§7.3 阶段 1 与 §3.4.2 关系澄清、§3.5.5 简历两槽位独立 ≤10MB、§5.2 student 端禁写明文、§8.1 多 mentor lessonCount 一致验收、§8.2 基础课旷课重复 + spec 文件名 TBD 验收 |
| 2026-05-09 | huangxin | 第五轮架构补充：新增 §4A 公共抽取架构（前端 shared 组件 / composable / api / types / constants 全部抽取；后端 service / validator 集中实现；三端弹窗瘦身至 < 50 行；§8.3.1 抽取验收清单） |
| 2026-05-09 | huangxin | 第六轮统一收口：§四点五 → §4A 解决编号冲突；§7.3 加"阶段过渡（公共抽取约 1 周）"；§4.3 人际关系截图落 screenshot_urls 列澄清不双写；§7.4.1 spec 迁移规则；§3.1 / §5.2 / §7.1 加 §4A 引用呼应；§8.3.1 加 ClassRecordDetailDrawer + 三端回归 spec 验收 |
