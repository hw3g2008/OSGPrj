-- =============================================================================
-- Migration: osg_job_application.remark VARCHAR(255) → VARCHAR(2000)
-- =============================================================================
-- Date     : 2026-04-26
-- Author   : OSG infra team
-- Ticket   : 学生岗位"申请辅导"弹窗扩展模板（HireVue / 常规两套）
-- Reason   : StudentPositionController.coaching 新 overload 通过
--            buildManualPositionRemark 把扩展字段（hirevueType / viLink|otLink+
--            otAccount+otPassword / hirevueDeadline / inviteScreenshot / mentorHelp /
--            interviewTime / mentorCount / preferMentor / excludeMentor / note）
--            序列化为多行 key=value 文本写入 osg_job_application.remark。
--
--            HireVue OT 完整模板序列化文本约 269 字符（最小测试样本），
--            真实场景含 100+ 字符的 HireVue URL + 自由 note，容易突破 255 限制。
--            实际触发 MysqlDataTruncation: Data too long for column 'remark'
--            导致 POST /student/position/coaching 返回 500。
--
--            参照 osg_student_position.remark VARCHAR(500) 的设计，本次扩到
--            VARCHAR(2000) 给充足余量，覆盖 HireVue + 长 URL + 长 note 场景。
--
-- Impact   :
--   - DDL only (不修改业务数据)
--   - InnoDB 上 ALTER COLUMN VARCHAR 同字符集扩容一般 metadata-only 操作 (秒级)
--   - 同步更新 sql/osg_job_application_init.sql + deploy/mysql-init/14_osg_job_application_init.sql
--   - 由于 deploy/mysql-init 有 manifest.sha256 校验，需要重算 14 号种子的 hash
--
-- Rollback :
--   ALTER TABLE osg_job_application MODIFY COLUMN remark VARCHAR(255) NULL;
--   注意：若已有 remark > 255 字符的记录，回滚会失败 (Data truncation)
-- =============================================================================

ALTER TABLE osg_job_application
  MODIFY COLUMN remark VARCHAR(2000) NULL;

-- 校验：列宽已生效
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'osg_job_application'
  AND COLUMN_NAME = 'remark';
