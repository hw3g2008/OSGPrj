-- 岗位信息修复方案 v6: 新增 deadline_text 字段
-- 用于存储非日期格式的截止时间描述（如 "Rolling ASAP"）
ALTER TABLE osg_position ADD COLUMN deadline_text VARCHAR(64) DEFAULT NULL COMMENT '截止时间文本描述(如Rolling ASAP)' AFTER deadline;
