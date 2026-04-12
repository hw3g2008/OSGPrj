# Excel 正式数据导入 & 5位随机数ID生成器 实施计划

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** 清空数据库中所有 osg 业务测试数据，导入 Excel 正式数据（保留老系统原始ID），并改造后端代码使新增学员/导师时自动生成5位随机数ID且不与已有ID重复。

**Architecture:** 分两阶段：(1) Python 脚本直连远程MySQL清空+导入（✅ 已完成）；(2) Java 后端新增 ID 生成工具类 + 改造 Service/Mapper 层支持指定ID插入（✅ 已实施，编译通过）。

**Tech Stack:** Python3 + pymysql（数据导入脚本）、Java 21 + MyBatis（后端改造）

---

## Phase 1: 数据导入 ✅ 已完成

> 脚本: `scripts/import_excel_data.py`
> 执行时间: 2026-04-07
> 结果: 5张表各导入20条，AUTO_INCREMENT 已重置

```
osg_student: 20 rows (student_id: 13460~34072)
osg_staff: 20 rows (staff_id: 30146~34154)
osg_contract: 20 rows
osg_position: 20 rows
osg_class_record: 20 rows (record_id: 175338~272349)
```

> 附带 DB 变更: `ALTER TABLE osg_position MODIFY position_category VARCHAR(128) NOT NULL`
> ✅ 仓库 `sql/osg_position_init.sql` 已同步为 VARCHAR(128)。

---

## Phase 2: 后端代码改造（5位随机数ID）

### 1. 现状分析

| 项目 | 学员 (osg_student) | 导师 (osg_staff) |
|---|---|---|
| **主键** | student_id BIGINT AUTO_INCREMENT | staff_id BIGINT AUTO_INCREMENT |
| **MyBatis** | `useGeneratedKeys="true" keyProperty="studentId"` | `useGeneratedKeys="true" keyProperty="staffId"` |
| **Service** | `createStudentWithContract()` 不设 ID，靠 DB 自增 | `insertStaff()` 不设 ID，靠 DB 自增 |
| **老系统 ID 范围** | 5位数（13460~34072） | 5位数（30146~34154） |

### 2. 需求

- **FR-1**: 新增学员时，student_id 为 5 位随机数（10000~99999），不与已有 ID 重复
- **FR-2**: 新增导师时，staff_id 为 5 位随机数（10000~99999），不与已有 ID 重复
- **FR-3**: 兼容老系统已导入的 ID（不改变现有数据）
- **NFR-1**: 并发安全（极低概率冲突，DB 唯一键兜底）
- **NFR-2**: 最小改动原则（不破坏现有功能）

### 3. 改动清单（6 个文件）

| # | 文件 | 操作 | 改动说明 |
|---|---|---|---|
| 1 | `ruoyi-common/src/main/java/com/ruoyi/common/utils/OsgIdGenerator.java` | **新建** | 5位随机数生成器 |
| 2 | `ruoyi-system/.../mapper/system/OsgStudentMapper.xml` L96 | **修改** | insert 加 student_id 条件字段 |
| 3 | `ruoyi-system/.../mapper/system/OsgStaffMapper.xml` L92 | **修改** | insert 加 staff_id 条件字段 |
| 4 | `ruoyi-system/.../service/impl/OsgStudentServiceImpl.java` L170 | **修改** | insert 前生成随机 ID |
| 5 | `ruoyi-system/.../service/impl/OsgStaffServiceImpl.java` L62 | **修改** | insert 前生成随机 ID |
| 6 | `sql/osg_position_init.sql` | **修改** | position_category VARCHAR(32)→128 |

### 4. 具体代码

#### 文件1: OsgIdGenerator.java（新建）

```java
package com.ruoyi.common.utils;

import java.util.concurrent.ThreadLocalRandom;
import org.springframework.jdbc.core.JdbcTemplate;
import com.ruoyi.common.exception.ServiceException;

public class OsgIdGenerator
{
    private static final int MIN_ID = 10000;
    private static final int MAX_ID = 99999;
    private static final int MAX_RETRY = 100;

    /**
     * 生成5位随机数ID，确保在指定表中不重复
     * @param jdbc JdbcTemplate
     * @param table 表名 (如 "osg_student")
     * @param idColumn 主键列名 (如 "student_id")
     * @return 不重复的5位随机数ID
     */
    public static long generateUniqueId(JdbcTemplate jdbc, String table, String idColumn)
    {
        for (int i = 0; i < MAX_RETRY; i++)
        {
            long candidate = ThreadLocalRandom.current().nextInt(MIN_ID, MAX_ID + 1);
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM " + table + " WHERE " + idColumn + " = ?",
                Integer.class, candidate);
            if (count == null || count == 0)
            {
                return candidate;
            }
        }
        throw new ServiceException("无法生成不重复的5位随机数ID，已重试" + MAX_RETRY + "次");
    }
}
```

#### 文件2: OsgStudentMapper.xml

在 `insertStudent` 的 `<trim>` 内**最前面**加入：

```xml
<!-- 列名部分 -->
<if test="studentId != null">student_id,</if>
<!-- values 部分 -->
<if test="studentId != null">#{studentId},</if>
```

#### 文件3: OsgStaffMapper.xml

在 `insertStaff` 的 `<trim>` 内**最前面**加入：

```xml
<!-- 列名部分 -->
<if test="staffId != null">staff_id,</if>
<!-- values 部分 -->
<if test="staffId != null">#{staffId},</if>
```

#### 文件4: OsgStudentServiceImpl.java

`createStudentWithContract()` 方法中，第 170 行 `studentMapper.insertStudent(student)` **前**加入：

```java
student.setStudentId(OsgIdGenerator.generateUniqueId(jdbcTemplate, "osg_student", "student_id"));
```

> 注意：需要在类中注入 `JdbcTemplate`。

#### 文件5: OsgStaffServiceImpl.java

`insertStaff()` 方法中，第 62 行 `staffMapper.insertStaff(staff)` **前**加入：

```java
staff.setStaffId(OsgIdGenerator.generateUniqueId(jdbcTemplate, "osg_staff", "staff_id"));
```

> 注意：需要在类中注入 `JdbcTemplate`。

#### 文件6: sql/osg_position_init.sql ✅ 已同步

```sql
-- L10: position_category VARCHAR(32) → VARCHAR(128) ✅ 已修改
```

### 5. JdbcTemplate 注入

两个 ServiceImpl 类需要新增注入：

```java
@Autowired
private JdbcTemplate jdbcTemplate;
```

以及 import：

```java
import org.springframework.jdbc.core.JdbcTemplate;
import com.ruoyi.common.utils.OsgIdGenerator;
```

---

## Phase 3: 验证

### Task 1: 编译验证

```bash
# 最小编译（仅验证改动模块）
mvn compile -pl ruoyi-common,ruoyi-system -am -q
# 全量编译（验证 admin 层 Controller 等消费方无破坏）
mvn compile -q
```
Expected: BUILD SUCCESS（两条均通过）

> ✅ 实施结果: 2026-04-08 最小编译 + 全量编译均 BUILD SUCCESS (exit code 0)

### Task 2: 端到端验证

启动后端，通过 API 创建新学员/导师，确认：
1. 返回的 ID 是 5 位随机数（10000~99999）
2. 多次创建不重复
3. 不与老数据冲突

---

## 设计评审报告（brainstorming 校验框架适配）

> ✅ Phase 2 代码已落地（实施时间: 2026-04-08），编译验证通过。
> 待完成: 端到端验证（启动后端，通过 API 创建学员/导师确认 ID 格式）。

### Phase 2 领域专项校验

#### 正向校验（6/6 通过）

| # | 检查项 | 结果 | 说明 |
|---|---|---|---|
| 1 | 细节层级 | ✅ | 6个文件改动均有完整代码、行号、约束说明 |
| 2 | 最小路径 | ✅ | 覆盖了工具类→Mapper→Service→SQL全链路 |
| 3 | 影响分析 | ✅ | update/delete/select 不受影响；其他引用 student_id/staff_id 的表不受影响 |
| 4 | 错误处理 | ✅ | ID 生成失败→ServiceException；DB 唯一键冲突→MySQL报错；重试100次上限 |
| 5 | 标准合规 | ✅ | 使用 RuoYi 标准包结构、ServiceException、JdbcTemplate |
| 6 | 业务闭环 | ✅ | 创建学员→生成ID→写入DB→后续 update/delete 用该ID |

#### 反向校验（6/6 通过）

| # | 检查项 | 结果 | 说明 |
|---|---|---|---|
| 1 | 用户视角 | ✅ | Admin 创建新学员/导师能正常完成 |
| 2 | 测试视角 | ✅ | 测试点明确：新增返回5位数ID / 多次不重复 / 不与老数据冲突 |
| 3 | 场景覆盖 | ✅ | 正常/异常/边界/并发均已覆盖（见下方并发分析） |
| 4 | 代码必要 | ✅ | 6个文件无冗余改动 |
| 5 | 重复检查 | ✅ | 工具类抽取为公共方法，Student 和 Staff 复用 |
| 6 | 可复用性 | ✅ | OsgIdGenerator 可用于未来任何 osg 表的随机ID生成 |

#### 并发安全分析

**场景**: 两个请求同时查询 candidate=54321 都返回 count=0，然后都尝试 INSERT。

**结论**: DB 层面 student_id / staff_id 是 PRIMARY KEY，第二个 INSERT 会报 `Duplicate entry`，Spring 事务回滚。90000 个可选值中碰撞概率极低（当前仅 40 条数据，碰撞概率 < 0.05%）。即使碰撞，用户重试即可。**当前方案可接受**。

### Phase 3 增强全局终审

#### 轮次 1/3 (维度 B — 边界场景)

| 场景 | 结果 | 说明 |
|---|---|---|
| ID 空间耗尽（>90000条数据） | ✅ | MAX_RETRY=100次后抛 ServiceException |
| student_id/staff_id=NULL | ✅ | MyBatis `<if test="studentId != null">` 条件保护 |
| 老数据 ID 在 10000~99999 范围内 | ✅ | 生成时查库校验，不会冲突 |
| useGeneratedKeys 与手动 set ID 共存 | ✅ | 当 SQL 显式包含主键列时，MySQL 用提供的值，不生成新自增值 |

#### 轮次 2/3 (维度 H — 交叉影响)

| 影响点 | 结果 | 说明 |
|---|---|---|
| insertStudent() 其他调用点 | ✅ | 只有 createStudentWithContract() 关心新 ID |
| insertStaff() 其他调用点 | ✅ | 只有 insertStaff() 一个入口 |
| 合同号生成 generateContractNo() | ✅ | 在 ID 生成之后调用，能拿到正确 ID |
| sys_user 账号创建 | ✅ | 用 email 关联，不依赖 student_id/staff_id |
| 前端 | ✅ | 前端只接收返回的 ID，不关心 ID 格式 |

#### 轮次 3/3 (维度 C — 数据流)

| 数据流 | 结果 |
|---|---|
| 生成 ID → set 到实体 → MyBatis 写入 DB → 返回给 Controller | ✅ |
| 老数据 ID → 已在 DB → 新生成查到 count>0 → 重试下一个随机数 | ✅ |

**🎉 设计评审通过 + 编译验证通过（待端到端验证）**

---

## 风险与注意事项

1. **外键约束**：清空时必须禁用外键检查，否则删除顺序出错会报错（Phase 1 已处理）
2. **合同缺 student_id**：Excel 合同数据没有学员关联，导入时 student_id=0，需后续手动关联
3. **课程记录缺 mentor_id/student_id**：只有名字无ID，数字ID字段设为 0
4. **AUTO_INCREMENT 重置**：导入指定ID后已执行 ALTER TABLE 调整（Phase 1 已处理）
5. **⚠️ 生产数据安全**：`scripts/import_excel_data.py` 含明文数据库密码（L14-17），**当前已被 Git 跟踪且未加入 `.gitignore`**，需立即处理（从 Git 历史移除或替换为环境变量读取）
6. **并发碰撞**：极低概率，DB PRIMARY KEY 兜底，用户重试即可
7. **ID 空间上限**：90000个可选值，当前仅40条数据，长期（>50000条）需考虑升级方案
