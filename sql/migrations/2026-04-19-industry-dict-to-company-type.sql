-- ============================================================================
-- 岗位行业字典统一迁移（方案 A）
-- 将 osg_position_industry、osg_student_position_industry 两个遗留字典替换为
-- osg_company_type 唯一真源。
-- 备份：sql/backups/2026-04-19-industry-dict-snapshot.sql
-- ============================================================================

-- 1) 清空 osg_position 22 条岗位的 industry / company_type（两列 NOT NULL，用空串）
UPDATE osg_position SET industry = '', company_type = '';

-- 2) 删除 2 个遗留字典的数据行（sys_dict_type 里本来就没有这俩类型定义）
DELETE FROM sys_dict_data WHERE dict_type IN ('osg_position_industry', 'osg_student_position_industry');

-- 3) 为 osg_company_type 7 条数据补 css_class / list_class（tone / icon）
UPDATE sys_dict_data SET css_class = 'gold',   list_class = 'mdi-trophy'        WHERE dict_type = 'osg_company_type' AND dict_value = 'bulge_bracket';
UPDATE sys_dict_data SET css_class = 'violet', list_class = 'mdi-diamond-stone' WHERE dict_type = 'osg_company_type' AND dict_value = 'elite_boutique';
UPDATE sys_dict_data SET css_class = 'blue',   list_class = 'mdi-city'          WHERE dict_type = 'osg_company_type' AND dict_value = 'middle_market';
UPDATE sys_dict_data SET css_class = 'amber',  list_class = 'mdi-currency-usd'  WHERE dict_type = 'osg_company_type' AND dict_value = 'buyside';
UPDATE sys_dict_data SET css_class = 'teal',   list_class = 'mdi-lightbulb'     WHERE dict_type = 'osg_company_type' AND dict_value = 'consulting';
UPDATE sys_dict_data SET css_class = 'indigo', list_class = 'mdi-laptop'        WHERE dict_type = 'osg_company_type' AND dict_value = 'swe_pm';
UPDATE sys_dict_data SET css_class = 'slate',  list_class = 'mdi-briefcase'     WHERE dict_type = 'osg_company_type' AND dict_value = 'other_company';

-- 4) 校验
SELECT 'position_check' AS tag, COUNT(*) AS rows_cleared FROM osg_position WHERE industry IS NOT NULL OR company_type IS NOT NULL;
SELECT 'dict_remaining_legacy' AS tag, COUNT(*) AS n FROM sys_dict_data WHERE dict_type IN ('osg_position_industry', 'osg_student_position_industry');
SELECT 'company_type_final' AS tag, dict_value, dict_label, css_class, list_class, dict_sort FROM sys_dict_data WHERE dict_type = 'osg_company_type' ORDER BY dict_sort;
