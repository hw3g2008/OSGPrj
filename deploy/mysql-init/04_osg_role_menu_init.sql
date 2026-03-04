-- ============================================
-- OSG 角色-菜单关联初始化 SQL
-- Ticket: T-003
-- 说明: 按 PRD 04-rbac-matrix.md 第 4 节权限矩阵插入关联
-- ============================================
-- 菜单 ID 映射:
--   2010=首页, 2011=权限配置, 2012=后台用户管理, 2013=基础数据管理
--   2014=学生列表, 2015=合同管理, 2016=导师列表, 2017=导师排期管理
--   2018=岗位信息, 2019=学生自添岗位, 2020=学员求职总览, 2021=模拟应聘管理
--   2022=课程记录, 2023=人际关系沟通记录
--   2024=课时结算, 2025=报销管理
--   2026=文件, 2027=在线测试题库, 2028=真人面试题库, 2029=面试真题
--   2030=邮件, 2031=消息管理, 2032=投诉建议, 2033=操作日志
-- 角色 ID 映射:
--   1=super_admin, 2=clerk, 3=course_auditor, 4=accountant
--   5=position_admin, 6=file_admin, 7=online_quiz_admin
--   8=interview_admin, 9=expense_auditor
-- 分组目录 ID:
--   2001=权限管理, 2002=用户中心, 2003=求职中心, 2004=教学中心
--   2005=财务中心, 2006=资源中心, 2007=个人中心
-- ============================================

-- 1. 清理旧数据
DELETE FROM sys_role_menu;

-- ============================================
-- 2. super_admin (role_id=1) - 全部 24 个菜单 + 7 个目录
-- ============================================
-- 目录
insert into sys_role_menu values (1, 2001);
insert into sys_role_menu values (1, 2002);
insert into sys_role_menu values (1, 2003);
insert into sys_role_menu values (1, 2004);
insert into sys_role_menu values (1, 2005);
insert into sys_role_menu values (1, 2006);
insert into sys_role_menu values (1, 2007);
-- 菜单
insert into sys_role_menu values (1, 2010);
insert into sys_role_menu values (1, 2011);
insert into sys_role_menu values (1, 2012);
insert into sys_role_menu values (1, 2013);
insert into sys_role_menu values (1, 2014);
insert into sys_role_menu values (1, 2015);
insert into sys_role_menu values (1, 2016);
insert into sys_role_menu values (1, 2017);
insert into sys_role_menu values (1, 2018);
insert into sys_role_menu values (1, 2019);
insert into sys_role_menu values (1, 2020);
insert into sys_role_menu values (1, 2021);
insert into sys_role_menu values (1, 2022);
insert into sys_role_menu values (1, 2023);
insert into sys_role_menu values (1, 2024);
insert into sys_role_menu values (1, 2025);
insert into sys_role_menu values (1, 2026);
insert into sys_role_menu values (1, 2027);
insert into sys_role_menu values (1, 2028);
insert into sys_role_menu values (1, 2029);
insert into sys_role_menu values (1, 2030);
insert into sys_role_menu values (1, 2031);
insert into sys_role_menu values (1, 2032);
insert into sys_role_menu values (1, 2033);

-- ============================================
-- 3. clerk (role_id=2) - 12 个菜单
-- 首页+学生列表+合同管理+导师列表+导师排期管理+学员求职总览+模拟应聘管理+课程记录+人际关系沟通记录+邮件+消息管理+投诉建议
-- ============================================
-- 目录（clerk 需要的分组）
insert into sys_role_menu values (2, 2002);
insert into sys_role_menu values (2, 2003);
insert into sys_role_menu values (2, 2004);
insert into sys_role_menu values (2, 2007);
-- 菜单
insert into sys_role_menu values (2, 2010);
insert into sys_role_menu values (2, 2014);
insert into sys_role_menu values (2, 2015);
insert into sys_role_menu values (2, 2016);
insert into sys_role_menu values (2, 2017);
insert into sys_role_menu values (2, 2020);
insert into sys_role_menu values (2, 2021);
insert into sys_role_menu values (2, 2022);
insert into sys_role_menu values (2, 2023);
insert into sys_role_menu values (2, 2030);
insert into sys_role_menu values (2, 2031);
insert into sys_role_menu values (2, 2032);

-- ============================================
-- 4. course_auditor (role_id=3) - 首页+课程记录+课时结算
-- ============================================
insert into sys_role_menu values (3, 2004);
insert into sys_role_menu values (3, 2005);
insert into sys_role_menu values (3, 2010);
insert into sys_role_menu values (3, 2022);
insert into sys_role_menu values (3, 2024);

-- ============================================
-- 5. accountant (role_id=4) - 首页+课时结算+报销管理
-- ============================================
insert into sys_role_menu values (4, 2005);
insert into sys_role_menu values (4, 2010);
insert into sys_role_menu values (4, 2024);
insert into sys_role_menu values (4, 2025);

-- ============================================
-- 6. position_admin (role_id=5) - 首页+岗位信息+学员求职总览
-- ============================================
insert into sys_role_menu values (5, 2003);
insert into sys_role_menu values (5, 2010);
insert into sys_role_menu values (5, 2018);
insert into sys_role_menu values (5, 2020);

-- ============================================
-- 7. file_admin (role_id=6) - 首页+文件
-- ============================================
insert into sys_role_menu values (6, 2006);
insert into sys_role_menu values (6, 2010);
insert into sys_role_menu values (6, 2026);

-- ============================================
-- 8. online_quiz_admin (role_id=7) - 首页+在线测试题库
-- ============================================
insert into sys_role_menu values (7, 2006);
insert into sys_role_menu values (7, 2010);
insert into sys_role_menu values (7, 2027);

-- ============================================
-- 9. interview_admin (role_id=8) - 首页+真人面试题库+面试真题
-- ============================================
insert into sys_role_menu values (8, 2006);
insert into sys_role_menu values (8, 2010);
insert into sys_role_menu values (8, 2028);
insert into sys_role_menu values (8, 2029);

-- ============================================
-- 10. expense_auditor (role_id=9) - 首页+报销管理
-- ============================================
insert into sys_role_menu values (9, 2005);
insert into sys_role_menu values (9, 2010);
insert into sys_role_menu values (9, 2025);
