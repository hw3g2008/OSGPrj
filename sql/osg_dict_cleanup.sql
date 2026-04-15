-- 岗位数据标准化 - 数据清理 + 菜单改名
-- 对应 position-fix-plan.md §3.2

-- 1. 删除 osg_company_name 旧的 6 条小写下划线数据
DELETE FROM sys_dict_data WHERE dict_code IN (411, 412, 413, 414, 415, 416);

-- 2. 删除 osg_company_type 第 1 批旧数据（小写下划线格式，2026-03-20 codex 创建）
DELETE FROM sys_dict_data WHERE dict_code IN (296, 297, 298, 299, 300, 301, 302);

-- 3. 删除 osg_company_type 重复的 PE/VC（dict_code=475，与 480 重复）
DELETE FROM sys_dict_data WHERE dict_code = 475;

-- 4. 统一现有环境中的字典管理菜单口径
UPDATE sys_menu
SET menu_name = '字典管理',
    path = 'dicts',
    component = 'admin/permission/dicts/index',
    perms = 'system:dict:list',
    remark = '字典管理菜单'
WHERE menu_id = 2013;
