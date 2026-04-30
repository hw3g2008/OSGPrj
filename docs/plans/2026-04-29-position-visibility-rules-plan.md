# 岗位信息五端展示规则整改方案

> 日期: 2026-04-29
> 范围: 学生 / 班主任 / 助教 / 导师 / Admin 五端岗位可见性 + Admin 表单字段补齐
> 原则: 按角色定接口，过滤规则后端做；前端 hint 与实际行为对齐；不新建字典

---

## 1. 新需求

### 1.1 学生端展示规则（三条同时满足）
1. **招聘周期匹配**：岗位 `recruitment_cycle` 与学生 `recruitment_cycle` 有交集
2. **求职地区匹配**：岗位 `region` ∈ 学生 `target_region`
3. **主攻方向匹配**：岗位"对应学生主攻方向"与学生 `major_direction` 有交集

### 1.2 其它端规则
| 端 | 规则 |
|---|---|
| 班主任(lead-mentor) | 看全部岗位 |
| 助教(assistant) | 看全部岗位 |
| 导师(mentor) | 不展示岗位（无菜单/无入口） |
| Admin | 新增/编辑岗位表单增加"对应学生主攻方向"字段（多选） |

---

## 2. 现状对比

### 2.1 后端实体 / 表

| 字段维度 | OsgPosition 实体 | osg_position 表 | 备注 |
|---|---|---|---|
| 招聘周期 | `recruitmentCycle` | `recruitment_cycle VARCHAR(64)` | ✅ 已存在，逗号分隔多值 |
| 大区 | `region` | `region VARCHAR(32)` | ✅ 单值 |
| 城市 | `city` | `city VARCHAR(64)` | ✅ 单值 |
| **对应学生主攻方向** | **❌ 无** | **❌ 无** | **本次新增** |

学生侧已有：`OsgStudent.majorDirection / targetRegion / recruitmentCycle`（均 VARCHAR，可能多值逗号分隔）。

### 2.2 五端接口现状

| 端 | 接口 | 现状 | 与新需求 Gap |
|---|---|---|---|
| 学生 | `GET /student/position/list` → `PositionServiceImpl.selectPositionList(userId)` | 仅过滤 `display_status='visible'` 与展示窗口（`isVisiblePublicPosition`，PositionServiceImpl.java:1744） | ❌ **未按招聘周期/地区/主攻方向过滤**（前端 hint 已写"按这三项展示"——UI 与实际不一致） |
| 班主任 | `GET /lead-mentor/positions/list` | 无学生侧过滤，看全部 | ✅ 符合 |
| 助教 | `GET /assistant/positions/stats` 与 `/drill-down` | **仅统计 + 下钻，无 list 接口** | ❌ 需补"看全部岗位"的列表接口 |
| 导师 | — | 无菜单/页面 | ✅ 符合 |
| Admin 表单 | `PositionFormModal.vue` | 无"主攻方向"字段 | ❌ 需补 |

### 2.3 核心 Gap 汇总

1. **岗位表缺 `major_direction` 字段**（DDL + 实体 + Mapper + DTO）
2. **学生端过滤逻辑缺失**（招聘周期 / 地区 / 主攻方向三维过滤未实现）
3. **助教端缺岗位列表接口**
4. **Admin 表单缺"对应学生主攻方向"字段**

---

## 3. 整改方案

### 3.1 数据库变更

新增 SQL 迁移：`deploy/mysql-init/13_osg_position_major_direction.sql`

```sql
ALTER TABLE osg_position
  ADD COLUMN major_direction VARCHAR(128) NULL DEFAULT NULL
  COMMENT '对应学生主攻方向(可多值,逗号分隔,值取自字典osg_major_direction)'
  AFTER recruitment_cycle;

ALTER TABLE osg_position
  ADD INDEX idx_osg_position_major_direction (major_direction);
```

同步更新 `12_osg_position_init.sql` 主 DDL。

**字典复用**：`osg_major_direction`（已存在，5 项：consulting/finance/tech/quant/computer_science），存字典 `value` 而非 `label`。

### 3.2 后端变更

#### 3.2.1 实体与 Mapper

| 文件 | 变更 |
|---|---|
| `OsgPosition.java` | 增加 `private String majorDirection` + getter/setter |
| `OsgPositionMapper.xml` | resultMap、insert、update、selectXxx 全部加入 `major_direction` 列 |
| `PositionFormDTO`（如有） | 增 `majorDirection` 字段（接收前端多选→逗号字符串） |

#### 3.2.2 学生端三维过滤（核心）

**位置**：`PositionServiceImpl.loadVisiblePositions()` 内，对公共岗位循环加一层过滤。

**新增方法**：`isVisibleToStudent(OsgPosition position, OsgStudent student)`

```java
private boolean isVisibleToStudent(OsgPosition position, OsgStudent student) {
    // 学生 profile 任一关键字段缺失 → 不放行（不显示岗位）
    if (student == null
        || !hasText(student.getRecruitmentCycle())
        || !hasText(student.getTargetRegion())
        || !hasText(student.getMajorDirection())) {
        return false;
    }
    // 1) 招聘周期: 岗位多值 ∩ 学生多值 非空
    if (!intersects(position.getRecruitmentCycle(), student.getRecruitmentCycle())) {
        return false;
    }
    // 2) 求职地区: 岗位 region(单值) ∈ 学生 targetRegion(可能多值)
    if (!contains(student.getTargetRegion(), position.getRegion())) {
        return false;
    }
    // 3) 主攻方向: 岗位多值 ∩ 学生多值 非空
    if (!intersects(position.getMajorDirection(), student.getMajorDirection())) {
        return false;
    }
    return true;
}
```

调用点：`loadVisiblePositions()` 第 727-739 行公共岗位 for 循环里，在 `isVisiblePublicPosition` 之后再判 `isVisibleToStudent`。学生自有的 manual review 岗位（715-723）保持原逻辑不动。

**注意**：`StudentPositionController` 通过 `userId` 查 `OsgStudent`，若当前 `selectPositionList(userId)` 已能拿到 student，复用即可；否则在 service 内通过 `OsgStudentMapper` 按 `userId` 反查。

#### 3.2.3 助教端补列表接口

| 文件 | 变更 |
|---|---|
| `OsgAssistantPositionController.java` | 新增 `GET /assistant/positions/list`，权限 `hasAssistantAccess()` |
| `IOsgAssistantPositionService` / Impl | 新增 `selectPositionList(query)`，**无角色过滤**（看全部），复用 `OsgPositionMapper.selectOsgPositionList` |

权限控制点：`@PreAuthorize` 注解 + `hasAssistantAccess()` 身份校验保持一致。

#### 3.2.4 班主任端 / 导师端

- 班主任：无变更（已支持）
- 导师：**确认 `mentor` 端无 position 路由 / 菜单 / 接口调用**——已验证现状符合，无需改

### 3.3 前端变更

#### 3.3.1 Admin — `PositionFormModal.vue`

**位置**：当前表单字段在"招聘周期"之后，"项目时间"之前。

新增字段：
- 标签：「对应学生主攻方向」
- 控件：`a-select` 多选 + `mode="multiple"`
- 选项来源：`useDict('osg_major_direction')`（与 StaffFormModal 多选一致）
- 提交：选中数组 `value[]` `.join(',')` → 后端
- 校验：必填（与"招聘周期"同级）

对应列表展示（`PositionTable` / `PositionDetailDrawer` 等若有）补一列/一行「主攻方向」。

#### 3.3.2 学生端 — `student/views/positions/index.vue`

**无需改动**：当前 hint（Line 26-31）已声称"按招聘周期/地区/主攻方向展示"，本期是让后端真正履行该承诺，前端不动。

如学生 profile 缺关键字段导致空列表，可在空态文案补一行「请先到「我的-基本信息」补全求职地区/主攻方向/招聘周期」。

#### 3.3.3 助教端 — `assistant/views/career/positions`

新增 list tab 或独立页面：
- 调用 `GET /assistant/positions/list`
- 复用 admin 端 PositionTable 列结构（只读）
- 入口：menu 已有 career-positions，加二级 tab「岗位列表」

#### 3.3.4 班主任端 / 导师端

- 班主任：无变更
- 导师：确认 mentor 端 router/menu 无 positions 入口——若有遗留则移除

### 3.4 字段语义约定

| 字段 | 存储形式 | 匹配语义 |
|---|---|---|
| `osg_position.recruitment_cycle` | 字典 value 逗号分隔（多值） | 与学生取交集 |
| `osg_position.region` | 字典 value（单值） | ∈ 学生 target_region |
| `osg_position.major_direction` | 字典 value 逗号分隔（多值） | 与学生取交集 |
| `osg_student.target_region` | 字典 value 逗号分隔（多值） | 包含岗位 region |
| `osg_student.major_direction` | 字典 value 逗号分隔（多值） | 与岗位取交集 |
| `osg_student.recruitment_cycle` | 字典 value 逗号分隔（多值） | 与岗位取交集 |

**强约定**：所有维度均存字典 `value`，不存中文 label。前端展示时通过字典翻译。

---

## 4. 影响范围清单

### 4.1 后端
- `ruoyi-system/.../domain/OsgPosition.java`（+majorDirection）
- `ruoyi-system/.../mapper/OsgPositionMapper.xml`（resultMap + 4 个 SQL）
- `ruoyi-system/.../service/impl/PositionServiceImpl.java`（学生端三维过滤；行 700-747）
- `ruoyi-admin/.../controller/osg/OsgAssistantPositionController.java`（新增 /list）
- `ruoyi-system/.../service/IOsgAssistantPositionService` 与 Impl（新增 selectPositionList）
- `ruoyi-admin/.../controller/osg/OsgPositionController.java` + `OsgPositionFormDTO`（接收 majorDirection）

### 4.2 前端
- `osg-frontend/packages/admin/src/views/career/positions/components/PositionFormModal.vue`（+主攻方向字段）
- `osg-frontend/packages/admin/src/views/career/positions/index.vue`（列表列/详情若展示）
- `osg-frontend/packages/shared/src/api/positions.ts`（助教 list 接口 + 类型）
- `osg-frontend/packages/assistant/src/views/career/positions/`（新增 list 视图）
- `osg-frontend/packages/student/src/views/positions/index.vue`（仅空态文案微调，可选）

### 4.3 数据库
- `deploy/mysql-init/12_osg_position_init.sql`（同步主 DDL）
- `deploy/mysql-init/13_osg_position_major_direction.sql`（增量迁移，新文件）

### 4.4 测试
- 后端：`PositionServiceImplTest` 增 `isVisibleToStudent` 单测（覆盖 3 维度任一缺失/不匹配/匹配）
- 前端：admin 表单提交携带 majorDirection、助教列表加载、学生端不同 profile 显示数量

---

## 5. 待用户决策项

> 以下点请用户确认后再启动：

1. **学生 profile 关键字段缺失时的行为**
   - 方案 A（推荐）：返回空列表 + 文案引导补全
   - 方案 B：放行该维度过滤（缺啥不过滤啥）→ 早期数据不全时仍能看到岗位
   - 当前方案默认 A

2. **岗位"对应学生主攻方向"是否必填？**
   - 必填：所有存量数据需补齐，否则学生端将看不到任何存量岗位
   - 非必填：岗位无主攻方向时，过滤策略——视作"对所有方向可见"还是"对所有方向不可见"？
   - 推荐：必填 + 提供数据回填脚本（按岗位 industry 默认主攻方向映射）

3. **助教列表接口的字段范围**
   - 与 admin 接口完全一致（含创建/更新人审计字段），还是简化只读版？
   - 推荐：复用 admin 接口的 VO，字段一致便于前端组件复用

4. **存量数据回填**
   - 需要写脚本将 `osg_position.major_direction` 按 industry 默认填充吗？
   - 候选映射：Investment Bank/PE/VC → finance；Consulting → consulting；Tech → tech / computer_science

---

## 6. 实施顺序

1. **DB**：新增 `major_direction` 列 + 迁移脚本
2. **后端**：实体 + Mapper + Admin 写入支持
3. **Admin 前端**：表单新增字段，验证写入闭环
4. **后端**：学生端三维过滤逻辑
5. **后端 + 前端**：助教 list 接口 + 列表页
6. **测试 + 回归**：学生端不同 profile 看到的岗位数量；助教看全部；导师无入口
7. **数据回填**（按用户决策项 4）

---

## 7. 风险与回滚

- **风险 1**：学生 profile 字段缺失导致岗位列表大面积变空 → 预案：上线前抽样跑学生 profile 完备率统计
- **风险 2**：存量岗位 `major_direction` 为空 → 学生端看不到任何岗位 → 预案：实施顺序 7 数据回填先于学生端过滤上线
- **回滚**：DB 列保留（不删），注释 `isVisibleToStudent` 调用即可回到原全展示行为
