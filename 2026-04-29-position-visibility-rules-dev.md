# 岗位可见性规则 — 开发文档

> 日期：2026-05-01
> 配套 PRD：`2026-04-29-position-visibility-rules-prd.md`（已业务方二轮确认）
> 范围：本文档严格依据 PRD §1–§6 + 现有代码事实推导，不扩展任何 PRD 未提及的功能。

---

## 0. 文档使用约定

| 标记 | 含义 |
|---|---|
| ✅ | 现状已满足，无须改造 |
| ✏️ | 需要改造 |
| ➕ | 新增 |
| ❌ | 删除 / 取消 |
| 📋 | 仅迁移数据 / 字典维护，无代码改动 |

所有 PRD 条目通过 `[PRD §x.y #n]` 反向溯源；所有改造点都对应 §10 traceability 表的一行。

---

## 1. 范围（In-Scope / Out-of-Scope）

### 1.1 In-Scope（本期交付）

| 维度 | 内容 | 来源 |
|---|---|---|
| 数据库 | `osg_position` 新增 `target_majors` 字段；`osg_student` 三个字段单值改多值 | PRD §6.1 #1–#4 |
| 后端 | 学生端可见性匹配服务（三规则交集）；助教端聚合接口（学生命中并集） | PRD §6.2 #5–#6 |
| 前端 - student | profile 三字段改多选；空态触发条件扩充至"任一字段为空" | PRD §6.3 #8–#9 |
| 前端 - assistant | 列表数据源切换为新接口；展示 `target_majors` 列 | PRD §6.3 #10 + §1.2 + Q9 |
| 前端 - admin | 岗位新增/编辑表单加 `target_majors` 必填多选；列表/详情展示与筛选 | PRD §6.3 #11 + Q9 |
| 前端 - shared | `DirectionCascade.vue` 字典化（去掉硬编码 4 主方向） | PRD §6.3 #12 |
| 前端 - lead-mentor | 列表/详情新增 `target_majors` 列展示（不加筛选项） | PRD §1.2 + Q9 |
| 数据迁移 | 学生 3 字段单值 → 多值（自动）；岗位 `target_majors` 业务方手工补齐（工程不做兜底） | PRD §6.4 #13–#14 + Q8 |

### 1.2 Out-of-Scope（PRD 已明确取消 / 现状已满足 / 本期工程可选裁剪，本期不做）

| 项 | 原因 |
|---|---|
| 班主任端解除 `displayStatus="visible"` 硬编码 | PRD §6.5 一轮 Q11 a/b/c 二轮推翻 |
| 班主任端 UI 增加"未在学生端展示"提示 / 状态筛选器 | PRD §6.5 Q17/Q18 |
| 班主任端筛选项加"主攻方向" | PRD §1.2 表："不加主攻方向" |
| 助教端筛选项加"主攻方向" | PRD §1.2 表："不加主攻方向" |
| 班主任端按大区/班主任过滤后端逻辑 | PRD §1.2 + Q23 = "全平台 visible 跨大区"；现状 `OsgLeadMentorPositionServiceImpl#normalizeQuery:94-110` 只强制 `displayStatus`，无大区/班主任绑定，✅ 已满足 |
| 导师端"看不到岗位" | `osg-frontend/packages/mentor/src/layouts/MainLayout.vue:64-150` 求职中心仅含「学员求职总览」「模拟应聘管理」两项，无岗位入口，✅ 已满足（PRD §5 Q22） |
| 学生端引导跳转 `/profile` | `osg-frontend/packages/student/src/views/positions/index.vue:33` 已有 `router.push('/profile')`，✅ 已满足（PRD §5 Q25） |
| `osg_position.city` 字段去留 | PRD §5 Q21 = 保留前端展示，不参与匹配，✅ 已满足，无改动 |
| 字典补齐"计算机科学" | `sql/osg_admin_dict_seed.sql:87` 已有 `(50, '计算机 / Computer Science', 'computer_science', ...)`，✅ 已满足，PRD §6.4 #15 跳过 |
| 助教端 drill-down / stats / students 三个旧端点 | 本期保留不动（与新增 `/list` 共存）；PRD §6.3 #10 仅要求改主列表，drill-down 是按行业-公司分组的另一视图维度，删除会超出 PRD 范围 |

---

## 2. 数据库变更

### 2.1 `osg_position`

| 改动 | DDL 片段 | PRD 来源 |
|---|---|---|
| ➕ 新增 `target_majors` | `ALTER TABLE osg_position ADD COLUMN target_majors VARCHAR(255) NOT NULL DEFAULT '' COMMENT '对应学生主攻方向，逗号分隔 dict_value';` | §6.1 #4 |

> **注**：DDL 默认值用 `''` 而非 `NULL`，是因为 PRD Q6=必填、Q8=业务方上线前手工补齐。空字符串语义 = "未补齐"，迁移上线脚本完成后业务方逐条编辑补齐；学生端三规则匹配时 `target_majors=''` 必然匹配不到任何学生主攻方向（集合相交规则，§5 服务层），符合"未补齐就看不到"的安全默认。

### 2.2 `osg_student`

| 字段 | 当前 | 目标 | PRD 来源 |
|---|---|---|---|
| ✏️ `major_direction` | `VARCHAR(64)` 单值 | `VARCHAR(255)` 逗号分隔多值 | §6.1 #1 |
| ✏️ `recruitment_cycle` | `VARCHAR(32)` 单值 | `VARCHAR(255)` 逗号分隔多值 | §6.1 #2 |
| ✏️ `target_region` | `VARCHAR(128)` 单值 | `VARCHAR(255)` 逗号分隔多值 | §6.1 #3 |

> 现状字段定义：`deploy/mysql-init/07_osg_student_init.sql:10-37` + `OsgStudent.java:26-34`。

### 2.3 数据迁移 SQL（一次性 upgrade 脚本）

```sql
ALTER TABLE osg_position ADD COLUMN target_majors VARCHAR(255) NOT NULL DEFAULT '' COMMENT '对应学生主攻方向';
ALTER TABLE osg_student MODIFY COLUMN major_direction VARCHAR(255) NULL COMMENT '主攻方向（多选，逗号分隔）';
ALTER TABLE osg_student MODIFY COLUMN recruitment_cycle VARCHAR(255) NULL COMMENT '招聘周期（多选，逗号分隔）';
ALTER TABLE osg_student MODIFY COLUMN target_region VARCHAR(255) NULL COMMENT '求职地区（多选大区，逗号分隔）';
```

> **不做大写键值归一化**（业务方决策 Q1=D，2026-05-01）：存量 `osg_student.major_direction` / `osg_staff.major_direction` 中的大写键值（`Finance` / `Consulting` / `Tech` / `Quant`）保持不动；字典化上线后这些值在新组件下查不到 → UI 显示为空 → 学生需重新选一遍 profile 才能在岗位匹配中生效（详见 §11.4 R6）。
>
> 学生 3 字段从单值变多值不需要 UPDATE：原值就是多值集合中的唯一元素，前后端按"逗号分隔"读取时，无逗号的字符串等于单元素数组（PRD §5 Q20）。

---

## 3. 后端变更

### 3.1 实体类

| 类 | 改动 | 文件 |
|---|---|---|
| `OsgPosition` | ➕ 新增 `private String targetMajors;` + getter/setter | `ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgPosition.java` |
| `OsgPositionMapper.xml` | ✏️ resultMap、`<sql>` 列、`selectPositionList`、`selectVisiblePublicPositionList`、`insert*`、`update*` 全部加 `target_majors` | `ruoyi-system/src/main/resources/mapper/system/OsgPositionMapper.xml` |

学生实体（`OsgStudent.java`）三字段类型已是 `String`，仅语义从单值改多值，**Java 层无字段改造**；序列化层（前端 / 接口）按"逗号分隔字符串 ↔ List<String>"统一处理。

### 3.2 新服务：学生可见性匹配（PRD §6.2 #5）

➕ `IOsgStudentPositionVisibilityService`（新建于 `ruoyi-system/.../service/`）

```java
public interface IOsgStudentPositionVisibilityService {
    /**
     * 三维交集判定：招聘周期 ∧ 大区 ∧ 主攻方向，全部满足才返回 true。
     * 任一学生字段为空 → 直接返回 false（即"列表为空 + 引导补全"，PRD §1.2 + Q10）。
     */
    boolean isVisibleToStudent(OsgPosition position, OsgStudent student);

    /** 批量过滤：用于学生端 list 接口与助教端聚合接口复用。 */
    List<OsgPosition> filterVisible(List<OsgPosition> positions, OsgStudent student);
}
```

实现要点：
- 三字段都按 `,` split 成 `Set<String>`，调用 `Collections.disjoint` 取反作为"任一相交"。
- `target_region` 只比较大区（PRD Q3 a），城市字段不参与。
- 学生任一字段为 `null/empty` → 立即返回 `false`，**不退化到"忽略该维度"**（PRD §1.2 + Q10 = 列表为空 + 引导补全）。

### 3.3 改造：学生端 list 接口

✏️ 在 `OsgStudentPositionController#list`（`ruoyi-admin/.../OsgStudentPositionController.java:20,29` — `@RequestMapping("/admin/student-position")` + `@GetMapping("/list")`）的 `selectPositionList` 结果之后，叠加 `IOsgStudentPositionVisibilityService.filterVisible(currentStudent)`。

> **路由说明**（已核实，无须改造）：
> - 后端唯一真实路径：`/admin/student-position/list`
> - 前端 shared API `listStudentPositions()` 调 `/student/position/list`（`positions.ts:147`），通过网关/baseURL rewrite 落到后端 `/admin/student-position/list`
> - e2e 拦截 `**/api/student/position/list` 印证此 rewrite（`student/e2e/positions.e2e.spec.ts:83`）
> - **本期不动 controller path、不动前端 path、不动 rewrite 配置**，仅在 controller 内部叠加可见性过滤

### 3.4 新接口：助教端聚合（PRD §6.2 #6 + Q12 + Q19 b）

➕ 新增 `IOsgAssistantPositionVisibilityService.listForAssistant(Long assistantId)`：
1. 拉取 `osg_student WHERE assistant_id = :assistantId`（参考 `OsgAssistantAccessService:98-111` 已有查询）。
2. 加载所有 visible 岗位（复用 `OsgPositionMapper.selectVisiblePublicPositionList` 或等价查询）。
3. 对每个学生跑 `IOsgStudentPositionVisibilityService.filterVisible`。
4. 按 `positionId` 取并集，回填 `studentCount` = 命中该岗位的所带学生数。

➕ Controller 端点：`OsgAssistantPositionController`（`ruoyi-admin/.../OsgAssistantPositionController.java`）新增 `GET /assistant/positions/list`，返回平铺列表（与 `getLeadMentorPositionList` 同形态，便于前端复用渲染）。**保留** 现有 `drill-down` / `stats` / `students` 端点不动（PRD 未要求删）。

### 3.5 班主任端

| 模块 | 改动 |
|---|---|
| `OsgLeadMentorPositionServiceImpl` | ✅ **不改业务逻辑**（PRD §6.5），仅 `toPositionRow` 增加 `targetMajors` 字段（用于列表展示，PRD Q9） |
| Mapper / SQL | ✏️ 已含 `target_majors` 列（§3.1 全局改造） |
| Meta `/lead-mentor/positions/meta` | ✅ 不动 |

### 3.6 admin 端

| 模块 | 改动 |
|---|---|
| `OsgPositionController` 增删改接口 | ✏️ 入参/出参对象增加 `targetMajors`，校验：必填 + 值必须是 `osg_major_direction` 字典的合法 dict_value 子集 |
| 校验位置 | Controller 层 + Service 层双写：Controller 用 `@NotBlank`/`@Pattern`，Service 用字典白名单校验（防止前端绕过） |
| 序列化层 | 前端 `string[]` ↔ DB/实体 `String`(逗号分隔) 在**请求 DTO** 完成 join/split：admin 增删改用 `OsgPositionRequest`（如已有则扩字段），其 `targetMajors: List<String>` 字段在 `toEntity()` 转换时 `String.join(",", ...)`；`fromEntity()` 时反向 `Arrays.asList(value.split(","))`。Mapper / 实体类内部统一用 `String`，避免 TypeHandler。学生端 / 助教端 / lead-mentor 端列表的出参 `target_majors` 直接以逗号分隔字符串透出，由前端 split 渲染（与现有 `recruitment_cycle` 处理一致） |

---

## 4. 前端变更

### 4.1 shared — `DirectionCascade.vue` 字典化（PRD §6.3 #12）

文件：`osg-frontend/packages/admin/src/views/users/students/components/DirectionCascade.vue:63-95`

✏️ 改造点：
- 删除硬编码的 `directionOptions`（4 项主方向）与 `subDirectionMap`（子方向映射）
- 改为 `useDictFacade('osg_major_direction')` + `useDictFacade('osg_sub_direction')`（子方向字典 dict_type 见 `sql/osg_admin_dict_seed.sql:19`）
- 子方向按 `parentDictType=osg_major_direction` 关系动态分组（meta JSON 中已声明）

➕ 新增 props：
- `showSubDirection?: boolean = true` — admin 岗位表单只用主方向时传 `false`
- `value` 类型保持 string[]（dict_value 数组）

> **理由**：PRD §6.3 #11 要求 admin 岗位表单"复用 `DirectionCascade.vue`，去掉子方向部分"。最简方案 = 加一个 prop，避免新建第二个组件造成 SSOT 分裂。

**破坏性 API 变更**（必须同步迁移所有调用点）：

| 维度 | 现状（v1） | 改造后（v2） |
|---|---|---|
| props | `majorDirections: string[]` + `subDirection: string`（双 v-model） | `value: string[]`（主方向 dict_value 数组）+ `subDirection?: string`（可选保留）+ ➕ `showSubDirection?: boolean = true` |
| emit | `update:majorDirections` + `update:subDirection` | `update:value` + `update:subDirection` |
| 主方向值域 | 硬编码 4 项 `Finance/Consulting/Tech/Quant`（首字母大写） | 字典 `osg_major_direction` 的 dict_value（小写 `consulting/finance/tech/quant/computer_science`）|

**调用点全量迁移清单**（grep 验证，全部 7 处非测试引用 + 1 处测试，本期必须随 §4.1 同步改写，否则 admin 编译/运行时报错）：

| # | 文件 | 当前用法 | 改造 |
|---|---|---|---|
| 1 | `admin/views/users/students/components/AddStudentModal.vue` | `v-model:majorDirections / v-model:subDirection` | 改为 `v-model:value="form.majorDirections"`；表单字段值域从大写迁移为小写 dict_value（依赖 §2.3 UPDATE 后已归一化）|
| 2 | `admin/views/users/students/components/EditStudentModal.vue` | 同上 | 同上 |
| 3 | `admin/views/users/students/components/StudentDetailModal.vue` | 只读引用 | 同步改 props 名 |
| 4 | `admin/views/users/students/index.vue` | 列表筛选/展示 | 改字典化字段名 |
| 5 | `admin/views/users/staff/components/StaffFormModal.vue` | 同 #1 | 同 #1（staff 同样依赖 §2.3 `osg_staff` UPDATE）|
| 6 | `admin/views/users/staff/components/StaffDetailModal.vue` | 只读引用 | 同 #3 |
| 7 | `admin/views/users/staff/index.vue` + `staff/columns.ts` | 列表筛选/展示 | 同 #4 |
| 8 | `admin/views/career/positions/components/PositionFormModal.vue` | 本期 ➕ 新接入 | 用 v2，传 `:show-sub-direction="false"` |
| T | `admin/src/__tests__/students.spec.ts` | 既有测试 | 同步更新 fixture（大写 → 小写）+ props 名 |

> **设计意图**：`showSubDirection` 默认 `true` 是为兼容上述 1–7 行调用点（admin staff/student 现有"主方向 + 子方向"形态不变）；admin position 表单是唯一的 `false` 用户。

### 4.2 student — profile 三字段改多选（PRD §6.3 #8 + §5 Q15/Q16 + Q3 b）

文件：`osg-frontend/packages/student/src/views/profile/index.vue:138-173`

✏️ 三处 `<a-select mode="combobox">` → `<a-select mode="multiple">`：
- 主攻方向（行 156–163）：保留 `useDictFacade('osg_major_direction')`，**改为多选**（不接 DirectionCascade，PRD 未要求；学生端 profile 维持 a-select 形态）
- 招聘周期（行 138–145）：`useDictFacade('osg_recruit_cycle')` 多选
- 求职地区（行 147–154）：`useDictFacade('osg_region')` 多选

值序列化：表单 `string[]` ↔ API `string`（逗号分隔）—— 在 onSubmit 前 `arr.join(',')`，回显 `str.split(',').filter(Boolean)`。

### 4.3 student — positions 空态触发条件扩充（PRD §6.3 #9 + §5 Q25）

文件：`osg-frontend/packages/student/src/views/positions/index.vue:26-37`

✏️ 现状空态文案条件不变，仅扩充触发：
- 现：当列表为空时显示空态（沿用现有文案）
- 改：**任一**字段（major_direction / recruitment_cycle / target_region）为空 → 直接显示空态 + 引导补全（不发起 list 请求或忽略后端返回，文案沿用 PRD Q13=A）

### 4.4 assistant — 列表数据源切换 + 展示 target_majors（PRD §6.3 #10 + Q9 + §4.1 Q19 b）

文件：`osg-frontend/packages/assistant/src/views/career/positions/index.vue`

✏️：
- 数据源：`getAssistantPositionDrillDown(filters)` → 新增 `getAssistantPositionList(filters)`（对应 §3.4 新端点）
- 列表新增 `target_majors` 列展示（dict_label 渲染，逗号分隔多个）
- 筛选项保持现有 5 项不加（PRD §1.2）

> drill-down / students 接口本期保留，不删（避免触碰超出 PRD 范围的现有视图）。

### 4.5 admin — 岗位表单加 target_majors（PRD §6.3 #11 + Q9）

文件：`osg-frontend/packages/admin/src/views/career/positions/components/PositionFormModal.vue`

➕ 新增表单项：
- 标签：「对应学生主攻方向」
- 控件：`<DirectionCascade :show-sub-direction="false" v-model:value="form.targetMajors" />`
- 校验：必填（PRD Q6），至少选一项

文件：`osg-frontend/packages/admin/src/views/career/positions/index.vue:39-96`

➕ 列表展示与筛选（PRD Q9 表）：
- 列表列：➕ 「主攻方向」列（dict_label 渲染）
- 筛选项：➕ 主攻方向多选筛选（基于 `osg_major_direction` 字典）

### 4.6 lead-mentor — 列表/详情展示 target_majors（PRD §1.2 + Q9）

文件：`osg-frontend/packages/lead-mentor/src/views/career/positions/index.vue`

➕ 列表新增 `target_majors` 列；筛选项**不加**（PRD §1.2）；详情视图同步展示。

---

## 5. 前端 API 契约（共享 shared/api）

| 端点 | HTTP | 入参 | 出参（新增字段） |
|---|---|---|---|
| ✏️ `/student/position/list` | GET | （不变） | `target_majors: string`（逗号分隔 dict_value）|
| ➕ `/assistant/positions/list` | GET | `category? industry? company? region? keyword?` | 平铺数组，含 `target_majors`、`my_student_count`（命中所带学生数）|
| ✏️ `/lead-mentor/positions/list` | GET | （不变） | ➕ `target_majors` |
| ✏️ admin 岗位增删改 | POST/PUT/DELETE | ➕ `target_majors: string[]` | ➕ `target_majors` |

类型扩展位置：`osg-frontend/packages/shared/src/api/positions.ts` + `assistantCareer.ts`。

---

## 6. 字典（PRD §6.4 #15 — 已满足，跳过）

`sql/osg_admin_dict_seed.sql:83-87` 已包含全部 5 项主方向（含 `computer_science / 计算机 / Computer Science`）。**本期无字典数据补齐需要**。子方向字典 `osg_sub_direction` 是否齐全由 admin 字典管理 UI 由业务方自查。

---

## 7. 测试策略

按 `.claude/rules/testing.md` 与 `config.testing.coverage` 强制约束。

### 7.1 后端（branch 100% / line ≥90%）

| 测试类 | 覆盖点 |
|---|---|
| `OsgStudentPositionVisibilityServiceTest` | 三规则交集 6 类用例：① 三维全交集（命中）② 招聘周期不交（未中）③ 大区不交（未中）④ 主攻方向不交（未中）⑤ 学生 target_region 多值，**任一与岗位 region 相交即命中**（PRD Q3 a/b 联合）⑥ 边界（多值 ↔ 多值，部分相交）|
| 同上 — 空值 4 类用例 | 学生 major_direction/recruitment_cycle/target_region 任一为空 → false；岗位 target_majors='' → false |
| `OsgAssistantPositionVisibilityServiceTest` | 助教所带学生 0 / 1 / N 个、并集去重、`my_student_count` 计数 |
| `OsgPositionMapperTest` | `target_majors` 字段读写、insert/update/select/list |
| `OsgPositionControllerTest`（admin） | 入参 `target_majors` 必填校验、字典白名单校验、DTO ↔ Entity 序列化（List<String> ↔ String join/split） |

### 7.2 前端 student / shared（branch ≥90% / line ≥80%）

- `profile.spec.ts`：三字段多选回显与提交序列化（特别 target_region 多选：[华东, 华北] ↔ "华东,华北"）
- `positions.spec.ts`：任一字段为空 → 空态 + `/profile` 跳转
- `DirectionCascade.spec.ts`：v2 props 与 emit、字典加载、`showSubDirection=false` 模式、**大写历史值用例**（输入 `Finance` → 在小写字典选项中查不到 → 显示为空 → 用户重新点击"金融 / Finance" → emit `finance`）

### 7.3 前端 admin / assistant / lead-mentor（branch ≥80% / line ≥70%）

- admin `PositionFormModal.spec.ts`：必填校验、字典渲染
- assistant `positions.spec.ts`：新接口数据源、`target_majors` 列展示
- lead-mentor `positions.spec.ts`：`target_majors` 列展示（筛选项保持原 5 项的回归）

### 7.4 E2E（Playwright，可选触发）

`bash bin/e2e-api-gate.sh career full` —— 跨端串联：admin 创建岗位 → 学生命中三规则 → 助教看到聚合 → 班主任看到 visible 列表。

---

## 8. 数据 / 部署 / 上线步骤

> PRD §6.2 #7 + Q8：业务方上线前**手工补齐**全量岗位 `target_majors`，工程不做兜底。

| 步骤 | 责任方 | 内容 |
|---|---|---|
| 1 | 工程 | 部署后端（含 DDL ALTER）至 test |
| 2 | 工程 | 部署 5 端前端至 test |
| 3 | 业务方 | 在 admin 岗位列表中**逐条编辑现有岗位**，补齐 `target_majors` |
| 4 | 业务方 | 在 admin 字典管理中检查 `osg_major_direction` 项目是否齐全 |
| 5 | **业务方** | **【新增】通知所有存量学生 / 员工重新填写 profile 主攻方向**（业务方决策 Q1=D，工程不做大小写归一化）|
| 6 | 工程 + 业务方 | 端到端验收：学生命中三规则、助教看到并集、班主任看到 visible 列表 |
| 7 | 工程 | 推到 prod |

> **风险窗口**：步骤 3 完成、步骤 5 通知未触达前，存量学生（profile 主攻方向仍是大写键值）在新规则下匹配不到任何岗位（"主攻方向维度失配"），会看到"列表为空 + 引导补全"。这是 PRD §1.2 + Q10 + Q13 的预期空态行为，与"业务方补齐 target_majors 前为空"（R1）叠加形成上线初期的空窗期。

> 风险点：步骤 3 完成前学生端列表对所有学生为空（`target_majors=''` 不与任何学生主攻方向相交）—— 这正是 Q8=A 的预期"安全默认"。

---

## 9. 文件变更清单（traceability + 改动量预估）

| # | 文件 | 类型 | 改动 | PRD |
|---|---|---|---|---|
| 1 | `deploy/mysql-init/12_osg_position_init.sql` | DB | ➕ 列定义（新部署用） | §6.1 #4 |
| 2 | `deploy/mysql-init/07_osg_student_init.sql` | DB | ✏️ 三字段 VARCHAR(255) | §6.1 #1–#3 |
| 3 | （新建）`sql/upgrade/2026-05-position-visibility.sql` | DB | ➕ 仅 ALTER 扩字段（无 UPDATE，业务方决策 Q1=D）| §2.3 |
| 4 | `OsgPosition.java` | BE | ➕ targetMajors | §3.1 |
| 5 | `OsgPositionMapper.xml` | BE | ✏️ 全部 SQL 加列 | §3.1 |
| 6 | （新建）`IOsgStudentPositionVisibilityService.java` + impl | BE | ➕ 三规则匹配 | §6.2 #5 |
| 7 | （新建）`IOsgAssistantPositionVisibilityService.java` + impl | BE | ➕ 助教并集 | §6.2 #6 |
| 8 | `OsgStudentPositionController.java` | BE | ✏️ 接入 #6 | §3.3 |
| 9 | `OsgAssistantPositionController.java` | BE | ➕ /list 端点 | §3.4 |
| 10 | `OsgLeadMentorPositionServiceImpl.java#toPositionRow` | BE | ✏️ 加 targetMajors | §3.5 |
| 11 | `OsgPositionController.java`（admin） | BE | ✏️ 必填+白名单 | §3.6 |
| 12 | `DirectionCascade.vue` | FE-shared | ✏️ 字典化 + showSubDirection prop + 破坏性 props 重命名 | §6.3 #12 |
| 12.1 | admin/users/students/{Add,Edit,StudentDetail}Modal.vue + students/index.vue | FE-admin | ✏️ DirectionCascade v2 调用迁移 | §4.1 |
| 12.2 | admin/users/staff/{StaffForm,StaffDetail}Modal.vue + staff/{index.vue,columns.ts} | FE-admin | ✏️ DirectionCascade v2 调用迁移 | §4.1 |
| 13 | `student/profile/index.vue` | FE | ✏️ 三字段多选 | §6.3 #8 |
| 14 | `student/positions/index.vue` | FE | ✏️ 空态触发 | §6.3 #9 |
| 15 | `assistant/career/positions/index.vue` | FE | ✏️ 数据源 + 列 | §6.3 #10 |
| 16 | `admin/career/positions/components/PositionFormModal.vue` | FE | ➕ targetMajors 表单项 | §6.3 #11 |
| 17 | `admin/career/positions/index.vue` | FE | ➕ 列 + 筛选 | Q9 |
| 18 | `lead-mentor/career/positions/index.vue` | FE | ➕ 列 | Q9 |
| 19 | `shared/api/positions.ts` + `assistantCareer.ts` | FE | ✏️ 类型 + 端点 | §5 |
| 20 | 各前端 `.spec.ts` + 后端 `*Test.java` | TEST | ➕/✏️ 测试覆盖 | §7 |

---

## 10. PRD ↔ 开发文档 traceability

| PRD 编号 | 答复 | 开发文档处理 |
|---|---|---|
| Q1 三规则全满足 | A | §3.2 服务层 `&&` 三连判 + §3.3 接入 |
| Q2 招聘周期任一相交 | A | §3.2 `Collections.disjoint` 取反 |
| Q3 a 只看大区 | A | §3.2 仅比较 region 字段，不读 city |
| Q3 b 学生大区改多选 | B | §2.2 + §4.2 |
| Q4 主攻方向任一相交 | A | §3.2 同 Q2 |
| Q5 岗位主攻多选 | A | §2.1 VARCHAR(255) 逗号分隔 |
| Q6 必填 | A | §3.6 双层校验 |
| Q7 复用现有字典 | A | §4.1 + §4.5 接 osg_major_direction |
| Q8 业务方手工补齐 | A | §8 步骤 3 |
| Q9 6 个位置展示 / 3 列表筛选 | 表 | §4.4 §4.5 §4.6（学生 / 助教 / lead-mentor 列表只展示不加筛选；admin 列表展示+筛选） |
| Q10 列表为空 + 引导补全 | A | §3.2 任一空 → false + §4.3 |
| Q11 a/b/c | 二轮推翻 | §1.2 不改 |
| Q12 a/b/c | 需要 / 不一致 / 并集 | §3.4 + §4.4 |
| Q13 沿用现有文案 | A | §4.3 文案不动 |
| Q17/Q18 不加提示/筛选 | 否 | §1.2 不改 |
| Q19 b 自定义并集 | C | §3.4 |
| Q20 自动迁移 | — | §2.3 无需 UPDATE |
| Q21 city 保留不参与匹配 | — | §1.2 + §3.2 |
| Q22 mentor sidebar 现状 | — | §1.2 不改 |
| Q23 全平台 visible | A | §1.2 + §3.5 不改 |
| Q24 仅查看 | A | 班主任端无编辑权限，不动 |
| Q25 学生端跳转 | — | §1.2 不改 |
| §6.4 #15 字典补齐 | — | §6 已满足跳过 |

---

## 11. 文档自查报告（实施前必读）

> 本节按"PRD ↔ 现状 ↔ 开发文档"三方对照，校验是否存在冲突、遗漏、过度设计。

### 11.1 一致性

| 检查项 | 结果 | 说明 |
|---|---|---|
| PRD §1.2 班主任端"全部 visible 跨大区" vs 现状 | ✅ 一致 | `OsgLeadMentorPositionServiceImpl#normalizeQuery` 仅强制 visible，无大区/班主任绑定 |
| PRD §5 Q22 导师端无岗位 vs 现状 | ✅ 一致 | `mentor/MainLayout.vue:64-150` sidebar 无入口 |
| PRD §5 Q25 学生端跳转 vs 现状 | ✅ 一致 | `student/positions/index.vue:33` 已有 `router.push('/profile')` |
| PRD §6.4 #15 字典补齐 vs 现状 | ✅ 已满足 | `osg_admin_dict_seed.sql:83-87` 已含全 5 项 |
| PRD §6.3 #11 "去掉子方向" vs §6.3 #12 "字典化" | ⚠️ 已协调 | 通过 `showSubDirection` prop 一个组件兼容两种用法（§4.1） |

### 11.2 完整性（PRD 全部条目是否落地）

- §6.1（DB）#1–#4 → §2 ✅
- §6.2（BE）#5–#7 → §3.2/§3.4/§8 ✅
- §6.3（FE）#8–#12 → §4.1–§4.6 ✅
- §6.4（迁移/字典）#13–#15 → §2.3/§8/§6 ✅
- §6.5（取消项）→ §1.2 ✅
- Q9 表 6 行 → §4.4/§4.5/§4.6/§3.5 ✅

### 11.3 无过度设计

- 未新增 PRD 未要求的字段 / 接口 / 页面
- 未给班主任端做改造（PRD 明确否决）
- 未做存量岗位兜底脚本（PRD Q8 = 业务方手工）
- 未拆分 DirectionCascade 为两个组件（一个 prop 解决）

### 11.4 已知风险与开放点

| # | 项 | 风险 | 缓解 |
|---|---|---|---|
| R1 | `target_majors=''` 默认 vs 必填语义冲突 | DB 默认值为空字符串绕过了"必填"语义 | DDL 默认值仅服务于 ALTER 时为存量行兜底；新建/编辑路径在 Controller `@NotBlank` + Service 字典白名单**双层强制非空**；上线后业务方逐条补齐前学生端看不到该岗位（这是 PRD §8/Q8 预期的"安全默认"，**不是工程绕过必填**）|
| R2 | ~~学生端 list 接口路径~~ | ✅ 已确认，无须改造 | 后端唯一 `/admin/student-position/list`，前端 `/student/position/list` 通过 baseURL/proxy rewrite，e2e `positions.e2e.spec.ts:83` 印证 |
| R3 | 助教端 `drill-down` 现有视图 | 新增 `/list` 不删 `drill-down` —— 同一端两个数据源会有 UX 断层 | PRD §6.3 #10 仅要求改主列表；drill-down 是按行业-公司分组的另一视图维度，**§1.2 已显式列为 Out-of-Scope**；如业务方未来要求统一再单独立项 |
| R4 | 子方向字典 `osg_sub_direction` 完整性 | DirectionCascade 字典化后子方向显示依赖字典数据 | 字典已有 dict_type 定义（seed.sql:19），dict_value 由业务方维护，前端做空数据兜底（仅显示主方向） |
| R5 | 学生 profile 三字段单 → 多 切换的回显 | 旧值无逗号也兼容（split 后单元素数组）；不需要数据迁移脚本 | §2.3 已说明 |
| R6 | 主攻方向 dict_value 大小写不一致（业务方决策 Q1=D：让学生重选）| 字典 `osg_major_direction` dict_value 是小写（`finance/consulting/tech/quant/computer_science`），存量 DB 大写键值（`Finance/Consulting/Tech/Quant`）。字典化上线后大写键值在新组件下查不到 → 学生 profile 主攻方向字段显示为空 → 该学生在岗位三规则匹配中"主攻方向维度失配" → 列表为空 → 触发 PRD §1.2 "任一字段空 = 列表为空 + 引导补全" 文案（与 PRD §六 Q10/Q13 行为一致）| ① 工程**不写 UPDATE 脚本**；② 业务方上线前对存量学生发通知（"请重新填写 profile"）；③ 学生重选后 DB 写入新组件给的小写键值，自然对齐字典；④ 子方向 `osg_student.sub_direction` 同理（不动）；⑤ admin 端 staff 表单同理（员工自行重选或业务方手工改）|

---

## 12. 实施计划

> 严格按 RPIV 工作流。本文档作为 brainstorm 产物的等价输入，下一步进入 Story 拆分。

```
P0  本文档评审 + 业务方对 §11.4 R1–R3 知情确认
    ↓
P1  Story 拆分（建议 4 个 Story，按 PRD 维度切）：
     S-A  DB schema + 后端可见性服务（含两套 service + 单元测试）
     S-B  admin 端（字段录入 + 列表/筛选 + DirectionCascade 字典化）
     S-C  student 端（profile 多选 + positions 空态扩充）
     S-D  assistant 端 + lead-mentor 端展示
    ↓
P2  Ticket 拆分 → 实施 → verify → final-closure
```

> 各 Story 之间依赖：S-A 优先（其它 Story 需要新字段与新接口），S-B/S-C/S-D 可并行。

---

**文档状态：v3（业务方决策 Q1=D，准备进入 `/plan-deliver` RPIV 重流程）**

---

## 13. 审查与修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1 | 2026-05-01 | 初稿基于 PRD + 现有代码生成 |
| v2 | 2026-05-01 | 独立审查后修复：① §2.3 增加主攻方向大小写归一化 UPDATE（R6 致命修复）② §3.3 修正学生端路由"已确认"结论（删除误报 R2）③ §4.1 增加 DirectionCascade v1→v2 破坏性 API 迁移清单（8 个调用点）④ §3.6 明确 List<String>↔String 序列化在 DTO 层 ⑤ §7.1 增加 target_region 多选专项用例与迁移测试 ⑥ §11.4 R1 补强必填语义说明，R3 显式 Out-of-Scope，R6 新增 ⑦ §9 文件清单补齐 admin staff/student 调用点 12.1/12.2 |
| v3 | 2026-05-01 | 业务方决策 Q1=D（不做大小写归一化，让学生重选）：① §2.3 删除 `LOWER()` UPDATE 语句 ② §11.4 R6 重写为"业务方通知存量学生重选"③ §7.1 删除 `StudentMajorDirectionMigrationTest` ④ §7.2 调整 DirectionCascade 测试用例（大写历史值显示为空，重选后写入小写）⑤ §8 部署步骤新增"业务方通知存量学生 / 员工重选"步骤 + 风险窗口说明 ⑥ §9 文件清单第 3 行调整 |
