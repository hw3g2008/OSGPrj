-- 2026-04-28 sys_user 测试账号去重清理
-- 关联 Bug 修复方案: docs/plans/2026-04-28-e2e-discovery-bugs-comprehensive-fix-plan.md (Bug #5)
-- 触发: E2E 跨端测试中发现 test-lead-mentor / test-assistant 等测试 email 在 sys_user 表存在多个 del_flag='0' 行
-- 风险: OsgIdentityResolver.resolveAccountByEmail 内部用 limit 1 查询 → 命中错误 user_id 时业务关联混乱
-- 策略: 软删除 (del_flag='2') 每组重复 email 中除最大 user_id 外的其他记录，保留最新创建账号

-- ============================================================
-- STEP 1: 现状快照（执行前必跑）
-- ============================================================
-- 期望输出：列出所有重复 email 与对应 user_id 列表
SELECT email, GROUP_CONCAT(user_id ORDER BY user_id) AS user_ids, COUNT(*) AS dup_count
FROM sys_user
WHERE email LIKE 'test-%@osg-test.local'
  AND del_flag = '0'
GROUP BY email
HAVING COUNT(*) > 1;

-- ============================================================
-- STEP 2: 前置 verify — 保留的 max user_id 有有效角色关联
-- ============================================================
-- 期望：每个将要保留的 max user_id 都有 role_count > 0
-- 若 max user_id role_count = 0 但较小 user_id role_count > 0
--   → 停止执行 STEP 3，改为保留有角色关联的 user_id（手动调整 SQL）
SELECT u.user_id,
       u.email,
       u.user_name,
       COUNT(ur.role_id) AS role_count,
       u.create_time
FROM sys_user u
LEFT JOIN sys_user_role ur ON u.user_id = ur.user_id
WHERE u.email LIKE 'test-%@osg-test.local'
  AND u.del_flag = '0'
GROUP BY u.user_id, u.email, u.user_name, u.create_time
ORDER BY u.email, u.user_id DESC;

-- ============================================================
-- STEP 3: 软删除重复账号（仅在 STEP 2 通过后执行）
-- ============================================================
-- 软删除每组重复 email 中除最大 user_id 外的其他记录
-- del_flag='2' 是若依框架的"已删除"标记（'0'=正常，'1'=禁用，'2'=已删除）
UPDATE sys_user
SET del_flag = '2',
    update_time = NOW(),
    update_by = 'cleanup-2026-04-28',
    remark = CONCAT(IFNULL(remark, ''), ' [auto-cleanup-duplicate-2026-04-28]')
WHERE email LIKE 'test-%@osg-test.local'
  AND del_flag = '0'
  AND user_id NOT IN (
    SELECT max_id FROM (
      SELECT MAX(user_id) AS max_id
      FROM sys_user
      WHERE email LIKE 'test-%@osg-test.local'
        AND del_flag = '0'
      GROUP BY email
    ) t
  );

-- ============================================================
-- STEP 4: 验证
-- ============================================================
-- 期望：0 行返回
SELECT email, COUNT(*) AS remaining_count
FROM sys_user
WHERE email LIKE 'test-%@osg-test.local'
  AND del_flag = '0'
GROUP BY email
HAVING COUNT(*) > 1;

-- 期望：每个 test- email 仅 1 条 del_flag='0' 记录
SELECT email, user_id, user_name, status
FROM sys_user
WHERE email LIKE 'test-%@osg-test.local'
  AND del_flag = '0'
ORDER BY email;
