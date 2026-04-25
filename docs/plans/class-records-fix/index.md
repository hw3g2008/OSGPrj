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
| [admin.md](./admin.md) | Admin 端：列表页 + 审核弹窗 + 详情弹窗 | ✅ 代码已修复（2026-04-22 审核确认） |
| [mentor.md](./mentor.md) | 导师端：上报弹窗 + 列表页 | ✅ 已完成排查（8 个问题） |
| [lead-mentor.md](./lead-mentor.md) | 班主任端：上报弹窗 + 列表页 | ✅ 已完成排查（4 个问题） |
| [assistant.md](./assistant.md) | 助教端：只读列表 + 详情面板 + 上报弹窗 | ✅ 已完成排查（6 个问题）+ ✅ Absent 契约落实 |
| [student.md](./student.md) | 学生端：查看 + 评价 | ✅ 已完成排查（4 个问题） |
| [2026-04-23-absent-contract-implementation.md](./2026-04-23-absent-contract-implementation.md) | Absent 契约彻底落实（DB + 后端 + 前端 + 测试）+ Assistant 测试基建清理 | ✅ 已实施（Phase 0–7 全绿） |

---

## 全局执行顺序

### Phase 1 — 各端独立修复（无外部依赖，可并行）

#### Admin 端 ✅ 全部已修复

| 批次 | 内容 | 状态 |
|------|------|------|
| A1 | 操作列互斥 + 驳回原因选项对齐 | ✅ 已修 |
| A2 | 审核弹窗内容补全 + bug fixes | ✅ 已修 |
| A3 | 详情弹窗内容补全 + bug fixes | ✅ 已修 |

#### Mentor 端

| 批次 | 内容 | 文档 |
|------|------|------|
| M1 | payload 字段精简（去冗余 + rate 语义修正） | mentor.md #3 |
| M2 | 人际关系反馈补全（5 项评分 + 推荐，参考 lead-mentor 实现） | mentor.md #4 |
| M3 | 列表页辅导类型筛选补全（2→5 项） | mentor.md #7 |

#### Lead-Mentor 端

| 批次 | 内容 | 文档 |
|------|------|------|
| L1 | 清理旧壳组件 `LeadMentorClassReportModal.vue` | lead-mentor.md #4 |

#### Assistant 端 ✅ 全部已修复

| 批次 | 内容 | 状态 |
|------|------|------|
| T1 | 详情面板补课程反馈全文（显示 feedbackContent） | ✅ 已修 |
| T2 | 课程类型映射补全（3→5 种） | ✅ 已修 |

#### Student 端

| 批次 | 内容 | 文档 |
|------|------|------|
| ST1 | 详情弹窗补导师课程反馈（feedbackContent） | student.md #1 |
| ST2 | 确认课程类型 tag 是否需前端映射（检查后端 meta API） | student.md #4 |

### Phase 2 — 共享基础设施（后端 + DB，顺序执行）

| 批次 | 内容 | 文档 |
|------|------|------|
| S1 | 后端 toPayload 补 courseFee（加载时薪 + 计算） | shared.md §1 |
| S2 | 附件系统：DB 建表 + Entity + Mapper + 关联流程 | shared.md §2 |
| S3 | 公司名：DB 加列 + Entity/Mapper + 后端 JOIN | shared.md §3 |
| S4 | Lead-Mentor 列表 API：后端 `GET /api/lead-mentor/class-records` | lead-mentor.md #3 |
| S5 | 前端 ReportRow 类型补字段（courseFee / coachingCompany / attachments） | shared.md §4 |

### Phase 3 — 各端适配（依赖 Phase 2）

#### 提交端适配（依赖 S2 + S3）

| 批次 | 内容 | 文档 |
|------|------|------|
| M4 | 导师端：附件假上传→真上传 | mentor.md #1 |
| M5 | 导师端：岗位硬编码→动态下拉 | mentor.md #2 |
| M6 | 导师端：列表公司名展示 | mentor.md #8 |
| L2 | 班主任端：附件空壳→真上传 | lead-mentor.md #2 |
| L3 | 班主任端：岗位硬编码→动态下拉 | lead-mentor.md #1 |
| L4 | 班主任端：列表页硬编码→真实 API | lead-mentor.md #3（依赖 S4） |

#### 查看端适配（依赖 S2 + S3）

| 批次 | 内容 | 文档 |
|------|------|------|
| T3 | 助教端：辅导内容公司名展示 | assistant.md #3 |
| T4 | 助教端：详情面板附件展示（只读下载） | assistant.md #5 |
| ST3 | 学生端：详情弹窗公司名展示 | student.md #2 |
| ST4 | 学生端：详情弹窗附件展示（只读下载） | student.md #3 |
| A4 | Admin 端：审核/详情弹窗附件展示 | ✅ 前端已就绪（等 S2） |
| A5 | Admin 端：列表 + 弹窗公司名展示 | ✅ 前端已就绪（等 S3） |

### Phase 4 — Absent 契约彻底落实 + 测试基建清理（2026-04-23 实施完毕）

已合并为独立实施记录：[2026-04-23-absent-contract-implementation.md](./2026-04-23-absent-contract-implementation.md)

| 批次 | 内容 | 状态 |
|------|------|------|
| P0 | DB schema 放开 NULL + 历史 absent 行清洗 | ✅ 已落阿里云 |
| P1 | 后端 validate + normalize + toCoachingTypeLabel null 安全 | ✅ 已修 |
| P2 | Assistant 弹窗 payload 契约 + 学习时长字段隐藏 | ✅ 已修 |
| P3 | Assistant 列表 + 详情 Modal UI 兼容 absent 空值 + 旷课备注行 | ✅ 已修 |
| P4 | 单元测试（class-records / flow-modal / payload）更新 | ✅ 42/42 PASS |
| P5 | E2E 脚本 absent case 按新契约改造 | ✅ 17/17 PASS |
| P6 | SQL migration 落盘阿里云 | ✅ 已执行 |
| P7 | 构建 + 重启 + 全量回归 | ✅ 91/91 PASS |
| 附加 | Assistant 测试基建清理（localStorage polyfill + sidebar 6→4 + 排除 Playwright E2E） | ✅ 已修 |

### 待产品确认（阻塞项）

| 项 | 内容 | 文档 |
|---|------|------|
| ~~❓~~ → ✅ | 助教端"上报课程记录"功能已落地（含 absent 契约） | 2026-04-23-absent-contract-implementation.md |
| ✅ | Student 端已排查，4 个问题已记录 | student.md |

---

## 进度追踪

- [ ] Phase 1：各端独立修复（Admin A1-A3 / Mentor M1-M3 / LM L1 / Asst T1-T2 / Student ST1-ST2）
- [ ] Phase 2：共享基础设施（S1-S5）
- [ ] Phase 3：各端适配（提交端 M4-M6/L2-L4 + 查看端 T3-T4/ST3-ST4/A4-A5）
- [x] Phase 4：Absent 契约 + 测试基建清理（见 2026-04-23 实施文档）
- [ ] 待确认项闭环
