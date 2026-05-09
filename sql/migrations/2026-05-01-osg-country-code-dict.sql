-- osg_country_code: 国际电话区号字典
-- 用途：导师/学员表单手机号前缀下拉，数据可由客户在系统字典管理页面编辑
-- 主机：47.94.213.128:23306，用户名：ruoyi，密码：app123456
--
-- 字典约定：
--   dict_value = 国家/地区 ISO 3166-1 alpha-2 代码（机器键，如 CN/HK/US）
--   dict_label = 显示名称（如 中国大陆 / 美国/加拿大）
--   remark    = JSON {"extra":{"callingCode":"+86"}}，区号作为数据属性

-- 1. 字典类型
INSERT INTO sys_dict_type (dict_name, dict_type, status, create_by, create_time, remark)
VALUES ('国际电话区号', 'osg_country_code', '0', 'admin', NOW(),
        '{"groupKey":"job","groupLabel":"岗位相关","order":6,"icon":"mdi mdi-phone","iconColor":"#52c41a","iconBg":"#f6ffed","tabOrder":10}')
ON DUPLICATE KEY UPDATE dict_name = VALUES(dict_name), status = '0', remark = VALUES(remark), update_time = NOW();

-- 2. 字典数据
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time, remark)
VALUES (1, '中国大陆', 'CN', 'osg_country_code', 'N', '0', 'admin', NOW(), '{"extra":{"callingCode":"+86"}}')
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label), dict_value = VALUES(dict_value), remark = VALUES(remark);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time, remark)
VALUES (2, '中国香港', 'HK', 'osg_country_code', 'N', '0', 'admin', NOW(), '{"extra":{"callingCode":"+852"}}')
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label), dict_value = VALUES(dict_value), remark = VALUES(remark);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time, remark)
VALUES (3, '中国澳门', 'MO', 'osg_country_code', 'N', '0', 'admin', NOW(), '{"extra":{"callingCode":"+853"}}')
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label), dict_value = VALUES(dict_value), remark = VALUES(remark);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time, remark)
VALUES (4, '中国台湾', 'TW', 'osg_country_code', 'N', '0', 'admin', NOW(), '{"extra":{"callingCode":"+886"}}')
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label), dict_value = VALUES(dict_value), remark = VALUES(remark);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time, remark)
VALUES (5, '美国/加拿大', 'US', 'osg_country_code', 'N', '0', 'admin', NOW(), '{"extra":{"callingCode":"+1"}}')
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label), dict_value = VALUES(dict_value), remark = VALUES(remark);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time, remark)
VALUES (6, '英国', 'GB', 'osg_country_code', 'N', '0', 'admin', NOW(), '{"extra":{"callingCode":"+44"}}')
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label), dict_value = VALUES(dict_value), remark = VALUES(remark);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time, remark)
VALUES (7, '新加坡', 'SG', 'osg_country_code', 'N', '0', 'admin', NOW(), '{"extra":{"callingCode":"+65"}}')
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label), dict_value = VALUES(dict_value), remark = VALUES(remark);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time, remark)
VALUES (8, '澳大利亚', 'AU', 'osg_country_code', 'N', '0', 'admin', NOW(), '{"extra":{"callingCode":"+61"}}')
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label), dict_value = VALUES(dict_value), remark = VALUES(remark);
