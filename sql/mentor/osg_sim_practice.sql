-- =============================================
-- osg_sim_practice - 模拟应聘分配
-- Module: mentor
-- SRS: §5.4
-- =============================================

CREATE TABLE IF NOT EXISTS `osg_sim_practice` (
  `id`                bigint       NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `student_id`        bigint       NOT NULL                COMMENT '学员 ID',
  `mentor_id`         bigint       NOT NULL                COMMENT '导师 ID',
  `practice_type`     varchar(32)  NOT NULL                COMMENT '类型: mock_interview/relation_test/midterm',
  `assigned_time`     datetime     NOT NULL                COMMENT '分配时间',
  `status`            varchar(16)  NOT NULL DEFAULT 'new'  COMMENT '状态: new/pending/completed/cancelled',
  `total_hours`       decimal(4,1) DEFAULT NULL            COMMENT '已上课时',
  `feedback_level`    varchar(16)  DEFAULT NULL            COMMENT '反馈等级: excellent/good/average/poor',
  `feedback_note`     text         DEFAULT NULL            COMMENT '反馈详情',
  `create_by`         varchar(64)  DEFAULT ''              COMMENT '创建者',
  `create_time`       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by`         varchar(64)  DEFAULT ''              COMMENT '更新者',
  `update_time`       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag`          char(1)      DEFAULT '0'             COMMENT '删除标志 0=正常 2=删除',
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_mentor_id` (`mentor_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模拟应聘分配';
