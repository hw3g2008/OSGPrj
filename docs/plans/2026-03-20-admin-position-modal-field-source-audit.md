# 岗位信息弹窗字段来源审计

日期：2026-03-20

## 目标

明确 `/career/positions` 新增/编辑岗位弹窗内各字段当前来源，区分：

- 已走正式数据库来源
- 间接来自数据库但不是正式维表来源
- 仍由前端硬编码

该文档用于约束后续弹窗重写，避免只改 UI 而继续保留不合格的数据来源。

## 结论概览

- 当前弹窗的保存链路是正式后端链路，写入 `osg_position`
- 但弹窗本身不是完整的数据库驱动表单
- `公司名称候选` 和 `新增默认值` 是从岗位列表结果中派生，间接来自数据库
- `岗位分类 / 公司类别 / 招聘周期 / 项目时间 / 大区 / 城市` 目前仍是前端硬编码

## 字段来源表

| 字段 | 当前来源 | 是否正式数据库来源 | 说明 | 建议状态 |
| --- | --- | --- | --- | --- |
| 岗位分类 `positionCategory` | 前端 `categoryOptions` 常量 | 否 | 写死在弹窗组件内 | 改为后端字典/基础数据 |
| 岗位名称 `positionName` | 用户输入 | 不适用 | 提交后入库 | 保持 |
| 部门 `department` | 用户输入 | 不适用 | 提交后入库 | 保持 |
| 项目时间 `projectYear` | 前端 `projectYearOptions` 常量 | 否 | 当前是年份数组 | 改为后端字典/基础数据 |
| 招聘周期 `recruitmentCycle` | 前端 `recruitmentCycleOptions` 常量 | 否 | 当前是前端枚举，多选后拼接字符串 | 改为后端字典/基础数据 |
| 公司名称 `companyName` | 父页面 `companyOptions` | 间接是 | 来自当前已加载岗位列表去重，不是独立公司源 | 改为正式公司数据源 |
| 公司类别 `companyType` | 前端 `companyTypeOptions` 常量 | 否 | 当前是前端枚举 | 改为后端字典/基础数据 |
| 大区 `region` | 前端 `regionOptions` 常量 | 否 | 当前是前端枚举 | 改为后端字典/基础数据 |
| 城市 `city` | 前端 `cityMap` 常量 | 否 | 由 `region -> cityMap` 联动 | 改为后端地区/城市数据源 |
| 公司官网 `companyWebsite` | 用户输入 / 新增默认值 | 间接是 | 从公司块点新增时，会由当前 drill-down 传默认值 | 最终应从正式公司源补默认值 |
| 岗位链接 `positionUrl` | 用户输入 | 不适用 | 提交后入库 | 保持 |
| 截止日期 `deadline` | 用户输入 | 不适用 | 提交后入库 | 保持 |
| 展示开始时间 `displayStartTime` | 用户输入 / 本地默认时间 | 否 | 默认值由前端 `new Date()` 生成 | 可保持前端默认，提交走后端 |
| 展示结束时间 `displayEndTime` | 用户输入 / 本地默认时间 | 否 | 默认值由前端 `now + 90 days` 生成 | 可保持前端默认，提交走后端 |
| 投递备注 `applicationNote` | 用户输入 | 不适用 | 提交后入库 | 保持 |
| 岗位状态 `displayStatus` | 编辑态表单值 | 间接是 | 初始值来自当前记录，保存走后端 | 保持 |

## 当前代码证据

### 前端弹窗字段定义

- `categoryOptions`、`companyTypeOptions`、`recruitmentCycleOptions`、`projectYearOptions`、`regionOptions`、`cityMap` 定义在：
  - `osg-frontend/packages/admin/src/views/career/positions/components/PositionFormModal.vue`

### 父页面传入的数据库派生值

- `PositionFormModal` 接收 `companyOptions` 与 `defaults`：
  - `osg-frontend/packages/admin/src/views/career/positions/index.vue`
- `companyOptions` 来自 `positions.value.map(item => item.companyName)` 去重：
  - `osg-frontend/packages/admin/src/views/career/positions/index.vue`
- `createDefaults` 来自行业/公司 drill-down 行对象：
  - `osg-frontend/packages/admin/src/views/career/positions/index.vue`

### 后端正式保存链路

- 前端 API：
  - `osg-frontend/packages/shared/src/api/admin/position.ts`
- 控制器：
  - `ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgPositionController.java`
- 查询与写入表：
  - `ruoyi-system/src/main/resources/mapper/system/OsgPositionMapper.xml`

## 页面现状判断

当前弹窗满足“真实保存”，但不满足“所有候选项都来自正式来源”。这意味着：

- 现在做纯 UI 重写没有问题
- 但如果要求正式落地，后续必须补一轮字段来源改造
- 否则页面看起来像正式系统，数据来源却仍然停留在前端硬编码阶段

## 后续改造建议

建议把字段分成两批：

### 第一批：UI 可先重写，数据链路不阻塞

- 岗位名称
- 部门
- 公司官网
- 岗位链接
- 截止日期
- 展示时间
- 投递备注
- 岗位状态

### 第二批：正式落地前必须去硬编码

- 岗位分类
- 公司类别
- 招聘周期
- 项目时间
- 大区
- 城市
- 公司名称候选

## 推荐目标状态

- 公司名称：来自正式公司主数据，而不是岗位列表派生
- 岗位分类 / 公司类别 / 招聘周期 / 项目时间：来自后端字典或基础数据接口
- 大区 / 城市：来自正式地区级联数据源
- 弹窗只负责展示、校验、提交，不在组件内部维护业务枚举
