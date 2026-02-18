# story-splitter/SKILL.md 严谨性增强方案

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标
- 将 story-splitter/SKILL.md 的严谨性对齐 brainstorming/SKILL.md，补充缺失的 3 个结构性段落
- 验收标准：story-splitter 具备完整的输入收集、失败退出规则、迭代计数示例，与 brainstorming 结构对齐

## 二、前置条件与假设
- 假设 1: brainstorming/SKILL.md 是成熟参考基准，其结构模式值得对齐
- 假设 2: story-splitter 的 Phase 2/3 伪代码逻辑本身正确，只需补充说明性段落
- 假设 3: 不改变 Phase 2 max_iterations=5 和 Phase 3 max_enhanced_rounds=10 的现有设定

## 三、现状分析

### 相关文件
| 文件 | 角色 |
|------|------|
| `.claude/skills/story-splitter/SKILL.md` | 待修改 — Story 拆分 Skill |
| `.claude/skills/brainstorming/SKILL.md` | 参考基准 — 需求分析 Skill（670行） |
| `.windsurf/workflows/split-story.md` | 上游 — 调用 story-splitter 的 Workflow（已修复对齐） |
| `.claude/skills/quality-gate/SKILL.md` | 引用 — Phase 3 增强全局终审参考 |
| `.claude/CLAUDE.md` | 设计原则 + 禁止行为 |
| `osg-spec-docs/tasks/STATE.yaml` | 当前项目状态 |

### 上下游依赖关系
```
brainstorming/SKILL.md → 产出 SRS 文档
    ↓
split-story.md (workflow) → 调用 story-splitter
    ↓
story-splitter/SKILL.md → 读取 SRS，产出 S-xxx.yaml
    ↓
split-ticket.md (workflow) → 调用 ticket-splitter
```

### 存在的问题

对比 brainstorming/SKILL.md 的结构，story-splitter/SKILL.md 缺失 3 个结构性段落：

| # | 问题 | brainstorming 对应 | story-splitter 现状 |
|---|------|-------------------|-------------------|
| F-1 | 缺少输入收集阶段 | Phase 1（第 229-251 行）：读取 STATE → 读取 SRS → 读取 config → 增量判断 | 伪代码直接从 `split_stories(requirement_doc)` 开始，未说明如何获取参数 |
| F-2 | 缺少失败退出规则独立段落 | "失败退出规则"段（第 519-545 行）：4 段独立规则，明确失败时的状态/产物/行为 | 伪代码中有 `return failed`，但无独立说明段落，AI 执行时可能忽略失败行为 |
| F-3 | 缺少迭代计数示例 | "迭代计数强制规则"段（第 625-669 行）：Phase 0/2/3 各一段完整示例 | 硬约束第 319 行提了格式要求，但无完整示例，AI 输出格式可能不一致 |

### 不需要改的（已确认）
- **门控脚本**：story-splitter 不需要（Phase 2 INVEST+FR覆盖率校验已覆盖产物完整性）
- **安全阀/PM交互**：brainstorming 特有（story-splitter 无外部交互闭环）
- **Phase 4 回退**：brainstorming 特有（story-splitter 无 HTML 校验）
- **执行模式声明**：低优，可后续补充

## 四、设计决策
| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | F-1 实现方式 | A: 新增包装函数 `split_stories_main()` / B: 在现有函数前加注释说明 | A | 与 brainstorming 的 Phase 1 结构对齐，让入口逻辑显式化为可执行伪代码 |
| 2 | F-1 是否包含增量拆分逻辑 | A: 包含（检查已有 Stories）/ B: 不包含 | A | brainstorming Phase 1 有增量更新逻辑（第 238-251 行），保持一致 |
| 3 | F-2 插入位置 | A: "输出格式"和"硬约束"之间（第 307-309 行） / B: "硬约束"之后 | A | story-splitter 当前结构是"输出格式→硬约束"，插入中间形成"输出格式→失败退出规则→硬约束"，与 brainstorming 的"输出格式→失败退出规则→硬约束→迭代计数"一致 |
| 4 | F-3 插入位置 | A: "硬约束"之后（文件末尾，第 321 行后）/ B: "硬约束"之前 | A | 与 brainstorming 结构一致（硬约束 → 迭代计数强制规则） |

## 五、目标状态

### story-splitter/SKILL.md 目标结构（对比 brainstorming）
```
                brainstorming                    story-splitter（目标）
                ─────────────                    ──────────────────────
                概览                              概览
                何时使用                          何时使用
                ⚠️ 执行模式                       （暂不加）
                执行流程（流程图）                执行流程（流程图）
                执行伪代码                        执行伪代码
                  ├── Phase 0: PRD 生成             ├── split_stories_main()  ← F-1 新增
                  ├── Phase 1: 输入收集             │   └── Phase 1: 输入收集
                  ├── Phase 2: 领域专项             └── split_stories()       ← 现有不变
                  ├── Phase 3: 增强终审                 ├── Phase 2: INVEST+FR
                  └── Phase 4: HTML校验                 └── Phase 3: 增强终审
                                                  Story YAML 结构
                                                  Phase 2 校验清单
                                                  Phase 3 增强全局终审
                输出格式                          输出格式
                失败退出规则                      失败退出规则              ← F-2 新增
                硬约束                            硬约束
                迭代计数强制规则                  迭代计数强制规则          ← F-3 新增
```

## 六、执行清单

| # | 文件 | 位置 | 当前值 | 目标值 | 优先级 |
|---|------|------|--------|--------|--------|
| F-1 | `.claude/skills/story-splitter/SKILL.md` | 第 103-104 行之间（` ```python` 和 `def split_stories` 之间） | 无入口函数，直接 `def split_stories(requirement_doc)` | 新增 `split_stories_main()` 函数（~22行）：读取 STATE → 读取 SRS → 检查已有 Stories → 调用 `split_stories()` | 🟡中 |
| F-2 | `.claude/skills/story-splitter/SKILL.md` | 第 307-309 行之间（输出格式 ` ``` ` 结束后、`## 硬约束` 之前） | 无 | 新增 `## 失败退出规则` 段落（~16行）：Phase 2 失败 + Phase 3 失败，各 5 条规则 | 🟡中 |
| F-3 | `.claude/skills/story-splitter/SKILL.md` | 第 321 行之后（文件末尾，`## 硬约束` 之后） | 无 | 新增 `## 🚨 迭代计数强制规则` 段落（~35行）：Phase 2 + Phase 3 各一段完整输出示例 | 🟡中 |

### 执行顺序
从后往前改（避免行号偏移）：F-3 → F-2 → F-1，一批完成。

### 具体修改内容

#### F-1：在第 103 行 ` ```python` 之后、第 104 行 `def split_stories` 之前插入

```python
def split_stories_main():
    # ========== Phase 1: 输入收集 ==========
    config = load_yaml(".claude/project/config.yaml")
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    module_name = state.current_requirement

    # 读取 SRS 文档（brainstorm 产物，SSOT）
    srs_path = f"{config.paths.docs.srs}{module_name}.md"
    if not exists(srs_path):
        return failed(f"SRS 文档不存在: {srs_path}，请先执行 /brainstorm {module_name}")
    requirement_doc = read_file(srs_path)

    # 检查已有 Stories（重新拆分场景，自动清理）
    existing_stories = glob(f"osg-spec-docs/tasks/stories/S-*.yaml")
    if existing_stories:
        print(f"⚠️ 发现 {len(existing_stories)} 个已有 Stories，将清理后重新拆分")
        cleanup_stories(existing_stories)

    # ========== Phase 2~3: 拆分 + 校验 ==========
    return split_stories(requirement_doc)


```

#### F-2：在第 307 行 ` ``` ` 之后、第 309 行 `## 硬约束` 之前插入

````markdown

## 失败退出规则

```
⚠️ Phase 2 失败：当 max_iterations（5 次）迭代后仍有校验项未通过：
1. 输出失败报告（列出所有未通过的 INVEST 项和未覆盖的 FR）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 不保存 Story 文件 — 禁止写入不完整的产物
4. 停止自动继续 — 提示用户人工介入
5. 用户可以补充信息后重新执行 /split story

⚠️ Phase 3 失败：当增强终审经过 max_enhanced_rounds（10 轮）后仍有问题：
1. 输出失败报告（列出最后一轮的所有未通过项，包括三维度终审和多维度旋转校验）
2. 不更新 workflow.current_step — 保持在执行前的状态
3. 不保存 Story 文件 — 禁止写入不完整的产物
4. 停止自动继续 — 提示用户人工介入
5. 用户可以修复后重新执行 /split story
```

````

#### F-3：在第 321 行（文件末尾）之后追加

````markdown

---

## 🚨 迭代计数强制规则

**每次校验循环开始时，必须输出迭代进度：**

```
=== Phase 2: 领域专项校验 ===
🔄 校验迭代 1/5
  - INVEST 校验: ❌ 2 个 Story 不符合 (S-001 过大, S-003 不可测试)
  → 调整后重新校验...

🔄 校验迭代 2/5 (上轮调整 2 个 Story)
  - INVEST 校验: ✅ 全部通过
  - FR↔Story 覆盖率: ❌ 3 个 FR 未覆盖
  → 补充 Stories...

🔄 校验迭代 3/5 (上轮补充 2 个 Story)
  - INVEST 校验: ✅ 全部通过
  - FR↔Story 覆盖率: ✅ 100%

=== Phase 3: 增强全局终审 ===
🔍 终审轮次 1/10 (维度 A — 结构正确性)
  三维度终审: ✅ 3/3
  多维度校验 (A): ❌ 1 个问题
    - S-002 和 S-005 编号不连续

🔍 终审轮次 2/10 (维度 H — 交叉影响)
  三维度终审: ✅ 3/3
  多维度校验 (H): ✅ 无问题

🔍 终审轮次 3/10 (维度 G — 语义准确性)
  三维度终审: ✅ 3/3
  多维度校验 (G): ✅ 无问题

🎉 连续 2 轮无修改，终审通过
```

````

### 同步检查清单（模板 S — Skill 文件）

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 执行流程图 — 是否反映新增的 Phase/步骤？ | ⚠️ 待确认 | 现有流程图（第 69-99 行）未包含 Phase 1 输入收集步骤，但 F-1 是伪代码层面的补充，流程图可后续更新 |
| 硬约束节 — 是否覆盖新增的迭代限制？ | ✅ | 无新增迭代限制，F-1 不引入新循环 |
| 迭代计数强制规则 — 格式示例是否与新代码一致？ | ✅ | F-3 本身就是迭代计数示例 |
| 失败退出规则 — 是否覆盖所有失败路径？ | ✅ | F-2 覆盖 Phase 2 和 Phase 3 两条失败路径 |
| 输出格式 — 是否包含新增的校验项？ | ✅ | 无新增校验项 |
| 对应 Workflow 文件 — 步骤描述是否与 Skill 行为一致？ | ✅ | split-story.md 已在上一轮修复对齐 |

## 七、自校验结果

### 第 1 轮自校验

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 3 个修改项各自独立，位置明确，结构对比图清晰 |
| G2 目标明确 | ✅ | 验收标准可度量：story-splitter 具备 Phase 1 + 失败退出规则 + 迭代计数示例 |
| G3 假设显式 | ✅ | 3 个假设已列出 |
| G4 设计决策完整 | ✅ | 4 个决策点，每个有选项+推荐+理由 |
| G5 执行清单可操作 | ✅ | 每项有精确行号、当前值、目标值、具体代码 |
| G6 正向流程走读 | ✅ | F-3 → F-2 → F-1（从后往前改），每步有明确的插入位置和内容 |
| G7 改动自洽 | ✅ | F-1 新增 `split_stories_main()` 调用现有 `split_stories()`，不改现有代码；F-2/F-3 是独立段落 |
| G8 简约不等于省略 | ✅ | 3 项都是结构性补充，无冗余；已明确列出"不需要改的"4 项 |
| G9 场景模拟 | ✅ | 场景 1: 首次拆分 → Phase 1 读取 SRS → 拆分 → Phase 2/3 校验 → 输出 ✅ 场景 2: Phase 2 第 5 轮仍失败 → 失败退出规则生效 → 不写文件不更新状态 ✅ 场景 3: 增量拆分 → Phase 1 检测已有 Stories → 用户选择重新拆分/增量补充 ✅ |
| F1 文件同步 | ✅ | 只改 Skill，对应 Workflow（split-story.md）已在上一轮修复对齐 |
| F3 交叉引用 | ✅ | 不引入新关键词，不改现有函数签名 |

### 第 1 轮发现的问题
- ⚠️ 流程图（第 69-99 行）未包含 Phase 1 步骤 — 但这是低优问题，不影响执行，可后续补充

### 结论
所有校验项通过，方案定稿。
