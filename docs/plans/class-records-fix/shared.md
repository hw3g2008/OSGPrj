# 课程记录修复 — 共享基础设施

> 本文档记录跨端共用的 DB 迁移和后端 API 改动。

---

## 1. 后端 toPayload 补 courseFee

**问题**：
- 列表 API (`toClassRecordPayload`) 返回 `courseFee`（时长 × 导师时薪）
- 详情 API (`toPayload`) **不返回** `courseFee`

**代码排查结论**：
- `resolveCourseFee()` (L690-698)：`hourlyRate × durationHours`，hourlyRate 来自 `osg_staff.hourly_rate`
- `toClassRecordPayload()` (L626-647) 接收 `Map<Long, BigDecimal> hourlyRates` 参数，通过 `loadHourlyRates()` 加载
- `toPayload()` (L596-624) **没有** hourlyRates 参数，也不调用 `loadHourlyRates()`
- `selectReportDetail()` (L317) 调用链：`requireRecord(recordId)` → `selectClassRecordByRecordId` → `toPayload(row, null)` → 无 courseFee

**修复**：
1. `selectReportDetail()` 中调用 `loadHourlyRates(List.of(row))` 获取导师时薪
2. `toPayload()` 增加 hourlyRates 参数，调用 `resolveCourseFee(row, hourlyRates)`
3. payload 中新增 `courseFee` 字段

**涉及文件**：
- `ruoyi-system/.../service/impl/OsgClassRecordServiceImpl.java` → `selectReportDetail()` + `toPayload()`
- `osg-frontend/packages/shared/src/api/admin/report.ts` → `ReportRow` 接口补 `courseFee`

---

## 2. 附件系统

### 2.1 数据库

新建附件表 `osg_class_record_attachment`：

| 字段 | 类型 | 说明 |
|------|------|------|
| attachment_id | bigint PK | 主键 |
| record_id | bigint NOT NULL | 关联 osg_class_record.record_id |
| file_name | varchar(255) | 原始文件名 |
| file_path | varchar(500) | 存储路径（`/common/upload` 返回的 fileName） |
| file_size | bigint | 文件大小(bytes) |
| file_type | varchar(50) | MIME 类型 |
| attachment_tag | varchar(50) | 附件标签：original_resume / updated_resume / other |
| create_time | datetime | 上传时间 |
| create_by | varchar(64) | 上传人 |

### 2.2 后端

1. **Entity**: `OsgClassRecordAttachment.java`
2. **Mapper**: `OsgClassRecordAttachmentMapper.java` + XML（insert / selectByRecordId / deleteById）
3. **文件存储**: 复用 `POST /common/upload`（`CommonController`），**不新建上传端点**
4. **附件关联流程**：
   - 前端先调 `/common/upload` 上传文件 → 拿到 `fileName`（路径）+ `originalFilename` + 文件大小
   - 前端提交课程记录时，附带 `attachments[]` 数组（含 fileName / filePath / fileSize / fileType / attachmentTag）
   - 后端在创建课程记录时，插入 class_record 后批量插入 attachment 记录
5. **查询**: `toPayload()` 中通过 `selectByRecordId` 附带 attachments 列表
6. **下载**: 复用 `GET /common/download/resource`

### 2.3 已确认项

- ✅ 复用若依 `POST /common/upload` + `GET /common/download/resource`，不需要建独立上传接口
- ✅ `CommonController.java` L74-95 返回 `{ url, fileName, newFileName, originalFilename }`

---

## 3. 公司名（student_position_id）

### 3.1 数据库

`osg_class_record` 新增列：

```sql
ALTER TABLE osg_class_record ADD student_position_id BIGINT NULL;
```

### 3.2 后端

1. **Entity**: `OsgClassRecord.java` 加 `studentPositionId` 字段 + getter/setter
2. **Mapper XML**: insert/select 语句加 `student_position_id`
3. **toClassRecordPayload / toPayload**：通过 `student_position_id` JOIN `osg_student_position` 查 `company_name`，返回 `coachingCompany` 字段

### 3.3 代码排查证据

- `osg_class_record` 表**无** `student_position_id` 列（Mapper XML 全量 26 列确认，见 L36-62）
- `OsgClassRecord.java` L12-40：29 个字段，无岗位相关字段
- `osg_student_position` 表有 `student_position_id`、`company_name`、`position_name`、`student_id`
- 导师端 `classRecord.ts` 接口定义有 `positionId?: number`，但实际提交未使用

**涉及文件**：
- SQL DDL
- `ruoyi-system/.../domain/OsgClassRecord.java`
- `ruoyi-system/.../resources/mapper/system/OsgClassRecordMapper.xml`
- `ruoyi-system/.../service/impl/OsgClassRecordServiceImpl.java`
- `osg-frontend/packages/shared/src/api/admin/report.ts` → `ReportRow` 补 `coachingCompany`

---

## 4. ReportRow 前端类型汇总

`osg-frontend/packages/shared/src/api/admin/report.ts` L25-50 需补字段：

| 字段 | 类型 | 来源 |
|------|------|------|
| courseFee | string | §1 toPayload 补算 |
| coachingCompany | string | §3 student_position JOIN |
| attachments | Array | §2 附件表 |
