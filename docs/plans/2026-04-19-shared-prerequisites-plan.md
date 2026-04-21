# Shared 包前置任务方案

> 版本：v1.0
> 创建：2026-04-19
> 关联主方案：`docs/plans/admin-ui-unification-plan.md`（admin 主文档，无日期前缀）
> 关联端方案：student / mentor / lead-mentor / assistant 四份 `2026-04-19-*-standardization-plan.md`
> 状态：待业务/工程确认、未排期

---

## 〇、本文档定位

四份端标准化文档（student / mentor / lead-mentor / assistant）的 `§〇.1` 章节此前重复列出"前置共享包任务"。该章节是**所有端的共同阻塞项**，必须先完成，否则任一端落地都会在本地新建 PageHeader / OverlaySurfaceModal / 字典映射，违反"不各自为战"的原则。

本文档作为**单一真源**：

- 把 4 份端文档里重复的 §〇.1 合并到这里
- 把"做什么"细化到"怎么做"（文件路径 / API 签名 / 迁移步骤 / 验收命令）
- 校正三轮 review 未发现的 4 处事实偏差（详见 §一.3）

四份端文档的 §〇.1 应改为指针："前置任务详见 `docs/plans/2026-04-19-shared-prerequisites-plan.md`"。

**本文档只写方案，不动代码**。代码落地时走独立 Ticket。

---

## 一、背景与事实校准

### 1.1 为什么需要前置

admin 端已在本地拥有以下资产：

| 资产 | admin 本地路径 | 是否应在 shared |
|---|---|---|
| `PageHeader.vue`（66 行） | `osg-frontend/packages/admin/src/components/PageHeader.vue` | 应在 shared |
| `OverlaySurfaceModal.vue`（386 行） | `osg-frontend/packages/admin/src/components/OverlaySurfaceModal.vue` | 应在 shared |
| `PositionMetaOption` 类型（7 字段） | `osg-frontend/packages/shared/src/api/admin/position.ts:51` | **已在 shared**（只是在 `api/admin/` 目录下） |
| `getPositionMeta()` 接口函数 | `osg-frontend/packages/shared/src/api/admin/position.ts:188` | **已在 shared**（但路径是 admin 专属） |

若 student/mentor/lead-mentor/assistant 任一端先落地 UI 标准化，必然在本地复制 PageHeader / OverlaySurfaceModal 或重造 IndustryMeta 映射——此即"各自为战"反模式。

### 1.2 shared 包当前结构（2026-04-19 扫描）

```
osg-frontend/packages/shared/src/
├── __tests__/download.spec.ts
├── api/
│   ├── admin/           # 28 个 admin 专属 API 文件（含 position.ts）
│   └── [其他 api]
├── components/          # 仅 4 个：OsgHeader / OsgFooter / OsgSidebar / OsgPageContainer
├── composables/
│   ├── index.ts         # export * from './usePagination'
│   └── usePagination.ts # 138 行，导出 usePagination + useStandardClientPagination
├── types/
│   ├── index.ts         # 聚合 auth / user / course / common
│   ├── auth.ts / user.ts / course.ts / common.ts
├── utils/               # download / format / permissionColors / request / storage
├── styles/index.scss
└── index.ts             # 主入口：export * from 各子目录
```

`package.json` exports 子路径：

```json
"./components": "./src/components/index.ts",
"./utils":      "./src/utils/index.ts",
"./api":        "./src/api/index.ts",
"./types":      "./src/types/index.ts",
"./styles":     "./src/styles/index.scss"
```

**不存在** `./composables` 子路径。消费方必须从主入口 `@osg/shared` 导入 composable（靠 `src/index.ts:3` 的 `export * from './composables'` 转发）。

### 1.3 本文档校正的 3 处事实偏差

四份端文档（student / mentor / lead-mentor / assistant）的 §〇.1 有以下事实错误，**本文档是纠正后的权威版本**：

| # | 原描述（端文档 §〇.1） | 校正 |
|---|---|---|
| A | 建议新建 `@osg/shared/types/industry.ts`，定义 `IndustryMeta { value, label, cssClass, listClass }` | 真实类型叫 `PositionMetaOption`，字段 `{ value, label, tone?, icon?, parent?, remark? }`，已在 `osg-frontend/packages/shared/src/api/admin/position.ts:51`。**不新建**，复用 |
| B | 消费姿势建议 `from '@osg/shared/composables'` | `package.json` 的 `exports` 没有 `./composables` 子路径（仅 `./components` / `./utils` / `./api` / `./types` / `./styles`）。正确写法 `from '@osg/shared'`（主入口自动转发） |
| C | 建议新建 `@osg/shared/composables/useIndustryMeta.ts` 拉取 meta | 已有 `getPositionMeta()` → `GET /admin/position/meta`（`osg-frontend/packages/shared/src/api/admin/position.ts:188`），但接口路径 `/admin/` 前缀可能不让其他角色访问 → 新建 composable 的**真正阻塞点是后端 meta 接口的多端暴露策略**，不是前端抽象 |

---

## 二、前置任务全景

### 2.1 任务依赖图

```
T1: 迁 PageHeader           (独立, 0 依赖)
T2: 迁 OverlaySurfaceModal  (独立, 0 依赖)
T3: 后端 meta 接口多端暴露策略   ← 阻塞 T4
    └─ T4: useIndustryMeta composable  ← 阻塞各端消费
T5: admin 端引用点迁移到 shared   (T1 + T2 完成后)
T6: 4 份端文档 §〇.1 精简为指针     (T1~T4 进入"已规划"状态即可)
```

并行执行建议：T1 / T2 / T3 同时启动；T4 等 T3 结论；T5 等 T1+T2 合并；T6 等 T1~T4 方案定稿。

**T0 预处理（T1 启动前必做）**：清理仓库中的 `.bak` 备份文件，避免验收扫描误报。

```bash
# 实测 osg-frontend/packages/admin/src/views/users/staff/index.vue.bak 存在
find osg-frontend/packages/admin/src -name '*.bak' -type f
# 确认后删除（若需保留历史可先移到 docs/archived/）
find osg-frontend/packages/admin/src -name '*.bak' -type f -delete
```

### 2.2 任务粒度估算（仅供参考，实际排期以工程方为准）

| 任务 | 估算工时 | 风险 |
|---|---|---|
| T1 PageHeader 迁移（实测 29 个引用点） | 30-60 分钟（含改引用 + 构建 + 单测） | 低 |
| T2 OverlaySurfaceModal 迁移（实测 47 个引用点） | 1-2 小时（含改引用 + 构建 + 单测） | 低 |
| T3 后端字典共享外观（方案 I，见 §5） | 1-2 小时（新建 `DictFacadeController` ~30 行 + 白名单 + 单测） | 中（从高降至中） |
| T4 useIndustryMeta 实现 | 1 小时（依赖 T3；前端已有 DTO 映射骨架，见 §6.2） | 低（从中降至低） |
| T5 admin 引用点迁移（若 T1+T2 已顺带完成则可跳过） | 2-4 小时（若独立做） | 低 |
| T6 4 份端文档精简 | 30 分钟 | 低 |

> **工时偏差说明**：T1/T2/T5 基于实测引用点统计（`rg` 结果 29 + 47 = 76 个 `from '@/components/...'` 引用）。单 `mv` 本身不足 1 分钟，但改引用 + `pnpm build` + 单测至少每 10 个引用 5-10 分钟。实际排期以工程方为准。

---

## 三、任务 T1：迁移 PageHeader.vue

### 3.1 目标

把 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/components/PageHeader.vue`（66 行）整体迁到 `osg-frontend/packages/shared/src/components/PageHeader.vue`，不改 API。

### 3.2 对外 API（保持不变）

```ts
defineProps<{
  title: string        // 必填：页面主标题
  subtitle?: string    // 选填：副标题（小写高亮）
  description?: string // 选填：描述文字
}>()
// slot: actions       // 右侧操作区
```

scoped style 使用 CSS 变量 `--text` / `--muted` / `--text2`，这些变量由各端 `App.vue` 的主题配置提供。

### 3.3 迁移步骤（6 步，**严格按顺序**，避免中途构建爆炸）

```bash
# Step 1: cp（不要 mv）到 shared，保留 admin 原文件，使改引用阶段可分步回退
cp osg-frontend/packages/admin/src/components/PageHeader.vue \
   osg-frontend/packages/shared/src/components/PageHeader.vue

# Step 2: shared 包导出（手动编辑 osg-frontend/packages/shared/src/components/index.ts，加：
#   export { default as PageHeader } from './PageHeader.vue'

# Step 3: 构建 shared，确认新位置可用
pnpm --filter @osg/shared build

# Step 4: 批量改 admin 引用（实测 29 处，全部是 `@/components/PageHeader.vue` alias 形式）
for f in $(rg -l "from ['\"]@/components/PageHeader\.vue['\"]" osg-frontend/packages/admin/src); do
  sed -i '' "s|import PageHeader from '@/components/PageHeader.vue'|import { PageHeader } from '@osg/shared'|g" "$f"
done
# 改完立即自查应为 0
rg "from ['\"]@/components/PageHeader" osg-frontend/packages/admin/src -g '!*.bak' | wc -l

# Step 5: 构建 admin 验证所有引用都指向 shared
pnpm --filter @osg/admin build

# Step 6: 删除 admin 原文件（推荐用 git rm 保留追踪）
git rm osg-frontend/packages/admin/src/components/PageHeader.vue
pnpm --filter @osg/admin build && pnpm --filter @osg/admin test
```

> **为什么不用一步 `git mv`**：admin 有 **29 处 import**，单步 `git mv` 会瞬间让 29 个引用全部断裂——IDE 红线爆屏，TS 报错堆栈难以定位真实问题。6 步 cp→改引用→删原文件，任何一步失败都能单独回退。Git 默认有 rename detection（相似度 ≥50%），单文件 cp+rm 仍能被 `git log --follow` 追溯。

### 3.4 验收命令

```bash
# 1. 新位置文件存在
test -f osg-frontend/packages/shared/src/components/PageHeader.vue && echo OK

# 2. 旧位置已删
test ! -f osg-frontend/packages/admin/src/components/PageHeader.vue && echo OK

# 3. components/index.ts 已导出
rg "PageHeader" osg-frontend/packages/shared/src/components/index.ts | wc -l  # 应 ≥ 1

# 4. admin 不再有任何本地 PageHeader 引用
#    ⚠️ 必须同时覆盖 @/components alias（实际所有引用都是这种）和相对路径
#    不要用 [^@]*：admin 100% 引用用 `@/components` 开头，[^@] 会全部排除 → 假绿
rg "from ['\"](@/components|\./|\.\./)[^'\"]*PageHeader" osg-frontend/packages/admin/src -g '!*.bak' | wc -l  # 应 = 0

# 5. admin 中对 PageHeader 的唯一合法引用形式是 @osg/shared
rg "import \{ PageHeader \} from ['\"]@osg/shared['\"]" osg-frontend/packages/admin/src | wc -l  # 应 ≥ 1

# 6. admin 构建通过
pnpm --filter @osg/admin build
```

---

## 四、任务 T2：迁移 OverlaySurfaceModal.vue

### 4.1 目标

把 `@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/components/OverlaySurfaceModal.vue`（386 行）整体迁到 `osg-frontend/packages/shared/src/components/OverlaySurfaceModal.vue`，不改 API。

### 4.2 对外 API（保持不变）

```ts
defineProps<{
  open: boolean
  surfaceId: string
  title?: string
  width?: string | number        // 默认 520
  maxHeight?: string | number    // 默认 '90vh'
  variant?: 'default' | 'accent' // 默认 'default'
  showFooter?: boolean           // 默认 true
  closable?: boolean             // 默认 true
  maskClosable?: boolean         // 默认 true
  keyboard?: boolean             // 默认 true
  shellClass?: string | string[] | Record<string, boolean>
  bodyClass?: string | string[] | Record<string, boolean>
  footerClass?: string | string[] | Record<string, boolean>
}>()

defineEmits<{
  cancel: []                     // 关闭时触发（点遮罩 / 点 × / 按 Esc）
}>()

// slots:
//   default     # body 内容
//   title       # 自定义标题（覆盖 title prop）
//   footer      # 底部操作行
```

关键行为：

- 使用 `<Teleport to="body">` 挂到 body
- 按 Esc、点遮罩、点 × 都通过 `emit('cancel')` 由父组件控制关闭
- `showFooter + hasFooter(slots.footer)` 双条件才显示 footer

### 4.3 迁移步骤（严格按 §3.3 的 6 步执行，以下仅列差异）

```bash
# Step 1-3 同 §3.3，替换组件名为 OverlaySurfaceModal
cp osg-frontend/packages/admin/src/components/OverlaySurfaceModal.vue \
   osg-frontend/packages/shared/src/components/OverlaySurfaceModal.vue
# shared/components/index.ts 加：
#   export { default as OverlaySurfaceModal } from './OverlaySurfaceModal.vue'
pnpm --filter @osg/shared build

# Step 4: 批量改 admin 引用（实测 47 处）
for f in $(rg -l "from ['\"]@/components/OverlaySurfaceModal\.vue['\"]" osg-frontend/packages/admin/src); do
  sed -i '' "s|import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'|import { OverlaySurfaceModal } from '@osg/shared'|g" "$f"
done

# Step 5: admin 构建
pnpm --filter @osg/admin build

# Step 6: 删 admin 原文件 + 最终构建 + 测试
git rm osg-frontend/packages/admin/src/components/OverlaySurfaceModal.vue
pnpm --filter @osg/admin build && pnpm --filter @osg/admin test
```

**特别注意**：该组件样式使用大量 CSS 变量（`--text` / `--muted` / `--surface` 等）。迁到 shared 后保持 scoped style，颜色通过变量由各端主题注入——这是天然的多端适配机制，**不要改成硬编码颜色**。

### 4.4 验收命令

```bash
test -f osg-frontend/packages/shared/src/components/OverlaySurfaceModal.vue && echo OK
test ! -f osg-frontend/packages/admin/src/components/OverlaySurfaceModal.vue && echo OK
rg "OverlaySurfaceModal" osg-frontend/packages/shared/src/components/index.ts | wc -l  # ≥ 1
# ⚠️ 覆盖 @/ alias + 相对路径两种，避免 [^@]* 假绿；排除 .bak
rg "from ['\"](@/components|\./|\.\./)[^'\"]*OverlaySurfaceModal" osg-frontend/packages/admin/src -g '!*.bak' | wc -l  # = 0
# admin 中对 OverlaySurfaceModal 的唯一合法引用形式
rg "import \{ OverlaySurfaceModal \} from ['\"]@osg/shared['\"]" osg-frontend/packages/admin/src | wc -l  # ≥ 1
pnpm --filter @osg/admin build
```

---

## 五、任务 T3：后端 meta 接口多端暴露策略（**关键阻塞**）

### 5.1 问题描述

现有接口：

```
GET /admin/position/meta          (由 getPositionMeta() 调用, 返回 PositionMeta)
```

该接口路径前缀 `/admin/`，意味着受 admin 角色鉴权保护。而：

- student 端用户是 **学员角色**，不应有 admin 权限
- mentor 端用户是 **导师角色**，同上
- lead-mentor 端是 **主管角色**，同上
- assistant 端是 **助教角色**，同上

四端若要消费同一份 industries 字典，必须有**可跨角色访问**的 meta 接口。

### 5.2 可选方案

> **核心洞察**：字典有两个侧面——**管理入口**（写，admin 专属）和**数据流转**（读，任何登录用户）。之前方案都在混着谈。正确做法是让两者走**不同接口**，语义干净。

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| A1. 硬编码路径 `/common/dict/company-type` | 仅暴露 `osg_company_type`，所有登录用户可访问 | 简单明确 | 未来新字典要加新接口 |
| A2. 参数化路径 `/common/dict/:typeCode` | 通用字典接口 + 白名单 | 一次实现覆盖未来 | 白名单设计 + 鉴权粒度 |
| B. 复制 `/admin/position/meta` 到各端前缀 | `/student/position/meta` / `/mentor/position/meta` 等 | 鉴权边界清晰 | 4 份复制，维护成本高 |
| C. 扩展现有 `/admin/position/meta` 为 `/position/meta` | 放宽鉴权到任何登录用户，返回同样 PositionMeta | 前端消费姿势一致 | 泄露 admin 专属字段（`uploadRuleCopy` / `uploadSteps`）|
| D. 每端 service 自己返回 industries | 每端后端 service 拉字典返回 | 完全自治 | 4 份实现重复 |
| E. 复用 RuoYi 自带 `/system/dict/data/type/:dictType` | 路径本来就无 `@PreAuthorize`，任何登录用户可调 | 后端 0 行代码 | `/system/*` 路径语义别扭；`sys_dict_data` 全表字典都能被查（泄露面大）；依赖 RuoYi 未来不加锁 |
| **I（本文档推荐）**. 字典共享外观 `/dict/:typeCode` + 白名单 + DTO 裁剪 | 新建 `DictFacadeController`，对外语义独立于 `/system/*`；白名单控制暴露范围；DTO 只返回前端需要字段 | 语义最清晰、安全最高（双重防护：类型白名单 + 字段裁剪）、可扩展、与 RuoYi 解耦 | 后端新增 ~30 行 Controller 代码 |

### 5.3 建议

**方案 I 最佳**（已通过 7 项校验确认）：

- **V1** `/dict/*` 路径未被占用
- **V2** vite proxy `/api` 剥前缀 → 后端 `/dict/*`（`@/Users/hw/workspace/OSGPrj/osg-frontend/config/viteProxy.ts:84`）
- **V3** `ISysDictTypeService.selectDictDataByType` 跨模块可用
- **V4** shared http 返回已拆 `data` 层（`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/shared/src/utils/request.ts:46`）
- **V5** SecurityConfig `.anyRequest().authenticated()` 允许登录用户
- **V6** ⚠️ `SysDictData` 继承 `BaseEntity` 会暴露 `createBy/updateBy/updateTime` 等 admin 元数据 → 本方案用 **DTO 裁剪**规避
- **V7** 多端 token 走统一 JWT filter

为什么优于 E：

| 维度 | E（复用 `/system/dict/data/type/*`） | **I（Facade `/dict/:typeCode`）** |
|---|---|---|
| 语义 | `/system/*` 让 student 端调显得别扭 | `/dict/*` 清晰 |
| 安全 | 所有系统字典都能查（包括 `sys_normal_disable` 等内部字典） | **白名单 + DTO 裁剪双重防护** |
| 治理 | 无（全靠 RuoYi 源码保持无 `@PreAuthorize`） | **业务方可控制白名单** |
| 解耦 | 依赖 RuoYi 未来不给 `/system/*` 加锁 | 完全自控 |

**后端工作量对比**：E = 0 行；I = ~30 行（Controller + 白名单 + DTO 映射）。多出的 30 行换来语义、安全、治理、解耦四项提升——**物超所值**。

### 5.4 接口契约（方案 I）

```
GET /dict/:typeCode

# 示例
GET /dict/osg_company_type

Response（经 DTO 裁剪，不含 createBy/updateBy 等 admin 元数据）:
{
  code: 200,
  data: [
    {
      dictValue: "bulge_bracket",
      dictLabel: "Bulge Bracket",
      cssClass: "gold",      // 对应前端 tone
      listClass: "mdi-trophy", // 对应前端 icon
      remark: ""
    },
    ...
  ]
}

Error（typeCode 未在白名单）:
{
  code: 500,
  msg: "字典类型 [xxx] 未开放跨角色共享"
}
```

前端消费侧映射到 `PositionMetaOption`（已存在，无需新建）：

| 后端 DTO 字段 | 前端 `PositionMetaOption` |
|---|---|
| `dictValue` | `value` |
| `dictLabel` | `label` |
| `cssClass` | `tone` |
| `listClass` | `icon` |
| `remark` | `remark` |

### 5.5 后端实现骨架（参考）

新建 `@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/common/DictFacadeController.java`：

```java
package com.ruoyi.web.controller.common;

import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.entity.SysDictData;
import com.ruoyi.system.service.ISysDictTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 字典共享外观
 *
 * 管理（写）仍在 /system/dict/*，admin 专属。
 * 本接口只开放"读"给所有登录用户，依靠：
 *   - 白名单（类型级）：防止非业务字典被泄露（如 sys_normal_disable）
 *   - DTO 裁剪（字段级）：防止泄露 createBy/updateBy 等管理元数据
 */
@RestController
@RequestMapping("/dict")
public class DictFacadeController extends BaseController {

    /** 业务方批准的跨角色共享字典白名单 */
    private static final Set<String> SHARED_DICT_WHITELIST = Set.of(
        "osg_company_type"
        // 未来新增示例：
        // "osg_student_major",
        // "osg_mentor_direction"
    );

    @Autowired
    private ISysDictTypeService dictTypeService;

    /**
     * 查询共享字典（不加方法级鉴权注解，依靠 SecurityConfig 的 anyRequest().authenticated() 校验登录）
     */
    @GetMapping("/{typeCode}")
    public AjaxResult getShared(@PathVariable String typeCode) {
        if (!SHARED_DICT_WHITELIST.contains(typeCode)) {
            return AjaxResult.error("字典类型 [" + typeCode + "] 未开放跨角色共享");
        }
        List<SysDictData> raw = dictTypeService.selectDictDataByType(typeCode);
        List<Map<String, String>> trimmed = Optional.ofNullable(raw)
            .orElse(Collections.emptyList())
            .stream()
            .map(this::toSharedDto)
            .collect(Collectors.toList());
        return success(trimmed);
    }

    /** 只返回前端展示需要的字段 */
    private Map<String, String> toSharedDto(SysDictData d) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("dictValue", Optional.ofNullable(d.getDictValue()).orElse(""));
        m.put("dictLabel", Optional.ofNullable(d.getDictLabel()).orElse(""));
        m.put("cssClass",  Optional.ofNullable(d.getCssClass()).orElse(""));
        m.put("listClass", Optional.ofNullable(d.getListClass()).orElse(""));
        m.put("remark",    Optional.ofNullable(d.getRemark()).orElse(""));
        return m;
    }
}
```

**测试约束**（落地 T3 时必写）：
- 未登录访问 `/dict/osg_company_type` 返回 401
- 登录后（任何角色）访问返回 200 + 字典数据
- 访问 `/dict/sys_normal_disable`（白名单外）返回 500 + 拒绝消息
- 返回 JSON 不含 `createBy` / `updateBy` / `createTime` / `updateTime` / `dictCode` / `dictType` / `status`

---

## 六、任务 T4：新建 useIndustryMeta composable（依赖 T3）

### 6.1 目标

新建 `osg-frontend/packages/shared/src/composables/useIndustryMeta.ts`，统一封装 industries 字典的拉取和缓存。所有端通过 `import { useIndustryMeta } from '@osg/shared'` 消费。

### 6.2 文件骨架（方案 I 落地后）

```ts
// osg-frontend/packages/shared/src/composables/useIndustryMeta.ts
import { ref, type Ref } from 'vue'
import http from '../utils/request'
import type { PositionMetaOption } from '../api/admin/position'

/** 后端 DictFacadeController 裁剪后的返回结构（见前置文档 §5.4） */
interface SharedDictItem {
  dictValue: string
  dictLabel: string
  cssClass: string      // 兜底为 ""，前端转成 undefined
  listClass: string     // 兜底为 ""，前端转成 undefined
  remark: string
}

let cached: PositionMetaOption[] | null = null
let fetching: Promise<PositionMetaOption[]> | null = null

/**
 * 拉取 osg_company_type 字典 industries 列表，进程内缓存。
 * 所有端共享同一份 meta，避免每端各自实现字典映射。
 *
 * 数据来源：GET /dict/osg_company_type（DictFacadeController）
 *   - 任何登录用户可访问（无 @PreAuthorize，靠 Security authenticated() 校验登录）
 *   - 后端白名单控制仅 osg_company_type 等业务字典可被查询
 *   - 后端 DTO 裁剪，不返回 createBy/updateBy 等 admin 元数据
 *
 * @example
 * const { meta, loading, load } = useIndustryMeta()
 * onMounted(load)
 * // 模板里：:class="`industry-${match.tone}`"
 */
export function useIndustryMeta() {
  const meta: Ref<PositionMetaOption[]> = ref(cached ?? [])
  const loading = ref(false)

  const load = async () => {
    if (cached) { meta.value = cached; return }
    if (fetching) { meta.value = await fetching; return }
    loading.value = true
    // ⚠️ shared 的 http.get<T>() 返回 Promise<T>（interceptor 已拆 data 层），不是 AxiosResponse<T>
    //    见 osg-frontend/packages/shared/src/utils/request.ts:46
    fetching = http.get<SharedDictItem[]>('/dict/osg_company_type')
      .then(data => {
        cached = (data ?? []).map(dictItemToMetaOption)
        return cached
      })
      .finally(() => { loading.value = false; fetching = null })
    meta.value = await fetching
  }

  return { meta, loading, load }
}

/** 后端字段名 → 前端 PositionMetaOption 字段名的映射（后端 DTO 裁剪后返回空字符串，这里转成 undefined） */
function dictItemToMetaOption(d: SharedDictItem): PositionMetaOption {
  return {
    value: d.dictValue,
    label: d.dictLabel,
    tone: d.cssClass || undefined,
    icon: d.listClass || undefined,
    remark: d.remark || undefined,
  }
}
```

### 6.3 导出

`osg-frontend/packages/shared/src/composables/index.ts` 加一行：

```ts
export * from './useIndustryMeta'
```

消费方可从主入口导入：

```ts
import { useIndustryMeta } from '@osg/shared'
```

### 6.4 消费姿势规范

前端模板里统一用（**`configFor` 统一兜底，模板不再 `??` 二次兜底**，避免冗余）：

```vue
<template>
  <!-- v-for 技巧缓存 configFor 结果，避免 tone/icon/label 3 次 .find() -->
  <template v-for="cfg in [configFor(row.industry)]" :key="row.id">
    <span :class="`industry-${cfg.tone}`">
      <i :class="`mdi ${cfg.icon}`" />
      {{ cfg.label }}
    </span>
  </template>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useIndustryMeta } from '@osg/shared'
import type { PositionMetaOption } from '@osg/shared'

const { meta, load } = useIndustryMeta()
onMounted(load)

// configFor 是唯一兜底点：tone / icon / label 都保证非空字符串
type IndustryDisplay = Required<Pick<PositionMetaOption, 'value' | 'label' | 'tone' | 'icon'>>

function configFor(industry?: string): IndustryDisplay {
  const found = meta.value.find(m => m.value === industry)
  return {
    value: found?.value ?? '',
    label: found?.label ?? '未归类',
    tone: found?.tone ?? 'slate',
    icon: found?.icon ?? 'mdi-briefcase',
  }
}
</script>
```

**注意**：
- 字段名是 `tone` / `icon`（复用 `PositionMetaOption`），而不是 4 份端文档历史版本里的 `cssClass` / `listClass`
- `configFor` 是**唯一兜底点**，模板里不再写 `?? 'slate'` 这种二次兜底
- 列表场景里务必用 `v-for="cfg in [configFor(...)]"` 缓存（或改用 `computed`），避免每行渲染都 `.find()` 三遍

### 6.5 验收命令

```bash
test -f osg-frontend/packages/shared/src/composables/useIndustryMeta.ts && echo OK
rg "useIndustryMeta" osg-frontend/packages/shared/src/composables/index.ts | wc -l  # ≥ 1
rg "from ['\"]@osg/shared/composables['\"]" osg-frontend/packages | wc -l  # = 0（所有消费都走主入口）
```

---

## 七、任务 T5：admin 端引用点迁移

> **注意**：若 T1/T2 已按 §3.3 / §4.3 的 6 步流程完成（Step 4 批量 sed 已改所有 admin 引用），**此任务已顺带完成**。
> 本节仅在 T1/T2 分阶段推进、T5 独立执行时使用。

### 7.1 步骤

```bash
# 找出所有 admin 本地引用点（覆盖 @/ alias 和相对路径两种模式；实测 100% 都是 @/components/）
rg "from ['\"](@/components|\./|\.\./)[^'\"]*(PageHeader|OverlaySurfaceModal)" osg-frontend/packages/admin/src -g '!*.bak'

# 批量替换（PageHeader 实测 29 处）
for f in $(rg -l "from ['\"]@/components/PageHeader\.vue['\"]" osg-frontend/packages/admin/src); do
  sed -i '' "s|import PageHeader from '@/components/PageHeader.vue'|import { PageHeader } from '@osg/shared'|g" "$f"
done

# 批量替换（OverlaySurfaceModal 实测 47 处）
for f in $(rg -l "from ['\"]@/components/OverlaySurfaceModal\.vue['\"]" osg-frontend/packages/admin/src); do
  sed -i '' "s|import OverlaySurfaceModal from '@/components/OverlaySurfaceModal.vue'|import { OverlaySurfaceModal } from '@osg/shared'|g" "$f"
done
```

### 7.2 验收

```bash
# admin 端不再有对本地 PageHeader / OverlaySurfaceModal 的 import
# ⚠️ 覆盖 @/ alias + 相对路径两种；排除 .bak
rg "from ['\"](@/components|\./|\.\./)[^'\"]*(PageHeader|OverlaySurfaceModal)" osg-frontend/packages/admin/src -g '!*.bak' | wc -l  # = 0

# admin 构建通过
pnpm --filter @osg/admin build

# admin 单测通过
pnpm --filter @osg/admin test
```

---

## 八、任务 T6：4 份端文档 §〇.1 精简为指针

### 8.1 目标

T1~T4 方案定稿后（不需落地），将 4 份端文档里 §〇.1 的完整表格替换为一段指针，避免重复维护。

### 8.2 替换内容（统一）

```markdown
## 〇.1 前置共享包任务

本端重构启动前，必须先完成共享包前置任务（PageHeader / OverlaySurfaceModal 迁移、useIndustryMeta composable 新建、meta 接口多端暴露）。

**前置任务方案与可执行细节详见**：`docs/plans/2026-04-19-shared-prerequisites-plan.md`

**本端启动的硬性前提**：T1 / T2 / T4 任一未完成时，禁止在本端本地新建 PageHeader、OverlaySurfaceModal 副本，禁止本地写 industries 映射表。
```

### 8.3 各端自查清单

4 份端文档需要统一做的**二次校正**（基于本文档 §一.3 的事实偏差）：

| 端 | 需改项 | 具体位置 |
|---|---|---|
| student | 全部 `from '@osg/shared/composables'` → `from '@osg/shared'` | §3.1 表格 |
| student | 全部 `cssClass` / `listClass` → `tone` / `icon` | §3.1 表格 + §3.2 scss 注释 |
| student | CSS token 命名保持（`.industry-gold` 等，与字典 `tone` 值一致） | §3.2 |
| mentor | 同上 | §3.1 / §3.2 |
| lead-mentor | 同上 | §3.1 / §3.2 + §四 mock 字段名 |
| assistant | 同上 | §3.1 代码块 / §3.2 / §四 mock 字段名 |

---

## 九、全局验收

4 份端文档 §〇.1 精简为指针后，从本文档视角检查一致性：

```bash
# 1. 4 份端文档不再独立维护前置表格
#    ⚠️ rg -c 无匹配时不输出（exit 1）不是输出 0；用 -F 固定字符串 + || echo 0 兜底
for f in docs/plans/2026-04-19-{student,mentor,lead-mentor,assistant}-standardization-plan.md; do
  echo -n "$f: "; (rg -cF "IndustryMeta { value, label, cssClass, listClass }" "$f") || echo 0
done  # 每行都应输出 0

# 2. 4 份端文档都指向本文档
rg "shared-prerequisites-plan.md" docs/plans/2026-04-19-{student,mentor,lead-mentor,assistant}-standardization-plan.md | wc -l  # ≥ 4

# 3. 代码实际状态（T1~T5 落地后）
test -f osg-frontend/packages/shared/src/components/PageHeader.vue && echo T1-OK
test -f osg-frontend/packages/shared/src/components/OverlaySurfaceModal.vue && echo T2-OK
test -f osg-frontend/packages/shared/src/composables/useIndustryMeta.ts && echo T4-OK

# 4. admin 端不再本地持有（T5 落地后）
test ! -f osg-frontend/packages/admin/src/components/PageHeader.vue && echo T5a-OK
test ! -f osg-frontend/packages/admin/src/components/OverlaySurfaceModal.vue && echo T5b-OK

# 5. 没有端走 `@osg/shared/composables` 子路径（不存在的子路径）
rg "from ['\"]@osg/shared/composables['\"]" osg-frontend/packages | wc -l  # = 0

# 6. admin 不再有任何本地 PageHeader / OverlaySurfaceModal 引用（T1/T2/T5 落地后）
#    ⚠️ 覆盖 @/ alias，避免 [^@]* 假绿；排除 .bak
rg "from ['\"](@/components|\./|\.\./)[^'\"]*(PageHeader|OverlaySurfaceModal)" osg-frontend/packages/admin/src -g '!*.bak' | wc -l  # = 0

# 7. 方案 I 后端 DictFacadeController 已落地（T3 完成后）
test -f ruoyi-admin/src/main/java/com/ruoyi/web/controller/common/DictFacadeController.java && echo T3-CODE-OK
# 白名单至少包含 osg_company_type
rg "osg_company_type" ruoyi-admin/src/main/java/com/ruoyi/web/controller/common/DictFacadeController.java | wc -l  # ≥ 1
# Controller 无 @PreAuthorize（依靠 Security 登录校验即可）
rg "@PreAuthorize" ruoyi-admin/src/main/java/com/ruoyi/web/controller/common/DictFacadeController.java | wc -l  # = 0

# 8. 前端 useIndustryMeta 实际调用 /dict/:typeCode（T4 完成后），不再调 /admin/position/meta
rg "http\.get.*['\"]/dict/" osg-frontend/packages/shared/src/composables/useIndustryMeta.ts | wc -l  # ≥ 1
rg "http\.get.*['\"]/common/dict/" osg-frontend/packages/shared | wc -l  # = 0（历史方案 A1/A2 路径已弃）
```

---

## 十、风险与回滚

### 10.1 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| OverlaySurfaceModal 样式依赖 CSS 变量，迁到 shared 后某些端没配主题变量 → 显示异常 | 中 | T2 迁移时一并检查 admin 用到的所有 CSS 变量，记录到本文档 §补录；其他端 App.vue 配主题时比对此清单 |
| T1/T2 单步 `mv` 瞬间让 29+47 个引用全部断裂 → IDE 红屏 | 中 | §3.3 / §4.3 强制 6 步流程（cp → build → 改引用 → build → rm），任一步可回退 |
| T3 方案 I 白名单漏加/错加字典 | 中 | §5.5 Controller 落地时单测覆盖"白名单外字典 return 500"；新增共享字典走 review |
| T3 DTO 裁剪字段不全（漏返回 `cssClass` 等） | 中 | §5.5 Controller 单测"返回 JSON 必含 5 个字段"；前端 `dictItemToMetaOption` 提前兜底（空串→undefined）|
| admin 引用点迁移漏掉，构建失败 | 低 | §3.4 / §4.4 / §7.2 验收已修正覆盖 `@/components` alias（历史版本用 `[^@]*` 会假绿 → 本文档已修）|
| 其他端未来误用 `from '@osg/shared/composables'` 不存在子路径 | 低（当前代码 0 处，已 `rg` 验证） | §九 第 5 条兜底检查，防御性存在 |
| `.bak` 备份文件残留导致验收误报 | 低 | T0 已删；验收命令统一 `-g '!*.bak'` 双保险 |
| RuoYi 未来升级给 `/system/dict/data/type/*` 加 `@PreAuthorize` | 低（与方案 I 无关，方案 E 才依赖）| 方案 I 自建 `DictFacadeController`，与 RuoYi 升级解耦 |

### 10.2 回滚

每个 T 任务独立可回滚：

- T1 / T2：`git revert` 迁移 commit，admin 端自动回到本地组件（引用点同一个 commit 内改回）
- T3：删除 `@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/main/java/com/ruoyi/web/controller/common/DictFacadeController.java`，后端无副作用（未改任何其他代码）；T4 前端同步回滚
- T4：删除 `useIndustryMeta.ts` + 删 `composables/index.ts` 一行 export，各端回退到本地映射表
- T5：逐个文件 revert

---

## 十一、未决问题

| # | 问题 | 谁决策 | 状态 |
|---|---|---|---|
| 1 | 后端 meta 接口多端暴露策略选 A / B / C / D / E / I？ | 后端 team + 架构 | **已决 → 方案 I**（见 §5）。待后端 code review 后落地 |
| 2 | T1 / T2 是否可以立即启动（不等 T3）？ | 工程 | 已决 → 可立即启动（T1/T2 不依赖 T3）|
| 3 | admin 端迁移后是否需要走灰度？（影响面：admin 所有页面的 PageHeader / Modal）| 工程 | T5 启动前决策 |
| 4 | 4 份端文档 §〇.1 精简改动是否一次 PR 合并？ | 文档管理 | T6 启动前决策 |
| 5 | `useIndustryMeta` 的缓存粒度（进程内 / localStorage / 每页面）？| 工程 | T4 实现细节（当前骨架用进程内，可观察后升级）|
| 6 | 方案 I 白名单治理流程（新增共享字典需要谁 review）？| 架构 + 业务 | T3 落地时建立 |

---

## 附：术语表

| 术语 | 含义 |
|---|---|
| 前置任务 | 指 T1 ~ T4，4 端任一端标准化落地的硬性依赖 |
| 共享包 | `@osg/shared`，对应 `osg-frontend/packages/shared/` |
| `PositionMetaOption` | 已存在的字典项类型，字段 `{ value, label, tone?, icon?, parent?, remark? }` |
| `industries` | `PositionMeta.industries`，类型为 `PositionMetaOption[]`，来源字典 `osg_company_type` |
| tone | `PositionMetaOption.tone`，对应字典的 `css_class` 字段（色系 token：gold/violet/blue/amber/teal/indigo/slate）|
| icon | `PositionMetaOption.icon`，对应字典的 `list_class` 字段（图标 class 名，当前约定使用 `mdi-*`/Material Design Icons，未来可替换其他图标集）|
| `DictFacadeController` | 方案 I 后端字典共享外观类，位于 `ruoyi-admin/.../controller/common/`，对外路径 `/dict/:typeCode`，见 §5.5 |
| 字典共享白名单 | `DictFacadeController.SHARED_DICT_WHITELIST`，类型级防护：只开放指定字典给多端查询，其他字典（如 `sys_normal_disable`）不受影响 |
| DTO 裁剪 | `DictFacadeController.toSharedDto()`，字段级防护：只返回 `dictValue` / `dictLabel` / `cssClass` / `listClass` / `remark` 5 个字段，避免 `createBy` / `updateBy` 等 admin 元数据泄露 |
| `SharedDictItem` | 前端 `useIndustryMeta` 里定义的接口类型，对应后端 DTO 裁剪后的返回结构，见 §6.2 |
