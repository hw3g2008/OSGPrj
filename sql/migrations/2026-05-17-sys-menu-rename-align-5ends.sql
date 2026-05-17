-- 2026-05-17-sys-menu-rename-align-5ends.sql
--
-- 背景：
--   admin sidebar 菜单从 sys_menu 表动态读，与 assistant/lead-mentor/mentor/student
--   四个前端 i18n 静态菜单名进行对齐审计，发现 3 处命名不一致。
--
-- 处置（用户决策 2026-05-17）：
--   1. menu_id=2014 「学生列表」→「学员列表」 (assistant/lead-mentor 已用 "学员")
--   2. menu_id=2031 「消息管理」→「消息」 (4 个端 i18n 统一用 "消息")
--   3. menu_id=2002 「用户中心」→「学员中心」 (lead-mentor 用 "学员中心")
--
-- 安全性：
--   - 仅 UPDATE menu_name，不动 path / component / perms / order_num
--   - WHERE 双重锁定 menu_id + 旧 menu_name，防止误改

UPDATE sys_menu SET menu_name = '学员列表' WHERE menu_id = 2014 AND menu_name = '学生列表';
UPDATE sys_menu SET menu_name = '消息'     WHERE menu_id = 2031 AND menu_name = '消息管理';
UPDATE sys_menu SET menu_name = '学员中心' WHERE menu_id = 2002 AND menu_name = '用户中心';
