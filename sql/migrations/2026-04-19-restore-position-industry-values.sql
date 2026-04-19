-- ============================================================================
-- 恢复 22 条岗位的 industry / company_type 原始值
-- 基于备份 sql/backups/2026-04-19-industry-dict-snapshot.sql
-- 字典 osg_company_type 保持 7 项不变，等业务手动把旧值（Investment Bank 等）
-- 一条条改为新字典 value（bulge_bracket 等）。
-- ============================================================================

-- Consulting × 6 (285-290)
UPDATE osg_position SET industry='Consulting', company_type='Consulting'
WHERE position_id IN (285,286,287,288,289,290);

-- Investment Bank × 14 (291-294, 296-301, 303-306)
UPDATE osg_position SET industry='Investment Bank', company_type='Investment Bank'
WHERE position_id IN (291,292,293,294,296,297,298,299,300,301,303,304,305,306);

-- Tech × 2 (295, 302)
UPDATE osg_position SET industry='Tech', company_type='Tech'
WHERE position_id IN (295,302);

-- 校验
SELECT industry, COUNT(*) AS n FROM osg_position GROUP BY industry ORDER BY n DESC;
