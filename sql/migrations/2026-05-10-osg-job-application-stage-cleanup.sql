SET NAMES utf8mb4;

-- 治理 osg_job_application.current_stage 历史脏数据：
-- 新 6 状态字典：applied / interviewing / offer / rejected / withdraw / cancelled
-- T7 (commit e7fffec6) 仅清理了 osg_student_job_position_state 表，未处理 osg_job_application 表
-- 此处把所有面试阶段类旧值（hirevue/first/second/third/case/superday/screening 等）统一映射为 'interviewing'
-- 与 T7 在 26_osg_progress_stage_migration.sql 中对 osg_student_job_position_state 的处理保持一致

UPDATE osg_job_application
SET current_stage = 'interviewing'
WHERE current_stage IN (
  'hirevue',
  'screening',
  'first', 'first_round',
  'second', 'second_round',
  'third', 'third_round',
  'case', 'case_study',
  'superday'
);
