-- Migration: Add osg_visa_status to admin dict seed
-- Scope: Student group
-- Author: Claude Code
-- Date: 2026-05-03

-- Step 1: Insert dict type into sys_dict_type
INSERT INTO sys_dict_type (dict_name, dict_type, status, remark, create_by, create_time)
VALUES
  ('签证状态', 'osg_visa_status', '0', '{"groupKey":"student","groupLabel":"学员相关","icon":"mdi-passport","iconColor":"#22C55E","iconBg":"#D1FAE5","order":20,"hasParent":false}', 'admin', sysdate());

-- Step 2: Insert dict data into sys_dict_data
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, remark, create_by, create_time)
VALUES
  (10, '待确认', 'pending',   'osg_visa_status', 'N', '0', '{}', 'admin', sysdate()),
  (20, '需要签证', 'required', 'osg_visa_status', 'N', '0', '{}', 'admin', sysdate()),
  (30, '无需签证', 'not_required', 'osg_visa_status', 'N', '0', '{}', 'admin', sysdate());