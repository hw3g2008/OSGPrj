-- =============================================================================
-- Migration: sys_user.user_name VARCHAR(30) → VARCHAR(64)
-- =============================================================================
-- Date     : 2026-04-25
-- Author   : OSG infra team
-- Ticket   : docs/bugs/2026-04-25-sys-user-name-length-fix-plan.md
-- Reason   : OSG 业务采用「邮箱即登录名」模型，业务表 osg_mentor.email / osg_assistant.email
--            等允许长度 ≤ 50 字符（DNS 实际邮箱可达 254）。但 ruoyi 上游默认
--            sys_user.user_name VARCHAR(30) 不足以容纳实际邮箱（如
--            test-lead-mentor@osg-test.local = 31 chars），导致 admin 端重置密码 /
--            编辑保存触发 INSERT INTO sys_user(...) 时 MysqlDataTruncation。
--
-- Impact   :
--   - DDL only (不修改业务数据)
--   - InnoDB 上 ALTER COLUMN VARCHAR 同字符集扩容一般 metadata-only 操作 (秒级)
--   - 同步更新 com.ruoyi.common.core.domain.entity.SysUser.@Size(max=64)
--   - 同步更新 deploy/mysql-init/00_ry_20250522.sql + sql/ry_20250522.sql 种子 schema
--
-- Rollback :
--   ALTER TABLE sys_user MODIFY COLUMN user_name VARCHAR(30) NOT NULL COMMENT '用户账号';
--   注意：若有 user_name > 30 字符的记录，回滚会失败 (Data truncation)
-- =============================================================================

ALTER TABLE sys_user
  MODIFY COLUMN user_name VARCHAR(64) NOT NULL COMMENT '用户账号';

-- 校验：列宽已生效
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'sys_user'
  AND COLUMN_NAME = 'user_name';
