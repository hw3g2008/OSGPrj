-- 2026-05-17-class-record-class-status-null-to-other.sql
--
-- 背景：
--   2026-05-17-class-record-class-status-backfill.sql 第一轮回填后剩 ~20 行 NULL，
--   特征：course_type IS NULL AND class_status IS NULL —— 无任何 zh 文本可反查。
--   前端 lead-mentor resolveContentMeta 已移除 courseContent 兜底（commit 待定），
--   这些行展示会变成空白。
--
-- 处置：
--   用户决策（2026-05-17）：手工 UPDATE 为 'other'，与 deriveClassStatus 对未知 courseType 的兜底语义一致。
--
-- 安全性：
--   - 仅 UPDATE class_status IS NULL OR class_status = '' 的行
--   - 限定 del_flag = '0'（活跃数据）
--   - 不动 absent / 已有明确值的记录

UPDATE osg_class_record
SET class_status = 'other'
WHERE (class_status IS NULL OR class_status = '')
  AND del_flag = '0';
