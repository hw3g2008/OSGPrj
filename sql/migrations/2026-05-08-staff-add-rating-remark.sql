-- ============================================================
-- Migration: osg_staff 增加评语字段（仅超管可读可写）
-- Date:      2026-05-08
-- Bug:       T1.6 — 评级新增评语，权限与评级一致（仅超管 SecurityUtils.isAdmin()）
-- ============================================================
ALTER TABLE osg_staff
  ADD COLUMN rating_remark VARCHAR(500) DEFAULT NULL COMMENT '评级评语（仅超管可见可写）'
  AFTER rating;
