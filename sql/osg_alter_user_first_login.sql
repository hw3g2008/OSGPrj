-- ============================================
-- OSG sys_user 表新增 first_login 字段
-- Ticket: T-005
-- 说明: 用于标记用户是否首次登录，首次登录需强制修改密码
-- ============================================

ALTER TABLE sys_user ADD COLUMN first_login char(1) DEFAULT '1' COMMENT '是否首次登录（1是 0否）';
