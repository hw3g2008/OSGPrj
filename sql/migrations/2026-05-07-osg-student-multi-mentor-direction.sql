-- ============================================
-- 学员模块 B5 多选改造迁移
-- 日期: 2026-05-07
-- 范围:
--   1. osg_student 新增 lead_mentor_ids / assistant_ids 两个 CSV 列（兼容期与旧单值字段并存）
--   2. major_direction / sub_direction 列宽由 VARCHAR(64) 扩到 VARCHAR(255)，容纳多选 CSV
--   3. 数据回填: 把旧 lead_mentor_id / assistant_id 单值写入新 CSV 列（首次执行时）
-- 幂等: 全部用 IF NOT EXISTS / 数据回填带 WHERE 条件，可重复执行
-- ============================================

-- 1. 新增多选 CSV 列
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_student'
      AND COLUMN_NAME = 'lead_mentor_ids'
);
SET @stmt := IF(@col_exists = 0,
    'ALTER TABLE osg_student ADD COLUMN lead_mentor_ids VARCHAR(255) DEFAULT NULL COMMENT ''班主任ID列表(CSV)'' AFTER lead_mentor_id',
    'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_student'
      AND COLUMN_NAME = 'assistant_ids'
);
SET @stmt := IF(@col_exists = 0,
    'ALTER TABLE osg_student ADD COLUMN assistant_ids VARCHAR(255) DEFAULT NULL COMMENT ''助教ID列表(CSV)'' AFTER assistant_id',
    'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 2. 扩列宽（重复执行 ALTER 同长度无影响）
ALTER TABLE osg_student MODIFY COLUMN major_direction VARCHAR(255) DEFAULT NULL COMMENT '主攻方向(CSV)';
ALTER TABLE osg_student MODIFY COLUMN sub_direction VARCHAR(255) DEFAULT NULL COMMENT '子方向(CSV)';

-- 3. 数据回填: 旧单值字段写入新 CSV 列（仅当 CSV 列为空时执行，幂等）
UPDATE osg_student
   SET lead_mentor_ids = CAST(lead_mentor_id AS CHAR)
 WHERE lead_mentor_id IS NOT NULL
   AND (lead_mentor_ids IS NULL OR lead_mentor_ids = '');

UPDATE osg_student
   SET assistant_ids = CAST(assistant_id AS CHAR)
 WHERE assistant_id IS NOT NULL
   AND (assistant_ids IS NULL OR assistant_ids = '');
