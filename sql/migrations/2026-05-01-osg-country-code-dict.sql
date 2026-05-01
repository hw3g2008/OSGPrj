-- osg_country_code: 国际电话区号字典
-- 用途：导师表单手机号前缀下拉，数据可由客户在系统字典管理页面编辑

-- 1. 字典类型
INSERT INTO sys_dict_type (dict_id, dict_name, dict_type, status, create_by, create_time, remark, css_class)
VALUES
    (seq_dict_type.nextval, '国际电话区号', 'osg_country_code', '0', 'admin', sysdate(), '导师手机号前缀', NULL)
ON DUPLICATE KEY UPDATE dict_name = VALUES(dict_name), status = '0', update_time = sysdate();

-- 2. 字典数据（dict_value = 区号，dict_label = 显示文本）
-- is_default = 'Y' 的为中国大陆，作为默认选中
INSERT INTO sys_dict_data (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT seq_dict_data.nextval, 1, '中国大陆', '+86', 'osg_country_code', NULL, NULL, 'Y', '0', 'admin', sysdate(), NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_country_code' AND dict_value = '+86');

INSERT INTO sys_dict_data (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT seq_dict_data.nextval, 2, '中国香港', '+852', 'osg_country_code', NULL, NULL, 'N', '0', 'admin', sysdate(), NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_country_code' AND dict_value = '+852');

INSERT INTO sys_dict_data (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT seq_dict_data.nextval, 3, '中国澳门', '+853', 'osg_country_code', NULL, NULL, 'N', '0', 'admin', sysdate(), NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_country_code' AND dict_value = '+853');

INSERT INTO sys_dict_data (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT seq_dict_data.nextval, 4, '中国台湾', '+886', 'osg_country_code', NULL, NULL, 'N', '0', 'admin', sysdate(), NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_country_code' AND dict_value = '+886');

INSERT INTO sys_dict_data (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT seq_dict_data.nextval, 5, '美国/加拿大', '+1', 'osg_country_code', NULL, NULL, 'N', '0', 'admin', sysdate(), NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_country_code' AND dict_value = '+1');

INSERT INTO sys_dict_data (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT seq_dict_data.nextval, 6, '英国', '+44', 'osg_country_code', NULL, NULL, 'N', '0', 'admin', sysdate(), NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_country_code' AND dict_value = '+44');

INSERT INTO sys_dict_data (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT seq_dict_data.nextval, 7, '新加坡', '+65', 'osg_country_code', NULL, NULL, 'N', '0', 'admin', sysdate(), NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_country_code' AND dict_value = '+65');

INSERT INTO sys_dict_data (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT seq_dict_data.nextval, 8, '澳大利亚', '+61', 'osg_country_code', NULL, NULL, 'N', '0', 'admin', sysdate(), NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_country_code' AND dict_value = '+61');
