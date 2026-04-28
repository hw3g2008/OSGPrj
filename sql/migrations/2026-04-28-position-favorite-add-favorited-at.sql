-- ============================================================
-- Migration: osg_student_job_position_state 新增 favorited_at
-- Date:      2026-04-28
-- Ticket:    学生端「我的收藏」列表 UI 收口 — 真实收藏时间字段
--
-- 背景：「我的收藏」列表"收藏时间"列此前借用 publish_date（发布时间）
--       展示，与列名语义不一致；update_time 又会被投递/辅导更新覆盖，
--       不能复用。需要一个专门的 favorited_at 字段。
--
-- 变更：
--   1. ADD COLUMN favorited_at DATETIME NULL
--      （收藏置位为 '1' 时写入 NOW()，置位为 '0' 时清 NULL）
--
-- 历史数据：保持 NULL 不回填（update_time 不一定等于收藏时间），
--          列表对 NULL 显示 '--'。
--
-- 回滚：DROP COLUMN favorited_at
-- ============================================================

ALTER TABLE osg_student_job_position_state
    ADD COLUMN favorited_at DATETIME NULL COMMENT '最近一次收藏的时间戳，favorited=0 时清 NULL';

-- 核对：迁移后字段存在性
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'osg_student_job_position_state'
  AND COLUMN_NAME = 'favorited_at';
