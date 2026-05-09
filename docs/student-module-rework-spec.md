# 学生列表模块整改梳理

> 日期：2026-05-07（决策固化）  
> 范围：admin 端「学员列表」页 + 新增弹窗 + 编辑弹窗 + 详情弹窗  
> 状态：**Q1–Q8 已全部确认，等批准后从阶段 A 开始**

---

## 一、问题清单（12 项）

| # | 类别 | 问题 |
|---|---|---|
| P1 | 视觉 | 新增·学校栏：输入时光标靠上 |
| P2 | 视觉 | 新增 / 编辑 / 详情 三个弹窗页面长度不一致、内容也不一致 |
| P3 | 字段 | 编辑、详情没显示「班主任 / 助教」的多选项 |
| P4 | 字段 | 新增·学校：要支持多选（**确认要做**：读研/双学位等场景） |
| P5 | 字段 | 新增·毕业年份 → 改成「毕业年月」日历组件，可选范围 = 当前 ~ +3 年 |
| P6 | 文案 | 「读研延毕」改名为「学业状态」 |
| P7 | 校验 | 新增·合同附件：必传，accept = `.pdf,.png` |
| P8 | Bug | 新增·合同附件：上传 PDF 时变红 → **根因是上传失败**，需排查 `/api/common/upload` |
| P9 | 文案 | 详情页「学生资料台账」说明文字删除 |
| P10 | 字段 | 详情、编辑都看不了合同附件 |
| P11 | 业务 | 编辑·账号状态：可修改，新枚举 = 正常 / 冻结 / 退费 / 合同结束（含状态机 + 各状态下能力） |
| P12 | 业务 | 列表「提醒」列：服务即将到期、服务已到期、课时即将耗尽（剩 ≤20）、课时已耗尽 |

---

## 二、决策汇总（已确认）

| 编号 | 问题 | 决策 |
|---|---|---|
| Q1 | 合同结束 + 课时=0，能否申报课消？ | **不能** |
| Q2 | 黑名单与 4 状态关系 | **独立维度**（列表已有独立 tab） |
| Q3 | 合同到期不自动跳「合同结束」 | **是**，仍显示"正常"；提醒列独立标"服务已到期" |
| Q4 | 「服务即将到期」阈值 | **30 天** |
| Q5 | 「课时即将耗尽」阈值 | **剩 ≤ 20** |
| Q6 | 学校多选 | **要做**（业务确认：读研/双学位） |
| Q7 | 班主任/助教多选 | **可绑多个**，统一用 `@osg/shared/components/MultiSelect` |
| Q8 | 分阶段提交 | 5 阶段，A→B→C→D→E |

附件相关补充：
- 支持格式：`.pdf` `.png`
- 上传失败显示红色 = 后端 `/api/common/upload` 错误，需要排查

---

## 三、字段对照表（Add / Edit / Detail / 后端字段）

| 字段 | 新增 Add | 编辑 Edit | 详情 Detail | 后端 StudentListItem | 整改 |
|---|---|---|---|---|---|
| 英文姓名 | ✓ | ✓ | ✓ | studentName | — |
| 性别 | ✓ | ✓ | ✓ | (详情接口) | — |
| 邮箱 | ✓ | ✓ | ✓ | email | — |
| 班主任 | 多选 | ✗ 单选 | ✗ 单选 | leadMentorId(单) | **三处统一 MultiSelect**；后端扩 `leadMentorIds[]` |
| 助教 | 多选 | ✗ 单选 | ✗ 单选 | assistantId(单) | **三处统一 MultiSelect**；后端扩 `assistantIds[]` |
| 学校 | 单选 | 单选 | 单选 | school(string) | **三处改 MultiSelect**；DDL `school` 扩 VARCHAR(512)；后端 CSV 化 |
| 专业 | ✓ | ✓ | ✓ | major | — |
| 毕业年月 | 数字(年) | 字符串(年) | 年份 | graduationYear | **改 month-picker，范围 today~today+3y**；后端字段类型保持 |
| 高中 | ✓ | ✗ | ✓ | — | Edit 补 |
| 学业状态(原读研延毕) | ✓ | ✗ | ✓ | — | 文案改 + Edit 补 |
| 签证 | ✓ | ✗ | ✓ | — | Edit 补 |
| 求职地区 | ✓(多) | ✓(多) | ✓ | targetRegion(CSV) | — |
| 招聘周期 | ✓(多) | ✗ | ✓ | recruitmentCycle(CSV) | Edit 补 |
| 主攻方向 | 多选 | 单选 | ✓ | majorDirection(CSV) | Edit 改多选 |
| 子方向 | 多选 | 单选 | ✓ | sub_direction(CSV) | Edit 改多选 |
| 电话 | ✓ | ✓ | ✓ | — | — |
| 微信 | ✓ | ✓ | ✓ | — | — |
| 备注 | ✗ | ✓ | ✗ | — | **Add 补 / Detail 补** |
| 账号状态 | — | readonly | ✓ | accountStatus | **Edit 改可改（新状态机）** |
| 合同附件 | 上传 | ✗ | ✗ | (合同接口) | **Edit/Detail 加下载链接** |
| 登录账号 / 初始密码 | ✓只读 | — | — | — | Add 专用 |
| 币种/金额/课时/合同日期/合同备注 | ✓ | — | (合同 Tab) | — | 合同独立，Edit 不重复 |

---

## 四、视觉/控件不统一现状

- **AddStudentModal.vue**（1271 行）：自定义 `add-student-modal__*` BEM，分 section 卡片化，badge + grid，控件 ant 默认 medium 32px（部分混用）
- **EditStudentModal.vue**（571 行）：纯 `<a-row><a-col>`，无 section/badge，无 BEM，控件全 ant 默认（看起来明显大）
- **StudentDetailModal.vue**（1051 行）：自定义 `sdm-*` 只读 field/value，与 form 视觉无关——**确认：详情样式不动，仅补字段**

---

## 五、整改方案（5 阶段）

### 阶段 A：纯前端低风险整改（约 1 天，无后端依赖）

| # | 任务 | 落点 |
|---|---|---|
| A1 | 修学校栏光标靠上：`:deep(.ant-select-selector)` 行高对齐 | AddStudentModal + 共享样式 |
| A2 | 控件尺寸统一收紧：input/select/picker 32px、form-item margin-bottom 12px、label 13px | 共享样式 |
| A3 | 「读研延毕」→「学业状态」（仅文案） | Add + Detail |
| A4 | 毕业年份 → 「毕业年月」month-picker，范围 `today` ~ `today+3y` | Add + Edit |
| A5 | 合同附件必传校验 + accept `.pdf,.png` | Add（rules + a-upload-dragger accept） |
| A6 | 排查 PDF 上传变红根因（确认上传接口报错原因，修后端或前端 token） | Add + 后端 `/api/common/upload` |
| A7 | 详情页「学生资料台账」说明文字删除 | Detail |
| A8 | Add 加「备注」字段 | Add |
| A9 | **Detail** 展示「合同附件」下载链接 | 调 `/admin/student/{id}/contracts` 取 contractAttachment 渲染（Edit 的合同附件展示推迟到 B2 重写时一起做，避免重复改两遍） |

### 阶段 B：Edit 弹窗重写 + 视觉统一（约 1-2 天，依赖 B5）

| # | 任务 | 备注 |
|---|---|---|
| B1 | 抽 `student-form.scss` 共享样式（class 前缀统一为 `student-form-modal__*`） | |
| B2 | EditStudentModal 完全重写：复用 Add 同款 section/grid/badge | |
| B3 | Edit 补漏：高中 / 学业状态 / 签证 / 招聘周期 | |
| B4 | Edit / Add / Detail：班主任 / 助教 / 主攻方向 / 子方向 全部用 `MultiSelect` 公共组件（**学校不在此列**，留到 C 阶段，避免前后端协议错位） | |
| B5 | 后端 `UpdateStudentPayload`、`AddStudentPayload` 扩展数组字段：`leadMentorIds[]` / `assistantIds[]` / `majorDirections[]` / `subDirections[]`；旧单值字段保留兼容（兼容期 1 release） | **后端配合** |
| B5b | 后端 list SQL 同步改造：筛选条件 `leadMentorId=?` → `FIND_IN_SET(#{leadMentorId}, lead_mentor_ids)`（同 assistantId/majorDirection），否则筛选返回为空 | **后端配合** |
| B5c | 兼容期协议：**前端 Edit/Add 提交时只发数组字段** `*Ids[]`；后端读到数组后写入新关联表/CSV 列，同时把第 0 个 ID 回写旧单值字段 `leadMentorId` 维持兼容；list 接口同时返回 `leadMentorId`（取数组首项）+ `leadMentorIds[]` 两种字段；1 个 release 后下线旧字段 | **前后端协议** |
| B6 | Detail 班主任/助教改 pill 列表展示 | 详情样式不重写，仅补字段 |
| B7 | 编辑弹窗合同附件下载链接（与 A9 同一接口，集成到重写后的 Edit 中一次成型） | |

### 阶段 C：学校多选（约 1 天，DDL + 后端 + 前端）

| # | 任务 | 备注 |
|---|---|---|
| C1 | DDL：`osg_student.school` VARCHAR(128) → **VARCHAR(512)** | 沿用 CSV 约定（同 `recruitment_cycle` / `target_region`） |
| C2 | 后端 `*Payload.school` 改 `List<String>`，service `String.join(",")` 写库 | |
| C3 | 后端 list 返回 `school: String[]`（split `,`）；筛选改 `FIND_IN_SET(#{school}, school)` | |
| C4 | 前端 Add/Edit/Detail 学校字段改 `MultiSelect` | |
| C5 | 列表筛选保持单选下拉（按"包含"匹配） | |

### 阶段 D：账号状态状态机（约 2-3 天，独立 story）

#### 状态枚举与能力矩阵（按 Q1/Q2 已确认）

| 状态 | 触发 | 可登录 | 可看求职 | 导师可申报课消 | 转换路径 |
|---|---|---|---|---|---|
| 正常 | 默认 / 冻结→正常 / 复活 | ✓ | ✓ | ✓ | → 冻结 / 退费 / 合同结束 |
| 冻结 | 手动 | ✗ | ✗ | ✗ | → 正常（手动恢复）|
| 退费 | 手动 | ✗ | ✗ | ✗ | → 正常（**必须续签合同**）|
| 合同结束 | 手动 | ✓ | ✗ | ✓（**仅当剩余课时 > 0**）/ ✗（剩余课时=0） | → 正常（**必须续签合同**）|
| 黑名单 | `isBlacklisted=true` 独立维度 | ✓ | ✗ | ✓ | 不属于状态机 |

> **Q1 决策**：合同结束 + 课时=0 → 禁止课消申报  
> **Q2 决策**：黑名单独立 tab/标志，与 4 状态正交  
> **Q3 决策**：合同到期不自动跳合同结束，状态保持"正常"，提醒列独立标"服务已到期"

#### 实施

**前端**：
- 编辑弹窗：账号状态字段从 readonly 改成 `<a-select>` 可改
- 状态变更需二次确认（特别是退费、合同结束）
- 切到退费/合同结束时提示"该学员后续复活需走续签合同流程"

**后端**：
- `PUT /admin/student/status` 已存在，扩枚举 + 转换校验
- 登录拦截（`OsgStudentAuthController`）：冻结/退费禁止登录
- 求职数据接口拦截：合同结束/黑名单 屏蔽求职接口
- 课消申报拦截：冻结/退费禁止；合同结束 + 剩余课时=0 禁止；合同结束 + 剩余课时>0 允许

### 阶段 E：列表「提醒」列（约 1 天）

#### 关键定义（避免歧义）

- **当前生效合同**：`osg_contract WHERE student_id=? AND contract_status NOT IN ('ended','refunded') AND end_date >= CURDATE()` 中 `start_date` 最近的一条；如全部已结束/退费，取 `end_date` 最大的一条作为兜底
- **合同到期日 (end_date)**：取「当前生效合同」的 `end_date`
- **剩余课时 (remaining_hours)**：取「当前生效合同」的 `total_hours - SUM(已审核通过的课消课时)`；多份合同**不**合并（避免历史已结束合同的剩余课时干扰当前预警）

#### 触发规则

| 触发条件 | 文案 | 颜色 |
|---|---|---|
| `end_date` ≤ 今天+30 天 且 > 今天 | 服务即将到期 | warning |
| `end_date` < 今天 且 `accountStatus = 正常` | 服务已到期 | error |
| `remaining_hours` ≤ 20 且 > 0 | 课时即将耗尽 | warning |
| `remaining_hours` ≤ 0 | 课时已耗尽 | error |
| 待审核 | 待审核 | info |

提醒可叠加多个，列表里用 a-tag 列展示。

#### 实施
- **后端**：`/admin/student/list` 计算 `reminders: string[]`（数组，不是单字符串）；按上述定义实现 SQL/Service 计算
- **前端**：列表「提醒」列 v-for 多个 a-tag

---

## 六、推进顺序

1. **第一波 (阶段 A)**：纯前端速赢，11 项一次提交  
2. **第二波 (阶段 B)**：Edit 重写 + 视觉统一（前端），后端 B5 同步开发  
3. **第三波 (阶段 C)**：学校多选（DDL + 后端 + 前端，独立 PR）  
4. **第四波 (阶段 D)**：账号状态机（独立 story）  
5. **第五波 (阶段 E)**：列表提醒（独立 PR）

阶段 B/C/D/E 都涉及后端，每波独立 PR 便于回滚。

---

## 七、当前状态

- ✅ 决策已固化（Q1-Q8）
- ⏳ 等批准开始阶段 A（纯前端，无后端依赖，可立刻开工）
