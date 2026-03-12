# 测试场景义务修复方案

> **基于**: `docs/permission-test-coverage-analysis.md` 的分析结论
> **目标**: 让框架不仅能强制“做测试”，还能强制“做对测试、做全关键测试”
> **日期**: 2026-03-12

## 一、问题定义

### 根因（2 个）

1. **Source Stage 缺少机器可读的测试场景义务**  
   Story/Ticket 拆分阶段目前只要求“有展示类 AC”和“有 E2E 命令”，没有把关键页面必须覆盖的测试场景类别前置为机器可读约束。

2. **Verification 缺少基于现有测试资产的完整性门禁**  
   当前 gate 能拦“没跑测试”和“E2E 写法太弱”，但不能利用现有 `test-cases.yaml` / traceability 资产判断“关键场景有没有被真正覆盖并执行”。

### 症状

- 认证/找回密码链路测试深，是开发时主动做深，而不是框架强制做深。
- 角色/用户/基础数据/仪表盘容易退化为“页面打开 + API 200 + 表格可见”。
- 框架能跑 E2E，但无法判断是否漏掉了业务规则拒绝、权限负例、持久化断言这类关键场景。

---

## 二、现有资产盘点

### 2.1 现有入口与资产链

| 节点 | 现状 | 结论 |
|------|------|------|
| `story-splitter/SKILL.md` | 已有展示类 AC 校验 | 可扩展为“场景义务前置”入口 |
| `ticket-splitter/SKILL.md` | 已有质量校验 + TC 骨架生成 | 应继续作为测试场景到测试资产的承接点 |
| `verification/SKILL.md` | 已调用 `test_asset_completeness_guard.py` + 全量测试 + AC 覆盖率 | 可扩展为“场景完整性”校验入口 |
| `osg-spec-docs/tasks/testing/{module}-test-cases.yaml` | 已存在模块级测试资产真源 | 必须复用，不能再造新 YAML |
| `osg-spec-docs/tasks/testing/{module}-traceability-matrix.md` | 已存在追踪矩阵 | 继续作为派生可读资产 |
| `test_asset_completeness_guard.py` | 已读取 story/ticket/test-cases/matrix 四类资产 | 应优先扩展，而不是新建同类 guard |
| `requirements_coverage_guard.py` | 已做 requirements → story/tests 级覆盖校验 | 保持上游职责，不挤占 test-asset guard 职责 |

### 2.2 已有测试分类真源

当前仓库已经有两套相关 taxonomy，不应再平行发明第三套：

- `.claude/project/config.yaml`
  - `testing.required_test_types`: `positive / negative / boundary / exception / null_empty`
  - `testing.api_test_dimensions`: `happy_path / negative / boundary / security / performance`
- `.claude/templates/ticket.yaml`
  - `test_cases[].category`: `positive / negative / boundary / exception / null_empty`

> 注意：`ticket.yaml` 里的 `category` 目前是**注释模板示例**，不是运行时 schema 校验器；  
> 但它仍然是 AI 输出格式的重要提示源，因此方案需要同步更新该模板注释。

**结论**:  
本次修复必须**复用现有 `category` 枚举**，只允许在此基础上新增“场景义务”维度，不能用 `happy/reject/...` 直接替代当前分类体系。

### 2.3 当前需要兼容的现实约束

在执行前必须显式承认并处理这 4 个现实约束：

1. `test_asset_completeness_guard.py` 当前**完全不读取** `category` 字段，更不读取 `scenario_obligation`。  
   这意味着 verification 层必须先扩展 guard，再谈场景义务门禁。

2. 现有 `Story` YAML 还没有 `required_test_obligations` 字段。  
   比如 [S-001.yaml](/Users/hw/workspace/OSGPrj/osg-spec-docs/tasks/stories/S-001.yaml#L1) 只有 `acceptance_criteria` / `requirements` / `tickets` 等旧字段，因此必须设计向后兼容策略。

3. 当前 `ticket-splitter` 伪代码不会解析 `[positive][display]` 这类双标签。  
   如果采用这种 authoring syntax，就必须同步补充解析 helper 和派生逻辑。

4. `config.yaml` 中新增配置不能模糊写“插在附近”，必须落到 `testing.required_test_types` 之后、`testing.api_test_dimensions` 之前这一段，避免破坏现有层级结构。

---

## 三、设计决策

| # | 决策点 | 选项 | 选择 | 理由 |
|---|--------|------|------|------|
| 1 | 是否新建 `scenario_completeness_guard.py` | A: 新建 / B: 扩展 `test_asset_completeness_guard.py` | **B** | 现有 guard 已读取 stories/tickets/cases/matrix，职责最接近“测试资产完整性”；新建会造成 guard 碰撞 |
| 2 | 是否新建 `test-coverage-matrix-{module}.yaml` | A: 新建 / B: 扩展现有 `{module}-test-cases.yaml` | **B** | 现有 `test-cases.yaml` 已是机器真源，另起文件会制造第二真源 |
| 3 | 场景分类如何与现有 taxonomy 对齐 | A: 发明 `happy/reject/...` 新体系 / B: 复用 `category` + 新增 `scenario_obligation` 次级字段 | **B** | `category` 已是现有真源；“场景义务”是补充维度，不应替换测试类型 |
| 4 | 场景义务的机器真源在哪里 | A: 新 YAML 文件 / B: Story YAML + Ticket test_cases + module test-cases 逐层派生 | **B** | 单真源链路更稳：Story 定义义务，Ticket/TC 资产承接，Verification 消费 |
| 5 | 纯展示页面如何要求 | A: 与 CRUD 同标准 / B: 采用较小 obligation profile | **B** | 仪表盘类页面没有变更操作，但仍需要 display + 数据语义/即时效果断言 |

---

## 四、目标状态（复用现有资产链）

### 4.1 单一真源链路

```
story-splitter
  ↓ 生成/补全 Story 的 required_test_obligations
ticket-splitter
  ↓ 将义务分配到 Ticket AC / ticket.test_cases
  ↓ 同步写入 osg-spec-docs/tasks/testing/{module}-test-cases.yaml
verification
  ↓ 复用 test_asset_completeness_guard.py 校验义务是否齐全且已执行
traceability matrix
  ↓ 继续作为派生可读资产，不单独成为新真源
```

### 4.2 两层维度，不再混淆

#### 第一维：复用现有测试类型 `category`

使用现有真源枚举：
- `positive`
- `negative`
- `boundary`
- `exception`
- `null_empty`

#### 第二维：新增场景义务 `scenario_obligation`

新增但不替代现有 taxonomy：
- `display`
- `state_change`
- `business_rule_reject`
- `auth_or_data_boundary`
- `persist_effect`

#### 映射关系

| `scenario_obligation` | 默认 `category` | 说明 |
|-----------------------|----------------|------|
| `display` | `positive` | 页面/列表/关键列/关键区域展示正确 |
| `state_change` | `positive` | 新增/编辑/启用/禁用等成功路径 |
| `business_rule_reject` | `negative` | 被业务规则拒绝，而非系统异常 |
| `auth_or_data_boundary` | `boundary` | 权限边界、数据范围边界、角色边界 |
| `persist_effect` | `positive` | 结果持久化、即时生效、二次进入仍成立 |

### 4.3 Story 义务配置

Story 不再只做“展示类 AC 校验”，而是产出机器可读的 obligation profile。

建议新增字段：

```yaml
required_test_obligations:
  profile: crud
  required:
    - display
    - state_change
    - business_rule_reject
    - auth_or_data_boundary
    - persist_effect
```

纯展示页面示例：

```yaml
required_test_obligations:
  profile: display_only
  required:
    - display
    - persist_effect
```

### 4.4 Ticket AC / test_cases 承接格式

Ticket AC 可以显式带双标签，便于 AI 和人共同阅读：

```yaml
acceptance_criteria:
  - "[positive][display] 角色列表页权限模块列非空"
  - "[positive][state_change] 新增角色后列表中出现新角色"
  - "[negative][business_rule_reject] 有员工绑定的角色删除被拒绝"
  - "[boundary][auth_or_data_boundary] 非超管无法访问角色管理页面"
  - "[positive][persist_effect] 角色权限变更后菜单立即更新"
```

对应 `ticket.test_cases` 和 `{module}-test-cases.yaml` 统一承接为：

```yaml
test_cases:
  - test_case_id: "TCS-T-001-001"
    ac_ref: "AC-S-001-01"
    case_kind: "ac"
    category: "positive"
    scenario_obligation: "display"
```

> 说明：`category` 复用现有真源，`scenario_obligation` 是附加字段。  
> 现有 guard 对未知字段天然兼容，因此这是扩展，不是破坏式改动。
>
> 进一步约束：  
> - `acceptance_criteria` 上的双标签只是**authoring shorthand**  
> - 真正供 guard 消费的结构化字段是：
>   - `ticket.test_cases[].category`
>   - `ticket.test_cases[].scenario_obligation`
>   - `{module}-test-cases.yaml` 中的对应字段
> - 因此必须在 `ticket-splitter` 中新增 `parse_ac_labels()` / `strip_ac_labels()` 一类解析步骤，把 AC 文本标签转成结构化字段后再写入 TC 资产

---

## 五、修复方案（3 层）

### 层面 1：Source Stage 前置场景义务

#### 1.1 `story-splitter` 产出 obligation profile

**文件**: `.claude/skills/story-splitter/SKILL.md`  
**目标**:
- 将“展示类 AC 校验”升级为“required_test_obligations 产出与校验”
- CRUD / 权限类 Story 默认要求：
  - `display`
  - `state_change`
  - `business_rule_reject`
  - `auth_or_data_boundary`
  - `persist_effect`
- 纯展示 Story 默认要求：
  - `display`
  - `persist_effect`

**结果**: Story YAML 成为场景义务的最上游机器真源。

#### 1.2 `ticket-splitter` 将义务拆解到 Ticket

**文件**: `.claude/skills/ticket-splitter/SKILL.md`  
**目标**:
- 质量校验从“展示验证”升级为：
  - Ticket AC 是否声明 `category`
  - Ticket AC 是否声明 `scenario_obligation`
  - 同一 Story 下的 Ticket 集合是否覆盖 Story 声明的全部 obligations
- 伪代码中新增 obligation coverage check
- 同步新增双标签解析步骤：
  - `parse_ac_labels(ac_text) -> {category, scenario_obligation, plain_text}`
  - 质量校验读取标签
  - TC 骨架生成写入结构化字段
  - guard 不直接解析原始 AC 文本，只消费结构化字段

#### 1.3 复用现有 TC 骨架生成

**文件**: `.claude/skills/ticket-splitter/SKILL.md`  
**目标**:
- 不新建 `test-coverage-matrix-{module}.yaml`
- 继续写现有 `osg-spec-docs/tasks/testing/{module}-test-cases.yaml`
- 生成 TC 时同步写入：
  - `category`
  - `scenario_obligation`

### 层面 2：Verification 复用现有 guard 做完整性门禁

#### 2.1 扩展 `test_asset_completeness_guard.py`

**文件**: `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py`  
**新增职责**:
1. 校验 Story 是否声明 `required_test_obligations`
2. 校验 Ticket `test_cases` 是否都有合法的：
   - `category`
   - `scenario_obligation`
3. 校验 `{module}-test-cases.yaml` 中对应行是否同步带有：
   - `category`
   - `scenario_obligation`
4. 校验当前 Story 的 required obligations 是否都被 Ticket / TC 资产覆盖
5. 在 verify 场景下，校验 required obligations 对应的 TC `latest_result.status` 不得为 `pending`

**结论**:  
不新建 guard，直接扩展现有“测试资产完整性”守卫，使其同时承担“场景义务完整性”职责。

**额外要求**:
- guard 的输入优先级必须明确：
  1. 优先读取结构化字段 `scenario_obligation`
  2. 不依赖原始 AC 文本标签做最终判定
  3. 对旧资产缺字段时进入兼容路径（见 §六.0）

#### 2.2 `verification/SKILL.md` 引用扩展后的现有 guard

**文件**: `.claude/skills/verification/SKILL.md`  
**目标**:
- 在 Phase 2 表格中新增“场景义务完整性”检查项
- 描述中明确：复用 `test_asset_completeness_guard.py` 的扩展能力，而不是引入新脚本

### 层面 3：需求到测试的映射复用现有 test-cases 真源

#### 3.1 不新增 coverage-matrix YAML

映射层直接复用：
- `osg-spec-docs/tasks/testing/{module}-test-cases.yaml`
- `osg-spec-docs/tasks/testing/{module}-traceability-matrix.md`

其中：
- `test-cases.yaml` 继续作为机器真源
- traceability matrix 继续作为可读派生资产

#### 3.2 在现有 `test-cases.yaml` 中表达映射关系

模块级 TC 资产新增两个维度：

```yaml
- tc_id: "TC-PERMISSION-T-001-TICKET-001"
  level: "ticket"
  story_id: "S-001"
  ticket_id: "T-001"
  ac_ref: "AC-S-001-01"
  category: "negative"
  scenario_obligation: "business_rule_reject"
  latest_result:
    status: "pass"
    evidence_ref: "osg-spec-docs/tasks/tickets/T-001.yaml"
```

这样 verification 可以直接判断：
- 这个 Story 需要哪些 obligations
- 对应 obligations 是否已经映射为 TC
- 对应 TC 是否已经有最新执行结果

---

## 六、向后兼容策略

### 6.0 旧 Story / 旧 Ticket / 旧 TC 资产兼容

本次修复不能假设仓库从零开始，必须按下面策略兼容旧资产：

#### 6.0.1 旧 Story 缺少 `required_test_obligations`

- **新生成 / 新重写** 的 Story：`story-splitter` 必须显式写入 `required_test_obligations`
- **旧 Story**：在 guard 与 `ticket-splitter` 中走兼容推导

兼容推导函数建议：

```python
def infer_required_test_obligations(story):
    if any(matches_mutation_or_permission_ac(ac) for ac in story.acceptance_criteria):
        return {
            "profile": "crud",
            "required": [
                "display",
                "state_change",
                "business_rule_reject",
                "auth_or_data_boundary",
                "persist_effect",
            ],
        }
    return {
        "profile": "display_only",
        "required": ["display", "persist_effect"],
    }
```

策略要求：
- `Story` 缺字段时，**不得立即 fail**
- 先推导 obligation profile
- 当 Story 下一次被 `/split story` 重写时，再落盘为显式字段

#### 6.0.2 旧 Ticket / 旧 test_cases 缺少 `category` / `scenario_obligation`

- 旧 Ticket 的 `test_cases` 缺字段时：
  - 优先根据 AC 双标签解析回填
  - 若 AC 也无标签，则按 `ac_ref` 与 Story obligation profile 做最小推导
- 旧 `{module}-test-cases.yaml` 缺字段时：
  - verification 阶段先允许兼容推导
  - 一旦对应 Ticket 被重新 split / update，应补齐结构化字段

#### 6.0.3 guard 的兼容行为

- `pending` / 资产缺失 / 覆盖缺失：继续 FAIL
- 仅“新字段不存在但旧资产可安全推导”这一类情况：允许兼容推导，不直接 FAIL
- 当无法安全推导时，才输出明确失败项，提示需要先升级 Story/Ticket 资产

---

## 七、执行清单

### 🔴 P0：核心闭环（4 项）

| # | 文件 | 位置 | 当前值 | 目标值 |
|---|------|------|--------|--------|
| 1 | `.claude/project/config.yaml` | 第 404-418 行之间：插在 `required_test_types`（405-410）之后、`api_test_dimensions`（412-418）之前 | 只有 `category` 枚举 | 新增 `testing.scenario_obligations`，定义 allowed obligations、profile、obligation→category 映射 |
| 2 | `.claude/skills/story-splitter/SKILL.md` | 第 204-223 行（当前展示类 AC 校验块） | 只检查展示类 AC | 改为生成/校验 `required_test_obligations`（CRUD / display_only 两类 profile），并声明旧 Story 缺字段时走推导兼容 |
| 3 | `.claude/skills/ticket-splitter/SKILL.md` | 第 136-144 行（质量表格）+ 第 295-306 行（展示验证伪代码）+ 第 250-266 行（Ticket 生成） | 只检查展示验证，不解析双标签 | 改为检查 `category` + `scenario_obligation` + Story obligations 全覆盖，并新增 `parse_ac_labels()` / `strip_ac_labels()` |
| 4 | `.claude/skills/ticket-splitter/SKILL.md` | 第 414-457 行（现有 TC 骨架生成块） | 只写现有 TC 基本字段 | 继续写 `{module}-test-cases.yaml`，并同步写入 `category` + `scenario_obligation`；旧 Ticket 缺标签时允许按兼容规则推导 |

### 🟡 P1：Verification 复用守卫（3 项）

| # | 文件 | 修改 |
|---|------|------|
| 5 | `.claude/skills/workflow-engine/tests/test_asset_completeness_guard.py` | 第 109-145 行（Ticket test_cases 提取）+ 第 148-240 行（主校验循环）+ `main()` 路径 | 扩展为同时校验 Story obligations、Ticket/module test-cases obligation 字段，以及 verify 阶段 required obligations 不得 pending；对旧 Story 缺字段先推导兼容 |
| 6 | `.claude/skills/verification/SKILL.md` | 第 90-94 行（Phase 2 表格） | Phase 2 新增“场景义务完整性”检查，明确复用扩展后的 `test_asset_completeness_guard.py` |
| 7 | `.windsurf/workflows/verify.md` 第 23-35 行 + `.claude/commands/verify.md` 第 17-22 行 | 同步说明 verify 会检查 required obligations 是否已被对应 TC 资产覆盖并执行，并注明旧 Story 缺字段时由 guard 兼容推导 |

### 🟡 P2：模板与资产同步（2 项）

| # | 文件 | 修改 |
|---|------|------|
| 8 | `.claude/templates/ticket.yaml` | 第 80-92 行（`test_cases` 注释模板） | 这是注释示例，不是 runtime schema；补充 `scenario_obligation` 示例并注明 `category` 仍沿用现有枚举 |
| 9 | `osg-spec-docs/tasks/testing/{module}-test-cases.yaml` 生成规则 + `ensure_traceability_rows(...)` | 继续复用现有资产链；必要时为 traceability matrix 增加可读列，但不改变其“派生资产”定位；新字段缺失时允许一次性迁移补齐 |

---

## 八、为什么这是正确修法

### 7.1 复用了现有真源

没有新增：
- `scenario_completeness_guard.py`
- `test-coverage-matrix-{module}.yaml`

因此不会产生：
- guard 职责碰撞
- 测试资产双真源
- taxonomy 平行演化

### 7.2 复用了现有分类体系

没有让 `happy/reject/...` 直接替代当前 `category` 枚举，而是：
- 保留 `positive / negative / boundary / exception / null_empty`
- 新增 `scenario_obligation` 作为补充维度

### 7.3 真正把“缺测试场景义务”前置并落地

修复后能形成完整闭环：

```
Story 声明 required obligations
→ Ticket 承接 obligation
→ module test-cases.yaml 落盘 obligation
→ verification 复用现有 guard 检查 obligation 是否齐全且已执行
```

这才是“从框架上补真正的缺失”，而不是给文档再加一层概念。

---

## 九、自校验

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | 三层修复仍保留，但改为复用现有资产链 |
| G5 执行清单可操作 | ✅ | 每项补到精确行号 / 代码块位置 |
| G7 改动自洽 | ✅ | Story obligations → Ticket/TC 承接 → test-cases 真源 → verification guard 消费 |
| F1 文件同步 | ✅ | config + splitter + verification + verify docs + template 同步覆盖 |
| F1b 复用优先 | ✅ | 不再新建 guard / coverage YAML，优先复用现有 `test_asset_completeness_guard.py` 和 `*-test-cases.yaml` |
| C3 回归风险 | ✅ | 只扩展字段和校验逻辑，不替换现有 test-case / traceability 链路 |
| B1 向后兼容 | ✅ | 旧 Story / Ticket / test-cases 缺字段时先推导兼容，不直接阻断 |
| P1 解析归属清晰 | ✅ | AC 双标签仅为 authoring shorthand，结构化字段由 `ticket-splitter` 解析落盘，guard 不直接解析原始 AC 文本 |

---

> **状态**：全部完成。9/9 项已执行，3 个 Codex 审核发现的 bug 已修复（guard --story-id 矩阵过滤 / category+latest_result 校验补齐 / Skill helper 签名对齐+契约定义）。所有变更未 git commit。
