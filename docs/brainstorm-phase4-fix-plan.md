# Brainstorm 流程补充方案 — Phase 4: HTML 原型全量校验

> 版本: v1.1 | 日期: 2026-02-15
> 状态: 待确认
> v1.1 变更: 修复 5 个自校验问题（#3优先级/command_to_state分支/approve映射/rollback/函数名）

---

## 1. 问题描述

当前 brainstorm 流程（Phase 0~3）存在一个关键缺失：**Phase 2~3 的校验基于 PRD 文档，但 PRD 文档本身可能与 HTML 原型存在差异**。

实际执行 `/brainstorm career` 时发现：
- PRD 05（学生自添岗位）描述过于简略，缺少表格列细节、筛选栏、审核交互等
- 学生端"我的求职"页面的导师「分配中...」状态在 PRD 中未提及
- 班主任端岗位信息页面在 PRD 中完全没有描述

**根因**: Phase 0 生成 PRD 时可能遗漏细节，Phase 2~3 基于 PRD 校验无法发现 PRD 本身的遗漏。需要一个独立环节回到 HTML 原型做全量校验。

---

## 2. 修改方案

### 2.1 新增 Phase 4: HTML 原型全量校验

在 Phase 3（增强全局终审）通过后、输出最终 SRS 之前，插入 Phase 4。

**Phase 4 的职责**:
1. 逐端逐页面浏览器实测 HTML 原型
2. 与 PRD + SRS 逐项对比
3. 确定的差异 → 直接补充到 PRD + SRS
4. 不确定的差异 → 输出「需求疑问清单」
5. 有疑问清单时 → 阻塞自动继续，等待产品确认

### 2.2 新增输出产物

- `{tasks_root}{module}-open-questions.md` — 需求疑问清单（仅在有不确定项时生成）

### 2.3 状态流转调整

- 无疑问清单 → `brainstorm_done`，自动继续 `/split story`（现有行为）
- 有疑问清单 → `brainstorm_pending_confirm`，阻塞等待产品确认
  - 产品确认后 → 用户执行 `/brainstorm {module}` 重新进入（增量更新路径）
  - 或用户手动执行 `/approve brainstorm` 确认无需修改 → `brainstorm_done`

---

## 3. 涉及修改的文件

### 修改项 #1: `.windsurf/workflows/brainstorm.md`

**优先级**: 🔴 高
**修改类型**: 插入新步骤

**当前内容** (行 34-44):
```markdown
4. **Phase 2~3: 自动校验**
   - Phase 2: 多轮正向/反向/PRD覆盖率/UI专项校验（max 10 轮，UI专项仅在有原型映射时触发）
   - Phase 3: 增强全局终审（三维度终审 + A~I 多维度旋转校验，参见 quality-gate/SKILL.md）

5. **输出产物**
   - 在 `osg-spec-docs/tasks/` 下创建 `brainstorm-{module}.md`
   - 包含：FR（含 PRD 来源）、NFR、AC、接口定义、数据库变更、技术约束

6. **更新状态**
   - 更新 `STATE.yaml` 的 `workflow.current_step` 为 `brainstorm_done`
   - workflow-engine 自动继续执行 `/split story`（`brainstorm_done.approval_required: false`）
```

**目标内容**:
```markdown
4. **Phase 2~3: 自动校验**
   - Phase 2: 多轮正向/反向/PRD覆盖率/UI专项校验（max 10 轮，UI专项仅在有原型映射时触发）
   - Phase 3: 增强全局终审（三维度终审 + A~I 多维度旋转校验，参见 quality-gate/SKILL.md）

5. **Phase 4: HTML 原型全量校验**（仅当 `config.prd_process.module_prototype_map` 有该模块映射时触发）
   - 按 `module_prototype_map` 逐端启动 HTTP 服务器浏览 HTML 原型
   - 逐页面截图 + 浏览器 snapshot 对比 PRD 和 SRS
   - 校验维度：页面结构、表格列、筛选栏选项、操作按钮、交互行为、状态展示、Badge/Tag 颜色
   - **确定的差异**（HTML 中明确存在的 UI 元素）→ 直接补充到 PRD + SRS
   - **不确定的差异**（业务逻辑推断、需产品决策）→ 输出到 `{module}-open-questions.md`

6. **输出产物**
   - `brainstorm-{module}.md` — SRS 文档（FR/NFR/AC/接口/数据库/技术约束）
   - `{module}-open-questions.md` — 需求疑问清单（仅在有不确定项时生成）

7. **更新状态**
   - **无疑问清单**: `workflow.current_step` → `brainstorm_done`，自动继续 `/split story`
   - **有疑问清单**: `workflow.current_step` → `brainstorm_pending_confirm`，阻塞等待产品确认
     - 产品确认后重新执行 `/brainstorm {module}`（增量更新路径）
     - 或执行 `/approve brainstorm` 跳过确认 → `brainstorm_done`
```

---

### 修改项 #2: `.claude/skills/brainstorming/SKILL.md`

**优先级**: 🔴 高
**修改类型**: 3 处修改

#### 修改 2a: 执行流程图（行 32-85）

在 Phase 3 和 `[输出结果]` 之间插入 Phase 4 流程图：

```
  │ ✅ 连续两轮无修改
  ▼
┌─ Phase 4: HTML 原型全量校验（仅 UI 模块）─────────┐
│ [1] 按 module_prototype_map 逐端浏览 HTML 原型     │
│ [2] 逐页面截图 + snapshot 对比 PRD/SRS             │
│ [3] 确定差异 → 直接补充 PRD + SRS                  │
│ [4] 不确定差异 → 输出 {module}-open-questions.md   │
└────────────────────────────────────────────────────┘
  │
  ├─ 无疑问 → [输出结果] → brainstorm_done
  │
  └─ 有疑问 → [输出结果 + 疑问清单] → brainstorm_pending_confirm
```

#### 修改 2b: 伪代码（行 357-362）

在 Phase 3 通过后、`update_workflow` 之前插入 Phase 4 伪代码：

```python
    # ========== Phase 4: HTML 原型全量校验 ==========
    # 仅当模块有原型映射时触发
    module_prototypes = config.prd_process.module_prototype_map.get(module_name, [])
    open_questions = []
    
    if module_prototypes:
        print("=== Phase 4: HTML 原型全量校验 ===")
        
        # 启动 HTTP 服务器
        server = start_http_server(config.paths.docs.prototypes)
        
        # 逐端逐页面浏览
        for prototype_file in module_prototypes:
            pages = get_module_pages(prototype_file, module_name)  # 登录后获取该模块相关页面
            
            for page in pages:
                print(f"🔍 校验: {prototype_file} → {page.name}")
                
                # 浏览器截图 + snapshot
                screenshot = take_screenshot(page)
                snapshot = take_snapshot(page)
                
                # 对比 PRD
                prd_diff = compare_with_prd(snapshot, context["prd_docs"])
                
                # 对比 SRS
                srs_diff = compare_with_srs(snapshot, requirement_doc)
                
                for diff in prd_diff + srs_diff:
                    if diff.is_certain:
                        # 确定的差异：直接补充
                        print(f"  ✅ 确定差异: {diff.description} → 补充到 PRD + SRS")
                        update_prd(diff, context["prd_docs"])
                        requirement_doc = enhance_doc(requirement_doc, [diff.description])
                    else:
                        # 不确定的差异：记录疑问
                        print(f"  ❓ 待确认: {diff.description}")
                        open_questions.append(diff)
        
        server.stop()
        print(f"Phase 4 完成: {len(open_questions)} 个待确认项")
    
    # ========== 输出结果 ==========
    # 输出疑问清单（如有）
    if open_questions:
        questions_path = f"{config.paths.tasks.root}{module_name}-open-questions.md"
        write_open_questions(questions_path, open_questions)
        print(f"📋 需求疑问清单: {questions_path}")
    
    # 更新 workflow 状态
    state = read_yaml("osg-spec-docs/tasks/STATE.yaml")
    if open_questions:
        state.workflow.current_step = "brainstorm_pending_confirm"
        state.workflow.next_step = "brainstorm"  # 重新进入 brainstorm（增量更新）
        state.workflow.auto_continue = False
        print("⚠️ 有待确认项，阻塞自动继续。请产品确认后重新执行 /brainstorm 或 /approve brainstorm")
    else:
        state.workflow.current_step = "brainstorm_done"
        state.workflow.next_step = "split_story"
        state.workflow.auto_continue = True
    write_yaml("osg-spec-docs/tasks/STATE.yaml", state)
    
    return format_output(requirement_doc)
```

#### 修改 2c: 硬约束 + 失败退出规则 + 输出格式

在硬约束节追加：
```
- **Phase 4 仅在有原型映射时触发** - 无原型映射的模块跳过 Phase 4
- **Phase 4 必须逐端逐页面浏览** - 不能只看 PRD 文档，必须打开浏览器实测
- **确定差异直接补充，不等待确认** - 只有不确定差异才输出疑问清单
- **有疑问清单时必须阻塞** - 不能自动继续 split story
```

在失败退出规则追加：
```
⚠️ Phase 4 阻塞：当存在不确定差异时：
1. 输出需求疑问清单（{module}-open-questions.md）
2. 设置 workflow.current_step = brainstorm_pending_confirm
3. 停止自动继续 — 等待产品确认
4. 产品确认后重新执行 /brainstorm（增量更新路径）或 /approve brainstorm
```

在输出格式追加：
```markdown
### Phase 4 校验结果
- 浏览页面数: {page_count}
- 确定差异: {certain_count}（已补充）
- 待确认项: {question_count}
- 疑问清单: {module}-open-questions.md（仅在有待确认项时）

### ⏭️ 下一步
- 无待确认项: 执行 `/split story`
- 有待确认项: 请产品确认疑问清单后重新执行 `/brainstorm {module}`
```

---

### 修改项 #3: `.claude/skills/workflow-engine/state-machine.yaml`

**优先级**: � 高
**修改类型**: 新增状态 + 命令映射 + 回滚规则

> ❗ 自校验发现：此项为必须（非可选），workflow-engine 需要识别新状态。

#### 3a: states 节新增状态

在 `brainstorm_done` 之后插入：

```yaml
  brainstorm_pending_confirm:
    phase: research
    description: "需求分析完成但有待产品确认的疑问项"
    next_action: approve_brainstorm
    approval_required: true
    approval_key: brainstorm_confirm
```

#### 3b: command_to_state 节新增分支

当前 `/brainstorm` 映射为 `brainstorm_done`，需改为分支逻辑：

```yaml
command_to_state:
  "/brainstorm": brainstorm_done  # 默认；brainstorming Skill 自己管理分支（done 或 pending_confirm）
  "/approve brainstorm": brainstorm_done  # 新增：产品确认后进入 done
```

#### 3c: action_to_command 节新增

```yaml
action_to_command:
  approve_brainstorm: "/approve brainstorm"  # 新增
```

#### 3d: approval_config_keys 节新增

```yaml
approval_config_keys:
  approve_brainstorm: brainstorm_confirm  # 新增
```

#### 3e: special_branches 节新增

```yaml
special_branches:
  # /brainstorm 完成后的分支（brainstorming Skill 直接写 STATE.yaml）
  brainstorm_completion:
    note: "brainstorming Skill 完成后直接写 STATE.yaml，不经过 update_workflow()"
    condition: "has_open_questions(module)"
    true_state: brainstorm_pending_confirm
    false_state: brainstorm_done
```

#### 3f: rollback 节新增

```yaml
rollback:
  - from: [brainstorm_pending_confirm]
    to: not_started
    trigger: "/rollback"
    condition: "需求分析需要重新开始"
```

---

## 4. Phase 4 校验维度清单

逐页面对比时，按以下维度检查：

| # | 维度 | 检查内容 | 判定为「确定差异」 | 判定为「待确认」 |
|---|------|---------|------------------|----------------|
| V1 | 页面结构 | 标题/副标题/按钮组/布局 | HTML 有但 PRD/SRS 缺失 | HTML 有但含义不明确 |
| V2 | 表格列 | 列名/列数/列内容格式 | HTML 列与 PRD 列不一致 | 列存在但用途不明 |
| V3 | 筛选栏 | 筛选项/选项值/按钮 | HTML 有筛选项但 PRD 未列出 | 筛选逻辑不明确 |
| V4 | 操作按钮 | 按钮文案/位置/触发行为 | HTML 按钮与 PRD 描述不一致 | 按钮行为需产品确认 |
| V5 | 交互行为 | 点击/展开/切换/弹窗 | HTML 有交互但 SRS 未描述 | 交互逻辑复杂需确认 |
| V6 | 状态展示 | Tag 颜色/Badge/高亮 | HTML 有状态但 SRS 未定义 | 状态含义需确认 |
| V7 | 侧边栏 | 菜单项/Badge/分组 | HTML 有菜单但 SRS 未提及 | 菜单权限需确认 |
| V8 | 提示信息 | 提示条/空状态/说明文字 | HTML 有提示但 SRS 未描述 | 提示文案需产品确认 |
| V9 | 业务规则 | 提示条暗示的业务逻辑 | — | 需产品确认具体规则 |

---

## 5. 执行顺序

```
修改项 #1 (workflow) → 修改项 #2 (SKILL) → 修改项 #3 (state-machine)
```

修改项 #1 和 #2 有依赖关系（workflow 描述必须与 SKILL 行为一致）。修改项 #3 是 #2 的下游依赖（SKILL 写入的状态必须在 state-machine 中定义）。

---

## 6. 同步检查清单

按 implement-fix-plan 模板 S + W：

### 模板 S — SKILL.md
- [ ] 执行流程图 — 是否反映新增的 Phase 4？
- [ ] 硬约束节 — 是否覆盖 Phase 4 的迭代限制？
- [ ] 失败退出规则 — 是否覆盖 Phase 4 阻塞路径？
- [ ] 输出格式 — 是否包含 Phase 4 校验结果？
- [ ] 对应 Workflow 文件 — 步骤描述是否与 Skill 行为一致？

### 模板 W — Workflow
- [ ] 步骤描述 — Phase 4 是否与 SKILL 的实际行为匹配？
- [ ] 状态更新 — brainstorm_pending_confirm 是否正确？
- [ ] 用户交互点 — 有疑问清单时是否暂停？

### 模板 C — state-machine.yaml
- [ ] 状态定义 — brainstorm_pending_confirm 是否有 next_action？
- [ ] 命令映射 — /approve brainstorm 是否在 command_to_state 中？
- [ ] 动作映射 — approve_brainstorm 是否在 action_to_command 中？
- [ ] 审批配置 — brainstorm_confirm 是否在 approval_config_keys 中？
- [ ] 回滚规则 — brainstorm_pending_confirm 是否有回滚目标？
- [ ] 分支逻辑 — brainstorm_completion 是否在 special_branches 中？

---

## 7. 自校验记录

### v1.0 → v1.1 修复项

| # | 问题 | 修复 |
|---|------|------|
| 1 | 修改项 #3 标记为「可选」 | 改为 🔴 高优先级（必须） |
| 2 | command_to_state 缺少分支逻辑 | 新增 special_branches.brainstorm_completion |
| 3 | /approve brainstorm 缺少映射 | 新增 command_to_state + action_to_command + approval_config_keys |
| 4 | rollback 缺少 brainstorm_pending_confirm | 新增回滚规则 → not_started |
| 5 | 函数名 get_career_pages 不通用 | 改为 get_module_pages(prototype_file, module_name) |
