# 招聘周期字典统一修复方案

**日期**：2026-04-18  
**范围**：岗位管理模块 — 招聘周期字段  
**关联现象**：编辑弹窗招聘周期选项与实际字典不符 / 列表只显示一个 / 编辑保存后丢值

---

## 1. 根因

后台当前存在**两套招聘周期字典**：

| dict_type | 条目数 | 内容 | 产生方式 |
|-----------|-------|------|---------|
| `osg_recruitment_cycle` | 18 | Spring Week / 2024~2027 Spring/Summer/Autumn/Full-time / Off-cycle | Java 代码硬编码 seed（每次启动写回 DB） |
| `osg_recruit_cycle` ⭐ | 4 | `Class of 2026` / `Class of 2026, Class of 2027` / `Class of 2027` / `Class of 2028` | DB 真字典（含 1 条脏值） |

后端 `OsgPositionServiceImpl` 的 `DICT_RECRUITMENT_CYCLE` 常量指向了**错误**的 `osg_recruitment_cycle`，导致编辑弹窗渲染 18 个无意义选项；而岗位表 `recruitment_cycle` 字段实际存的是 `osg_recruit_cycle` 的值（含历史 Excel 导入污染）。

正确模型：**字典只一个**（`osg_recruit_cycle`，原子单值），岗位表字段存**字典 value 的 CSV 多选**。

---

## 2. 修改清单（最小变更）

### 2.1 后端代码

**文件**：`@/Users/hw/workspace/OSGPrj/ruoyi-system/src/main/java/com/ruoyi/system/service/impl/OsgPositionServiceImpl.java`

- **改 1**：第 51 行常量  
  `"osg_recruitment_cycle"` → `"osg_recruit_cycle"`

- **改 2**：删除第 452–469 行 Java seed 里 18 条 `DICT_RECRUITMENT_CYCLE` 的 `DictSeed`

- **改 3**：删除第 504 行 `purgeObsoleteDictValues(DICT_RECRUITMENT_CYCLE, Set.of("2024","2025","2026","2027"));`

- **改 4**（评估）：第 535 行 `normalizeLegacyRecruitmentCycles()` 方法内部逻辑（第 556–569 行 `mapLegacyCycle` 把 `summer/fulltime/spring/offcycle` 拼成 `xxxx Summer/Full-time/Spring/Off-cycle`）已经**与新字典体系不兼容**，该方法整体删除或改为 no-op。

### 2.2 DB 清洗 SQL

```sql
-- (a) 删除字典里错误的 CSV 式合并值
DELETE FROM sys_dict_data
WHERE dict_type = 'osg_recruit_cycle'
  AND dict_value = 'Class of 2026, Class of 2027';

-- (b) 删除不再使用的旧字典 osg_recruitment_cycle 的全部 18 条
DELETE FROM sys_dict_data WHERE dict_type = 'osg_recruitment_cycle';
-- 若 sys_dict_type 中也有对应记录，一并删除
DELETE FROM sys_dict_type WHERE dict_type = 'osg_recruitment_cycle';

-- (c) 清洗岗位表里混入的非字典值，仅保留 Class of xxxx
-- 针对当前已知污染行：position_id=306
UPDATE osg_position
   SET recruitment_cycle = 'Class of 2028'
 WHERE position_id = 306
   AND recruitment_cycle = 'Class of 2028,2027 Full-time,2026 Full-time';

-- (d) 兜底扫描（人工审查）— 列出所有仍包含非字典值的岗位
SELECT position_id, company_name, position_name, recruitment_cycle
  FROM osg_position
 WHERE recruitment_cycle IS NOT NULL
   AND recruitment_cycle NOT REGEXP '^(Class of [0-9]{4})(,Class of [0-9]{4})*$';
-- 根据结果逐行人工确认后清洗
```

> **执行顺序**：(d) 先跑扫描 → 人工确认要修的行 → (a)(b)(c) 按需执行。

### 2.3 前端

无需改。`PositionFormModal` 的选项来自 `props.meta.recruitmentCycles`，后端字典源切换后自动就是 4 个值。

### 2.4 Excel 模板 / 批量导入

- 检查 `@/Users/hw/workspace/OSGPrj/deploy/mysql-init/12_osg_position_init.sql` 或相关 seed：若示例行用了 `2027 Full-time` 等，替换成 `Class of 2028`。
- 导入校验点（`OsgPositionServiceImpl` 的 import 路径）需加拒绝非字典值逻辑（本方案暂不做，记录为后续 TODO）。

---

## 3. 测试 / 验证

### 3.1 后端测试需调整

- `@/Users/hw/workspace/OSGPrj/ruoyi-system/src/test/java/com/ruoyi/system/service/impl/OsgPositionServiceImplTest.java:59` 断言 `recruitmentCycles[7] == '2026 Summer'` 必须改为新字典断言（如 `recruitmentCycles[0] == 'Class of 2026'`）。
- `@/Users/hw/workspace/OSGPrj/ruoyi-admin/src/test/java/com/ruoyi/web/controller/osg/OsgPositionControllerTest.java`（如有）的类似断言同步改。

### 3.2 手工验证

1. 后端重启后调 `GET /api/admin/position/meta` → `recruitmentCycles` 数组长度 = 3（删脏值后的 `osg_recruit_cycle`）。
2. 编辑 SIG 的 "Equity Analyst Internship" → 弹窗只显示 3 个 checkbox，且 `Class of 2028` 已勾。
3. 勾改为 `Class of 2027` + `Class of 2028`，保存 → DB `recruitment_cycle = 'Class of 2027,Class of 2028'`。
4. 列表该行"招聘周期"列 → 应显示 2 个 tag（顺带解 BUG-1：列表只显示第一个）。列表显示逻辑见下。

### 3.3 列表多值显示（BUG-1 收尾）

**文件**：`@/Users/hw/workspace/OSGPrj/osg-frontend/packages/admin/src/views/career/positions/index.vue:216`

```vue
<template v-else-if="column.dataIndex === 'recruitmentCycle'">
  <a-tag color="purple">{{ formatCycle(record.recruitmentCycle) }}</a-tag>
</template>
```

需要改为循环渲染多个 tag：

```vue
<template v-else-if="column.dataIndex === 'recruitmentCycle'">
  <a-tag
    v-for="cycle in splitCycles(record.recruitmentCycle)"
    :key="cycle"
    color="purple"
  >{{ formatCycle(cycle) }}</a-tag>
</template>
```

附 `splitCycles` 工具：`(v?: string) => (v || '').split(',').map(s => s.trim()).filter(Boolean)`。

> 注：本方案只列方向；具体代码改动在 `/fix` 阶段落地。

---

## 4. 回滚策略

- 后端代码修改用 Git 回滚。
- DB 清洗前先导出：
  ```bash
  mysqldump -h 47.94.213.128 -P23306 -uruoyi -p ry-vue \
    sys_dict_data sys_dict_type osg_position \
    > /tmp/osg_dict_backup_20260418.sql
  ```

---

## 5. 不做的事（显式声明）

- 不扩字典到 `Class of 2029/2030`（用户已确认暂缓）
- 不改前端 `PositionFormModal`（无需改）
- 不在本次修 `publishTime` / `deadlineText` 编辑弹窗缺字段的问题（另立 ticket）
- 不动 `student.recruitment_cycle`（学员端字段，虽同名但可能语义不同，需另查）

---

## 6. 待确认

- 学员表 `osg_student.recruitment_cycle` 是否也该用同一字典？先不动，后续单独评估。
- 批量导入是否启用字典白名单校验？记 TODO。
