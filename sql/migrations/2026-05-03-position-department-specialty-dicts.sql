-- Migration: Add position department dict and seed mentor specialty values.
-- Tables: sys_dict_type, sys_dict_data.
-- Category: job / 求职相关.

INSERT INTO sys_dict_type (dict_name, dict_type, status, create_by, create_time, remark)
VALUES ('部门', 'osg_position_department', '0', 'admin', NOW(),
        '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false}')
ON DUPLICATE KEY UPDATE dict_name = VALUES(dict_name), status = '0', remark = VALUES(remark), update_time = NOW();

UPDATE sys_dict_type
SET dict_name = '擅长',
    status = '0',
    remark = '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false}',
    update_time = NOW()
WHERE dict_type = 'osg_specialty';

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, remark, create_by, create_time)
SELECT seed.dict_sort, seed.dict_label, seed.dict_value, seed.dict_type, 'N', '0', '{}', 'admin', NOW()
FROM (
  SELECT 10 dict_sort, 'IBD' dict_label, 'ibd' dict_value, 'osg_position_department' dict_type UNION ALL
  SELECT 20, 'Sales & Trading', 'sales_trading', 'osg_position_department' UNION ALL
  SELECT 30, 'Equity Research', 'equity_research', 'osg_position_department' UNION ALL
  SELECT 40, 'Asset Management', 'asset_management', 'osg_position_department' UNION ALL
  SELECT 50, 'Wealth Management', 'wealth_management', 'osg_position_department' UNION ALL
  SELECT 60, 'Corporate Finance', 'corporate_finance', 'osg_position_department' UNION ALL
  SELECT 70, 'Strategy', 'strategy', 'osg_position_department' UNION ALL
  SELECT 80, 'Consulting', 'consulting', 'osg_position_department' UNION ALL
  SELECT 90, 'Quant Research', 'quant_research', 'osg_position_department' UNION ALL
  SELECT 100, 'Software Engineering', 'software_engineering', 'osg_position_department' UNION ALL
  SELECT 110, 'Product Management', 'product_management', 'osg_position_department' UNION ALL
  SELECT 120, 'Data Science', 'data_science', 'osg_position_department'
) seed
WHERE NOT EXISTS (
  SELECT 1 FROM sys_dict_data d
  WHERE d.dict_type = seed.dict_type AND d.dict_value = seed.dict_value
);

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, remark, create_by, create_time)
SELECT seed.dict_sort, seed.dict_label, seed.dict_value, seed.dict_type, 'N', '0', '{}', 'admin', NOW()
FROM (
  SELECT 10 dict_sort, 'DCF 估值' dict_label, 'dcf_valuation' dict_value, 'osg_specialty' dict_type UNION ALL
  SELECT 20, '三大表建模', 'three_statement_modeling', 'osg_specialty' UNION ALL
  SELECT 30, 'LBO 建模', 'lbo_modeling', 'osg_specialty' UNION ALL
  SELECT 40, 'Case Interview', 'case_interview', 'osg_specialty' UNION ALL
  SELECT 50, 'Behavior Interview', 'behavior_interview', 'osg_specialty' UNION ALL
  SELECT 60, 'OA 刷题', 'oa_practice', 'osg_specialty' UNION ALL
  SELECT 70, 'Resume 修改', 'resume_review', 'osg_specialty' UNION ALL
  SELECT 80, 'Networking', 'networking', 'osg_specialty' UNION ALL
  SELECT 90, 'Python 量化回测', 'python_quant_backtest', 'osg_specialty' UNION ALL
  SELECT 100, 'SQL 数据分析', 'sql_data_analysis', 'osg_specialty'
) seed
WHERE NOT EXISTS (
  SELECT 1 FROM sys_dict_data d
  WHERE d.dict_type = seed.dict_type AND d.dict_value = seed.dict_value
);

UPDATE osg_position
SET department = CASE department
  WHEN 'IBD' THEN 'ibd'
  ELSE department
END
WHERE department IN ('IBD');
