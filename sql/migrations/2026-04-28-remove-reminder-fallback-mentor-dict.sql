-- ============================================================
-- Migration: 删除 osg_student_class_records 提醒 banner 的死字典种子
-- Date:      2026-04-28
-- Ticket:    课程记录 banner 重构 - 单数据源
--
-- 背景：
--   "新增课程记录" 提醒 banner 的导师名 / 待评记录数原本由后端
--   StudentCourseRecordServiceImpl#buildReminderBanner 计算后
--   通过 meta 接口下发；当 0 条新记录时，mentorName 会回退到字典
--   reminderFallbackMentor=Jerry Li，造成"导师 Jerry Li 为您填报了
--   0 条新的上课记录"的占位幽灵文案。
--
--   重构后：banner 的导师名 / 条数完全由前端基于 listStudentClassRecords
--   返回的 records 中 isNew=true 的条目自行计算（与表格同源），
--   meta 接口仅返回静态文案。reminderFallbackMentor 这条种子彻底无用。
--
-- 变更：
--   1. 删除 dict_data 中 dict_type='osg_student_class_records_page_copy'
--      且 dict_value='reminderFallbackMentor' 的种子记录（dict_sort=45,
--      dict_label='Jerry Li'）。
--   2. 不删除 dict_type 表本身，其它 page_copy 条目继续保留。
--
-- 注意：
--   - 后端 PAGE_COPY_SEEDS 中已同步移除该项；下次启动 syncReferenceData
--     时不会再被重新写入。
--   - 即使本迁移未执行（旧库还残留这条 dict），也不会再被前端读取，
--     仅是无引用的孤立字典数据；执行迁移可彻底清除。
-- ============================================================

DELETE FROM sys_dict_data
WHERE dict_type = 'osg_student_class_records_page_copy'
  AND dict_value = 'reminderFallbackMentor';

-- 校验：上面 DELETE 影响的行数应为 0 或 1（取决于环境是否已 seed）。
-- 如果某环境之前没初始化过 dict，则本次 DELETE 影响 0 行，无副作用。
