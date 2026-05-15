# Admin i18n 验证问题记录

## 背景

按验证清单执行 Admin 前端 i18n 相关检查时，Locale JSON 与 key 一致性检查通过，但 admin 端 TypeScript 类型检查和构建被同一个语法错误阻断。

## 执行结果摘要

| 检查项 | 结果 | 证据 |
|---|---|---|
| `en.json` JSON 格式 | 通过 | `en.json OK` |
| `zh.json` JSON 格式 | 通过 | `zh.json OK` |
| `en.json` / `zh.json` key 一致性 | 通过 | `Diff: 0 []` |
| admin TypeScript 类型检查 | 失败 | `packages/shared/src/api/admin/question.ts(6,35): error TS1005: ';' expected.` |
| admin 构建检查 | 失败 | 同一个 TypeScript 语法错误阻断 build |
| CJK 快速复查脚本定位 | 未找到既有脚本 | 仓库内未找到 `NO_RUNTIME_CHINESE_RESIDUES`、`*cjk*`、`*scan*` 明确脚本 |

## 复现命令

执行目录：`h:\workspace\java\OSGPrj\osg-frontend`

```powershell
rtk pnpm --filter admin typecheck
```

关键输出：

```text
packages/shared/src/api/admin/question.ts(6,35): error TS1005: ';' expected.
```

构建错误/警告扫描也被同一错误阻断：

```powershell
rtk pnpm --filter admin build 2>&1 | Select-String -Pattern "error|warn" -CaseSensitive:$false
```

关键输出：

```text
packages/shared/src/api/admin/question.ts(6,35): error TS1005: ';' expected.
```

## 问题文件

`osg-frontend/packages/shared/src/api/admin/question.ts`

当前问题代码位于第 6 行：

```ts
export type QuestionSourceType = t('interview_application') | t('self_submitted')
```

## 根因分析

`QuestionSourceType` 是 TypeScript 类型别名，但当前被替换成了运行时 i18n 函数调用 `t('...')`。

TypeScript 的 union type 只能包含类型或字面量类型，不能直接包含运行时函数调用。因此编译器在解析第 6 行时失败，并报出：

```text
TS1005: ';' expected.
```

该问题疑似由自动 i18n 替换过程误把类型字面量替换为 `t(...)` 导致。

## 相关事实源

后端测试与接口契约显示，`sourceType` 当前真实返回值仍是中文业务值：

- `入职面试申请`
- `自主填写`

相关证据来自：

- `ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgQuestionControllerTest.java`
- `ruoyi-system/src/main/resources/mapper/system/OsgInterviewQuestionMapper.xml`
- `ruoyi-system/src/main/java/com/ruoyi/system/domain/OsgInterviewQuestion.java`

前端使用点：

- `osg-frontend/packages/admin/src/views/resources/questions/index.vue`
- `osg-frontend/packages/admin/src/views/resources/questions/components/QuestionReviewModal.vue`

## 影响范围

当前影响范围至少包括：

- admin 端 TypeScript 类型检查无法通过
- admin 端 build 无法继续
- 后续 CJK 快速复查无法作为“修复后结果”确认

## 建议修复方案

建议不要简单把第 6 行回退为中文字面量 union，因为这会继续留下运行时源码 CJK 命中。

建议采用最小 i18n 安全修复：

1. 在 API 类型层避免运行时 `t(...)` 调用，保持可编译类型。
2. 在展示层增加来源类型显示 formatter，将后端返回的业务值映射到 i18n key：
   - `入职面试申请` -> `t('interview_application')`
   - `自主填写` -> `t('self_submitted')`
3. `questions/index.vue` 中的 tag 颜色判断不要再比较 `record.sourceType === $t(...)`，改为基于来源语义判断。
4. `QuestionReviewModal.vue` 中展示 `row.sourceType` 的位置改为展示 formatter 输出。
5. 修复后重跑 typecheck、build、JSON/key 检查与 CJK 快速复查。

## CJK 快速复查备注

本次搜索未在仓库中找到明确的历史 CJK/runtime 扫描脚本或标记：

- 未找到 `NO_RUNTIME_CHINESE_RESIDUES`
- 未找到明确 `*cjk*` 文件
- 未找到明确 `*scan*` 文件

已找到的 i18n 脚本主要是：

- `osg-frontend/scripts/extract-i18n.mjs`
- `osg-frontend/scripts/replace-source.mjs`

如需执行“之前的 CJK 扫描脚本”，需要提供脚本路径；否则可在修复后补充一个只读 PowerShell/Node 扫描命令作为快速复查。

## 后续验证清单

修复后建议按顺序重跑：

```powershell
rtk node -e "JSON.parse(require('fs').readFileSync('osg-frontend/packages/shared/src/i18n/locales/en.json','utf8'))"; if ($LASTEXITCODE -eq 0) { Write-Output "en.json OK" }
rtk node -e "JSON.parse(require('fs').readFileSync('osg-frontend/packages/shared/src/i18n/locales/zh.json','utf8'))"; if ($LASTEXITCODE -eq 0) { Write-Output "zh.json OK" }
rtk node -e "const en=Object.keys(require('./osg-frontend/packages/shared/src/i18n/locales/en.json')); const zh=Object.keys(require('./osg-frontend/packages/shared/src/i18n/locales/zh.json')); const diff=[...en.filter(k=>!zh.includes(k)),...zh.filter(k=>!en.includes(k))]; console.log('Diff:', diff.length, diff);"
```

执行目录：`h:\workspace\java\OSGPrj\osg-frontend`

```powershell
rtk pnpm --filter admin typecheck
rtk pnpm --filter admin build 2>&1 | Select-String -Pattern "error|warn" -CaseSensitive:$false
```
