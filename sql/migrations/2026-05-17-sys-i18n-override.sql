-- ============================================================================
-- sys_i18n_override : business-editable i18n overrides
--
-- Purpose: Allow ops/business to override frontend i18n strings without a
-- frontend redeploy. Frontend boot fetches /system/i18n/manifest?lang=<lang>
-- and applies via vue-i18n#mergeLocaleMessage.
--
-- key_path uses dot notation matching the merged messages tree, e.g.
--   - "dictText.coaching_type.interview"
--   - "admin.dict.dict_data_student_class_records_coaching_type_268"
--   - "student.courses.tableHeaders.recordId"
--
-- Idempotent: table create is guarded by information_schema.
-- ============================================================================

SET @has_table := (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'sys_i18n_override'
);
SET @sql_create := IF(
    @has_table = 0,
    "CREATE TABLE sys_i18n_override (
        id          BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'PK',
        lang        VARCHAR(8)   NOT NULL                COMMENT 'locale code, e.g. zh / en',
        key_path    VARCHAR(256) NOT NULL                COMMENT 'dot-notation key path into i18n messages tree',
        value       TEXT         NOT NULL                COMMENT 'translated text; replaces bundled value',
        scope       VARCHAR(32)  NULL                    COMMENT 'optional top-level grouping (admin/student/dictText/...)',
        remark      VARCHAR(255) NULL                    COMMENT 'business note',
        create_by   VARCHAR(64)  NULL,
        create_time DATETIME     NULL,
        update_by   VARCHAR(64)  NULL,
        update_time DATETIME     NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_lang_key (lang, key_path),
        KEY idx_scope (scope)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='business-editable i18n overrides'",
    'SELECT 1'
);
PREPARE stmt FROM @sql_create;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
