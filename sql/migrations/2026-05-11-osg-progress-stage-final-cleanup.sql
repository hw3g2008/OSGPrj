SET NAMES utf8mb4;

-- 求职状态字典 (osg_student_position_progress_stage) 终态收口为 6 项：
--   applied / interviewing / offer / rejected / withdraw / cancelled
-- label：已投递 / 面试中 / 已录用 / 被拒绝 / 主动放弃 / 取消投递
--
-- 背景：
--   - 26_osg_progress_stage_migration.sql 仅在 docker 初始化目录，新装库才会跑；
--     本地/已存在库可能未应用，导致 sys_dict_data 仍残留旧 8 项 (hirevue/first/second/case/screening 等)。
--   - 2026-05-10-osg-job-application-stage-cleanup.sql 仅清理 osg_job_application；
--     osg_student_job_position_state 由 26 号脚本负责，可能两边都漏跑。
--   - 本次又把 dict_label "拿到offer" 改为 "已录用"，需要强制刷新已存在 sys_dict_data 行。
--
-- 本脚本幂等，可重复执行。

-- 1. 业务表脏值映射：osg_student_job_position_state.progress_stage
UPDATE osg_student_job_position_state
SET progress_stage = 'interviewing'
WHERE progress_stage IN (
  'hirevue',
  'screening',
  'first', 'first_round',
  'second', 'second_round',
  'third', 'third_round',
  'case', 'case_study',
  'superday'
);

-- 2. 业务表脏值映射：osg_job_application.current_stage (兼容此前两个 migration 漏跑场景)
UPDATE osg_job_application
SET current_stage = 'interviewing'
WHERE current_stage IN (
  'hirevue',
  'screening',
  'first', 'first_round',
  'second', 'second_round',
  'third', 'third_round',
  'case', 'case_study',
  'superday'
);

-- 历史脏数据 'withdrawn'（多 n，非字典值）映射为 'cancelled' (兼容 2026-05-10-osg-job-application-cancelled-stage.sql 漏跑)
UPDATE osg_job_application
SET current_stage = 'cancelled'
WHERE current_stage = 'withdrawn';

UPDATE osg_student_job_position_state
SET progress_stage = 'cancelled'
WHERE progress_stage = 'withdrawn';

-- 3. 字典 label 强更：拿到offer → 已录用 (本次需求：纯中文，便于后续 i18n)
UPDATE sys_dict_data
SET dict_label = '已录用',
    update_by = 'migration-2026-05-11',
    update_time = NOW()
WHERE dict_type = 'osg_student_position_progress_stage'
  AND dict_value = 'offer'
  AND dict_label <> '已录用';

-- 4. 字典清理：删除白名单外的所有旧 value
--    白名单 = applied / interviewing / offer / rejected / withdraw / cancelled
DELETE FROM sys_dict_data
WHERE dict_type = 'osg_student_position_progress_stage'
  AND dict_value NOT IN ('applied', 'interviewing', 'offer', 'rejected', 'withdraw', 'cancelled');

-- 5. 注册 dict_type 到 sys_dict_type，使 admin 字典管理「求职相关」分组下能看到「求职状态」tab
--    其它分组与 dict_type 一概不动，仅注册本条
INSERT INTO sys_dict_type (dict_name, dict_type, status, remark, create_by, create_time)
SELECT '求职状态', 'osg_student_position_progress_stage', '0',
       '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false,"tabOrder":50}',
       'migration-2026-05-11', NOW()
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM sys_dict_type WHERE dict_type = 'osg_student_position_progress_stage'
);

-- 若已存在但 remark 未配置 groupKey/groupLabel，强制刷新 remark
UPDATE sys_dict_type
SET remark = '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false,"tabOrder":50}',
    update_by = 'migration-2026-05-11',
    update_time = NOW()
WHERE dict_type = 'osg_student_position_progress_stage'
  AND (remark IS NULL OR remark NOT LIKE '%groupKey%');

-- 6. 去重：sys_dict_data 同 (dict_type, dict_value) 多行重复 → 保留 dict_code 最小一行
DELETE d FROM sys_dict_data d
JOIN (
  SELECT dict_value, MIN(dict_code) AS keep_id
  FROM sys_dict_data
  WHERE dict_type = 'osg_student_position_progress_stage'
  GROUP BY dict_value
  HAVING COUNT(*) > 1
) k ON d.dict_value = k.dict_value AND d.dict_code <> k.keep_id
WHERE d.dict_type = 'osg_student_position_progress_stage';

-- 7. label / dict_sort / list_class 强对齐 PROGRESS_STAGE_SEEDS（包括 rejected 旧 label「已拒绝」→「被拒绝」）
UPDATE sys_dict_data SET dict_label='已投递', dict_sort=1, list_class='blue',    update_by='migration-2026-05-11', update_time=NOW() WHERE dict_type='osg_student_position_progress_stage' AND dict_value='applied';
UPDATE sys_dict_data SET dict_label='面试中', dict_sort=2, list_class='orange',  update_by='migration-2026-05-11', update_time=NOW() WHERE dict_type='osg_student_position_progress_stage' AND dict_value='interviewing';
UPDATE sys_dict_data SET dict_label='已录用', dict_sort=3, list_class='green',   update_by='migration-2026-05-11', update_time=NOW() WHERE dict_type='osg_student_position_progress_stage' AND dict_value='offer';
UPDATE sys_dict_data SET dict_label='被拒绝', dict_sort=4, list_class='red',     update_by='migration-2026-05-11', update_time=NOW() WHERE dict_type='osg_student_position_progress_stage' AND dict_value='rejected';
UPDATE sys_dict_data SET dict_label='主动放弃', dict_sort=5, list_class='default', update_by='migration-2026-05-11', update_time=NOW() WHERE dict_type='osg_student_position_progress_stage' AND dict_value='withdraw';
UPDATE sys_dict_data SET dict_label='取消投递', dict_sort=6, list_class='default', update_by='migration-2026-05-11', update_time=NOW() WHERE dict_type='osg_student_position_progress_stage' AND dict_value='cancelled';

-- 8. 补齐缺失项 interviewing / cancelled（旧数据库 seed 跑过但缺这两项）
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT 2, '面试中', 'interviewing', 'osg_student_position_progress_stage', NULL, 'orange', 'N', '0', 'migration-2026-05-11', NOW(), '求职状态'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type='osg_student_position_progress_stage' AND dict_value='interviewing');

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, remark)
SELECT 6, '取消投递', 'cancelled', 'osg_student_position_progress_stage', NULL, 'default', 'N', '0', 'migration-2026-05-11', NOW(), '求职状态'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type='osg_student_position_progress_stage' AND dict_value='cancelled');
