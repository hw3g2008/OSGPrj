# Admin Dict Phase 1 Design

Date: 2026-04-02  
Status: Approved  
Owner: admin-dict  
Scope: 将 admin 端“基础数据管理”从自定义 `basedata` 过渡到若依标准字典体系，并作为一个独立 requirement 接入 RPIV。  
Non-goal: 本期不改学生/导师/班主任/助教端下拉接法，不在本期重做动态权限模块，不在本期一次性完成所有页面字典化。

---

## 1. 目标

把当前 admin 端已落地的“基础数据管理”能力收敛为真正的标准字典能力，满足以下 4 个目标：

1. `sys_dict_type + sys_dict_data` 成为基础配置选项的唯一运行时真源。
2. “基础数据管理页”升级为“字典管理中心”，但第一期保留现有访问入口和大体使用习惯。
3. `/system/basedata/*` 只保留兼容壳层，不再承载主逻辑、不再维护内存数据。
4. 这条改造以独立 `admin-dict` requirement 接入 RPIV，避免继续混在旧 `permission` 归档资产中。

---

## 2. 现状盘点

### 2.1 当前页面与接口

当前前端基础数据页直接依赖自定义 API：

- `osg-frontend/packages/admin/src/api/baseData.ts`
- `osg-frontend/packages/admin/src/views/permission/base-data/index.vue`
- `osg-frontend/packages/admin/src/views/permission/base-data/components/BaseDataModal.vue`

当前协议是：

- `GET /system/basedata/list`
- `POST /system/basedata`
- `PUT /system/basedata`
- `PUT /system/basedata/changeStatus`
- `GET /system/basedata/categories`

页面还在本地硬编码分类卡片、Tab、字段标签和父级关系。

### 2.2 当前后端实现

当前后端是最小可运行实现：

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java`

核心问题：

1. 使用 `seedRows()` 初始化 `ArrayList<Map<String, Object>>`
2. 重启丢失
3. 不与其他页面下拉共享
4. 与若依标准 dict 双轨并存

### 2.3 标准字典能力已经存在

标准字典接口已经具备：

- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysDictTypeController.java`
- `ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysDictDataController.java`

底层表与 mapper 已具备：

- `sql/ry_20250522.sql`
- `ruoyi-system/src/main/resources/mapper/system/SysDictTypeMapper.xml`
- `ruoyi-system/src/main/resources/mapper/system/SysDictDataMapper.xml`

### 2.4 RPIV 当前状态

当前 `permission` 已归档为已完成模块：

- `osg-spec-docs/tasks/STATE.yaml.permission-archive`
- `osg-spec-docs/tasks/STATE.yaml` 的 `prior_completed_modules.permission`

但其 PRD/SRS/测试资产仍以旧 `basedata` 模型为真相，不能直接承接未来态“标准 dict 页面”。

结论：

- 这次改造必须走新的独立 requirement
- 不能继续把未来态设计写回旧 `permission` 主链再让 RPIV 自动拆分

---

## 3. 核心决策

### 3.1 requirement 独立

本次需求独立命名为 `admin-dict`。

后续 source-stage 文档独立落位：

- `osg-spec-docs/docs/01-product/prd/admin-dict/`
- `osg-spec-docs/docs/02-requirements/srs/admin-dict.md`
- `osg-spec-docs/docs/02-requirements/srs/admin-dict-DECISIONS.md`

旧文档只加迁移说明，不继续扩写未来态逻辑：

- `osg-spec-docs/docs/01-product/prd/permission/04-admin-base-data.md`
- `osg-spec-docs/docs/02-requirements/srs/permission.md`

### 3.2 运行时唯一真源

基础配置型选项统一以：

- `sys_dict_type`
- `sys_dict_data`

作为唯一运行时真源。

`/system/basedata/*` 不再是真源，只是兼容壳层。

### 3.3 第一阶段不加表字段

第一阶段不修改 `sys_dict_type` / `sys_dict_data` 物理 schema。

页面元数据与父级关系使用 `remark` JSON 表达：

- `sys_dict_type.remark`
- `sys_dict_data.remark`

原因：

1. 可以立即复用若依现有 dict 能力
2. 不需要引入新的表或第二套 schema
3. 后续如果 remark 结构稳定，再决定是否做列级固化

### 3.4 页面保留入口，升级语义

第一阶段保留路由与主导航入口：

- 路由：`/permission/base-data`

但页面语义升级为“字典管理中心”。

原因：

1. 降低导航、E2E、视觉合同的震荡
2. 用户习惯不需要立即重建
3. 后续可在二期决定是否改名为“字典管理”

### 3.5 短期兼容权限码

第一阶段允许兼容两套页面访问权限：

- `system:baseData:list`
- `system:dict:list`

控制方式：

- 新页面与兼容壳使用 `@ss.hasAnyPermi('system:dict:list,system:baseData:list')`

这样旧菜单和新标准 dict 能力可以共存一个过渡窗口。

---

## 4. 真相链设计

### 4.1 source-stage 真相

`admin-dict` requirement 的 source-stage 真相包含：

1. PRD 页面说明
2. `DICT-REGISTRY.yaml`
3. `UI-VISUAL-CONTRACT.yaml`
4. `DELIVERY-CONTRACT.yaml`
5. SRS
6. DECISIONS

其中新增的核心文件是：

- `osg-spec-docs/docs/01-product/prd/admin-dict/DICT-REGISTRY.yaml`

它是页面分组和字典类型映射的机器真相，至少包含：

- `group_key`
- `group_label`
- `icon`
- `order`
- `dict_type`
- `dict_name`
- `has_parent`
- `parent_dict_type`

### 4.2 runtime 真相

真正落库的数据真相在：

- `sys_dict_type`
- `sys_dict_data`

`DICT-REGISTRY.yaml` 定义“应该有哪些类型和页面怎么展示”，数据库定义“当前实际有哪些类型和字典项”。

### 4.3 derived artifacts

从 source-stage 派生出的资产包括：

- Story YAML
- Ticket YAML
- `admin-dict-test-cases.yaml`
- `admin-dict-traceability-matrix.md`
- 视觉合同审计
- API smoke / E2E / final-gate 证据

### 4.4 sync policy

强约束：

1. 页面分组、Tab、父子关系先改 `DICT-REGISTRY.yaml`
2. 再由代码读取 registry 渲染页面
3. 不允许前端继续本地硬编码分类与 Tab
4. 不允许再把 `basedata` 页面结构作为未来态真相

---

## 5. 数据模型设计

### 5.1 dict type remark 结构

建议 `sys_dict_type.remark` 使用 JSON：

```json
{
  "groupKey": "job",
  "groupLabel": "求职相关",
  "icon": "mdi-briefcase",
  "iconColor": "#3B82F6",
  "iconBg": "#DBEAFE",
  "order": 10,
  "hasParent": false,
  "parentDictType": null
}
```

对于有父级的类型：

```json
{
  "groupKey": "student",
  "groupLabel": "学员相关",
  "icon": "mdi-account-school",
  "order": 20,
  "hasParent": true,
  "parentDictType": "osg_major_direction"
}
```

### 5.2 dict data remark 结构

建议 `sys_dict_data.remark` 使用 JSON：

```json
{
  "parentValue": "finance",
  "extra": {
    "website": "",
    "country": ""
  }
}
```

其中：

- `parentValue` 用来表达父级关联
- `extra` 用来容纳当前页面已有的少量附加字段

### 5.3 第一批字典类型清单

第一阶段固定 11 个类型：

| group | dictType | dictName | parentDictType |
|------|----------|----------|----------------|
| job | `osg_job_category` | 岗位分类 | — |
| job | `osg_company_type` | 公司/银行类别 | — |
| job | `osg_company_name` | 公司/银行名称 | `osg_company_type` |
| job | `osg_region` | 大区 | — |
| job | `osg_city` | 地区/城市 | `osg_region` |
| job | `osg_recruit_cycle` | 招聘周期 | — |
| student | `osg_school` | 学校 | — |
| student | `osg_major_direction` | 主攻方向 | — |
| student | `osg_sub_direction` | 子方向 | `osg_major_direction` |
| course | `osg_course_type` | 课程类型 | — |
| finance | `osg_expense_type` | 报销类型 | — |

---

## 6. 后端设计

### 6.1 新增 registry 读取接口

新增一个轻量接口，专门把 `DICT-REGISTRY.yaml + sys_dict_type` 组装成页面需要的分类卡片与 Tab：

- `GET /system/admin-dict/registry`

返回结构包含：

- 分类组
- 每组下的 dict types
- 图标和展示顺序
- 父级关系声明

### 6.2 业务 CRUD 复用标准 dict

页面主 CRUD 直接使用标准 dict 接口：

- `GET /system/dict/data/list`
- `GET /system/dict/data/type/{dictType}`
- `POST /system/dict/data`
- `PUT /system/dict/data`

必要时新增一个轻量 facade 只做页面字段适配，但不再落新表。

### 6.3 兼容壳层

`OsgBaseDataController` 改为 facade：

1. `list` -> 转译为 dict list 查询
2. `add/edit/changeStatus` -> 调用 dict service
3. `categories` -> 改为读 registry
4. 删除 `seedRows()`

这层只为过渡期保留，不再新增能力。

---

## 7. 前端设计

### 7.1 页面结构

页面保留：

- 分类卡片
- Tab 切换
- 搜索区
- 列表区
- 通用弹窗

但数据来源改为：

- 分类和 Tab：来自 registry 接口
- 列表和父级选项：来自 dict 接口

### 7.2 列表字段映射

页面展示统一映射为：

- `name` -> `dictLabel`
- `value` -> `dictValue`
- `sort` -> `dictSort`
- `status` -> `status`
- `parentId/parentValue` -> `remark.parentValue`

### 7.3 弹窗字段

弹窗统一模型：

- `dictLabel`
- `dictValue`
- `dictSort`
- `status`
- `parentValue`
- `remark.extra`

对于有父级的类型，父级下拉数据来自 `GET /system/dict/data/type/{parentDictType}`。

### 7.4 页面命名

第一阶段页面头部可显示：

- 主标题：`字典管理`
- 副标题：`管理系统基础配置数据`

但路由路径先不改。

---

## 8. 测试与门禁设计

### 8.1 RPIV requirement 级测试

新 requirement `admin-dict` 第一阶段至少覆盖以下 operation：

- `list`
- `create`
- `edit`
- `status_toggle`

对应 scenario obligations 至少覆盖：

- `display`
- `state_change`
- `persist_effect`
- `business_rule_reject`

### 8.2 兼容层测试

兼容壳层只保留最小回归：

1. `/system/basedata/list` 能返回 dict 真相
2. `/system/basedata` 的增改状态切换能映射到 dict
3. 兼容接口不再直接维护内存数据

### 8.3 页面测试

前端测试需要验证：

1. 分类卡片和 Tab 来自 registry，而不是本地常量
2. 父级下拉来自父级 dictType
3. CRUD 正确读写标准 dict
4. 搜索和状态切换基于标准 dict 返回

---

## 9. 风险与控制

### 9.1 风险：旧资产还绑定 `/system/basedata/*`

控制：

- 保留兼容壳层
- 兼容壳层只做委托
- 旧 smoke / E2E 在第二阶段再逐步切新接口

### 9.2 风险：dict remark JSON 约定漂移

控制：

- `DICT-REGISTRY.yaml` 定义 remark 结构
- service 层集中解析
- 前端禁止自己拼 JSON 结构

### 9.3 风险：继续和 `permission` requirement 混线

控制：

- 新建 `admin-dict` requirement
- 新建独立 PRD/SRS/test assets
- 旧 `permission` 文档仅加迁移说明，不再扩写

---

## 10. 验收标准

设计完成后，实施阶段必须满足：

1. `admin-dict` 成为独立 requirement，可单独走 RPIV。
2. 基础数据管理页的运行时真源仅为 `sys_dict_type + sys_dict_data`。
3. 页面分类卡片与 Tab 不再本地硬编码。
4. `OsgBaseDataController` 不再维护 `seedRows()`。
5. 第一批 11 个字典类型可完成列表、创建、编辑、启停、父级联动。
6. `/system/basedata/*` 兼容壳层可用，但不再作为真源。
7. 新主链测试资产具备 operation 级覆盖，能通过 RPIV 现有 guard。

---

## 11. 一句话结论

第一阶段最优解不是继续补旧 `basedata`，而是以独立 `admin-dict` requirement 收口“基础数据管理页”，让标准 dict 表成为唯一真源，页面与兼容层围绕这个真源重建。
