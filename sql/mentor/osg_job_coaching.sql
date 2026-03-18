-- =============================================
-- osg_job_coaching - 岗位辅导分配
-- Module: mentor
-- SRS: §5.3
-- =============================================

CREATE TABLE IF NOT EXISTS `osg_job_coaching` (
  `id`                bigint       NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `student_id`        bigint       NOT NULL                COMMENT '学员 ID',
  `mentor_id`         bigint       NOT NULL                COMMENT '导师 ID',
  `company`           varchar(128) NOT NULL                COMMENT '公司名',
  `position`          varchar(128) NOT NULL                COMMENT '岗位名',
  `location`          varchar(64)  DEFAULT NULL            COMMENT '地区',
  `interview_stage`   varchar(32)  DEFAULT NULL            COMMENT '面试阶段',
  `interview_time`    datetime     DEFAULT NULL            COMMENT '面试时间',
  `coaching_status`   varchar(16)  NOT NULL DEFAULT 'new'  COMMENT '辅导状态: new/coaching/completed/cancelled',
  `result`            varchar(16)  DEFAULT NULL            COMMENT '结果: offer/rejected/withdrawn',
  `create_by`         varchar(64)  DEFAULT ''              COMMENT '创建者',
  `create_time`       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by`         varchar(64)  DEFAULT ''              COMMENT '更新者',
  `update_time`       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag`          char(1)      DEFAULT '0'             COMMENT '删除标志 0=正常 2=删除',
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_mentor_id` (`mentor_id`),
  KEY `idx_coaching_status` (`coaching_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位辅导分配';
