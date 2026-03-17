-- ============================================
-- OSG 学员模块基础表初始化 SQL
-- Ticket: T-052
-- 说明: 创建学员主表与学员黑名单表
-- 幂等: 使用 CREATE TABLE IF NOT EXISTS，可重复执行
-- ============================================

CREATE TABLE IF NOT EXISTS osg_student (
  student_id         BIGINT        NOT NULL AUTO_INCREMENT COMMENT '学员ID',
  student_name       VARCHAR(100)  NOT NULL COMMENT '学员姓名/英文姓名',
  email              VARCHAR(128)  NOT NULL COMMENT '邮箱',
  gender             CHAR(1)       NOT NULL DEFAULT '0' COMMENT '性别(0未知 1男 2女)',
  school             VARCHAR(128)  DEFAULT NULL COMMENT '学校',
  major              VARCHAR(128)  DEFAULT NULL COMMENT '专业',
  graduation_year    INT           DEFAULT NULL COMMENT '毕业年份',
  major_direction    VARCHAR(64)   DEFAULT NULL COMMENT '主攻方向',
  sub_direction      VARCHAR(64)   DEFAULT NULL COMMENT '子方向',
  target_region      VARCHAR(128)  DEFAULT NULL COMMENT '求职地区',
  recruitment_cycle  VARCHAR(32)   DEFAULT NULL COMMENT '招聘周期/项目时间',
  lead_mentor_id     BIGINT        DEFAULT NULL COMMENT '班主任ID',
  assistant_id       BIGINT        DEFAULT NULL COMMENT '助教ID',
  account_status     CHAR(1)       NOT NULL DEFAULT '0' COMMENT '账号状态(0正常 1冻结 2已结束 3退费)',
  create_by          VARCHAR(64)   DEFAULT '' COMMENT '创建者',
  create_time        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by          VARCHAR(64)   DEFAULT '' COMMENT '更新者',
  update_time        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  remark             VARCHAR(500)  DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (student_id),
  UNIQUE KEY uk_osg_student_email (email),
  KEY idx_osg_student_status (account_status),
  KEY idx_osg_student_lead_mentor (lead_mentor_id),
  KEY idx_osg_student_assistant (assistant_id),
  KEY idx_osg_student_school (school),
  KEY idx_osg_student_major_direction (major_direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG学员主表';

CREATE TABLE IF NOT EXISTS osg_student_blacklist (
  blacklist_id        BIGINT        NOT NULL AUTO_INCREMENT COMMENT '黑名单ID',
  student_id          BIGINT        NOT NULL COMMENT '学员ID',
  blacklist_reason    VARCHAR(255)  NOT NULL COMMENT '加入黑名单原因',
  added_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  operator_id         BIGINT        DEFAULT NULL COMMENT '操作人ID',
  operator_name       VARCHAR(64)   DEFAULT NULL COMMENT '操作人名称',
  remark              VARCHAR(500)  DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (blacklist_id),
  UNIQUE KEY uk_osg_student_blacklist_student (student_id),
  KEY idx_osg_student_blacklist_operator (operator_id),
  CONSTRAINT fk_osg_student_blacklist_student
    FOREIGN KEY (student_id) REFERENCES osg_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG学员黑名单表';
