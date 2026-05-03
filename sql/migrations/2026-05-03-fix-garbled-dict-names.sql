-- Migration: Fix garbled dict_name and dict_label for osg_specialty and osg_rating
-- Root cause: earlier seed insert used wrong charset, stored double-encoded UTF-8
-- Date: 2026-05-03

UPDATE sys_dict_type SET dict_name = '擅长' WHERE dict_type = 'osg_specialty';
UPDATE sys_dict_type SET dict_name = '评级' WHERE dict_type = 'osg_rating';
UPDATE sys_dict_data SET dict_label = '初级' WHERE dict_code = 1841;
UPDATE sys_dict_data SET dict_label = '中级' WHERE dict_code = 1842;
UPDATE sys_dict_data SET dict_label = '高级' WHERE dict_code = 1843;
UPDATE sys_dict_data SET dict_label = '资深' WHERE dict_code = 1844;
