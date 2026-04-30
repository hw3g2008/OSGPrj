# Admin 端「新增/编辑导师」表单字典化 + 脏 UI 修复方案

> 日期: 2026-04-29  
> 范围: StaffFormModal 全字段对齐  
> 原则: 能用已有字典的全部走字典；不建新字典；不考虑历史兼容

---

## 1. 现状问题

### 1.1 字段总览（StaffFormModal.vue 14 个字段）

| # | 字段 | 控件 | 后端 OsgStaff 有？ | 写库？ | 字典可接？ |
|---|---|---|---|---|---|
| 1 | 姓名 staffName | a-input | ✅ | ✅ | — |
| 2 | 邮箱 email | a-input | ✅ | ✅ | — |
| 3 | 类型 staffType | a-select 硬编码 3 项 | ✅ | ✅ | ❌ 无字典，维持硬编码 |
| 4 | **性别 gender** | a-select 硬编码 2 项 | **❌** | **❌ 静默丢弃** | ❌ 无字典 |
| 5 | 手机号 phone | a-input | ✅ | ✅ | — |
| 6 | **微信 wechatId** | a-input | **❌** | **❌ 静默丢弃** | — |
| 7 | **地区 region** | a-select 硬编码 4 项 | ✅ | ✅ 存中文 label | ✅ `osg_region` |
| 8 | **城市 city** | a-input 自由输入 | ✅ | ✅ 存中文 | ✅ `osg_city` 级联 |
| 9 | **主攻方向 majorDirection** | a-select 硬编码 4 项（单选） | ✅ | ✅ 存中文 label | ✅ `osg_major_direction`（改多选） |
| 10 | **子方向 subDirection** | a-select 硬编码 map（单选） | ✅ | ✅ 存英文缩写 | ✅ `osg_sub_direction` 级联（改多选） |
| 11 | **可授课程类型 courseTypes** | a-input 自由输入 | **❌** | **❌ 静默丢弃** | ✅ `osg_course_type` |
| 12 | 课时单价 hourlyRate | a-input-number | ✅ | ✅ | — |
| 13 | 登录账号 loginAccount | a-input | — | 走 sys_user | — |
| 14 | 初始密码 initialPassword | a-input | — | 走 sys_user | — |

### 1.2 两类问题

**问题 A — 字典化缺失（#7~#11）**：5 个字段应走字典但用硬编码，写库的是中文 label 而非字典 value，与字典体系完全断链。且主攻方向/子方向应为多选（参考学生端），当前为单选。

**问题 B — 脏 UI（#4 性别、#6 微信、#11 课程类型）**：前端表单有字段，后端 OsgStaff 实体 + DB 表均无对应列，提交后端静默丢弃。

---

## 2. 目标

1. 4 个字段（region / city / majorDirection / subDirection）接入已有字典，写库存字典 value
2. majorDirection / subDirection 改为**多选**（参考学生端 AddStudentModal），后端存逗号分隔 string
3. courseTypes 补后端字段 + 接入 `osg_course_type` 字典多选
4. gender / wechatId 补后端字段，让数据真正入库（无字典，维持硬编码/自由输入）
5. 删除所有前端硬编码选项数组（regionOptions / majorDirectionOptions / subDirectionMap）

---

## 3. 涉及字典（已有，不新建）

| 字典 typeCode | 名称 | 父字典 | seed 项数 |
|---|---|---|---|
| `osg_region` | 大区 | — | 4（na/eu/apac/china_mainland） |
| `osg_city` | 城市 | osg_region | 11 |
| `osg_major_direction` | 主攻方向 | — | 5（consulting/finance/tech/quant/computer_science） |
| `osg_sub_direction` | 子方向 | osg_major_direction | 8 |
| `osg_course_type` | 课程类型 | — | 9 |

---

## 4. 修改方案

### 4.1 数据库迁移 SQL

**文件**: `sql/migrations/2026-04-29-osg-staff-add-missing-columns.sql`

```sql
-- 1. 新增 3 个缺失列
ALTER TABLE osg_staff
  ADD COLUMN gender       VARCHAR(4)   DEFAULT NULL COMMENT '性别(0男/1女)' AFTER phone,
  ADD COLUMN wechat_id    VARCHAR(64)  DEFAULT NULL COMMENT '微信号' AFTER gender,
  ADD COLUMN course_types VARCHAR(512) DEFAULT NULL COMMENT '可授课程类型(逗号分隔字典value)' AFTER sub_direction;

-- 2. major_direction 扩容（多选后存逗号分隔，64 不够）
ALTER TABLE osg_staff
  MODIFY COLUMN major_direction VARCHAR(255) DEFAULT NULL COMMENT '主攻方向(逗号分隔字典value)';
```

### 4.2 后端 Java 改动

#### 4.2.1 OsgStaff.java — 添加 3 个字段

```java
// 在 phone 之后添加
private String gender;
private String wechatId;
// 在 subDirection 之后添加
private String courseTypes;
// + getter/setter + toString append
```

#### 4.2.2 OsgStaffMapper.xml — 4 处改动

1. **resultMap** 添加 3 行：
   ```xml
   <result property="gender" column="gender"/>
   <result property="wechatId" column="wechat_id"/>
   <result property="courseTypes" column="course_types"/>
   ```

2. **selectStaffColumns** 添加：`s.gender, s.wechat_id, s.course_types,`

3. **insertStaff** 添加 3 列的 `<if>` 块

4. **updateStaff** 添加 3 列的 `<if>` 块

#### 4.2.3 OsgStaffController.java — 3 处改动

1. **parseStaff()** 添加 3 行 set：
   ```java
   staff.setGender(asText(body.get("gender")));
   staff.setWechatId(asText(body.get("wechatId")));
   staff.setCourseTypes(asText(body.get("courseTypes")));
   ```

2. **toTableRow()** 添加 3 行 put：
   ```java
   row.put("gender", staff.getGender());
   row.put("wechatId", staff.getWechatId());
   row.put("courseTypes", staff.getCourseTypes());
   ```

3. **mergeExisting()** 添加 3 行（保持 `defaultText()` 模式，避免编辑时未传字段被覆盖为 null）：
   ```java
   existing.setGender(defaultText(update.getGender(), existing.getGender()));
   existing.setWechatId(defaultText(update.getWechatId(), existing.getWechatId()));
   existing.setCourseTypes(defaultText(update.getCourseTypes(), existing.getCourseTypes()));
   ```

### 4.3 前端改动

#### 4.3.1 StaffFormModal.vue — 核心改动

**删除硬编码常量**（第 170-177 行）：
```
- const majorDirectionOptions = ['金融', '咨询', '科技', '量化']
- const subDirectionMap: Record<string, string[]> = { ... }
- const regionOptions = ['北美', '欧洲', '亚太', '中国大陆']
```

**引入 useDictFacade**（script setup 顶部）：
```typescript
import { useDictFacade } from '@osg/shared/composables/useDictFacade'
import { onMounted, computed } from 'vue'

// 5 个字典
const { items: regionItems, load: loadRegion } = useDictFacade('osg_region')
const { items: cityItems, load: loadCity } = useDictFacade('osg_city')
const { items: majorItems, load: loadMajor } = useDictFacade('osg_major_direction')
const { items: subItems, load: loadSub } = useDictFacade('osg_sub_direction')
const { items: courseItems, load: loadCourse } = useDictFacade('osg_course_type')

onMounted(() => {
  loadRegion(); loadCity(); loadMajor(); loadSub(); loadCourse()
})

// 级联：城市按选中的 region 过滤
const filteredCityOptions = computed(() =>
  form.region
    ? cityItems.value.filter(c => c.parentValue === form.region)
    : cityItems.value
)

// 级联：子方向按已选主攻方向联合过滤（多选）
const filteredSubOptions = computed(() =>
  form.majorDirections.length
    ? subItems.value.filter(s => s.parentValue && form.majorDirections.includes(s.parentValue))
    : []
)
```

**模板改动**（6 个字段）：

| 字段 | 原控件 | 改为 |
|---|---|---|
| 地区 | `a-select` 硬编码 `regionOptions` | `a-select :options` 绑定 `regionItems`（value/label） |
| 城市 | `a-input` | `a-select :options` 绑定 `filteredCityOptions` |
| 主攻方向 | `a-select` 硬编码单选 | `a-select mode="multiple" :options` 绑定 `majorItems` |
| 子方向 | `a-select` 硬编码单选 | `a-select mode="multiple" :options` 绑定 `filteredSubOptions` |
| 可授课程类型 | `a-input` | `a-select mode="multiple" :options` 绑定 `courseItems` |
| 性别 / 微信 / 类型 | 不变 | 不变（无字典） |

**级联联动逻辑**：
- 选中 region 变化时 → 清空 city（**需新增 watch**，当前不存在）
- 选中 majorDirections 变化时 → 过滤掉不合法的 subDirections（**需改写现有 watch**，参考学生端模式）

```typescript
// 新增：region → city 清空
watch(() => form.region, (next, prev) => {
  if (!next || !prev || next === prev) return
  form.city = ''
})

// 改写：majorDirections 变化 → 过滤 subDirections（参考学生端 AddStudentModal L711-717）
watch(() => form.majorDirections, (newDirs) => {
  const validParents = new Set(newDirs)
  form.subDirections = form.subDirections.filter(sub => {
    const item = subItems.value.find(i => i.value === sub)
    return item?.parentValue && validParents.has(item.parentValue)
  })
})
```

**form 字段类型变更**（3 个字段从 string → string[]）：
```typescript
// 旧
majorDirection: '',
subDirection: '',
courseTypes: '',

// 新
majorDirections: [] as string[],
subDirections: [] as string[],
courseTypes: [] as string[],
```

**handleSubmit 中序列化**（3 个数组字段都 join 为逗号分隔 string）：
```typescript
majorDirection: form.majorDirections.length ? form.majorDirections.join(',') : undefined,
subDirection: form.subDirections.length ? form.subDirections.join(',') : undefined,
courseTypes: form.courseTypes.length ? form.courseTypes.join(',') : undefined,
```

> 注意：后端字段名仍为 `majorDirection` / `subDirection`（单数），前端 form 字段改为复数仅为本地语义清晰，提交时 key 不变。

**resetForm 中反序列化**：
```typescript
form.majorDirections = staff?.majorDirection
  ? String(staff.majorDirection).split(',').filter(Boolean)
  : []
form.subDirections = staff?.subDirection
  ? String(staff.subDirection).split(',').filter(Boolean)
  : []
form.courseTypes = staff?.courseTypes
  ? String(staff.courseTypes).split(',').filter(Boolean)
  : []
```

#### 4.3.2 StaffPayload 类型（shared/api/admin/staff.ts）

无需改动。`courseTypes` 已经是 `string?` 类型，前端 join 后仍然是 string 传给后端。

### 4.4 列表页改动（index.vue）

迁移后新数据存 dict value（如 `finance` / `na`），列表页展示和颜色/emoji 函数都依赖中文，必须同步改。

#### 4.4.1 引入字典 + 构建 lookup map

```typescript
import { useDictFacade } from '@osg/shared/composables/useDictFacade'

const { items: regionItems, load: loadRegion } = useDictFacade('osg_region')
const { items: cityItems, load: loadCity } = useDictFacade('osg_city')
const { items: majorItems, load: loadMajor } = useDictFacade('osg_major_direction')
const { items: subItems, load: loadSub } = useDictFacade('osg_sub_direction')

onMounted(() => { loadRegion(); loadCity(); loadMajor(); loadSub() })

// 通用 value→label 查找（兼容历史中文数据：查不到就原样返回）
const dictLabel = (items: { value: string; label: string }[], val?: string) =>
  val ? (items.find(i => i.value === val)?.label ?? val) : '-'
```

#### 4.4.2 改写 `getDirectionColor`（按 dict value 判断）

```typescript
const getDirectionColor = (direction?: string) => {
  // 兼容新值(dict value) + 历史值(中文)
  if (direction === 'quant' || direction?.includes('量化')) return 'purple'
  if (direction === 'consulting' || direction?.includes('咨询')) return 'blue'
  if (direction === 'tech' || direction?.includes('科技')) return 'orange'
  return 'cyan'
}
```

#### 4.4.3 改写 `getRegionEmoji`（按 dict value 判断）

```typescript
const getRegionEmoji = (region?: string) => {
  if (!region) return ''
  if (region === 'na' || region.includes('北美')) return '🌎'
  if (region === 'eu' || region.includes('欧洲')) return '🌍'
  if (region === 'apac' || region.includes('亚太')) return '🌏'
  return ''
}
```

#### 4.4.4 表格展示改用 dict label

| 列 | 当前 | 改为 |
|---|---|---|
| majorDirection | `{{ record.majorDirection }}` 单 Tag | 逗号分隔 → split → 循环 `<a-tag>` 每个展示 `dictLabel(majorItems, v)` |
| subDirection | `{{ record.subDirection }}` 单文本 | 逗号分隔 → split → 循环展示 `dictLabel(subItems, v)` |
| region | `{{ record.region }}` | `{{ dictLabel(regionItems, record.region) }}` |
| city | `{{ record.city \|\| '-' }}` | `{{ dictLabel(cityItems, record.city) }}` |

**辅助函数**（处理逗号分隔 → 数组）：
```typescript
const splitField = (val?: string) => val ? val.split(',').filter(Boolean) : []
```

**majorDirection 列模板示例**：
```html
<template v-else-if="column.dataIndex === 'majorDirection'">
  <template v-if="record.majorDirection">
    <a-tag
      v-for="v in splitField(record.majorDirection)"
      :key="v"
      :color="getDirectionColor(v)"
    >{{ dictLabel(majorItems, v) }}</a-tag>
  </template>
  <span v-else>-</span>
</template>
```

> 兼容逻辑：`dictLabel` 查不到 dict value 时原样返回 → 历史中文数据正常显示，新数据显示字典 label。

---

## 5. 实施顺序

| Step | 内容 | 文件 |
|---|---|---|
| 1 | DB 迁移 SQL（仅加列，不迁移数据） | `sql/migrations/2026-04-29-osg-staff-add-missing-columns.sql` |
| 2 | 后端 OsgStaff.java 加 3 字段 | `ruoyi-system/.../domain/OsgStaff.java` |
| 3 | 后端 OsgStaffMapper.xml 加 3 列 | `ruoyi-system/.../mapper/system/OsgStaffMapper.xml` |
| 4 | 后端 OsgStaffController.java 加 3 字段处理 | `ruoyi-admin/.../controller/osg/OsgStaffController.java` |
| 5 | 前端 StaffFormModal.vue 字典化 + watch | `osg-frontend/.../staff/components/StaffFormModal.vue` |
| 6 | 前端 index.vue 列表页展示兼容 | `osg-frontend/.../staff/index.vue` |
| 7 | 执行 DB 迁移（远端测试库） | 手动 mysql 执行 |
| 8 | 验证 | 后端重启 + 前端 dev 访问 admin:3005 新增/编辑导师 + 列表页展示 |

---

## 6. 不做的事

- ❌ 不新建 `osg_staff_type` / `osg_gender` 字典
- ❌ 不修改 `sys_user_sex` 若依内置字典
- ❌ 不补 `osg_sub_direction` 缺失的子方向条目（运营需要时去 admin 字典管理 UI 自行添加）
- ❌ 不迁移历史数据（已有记录保持原样，新增/编辑后的记录存 dict value）
- ❌ 不改导出 Excel 格式（导出仍存 value，运营需要 label 可后续加 dict lookup）

---

## 7. 风险

| 风险 | 缓解 |
|---|---|
| 子方向字典只 seed 8 项，原硬编码有 13 项 | 用字典有什么显示什么，运营通过字典管理 UI 补 |
| 城市字典只 seed 11 城市，不够全 | 同上，运营补。已不是自由输入 |
| 历史数据为中文，新数据为 dict value，两种格式并存 | 列表页 `dictLabel()` 兼容：查到 dict → 显示 label，查不到 → 原样显示。颜色/emoji 函数同时匹配两种格式。多选字段 split 后循环展示 |
| 后端重启后旧前端缓存 | 用户清浏览器缓存 / 硬刷新 |
