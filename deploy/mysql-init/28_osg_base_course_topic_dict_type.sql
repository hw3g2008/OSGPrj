SET NAMES utf8mb4;

INSERT INTO sys_dict_type (dict_name, dict_type, status, remark, create_by, create_time)
SELECT '基础课题目', 'osg_base_course_topic', '0',
       '{"groupKey":"course","groupLabel":"课程相关","icon":"mdi-book","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":40,"hasParent":false}',
       'admin', sysdate()
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'osg_base_course_topic');

CREATE TABLE IF NOT EXISTS osg_admin_dict_registry (
  registry_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '登记ID',
  group_key VARCHAR(64) NOT NULL COMMENT '分组键',
  group_label VARCHAR(64) NOT NULL COMMENT '分组名称',
  dict_type VARCHAR(100) NOT NULL COMMENT '字典类型',
  dict_name VARCHAR(100) NOT NULL COMMENT '字典名称',
  sort_order INT DEFAULT 0 COMMENT '排序',
  icon VARCHAR(64) DEFAULT NULL COMMENT '图标',
  icon_color VARCHAR(32) DEFAULT NULL COMMENT '图标颜色',
  icon_bg VARCHAR(32) DEFAULT NULL COMMENT '图标背景',
  has_parent TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否有父级字典',
  parent_dict_type VARCHAR(100) DEFAULT NULL COMMENT '父级字典类型',
  status CHAR(1) DEFAULT '0' COMMENT '状态（0正常 1停用）',
  create_by VARCHAR(64) DEFAULT '' COMMENT '创建者',
  create_time DATETIME DEFAULT NULL COMMENT '创建时间',
  update_by VARCHAR(64) DEFAULT '' COMMENT '更新者',
  update_time DATETIME DEFAULT NULL COMMENT '更新时间',
  remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (registry_id),
  UNIQUE KEY uk_admin_dict_registry_type (dict_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Admin 字典登记表';

INSERT INTO osg_admin_dict_registry
  (group_key, group_label, dict_type, dict_name, sort_order, icon, icon_color, icon_bg, has_parent, parent_dict_type, status, create_by, create_time)
SELECT 'course', '课程相关', 'osg_base_course_topic', '基础课题目', 40,
       'mdi-book', '#3B82F6', '#DBEAFE', 0, NULL, '0', 'admin', sysdate()
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM osg_admin_dict_registry WHERE dict_type = 'osg_base_course_topic');
