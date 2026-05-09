-- ============================================================
-- Migration: osg_position 增加投递备注附件 JSON 字段
-- Date:      2026-05-08
-- Bug:       T3.4 — 投递备注支持文字 + 附件（图片/PDF）
-- 设计决策:  TEXT + 应用层 ObjectMapper 序列化（与 target_majors CSV 风格一致，避免引入 JSON typeHandler）
-- 字段格式:  JSON 数组字符串 [{"url":"...","fileName":"...","fileType":"...","size":12345}]
-- ============================================================

ALTER TABLE osg_position
  ADD COLUMN application_attachments TEXT DEFAULT NULL
  COMMENT '投递备注附件列表 JSON: [{url,fileName,fileType,size}]'
  AFTER application_note;
