-- ============================================================
-- Migration: osg_position_display_status 字典补齐"未开始"派生子状态
-- Date:      2026-05-08
-- Bug:       T3.8 — 展示开始时间晚于今日的 visible 岗位应展示为"未开始"
-- 设计决策:  not_started 是派生子状态，DB 永远不存该值
--            seedStaticDicts 加该 dict 仅供前端 label/tone 反查
--            Service 在 selectPositionList 末尾派生：visible + displayStartTime > now → not_started
-- ============================================================

DELETE FROM sys_dict_data
  WHERE dict_type = 'osg_position_display_status' AND dict_value = 'not_started';

INSERT INTO sys_dict_data
  (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, remark)
VALUES
  (0, '未开始', 'not_started', 'osg_position_display_status', 'muted', 'default', 'N', '0', 'system',
   '展示开始时间晚于今日的派生子状态（DB 不存该值）');
