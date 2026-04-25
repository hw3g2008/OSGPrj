-- Restore snapshot for shared test/dev menu row 2013.
-- Captured at: 2026-04-14 23:05:02 +0800
-- Source: 47.94.213.128:23306 / ry-vue / sys_menu(menu_id=2013)
-- Linked role_ids at capture time: 1, 2, 4, 134

START TRANSACTION;

UPDATE sys_menu
SET menu_name = '基础数据管理',
    parent_id = 2001,
    order_num = 3,
    path = 'base-data',
    component = 'admin/permission/baseData/index',
    query = '',
    route_name = '',
    is_frame = 1,
    is_cache = 0,
    menu_type = 'C',
    visible = '0',
    status = '0',
    perms = 'admin:base-data:list',
    icon = '#',
    create_by = 'admin',
    create_time = '2026-03-08 15:28:31',
    update_by = '',
    update_time = NULL,
    remark = '基础数据管理菜单'
WHERE menu_id = 2013;

SELECT menu_id, menu_name, path, component, perms, remark
FROM sys_menu
WHERE menu_id = 2013;

COMMIT;
