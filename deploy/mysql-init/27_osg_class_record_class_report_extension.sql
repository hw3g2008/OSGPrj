SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS osg_alter_class_record_for_report;
DELIMITER $$
CREATE PROCEDURE osg_alter_class_record_for_report()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = 'osg_class_record' AND column_name = 'reference_type') THEN
    ALTER TABLE osg_class_record
      ADD COLUMN reference_type VARCHAR(32) DEFAULT NULL
        COMMENT '关联业务类型：application/mock_interview/relation_test/communication_test/null(基础课)' AFTER student_id,
      ADD COLUMN reference_id BIGINT DEFAULT NULL
        COMMENT '关联业务 ID（application_id 或 practice_id）' AFTER reference_type,
      ADD COLUMN base_course_category VARCHAR(32) DEFAULT NULL
        COMMENT '基础课二级类型：tech/behavior/new_resume/resume_update/case_study/other' AFTER course_type,
      ADD COLUMN base_course_topics VARCHAR(255) DEFAULT NULL
        COMMENT '基础课三级题目 dict_value 逗号分隔（T01,T03 / B0,B1）',
      ADD COLUMN absent_remark VARCHAR(512) DEFAULT NULL
        COMMENT '旷课备注（学员状态=absent 时填写）',
      ADD COLUMN screenshot_urls TEXT DEFAULT NULL
        COMMENT '人际关系反馈截图 URL JSON 数组（≤10 个 OSS path）',
      ADD COLUMN member_status VARCHAR(16) NOT NULL DEFAULT 'normal'
        COMMENT '学员状态：normal=正常上课 / absent=旷课未到场';
    CREATE INDEX idx_class_record_reference ON osg_class_record (reference_type, reference_id);
  END IF;
END$$
DELIMITER ;
CALL osg_alter_class_record_for_report();
DROP PROCEDURE IF EXISTS osg_alter_class_record_for_report;

ALTER TABLE osg_class_record MODIFY COLUMN feedback_content TEXT DEFAULT NULL COMMENT '反馈细节 JSON';
