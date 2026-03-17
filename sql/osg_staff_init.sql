-- ============================================
-- OSG 导师/班主任表初始化 SQL
-- Ticket: T-096
-- 说明: 创建导师主表与导师黑名单表
-- 幂等: 使用 CREATE TABLE IF NOT EXISTS，可重复执行
-- ============================================

CREATE TABLE IF NOT EXISTS osg_staff (
  staff_id            BIGINT         NOT NULL AUTO_INCREMENT COMMENT '导师ID',
  staff_name          VARCHAR(128)   NOT NULL COMMENT '英文名',
  email               VARCHAR(128)   NOT NULL COMMENT '邮箱',
  phone               VARCHAR(32)    DEFAULT NULL COMMENT '联系方式',
  staff_type          VARCHAR(32)    NOT NULL DEFAULT 'mentor' COMMENT '类型(lead_mentor班主任/mentor导师)',
  major_direction     VARCHAR(64)    DEFAULT NULL COMMENT '主攻方向',
  sub_direction       VARCHAR(255)   DEFAULT NULL COMMENT '子方向',
  region              VARCHAR(64)    DEFAULT NULL COMMENT '所属大区',
  city                VARCHAR(64)    DEFAULT NULL COMMENT '所属城市',
  hourly_rate         DECIMAL(10,2)  NOT NULL DEFAULT 0.00 COMMENT '课单价',
  account_status      VARCHAR(16)    NOT NULL DEFAULT 'active' COMMENT '账号状态(active正常/frozen冻结)',
  create_by           VARCHAR(64)    DEFAULT '' COMMENT '创建者',
  create_time         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by           VARCHAR(64)    DEFAULT '' COMMENT '更新者',
  update_time         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  remark              VARCHAR(500)   DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (staff_id),
  UNIQUE KEY uk_osg_staff_email (email),
  KEY idx_osg_staff_type (staff_type),
  KEY idx_osg_staff_status (account_status),
  KEY idx_osg_staff_direction (major_direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG导师/班主任表';

CREATE TABLE IF NOT EXISTS osg_staff_blacklist (
  blacklist_id        BIGINT         NOT NULL AUTO_INCREMENT COMMENT '黑名单记录ID',
  staff_id            BIGINT         NOT NULL COMMENT '导师ID',
  blacklist_reason    VARCHAR(255)   NOT NULL COMMENT '加入原因',
  operator_id         BIGINT         DEFAULT NULL COMMENT '操作人ID',
  added_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  PRIMARY KEY (blacklist_id),
  UNIQUE KEY uk_osg_staff_blacklist_staff (staff_id),
  KEY idx_osg_staff_blacklist_added (added_at),
  CONSTRAINT fk_osg_staff_blacklist_staff
    FOREIGN KEY (staff_id) REFERENCES osg_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG导师黑名单表';
