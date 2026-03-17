SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS osg_interview_bank (
  bank_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  record_type VARCHAR(32) NOT NULL DEFAULT 'bank' COMMENT '记录类型(bank/application)',
  interview_bank_name VARCHAR(255) DEFAULT NULL COMMENT '题库名称',
  interview_stage VARCHAR(64) DEFAULT NULL COMMENT '面试阶段',
  interview_type VARCHAR(64) DEFAULT NULL COMMENT '题库类型',
  industry_name VARCHAR(128) DEFAULT NULL COMMENT '行业',
  question_count INT DEFAULT NULL COMMENT '题目数',
  status VARCHAR(32) DEFAULT 'enabled' COMMENT '状态(enabled/disabled)',
  application_code VARCHAR(64) DEFAULT NULL COMMENT '申请编号',
  student_name VARCHAR(128) DEFAULT NULL COMMENT '学员姓名',
  applied_position VARCHAR(255) DEFAULT NULL COMMENT '申请岗位',
  application_time DATETIME DEFAULT NULL COMMENT '申请时间',
  application_source VARCHAR(64) DEFAULT NULL COMMENT '申请来源',
  pending_flag CHAR(1) NOT NULL DEFAULT '0' COMMENT '待处理标记',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
  create_by VARCHAR(64) DEFAULT '' COMMENT '创建者',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by VARCHAR(64) DEFAULT '' COMMENT '更新者',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
  remark VARCHAR(500) DEFAULT NULL COMMENT '备注'
) COMMENT='真人面试题库与申请表';

CREATE INDEX idx_osg_interview_bank_record_type ON osg_interview_bank(record_type);
CREATE INDEX idx_osg_interview_bank_pending_flag ON osg_interview_bank(pending_flag);
CREATE INDEX idx_osg_interview_bank_stage_type ON osg_interview_bank(interview_stage, interview_type);
