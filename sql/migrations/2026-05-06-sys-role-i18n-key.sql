-- ============================================================================
-- Commit C: sys_role i18n key columns.
--
-- Adds `i18n_key` and `remark_i18n_key` columns to `sys_role` so the admin
-- frontend can translate system role names and descriptions while leaving
-- user-defined roles untouched (NULL keys fall back to raw role_name/remark).
--
-- Idempotent: safe to re-run. Uses information_schema guards so column
-- additions and seed UPDATEs only run when needed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Add `i18n_key` column if absent.
-- ----------------------------------------------------------------------------
SET @has_i18n_key := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'sys_role'
      AND COLUMN_NAME  = 'i18n_key'
);
SET @sql_add_i18n_key := IF(
    @has_i18n_key = 0,
    "ALTER TABLE sys_role ADD COLUMN i18n_key VARCHAR(64) NULL COMMENT 'stable i18n key for role_name display; NULL = user-defined role, render role_name as-is' AFTER role_name",
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_i18n_key;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 2) Add `remark_i18n_key` column if absent.
-- ----------------------------------------------------------------------------
SET @has_remark_i18n_key := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'sys_role'
      AND COLUMN_NAME  = 'remark_i18n_key'
);
SET @sql_add_remark_i18n_key := IF(
    @has_remark_i18n_key = 0,
    "ALTER TABLE sys_role ADD COLUMN remark_i18n_key VARCHAR(64) NULL COMMENT 'stable i18n key for remark display; NULL = user-defined role, render remark as-is'",
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_remark_i18n_key;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 3) Backfill i18n keys for stable system roles. Keyed on role_key to remain
--    idempotent and avoid touching user-defined roles. del_flag='0' filters
--    out soft-deleted autotest / sandbox rows.
-- ----------------------------------------------------------------------------
UPDATE sys_role
   SET i18n_key        = 'role_super_admin',
       remark_i18n_key = 'role_super_admin_desc'
 WHERE role_key = 'super_admin' AND del_flag = '0';

UPDATE sys_role
   SET i18n_key        = 'role_clerk',
       remark_i18n_key = 'role_clerk_desc'
 WHERE role_key = 'clerk' AND del_flag = '0';

UPDATE sys_role
   SET i18n_key        = 'role_course_auditor',
       remark_i18n_key = 'role_course_auditor_desc'
 WHERE role_key = 'course_auditor' AND del_flag = '0';

UPDATE sys_role
   SET i18n_key        = 'role_accountant',
       remark_i18n_key = 'role_accountant_desc'
 WHERE role_key = 'accountant' AND del_flag = '0';

UPDATE sys_role
   SET i18n_key        = 'role_position_admin',
       remark_i18n_key = 'role_position_admin_desc'
 WHERE role_key = 'position_admin' AND del_flag = '0';

UPDATE sys_role
   SET i18n_key        = 'role_file_admin',
       remark_i18n_key = 'role_file_admin_desc'
 WHERE role_key = 'file_admin' AND del_flag = '0';

UPDATE sys_role
   SET i18n_key        = 'role_online_quiz_admin',
       remark_i18n_key = 'role_online_quiz_admin_desc'
 WHERE role_key = 'online_quiz_admin' AND del_flag = '0';

UPDATE sys_role
   SET i18n_key        = 'role_interview_admin',
       remark_i18n_key = 'role_interview_admin_desc'
 WHERE role_key = 'interview_admin' AND del_flag = '0';

UPDATE sys_role
   SET i18n_key        = 'role_expense_auditor',
       remark_i18n_key = 'role_expense_auditor_desc'
 WHERE role_key = 'expense_auditor' AND del_flag = '0';
