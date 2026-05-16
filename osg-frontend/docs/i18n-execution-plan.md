# OSG vue-i18n 化执行方案（v2）

> 5 端（admin / student / mentor / lead-mentor / assistant）+ shared 公共层从中文硬编码迁移至 vue-i18n 中英双语的权威执行计划。
>
> **v2 取代 v1**（旧版备份在 `i18n-execution-plan-v1.md`）。v2 的关键变更：locale 模块化拆分、强制术语表、直接 main 分支、5 worker 并行、Phase 0 主会话亲自做、运行时语言切换。

---

## 0. 历史与背景

| 版本 | 日期 | 状态 | 关键事件 |
|---|---|---|---|
| v1 | 2026-04~05 | 弃用 | 旧 `feat/i18n` 分支 wip：完成 i18n 框架 + 工具链 + 6340 条 key 提取 + 3756 条机翻；但业务侧 t() 替换基于 50+ commit 前的 main，与最新业务逻辑漂移严重，121 文件硬冲突。决定弃业务替换，保留基础设施。 |
| v2 | 2026-05-15 | 当前 | 基础设施已从 `feat/i18n` 挑出搬至 main（commit `99769bad`）。本计划基于新策略重启业务侧 i18n 化。 |

---

## 1. 现状

| 项目 | 数据 |
|---|---|
| 技术栈 | Vue 3 + Pinia + Vue Router + Ant Design Vue 4 + vue-i18n@^11.4.0 |
| 端 | admin / student / mentor / lead-mentor / assistant + shared |
| 含中文文件数 | 432 个（.vue / .ts，统计自 v1） |
| 去重中文短语 | ~3756 条（含机翻参考） |
| 当前 i18n | **基础设施已就位**：i18n 实例 + zh/en locale 字典 + dict/menu/role 工具 + 6340 条 key 字典 + SQL i18n_key 列迁移；**业务侧 t() 替换 0%** |
| 翻译素材 | `scripts/zh-en--map-translated.csv`（3756 条机翻，术语乱）+ `副本zh-en--map-translated.xlsx`（人工修订种子） |

### 各端文件分布与优先级

| 端 | 含中文文件数 | view 模块数 | 优先级 | 工作量估计 |
|---|---|---|---|---|
| admin | 149 | ~30 | P0（最大、测试最全） | 1.5-2 周 |
| shared | 95 | n/a | **P0 主会话做** | 0.5-1 周 |
| lead-mentor | 74 | ~13 | P1 | 3-4 天 |
| student | 45 | ~20 | P1（C 端用户优先） | 1 周 |
| assistant | 35 | ~10 | P2 | 3-4 天 |
| mentor | 34 | ~8 | P2 | 3-4 天 |

---

## 2. 目标架构

```
osg-frontend/
├── i18n-glossary.md  ← (项目根目录) 权威术语表，必查
├── 副本zh-en--map-translated.xlsx  ← 人工修订种子
├── packages/
│   ├── shared/src/
│   │   ├── i18n/
│   │   │   ├── index.ts                ← createI18n() 实例，合并加载
│   │   │   └── locales/
│   │   │       ├── zh/
│   │   │       │   ├── common.json     ← 跨端通用 + shared 公共组件
│   │   │       │   ├── admin.json
│   │   │       │   ├── student.json
│   │   │       │   ├── mentor.json
│   │   │       │   ├── lead-mentor.json
│   │   │       │   └── assistant.json
│   │   │       └── en/ (镜像)
│   │   ├── components/LangSwitcher/    ← Phase 2 加
│   │   └── utils/{menuI18n,dictI18n,roleI18n}.ts (已就位)
│   ├── admin/src/main.ts               ← app.use(i18n)
│   ├── student/src/main.ts             ← app.use(i18n)
│   ├── mentor/src/main.ts              ← app.use(i18n)
│   ├── lead-mentor/src/main.ts         ← app.use(i18n)
│   └── assistant/src/main.ts           ← app.use(i18n)
└── scripts/
    ├── terms.glossary.json             ← Phase 0 由 glossary + xlsx 合并生成
    ├── zh-en--map-translated.csv       ← 机翻参考（仅查询）
    ├── review-list.csv                 ← 132 条人审清单
    ├── key-map.json                    ← 6340 条历史 flat key（仅查询）
    ├── extract-i18n.mjs                ← 扫硬编码
    ├── replace-source.mjs              ← 自动替换辅助
    └── migrate-flat-to-namespace.mjs   ← Phase 0 生成，flat → namespace 映射
```

### 关键设计决策（v2）

| 决策 | v2 选择 | v1 选择 | 变更理由 |
|---|---|---|---|
| locale 文件 | **模块化 6 文件** | 单文件 | 5 worker 并行写入避免冲突 |
| 语言切换 | **运行时切换 + localStorage** | 构建时选择 | 真用户场景；同一 build 支持双语 |
| 分支策略 | **直接 main，小步快合** | 长尾 feat/i18n 分支 | v1 教训：长尾分支 50 commit 后 121 文件冲突 |
| 并发模式 | **Phase 0 串行 + Phase 1 5 worker 并行** | 单线串行 | 5 端 view 互不依赖，可并行 |
| 术语权威 | **`i18n-glossary.md` 强制覆盖** | CSV 机翻为准 | v1 机翻术语乱（导师 = Tutor/Mentor/Instructor 三种） |
| key 命名 | **强制 namespace（scope.feature.element）** | flat key | 模块清晰可读，可扩展 |

---

## 3. 三阶段总览

```
Phase 0 主会话亲自做      Phase 1 派 5 worker 并行          Phase 2 主会话亲自收尾
（串行，~1 天）           （并行，~2 周）                  （串行，~1 周）
─────────────────────    ──────────────────────────       ───────────────────
术语表合并落盘            W1 admin (~30 view)              LangSwitcher
locale 模块化拆分        W2 student (~20 view)            antd + dayjs locale 联动
i18n 实例改造            W3 mentor (~8 view)              CI i18n lint
5 端 main.ts 装机        W4 lead-mentor (~13 view)        review-list 132 条人审
shared 公共组件 t() 化   W5 assistant (~10 view)          5 端 zh/en 全流程手测
                                                          总报告
```

**总预算：~4 周**（单 orchestrator + 5 worker 节奏）

---

## 4. Phase 0：主会话亲自做（串行）

**目标**：让 Phase 1 的 5 worker 工作冲突归零。

### P0.1 解析 xlsx + 生成术语 JSON

1. 读项目根目录 `副本zh-en--map-translated.xlsx`（用 `xlsx` skill 或 PowerShell `Import-Excel`）
2. 提取人工修订条目
3. 合并 `i18n-glossary.md`（终审版）
4. 输出 `osg-frontend/scripts/terms.glossary.json`：
   ```json
   { "导师": "Mentor", "班主任": "Lead Mentor", ... }
   ```
5. 冲突时以 glossary 为准

### P0.2 拆 locale 文件

1. 读现有 `locales/{zh,en}.json` 内容
2. 创建 `locales/{zh,en}/` 6 文件结构
3. 按 flat key 前缀归属：
   - `admin_*` → `admin.json` 转 `admin.*` namespace
   - `student_*` → `student.json`
   - 通用 / 不明 → `common.json`，加 `legacy.*` 前缀过渡
4. 改 `shared/src/i18n/index.ts` 合并加载（见架构示意）
5. 输出 `scripts/migrate-flat-to-namespace.mjs`（flat → namespace 映射工具）

### P0.3 5 端装机检查

每端 `packages/<end>/src/main.ts`：
```ts
import { i18n } from '@osg/shared'
app.use(i18n)
```
缺的补，单独 commit。

### P0.4 基础设施验证

```bash
pnpm test -- packages/shared/src/utils/menuI18n
pnpm test -- packages/shared/src/utils/dictI18n
pnpm test -- packages/shared/src/utils/roleI18n
pnpm test -- packages/admin/src/__tests__/dict-data-i18n
pnpm test -- packages/admin/src/__tests__/role-name-i18n
```

### P0.4b 生成 check-glossary.mjs（worker 自决质量护栏）

写 `osg-frontend/scripts/check-glossary.mjs`：

- 入参：`--staged`（扫 git staged 文件）或 `--all`（全工程 locale）
- 逻辑：
  1. 读 `scripts/terms.glossary.json`（强制术语字典）
  2. 扫目标文件中 `t('key')` 调用对应 locale 值
  3. 若 locale 值含 glossary 禁用译法（如"Tutor / Course"等），exit 1 + 列出违规
  4. 若 locale 值译"导师"等中文键时未用 glossary 强制译法，exit 1
- worker 每 commit 前必跑 `node scripts/check-glossary.mjs --staged`
- CI 也接入这工具（Phase 2 §6.P2.3）

无此工具，worker 自决会跑偏 — Phase 0 必做。

### P0.5 Commit 1

```
refactor(i18n): locale 模块化拆分 + 术语表合并 + 5 端装机
```
`git push origin main`。

### P0.6 shared 公共组件 t() 化

扫 `packages/shared/src/` 硬编码：
```bash
node osg-frontend/scripts/extract-i18n.mjs --module packages/shared/src
```

逐个 t() 化高频组件：
- `components/PageHeader/`
- `components/OverlaySurfaceModal/`
- `components/ClassReportFlowModal/`
- `components/MultiSelect/`
- `components/InterviewCalendar/`
- `components/ForgotPasswordModal/`
- `api/*.ts`（错误消息走 `common.message.*`）
- `utils/*Tone.ts`（业务文案）
- `composables/*.ts`

key 走 `common.shared.*`。**严格遵守 `i18n-glossary.md`**。

跑 `pnpm test -- packages/shared` 全绿。文件多于 30 时拆 commit。

### P0 完成检查清单

- [ ] `terms.glossary.json` 已生成
- [ ] `locales/{zh,en}/` 6 文件结构成立
- [ ] `shared/src/i18n/index.ts` 切换合并加载
- [ ] 5 端 main.ts 都 `app.use(i18n)`
- [ ] `pnpm test -- packages/shared` 全绿
- [ ] `extract-i18n.mjs --check packages/shared` 报告 0 硬编码
- [ ] 已 push origin main

---

## 5. Phase 1：5 worker 并行（派 sub-agent）

### 并发派发要求

**单条 message 内 5 个 Agent tool_use** 一次性发出（不要逐个，否则串行）。subagent_type 用 `developer` 或 `general-purpose`。

### Worker 分派表

| Worker | END | 模块数 | locale 文件 |
|---|---|---|---|
| W1 | admin | ~30 view | `locales/{zh,en}/admin.json` |
| W2 | student | ~20 view | `locales/{zh,en}/student.json` |
| W3 | mentor | ~8 view | `locales/{zh,en}/mentor.json` |
| W4 | lead-mentor | ~13 view | `locales/{zh,en}/lead-mentor.json` |
| W5 | assistant | ~10 view | `locales/{zh,en}/assistant.json` |

### Worker 通用 SOP

每个 worker 收到的 prompt 必须包含以下要点：

#### 边界
- 只能改 `packages/<END>/` 下 view / component / store
- 共享区只能 append-only 写：`locales/{zh,en}/<END>.json` 独占；`common.json` 仅追加新 key
- 禁碰别端代码 / shared/src/ 下非 locales 文件 / 旧 feat/i18n 分支

#### 必查
1. `i18n-glossary.md`（根目录）— 术语权威
2. `scripts/terms.glossary.json` — 运行时字典
3. `scripts/zh-en--map-translated.csv` — 机翻参考（术语必须按 glossary 覆盖）
4. `scripts/key-map.json` — 历史 flat key（仅查询）

#### Key 命名
- 所有新 key 必须以 `<END>.` 开头（lead-mentor 用 camelCase `leadMentor.*`）
- 通用文案走 `common.shared.*` 或 `common.{action,message,field,validation}.*`

#### 每模块循环

```
1. git pull --rebase origin main
2. node scripts/extract-i18n.mjs --module packages/<END>/src/views/<module>
3. 对照 csv 找翻译 → 用 terms.glossary.json 强制覆盖术语 → 写入 locales/{zh,en}/<END>.json
4. 模板替换：'保存' → {{ t('common.action.save') }}
5. JS 替换：message.success('成功') → message.success(t('common.message.success'))
6. 字典/菜单/角色：用 dictI18n / menuI18n / roleI18n 工具
7. 跑 pnpm test -- packages/<END>/src/views/<module>
8. 起 pnpm dev:<END> 切 en/zh 过模块主流程
9. commit：feat(i18n-<END>): <module> 替换完成 (N files)
10. git push origin main（push 失败因 race，goto 1）
```

#### 自决与跳过条件（一路干到底，禁止停摆等仲裁）

worker 不允许因下列情况停摆等 orchestrator。一律 **TODO 跳过该模块、继续下一个**，记录到端级日志 `osg-frontend/docs/i18n-todo-<END>.md`：

| 触发 | worker 自决动作 | 跳过粒度 |
|---|---|---|
| 同模块测试连挂 2 次 | 标 `// TODO(i18n-retry)` + 日志 | 模块 |
| 必改业务逻辑才能 i18n（字符串判断 / form 校验分支等） | 标 `// TODO(i18n-refactor)` + 日志 | 文件 |
| 需改 shared/src/ 下非 locales 文件 | 标 `// TODO(i18n-shared)` + 日志 | 模块 |
| 同名 `common.*` key 想新增但已存在不同含义 | **自动换名**：改用 `common.<end-prefix>.*` 或 `<END>.action.*`，加 NOTE 日志 | key |
| 术语翻译有歧义（glossary 没覆盖）| 暂用 glossary 最近义项 + 日志「待人审」 | key |

**红线（worker 不可自决放宽）**：
- ❌ 违反 `i18n-glossary.md` 强制术语（"导师" 翻 Tutor 直接错）
- ❌ 测试红的代码 commit（标 TODO 跳模块可以，但不许带红 commit）
- ❌ 修改业务逻辑（标 TODO 而非强行改）
- ❌ 单 commit > 30 文件

**质量护栏（worker 每 commit 前自检）**：
```bash
node osg-frontend/scripts/check-glossary.mjs --staged    # 术语合规（Phase 0 生成）
pnpm test -- packages/<END>/src/views/<module>           # 测试绿
node osg-frontend/scripts/extract-i18n.mjs --check <path># 0 硬编码或仅 TODO
```

任一未过 → 不许 commit，回 SOP 第 3-7 步重做。

**退出条件**：
- 该端所有模块走完一遍（含 TODO 跳过的）→ 输出完成报告（≤ 500 字），退出
- 完成报告必须列出所有 TODO 条目 + 端级日志路径

#### 进度记录
每完成一模块在本文档末尾「进度跟踪」追加：
```
- [x] <END>.<module> (2026-MM-DD, N files)
```

### orchestrator 在 worker 并行期间做的事

- **不亲自改 view 代码**（worker 自决，一路干到底）
- 每 30 min `git log --oneline -20` 查进度（**不用 `--stat`** 省 token）
- worker 已自决跳过，orchestrator 期间不仲裁
- 5 worker 全部完成 → 进 Phase 2，先收 TODO 兜底（见 §11）

### Worker DoD（每端）

1. `packages/<END>/src/` 下所有 user-facing 文案走 `t()`
2. `pnpm test -- packages/<END>` 全绿
3. `pnpm dev:<END>` 切 en/zh 主流程无中文残留
4. `extract-i18n.mjs --check packages/<END>` 报告 0 硬编码（或仅 TODO 标注）
5. locale 文件覆盖所有用到的 key

---

## 6. Phase 2：主会话亲自收尾（串行）

### P2.1 LangSwitcher
路径：`packages/shared/src/components/LangSwitcher/LangSwitcher.vue`
- dropdown：中 / English
- 切换：`i18n.global.locale.value = lang`
- 持久化：`localStorage.osg_lang`
- 初始：读 localStorage → 否则 `navigator.language`
- 挂 5 端顶栏

### P2.2 第三方库 locale 联动
- ant-design-vue：`<a-config-provider :locale="antdLocale">` 响应切换
- dayjs：`dayjs.locale(lang)`

### P2.3 CI i18n lint
`.github/workflows/i18n-lint.yml`：
1. `extract-i18n.mjs --check` 拦截硬编码
2. `check-glossary.mjs`（待写）校验术语翻译符合 glossary

### P2.4 review-list 132 条人审
逐条处理 `scripts/review-list.csv`：
- `TMPL_LITERAL`：处理模板字符串插值（用 t() named interpolation）
- `TERNARY_UNMAPPED`：处理三元中文
- `UNMAPPED`：补漏

### P2.5 5 端 zh/en 全流程手测
参考 `docs/test/v3-state-machine-driven.md`，5 端 × {zh, en} 各跑一遍：
- 登录 → 主菜单 → 核心业务 → 弹窗 → 列表 → 详情

记录漏翻 / 错翻 / UI 崩坏，逐项修。

### P2.6 总报告
写 `osg-frontend/docs/i18n-completion-report.md`：
- 总 commit / 文件统计
- 5 端各自指标
- TODO 项清单（后端 i18n / 业务重构依赖）
- 术语违规修复次数
- review-list 132 条 close 情况

---

## 7. 通用规范（全阶段适用）

### 必查
- `i18n-glossary.md`（根目录）
- `scripts/terms.glossary.json`
- 项目 `.claude/CLAUDE.md`

### 不要做
- ❌ 开分支（直接 main）
- ❌ 改业务逻辑（仅 wrap 字符串）
- ❌ t() 化字符串判断 / log / 注释 / commit message
- ❌ 用 flat key
- ❌ 违反术语表
- ❌ 单 commit > 30 文件
- ❌ 绕过测试
- ❌ 改 SQL 已落地 i18n_key 数据
- ❌ 改后端中文异常（标 `// TODO(i18n-backend)`，前端不要兜底翻译）
- ❌ 改旧 `feat/i18n` 分支

---

## 8. 后端 i18n（独立子任务）

前端 5 端 + Phase 2 全完成前不动后端。worker 遇到后端中文错误 / 邮件 / 导出文案，commit 里标 `// TODO(i18n-backend)`。

后端子任务范围（后续启动）：
- Spring `MessageSource` 接入 `messages_zh.properties` / `messages_en.properties`
- Controller 注入 `LocaleContext`（解析 `Accept-Language` header 或用户 lang_pref）
- 业务异常携带 i18n_key，全局异常处理器按 Locale 翻译
- 字典/菜单/角色 mapper 返 i18n_key 字段（DB 已就绪）
- 邮件模板按 locale 分文件
- 后端测试参考 `ruoyi-framework/.../SysDictDataI18nTest.java` / `SysRoleI18nTest.java` / `OsgAdminDictRegistryI18nTest.java`

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| worker 违反术语表 | 翻译质量差 | worker commit 前自跑 `check-glossary.mjs --staged` 自检；P2 CI lint 兜底 |
| worker 改业务逻辑 | bug 风险 | SOP 明禁；改业务必标 TODO 跳过；Phase 2 review TODO 时统一处理 |
| `common.json` 同名 key 冲突 | 写入歧义 | worker 自决换名（加 `<end-prefix>.` 或挪到 `<END>.*`），加日志记录 |
| shared 组件需改 | 该模块卡住 | worker 标 `TODO(i18n-shared)` 跳过，写 `i18n-todo-<END>.md`；Phase 2 orchestrator 批处理 |
| 业务字符串判断（`if (msg === '失败')`）t() 化破坏分支 | 功能损坏 | worker 标 `TODO(i18n-refactor)` 跳过文件；Phase 2 重构后再 i18n |
| 翻译质量（机翻不准） | 用户体验差 | review-list 132 条人审；P2 全流程手测兜底 |
| push race（5 worker 同时 push） | push 失败需 pull-rebase | SOP 第 10 步明示 retry |
| 时间超预算 | 任务拖延 | 单端连挂 2 次硬跳过，TODO 兜底；orchestrator 不阻塞 |
| **worker 自决跑偏（红线放宽）** | **质量崩** | check-glossary 必跑 + 测试必绿 + commit ≤ 30 文件三道护栏；任一失守 commit 拒绝 |
| **orchestrator 上下文撑爆** | 任务中断 | 见 §11 token 预算条款 |

---

## 10. token 预算与节约（5 agent 并行下的瓶颈）

每个 sub-agent 有独立 200K 上下文，互不影响 orchestrator。**真正的瓶颈是 orchestrator 自己**。约束：

### orchestrator 必守

| 场景 | 节约策略 |
|---|---|
| Phase 0 改 shared 组件 | 扫一个 → 改一个 → commit 一个，不批量 read |
| 仲裁 TODO 时 read 冲突文件 | 用 `Read(offset, limit)` 只读 ±20 行邻域，不够再扩 |
| Phase 1 期间查 worker 进度 | `git log --oneline -10`，**禁用** `--stat` / `-p` |
| 读 locale 文件 | 必须 offset/limit，全文几千行别整读 |
| 收 worker 完成报告 | 强制 `Final report ≤ 500 words` |
| Phase 2 review-list 132 条 | 分批处理，每批 ≤ 20 条 |

### worker 必守

| 场景 | 节约策略 |
|---|---|
| 扫硬编码 | `extract-i18n.mjs` 输出按模块切片，不全量 |
| 翻译查表 | 查 `terms.glossary.json` 直接取 key，不批量 read csv |
| 写 locale | Edit 局部追加，不 Write 整文件覆盖 |
| 完成报告 | ≤ 500 字，列 commit 数 / 文件数 / TODO 数 / 端级日志路径 |

### 报警阈值

- orchestrator 上下文 > 150K → 主动 `/compress`（或重启会话延续 plan）
- 任一 worker 跑偏 token > 100K → 强制让其退出并交接给新 worker

---

## 11. Worker 自决与 TODO 兜底机制

### 核心原则

worker 一路干到底，**不停摆等仲裁**。所有阻塞情况自决跳过 + 记录到端级 TODO 日志。Phase 2 orchestrator 集中清理。

### 端级 TODO 日志结构

每个 worker 维护：`osg-frontend/docs/i18n-todo-<END>.md`

格式：
```markdown
# i18n TODO — <END>

## i18n-retry（测试连挂跳过）
- [ ] packages/<END>/src/views/<module>/<file>.vue  原因：<具体测试名>挂 2 次

## i18n-refactor（业务逻辑依赖）
- [ ] packages/<END>/src/views/<module>/<file>.vue  原因：if (msg === '失败') 字符串判断需先重构成 errorCode

## i18n-shared（需改 shared）
- [ ] packages/<END>/src/views/<module>/<file>.vue  原因：依赖 shared/<component> 文案，shared 该组件未完成 t() 化

## i18n-glossary-gap（术语表未覆盖）
- [ ] key: `<END>.foo.bar`  zh: "xxx"  暂用译法："yyy"  原因：glossary 无定义，待人审

## key-rename（common.* 冲突自决改名）
- [ ] 原想用 `common.action.submit`，已有不同含义；改用 `<END>.action.submit`
```

### Phase 2 TODO 兜底流程（orchestrator 串行）

按以下顺序清理：

1. **i18n-shared**（最优先）：orchestrator 改 shared 组件 → 各端 worker 标记的模块重新 t() 化（orchestrator 自己批处理，不再开 worker）
2. **i18n-refactor**：评估是否重构字符串判断 → 重构则 i18n 化，不重构则保留 TODO 至代码生命周期末
3. **i18n-retry**：单独 debug 测试，修后 i18n 化
4. **i18n-glossary-gap**：补 glossary → 更新 terms.glossary.json → 修对应 locale
5. **key-rename**：复审是否需要规整 key 命名

### 自决红线（worker 不可触碰）

```
✅ 可自决：跳过模块、换 key 名、暂用译法、加 TODO 注释
❌ 不可自决：放宽术语表、commit 红测试、改业务代码、超 30 文件
```

每 commit 前三道护栏自检：

```bash
# 1. 术语合规
node osg-frontend/scripts/check-glossary.mjs --staged
[[ $? -eq 0 ]] || exit 1

# 2. 测试绿
pnpm test -- packages/<END>/src/views/<module>
[[ $? -eq 0 ]] || exit 1

# 3. 0 硬编码（或仅 TODO 标注）
node osg-frontend/scripts/extract-i18n.mjs --check packages/<END>/src/views/<module>
[[ $? -eq 0 ]] || exit 1
```

任一失守 → 不许 commit，回 SOP 重做。

---

## 12. 回滚

每 commit 都是 atomic。回滚方式：
- 单 commit 回滚：`git revert <sha>`
- 批量回滚：`git revert <range>`
- 紧急回退基础设施：`git revert 99769bad`（会丢 i18n 基础设施，谨慎）

旧 `feat/i18n` 分支保留作历史档（commit `e666d48e`），不删。

---

## 13. 完成定义（总任务 DoD）

- [ ] Phase 0 完成检查清单全勾
- [ ] 5 端 worker DoD 全通过
- [ ] 5 端 `i18n-todo-<END>.md` 已批处理（§11 兜底流程跑完，余下条目仅"长期保留"项）
- [ ] LangSwitcher 上线
- [ ] antd + dayjs locale 联动
- [ ] CI i18n lint 上线
- [ ] review-list 132 条全部 close
- [ ] 5 端 zh/en 全流程手测通过
- [ ] 总报告 `i18n-completion-report.md` 产出
- [ ] `extract-i18n.mjs --check` 全工程 0 硬编码（或仅 TODO 标注）
- [ ] `check-glossary.mjs` 全工程 0 术语违规

---

## 14. 进度跟踪

> Worker 每完成一模块在此追加一行。Orchestrator 阶段切换时打 milestone。

### Phase 0
- [x] P0.1 术语表合并落盘 (2026-05-16, scripts/terms.glossary.json 3759 条 + 39 glossary 覆盖)
- [x] P0.2 locale 拆分 (2026-05-16, locales/{zh,en}/{common,admin,student,mentor,lead-mentor,assistant}.json)
- [x] P0.3 5 端装机 (2026-05-16, admin/student/mentor/lead-mentor/assistant main.ts 均 app.use(i18n))
- [x] P0.4 基础设施验证 (2026-05-16, shared 34 测试文件 399 测试全绿; admin 4 个 i18n 测试系预存量失败，不在 P0 scope)
- [x] P0.4b check-glossary.mjs (2026-05-16, scripts/check-glossary.mjs --staged / --all 双模式)
- [x] P0.5 commit 1 push (2026-05-16, commit c23416cd 已推 main)
- [x] P0.6 shared 公共组件 t() 化 (2026-05-16, 5 个 commit + 1 tools commit；shared 60+ 文件 t() 化；user-facing 文案 0 硬编码；test/类型注释/模式匹配字符串通过 i18n-skip-file pragma 或 TODO(i18n) 标注豁免；shared 全套 400 测试通过)

### Phase 1（5 worker 并行）

**W1 admin**
- [x] admin.login (2026-05-16, 3 files)

**W2 student**
- [x] student.login (2026-05-16, 4 files: index.vue + login-workflow.ts + login.spec.ts + zh/en student.json)
- [x] student.forgotPassword (2026-05-16, 3 files: index.vue + forgot-password.spec.ts; 复用 common.shared.forgotPassword.*)
- [ ] 其余 18 模块待补 (account-locked / ai-interview / ai-resume / applications / career / communication / complaint / courses / dashboard / faq / feedback / files / interview-bank / mock-practice / netlog / notice / online-test-bank / placeholder / positions / profile / questions / report / resources / restricted / resume / schedule)

**W3 mentor**
- [ ] 待补

**W4 lead-mentor**
- [ ] 待补

**W5 assistant**
- [ ] 待补

### Phase 2
- [ ] P2.1 LangSwitcher
- [ ] P2.2 antd + dayjs locale 联动
- [ ] P2.3 CI i18n lint
- [ ] P2.4 review-list 132 条人审
- [ ] P2.5 5 端 zh/en 全流程手测
- [ ] P2.6 总报告

---

## 修改历史

| 日期 | 版本 | 修改 |
|---|---|---|
| 2026-04~05 | v1 | 旧版（已弃用），保留在 `i18n-execution-plan-v1.md` |
| 2026-05-15 | v2 | 重写。架构改 locale 模块化、直接 main、5 worker 并行、强制术语表、运行时切换 |
| 2026-05-16 | v2.1 | worker 自决与 TODO 兜底机制（不停摆等仲裁）+ token 预算与节约 + 质量护栏三道线 + check-glossary.mjs（Phase 0 P0.4b 新增）+ DoD 加 TODO 批处理条款 + 章节重编号 §10-§14 |
