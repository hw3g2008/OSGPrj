-- ============================================================
-- Migration: osg_class_record 新增 practice_id / application_id
-- Date:      2026-04-27
-- Ticket:    五端辅导主链状态机收口（F5 前置）
--
-- 背景：审核回写 completed_hours / total_hours 需要知道课时记录
--       回指哪个真实岗位申请 / 哪个模拟应聘。当前 osg_class_record
--       只通过 student_id + class_date 模糊定位，无法精确累加。
--
-- 变更：
--   1. ADD COLUMN practice_id    BIGINT NULL（关联 osg_mock_practice.practice_id）
--   2. ADD COLUMN application_id BIGINT NULL（关联 osg_job_application.application_id）
--   3. CREATE INDEX 加速回写时按外键定位
--
-- 业务约束：A.0.2 后端 service 层强制 practice_id / application_id
--          二者必有且仅有一个非空（历史数据除外，两字段都 NULL）。
--
-- 回滚：DROP COLUMN practice_id, application_id；DROP INDEX
-- ============================================================

-- 1. Schema: 新增两个 nullable 关联字段
ALTER TABLE osg_class_record
    ADD COLUMN practice_id BIGINT NULL COMMENT '关联 osg_mock_practice.practice_id，模拟应聘课时回指';

ALTER TABLE osg_class_record
    ADD COLUMN application_id BIGINT NULL COMMENT '关联 osg_job_application.application_id，真实岗位辅导课时回指';

-- 2. 索引：回写时 UPDATE ... WHERE practice_id=? / application_id=? 的查询加速
CREATE INDEX idx_class_record_practice_id
    ON osg_class_record (practice_id);

CREATE INDEX idx_class_record_application_id
    ON osg_class_record (application_id);

-- 3. 核对：迁移后字段存在性
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'osg_class_record'
  AND COLUMN_NAME IN ('practice_id', 'application_id');
