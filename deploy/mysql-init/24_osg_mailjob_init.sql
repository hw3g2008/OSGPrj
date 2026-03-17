SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS osg_mailjob (
  job_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '邮件任务ID',
  job_title VARCHAR(255) NOT NULL COMMENT '任务标题',
  recipient_group VARCHAR(64) NOT NULL COMMENT '收件人组',
  email_subject VARCHAR(255) NOT NULL COMMENT '邮件主题',
  email_content TEXT NOT NULL COMMENT '邮件内容',
  smtp_server_name VARCHAR(128) NOT NULL COMMENT 'SMTP服务器',
  total_count INT NOT NULL DEFAULT 0 COMMENT '总数',
  pending_count INT NOT NULL DEFAULT 0 COMMENT '待发送数',
  success_count INT NOT NULL DEFAULT 0 COMMENT '成功数',
  fail_count INT NOT NULL DEFAULT 0 COMMENT '失败数',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (job_id),
  KEY idx_osg_mailjob_create_time (create_time),
  KEY idx_osg_mailjob_smtp (smtp_server_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG邮件作业表';
