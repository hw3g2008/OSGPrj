-- 国际电话区号字典：dict_value 从区号改为 ISO 国家代码，区号挪到 remark.extra.callingCode
-- 背景：dict_value 应为机器键（与名称对应），不应放数字区号；区号是数据属性，存 extra
-- 影响：osg_country_code 字典 + admin 字典管理 UI + 3 个使用方读 extra.callingCode

START TRANSACTION;

-- 1. 删除历史脏数据（来自 UI 校验规则不允许 + 号导致的兜底输入）
DELETE FROM sys_dict_data WHERE dict_type = 'osg_country_code' AND dict_value = 'ss';

-- 2. 迁移现有 8 条记录
UPDATE sys_dict_data SET dict_value = 'CN', remark = '{"extra":{"callingCode":"+86"}}'  WHERE dict_type = 'osg_country_code' AND dict_value = '+86';
UPDATE sys_dict_data SET dict_value = 'HK', remark = '{"extra":{"callingCode":"+852"}}' WHERE dict_type = 'osg_country_code' AND dict_value = '+852';
UPDATE sys_dict_data SET dict_value = 'MO', remark = '{"extra":{"callingCode":"+853"}}' WHERE dict_type = 'osg_country_code' AND dict_value = '+853';
UPDATE sys_dict_data SET dict_value = 'TW', remark = '{"extra":{"callingCode":"+886"}}' WHERE dict_type = 'osg_country_code' AND dict_value = '+886';
UPDATE sys_dict_data SET dict_value = 'US', remark = '{"extra":{"callingCode":"+1"}}'   WHERE dict_type = 'osg_country_code' AND dict_value = '+1';
UPDATE sys_dict_data SET dict_value = 'GB', remark = '{"extra":{"callingCode":"+44"}}'  WHERE dict_type = 'osg_country_code' AND dict_value = '+44';
UPDATE sys_dict_data SET dict_value = 'SG', remark = '{"extra":{"callingCode":"+65"}}'  WHERE dict_type = 'osg_country_code' AND dict_value = '+65';
UPDATE sys_dict_data SET dict_value = 'AU', remark = '{"extra":{"callingCode":"+61"}}'  WHERE dict_type = 'osg_country_code' AND dict_value = '+61';

COMMIT;
