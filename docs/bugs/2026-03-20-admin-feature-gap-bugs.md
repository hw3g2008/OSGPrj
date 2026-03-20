# Admin 功能缺口 Bug 清单

日期: 2026-03-20
来源: admin 代码审查 + `curl` 真实接口测试 + Playwright MCP 真实前端测试
环境:
- admin 前端: `http://127.0.0.1:3005`
- backend: `http://127.0.0.1:28080`
- 数据源: 共享测试库

## 结论摘要

本轮验证确认:
- admin 端页面、路由、接口主体基本存在。
- 以下 admin 功能本身可真实操作: 权限配置、后台用户管理、合同管理、导师列表、导师排期管理、岗位信息、课程记录、操作日志、个人设置。
- 但有 4 个缺口会导致“看起来有页面”，却不是完整业务闭环。
- 其中 `BUG-001`、`BUG-002`、`BUG-003` 不只是 student -> admin 两端脱节，还会阻断班主任、助教、导师的后续协同链路。

### 需求真源补充

本轮补扫需求源后，确认这 3 个 P1 缺口有明确的多角色联动约束:
- admin SRS `FR-015/016/017` 明确要求学生自添岗位审核、学员求职总览、模拟应聘管理不是孤立后台页面，而是求职全链路的一部分。
- admin `FR-015 AC-015-4` 明确要求: 学生自添岗位审核通过后，如存在辅导申请，应自动流转到班主任端进行导师分配。
- `学员求职总览` 的 admin 版在 PRD 中被定义为“与班主任端类似，但数据范围为全部学员”，说明 admin 与班主任端应共享同一业务投递/辅导链路，只是权限范围不同。
- 班主任/助教端 `学员求职总览` 具备 `待分配导师` 视图，导师端只看自己已辅导学员，说明新申请应先进入 admin/班主任分配面，再流转到导师侧。
- `REQ-FUN-003` 明确: 真实面试辅导和模拟面试均由班主任安排导师；`REQ-FUN-004` 明确: 助教没有分配导师权限，不能把待分配责任错误地下沉到助教端。

### 修复注意事项

为了避免 admin 修复时直接改坏 student 原始数据，建议后续实现遵守以下状态归属:
- student 原始动作表仍是学生输入的事实来源，不应让 admin 反向覆盖学生原始申请内容。
- admin/班主任使用的审核、分配、排课表应是工作流投影或工作流主表，承接审核状态、分配状态、导师关系、预约时间等管理态字段。
- 允许回写的应仅限窄状态字段或关系键，例如审核结果、分配结果、关联的公共岗位 ID、导师 ID、预约时间，不应双向乱写文案和原始申请内容。
- 导师分配权限应保持一致: admin 可全局处理，班主任可处理自己范围内的待分配记录，助教无导师分配权限，导师只接收已分配结果。

## BUG-001 学生手动添加岗位未进入 admin 审核队列

严重级别: `P1`
状态: `已复现`
影响模块:
- 用户中心之外的求职闭环
- admin `学生自添岗位`
- student `手动添加岗位`
- lead-mentor `学员求职总览`
- assistant `学员求职总览`

### 问题现象

学生在前端手动添加岗位后，岗位能出现在学生自己的岗位列表中，但不会进入 admin `学生自添岗位` 审核页。

### 复现步骤

1. 学生登录 student 端。
2. 调用 `/student/position/manual` 或通过前端手动新增岗位。
3. 到 student 岗位列表确认该岗位可见。
4. 登录 admin，打开 `求职中心 -> 学生自添岗位`。
5. 搜索刚刚新增的岗位名称或公司名称。

### 预期结果

新增岗位应进入 admin 审核队列，管理员可以在 `学生自添岗位` 页面审核通过或拒绝。

### 实际结果

student 侧新增成功，但 admin 审核队列没有对应记录。

### 根因定位

student 手动加岗接口直接写入 `osg_student_job_position`，即学生可见岗位库。

对应代码:
- [/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java:106](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java:106)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:331](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:331)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml:236](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml:236)

而 admin `学生自添岗位` 页面读取的是 `osg_student_position` 审核表:
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgStudentPositionMapper.xml:79](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgStudentPositionMapper.xml:79)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgStudentPositionMapper.xml:108](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgStudentPositionMapper.xml:108)

当前代码中没有看到从 `manual` 创建逻辑写入 `osg_student_position` 的桥接。

### 需求真源补充

- admin SRS `FR-015 AC-015-4` 明确要求: 审核通过后加入公共岗位库，有辅导申请的自动流转到班主任端。
- admin PRD `07-admin-student-positions.md` 页面底部审核说明同样写明: 有辅导申请的岗位通过后，将自动流转到班主任端进行导师分配。
- 因此这里缺的不是单一后台列表数据，而是 `student -> admin 审核 -> 班主任待分配` 的完整桥接。

### 影响范围

- admin 无法审核学生新增岗位。
- `学生自添岗位` 页面与 student 端真实新增行为脱节。
- 后续“审核通过后进入公共岗位库”的设计无法从 student 真实操作触发。
- 有辅导申请的自添岗位无法自动流转到班主任端 `待分配导师` 视图。
- 助教端后续也无法在其可见范围内看到这类已流转记录，整个求职协同链会从入口处断开。

### 验收标准

1. student 手动添加岗位后，必须落一条 `pending` 审核记录到 admin 审核来源表。
2. admin `学生自添岗位` 页面能按岗位名/公司名搜索到该记录。
3. 审核通过后，该岗位进入 admin `岗位信息` 列表。
4. 若该记录带辅导申请，审核通过后应自动进入班主任端 `学员求职总览 -> 待分配导师`。
5. 审核拒绝后，student 端能看到对应审核结果或状态反馈。

## BUG-002 学生投递/进度/辅导申请未进入 admin 学员求职总览

严重级别: `P1`
状态: `已复现`
影响模块:
- admin `学员求职总览`
- student `投递岗位`
- student `更新进度`
- student `申请辅导`
- lead-mentor `学员求职总览`
- assistant `学员求职总览`
- mentor `学员求职总览`

### 问题现象

学生完成投递、更新求职进度、提交岗位辅导申请后，student 自己的申请列表有数据，但 admin `学员求职总览` 没有新增对应申请，也没有进入“未分配”列表。

### 复现步骤

1. 学生登录 student 端。
2. 选择一个岗位执行投递。
3. 提交阶段进度。
4. 提交岗位辅导申请。
5. 到 student `我的求职` 查看记录。
6. 登录 admin，查看 `求职中心 -> 学员求职总览`、`未分配` 列表。

### 预期结果

学生投递后应在 admin `学员求职总览` 中产生申请记录，辅导申请后应能进入可分配导师的视图。

### 实际结果

student 端记录存在，但 admin `job-overview` 不产生对应申请。

### 根因定位

student 这三条动作只更新 `osg_student_job_position_state`，并未写入 admin 总览使用的 `osg_job_application`。

student 入口:
- [/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java:48](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java:48)
- [/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java:77](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java:77)
- [/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java:91](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/StudentPositionController.java:91)

student 状态写入:
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:261](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:261)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:293](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:293)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:307](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/PositionServiceImpl.java:307)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml:149](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml:149)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml:180](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml:180)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml:202](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentJobPositionMapper.xml:202)

admin 总览读取来源:
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java:38](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java:38)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java:103](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java:103)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java:115](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgJobOverviewServiceImpl.java:115)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml:66](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml:66)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml:97](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgJobApplicationMapper.xml:97)

当前未见从 student 状态表同步生成 `osg_job_application` 的逻辑。

### 需求真源补充

- admin SRS `FR-016` 明确要求 admin `学员求职总览` 具备 `待分配导师 / 全部学员` 两个主视图，以及分配导师、阶段确认等操作。
- admin PRD `05-admin-job-overview.md` 明确写明: 管理后台页与班主任端 `学员求职总览` 功能类似，但数据范围为全部学员。
- 班主任/助教端 PRD `03-mentor-job-overview.md` 定义了 `待分配导师 / 我辅导的学员 / 我管理的学员` 三个视图，说明学生辅导申请应继续流转到班主任端处理。
- 导师端 PRD `06-mentor-job-overview.md` 明确导师侧只看“我辅导的学员”，说明在分配发生前，导师端不应看到记录；分配发生后，导师端必须能收到记录。
- `REQ-FUN-003` 与 `REQ-FUN-004` 明确: 班主任负责安排导师，助教没有分配导师权限。

### 影响范围

- admin 无法基于学生真实投递进行分配导师。
- `学员求职总览`、`未分配`、后续阶段更新都无法覆盖最新 student 数据。
- 报表和漏斗数据与学生侧真实操作不一致。
- 班主任端 `待分配导师` 无法看到学生真实发起的辅导申请，核心职责无法落地。
- 助教端即使存在相似总览页，也无法在其数据范围内接收到正确的已分配/已辅导记录。
- 导师端无法接收到新的辅导任务，后续“我辅导的学员”视图与真实分配链路脱节。

### 验收标准

1. student 投递岗位后，自动生成或更新一条 `osg_job_application` 记录。
2. student 更新进度后，admin `学员求职总览` 当前阶段同步变化。
3. student 提交辅导申请后，admin 与班主任端都能在 `待分配导师` 视图中看到该申请。
4. 完成导师分配后，导师端 `我辅导的学员` 能收到对应记录，助教端不获得分配权限。
5. admin 或班主任确认阶段变更后，student 侧能看到一致的辅导状态变化。

## BUG-003 学生模拟应聘申请未进入 admin 模拟应聘管理

严重级别: `P1`
状态: `已复现`
影响模块:
- admin `模拟应聘管理`
- student `模拟应聘申请`
- lead-mentor `模拟应聘管理`
- assistant `模拟应聘管理`
- mentor `课程/排课下游链路`

### 问题现象

学生发起模拟应聘申请后，student 自己的概览里能看到新申请，但 admin `模拟应聘管理` 页面不会出现对应待分配记录。

### 复现步骤

1. 学生登录 student 端。
2. 发起一条模拟应聘申请。
3. 到 student `模拟应聘` 概览确认新记录可见。
4. 登录 admin，查看 `求职中心 -> 模拟应聘管理` 的待处理列表。

### 预期结果

学生发起模拟应聘申请后，应进入 admin 待分配列表，供管理员安排导师和时间。

### 实际结果

student 端记录存在，但 admin 不生成对应待处理记录。

### 根因定位

student 申请写入的是 `osg_student_mock_request`:
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentMockPracticeServiceImpl.java:239](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/StudentMockPracticeServiceImpl.java:239)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentMockPracticeMapper.xml:44](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentMockPracticeMapper.xml:44)

student 概览也读的是这张表:
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentMockPracticeMapper.xml:7](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/student/StudentMockPracticeMapper.xml:7)

而 admin `模拟应聘管理` 读的是另一张 `osg_mock_practice`:
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgMockPracticeMapper.xml:62](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgMockPracticeMapper.xml:62)
- [/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgMockPracticeMapper.xml:86](/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/resources/mapper/system/OsgMockPracticeMapper.xml:86)

当前没有看到 student 请求同步到 `osg_mock_practice` 的桥接。

### 需求真源补充

- admin SRS `FR-017` 明确要求 admin `模拟应聘管理` 包含 `待分配导师 / 全部记录` 两个主视图，并支持分配导师与预约时间。
- `REQ-FUN-003` 明确: 模拟面试与岗位无关，学生申请后由班主任安排导师。
- `REQ-FUN-004` 明确: 助教不能创建新课程或安排模拟面试，因此这条链路的分配责任不能落到助教端。
- 产品总 PRD `PRD-001_PRD.md` 也确认: 学生可以申请模拟面试，申请后由班主任安排导师；真实流程不是 student 与 admin 的孤立闭环。

### 影响范围

- admin 无法处理 student 真实发起的模拟应聘。
- student 与 admin 数据面分裂。
- admin `pendingCount` 与 student 当前申请不一致。
- 班主任端无法按真实学生申请安排模拟面试导师与时间。
- 助教端不具备分配权限，但当前缺口会让业务误以为只是 admin 页面没数据，掩盖了真正的责任链断裂。
- 导师端后续无法收到模拟面试安排，课程记录、反馈、后台审核链路都无法从真实学生申请触发。

### 验收标准

1. student 发起模拟应聘申请后，生成 admin 与班主任端都可见的 `pending` 记录。
2. admin `模拟应聘管理` 或班主任端能直接按 student 申请做导师分配和预约时间。
3. 助教端不提供导师分配入口，但可在其权限范围内看到正确的下游结果。
4. 分配后的导师、时间、状态能回流到 student 侧视图，并继续流转到导师上课/反馈链路。

## BUG-004 基础数据管理是内存实现，非持久化

严重级别: `P2`
状态: `已复现`
影响模块:
- admin `基础数据管理`

### 问题现象

基础数据管理接口可以新增、修改、停用，但实现是 controller 内存列表，不是数据库持久化。

### 复现步骤

1. 登录 admin。
2. 在 `基础数据管理` 新增一条数据。
3. 查询可见。
4. 重启服务后重新进入页面。

### 预期结果

基础数据应落库并持续存在。

### 实际结果

当前实现仅在内存列表上变更，服务重启后会丢失。

### 根因定位

`OsgBaseDataController` 在 controller 内直接维护 `rows`，没有 service、mapper、repository 层持久化。

关键代码:
- [/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:29](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:29)
- [/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:65](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:65)
- [/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:92](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:92)
- [/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:119](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:119)
- [/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:136](/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/osg/OsgBaseDataController.java:136)

### 影响范围

- 测试环境看似可用，实际上不是可交付实现。
- 任何重启都会丢基础数据变更。
- 无法作为真实后台主数据来源使用。

### 验收标准

1. 基础数据改为持久化实现。
2. 新增、编辑、停用后重启服务数据仍然存在。
3. 列表筛选行为与数据库真实数据一致。

## 测试证据摘要

2026-03-20 真实测试结果:
- `curl` 脚本完成了 admin 可操作链路测试。
- Playwright MCP 完成了 admin 登录页、目标页面访问、导师排期真实修改并回滚。
- 上述 4 个缺口均在共享测试环境中复现，不是单纯静态代码推断。

## 建议优先级

1. 先补 `BUG-001`、`BUG-002`、`BUG-003` 的 student -> admin 数据桥。
2. 修复时同步补齐 admin -> 班主任 -> 导师 的后续流转，避免只把数据塞进 admin 页面却继续断在下游。
3. 实现时保持状态归属清晰，避免 admin 与 student 双向覆盖同一份原始申请数据。
4. 再把 `BUG-004` 的基础数据管理替换为持久化实现。
5. 完成后重新执行 `curl` + Playwright 回归。
