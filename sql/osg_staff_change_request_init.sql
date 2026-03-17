-- ============================================
-- OSG 导师信息变更申请表初始化 SQL
-- 说明: 创建导师信息变更申请表，支持 admin 侧待审核横幅的真实数据来源
-- 幂等: 使用 CREATE TABLE IF NOT EXISTS，可重复执行
-- ============================================

CREATE TABLE IF NOT EXISTS osg_staff_change_request (
  request_id          BIGINT         NOT NULL AUTO_INCREMENT COMMENT '申请ID',
  staff_id            BIGINT         NOT NULL COMMENT '导师ID',
  field_key           VARCHAR(64)    NOT NULL COMMENT '变更字段key',
  field_label         VARCHAR(128)   NOT NULL COMMENT '变更字段名称',
  before_value        VARCHAR(500)   DEFAULT NULL COMMENT '变更前值',
  after_value         VARCHAR(500)   DEFAULT NULL COMMENT '变更后值',
  status              VARCHAR(16)    NOT NULL DEFAULT 'pending' COMMENT '状态(pending/approved/rejected)',
  requested_by        VARCHAR(64)    DEFAULT NULL COMMENT '提交人',
  reviewer            VARCHAR(64)    DEFAULT NULL COMMENT '审核人',
  reviewed_at         DATETIME       DEFAULT NULL COMMENT '审核时间',
  create_by           VARCHAR(64)    DEFAULT '' COMMENT '创建者',
  create_time         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by           VARCHAR(64)    DEFAULT '' COMMENT '更新者',
  update_time         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  remark              VARCHAR(500)   DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (request_id),
  KEY idx_osg_staff_change_request_staff_status (staff_id, status),
  KEY idx_osg_staff_change_request_status (status),
  CONSTRAINT fk_osg_staff_change_request_staff
    FOREIGN KEY (staff_id) REFERENCES osg_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG导师信息变更申请表';
