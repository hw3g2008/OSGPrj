-- ============================================================
-- Migration: osg_staff 补 3 个缺失列 + major_direction 扩容
-- Date:      2026-05-01
-- Ticket:    新增/编辑导师 表单字典化
--
-- 背景：StaffFormModal 表单存在 3 个字段（性别、微信、可授课程类型）
--       前端有控件、后端 OsgStaff 实体 + DB 表均无对应列，提交后端
--       静默丢弃；同时主攻方向/子方向改为多选后存逗号分隔字典 value，
--       原 VARCHAR(64) 不足以容纳。
--
-- 变更：
--   1. ADD COLUMN gender       VARCHAR(4)   -- '0'男 / '1'女
--   2. ADD COLUMN wechat_id    VARCHAR(64)  -- 微信号
--   3. ADD COLUMN course_types VARCHAR(512) -- 逗号分隔字典 value
--   4. MODIFY major_direction VARCHAR(64) → VARCHAR(255)
--      （多选时存形如 'finance,consulting,tech' 的逗号串）
--
-- 历史数据：保持原值不动。前端列表展示用 dict label 兜底，dict 查
--          不到就原样显示中文，与新存的 dict value 共存。
--
-- 回滚：
--   ALTER TABLE osg_staff
--     DROP COLUMN gender,
--     DROP COLUMN wechat_id,
--     DROP COLUMN course_types,
--     MODIFY COLUMN major_direction VARCHAR(64) DEFAULT NULL COMMENT '主攻方向';
-- ============================================================

ALTER TABLE osg_staff
    ADD COLUMN gender       VARCHAR(4)   DEFAULT NULL COMMENT '性别(0男/1女)' AFTER phone,
    ADD COLUMN wechat_id    VARCHAR(64)  DEFAULT NULL COMMENT '微信号'         AFTER gender,
    ADD COLUMN course_types VARCHAR(512) DEFAULT NULL COMMENT '可授课程类型(逗号分隔字典value)' AFTER sub_direction;

ALTER TABLE osg_staff
    MODIFY COLUMN major_direction VARCHAR(255) DEFAULT NULL COMMENT '主攻方向(逗号分隔字典value，多选)';

-- 核对：迁移后字段存在性
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'osg_staff'
  AND COLUMN_NAME IN ('gender', 'wechat_id', 'course_types', 'major_direction')
ORDER BY ORDINAL_POSITION;
