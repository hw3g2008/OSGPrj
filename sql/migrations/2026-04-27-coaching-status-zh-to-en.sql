-- ============================================================
-- Migration: coachingStatus 中文 → 英文 enum 数据迁移
-- Date:      2026-04-27
-- Ticket:    五端辅导主链状态机收口（F2）
--
-- 背景：osg_job_application.coaching_status 与 osg_coaching.status
--       存量数据存在中文值（"辅导中" / "已完成" / "已取消"）。
--       本轮收口要求字段值统一为英文 enum：
--       - pending / assigned / coaching / completed / cancelled
--
-- 变更：
--   1. osg_job_application.coaching_status：中文 → 英文，NULL → 'none'
--   2. osg_coaching.status：中文 → 英文
--
-- 注意：
--   - 必须先备份：mysqldump 导出 osg_job_application + osg_coaching 两张表
--   - 必须低峰期窗口执行
--   - 必须先在测试库 dry-run + 跑回归测试
-- 回滚：备份表恢复
-- ============================================================

-- 1. osg_job_application.coaching_status：中文 → 英文 enum
UPDATE osg_job_application SET coaching_status = 'coaching'  WHERE coaching_status = '辅导中';
UPDATE osg_job_application SET coaching_status = 'completed' WHERE coaching_status IN ('已完成', '完成');
UPDATE osg_job_application SET coaching_status = 'cancelled' WHERE coaching_status IN ('已取消', '取消');

-- 2. coaching_status：NULL 归一为 'none'（避免与设计稿 §7.1 不一致）
UPDATE osg_job_application SET coaching_status = 'none' WHERE coaching_status IS NULL;

-- 3. osg_coaching.status：中文 → 英文 enum
UPDATE osg_coaching SET status = 'coaching'  WHERE status = '辅导中';
UPDATE osg_coaching SET status = 'completed' WHERE status IN ('已完成', '完成');
UPDATE osg_coaching SET status = 'cancelled' WHERE status IN ('已取消', '取消');
UPDATE osg_coaching SET status = 'pending'   WHERE status IN ('待审批', '待分配');

-- 4. 核对：所有 status 字段是否仍存在中文值
SELECT 'osg_job_application_zh_remaining' AS check_name, COUNT(*) AS cnt
FROM osg_job_application
WHERE coaching_status IN ('辅导中', '已完成', '完成', '已取消', '取消', '待审批', '待分配')
   OR coaching_status IS NULL;

SELECT 'osg_coaching_zh_remaining' AS check_name, COUNT(*) AS cnt
FROM osg_coaching
WHERE status IN ('辅导中', '已完成', '完成', '已取消', '取消', '待审批', '待分配');

-- 5. 核对：所有 status 字段值分布
SELECT 'osg_job_application_dist' AS table_name, coaching_status, COUNT(*) AS cnt
FROM osg_job_application
GROUP BY coaching_status;

SELECT 'osg_coaching_dist' AS table_name, status, COUNT(*) AS cnt
FROM osg_coaching
GROUP BY status;
