SET NAMES utf8mb4;

-- 求职状态字典从 8 项替换为 5 项：applied/interviewing/offer/rejected/withdraw
-- 旧值 hirevue/first/second/case 全部映射为 interviewing
-- PositionServiceImpl.PROGRESS_STAGE_SEEDS 启动时会 upsert 新 5 项；本脚本负责清旧

-- 1. 学生×岗位状态表：进度阶段值映射
UPDATE osg_student_job_position_state
SET progress_stage = 'interviewing'
WHERE progress_stage IN ('hirevue', 'first', 'second', 'case');

-- 2. 字典：删除已废弃的 4 项（PROGRESS_STAGE_SEEDS 启动时会重新 seed 新 5 项）
DELETE FROM sys_dict_data
WHERE dict_type = 'osg_student_position_progress_stage'
  AND dict_value IN ('hirevue', 'first', 'second', 'case');
