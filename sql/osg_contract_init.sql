-- ============================================
-- OSG 学员合同表初始化 SQL
-- Ticket: T-069
-- 说明: 创建学员合同主表
-- 幂等: 使用 CREATE TABLE IF NOT EXISTS，可重复执行
-- ============================================

CREATE TABLE IF NOT EXISTS osg_contract (
  contract_id         BIGINT         NOT NULL AUTO_INCREMENT COMMENT '合同ID',
  contract_no         VARCHAR(64)    NOT NULL COMMENT '合同编号',
  student_id          BIGINT         NOT NULL COMMENT '学员ID',
  contract_type       VARCHAR(32)    NOT NULL DEFAULT 'initial' COMMENT '合同类型(initial首签 renew续签 supplement补充)',
  contract_amount     DECIMAL(10,2)  NOT NULL DEFAULT 0.00 COMMENT '合同金额',
  total_hours         INT            NOT NULL DEFAULT 0 COMMENT '合同总课时',
  start_date          DATE           NOT NULL COMMENT '合同开始日期',
  end_date            DATE           NOT NULL COMMENT '合同结束日期',
  renewal_reason      VARCHAR(255)   DEFAULT NULL COMMENT '续签原因',
  contract_status     VARCHAR(16)    NOT NULL DEFAULT 'active' COMMENT '合同状态(active生效 expired到期 cancelled作废)',
  attachment_path     VARCHAR(255)   DEFAULT NULL COMMENT '合同附件路径',
  create_by           VARCHAR(64)    DEFAULT '' COMMENT '创建者',
  create_time         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by           VARCHAR(64)    DEFAULT '' COMMENT '更新者',
  update_time         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  remark              VARCHAR(500)   DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (contract_id),
  UNIQUE KEY uk_osg_contract_no (contract_no),
  KEY idx_osg_contract_student (student_id),
  KEY idx_osg_contract_status (contract_status),
  KEY idx_osg_contract_dates (start_date, end_date),
  CONSTRAINT fk_osg_contract_student
    FOREIGN KEY (student_id) REFERENCES osg_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG学员合同表';
