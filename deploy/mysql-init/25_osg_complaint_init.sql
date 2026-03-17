SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS osg_complaint (
  complaint_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '投诉建议ID',
  student_name VARCHAR(64) NOT NULL COMMENT '学员姓名',
  complaint_type VARCHAR(32) NOT NULL COMMENT '类型 complaint/suggestion',
  complaint_title VARCHAR(128) NOT NULL COMMENT '标题',
  complaint_content TEXT NOT NULL COMMENT '内容',
  process_status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '处理状态 pending/processing/completed',
  submit_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  handle_time DATETIME DEFAULT NULL COMMENT '处理完成时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (complaint_id),
  KEY idx_osg_complaint_status (process_status),
  KEY idx_osg_complaint_type (complaint_type),
  KEY idx_osg_complaint_submit_time (submit_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投诉建议表';
