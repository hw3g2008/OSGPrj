-- =============================================================================
-- §C1 课消上报弹窗"关联申请下拉"label 字典化 — 字典初始化 SQL
-- 关联：10-coaching-flow-routing-fix-plan.md §8.4 / 03-class-report-reference-revision.md
-- 影响：sys_dict_type +4 行；sys_dict_data +21 行
-- 执行前：先在共享 DB 备份这两张表（mysqldump -t sys_dict_type sys_dict_data > backup.sql）
-- =============================================================================

SET NAMES utf8mb4;

-- ----------------------------- dict types -----------------------------

INSERT INTO sys_dict_type (dict_name, dict_type, status, create_by, create_time, remark)
VALUES
  ('面试阶段',        'osg_interview_stage',        '0', 'system', NOW(), 'coaching.interview_stage 字典 — 用于课消上报弹窗 label / 求职总览阶段列'),
  ('辅导申请状态',    'osg_coaching_status',        '0', 'system', NOW(), 'osg_coaching.status 字典'),
  ('模拟应聘类型',    'osg_practice_type',          '0', 'system', NOW(), 'osg_mock_practice.practice_type 字典'),
  ('模拟应聘状态',    'osg_mock_practice_status',   '0', 'system', NOW(), 'osg_mock_practice.status 字典')
ON DUPLICATE KEY UPDATE dict_name = VALUES(dict_name), remark = VALUES(remark);

-- ----------------------------- dict data ------------------------------

-- osg_interview_stage（参考 ClassReportFlowModal StepCourseType 与 09-rule-a-alignment-fix-plan §3.2）
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES
  (10, 'HireVue / Online Test',  'hirevue',   'osg_interview_stage', 'N', '0', 'system', NOW()),
  (20, 'Screening Call',         'screening', 'osg_interview_stage', 'N', '0', 'system', NOW()),
  (30, 'First Round',            'first',     'osg_interview_stage', 'N', '0', 'system', NOW()),
  (40, 'Second Round',           'second',    'osg_interview_stage', 'N', '0', 'system', NOW()),
  (50, 'Third Round and Beyond', 'third',     'osg_interview_stage', 'N', '0', 'system', NOW()),
  (60, 'Case Study Round',       'case',      'osg_interview_stage', 'N', '0', 'system', NOW()),
  (70, 'Superday / AC',          'superday',  'osg_interview_stage', 'N', '0', 'system', NOW());

-- osg_coaching_status
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES
  (10, '待分配导师', 'pending',   'osg_coaching_status', 'Y', '0', 'system', NOW()),
  (20, '已分配导师', 'assigned',  'osg_coaching_status', 'N', '0', 'system', NOW()),
  (30, '辅导中',     'coaching',  'osg_coaching_status', 'N', '0', 'system', NOW()),
  (40, '已完成',     'completed', 'osg_coaching_status', 'N', '0', 'system', NOW()),
  (50, '已取消',     'cancelled', 'osg_coaching_status', 'N', '0', 'system', NOW());

-- osg_practice_type
-- §E 修正（2026-05-14）：DB 实际 enum 与学生端卡片对应：
--   mock_interview     → 模拟面试（学生卡片 mock）
--   communication_test → 人际关系测试（学生卡片 networking — 注意值不是 relation_test）
--   midterm_exam       → 期中考试（学生卡片 midterm — 注意值不是 communication_test）
-- 修正前的 SQL 错将 relation_test 误塞进字典 / communication_test 错挂"期中考试" label
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES
  (10, '模拟面试',     'mock_interview',     'osg_practice_type', 'N', '0', 'system', NOW()),
  (20, '人际关系测试', 'communication_test', 'osg_practice_type', 'N', '0', 'system', NOW()),
  (30, '期中考试',     'midterm_exam',       'osg_practice_type', 'N', '0', 'system', NOW());

-- osg_mock_practice_status
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES
  (10, '待处理', 'new',       'osg_mock_practice_status', 'Y', '0', 'system', NOW()),
  (20, '待进行', 'pending',   'osg_mock_practice_status', 'N', '0', 'system', NOW()),
  (30, '已完成', 'completed', 'osg_mock_practice_status', 'N', '0', 'system', NOW()),
  (40, '已取消', 'cancelled', 'osg_mock_practice_status', 'N', '0', 'system', NOW()),
  (50, '已分配', 'assigned',  'osg_mock_practice_status', 'N', '0', 'system', NOW());

-- =============================================================================
-- 验证（执行后 SELECT 应返回 4 + 21 行）
-- SELECT dict_type, COUNT(*) FROM sys_dict_data
--   WHERE dict_type IN ('osg_interview_stage','osg_coaching_status','osg_practice_type','osg_mock_practice_status')
--   GROUP BY dict_type;
-- =============================================================================
