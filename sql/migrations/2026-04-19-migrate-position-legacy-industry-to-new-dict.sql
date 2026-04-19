-- ============================================================
-- Migration: osg_position 老字典值 → osg_company_type 新字典值
-- Date: 2026-04-19
-- Background:
--   osg_position 表中 22 条历史记录的 industry/company_type 字段使用的是
--   旧字典 osg_position_industry 的 4 个 value（Investment Bank / Consulting
--   / Tech / PE/VC），但 admin 端已切换到新字典 osg_company_type 的 7 个
--   value（bulge_bracket / elite_boutique / middle_market / buyside /
--   consulting / swe_pm / other_company）。
--
--   本迁移基于"按公司本质归类"的原则，对每条记录按公司名做一次性映射。
--   映射结果见下表。后续业务如在 admin 后台发现归类不符，可手动修改。
--
-- Scope:
--   company_type 字段：存新字典 dict_value
--   industry 字段：存新字典 dict_label（和 company_type 保持一对一对应）
--
-- Rollback:
--   与之相反的 UPDATE 即可还原。备份文件：
--   sql/migrations/2026-04-19-restore-position-industry-values.sql
-- ============================================================

START TRANSACTION;

-- ============================================================
-- consulting (6 条)
-- ============================================================
-- Alvarez & Marsal × 3, Advancy × 2, DHL Consulting × 1
UPDATE osg_position
SET company_type = 'consulting',
    industry = 'Consulting'
WHERE position_id IN (285, 286, 287, 288, 289, 290);

-- ============================================================
-- bulge_bracket (4 条)
-- ============================================================
-- Citi × 1, Morgan Stanley × 2, BNP Paribas × 1
UPDATE osg_position
SET company_type = 'bulge_bracket',
    industry = 'Bulge Bracket'
WHERE position_id IN (292, 293, 294, 296);

-- ============================================================
-- elite_boutique (1 条)
-- ============================================================
-- MTS (推测为 MTS Health Partners)
UPDATE osg_position
SET company_type = 'elite_boutique',
    industry = 'Elite Boutique'
WHERE position_id = 291;

-- ============================================================
-- middle_market (6 条)
-- ============================================================
-- BMO × 1, Piper Sandler × 1, TD × 3, William Blair × 1
UPDATE osg_position
SET company_type = 'middle_market',
    industry = 'Middle Market'
WHERE position_id IN (295, 297, 298, 299, 300, 301);

-- ============================================================
-- buyside (5 条)
-- ============================================================
-- Walleye Capital × 1, Ardian × 1, SIG × 3
UPDATE osg_position
SET company_type = 'buyside',
    industry = 'Buyside'
WHERE position_id IN (302, 303, 304, 305, 306);

-- ============================================================
-- Verification (应返回 0 行：没有任何老 value 残留)
-- ============================================================
-- SELECT COUNT(*) AS legacy_rows
-- FROM osg_position
-- WHERE industry IN ('Investment Bank', 'Tech', 'PE/VC')
--    OR company_type IN ('Investment Bank', 'Tech', 'PE/VC');

-- ============================================================
-- Verification (应返回 22 行：全部记录都使用新字典 value)
-- ============================================================
-- SELECT COUNT(*) AS new_value_rows
-- FROM osg_position
-- WHERE company_type IN ('bulge_bracket', 'elite_boutique', 'middle_market',
--                        'buyside', 'consulting', 'swe_pm', 'other_company');

COMMIT;
