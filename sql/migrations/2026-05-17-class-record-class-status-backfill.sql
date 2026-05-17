-- 2026-05-17-class-record-class-status-backfill.sql
--
-- 背景：
--   ClassReportPayload（5 端通用上报 DTO）不收集 classStatus，
--   过去 createXxxClassRecord 透传 record 直接 insert，
--   导致 osg_class_record.class_status 长期为 NULL。
--   list / detail 接口 toCourseContentLabel(null) 固定回退 "其他"，
--   lead-mentor / admin / mentor / assistant 列表「课程内容」列与筛选项均失真。
--
-- 配套：
--   OsgClassRecordServiceImpl.deriveClassStatus 已加入 normalizeCreateDefaults，
--   新增记录会按相同规则派生 class_status；本脚本回填历史行。
--
-- 安全性：
--   - 仅 UPDATE class_status IS NULL OR class_status = '' 的行
--   - 不动 absent / 已有明确值的记录
--   - 限定 del_flag = '0'（活跃数据）
--   - 派生失败（未知 course_type）的行保持 NULL，由前端兜底"其他"

UPDATE osg_class_record
SET class_status = CASE
    WHEN course_type = 'mock_interview' THEN 'mock_interview'
    WHEN course_type = 'relation_test' THEN 'networking_midterm'
    WHEN course_type = 'communication_test' THEN 'mock_midterm'
    WHEN course_type = 'job_coaching' THEN 'other'
    WHEN course_type = 'base_course' AND base_course_category = 'tech' THEN 'technical'
    WHEN course_type = 'base_course' AND base_course_category = 'behavior' THEN 'behavioral'
    WHEN course_type = 'base_course' AND base_course_category = 'new_resume' THEN 'resume_revision'
    WHEN course_type = 'base_course' AND base_course_category = 'resume_update' THEN 'resume_update'
    WHEN course_type = 'base_course' AND base_course_category = 'case_study' THEN 'case_prep'
    WHEN course_type = 'base_course' AND (base_course_category = 'other' OR base_course_category IS NULL OR base_course_category = '') THEN 'other'
    ELSE class_status
END
WHERE (class_status IS NULL OR class_status = '')
  AND del_flag = '0'
  AND course_type IS NOT NULL
  AND course_type <> '';
