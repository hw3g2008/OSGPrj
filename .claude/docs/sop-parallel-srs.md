# SOP：三端并行到 SRS（只做 /brainstorm 产物）

> 目标：将 mentor / lead-mentor / assistant 三个端的“需求分析阶段”并行推进到 **SRS（brainstorm 产物）**，不进入 Story/Ticket 拆分与实现。
>
> 适用场景：
> - 三端都需要从 HTML 原型（SSOT）生成/同步 PRD，并产出 SRS
> - 希望先把需求资产固化，避免后续实现阶段因需求漂移返工
> - 避免并行生成 Story/Ticket 的 ID 撞号问题

---

## 0. 核心原则（必须遵守）

1) **每端一个 worktree**：并行时必须隔离 `STATE.yaml` 与工作流指针。
2) **本 SOP 只做到 /brainstorm**：
   - ✅ 允许产出 PRD/SRS/DECISIONS
   - ❌ 不执行 `/split story`、`/split ticket`、`/next`、`/verify`
3) **合并只合并 PRD/SRS/DECISIONS**：禁止把各 worktree 的 `STATE.yaml` 合并回主线。

---

## 1. Definition of Done（完成标准）

对每个端（module）分别满足：

- PRD 目录存在且非空：
  - `osg-spec-docs/docs/01-product/prd/{module}/**`
- SRS 文件存在：
  - `osg-spec-docs/docs/02-requirements/srs/{module}.md`
- 若存在待确认项：决策日志存在：
  - `osg-spec-docs/docs/02-requirements/srs/{module}-DECISIONS.md`
- 该 worktree 内 workflow 状态满足其一：
  - 无待确认项：`brainstorm_done → split_story`（但本 SOP 到此停止）
  - 有待确认项：`brainstorm_pending_confirm → approve_brainstorm`（停止等待产品裁决）

---

## 2. 并行对象与输入源

### 2.1 三端并行对象

- mentor
- lead-mentor
- assistant

### 2.2 SSOT（唯一真实来源）

- HTML 原型位于：`osg-spec-docs/source/prototype/`
- module → prototype 映射来自：`.claude/project/config.yaml: prd_process.module_prototype_map`

---

## 3. worktree 准备（每端一个会话）

> 建议开 3 个终端窗口（或 3 个 Claude 会话），每个会话创建一个 worktree。

示例命名（可调整）：

- mentor：`mentor-srs`
- lead-mentor：`lead-mentor-srs`
- assistant：`assistant-srs`

启动方式示例：

```bash
claude --worktree mentor-srs --name mentor-srs
claude --worktree lead-mentor-srs --name lead-mentor-srs
claude --worktree assistant-srs --name assistant-srs
```

> 若你不使用 `claude --worktree`，也可以用 `git worktree add` 手工创建，再进入目录运行 `claude`。关键是“目录隔离”。

---

## 4. 每端执行步骤（只跑 /brainstorm）

在对应 worktree 中执行：

- mentor worktree：
  - `/brainstorm mentor`
- lead-mentor worktree：
  - `/brainstorm lead-mentor`
- assistant worktree：
  - `/brainstorm assistant`

### 4.1 /brainstorm 的预期行为（摘要）

- Phase 0：PRD 生成闭环
  - PRD 不存在 → 从 HTML 全量生成
  - PRD 已存在 → 询问“重新生成/使用已有”
  - 若出现 HTML 内部问题/差异 → 写入 `{module}-DECISIONS.md` 并可能阻塞
- Phase 1：生成 SRS 初稿
- Phase 2：正向/反向/PRD 覆盖率/UI 专项校验循环（直到全部 ✅）
- Phase 3：增强全局终审（连续两轮无修改通过）
- Phase 4：HTML↔PRD↔SRS 全量校验

### 4.2 只交付范围（“其余占位”策略）

本 SOP 不内置具体业务范围；范围由产品输入决定。

#### 4.2.1 Scope 输入模板（建议复制填写）

全局规则：
- Home/首页（dashboard/home）是否交付：交付 | 占位
- 基础框架（登录后主框架/菜单/路由/鉴权/退出/401）是否必须完整：是 | 否
- 非 P0 功能占位策略：
  - 入口：保留可点 | 隐藏
  - 行为：进入占位页 + Toast 文案（默认："敬请期待"）

按端填写（mentor / lead-mentor / assistant）：
- P0 功能清单（按模块分组）
- 各端独立的关键业务规则/边界（如有）：
  - 权限/数据范围边界
  - 状态推进责任（谁确认/谁分配/谁上报/谁审核）

#### 4.2.2 本次 Scope 实例（v2026-03-17，三端并行到 SRS）

全局规则：
- 首页（dashboard/home）：只占位
- 每端基础框架必须完整：是
- 非 P0 功能：入口保留可点 → 进入占位页 + Toast："敬请期待"

mentor（导师端）P0：
1) 登录模块：登录、忘记密码
2) 教学中心：课程记录
3) 求职中心：学员求职总览、模拟应聘管理
4) 个人中心：基本信息、课程排期

lead-mentor（班主任端）P0：
1) 登录模块：登录、忘记密码
2) 求职中心：岗位信息、学员求职总览、模拟应聘管理
3) 学员中心：学员列表
4) 教学中心：课程记录
5) 个人中心：基本信息、课程排期

assistant（助教端）P0：
1) 登录模块：登录、忘记密码
2) 求职中心：岗位信息、学员求职总览、模拟应聘管理
3) 学员中心：学员列表
4) 教学中心：课程记录
5) 个人中心：基本信息、课程排期

注意：若 assistant 端 PRD/SRS 已存在且与本次 scope 冲突（如历史上裁剪为仅登录闭环），则在 Phase 0 选择“重新生成”。

---

## 5. 合并策略（回主线）

### 5.1 允许合并的文件范围

仅合并：
- `osg-spec-docs/docs/01-product/prd/{module}/**`
- `osg-spec-docs/docs/02-requirements/srs/{module}.md`
- `osg-spec-docs/docs/02-requirements/srs/{module}-DECISIONS.md`

### 5.2 禁止合并的文件范围（重要）

- `osg-spec-docs/tasks/STATE.yaml`
- `osg-spec-docs/tasks/stories/**`
- `osg-spec-docs/tasks/tickets/**`
- `osg-spec-docs/tasks/proofs/**`

> 原因：`STATE.yaml` 是单指针工作流；并行 worktree 合并它会覆盖彼此 workflow，且 Story/Ticket 会撞号。

---

## 6. 本段结束后的下一段（实现层 Teams）

当三端 PRD/SRS 都合并回主线后，再进入：

1) 主控串行：`/split story` → `/split ticket`
2) 建立“实现层 Teams（角色分工：UI/Dev/Test）”
3) 执行端并行实现；主控串行 `/next` `/verify` 落证据

---

## 7. 常见问题（FAQ）

### Q1：为什么不在本段并行 /split story / /split ticket？
因为 Story/Ticket ID 是全局编号（S-001/T-001…），三端并行生成会撞号，后续 proof/guards/引用都会乱。

### Q2：为什么禁止合并各 worktree 的 STATE.yaml？
`STATE.yaml` 是 workflow 单指针，合并会覆盖 current_step/next_step/current_requirement 等关键字段，造成工作流错乱。

### Q3：如果 /brainstorm 卡在 pending_confirm 怎么办？
按产物 `osg-spec-docs/docs/02-requirements/srs/{module}-DECISIONS.md` 裁决后，再在该 worktree 执行 `/approve brainstorm` 或重跑 `/brainstorm {module}`。
