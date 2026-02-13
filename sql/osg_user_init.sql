-- ============================================
-- OSG 超管账号初始化 SQL
-- Ticket: T-004
-- 说明: 清理若依默认用户，插入 OSG 超级管理员账号
-- ============================================

-- 1. 清理若依默认用户-角色关联数据
DELETE FROM sys_user_role;

-- 2. 清理若依默认用户数据（user_id >= 1）
DELETE FROM sys_user WHERE user_id >= 1;

-- 3. 插入 OSG 超级管理员账号
-- 密码: Osg@2025 (BCrypt 哈希)
-- 字段顺序: user_id, dept_id, user_name, nick_name, user_type, email, phonenumber, sex, avatar, password, status, del_flag, login_ip, login_date, pwd_update_date, create_by, create_time, update_by, update_time, remark
INSERT INTO sys_user VALUES(1, 100, 'admin', '超级管理员', '00', '', '', '0', '', '$2b$10$pZG8/keIEyfExXkkiXjywu4mnJTbAUtieL3DzZiTsaxinA7zw02Em', '0', '0', '', NULL, NULL, 'admin', sysdate(), '', NULL, 'OSG 平台超级管理员');

-- 4. 插入用户-角色关联（admin 用户 → super_admin 角色）
-- super_admin 角色 role_id = 1（见 osg_role_init.sql）
INSERT INTO sys_user_role VALUES(1, 1);
