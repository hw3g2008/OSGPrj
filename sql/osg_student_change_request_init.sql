-- ============================================
-- OSG 学员信息变更申请表初始化 SQL
-- Ticket: T-084
-- 说明: 创建学员信息变更申请表
-- 幂等: 使用 CREATE TABLE IF NOT EXISTS，可重复执行
-- ============================================

CREATE TABLE IF NOT EXISTS osg_student_change_request (
  request_id         BIGINT        NOT NULL AUTO_INCREMENT COMMENT '变更申请ID',
  student_id         BIGINT        NOT NULL COMMENT '学员ID',
  change_type        VARCHAR(64)   NOT NULL COMMENT '变更类型',
  field_key          VARCHAR(64)   NOT NULL COMMENT '变更字段key',
  field_label        VARCHAR(64)   DEFAULT NULL COMMENT '变更字段名称',
  before_value       VARCHAR(500)  DEFAULT NULL COMMENT '变更前',
  after_value        VARCHAR(500)  DEFAULT NULL COMMENT '变更后',
  status             VARCHAR(32)   NOT NULL DEFAULT 'pending' COMMENT '状态(pending/approved/rejected/auto_applied)',
  reviewer           VARCHAR(64)   DEFAULT NULL COMMENT '审核人',
  reviewed_at        DATETIME      DEFAULT NULL COMMENT '审核时间',
  requested_by       VARCHAR(64)   DEFAULT NULL COMMENT '申请人',
  create_by          VARCHAR(64)   DEFAULT '' COMMENT '创建者',
  create_time        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by          VARCHAR(64)   DEFAULT '' COMMENT '更新者',
  update_time        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  remark             VARCHAR(500)  DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (request_id),
  KEY idx_osg_student_change_request_student (student_id),
  KEY idx_osg_student_change_request_status (status),
  KEY idx_osg_student_change_request_type (change_type),
  CONSTRAINT fk_osg_student_change_request_student
    FOREIGN KEY (student_id) REFERENCES osg_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG学员信息变更申请表';
