-- osg_specialty / osg_rating: 导师档案扩展字典（擅长 / 评级）
-- 用途：导师表单 / 详情 / 列表新增 specialty 与 rating 两字段，取值由字典驱动
-- 命名约定：避开 DictFacadeController 的 osg_mentor_ 黑名单，使用 osg_ 前缀
-- 分组：挂到 "求职相关 (job)" 大标签下，与现有 osg_job_category / osg_company_* 等同组
-- 主机：47.94.213.128:23306，库：ry-vue，用户名：ruoyi，密码：app123456

-- 1. 字典类型（含 remark 元数据，注册到 job 分类下）
INSERT INTO sys_dict_type (dict_name, dict_type, status, create_by, create_time, remark)
VALUES ('擅长', 'osg_specialty', '0', 'admin', NOW(),
        '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false}')
ON DUPLICATE KEY UPDATE dict_name = VALUES(dict_name), status = '0', remark = VALUES(remark), update_time = NOW();

INSERT INTO sys_dict_type (dict_name, dict_type, status, create_by, create_time, remark)
VALUES ('评级', 'osg_rating', '0', 'admin', NOW(),
        '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false}')
ON DUPLICATE KEY UPDATE dict_name = VALUES(dict_name), status = '0', remark = VALUES(remark), update_time = NOW();

-- 2. osg_rating 默认值（初/中/高/资深，运营可在字典管理页继续编辑）
-- 注意：sys_dict_data 仅 dict_code 为 PK，无 (dict_type, dict_value) 唯一索引，
-- ON DUPLICATE KEY UPDATE 不会命中。为保证 migration 可重跑，先按 dict_type 清空再插入。
-- osg_specialty 由运营录入，绝不能在此 DELETE。
DELETE FROM sys_dict_data WHERE dict_type = 'osg_rating';

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES
  (10, '初级', 'junior', 'osg_rating', 'N', '0', 'admin', NOW()),
  (20, '中级', 'middle', 'osg_rating', 'N', '0', 'admin', NOW()),
  (30, '高级', 'senior', 'osg_rating', 'N', '0', 'admin', NOW()),
  (40, '资深', 'expert', 'osg_rating', 'N', '0', 'admin', NOW());

-- 3. osg_specialty 不预置数据，由运营在字典管理页按业务节奏录入
