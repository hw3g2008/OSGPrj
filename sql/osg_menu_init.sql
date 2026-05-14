-- ============================================
-- OSG 菜单初始化 SQL
-- Ticket: T-001
-- 说明: 清理若依默认菜单，插入 OSG 业务菜单
-- ============================================

-- 1. 清理若依默认菜单数据
DELETE FROM sys_role_menu;
DELETE FROM sys_menu;

-- 2. 插入分组目录（menu_type='M'，parent_id=0）
-- menu_id: 2001-2007
insert into sys_menu values(2001, '权限管理', 'permission_management', 0, 1, 'permission',    null, '', '', 1, 0, 'M', '0', '0', '', 'peoples',    'admin', sysdate(), '', null, '权限管理目录');
insert into sys_menu values(2002, '用户中心', 'user_center', 0, 2, 'user-center',   null, '', '', 1, 0, 'M', '0', '0', '', 'user',       'admin', sysdate(), '', null, '用户中心目录');
insert into sys_menu values(2003, '求职中心', 'job_search_center', 0, 3, 'job-center',    null, '', '', 1, 0, 'M', '0', '0', '', 'job',        'admin', sysdate(), '', null, '求职中心目录');
insert into sys_menu values(2004, '教学中心', 'teaching_center', 0, 4, 'teach-center',  null, '', '', 1, 0, 'M', '0', '0', '', 'education',  'admin', sysdate(), '', null, '教学中心目录');
insert into sys_menu values(2005, '财务中心', 'financial_center', 0, 5, 'finance-center',null, '', '', 1, 0, 'M', '0', '0', '', 'money',      'admin', sysdate(), '', null, '财务中心目录');
insert into sys_menu values(2006, '资源中心', 'resource_center', 0, 6, 'resource-center',null,'', '', 1, 0, 'M', '0', '0', '', 'documentation','admin', sysdate(), '', null, '资源中心目录');
insert into sys_menu values(2007, '个人中心', 'personal_center', 0, 7, 'personal',      null, '', '', 1, 0, 'M', '0', '0', '', 'message',    'admin', sysdate(), '', null, '个人中心目录');

-- 3. 插入首页菜单（不属于任何分组，parent_id=0）
insert into sys_menu values(2010, '首页', 'home_page', 0, 0, 'home', 'admin/home/index', '', '', 1, 0, 'C', '0', '0', 'admin:home:list', 'dashboard', 'admin', sysdate(), '', null, '首页');

-- 4. 插入权限管理菜单（parent_id=2001）
insert into sys_menu values(2011, '权限配置', 'permission_configuration',     2001, 1, 'roles',    'admin/permission/roles/index',    '', '', 1, 0, 'C', '0', '0', 'admin:roles:list',    '#', 'admin', sysdate(), '', null, '权限配置菜单');
insert into sys_menu values(2012, '后台用户管理', 'backend_user_management', 2001, 2, 'admins',   'admin/permission/admins/index',   '', '', 1, 0, 'C', '0', '0', 'admin:admins:list',   '#', 'admin', sysdate(), '', null, '后台用户管理菜单');
insert into sys_menu values(2013, '字典管理', 'dictionary_management', 2001, 3, 'dicts','admin/permission/dicts/index', '', '', 1, 0, 'C', '0', '0', 'system:dict:list','#', 'admin', sysdate(), '', null, '字典管理菜单');

-- 5. 插入用户中心菜单（parent_id=2002）
insert into sys_menu values(2014, '学生列表', 'student_list',     2002, 1, 'students',        'admin/userCenter/students/index',       '', '', 1, 0, 'C', '0', '0', 'admin:students:list',        '#', 'admin', sysdate(), '', null, '学生列表菜单');
insert into sys_menu values(2015, '合同管理', 'contract_management',     2002, 2, 'contracts',       'admin/userCenter/contracts/index',      '', '', 1, 0, 'C', '0', '0', 'admin:contracts:list',       '#', 'admin', sysdate(), '', null, '合同管理菜单');
insert into sys_menu values(2016, '导师列表', 'mentor_list',     2002, 3, 'staff',           'admin/userCenter/staff/index',          '', '', 1, 0, 'C', '0', '0', 'admin:staff:list',           '#', 'admin', sysdate(), '', null, '导师列表菜单');
insert into sys_menu values(2017, '导师排期管理', 'tutor_schedule_management', 2002, 4, 'mentor-schedule', 'admin/userCenter/mentorSchedule/index', '', '', 1, 0, 'C', '0', '0', 'admin:mentor-schedule:list', '#', 'admin', sysdate(), '', null, '导师排期管理菜单');

-- 6. 插入求职中心菜单（parent_id=2003）
insert into sys_menu values(2018, '岗位信息', 'position_information',     2003, 1, 'positions',         'admin/jobCenter/positions/index',        '', '', 1, 0, 'C', '0', '0', 'admin:positions:list',         '#', 'admin', sysdate(), '', null, '岗位信息菜单');
insert into sys_menu values(2019, '学生自添岗位', 'posts_created_by_students', 2003, 2, 'student-positions', 'admin/jobCenter/studentPositions/index', '', '', 1, 0, 'C', '0', '0', 'admin:student-positions:list', '#', 'admin', sysdate(), '', null, '学生自添岗位菜单');
insert into sys_menu values(2020, '学员求职总览', 'overview_of_student_job_search', 2003, 3, 'job-overview',      'admin/jobCenter/jobOverview/index',      '', '', 1, 0, 'C', '0', '0', 'admin:job-overview:list',      '#', 'admin', sysdate(), '', null, '学员求职总览菜单');
insert into sys_menu values(2021, '模拟应聘管理', 'simulated_application_management', 2003, 4, 'mock-practice',     'admin/jobCenter/mockPractice/index',     '', '', 1, 0, 'C', '0', '0', 'admin:mock-practice:list',     '#', 'admin', sysdate(), '', null, '模拟应聘管理菜单');

-- 7. 插入教学中心菜单（parent_id=2004）
insert into sys_menu values(2022, '课程记录', 'course_records',         2004, 1, 'class-records',  'admin/teachCenter/classRecords/index',  '', '', 1, 0, 'C', '0', '0', 'admin:class-records:list',  '#', 'admin', sysdate(), '', null, '课程记录菜单');
insert into sys_menu values(2023, '人际关系沟通记录', 'interpersonal_communication_records', 2004, 2, 'communication',  'admin/teachCenter/communication/index', '', '', 1, 0, 'C', '0', '0', 'admin:communication:list',  '#', 'admin', sysdate(), '', null, '人际关系沟通记录菜单');

-- 8. 插入财务中心菜单（parent_id=2005）
insert into sys_menu values(2024, '课时结算', 'class_hour_settlement', 2005, 1, 'finance', 'admin/financeCenter/finance/index', '', '', 1, 0, 'C', '0', '0', 'admin:finance:list', '#', 'admin', sysdate(), '', null, '课时结算菜单');
insert into sys_menu values(2025, '报销管理', 'reimbursement_management', 2005, 2, 'expense', 'admin/financeCenter/expense/index', '', '', 1, 0, 'C', '0', '0', 'admin:expense:list', '#', 'admin', sysdate(), '', null, '报销管理菜单');

-- 9. 插入资源中心菜单（parent_id=2006）
insert into sys_menu values(2026, '文件', 'file',           2006, 1, 'files',            'admin/resourceCenter/files/index',          '', '', 1, 0, 'C', '0', '0', 'admin:files:list',            '#', 'admin', sysdate(), '', null, '文件菜单');
insert into sys_menu values(2027, '在线测试题库', 'online_test_question_bank',   2006, 2, 'online-test-bank', 'admin/resourceCenter/onlineTestBank/index', '', '', 1, 0, 'C', '0', '0', 'admin:online-test-bank:list', '#', 'admin', sysdate(), '', null, '在线测试题库菜单');
insert into sys_menu values(2028, '真人面试题库', 'real_person_interview_question_bank',   2006, 3, 'interview-bank',   'admin/resourceCenter/interviewBank/index',  '', '', 1, 0, 'C', '0', '0', 'admin:interview-bank:list',   '#', 'admin', sysdate(), '', null, '真人面试题库菜单');
insert into sys_menu values(2029, '面试真题', 'real_interview_questions',       2006, 4, 'questions',        'admin/resourceCenter/questions/index',      '', '', 1, 0, 'C', '0', '0', 'admin:questions:list',        '#', 'admin', sysdate(), '', null, '面试真题菜单');

-- 10. 插入个人中心菜单（parent_id=2007）
insert into sys_menu values(2030, '邮件', 'mail',     2007, 1, 'mailjob',    'admin/personal/mailjob/index',    '', '', 1, 0, 'C', '0', '0', 'admin:mailjob:list',    '#', 'admin', sysdate(), '', null, '邮件菜单');
insert into sys_menu values(2031, '消息管理', 'message_management', 2007, 2, 'notice',     'admin/personal/notice/index',     '', '', 1, 0, 'C', '0', '0', 'admin:notice:list',     '#', 'admin', sysdate(), '', null, '消息管理菜单');
insert into sys_menu values(2032, '投诉建议', 'complaints_and_suggestions', 2007, 3, 'complaints', 'admin/personal/complaints/index', '', '', 1, 0, 'C', '0', '0', 'admin:complaints:list', '#', 'admin', sysdate(), '', null, '投诉建议菜单');
insert into sys_menu values(2033, '操作日志', 'operation_log', 2007, 4, 'logs',       'admin/personal/logs/index',       '', '', 1, 0, 'C', '0', '0', 'admin:logs:list',       '#', 'admin', sysdate(), '', null, '操作日志菜单');
