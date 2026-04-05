-- ============================================
-- OSG 导师个人信息变更申请表初始化 SQL
-- 说明: 保存导师资料变更申请，供后台文员处理
-- 幂等: 使用 CREATE TABLE IF NOT EXISTS，可重复执行
-- ============================================

CREATE TABLE IF NOT EXISTS osg_mentor_profile_change_request (
  request_id      BIGINT       NOT NULL AUTO_INCREMENT COMMENT '申请ID',
  user_id         BIGINT       NOT NULL COMMENT '导师用户ID',
  payload_json    LONGTEXT     NOT NULL COMMENT '原始提交内容',
  change_summary   VARCHAR(500) DEFAULT NULL COMMENT '变更摘要',
  status          VARCHAR(16)  NOT NULL DEFAULT 'pending' COMMENT '状态(pending/approved/rejected)',
  requested_by    VARCHAR(64)  DEFAULT NULL COMMENT '提交人',
  reviewer        VARCHAR(64)  DEFAULT NULL COMMENT '审核人',
  reviewed_at     DATETIME     DEFAULT NULL COMMENT '审核时间',
  create_by       VARCHAR(64)  DEFAULT '' COMMENT '创建者',
  create_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by       VARCHAR(64)  DEFAULT '' COMMENT '更新者',
  update_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  remark          VARCHAR(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (request_id),
  KEY idx_osg_mentor_profile_change_request_user_status (user_id, status),
  KEY idx_osg_mentor_profile_change_request_status (status),
  CONSTRAINT fk_osg_mentor_profile_change_request_user
    FOREIGN KEY (user_id) REFERENCES sys_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG导师个人信息变更申请表';
