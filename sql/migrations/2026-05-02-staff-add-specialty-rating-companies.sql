-- ============================================================
-- Migration: osg_staff 新增 3 列（导师档案扩展）
-- Date:      2026-05-02
-- SRS:       osg-spec-docs/docs/02-requirements/srs/mentor-profile-extension.md
-- 主机：47.94.213.128:23306，库：ry-vue，用户名：ruoyi，密码：app123456
--
-- 背景：导师档案在主攻方向 / 子方向 / 课程类型之外，新增 3 个维度：
--   - specialty 擅长（多选 osg_specialty 字典，CSV 存 dictCode，≤20）
--   - rating    评级（单选 osg_rating 字典，存 dictCode）
--   - companies 任职公司（行业→公司两级联动，CSV 存 osg_company_name.dictValue，≤10）
--
-- 长度依据：
--   specialty / companies CSV 上限分别 20 / 10 项；按典型 dictCode 长度
--   20 字符估算 + 分隔符冗余 → 512 足够。
--   rating 单值 dictCode（如 'junior'/'middle'/'senior'/'expert'）→ 64 足够。
--
-- 索引：
--   仅给 rating 加 idx 用于 GET /staff?sort=rating,desc 列表排序（SRS §4.3）。
--   specialty / companies 二期才支持筛选，目前不加索引省 IO。
--
-- 角色脱敏：rating 字段读写权限由 backend DTO + service 层控制（SRS §4.1/§4.2），
--   DB 层不做行级安全。
--
-- 回滚：
--   ALTER TABLE osg_staff
--     DROP COLUMN specialty,
--     DROP COLUMN companies,
--     DROP COLUMN rating,
--     DROP INDEX idx_osg_staff_rating;
-- ============================================================

ALTER TABLE osg_staff
    ADD COLUMN specialty VARCHAR(512) DEFAULT NULL COMMENT '擅长(逗号分隔字典value，最多20)' AFTER course_types,
    ADD COLUMN companies VARCHAR(512) DEFAULT NULL COMMENT '任职公司(逗号分隔字典value，最多10)' AFTER specialty,
    ADD COLUMN rating    VARCHAR(64)  DEFAULT NULL COMMENT '评级(字典value)'                AFTER hourly_rate;

CREATE INDEX idx_osg_staff_rating ON osg_staff (rating);

-- 核对：迁移后 3 列存在性 + rating 索引
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'osg_staff'
  AND COLUMN_NAME IN ('specialty', 'companies', 'rating')
ORDER BY ORDINAL_POSITION;

SELECT INDEX_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'osg_staff'
  AND INDEX_NAME = 'idx_osg_staff_rating';
