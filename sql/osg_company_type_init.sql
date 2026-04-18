-- osg_company_type 字典类型注册 + 7条分类数据（来源：docs/bank.xlsx Sheet2）
-- 修复：osg_company_name 的 parentDictType 指向 osg_company_type，但该字典类型之前不存在

-- 1. 注册字典类型（如已存在则跳过）
INSERT IGNORE INTO sys_dict_type (dict_name, dict_type, status, remark, create_by, create_time)
VALUES ('公司/银行类别', 'osg_company_type', '0',
  '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"tabOrder":3,"hasParent":false}',
  'admin', NOW());

-- 2. 插入 7 条分类数据（来源：docs/bank.xlsx Sheet2）
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, status, is_default, create_by, create_time) VALUES
(100, 'Bulge Bracket',  'bulge_bracket',  'osg_company_type', '0', 'N', 'admin', NOW()),
(90,  'Elite Boutique', 'elite_boutique', 'osg_company_type', '0', 'N', 'admin', NOW()),
(80,  'Middle Market',  'middle_market',  'osg_company_type', '0', 'N', 'admin', NOW()),
(70,  'Buyside',        'buyside',        'osg_company_type', '0', 'N', 'admin', NOW()),
(60,  'Consulting',     'consulting',     'osg_company_type', '0', 'N', 'admin', NOW()),
(50,  'SWE/PM',         'swe_pm',         'osg_company_type', '0', 'N', 'admin', NOW()),
(40,  'Other Company',  'other_company',  'osg_company_type', '0', 'N', 'admin', NOW());

-- 3. 修复求职相关 Tab 名称和排序（tabOrder 控制 Tab 显示顺序）
UPDATE sys_dict_type SET remark='{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"tabOrder":1,"hasParent":false}' WHERE dict_type='osg_job_category';
UPDATE sys_dict_type SET dict_name='公司/银行名称', remark='{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"tabOrder":2,"hasParent":true,"parentDictType":"osg_company_type"}' WHERE dict_type='osg_company_name';
UPDATE sys_dict_type SET remark='{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"tabOrder":4,"hasParent":false}' WHERE dict_type='osg_region';
UPDATE sys_dict_type SET dict_name='地区/城市', remark='{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"tabOrder":5,"hasParent":true,"parentDictType":"osg_region"}' WHERE dict_type='osg_city';
UPDATE sys_dict_type SET remark='{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"tabOrder":6,"hasParent":false}' WHERE dict_type='osg_recruit_cycle';
