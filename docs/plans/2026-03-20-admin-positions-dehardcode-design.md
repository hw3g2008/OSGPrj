## 背景

`岗位信息` 页面当前已经完成原型 UI 提取，但业务元数据和候选来源仍有大量前端硬编码与页面内派生逻辑：

- 页面筛选项直接写死 `岗位分类 / 状态 / 招聘周期 / 发布时间预设`
- 新增/编辑弹窗直接维护 `岗位分类 / 公司类别 / 招聘周期 / 项目时间 / 大区 / 城市`
- 公司候选、城市候选由当前页面已加载数据去重生成，受分页与筛选影响
- 学员弹窗通过 `companyName + positionName` 过滤求职记录，不是正式关联键
- 顶部浏览量为静态常量
- 岗位列表与下钻列表中的 `studentCount` 在 SQL 层被写死为 `0`

本轮目标是将 `岗位信息` 页收口到正式来源，不再由页面组件维护业务真源。

## 目标

1. 页面和弹窗不再维护业务枚举数组。
2. 页面筛选、弹窗候选、流程说明、行业展示元信息统一由后端元数据接口返回。
3. 公司候选、学员明细、学员数等从正式接口读取，不再由当前页列表派生。
4. 学员弹窗改为按 `positionId` 关联。
5. 维持现有 UI 结构与现有新增/编辑/批量上传/导出能力。

## 非目标

1. 不在这一轮重做 `基础数据管理` 持久化实现。
2. 不在这一轮将公司、行业、城市完全升级为独立主数据表。
3. 不在这一轮改造学生端到 admin 求职桥接缺口。

## 现有正式来源盘点

### 可复用

- `SysDictDataController` 已提供 `GET /system/dict/data/type/{dictType}`，可作为 DB-backed 字典来源。
- `osg_position` 已提供岗位主数据表，可支撑 `industry / companyName / city / recruitmentCycle / projectYear` 等业务值。
- `osg_job_application` 已持有岗位申请数据，适合作为岗位学员数与申请明细来源。

### 不可直接复用

- `OsgBaseDataController` 仍为 controller 内存实现，不能作为正式真源。
- 当前岗位 SQL 中 `student_count` 固定为 `0`，不能作为真实统计。
- 当前浏览量没有正式统计链路，不能继续展示静态假数。

## 推荐实现

### 1. 新增岗位元数据接口

新增 `GET /admin/position/meta`，统一返回页面与弹窗所需元数据：

- `categories`
- `displayStatuses`
- `industries`
- `companyTypes`
- `recruitmentCycles`
- `projectYears`
- `regions`
- `citiesByRegion`
- `processGlossary`
- `trafficSummary`

其中：

- `categories / displayStatuses / industries / companyTypes / recruitmentCycles / projectYears / regions / processGlossary`
  优先来自 `sys_dict_data`
- `citiesByRegion`
  优先来自 `sys_dict_data`，按 `remark` 或约定字段维护 parent 关系
- `trafficSummary`
  若无正式统计来源，则返回 `null`，前端隐藏浏览量展示

### 2. 新增正式候选接口

新增 `GET /admin/position/company-options`：

- 支持 `keyword`
- 返回去重后的公司候选
- 可附带 `companyType / companyWebsite / industry` 等补充信息

### 3. 新增按岗位查询学员明细接口

新增 `GET /admin/position/{positionId}/students`：

- 直接按 `positionId` 查询求职申请记录
- 返回弹窗所需行数据
- 前端不再自行按名称过滤

### 4. 修正岗位 SQL 聚合

更新岗位列表与下钻聚合 SQL：

- `studentCount` 改为真实统计
- `stats.studentApplications` 改为真实统计
- 行业 / 公司聚合中的学员数改为真实统计

### 5. 前端收口

`index.vue`

- 页面加载时先请求 `getPositionMeta()`
- 筛选条枚举由 `meta` 渲染
- 行业展示使用 `meta` 返回的 `tone` / `icon` 或等价语义字段
- 顶部浏览量仅在 `meta.trafficSummary` 存在时展示
- 公司候选改为独立接口
- 学员弹窗改为直接请求 `positionId` 对应明细

`PositionFormModal.vue`

- 通过 props 接收 `meta`
- 删除本地 `categoryOptions / companyTypeOptions / recruitmentCycleOptions / projectYearOptions / regionOptions / cityMap`
- 城市候选改为读取 `meta.citiesByRegion[region]`

`BatchUploadModal.vue`

- 排重规则文案改为优先读取 `meta` 中的 `uploadRuleCopy`
- 若后端暂不提供，先抽到共享常量，避免散落在组件模板

`PositionStudentsModal.vue`

- 只保留展示层
- 行数据完全由父页面接口结果提供

## 字典类型建议

- `osg_position_category`
- `osg_position_display_status`
- `osg_position_industry`
- `osg_company_type`
- `osg_recruitment_cycle`
- `osg_project_year`
- `osg_position_region`
- `osg_position_city`
- `osg_position_process_glossary`
- `osg_position_ui_copy`

`osg_position_city` 需要带 `parentRegion`，可先用 `remark` 约定保存。

## 迁移策略

### 第一阶段

- 接入 `meta` 接口
- 页面与弹窗去除硬编码业务数组
- 浏览量静态数改为可隐藏

### 第二阶段

- 公司候选改为独立接口
- 学员弹窗改为按 `positionId`

### 第三阶段

- 岗位 SQL 真实聚合学员数与申请数

## 测试策略

### 前端

- 单测锁定：页面与弹窗必须引用 `getPositionMeta`
- 单测锁定：页面和弹窗不再出现业务选项硬编码数组
- E2E 覆盖：页面打开、筛选项加载、弹窗选项加载、按岗位打开学员弹窗

### 后端

- controller/service 测试：`/admin/position/meta`
- controller/service 测试：`/admin/position/company-options`
- controller/service 测试：`/admin/position/{id}/students`
- SQL 聚合测试：`studentCount` 和 `studentApplications`

## 风险

1. 现网字典类型可能尚未建好，页面会出现空选项。
2. `基础数据管理` 当前非持久化，不能拿它替代字典体系。
3. `浏览量` 若没有真实链路，应隐藏而不是继续保留假值。
4. `city` 的区域关联如果仅靠岗位表动态推导，会导致枚举不稳定，因此应尽快转到字典。

## 验收标准

1. `岗位信息` 页面与新增/编辑弹窗源码中不再维护业务选项数组。
2. 页面所有筛选与弹窗候选均来自正式接口。
3. 学员弹窗按 `positionId` 查询，不再按名称匹配。
4. 学员数、申请数为真实聚合，不再固定为 `0`。
5. 无正式来源的数据不再展示假值。
