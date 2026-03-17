SET NAMES utf8mb4;

-- ============================================
-- OSG 岗位管理表初始化 SQL
-- Ticket: T-111
-- 说明: 创建岗位主表，支撑岗位列表、下钻视图、CRUD、批量上传去重与导出
-- 幂等: 使用 CREATE TABLE IF NOT EXISTS，可重复执行
-- ============================================

CREATE TABLE IF NOT EXISTS osg_position (
  position_id          BIGINT         NOT NULL AUTO_INCREMENT COMMENT '岗位ID',
  position_category    VARCHAR(32)    NOT NULL COMMENT '岗位分类(summer/fulltime/offcycle/spring/events)',
  industry             VARCHAR(64)    NOT NULL COMMENT '行业分类(Investment Bank/Consulting/Tech/PE/VC/Other)',
  company_name         VARCHAR(128)   NOT NULL COMMENT '公司名称',
  company_type         VARCHAR(64)    NOT NULL COMMENT '公司类别',
  company_website      VARCHAR(255)   DEFAULT NULL COMMENT '公司官网',
  position_name        VARCHAR(128)   NOT NULL COMMENT '岗位名称',
  department           VARCHAR(128)   DEFAULT NULL COMMENT '部门',
  region               VARCHAR(32)    NOT NULL COMMENT '大区(na/eu/ap/cn)',
  city                 VARCHAR(64)    NOT NULL COMMENT '城市',
  recruitment_cycle    VARCHAR(64)    NOT NULL COMMENT '招聘周期(可多值逗号分隔)',
  project_year         VARCHAR(16)    NOT NULL COMMENT '项目时间/年份',
  publish_time         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  deadline             DATETIME       DEFAULT NULL COMMENT '截止时间',
  display_status       VARCHAR(16)    NOT NULL DEFAULT 'visible' COMMENT '展示状态(visible/hidden/expired)',
  display_start_time   DATETIME       NOT NULL COMMENT '展示开始时间',
  display_end_time     DATETIME       NOT NULL COMMENT '展示结束时间',
  position_url         VARCHAR(255)   DEFAULT NULL COMMENT '岗位链接',
  application_note     VARCHAR(500)   DEFAULT NULL COMMENT '投递备注',
  create_by            VARCHAR(64)    DEFAULT '' COMMENT '创建者',
  create_time          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by            VARCHAR(64)    DEFAULT '' COMMENT '更新者',
  update_time          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  remark               VARCHAR(500)   DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (position_id),
  UNIQUE KEY uk_osg_position_dedup (company_name, position_name, region, city, project_year),
  KEY idx_osg_position_industry (industry),
  KEY idx_osg_position_company (company_name),
  KEY idx_osg_position_status (display_status),
  KEY idx_osg_position_publish_time (publish_time),
  KEY idx_osg_position_cycle (recruitment_cycle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OSG岗位信息表';
