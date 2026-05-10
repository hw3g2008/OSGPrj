SET @idx_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_coaching'
      AND INDEX_NAME = 'idx_coaching_application'
);
SET @stmt := IF(
    @idx_exists = 0,
    'CREATE INDEX idx_coaching_application ON osg_coaching (application_id)',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @uk_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_coaching'
      AND INDEX_NAME = 'uk_coaching_application'
);
SET @stmt := IF(
    @uk_exists > 0,
    'ALTER TABLE osg_coaching DROP INDEX uk_coaching_application',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'osg_coaching'
  AND COLUMN_NAME = 'application_id'
ORDER BY INDEX_NAME;
