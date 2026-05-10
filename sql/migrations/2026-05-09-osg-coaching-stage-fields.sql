SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_coaching'
      AND COLUMN_NAME = 'interview_stage'
);
SET @stmt := IF(@col_exists = 0,
    'ALTER TABLE osg_coaching ADD COLUMN interview_stage VARCHAR(64) NULL AFTER student_id',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_coaching'
      AND COLUMN_NAME = 'interview_time'
);
SET @stmt := IF(@col_exists = 0,
    'ALTER TABLE osg_coaching ADD COLUMN interview_time DATETIME NULL AFTER interview_stage',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_coaching'
      AND COLUMN_NAME = 'city'
);
SET @stmt := IF(@col_exists = 0,
    'ALTER TABLE osg_coaching ADD COLUMN city VARCHAR(64) NULL AFTER interview_time',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_coaching'
      AND COLUMN_NAME = 'company_interviewer'
);
SET @stmt := IF(@col_exists = 0,
    'ALTER TABLE osg_coaching ADD COLUMN company_interviewer VARCHAR(128) NULL AFTER city',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_coaching'
      AND COLUMN_NAME = 'requested_mentor_count'
);
SET @stmt := IF(@col_exists = 0,
    'ALTER TABLE osg_coaching ADD COLUMN requested_mentor_count INT NULL AFTER company_interviewer',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_coaching'
      AND COLUMN_NAME = 'request_note'
);
SET @stmt := IF(@col_exists = 0,
    'ALTER TABLE osg_coaching ADD COLUMN request_note VARCHAR(1000) NULL AFTER requested_mentor_count',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'osg_coaching'
  AND COLUMN_NAME IN ('interview_stage', 'interview_time', 'city', 'company_interviewer', 'requested_mentor_count', 'request_note')
ORDER BY FIELD(COLUMN_NAME, 'interview_stage', 'interview_time', 'city', 'company_interviewer', 'requested_mentor_count', 'request_note');
