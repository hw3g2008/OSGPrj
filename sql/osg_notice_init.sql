CREATE TABLE IF NOT EXISTS osg_notice (
  notice_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  receiver_type VARCHAR(32) NOT NULL COMMENT '接收人类型',
  receiver_label VARCHAR(128) NOT NULL COMMENT '接收人展示',
  notice_title VARCHAR(255) NOT NULL COMMENT '通知标题',
  notice_content TEXT NOT NULL COMMENT '通知内容',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (notice_id),
  KEY idx_osg_notice_receiver_type (receiver_type),
  KEY idx_osg_notice_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG通知表';
