-- ============================================
-- OSG sys_user 表新增 first_login 字段
-- Ticket: T-001
-- 说明: 用于标记用户是否首次登录，首次登录需强制修改密码
-- 幂等: 使用存储过程 + IF NOT EXISTS 检查，可重复执行
-- ============================================

DELIMITER //
CREATE PROCEDURE IF NOT EXISTS osg_add_first_login()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'sys_user'
        AND column_name = 'first_login'
    ) THEN
        ALTER TABLE sys_user ADD COLUMN first_login char(1) DEFAULT '1' COMMENT '是否首次登录（1是 0否）';
    END IF;
END //
DELIMITER ;

CALL osg_add_first_login();
DROP PROCEDURE IF EXISTS osg_add_first_login;
