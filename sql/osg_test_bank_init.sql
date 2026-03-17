CREATE TABLE IF NOT EXISTS osg_test_bank (
    bank_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    record_type VARCHAR(16) NOT NULL DEFAULT 'bank' COMMENT '记录类型: bank/application',
    test_bank_name VARCHAR(128) NULL COMMENT '题库名称',
    company_name VARCHAR(128) NULL COMMENT '公司名称',
    test_type VARCHAR(32) NULL COMMENT '测试类型: HireVue/Pymetrics/SHL',
    question_count INT NULL COMMENT '题目数',
    status VARCHAR(32) NULL COMMENT '状态: enabled/disabled',
    updated_at DATETIME NULL COMMENT '更新时间',
    application_code VARCHAR(32) NULL COMMENT '申请编号',
    student_name VARCHAR(64) NULL COMMENT '学员姓名',
    applied_position VARCHAR(255) NULL COMMENT '申请岗位',
    application_time DATETIME NULL COMMENT '申请时间',
    application_source VARCHAR(64) NULL COMMENT '申请来源',
    pending_flag CHAR(1) NOT NULL DEFAULT '0' COMMENT '待处理标记: 1=待处理',
    create_by VARCHAR(64) NULL COMMENT '创建人',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by VARCHAR(64) NULL COMMENT '更新人',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remark VARCHAR(255) NULL COMMENT '备注'
) COMMENT='在线测试题库与申请表';

CREATE INDEX idx_osg_test_bank_record_type ON osg_test_bank(record_type);
CREATE INDEX idx_osg_test_bank_company_name ON osg_test_bank(company_name);
CREATE INDEX idx_osg_test_bank_test_type ON osg_test_bank(test_type);
CREATE INDEX idx_osg_test_bank_pending_flag ON osg_test_bank(pending_flag);
