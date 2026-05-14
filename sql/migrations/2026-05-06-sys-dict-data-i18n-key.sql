-- ============================================================================
-- Commit D: sys_dict_data i18n key column.
--
-- Adds nullable `i18n_key` to `sys_dict_data` so the admin frontend can
-- translate ENUM-style dict labels (schedule_status / visa_status / rating /
-- region / specialty / etc.) while leaving user-defined business data
-- (company_name / school for ad-hoc rows / etc.) untouched (NULL falls back
-- to raw dict_label).
--
-- Idempotent: column add is guarded by information_schema; UPDATEs are scoped
-- on dict_type + dict_value, so re-running is a no-op.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Add i18n_key column if absent.
-- ----------------------------------------------------------------------------
SET @has_i18n_key := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'sys_dict_data'
      AND COLUMN_NAME  = 'i18n_key'
);
SET @sql_add_col := IF(
    @has_i18n_key = 0,
    "ALTER TABLE sys_dict_data ADD COLUMN i18n_key VARCHAR(96) NULL COMMENT 'stable i18n key for dict_label display; NULL = user-defined business data, render dict_label as-is' AFTER dict_label",
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 2) Backfill ENUM-style rows. Convention: dict_data_<type_short>_<slug>
-- ----------------------------------------------------------------------------

-- osg_schedule_status (3 rows, pure Chinese labels)
UPDATE sys_dict_data SET i18n_key='dict_data_schedule_status_available'  WHERE dict_type='osg_schedule_status' AND dict_value='available';
UPDATE sys_dict_data SET i18n_key='dict_data_schedule_status_normal'     WHERE dict_type='osg_schedule_status' AND dict_value='normal';
UPDATE sys_dict_data SET i18n_key='dict_data_schedule_status_busy'       WHERE dict_type='osg_schedule_status' AND dict_value='busy';

-- osg_visa_status (3 rows)
UPDATE sys_dict_data SET i18n_key='dict_data_visa_status_pending'        WHERE dict_type='osg_visa_status' AND dict_value='pending';
UPDATE sys_dict_data SET i18n_key='dict_data_visa_status_required'      WHERE dict_type='osg_visa_status' AND dict_value='required';
UPDATE sys_dict_data SET i18n_key='dict_data_visa_status_not_required'  WHERE dict_type='osg_visa_status' AND dict_value='not_required';

-- osg_country_code (8 rows, dict_value contains '+' so use country slug)
UPDATE sys_dict_data SET i18n_key='dict_data_country_china_mainland'  WHERE dict_type='osg_country_code' AND dict_value='+86';
UPDATE sys_dict_data SET i18n_key='dict_data_country_hong_kong'       WHERE dict_type='osg_country_code' AND dict_value='+852';
UPDATE sys_dict_data SET i18n_key='dict_data_country_macau'           WHERE dict_type='osg_country_code' AND dict_value='+853';
UPDATE sys_dict_data SET i18n_key='dict_data_country_taiwan'          WHERE dict_type='osg_country_code' AND dict_value='+886';
UPDATE sys_dict_data SET i18n_key='dict_data_country_us_canada'       WHERE dict_type='osg_country_code' AND dict_value='+1';
UPDATE sys_dict_data SET i18n_key='dict_data_country_uk'              WHERE dict_type='osg_country_code' AND dict_value='+44';
UPDATE sys_dict_data SET i18n_key='dict_data_country_singapore'       WHERE dict_type='osg_country_code' AND dict_value='+65';
UPDATE sys_dict_data SET i18n_key='dict_data_country_australia'       WHERE dict_type='osg_country_code' AND dict_value='+61';

-- osg_rating (4 rows)
UPDATE sys_dict_data SET i18n_key='dict_data_rating_junior'  WHERE dict_type='osg_rating' AND dict_value='junior';
UPDATE sys_dict_data SET i18n_key='dict_data_rating_middle'  WHERE dict_type='osg_rating' AND dict_value='middle';
UPDATE sys_dict_data SET i18n_key='dict_data_rating_senior'  WHERE dict_type='osg_rating' AND dict_value='senior';
UPDATE sys_dict_data SET i18n_key='dict_data_rating_expert'  WHERE dict_type='osg_rating' AND dict_value='expert';

-- osg_region (5 rows)
UPDATE sys_dict_data SET i18n_key='dict_data_region_north_america'   WHERE dict_type='osg_region' AND dict_value='na';
UPDATE sys_dict_data SET i18n_key='dict_data_region_europe'          WHERE dict_type='osg_region' AND dict_value='eu';
UPDATE sys_dict_data SET i18n_key='dict_data_region_asia_pacific'    WHERE dict_type='osg_region' AND dict_value='apac';
UPDATE sys_dict_data SET i18n_key='dict_data_region_china_mainland'  WHERE dict_type='osg_region' AND dict_value='china_mainland';
UPDATE sys_dict_data SET i18n_key='dict_data_region_other'           WHERE dict_type='osg_region' AND dict_value='other';

-- osg_major_direction (4 rows)
UPDATE sys_dict_data SET i18n_key='dict_data_major_consulting'  WHERE dict_type='osg_major_direction' AND dict_value='consulting';
UPDATE sys_dict_data SET i18n_key='dict_data_major_finance'     WHERE dict_type='osg_major_direction' AND dict_value='finance';
UPDATE sys_dict_data SET i18n_key='dict_data_major_tech'        WHERE dict_type='osg_major_direction' AND dict_value='tech';
UPDATE sys_dict_data SET i18n_key='dict_data_major_quant'       WHERE dict_type='osg_major_direction' AND dict_value='quant';

-- osg_sub_direction (23 rows — derive by value, all values are clean English)
UPDATE sys_dict_data SET i18n_key='dict_data_sub_direction_strategy'              WHERE dict_type='osg_sub_direction' AND dict_value='strategy';
UPDATE sys_dict_data SET i18n_key='dict_data_sub_direction_advisory'              WHERE dict_type='osg_sub_direction' AND dict_value='advisory';
UPDATE sys_dict_data SET i18n_key='dict_data_sub_direction_investment_banking'    WHERE dict_type='osg_sub_direction' AND dict_value='investment_banking';
UPDATE sys_dict_data SET i18n_key='dict_data_sub_direction_asset_management'      WHERE dict_type='osg_sub_direction' AND dict_value='asset_management';
UPDATE sys_dict_data SET i18n_key='dict_data_sub_direction_private_equity'        WHERE dict_type='osg_sub_direction' AND dict_value='private_equity';
UPDATE sys_dict_data SET i18n_key='dict_data_sub_direction_venture_capital'       WHERE dict_type='osg_sub_direction' AND dict_value='venture_capital';
UPDATE sys_dict_data SET i18n_key='dict_data_sub_direction_software_engineering'  WHERE dict_type='osg_sub_direction' AND dict_value='software_engineering';
UPDATE sys_dict_data SET i18n_key='dict_data_sub_direction_quant_research'        WHERE dict_type='osg_sub_direction' AND dict_value='quant_research';

-- osg_specialty (7 of 10 rows; case_interview / behavior_interview / networking are English-only labels)
UPDATE sys_dict_data SET i18n_key='dict_data_specialty_dcf_valuation'              WHERE dict_type='osg_specialty' AND dict_value='dcf_valuation';
UPDATE sys_dict_data SET i18n_key='dict_data_specialty_three_statement_modeling'   WHERE dict_type='osg_specialty' AND dict_value='three_statement_modeling';
UPDATE sys_dict_data SET i18n_key='dict_data_specialty_lbo_modeling'               WHERE dict_type='osg_specialty' AND dict_value='lbo_modeling';
UPDATE sys_dict_data SET i18n_key='dict_data_specialty_oa_practice'                WHERE dict_type='osg_specialty' AND dict_value='oa_practice';
UPDATE sys_dict_data SET i18n_key='dict_data_specialty_resume_review'              WHERE dict_type='osg_specialty' AND dict_value='resume_review';
UPDATE sys_dict_data SET i18n_key='dict_data_specialty_python_quant_backtest'      WHERE dict_type='osg_specialty' AND dict_value='python_quant_backtest';
UPDATE sys_dict_data SET i18n_key='dict_data_specialty_sql_data_analysis'          WHERE dict_type='osg_specialty' AND dict_value='sql_data_analysis';

-- osg_school (only 2 bilingual-label rows; remaining 107 already have English-only labels)
UPDATE sys_dict_data SET i18n_key='dict_data_school_peking_university'    WHERE dict_type='osg_school' AND dict_value='peking_university';
UPDATE sys_dict_data SET i18n_key='dict_data_school_tsinghua_university'  WHERE dict_type='osg_school' AND dict_value='tsinghua_university';
