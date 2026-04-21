# 课程记录修复 — 总索引

> 日期: 2026-04-21
> 原型: admin.html / mentor.html / lead-mentor.html / assistant.html
> PRD: 11-admin-class-records.md + 05-admin-reports.md

## 背景

课程记录功能涉及多端协作：导师/班主任/助教提交记录 → Admin 审核/查看。
当前实现与原型存在多处差异，按端拆分记录问题和修复方案。

---

## 文档结构

| 文档 | 说明 | 状态 |
|------|------|------|
| [shared.md](./shared.md) | 共享基础设施：DB 迁移 + 后端 Entity/Mapper/Service | 📝 已排查 |
| [admin.md](./admin.md) | Admin 端：列表页 + 审核弹窗 + 详情弹窗 | ✅ 已完成排查 |
| [mentor.md](./mentor.md) | 导师端：课程记录提交 | 📝 已发现部分问题 |
| [lead-mentor.md](./lead-mentor.md) | 班主任端：课程记录提交 | ⏳ 待排查 |
| [assistant.md](./assistant.md) | 助教端：课程记录提交 | ⏳ 待排查 |

---

## 全局执行顺序

### Phase 1 — Admin 端独立修复（无外部依赖）

| 批次 | 内容 | 文档 |
|------|------|------|
| A1 | 操作列互斥 + 驳回原因选项对齐 | admin.md §2.1 |
| A2 | 审核弹窗内容补全（8个字段 + 课程反馈 + courseSource/courseType bug） | admin.md §2.2 |
| A3 | 详情弹窗内容补全 + rate/courseFee bug + courseSource/courseType bug | admin.md §2.3 |

> A2/A3 中课时费字段依赖 shared.md §1（后端 toPayload 补 courseFee），需先完成或同步进行。

### Phase 2 — 共享基础设施

| 批次 | 内容 | 文档 |
|------|------|------|
| S1 | 附件系统：DB 建表 + Entity + Mapper | shared.md §2 |
| S2 | 公司名：DB 加列 + Entity/Mapper + 后端 JOIN | shared.md §3 |

### Phase 3 — 各端适配

| 批次 | 内容 | 文档 |
|------|------|------|
| M1 | 导师端：修复假上传 + 岗位下拉动态化 | mentor.md |
| L1 | 班主任端：同导师端逻辑 | lead-mentor.md |
| T1 | 助教端：同导师端逻辑（附件非必填） | assistant.md |

### Phase 4 — Admin 端补全（依赖 Phase 2-3）

| 批次 | 内容 | 文档 |
|------|------|------|
| A5 | Admin 附件展示（审核弹窗 + 详情弹窗） | admin.md §2.5 |
| A6 | Admin 公司名展示 | admin.md §2.6 |

---

## 进度追踪

- [ ] Phase 1：Admin 端独立修复
- [ ] Phase 2：共享基础设施
- [ ] Phase 3：各端适配
- [ ] Phase 4：Admin 端补全
