-- osg_country_code: 国际电话区号字典
-- 用途：导师表单手机号前缀下拉，数据可由客户在系统字典管理页面编辑
-- 主机：47.94.213.128:23306，用户名：ruoyi，密码：app123456

-- 1. 字典类型（含 remark 元数据，用于注册到 job 分类下）
INSERT INTO sys_dict_type (dict_name, dict_type, status, create_by, create_time, remark)
VALUES ('国际电话区号', 'osg_country_code', '0', 'admin', NOW(),
        '{"groupKey":"job","groupLabel":"岗位相关","order":6,"icon":"mdi mdi-phone","iconColor":"#52c41a","iconBg":"#f6ffed","tabOrder":10}')
ON DUPLICATE KEY UPDATE dict_name = VALUES(dict_name), status = '0', remark = VALUES(remark), update_time = NOW();

-- 2. 字典数据（dict_value = 区号，dict_label = 显示文本）
-- 前端默认显示"请选择区号"占位项，无预设默认值
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES (1, '中国大陆', '+86', 'osg_country_code', 'N', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES (2, '中国香港', '+852', 'osg_country_code', 'N', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES (3, '中国澳门', '+853', 'osg_country_code', 'N', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES (4, '中国台湾', '+886', 'osg_country_code', 'N', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES (5, '美国/加拿大', '+1', 'osg_country_code', 'N', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES (6, '英国', '+44', 'osg_country_code', 'N', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES (7, '新加坡', '+65', 'osg_country_code', 'N', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES (8, '澳大利亚', '+61', 'osg_country_code', 'N', '0', 'admin', NOW())
ON DUPLICATE KEY UPDATE dict_label = VALUES(dict_label);
