-- 学生账号状态机重构（批次 7 + 7.5）
-- 出处：docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.7
--
-- 把 osg_student.account_status 的「冻结(1)」拆出为独立 boolean flag osg_student.frozen，
-- account_status 仅保留 lifecycle 三态：0 正常 / 2 合同结束 / 3 退费。
--
-- 历史 account_status='1' 的学员：
--   account_status='1'  →  account_status='0' + frozen=1
-- 含义不变：lifecycle 是正常的，仅是被独立冻结。

-- 1. 加 frozen 列（独立标记，默认 0 / 未冻结）—— 幂等：列已存在则跳过
SET @col_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_student'
      AND COLUMN_NAME = 'frozen'
);
SET @stmt := IF(
    @col_exists = 0,
    'ALTER TABLE osg_student ADD COLUMN frozen TINYINT NOT NULL DEFAULT 0 COMMENT ''是否冻结（独立标记 0=未冻结 1=已冻结，与 account_status 维度正交）''',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 2. 历史脏数据迁移：account_status='1' 的学员翻译为 account_status='0' + frozen=1
UPDATE osg_student
SET frozen = 1,
    account_status = '0'
WHERE account_status = '1';

-- 3. 索引（按 frozen 过滤的场景：登录拦截、列表筛选）—— 幂等：索引已存在则跳过
SET @idx_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'osg_student'
      AND INDEX_NAME = 'idx_osg_student_frozen'
);
SET @stmt := IF(
    @idx_exists = 0,
    'CREATE INDEX idx_osg_student_frozen ON osg_student (frozen)',
    'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 4. 校验：列在 / 索引在 / status='1' 为 0
SELECT 'frozen column added' AS info,
       (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'osg_student' AND COLUMN_NAME = 'frozen') AS column_count,
       (SELECT COUNT(*) FROM osg_student WHERE account_status = '1') AS legacy_status_1_count,
       (SELECT COUNT(*) FROM osg_student WHERE frozen = 1) AS frozen_count;
