# Skill Hardening for Framework Audits Design

> 日期：2026-03-07
> 范围：修复个人 skills，使后续框架设计、计划、校验不再遗漏源头接线、guard 复用冲突和阶段门禁
> 目标：让 future modules 的 framework 变更在文档阶段就被严格回源审查，而不是实现后才暴露设计缺口

---

## 1. 问题定义

这轮 truth-contract 方案暴露出的问题，不完全是业务框架本身，而是上游 skills 对“方案审查强度”的要求还不够硬。

具体表现为：

1. `brainstorming` 允许我们形成方向正确但接线不完整的设计。
- 典型漏项：没有第一时间把新 contract 对接到 `prototype-extraction / brainstorming / brainstorm workflow`。

2. `writing-plans` 允许我们写出“方向正确、任务清晰”，但未强制检查：
- 是否已有同类 guard 可以复用
- 是否会与现有 guard 命名/职责冲突
- 是否写清楚 source-stage 生成路径
- 是否补了阶段回归验证

3. `verification-before-completion` 目前更偏向代码/测试成功验证，缺少“文档和计划的回源校验”模式。
- 结果是会出现“文档看起来完整，但并不能无歧义指导现有仓库落地”。

4. `writing-skills` 虽然强调 TDD for skills，但没有针对“框架方案审查”这类场景提供明确的 pressure cases。
- 所以 skill 改得再漂亮，也可能继续漏掉“现有入口对表”“guard 重叠”“阶段门禁前移”这类问题。

一句话：

当前 skills 更擅长保证“有流程”，但还不够擅长保证“框架方案一定对得上现有仓库入口和约束链路”。

---

## 2. 设计目标

### 2.1 必须达到

1. 任何框架/工作流/skill 方案，在设计阶段必须回查现有入口文件。
2. 任何 implementation plan，在写任务前必须先做现有 guard 复用边界与命名冲突审查。
3. 任何“文档已完善”“方案已可落地”的结论，必须有回源验证命令和证据。
4. skill 修改本身也必须有压力测试用例，验证不会再次漏掉类似问题。
5. 以上要求必须是通用规则，不依赖当前 `permission` 模块。

### 2.2 明确不做

1. 不把当前项目的具体业务词（如 login、mailjob、permission）硬编码到 skills 里。
2. 不增加纯人工 checklist 代替硬要求。
3. 不把 skill 修复建立在“以后记得多检查一点”这种软承诺上。

---

## 3. 方案对比

### 方案 A：只修 `using-superpowers`

做法：
- 仅在 `using-superpowers` 中增加“更严格检查”的提醒。

优点：
- 改动少。

缺点：
- 只会变成更强的口号，不会改变 `brainstorming / writing-plans / verification-before-completion` 的具体执行要求。

结论：
- 不采用。

### 方案 B：修 3 个核心 process skills + 1 个 meta skill

做法：
- `brainstorming`：强制设计阶段做现有入口回源
- `writing-plans`：强制计划阶段做 guard 复用/冲突/阶段验证设计
- `verification-before-completion`：增加文档/计划完成前的回源验证模式
- `writing-skills`：补压力测试场景，验证上述 skill 真能防漏

优点：
- 直接命中这次真实失效链路。
- 改动集中，通用性强。

缺点：
- 需要修改多个 personal skills。

结论：
- **采用**。

### 方案 C：新建一个专门的 framework-audit skill

做法：
- 新增 skill，专门负责框架方案审查。

优点：
- 职责清晰。

缺点：
- 与现有 `brainstorming / writing-plans / verification-before-completion` 重叠。
- 未来还是可能因为没调用新 skill 而漏掉。

结论：
- 不作为主方案。

---

## 4. 核心设计

## 4.1 需要修改的 skills

1. `brainstorming`
- 新增规则：凡是 framework / workflow / guard / skill 级变更，设计阶段必须先做“现有入口回源清单”。
- 至少覆盖：
  - workflow files
  - gate scripts
  - current guards
  - source-stage generators
- 设计未对上这些入口，不允许进入“设计已批准”。

2. `writing-plans`
- 新增 plan 强制段落：
  - existing-entrypoint inventory
  - guard reuse / collision audit
  - source-stage integration path
  - stage-regression verification
- 计划里如果新增 guard，必须先说明为什么不能复用现有 guard。
- 计划里如果新增 contract/artifact，必须先说明源头在哪一阶段生成。

3. `verification-before-completion`
- 新增 doc-plan mode：
  - 当结论是“文档完整”“方案可落地”时，不能只看文档内部自洽
  - 必须回查实际仓库中的 workflow/skill/script/guard 入口
- 没证据不准说“已完善”。

4. `writing-skills`
- 新增 pressure scenarios 模板：
  - 漏 source-stage 接线
  - 与现有 guard 重复造轮子
  - 逻辑 guard 与物理实现文件分叉
  - 缺阶段回归验证
- skill 修改未通过这些场景，不允许部署。

## 4.2 强化后的统一铁律

以后凡是做 framework / workflow / guard / skill 方案，必须同时满足：

1. **入口对表**
- 方案必须明确对应现有入口文件，否则 fail。

2. **复用优先**
- 方案新增 guard/脚本前，必须先证明现有 guard 不能扩展复用，否则 fail。

3. **源头先行**
- 新 artifact/new contract 必须先说明在哪个最早阶段生成，否则 fail。

4. **阶段回归**
- 不能只验证 final gate；必须验证前移后的阶段门禁也生效，否则 fail。

5. **证据先于结论**
- 没有回源命令和输出证据，不得宣称“文档已完善”“方案可落地”。

---

## 4.3 通用性设计

本设计不依赖当前业务模块，只依赖稳定问题类型：

- source-stage generation missing
- entrypoint mismatch
- guard reuse/collision
- logical/physical implementation drift
- final-only verification blind spot

因此它可以通用于后续任何模块，只要模块仍基于同一套 workflow + gate + skills 体系。

---

## 5. 验收标准

1. 新 skill 文档中明确写出上述 5 条铁律。
2. 对一个新的 framework 设计任务，skills 会主动要求先做入口清单和 guard 冲突检查。
3. 对一个新的 implementation plan，skills 会主动要求写 source-stage integration 与 stage-regression verification。
4. 对“文档已完善”的结论，skills 会要求给出实际回源命令和证据。
5. 对 skill 自身修改，至少有一组压力场景能证明这些漏项不会再次被放过。

---

## 6. 推荐实施顺序

1. 先改 `brainstorming`
2. 再改 `writing-plans`
3. 再改 `verification-before-completion`
4. 最后改 `writing-skills`，把前三者的失败案例固化成 skill 测试场景

这样改的原因是：
- 先修过程技能
- 再修完成判定技能
- 最后用 skill-writing discipline 把这些修复本身锁住
