SET NAMES utf8mb4;

-- 修复历史脏数据：旧 deleteMainApplicationIfPresent 写入 'withdrawn'（多一个 n，与字典 value 不一致）
-- 现统一为 'cancelled'，与 PROGRESS_STAGE_SEEDS 第 6 项 `cancelled / 取消投递` 对齐
UPDATE osg_job_application
SET current_stage = 'cancelled'
WHERE current_stage = 'withdrawn';
