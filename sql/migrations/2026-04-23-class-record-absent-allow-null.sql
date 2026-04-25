-- ============================================================
-- Migration: osg_class_record 支持 absent 记录的真空字段契约
-- Date:      2026-04-23
-- Ticket:    Absent 记录彻底修复 - 没有的字段不能存
--
-- 背景：absent(旷课) 记录没有实际发生课程，
--       course_type / duration_hours / feedback_content
--       等字段应允许 NULL，代表"事实上不存在"。
--
-- 变更：
--   1. course_type    NOT NULL  →  ALLOW NULL
--   2. duration_hours NOT NULL  →  ALLOW NULL
--   3. 清理历史 absent 脏数据（当前仅 #R274221 一条）
--
-- 注意：未上线环境，无需保留兼容性
-- ============================================================

-- 1. Schema: 允许 NULL
ALTER TABLE osg_class_record
    MODIFY COLUMN course_type VARCHAR(32) NULL COMMENT '课程类型(job_coaching/mock_practice/basic_course)，absent 记录为 NULL';

ALTER TABLE osg_class_record
    MODIFY COLUMN duration_hours DECIMAL(5,1) NULL COMMENT '课时(小时)，absent 记录为 NULL';

-- 2. 数据清理：历史 absent 记录的伪字段全部置 NULL
UPDATE osg_class_record
SET course_type       = NULL,
    duration_hours    = NULL,
    feedback_content  = NULL,
    topics            = NULL
WHERE class_status = 'absent';

-- 3. 核对
SELECT record_id, course_type, class_status, duration_hours, feedback_content, topics, LEFT(comments, 60) AS cm
FROM osg_class_record
WHERE class_status = 'absent';
