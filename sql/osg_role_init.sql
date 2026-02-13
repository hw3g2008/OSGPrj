-- ============================================
-- OSG 角色初始化 SQL
-- Ticket: T-002
-- 说明: 清理若依默认角色，插入 OSG 9 个业务角色
-- ============================================

-- 1. 清理若依默认角色数据
DELETE FROM sys_user_role;
DELETE FROM sys_role;

-- 2. 插入 9 个业务角色
-- 字段顺序: role_id, role_name, role_key, role_sort, data_scope, menu_check_strictly, dept_check_strictly, status, del_flag, create_by, create_time, update_by, update_time, remark
insert into sys_role values(1, '超级管理员',         'super_admin',       1, 1, 1, 1, '0', '0', 'admin', sysdate(), '', null, '超级管理员，拥有所有权限');
insert into sys_role values(2, '文员',               'clerk',             2, 2, 1, 1, '0', '0', 'admin', sysdate(), '', null, '文员，负责学生和合同管理');
insert into sys_role values(3, '课时审核员',         'course_auditor',    3, 2, 1, 1, '0', '0', 'admin', sysdate(), '', null, '课时审核员，负责课程记录和课时结算');
insert into sys_role values(4, '会计',               'accountant',        4, 2, 1, 1, '0', '0', 'admin', sysdate(), '', null, '会计，负责课时结算和报销管理');
insert into sys_role values(5, '岗位管理员',         'position_admin',    5, 2, 1, 1, '0', '0', 'admin', sysdate(), '', null, '岗位管理员，负责岗位信息和求职总览');
insert into sys_role values(6, '文件管理员',         'file_admin',        6, 2, 1, 1, '0', '0', 'admin', sysdate(), '', null, '文件管理员，负责文件管理');
insert into sys_role values(7, '在线测试题库管理员', 'online_quiz_admin', 7, 2, 1, 1, '0', '0', 'admin', sysdate(), '', null, '在线测试题库管理员');
insert into sys_role values(8, '真人面试题库管理员', 'interview_admin',   8, 2, 1, 1, '0', '0', 'admin', sysdate(), '', null, '真人面试题库管理员');
insert into sys_role values(9, '报销审核员',         'expense_auditor',   9, 2, 1, 1, '0', '0', 'admin', sysdate(), '', null, '报销审核员，负责报销审批');
