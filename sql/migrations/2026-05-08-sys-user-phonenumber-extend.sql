-- =============================================================================
-- Migration: sys_user.phonenumber VARCHAR(11) → VARCHAR(32)
-- =============================================================================
-- Date     : 2026-05-08
-- Author   : OSG infra team
-- Reason   : OSG admin 端「新增导师」表单使用 joinPhone(countryCode, number) 输出
--            形如 "+86 13001985588"（15 字符）的国际化手机号；OsgStaffServiceImpl
--            #ensureStaffAccount 直接 setPhonenumber(staff.phone) 写入 sys_user，
--            触发 MysqlDataTruncation: Data too long for column 'phonenumber'。
--            业务表 osg_staff.phone 已是 VARCHAR(32)；将 sys_user.phonenumber 对齐
--            到 32，杜绝 ruoyi 上游默认列宽不足的同类故障。
--
-- Impact   :
--   - DDL only（不修改业务数据）
--   - InnoDB 上 ALTER COLUMN VARCHAR 同字符集扩容一般 metadata-only（秒级）
--   - 同步更新 com.ruoyi.common.core.domain.entity.SysUser.@Size(max=32)
--   - 同步更新 deploy/mysql-init/00_ry_20250522.sql + sql/ry_20250522.sql
--
-- Rollback :
--   ALTER TABLE sys_user MODIFY COLUMN phonenumber VARCHAR(11) DEFAULT '' COMMENT '手机号码';
--   注意：若有 phonenumber > 11 字符的记录，回滚会失败 (Data truncation)
-- =============================================================================

ALTER TABLE sys_user
  MODIFY COLUMN phonenumber VARCHAR(32) DEFAULT '' COMMENT '手机号码';

-- 校验：列宽已生效
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  CHARACTER_MAXIMUM_LENGTH
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'sys_user'
  AND COLUMN_NAME = 'phonenumber';
