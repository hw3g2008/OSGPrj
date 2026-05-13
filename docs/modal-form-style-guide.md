# 弹窗表单控件公共规范

> 适用范围：admin / assistant / lead-mentor / mentor / student 五端所有 OverlaySurfaceModal 内的输入控件
> 起始版本：2026-05-07
> 入口：`packages/shared/src/styles/index.scss` 的 `.osg-modal-form` 规则

## 1. 用法

任何 OverlaySurfaceModal 弹窗，将 `osg-modal-form` 加入 `body-class`：

```vue
<OverlaySurfaceModal
  :open="visible"
  body-class="some-modal__body osg-modal-form"
  ...
/>
```

弹窗内所有 `<a-input>` / `<a-select>` / `<a-date-picker>` / `<a-input-number>` / `<a-textarea>` 自动获得统一规格，无需在组件内再写控件级样式。

## 2. 规格基线

| 维度 | 值 | CSS 变量 |
|---|---|---|
| 控件高度 | **36px** | `--osg-modal-form-control-height` |
| 内层 line-height | 34px | `--osg-modal-form-control-inner-height` |
| 水平 padding | 11px | `--osg-modal-form-control-padding-x` |
| form-item 下间距 | 12px | `--osg-modal-form-item-mb` |
| label 字号 | 13px | `--osg-modal-form-label-font-size` |
| 圆角 | 6px | `$osg-mf-radius` |
| 边框 | 1px solid #d9d9d9 | `$osg-mf-border-color` |
| hover/focus 边框 | #4096ff | antd primary |
| focus 阴影 | 0 0 0 2px rgba(64,150,255,0.1) | — |
| textarea 最小高 | 80px (外壳) / 64px (内层) | 硬编码 |

> **基准来源**：圆角 6px / 边框 1px solid #d9d9d9 来自 ant-design-vue 4.x 默认渲染（即 `MultiSelect` 公共组件原生样式）。所有单选 select / input / picker / input-number 都对齐该基准，避免与 multi-select 视觉割裂。

## 3. 强制约束

1. **能用公共组件就用** — 多选场景统一用 `@osg/shared/components` 的 `MultiSelect`，不要自行 `<a-select mode="multiple">`。
2. **公共组件圆角与上述基线一致**；如新增公共组件渲染圆角与基线不一致，**改公共组件，不改基线**。
3. **弹窗表单不要在组件内自定义控件高度/圆角/边框**；如确需调整，先看是否能扩展 `.osg-modal-form` 规则。
4. **textarea 用 allow-clear 时**，antd 会包一层 `.ant-input-affix-wrapper-textarea-with-clear-btn`；公共规则已处理"双层边框"和高度撑满，业务方无需关心。

## 4. 已知坑

| 坑 | 处理 |
|---|---|
| `OverlaySurfaceModal` 自带 `min-height: 48px` 给 ant 控件 | 公共规则用 `min-height + height + padding` 同时 `!important` 压过 |
| antd `in-form-item` 默认 large 尺寸 | 同上 |
| affix-wrapper（allow-clear）内嵌 input 自带 1px border 与外层重叠 | 公共规则把内层 input/textarea 强制 `border: 0` |
| scoped scss 不传 portal body 节点 | 公共样式必须**非 scoped**注入；业务弹窗 scss 也建议外部样式块 `<style lang="scss"> @use ... </style>` |
| dayjs picker 配 `value-format` 时 v-model 收的是字符串，不是 Dayjs | watch 里别直接调 `.year()`，先 `typeof === 'string'` 切片 |

## 5. 字典字段显示规范

弹窗 / 详情中**任何**字典字段（学校 / 求职地区 / 招聘周期 / 主攻方向 / 子方向 / 签证 / 国家区号 / …）显示时**必须**走 `dictValue → dictLabel` 转换；不能直接渲染原始 key（如 `tech` / `apac` / `not_required`）。

### 实现要点

1. **字典加载**：弹窗 visible 切到 true 时，一次性加载所需字典并构建 `Record<dictValue, dictLabel>` 映射。
   ```ts
   import { getAdminDictOptions } from '@/api/adminDict'
   const dictMaps = ref<Record<string, Record<string, string>>>({})
   const loadDictMaps = async () => {
     const types = ['osg_school', 'osg_region', 'osg_recruit_cycle', 'osg_major_direction', 'osg_sub_direction', 'osg_visa_status']
     await Promise.all(types.map(async (t) => {
       const items = await getAdminDictOptions(t)
       dictMaps.value[t] = Object.fromEntries((items || []).map(it => [String(it.dictValue), it.dictLabel]))
     }))
   }
   ```
2. **回退策略**：字典 map 找不到 key 时回退原 key（`map[v] || v`），避免空白 / 报错。
3. **列表渲染**：用 computed pill 数组（`schoolPills`/`majorDirectionPills` 等）喂模板，不要在 `{{ }}` 里现算。
4. **CSV 字段**：先按 `,` 切分，再逐个 labelize；展示时用 pill 列表，不要直接显示 CSV。

### 适用对象
- 详情弹窗：所有 `sdm-pill` / `sdm-field__value` 渲染字典字段处。
- 列表表格：列单元里如果显示 dict-key 也应同样 labelize（业务方决定是否在 row 渲染层处理）。
- 编辑/新增弹窗：表单控件的 `:options` 已经从字典加载，无需额外转换；但如果是 readonly 展示，照此规则。

### 反例
```vue
<!-- ❌ 直接渲染 key -->
<span>{{ detail?.school }}</span>
<span>{{ detail?.visaStatus }}</span>

<!-- ✓ 走字典 map -->
<span>{{ schoolPills.join(' / ') }}</span>
<span>{{ visaLabel }}</span>
```

## 6. 视觉对齐 checklist（合入弹窗前自检）

- [ ] 弹窗 `body-class` 含 `osg-modal-form`
- [ ] 所有 input / select / picker / input-number 高度 36px
- [ ] 圆角 6px / 边框 1px solid #d9d9d9
- [ ] 光标与 placeholder 垂直居中（line-height 34px）
- [ ] textarea 至少 80px 高、可拖拽变高
- [ ] 没有"双层边框"
- [ ] 多选场景使用 `MultiSelect` 公共组件
- [ ] 详情/只读视图所有字典字段都走 `dictValue → dictLabel`，不直接显示 key

## 7. 行为强约束（CLAUDE.md 第 5/6/7 条对应细化）

### 7.1 多选 tag 默认全展示（CLAUDE.md §5）

`MultiSelect` 公共组件默认**不折叠**选中项，避免用户看不到已选。

```vue
<!-- ✓ 默认全展示 -->
<MultiSelect v-model:value="form.specialty" :options="specialtyOptions" />

<!-- ❌ 显式折叠（除非 PR 描述里说明 UI 紧凑视图理由） -->
<MultiSelect v-model:value="..." :max-tag-count="3" />
```

如紧凑视图必需，加 tooltip：
```vue
<MultiSelect ...
  :max-tag-count="3"
  :max-tag-placeholder="rest => h(ATooltip, { title: rest.map(r=>r.label).join('、') }, { default: () => `+${rest.length}` })" />
```

### 7.2 字段级权限双层防护（CLAUDE.md §6）

**示例**：导师评语仅超管可写。

前端：
```vue
<a-form-item v-if="isSuperAdmin" label="评语">
  <a-textarea v-model:value="form.ratingRemark" />
</a-form-item>
```

后端 Service：
```java
public void updateStaff(OsgStaff staff) {
    if (staff.getRatingRemark() != null && !SecurityUtils.isAdmin()) {
        throw new ServiceException("无权限修改评语字段", 403);
    }
    // ...
}
```

GET 详情接口对非超管 strip ratingRemark key（不能依赖前端不显示）：
```java
if (!SecurityUtils.isAdmin()) {
    staffVo.setRatingRemark(null); // 或 @JsonView 投影
}
```

### 7.3 附件上传双层校验（CLAUDE.md §7）

前端 `before-upload`：
```ts
const beforeUpload = (file: File) => {
  const ok = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'].includes(file.type)
  if (!ok) { message.error('仅支持 JPG/PNG/GIF/PDF'); return false }
  if (file.size > 10 * 1024 * 1024) { message.error('单文件不超过 10MB'); return false }
  if (fileList.value.length >= 5) { message.error('最多上传 5 个附件'); return false }
  return true
}
```

后端接口：
```java
@PostMapping("/admin/position/attachment")
@PreAuthorize("@ss.hasPermi('career:position:edit')")
public AjaxResult uploadAttachment(@RequestParam MultipartFile file) throws IOException {
    // MIME 二次校验
    String realMime = Files.probeContentType(Paths.get(file.getOriginalFilename()));
    if (!ALLOWED_MIME.contains(realMime)) return AjaxResult.error("文件类型不支持");
    // 大小二次校验
    if (file.getSize() > 10 * 1024 * 1024) return AjaxResult.error("文件超过 10MB");
    // 文件名清洗
    String ext = FilenameUtils.getExtension(file.getOriginalFilename());
    String storeName = UUID.randomUUID() + "." + ext;
    String url = ossService.upload(file.getInputStream(), storeName);
    // 返回原 fileName 仅作展示
    return AjaxResult.success(Map.of("url", url, "fileName", file.getOriginalFilename(),
        "fileType", realMime, "size", file.getSize()));
}
```

## 8. 修改历史

| 日期 | 改动 | 影响 |
|---|---|---|
| 2026-05-07 | 抽公共 `.osg-modal-form` 规则；统一 36px / 6px / 1px / textarea 80px | 已接入 admin AddStudentModal / EditStudentModal；其余 4 端弹窗按需加 body-class |
| 2026-05-07 | 加字典字段显示规范（key→label） | 已接入 admin StudentDetailModal；其他详情弹窗按需引入字典 map |
| 2026-05-08 | admin 合同管理 RenewContractModal / ContractDetailModal body-class 接入 `osg-modal-form`；ContractDetailModal 与 contracts/index.vue 续签原因走 `osg_renewal_reason` 字典 value→label | 修复合同续签弹窗控件未对齐基线、详情/列表显示字典 key 的问题 |
| 2026-05-08 | admin 合同附件上传按 §7.3 双层校验：前端 `before-upload` 校验 MIME / 150MB / 1 文件，后端 OsgContractController 增加 MIME 白名单 + 150MB size 校验 | 取代仅扩展名白名单，符合 §7.3 强约束 |
| 2026-05-08 | 新增 §7 行为强约束：多选 tag 全展示 / 字段级权限双层防护 / 附件上传双层校验。CLAUDE.md 弹窗规范小节同步加 §5/§6/§7 三条 | 后续所有弹窗实施需对齐；admin Bug 修复 T1.4 / T1.6 / T3.4 直接落地 |
| 2026-05-08 | admin StaffFormModal / StaffDetailModal body-class 接入 `osg-modal-form`；删除 StaffFormModal scoped scss 中 44px / 14px padding / 40px line-height 等控件级 :global 覆盖（与 §3 第 3 条冲突，让公共基线 36px 接管） | T1 修复期间补齐基线，导师新增/编辑/详情弹窗与公共规范一致 |
| 2026-05-08 | shared/styles/index.scss 增加 `.ant-input-number-affix-wrapper` 规则：外层套边 36/6/1px、内层 `.ant-input-number` 强制去边（§4 已知坑扩展到 input-number+prefix 变种） | 修 T1.9 课时单价 prefix `$` 双层边框；其他端用 input-number+prefix 同样受益 |
| 2026-05-08 | 弹窗内 `.ant-input-number-handler-wrap` 统一 `display: none`（hover 出现的上下增减箭头会溢出框外，视觉杂乱） | 所有用 input-number 的弹窗自动隐藏增减箭头，需要纯键盘输入即可 |
| 2026-05-13 | admin 岗位列表 PositionFormModal body-class 接入 `osg-modal-form`；删除 scoped scss 中本地 `:deep(.ant-select-single … .ant-select-selector)` padding/search/placeholder 覆盖（与 §3 第 3 条冲突，让公共基线 36/6/1px 接管） | 修复岗位「新增/编辑岗位」弹窗 select 高/圆角/内边距与公共基线不一致 |
| 2026-05-13 | 抽公共 `OverlaySurfaceModal` 到 `shared/src/components`（复用 admin 版本，颜色走 `var(--primary*)/var(--border)/var(--text*)` CSS 变量按端切换）；student 端「申请辅导」弹窗（applications/index.vue progressModalOpen）从 `a-modal` 迁到 shared `OverlaySurfaceModal`，body-class 接入 `osg-modal-form`，footer 自定义 `取消/提交` 按钮槽 | 学生端「申请辅导」与 5 端公共弹窗壳 + 公共表单基线对齐；admin / assistant 本地 `OverlaySurfaceModal.vue` 暂未删除（保持现状，后续按需迁移到 shared） |
