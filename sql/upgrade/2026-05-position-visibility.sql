SET NAMES utf8mb4;

-- ============================================
-- 岗位可见性规则升级脚本
-- Story: S-055 / Ticket: T-247
-- 关联文档:
--   PRD: osg-spec-docs/docs/01-product/prd/career-position-visibility/position-visibility-rules.md
--   SRS: osg-spec-docs/docs/02-requirements/srs/career-position-visibility.md
--   开发文档: 2026-04-29-position-visibility-rules-dev.md (v3)
--
-- 业务方决策（2026-05-01 Q1=D）：本脚本不归一化 osg_student/osg_staff.major_direction
-- 中的大写历史值。字典化上线后由学生重新填写 profile 完成数据自然对齐。
-- ============================================

-- 1) 岗位表新增 target_majors（对应学生主攻方向，多选 dict_value 逗号分隔）
ALTER TABLE osg_position
  ADD COLUMN target_majors VARCHAR(255) NOT NULL DEFAULT ''
  COMMENT '对应学生主攻方向（多选 dict_value，逗号分隔，参考 osg_major_direction 字典）'
  AFTER recruitment_cycle;

-- 2) 学员表三字段单值升级为多值（VARCHAR(255) 多值逗号分隔）
ALTER TABLE osg_student
  MODIFY COLUMN major_direction   VARCHAR(255) DEFAULT NULL COMMENT '主攻方向（多选 dict_value，逗号分隔）';

ALTER TABLE osg_student
  MODIFY COLUMN target_region     VARCHAR(255) DEFAULT NULL COMMENT '求职地区（多选大区，逗号分隔）';

ALTER TABLE osg_student
  MODIFY COLUMN recruitment_cycle VARCHAR(255) DEFAULT NULL COMMENT '招聘周期（多选，逗号分隔）';
