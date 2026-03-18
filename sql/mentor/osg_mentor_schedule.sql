-- =============================================
-- osg_mentor_schedule - 导师排期（按周）
-- Module: mentor
-- SRS: §5.2
-- =============================================

CREATE TABLE IF NOT EXISTS `osg_mentor_schedule` (
  `id`                bigint       NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `mentor_id`         bigint       NOT NULL                COMMENT '导师 ID',
  `week_start_date`   date         NOT NULL                COMMENT '周一日期',
  `total_hours`       decimal(4,1) NOT NULL DEFAULT 0      COMMENT '本周可用总时长',
  `monday`            varchar(16)  NOT NULL DEFAULT 'unavailable' COMMENT 'unavailable/morning/afternoon/evening/all_day',
  `tuesday`           varchar(16)  NOT NULL DEFAULT 'unavailable' COMMENT '同上',
  `wednesday`         varchar(16)  NOT NULL DEFAULT 'unavailable' COMMENT '同上',
  `thursday`          varchar(16)  NOT NULL DEFAULT 'unavailable' COMMENT '同上',
  `friday`            varchar(16)  NOT NULL DEFAULT 'unavailable' COMMENT '同上',
  `saturday`          varchar(16)  NOT NULL DEFAULT 'unavailable' COMMENT '同上',
  `sunday`            varchar(16)  NOT NULL DEFAULT 'unavailable' COMMENT '同上',
  `create_by`         varchar(64)  DEFAULT ''              COMMENT '创建者',
  `create_time`       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by`         varchar(64)  DEFAULT ''              COMMENT '更新者',
  `update_time`       datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag`          char(1)      DEFAULT '0'             COMMENT '删除标志 0=正常 2=删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mentor_week` (`mentor_id`, `week_start_date`),
  KEY `idx_mentor_id` (`mentor_id`),
  KEY `idx_week_start` (`week_start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导师排期（按周）';
