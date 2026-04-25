# 合同管理需求：多币种 + 金额变更 + 变更日志

> 创建时间：2026-04-16
> 状态：待确认

---

## 1. 需求概述

### 1.1 合同金额多币种支持
- 合同金额支持 **美元（USD）** 和 **英镑（GBP）** 两种币种
- 合同总金额 = 美元金额 + 英镑金额（展示时分别显示）
- 新增/续签合同时，选择币种后录入对应金额

### 1.2 合同金额变更
- 合同管理列表页的金额支持变更（非只读）
- 变更需走编辑流程，记录变更原因

### 1.3 合同变更日志
- 每次合同关键字段变更，自动记录操作日志
- 日志内容：合同编号、变更字段、变更前值、变更后值、班主任、合同类型、金额、课时、有效期、操作人、操作时间

---

## 2. 影响面分析

### 受影响模块总览

| # | 模块 | 影响范围 | 工作量 |
|---|------|---------|--------|
| 1 | **数据库** | osg_contract 表加字段；新建 osg_contract_change_log 表 | 中 |
| 2 | **后端 Java** | OsgContract 实体；Controller/Service 增改接口；变更日志写入 | 中 |
| 3 | **前端-新增学员弹窗** | AddStudentModal.vue 合同区域：币种选择 + 分项金额 | 小 |
| 4 | **前端-合同管理列表** | index.vue + columns.ts：金额列拆分展示；加编辑按钮 | 中 |
| 5 | **前端-续签合同弹窗** | RenewContractModal.vue：同 #3 币种+分项金额 | 小 |
| 6 | **前端-合同详情弹窗** | ContractDetailModal.vue：展示分币种金额 | 小 |
| 7 | **前端-学生详情合同Tab** | ContractTab.vue：总金额展示改为分币种 | 小 |
| 8 | **前端-合同变更日志** | 新建 ContractChangeLogModal.vue | 中 |
| 9 | **前端-API层** | shared/api/admin/contract.ts：接口字段更新 + 新增变更接口 | 小 |
| 10 | **Dashboard** | 合同总金额统计卡片：需分币种或统一换算 | 待定 |

### 不受影响的模块
- **导师端（mentor）**：不直接展示合同金额
- **学生端（student）**：不直接展示合同金额明细
- **助教端（assistant）**：不直接涉及合同
- **班主任端（lead-mentor）**：目前不直接编辑合同

---

## 3. 数据库变更

### 3.1 osg_contract 表 — 加字段

```sql
-- 新增字段
ALTER TABLE osg_contract ADD COLUMN currency VARCHAR(10) DEFAULT 'USD' COMMENT '币种: USD/GBP';
ALTER TABLE osg_contract ADD COLUMN amount_usd DECIMAL(12,2) DEFAULT NULL COMMENT '美元金额';
ALTER TABLE osg_contract ADD COLUMN amount_gbp DECIMAL(12,2) DEFAULT NULL COMMENT '英镑金额';
-- contract_amount 保留作为总金额（向后兼容）
-- 存量数据迁移：UPDATE osg_contract SET currency='USD', amount_usd=contract_amount WHERE currency IS NULL;
```

### 3.2 osg_contract_change_log 表 — 新建

```sql
CREATE TABLE osg_contract_change_log (
    log_id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id    BIGINT       NOT NULL COMMENT '合同ID',
    contract_no    VARCHAR(50)  NOT NULL COMMENT '合同编号',
    field_name     VARCHAR(50)  NOT NULL COMMENT '变更字段名',
    field_label    VARCHAR(50)  NOT NULL COMMENT '变更字段中文名',
    old_value      VARCHAR(500) DEFAULT NULL COMMENT '变更前值',
    new_value      VARCHAR(500) DEFAULT NULL COMMENT '变更后值',
    lead_mentor_id BIGINT       DEFAULT NULL COMMENT '班主任ID',
    lead_mentor_name VARCHAR(100) DEFAULT NULL COMMENT '班主任姓名',
    contract_type  VARCHAR(20)  DEFAULT NULL COMMENT '合同类型',
    contract_amount DECIMAL(12,2) DEFAULT NULL COMMENT '变更后总金额',
    total_hours    INT          DEFAULT NULL COMMENT '变更后课时',
    start_date     DATE         DEFAULT NULL COMMENT '变更后开始日期',
    end_date       DATE         DEFAULT NULL COMMENT '变更后结束日期',
    operate_by     VARCHAR(100) NOT NULL COMMENT '操作人',
    operate_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    remark         VARCHAR(500) DEFAULT NULL COMMENT '备注/变更原因'
) COMMENT='合同变更日志';

CREATE INDEX idx_change_log_contract ON osg_contract_change_log(contract_id);
CREATE INDEX idx_change_log_time ON osg_contract_change_log(operate_time);
```

---

## 4. 后端变更

### 4.1 OsgContract.java — 加字段
- `currency` (String) — 币种
- `amountUsd` (BigDecimal) — 美元金额
- `amountGbp` (BigDecimal) — 英镑金额

### 4.2 OsgContractMapper.xml — 更新
- resultMap 加新字段映射
- selectContractColumns 加新列
- insertContract 加新字段
- 新增 `updateContract` SQL（用于金额变更）

### 4.3 OsgContractController.java — 新增接口
- `PUT /admin/contract/{contractId}` — 编辑合同（触发变更日志）
- `GET /admin/contract/{contractId}/changelog` — 查询变更日志

### 4.4 新增文件
- `OsgContractChangeLog.java` — 变更日志实体
- `OsgContractChangeLogMapper.java` + `.xml` — Mapper
- Service 层变更对比逻辑（diff old vs new → 写日志）

---

## 5. 前端变更

### 5.1 新增学员弹窗 — AddStudentModal.vue
**合同信息区域改造：**

```
币种选择:  ○ 美元(USD)  ○ 英镑(GBP)
─────────────────────────
选 USD 时:
  美元金额 *
  [________]
─────────────────────────
选 GBP 时:
  英镑金额 *     美元等值金额 *
  [________]     [________]
```

- 币种为 radio：USD / GBP（**无 BOTH 选项**）
- 选 USD：只显示美元金额输入框
- 选 GBP：显示英镑金额 + 美元等值金额两个输入框（填写人自行按当天汇率换算）
- **不显示总金额**（总金额汇总在 Dashboard 展示，新增学员弹窗不涉及）

### 5.2 合同管理列表页 — contracts/index.vue
- **金额列**：拆分显示 `$10,000 / £5,000`（分币种展示）
- **操作列**：新增「编辑」按钮（弹出编辑弹窗）
- **操作列**：新增「日志」按钮（弹出变更日志弹窗）

### 5.3 合同管理列表页 — columns.ts
- 金额列改为自定义渲染（分币种 tag 展示）
- 新增操作按钮

### 5.4 续签合同弹窗 — RenewContractModal.vue
- 同 5.1，加币种选择 + 分项金额

### 5.5 新建组件
- **ContractEditModal.vue** — 编辑合同弹窗（可改金额、课时、有效期，需填变更原因）
- **ContractChangeLogModal.vue** — 变更日志弹窗（表格展示历史变更记录）

### 5.6 学生详情合同Tab — ContractTab.vue
- 总金额展示改为分币种：`$10,000 / £5,000`
- 合同表格金额列同步更新

### 5.7 API 层 — shared/api/admin/contract.ts
- `ContractListItem` 接口加 `currency`、`amountUsd`、`amountGbp`
- 新增 `updateContract(contractId, payload)` 函数
- 新增 `getContractChangeLog(contractId)` 函数
- `RenewContractPayload` 加币种和分项金额

### 5.8 Dashboard（待定）
- 合同总金额统计卡片目前显示 ¥1.2M
- 改为分币种显示？还是统一按某一币种换算？ → **需确认**

---

## 6. 实施优先级建议

| Phase | 内容 | 预估 |
|-------|------|------|
| **P1** | 数据库加字段 + 建表 + 存量迁移 SQL | 0.5h |
| **P2** | 后端实体/Mapper/Service/Controller | 2h |
| **P3** | 前端-新增学员弹窗（币种+分项金额） | 1h |
| **P4** | 前端-续签弹窗（币种+分项金额） | 0.5h |
| **P5** | 前端-合同列表（金额展示+编辑入口） | 1.5h |
| **P6** | 前端-合同编辑弹窗 + 变更日志弹窗 | 2h |
| **P7** | 前端-学生详情合同Tab + 合同详情弹窗 | 0.5h |
| **P8** | Dashboard 金额统计适配 | 0.5h |

---

## 7. 已确认事项

| #   | 问题　　　　　　 | 结论　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| -----| ------------------| ------------------------------------------------------------------------------------------------------------------|
| 1   | Dashboard 总金额 | **本期不做**。Dashboard 本期需求不展示合同金额　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 2   | 汇率　　　　　　 | **程序不做汇率换算**。填写人自行按当天汇率换算后填入对应金额　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 3   | 历史合同迁移　　 | **不涉及**。项目在开发阶段，无存量数据　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 4   | 变更权限　　　　 | **通过权限管理系统控制**。新增菜单权限点（如 `admin:contract:edit`），由管理员在角色权限中按需分配，不硬编码角色 |

## 8. 学习时长 vs 课时 — 原型分析结果

### ✅ 已确认（2026-04-16）

**「学习时长」= 课时，单位是小时（h）**

- 合同有效期由 startDate ~ endDate 决定
- 「学习时长」字段对应 `total_hours`（课时），单位改为**小时**
- 原型中写「个月」是原型不严谨

### 前端修改（AddStudentModal.vue）
- 字段标签：「学习时长（月）」→ 「课时（小时）」
- placeholder：「如 12」→ 「如 40」
- 字段名 `totalMonths` → `totalHours`（或保持字段名，仅改 UI 展示和后端映射）
- 提交时写入 `total_hours`

---

## 9. 实施要点补充

### 权限点设计
在 `sys_menu` 中新增权限点，挂在合同管理菜单下：

| 权限标识 | 说明 |
|---------|------|
| `admin:contract:list` | 查看合同列表 |
| `admin:contract:edit` | 编辑合同（变更金额/课时/有效期） |
| `admin:contract:renew` | 续签合同 |
| `admin:contract:changelog` | 查看变更日志 |

后端 Controller 用 `@PreAuthorize` 注解控制，前端按钮用 `v-hasPermi` 指令控制显隐。
