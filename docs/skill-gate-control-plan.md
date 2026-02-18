# Skill 防跳步方案：产物门控 (Artifact Gate Control)

> 设计原则：一看就懂、每个节点只做一件事、出口统一、上游有问题就停、
> 最少概念、最短路径、改动自洽、简约不等于省略。

## 一、目标

- **一句话**：在 Skill 执行的关键节点插入产物门控脚本，AI 跳步则产物缺失，脚本自动报错阻塞。
- **验收标准**：
  1. 运行 `bash bin/check-skill-artifacts.sh prototype-extraction permission {prd_dir}` 能正确检测出当前 PRD 目录缺少 MATRIX.md / DESIGN-SYSTEM.md / SIDEBAR-NAV.md
  2. brainstorming/SKILL.md 伪代码中 Phase 0→1 过渡处有 gate_check 调用
  3. prototype-extraction/SKILL.md 伪代码中 Step 5 有门控脚本调用
  4. brainstorm.md workflow 中 Phase 0 步骤有门控指令

## 二、前置条件与假设

- **假设 1**：AI 执行 SKILL.md 时会读取并遵循伪代码中的 `run_command()` 调用（因为 run_command 是 AI 的核心工具，不像文字约束那样容易被忽略）
- **假设 2**：shell 脚本在项目根目录下可执行（`bash bin/check-skill-artifacts.sh`）
- **假设 3**：PRD 目录路径格式固定为 `osg-spec-docs/docs/01-product/prd/{module}/`
- **假设 4**：SRS 目录路径格式固定为 `osg-spec-docs/docs/02-requirements/srs/`
- **假设 5**：deliver-ticket 的门控需要 Ticket YAML 上下文，本次不实现，后续单独处理

## 三、现状分析

### 相关文件

| 文件 | 角色 | 当前状态 |
|------|------|---------|
| `.claude/skills/brainstorming/SKILL.md` | brainstorm 主流程伪代码 | Phase 0→1 过渡处无门控 |
| `.claude/skills/prototype-extraction/SKILL.md` | PRD 提取子流程伪代码 | Step 5 校验是纯文字描述，无程序化检查 |
| `.windsurf/workflows/brainstorm.md` | brainstorm workflow 入口 | Phase 0 步骤无门控指令 |
| `bin/check-skill-artifacts.sh` | 门控脚本 | 不存在 |

### 上下游依赖

```
brainstorm.md (workflow 入口)
  → brainstorming/SKILL.md (主流程)
    → prototype-extraction/SKILL.md (Phase 0 子流程)
      → bin/check-skill-artifacts.sh (门控脚本) [新增]
```

### 存在的问题

AI 执行 brainstorming 时跳过了 prototype-extraction 的通道 B（源码分析），导致：
- 没发现 HTML 中两个同 id 的角色弹窗（D-P001）
- 没发现新增/编辑用户弹窗的单选 vs 多选矛盾（D-P002）
- 没生成 MATRIX.md / DESIGN-SYSTEM.md / SIDEBAR-NAV.md

根因：SKILL.md 中的铁律和硬约束是纯文字，AI 可以无感跳过。

## 四、设计决策

| # | 决策点 | 选项 | 推荐 | 理由 |
|---|--------|------|------|------|
| 1 | 门控脚本位置 | A: `bin/` / B: `.claude/scripts/` | A | bin/ 是项目约定的脚本目录，已有 clean.bat/package.bat/run.bat |
| 2 | 门控触发方式 | A: SKILL.md 伪代码中 run_command / B: workflow 步骤中 turbo 标注 | A+B 都做 | 双层保险：SKILL.md 是 AI 执行的主要参考，workflow 是入口 |
| 3 | 最小行数阈值 | A: 不检查 / B: DESIGN-SYSTEM≥20行, SIDEBAR-NAV≥10行, MATRIX≥5行 | B | 防止 AI 生成空壳文件骗过门控 |
| 4 | deliver-ticket 门控 | A: 本次一起做 / B: 本次不做，后续单独处理 | B | deliver-ticket 需要 Ticket YAML 上下文，复杂度高，分开处理降低风险 |
| 5 | prototype-extraction Step 5 改造方式 | A: 门控脚本替代 V1~V15 / B: 门控脚本作为 V1~V15 的前置检查 | B | V1~V15 是 AI 自检，门控脚本是程序化兜底，两者互补不替代 |
| 6 | 门控失败后的行为 | A: 直接 return failed / B: 输出缺失清单后 return failed | B | 输出缺失清单让 AI 知道该补什么 |

## 五、目标状态

### 整体流程（门控点标注 ⛔）

```
brainstorm.md (workflow 入口)
  → 确认模块
  → Phase 0: PRD 生成
    → invoke prototype-extraction 完整 5 步
    → ⛔ 门控点 1: bash check-skill-artifacts.sh prototype-extraction {module} {prd_dir}
       失败 → 回到 prototype-extraction Step 2 补充
  → Phase 1: 生成 SRS
  → Phase 2~3: 校验
  → Phase 4: HTML↔PRD↔SRS 全量校验
  → ⛔ 门控点 2: bash check-skill-artifacts.sh brainstorming {module} {prd_dir}
     失败 → 报错，提示补充缺失产物
  → 输出结果
```

### 门控脚本检查项

**prototype-extraction 门控（5 项）**：

> 职责边界：只检查"关键步骤有没有执行"（文件存在性 + 最小行数防空壳），内容质量交给 V1~V15 自检。

| # | 检查项 | 检查方式 | 防护目标 |
|---|--------|---------|---------|
| PE-1 | MATRIX.md 存在且≥5行 | check_file + check_min_lines | 防跳 Step 1 |
| PE-2 | DESIGN-SYSTEM.md 存在且≥20行 | check_file + check_min_lines | 防跳通道 B (B16~B18) |
| PE-3 | SIDEBAR-NAV.md 存在且≥10行 | check_file + check_min_lines | 防跳通道 B (B19) |
| PE-4 | DECISIONS.md 存在 | check_file | 防跳 Step 4 |
| PE-5 | 至少 1 个 0*.md 页面 PRD | count_files | 防跳 Step 4 |

**brainstorming 门控（4 项）**：

> 职责边界：只检查"Phase 0 和 Phase 1 有没有执行"，内容质量交给 Phase 2~3 校验。

| # | 检查项 | 检查方式 | 防护目标 |
|---|--------|---------|---------|
| BS-1 | MATRIX.md 存在 | check_file | 防跳 Phase 0 |
| BS-2 | DESIGN-SYSTEM.md 存在 | check_file | 防跳 Phase 0 |
| BS-3 | SIDEBAR-NAV.md 存在 | check_file | 防跳 Phase 0 |
| BS-4 | SRS {module}.md 存在且≥100行 | check_file + check_min_lines | 防简化 Phase 1 |

## 六、执行清单

| # | 文件 | 位置 | 当前值 | 目标值 | 优先级 |
|---|------|------|--------|--------|--------|
| 1 | `bin/check-skill-artifacts.sh` | 新文件 | 不存在 | 完整门控脚本（含 prototype-extraction + brainstorming 两个 case） | 🔴 |
| 2 | `.claude/skills/brainstorming/SKILL.md` | L221（Phase 0→1 过渡处，`# ========== Phase 1` 注释之前的空行） | 无门控 | 插入 `gate_result = run_command("bash bin/check-skill-artifacts.sh prototype-extraction ...")` + 失败处理 | 🔴 |
| 3 | `.claude/skills/brainstorming/SKILL.md` | L476（Phase 4 结束后，`# ========== 输出结果` 之前） | 无门控 | 插入 `gate_result = run_command("bash bin/check-skill-artifacts.sh brainstorming ...")` + 失败处理 | 🔴 |
| 4 | `.claude/skills/prototype-extraction/SKILL.md` | L535（Step 5 开头，`max_retries = 3` 之前） | 无门控 | 插入 `gate_result = run_command("bash bin/check-skill-artifacts.sh prototype-extraction ...")` + 失败处理 | 🔴 |
| 5 | `.windsurf/workflows/brainstorm.md` | L21（Phase 0 闭环描述之后） | 无门控指令 | 在 Phase 0 步骤末尾加入"运行 `bash bin/check-skill-artifacts.sh prototype-extraction` 验证产物完整性" | 🟡 |
| 6 | `.claude/skills/brainstorming/SKILL.md` | L576~L598（硬约束节） | 无门控相关约束 | 追加硬约束："Phase 0 完成后必须运行门控脚本" / "门控脚本失败时禁止继续 Phase 1" | 🟡 |

**不修改**：
- `.claude/skills/deliver-ticket/SKILL.md` — 决策 4：本次不做，后续单独处理
- `user_rules` — 不加人工确认规则
- 其他 workflow — 低风险，暂不改

## 七、自校验结果

### 第 1 轮（通用 G1~G9 + 框架 F1~F3）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| G1 一看就懂 | ✅ | §5 有整体流程图，门控点用 ⛔ 标注 |
| G2 目标明确 | ✅ | §1 有 4 条可度量的验收标准 |
| G3 假设显式 | ✅ | §2 列出 5 条假设 |
| G4 设计决策完整 | ✅ | §4 有 6 个决策点，每个有选项和理由 |
| G5 执行清单可操作 | ✅ | §6 每项有文件/位置(行号)/当前值/目标值 |
| G6 正向流程走读 | ✅ | §5 流程图 + §6 执行清单可从头到尾走通 |
| G7 改动自洽 | ✅ | 决策 4 明确 deliver-ticket 不做，§6 不含 deliver-ticket 修改项，无矛盾 |
| G8 简约不等于省略 | ✅ | §5 门控检查项表格列出了每个检查的防护目标 |
| G9 场景模拟 | ✅ | 见下方场景模拟 |
| F1 文件同步 | ✅ | 改了 SKILL.md(#2~#4) 同时改了 workflow(#5)，保持一致 |
| F2 状态一致性 | ✅ | 不涉及状态机变更 |
| F3 交叉引用 | ✅ | `check-skill-artifacts.sh` 在 SKILL.md 和 workflow 中都有引用 |

### 第 2 轮（维度 B 边界场景 + 维度 H 交叉影响）

| 校验项 | 通过？ | 说明 |
|--------|--------|------|
| B1 PRD目录不存在 | ✅ | 实际脚本中加参数校验和目录检查 |
| B2 glob无匹配 | ✅ | 脚本中 `[ -f "$f" ]` 保护 |
| B3 参数缺失 | ✅ | 实际脚本中加参数校验 |
| B5 脚本权限 | ✅ | 用 `bash bin/xxx.sh` 调用，不需要 +x |
| B6 SRS_DIR硬编码 | ✅ | 可接受，项目路径短期不变 |
| H1 行号#2准确性 | ✅ | 已修正为 L221 |
| H2 行号#3准确性 | ✅ | L476 准确 |
| H3 行号#4准确性 | ✅ | L535 准确 |
| H4 精简后无grep检查 | ✅ | 已删除 PE-6/PE-7/BS-5/BS-6 四项内容质量检查，门控脚本只做文件存在性+最小行数 |

### 场景模拟（G9）

**场景 1：AI 跳过 prototype-extraction 整个通道 B**
→ DESIGN-SYSTEM.md 不存在 → PE-2 失败 → 门控脚本 exit 1 → AI 看到报错 → 回去补通道 B

**场景 2：AI 生成空壳 DESIGN-SYSTEM.md（只有标题）**
→ DESIGN-SYSTEM.md 仅 3 行 → PE-2 最小行数检查失败（需≥20行）→ 门控脚本 exit 1

**场景 3：AI 正常执行了完整 5 步**
→ 所有文件存在且内容合格 → 门控脚本 exit 0 → 继续 Phase 1
