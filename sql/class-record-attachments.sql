-- 课程记录附件表
CREATE TABLE IF NOT EXISTS osg_class_record_attachment (
    attachment_id   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    record_id       BIGINT       NOT NULL                COMMENT '关联 osg_class_record.record_id',
    file_name       VARCHAR(255) NULL                    COMMENT '原始文件名',
    file_path       VARCHAR(500) NULL                    COMMENT '存储路径（/common/upload 返回的 fileName）',
    file_size       BIGINT       NULL                    COMMENT '文件大小(bytes)',
    file_type       VARCHAR(50)  NULL                    COMMENT 'MIME 类型',
    attachment_tag  VARCHAR(50)  NULL                    COMMENT '附件标签: original_resume / updated_resume / other',
    create_time     DATETIME     NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    create_by       VARCHAR(64)  NULL                    COMMENT '上传人',
    PRIMARY KEY (attachment_id),
    INDEX idx_attachment_record_id (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程记录附件表';

-- 课程记录表新增 student_position_id 列
ALTER TABLE osg_class_record ADD COLUMN student_position_id BIGINT NULL COMMENT '学员岗位ID，关联 osg_student_position.student_position_id';
