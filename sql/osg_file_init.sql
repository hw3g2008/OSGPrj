CREATE TABLE IF NOT EXISTS osg_file (
    file_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '文件ID',
    file_name VARCHAR(128) NOT NULL COMMENT '文件/文件夹名称',
    file_type VARCHAR(32) NOT NULL COMMENT '类型: folder/pdf/word',
    class_name VARCHAR(64) NULL COMMENT '班级',
    file_size VARCHAR(32) NOT NULL DEFAULT '--' COMMENT '文件大小展示',
    auth_type VARCHAR(16) NOT NULL DEFAULT 'all' COMMENT '授权类型: all/class/user',
    create_by VARCHAR(64) NULL COMMENT '创建人',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by VARCHAR(64) NULL COMMENT '更新人',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remark VARCHAR(255) NULL COMMENT '备注'
) COMMENT='文件管理表';

CREATE TABLE IF NOT EXISTS osg_file_auth (
    auth_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '授权ID',
    file_id BIGINT NOT NULL COMMENT '文件ID',
    auth_type VARCHAR(16) NOT NULL COMMENT '授权类型: all/class/user',
    target_value VARCHAR(128) NULL COMMENT '授权目标值',
    target_label VARCHAR(128) NULL COMMENT '授权目标展示',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    CONSTRAINT fk_osg_file_auth_file_id FOREIGN KEY (file_id) REFERENCES osg_file(file_id) ON DELETE CASCADE
) COMMENT='文件授权表';

CREATE INDEX idx_osg_file_type ON osg_file(file_type);
CREATE INDEX idx_osg_file_class_name ON osg_file(class_name);
CREATE INDEX idx_osg_file_auth_file_id ON osg_file_auth(file_id);
