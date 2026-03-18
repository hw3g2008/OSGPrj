-- =============================================
-- osg_class_record - 课程记录（导师上报）
-- Module: mentor
-- SRS: §5.1
-- =============================================

CREATE TABLE IF NOT EXISTS `osg_class_record` (
  `id`                  bigint       NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `record_no`           varchar(32)  NOT NULL                COMMENT '记录编号 #RYYMMDD-NNN',
  `mentor_id`           bigint       NOT NULL                COMMENT '导师 ID',
  `student_id`          bigint       NOT NULL                COMMENT '学员 ID',
  `coaching_type`       varchar(32)  NOT NULL                COMMENT '辅导类型: job_coaching/mock_interview/networking/mock_midterm/basic',
  `content_type`        varchar(32)  NOT NULL                COMMENT '课程内容类型',
  `position_id`         bigint       DEFAULT NULL            COMMENT '关联岗位（岗位辅导时）',
  `class_date`          date         NOT NULL                COMMENT '上课日期',
  `duration_hours`      decimal(4,1) NOT NULL                COMMENT '时长（小时）',
  `hourly_rate`         decimal(10,2) NOT NULL               COMMENT '课单价',
  `total_fee`           decimal(10,2) NOT NULL               COMMENT '课时费 = 时长 × 课单价',
  `student_status`      varchar(16)  NOT NULL DEFAULT 'normal' COMMENT '学员状态: normal/no_show',
  `no_show_note`        text         DEFAULT NULL            COMMENT '旷课备注',
  `feedback`            text         DEFAULT NULL            COMMENT '课程反馈',
  `student_rating`      tinyint      DEFAULT NULL            COMMENT '学员表现评分 1-5',
  `review_status`       varchar(16)  NOT NULL DEFAULT 'pending' COMMENT '审核状态: pending/approved/rejected',
  `reject_reason`       text         DEFAULT NULL            COMMENT '驳回原因',
  `student_evaluation`  decimal(2,1) DEFAULT NULL            COMMENT '学员评价分',
  `create_by`           varchar(64)  DEFAULT ''              COMMENT '创建者',
  `create_time`         datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by`           varchar(64)  DEFAULT ''              COMMENT '更新者',
  `update_time`         datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag`            char(1)      DEFAULT '0'             COMMENT '删除标志 0=正常 2=删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_mentor_id` (`mentor_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_class_date` (`class_date`),
  KEY `idx_review_status` (`review_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程记录（导师上报）';
