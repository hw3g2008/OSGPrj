SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS osg_finance_settlement (
    settlement_id BIGINT NOT NULL AUTO_INCREMENT,
    record_id BIGINT NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    due_amount DECIMAL(10,1) NOT NULL DEFAULT 0.0,
    paid_amount DECIMAL(10,1) NOT NULL DEFAULT 0.0,
    payment_date DATE NULL,
    bank_reference_no VARCHAR(64) NULL,
    payment_remark VARCHAR(255) NULL,
    create_by VARCHAR(64) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_by VARCHAR(64) NULL,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    remark VARCHAR(255) NULL,
    PRIMARY KEY (settlement_id),
    UNIQUE KEY uk_finance_settlement_record (record_id),
    KEY idx_finance_settlement_status (payment_status),
    KEY idx_finance_settlement_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
