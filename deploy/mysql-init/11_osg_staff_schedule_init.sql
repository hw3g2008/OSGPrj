SET NAMES utf8mb4;

-- ============================================
-- OSG 导师排期表初始化 SQL
-- Ticket: T-105
-- 说明: 创建导师排期表，支撑按周/星期/时段的排期维护
-- 幂等: 使用 CREATE TABLE IF NOT EXISTS，可重复执行
-- ============================================

CREATE TABLE IF NOT EXISTS osg_staff_schedule (
  schedule_id         BIGINT         NOT NULL AUTO_INCREMENT COMMENT '排期记录ID',
  staff_id            BIGINT         NOT NULL COMMENT '导师ID',
  week_scope          VARCHAR(16)    NOT NULL DEFAULT 'current' COMMENT '周次(current本周/next下周)',
  weekday             TINYINT        NOT NULL COMMENT '星期(1周一~7周日)',
  time_slot           VARCHAR(16)    NOT NULL COMMENT '时段(morning上午/afternoon下午/evening晚上)',
  is_available        TINYINT(1)     NOT NULL DEFAULT 0 COMMENT '是否可用(0否 1是)',
  available_hours     DECIMAL(5,2)   NOT NULL DEFAULT 0.00 COMMENT '本周可用时长(小时)',
  adjust_reason       VARCHAR(500)   DEFAULT NULL COMMENT '调整原因',
  notify_staff        TINYINT(1)     NOT NULL DEFAULT 1 COMMENT '是否同步通知导师(0否 1是)',
  operator_id         BIGINT         DEFAULT NULL COMMENT '操作人ID',
  create_by           VARCHAR(64)    DEFAULT '' COMMENT '创建者',
  create_time         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by           VARCHAR(64)    DEFAULT '' COMMENT '更新者',
  update_time         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  remark              VARCHAR(500)   DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (schedule_id),
  UNIQUE KEY uk_osg_staff_schedule_slot (staff_id, week_scope, weekday, time_slot),
  KEY idx_osg_staff_schedule_week (week_scope),
  KEY idx_osg_staff_schedule_staff_week (staff_id, week_scope),
  KEY idx_osg_staff_schedule_available (is_available),
  CONSTRAINT fk_osg_staff_schedule_staff
    FOREIGN KEY (staff_id) REFERENCES osg_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG导师排期表';
