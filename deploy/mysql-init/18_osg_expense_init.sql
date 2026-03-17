SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS osg_expense (
    expense_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '报销ID',
    mentor_id BIGINT NOT NULL COMMENT '导师ID',
    mentor_name VARCHAR(64) NOT NULL COMMENT '导师姓名',
    expense_type VARCHAR(64) NOT NULL COMMENT '报销类型',
    expense_amount DECIMAL(10,2) NOT NULL COMMENT '报销金额',
    expense_date DATE NOT NULL COMMENT '报销日期',
    description VARCHAR(255) NOT NULL COMMENT '报销说明',
    attachment_url VARCHAR(512) NULL COMMENT '附件地址',
    status VARCHAR(32) NOT NULL DEFAULT 'processing' COMMENT '状态: processing/approved/denied',
    review_comment VARCHAR(255) NULL COMMENT '审核备注',
    reviewed_by VARCHAR(64) NULL COMMENT '审核人',
    reviewed_at DATETIME NULL COMMENT '审核时间',
    create_by VARCHAR(64) NULL COMMENT '创建人',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by VARCHAR(64) NULL COMMENT '更新人',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remark VARCHAR(255) NULL COMMENT '备注'
) COMMENT='导师报销表';

CREATE INDEX idx_osg_expense_status ON osg_expense(status);
CREATE INDEX idx_osg_expense_mentor_id ON osg_expense(mentor_id);
