SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS osg_job_application (
    application_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    position_id BIGINT NULL,
    student_name VARCHAR(64) NULL,
    company_name VARCHAR(128) NOT NULL,
    position_name VARCHAR(128) NOT NULL,
    region VARCHAR(32) NULL,
    city VARCHAR(64) NULL,
    current_stage VARCHAR(32) NOT NULL DEFAULT 'applied',
    interview_time DATETIME NULL,
    coaching_status VARCHAR(32) NULL,
    lead_mentor_id BIGINT NULL,
    lead_mentor_name VARCHAR(64) NULL,
    assign_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    requested_mentor_count INT NOT NULL DEFAULT 0,
    preferred_mentor_names VARCHAR(255) NULL,
    stage_updated TINYINT(1) NOT NULL DEFAULT 0,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by VARCHAR(64) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_by VARCHAR(64) NULL,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    remark VARCHAR(255) NULL,
    CONSTRAINT fk_job_application_student FOREIGN KEY (student_id) REFERENCES osg_student (student_id),
    CONSTRAINT fk_job_application_position FOREIGN KEY (position_id) REFERENCES osg_position (position_id)
);

CREATE INDEX idx_job_application_stage ON osg_job_application (current_stage);
CREATE INDEX idx_job_application_assign_status ON osg_job_application (assign_status);
CREATE INDEX idx_job_application_company ON osg_job_application (company_name);
CREATE INDEX idx_job_application_lead_mentor ON osg_job_application (lead_mentor_id);
CREATE INDEX idx_job_application_submitted_at ON osg_job_application (submitted_at);

CREATE TABLE IF NOT EXISTS osg_coaching (
    coaching_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    mentor_id BIGINT NULL,
    mentor_name VARCHAR(64) NULL,
    mentor_ids VARCHAR(255) NULL,
    mentor_names VARCHAR(255) NULL,
    mentor_background VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT '待审批',
    total_hours INT NOT NULL DEFAULT 0,
    feedback_summary VARCHAR(255) NULL,
    assign_note VARCHAR(255) NULL,
    assigned_at DATETIME NULL,
    confirmed_at DATETIME NULL,
    create_by VARCHAR(64) NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_by VARCHAR(64) NULL,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    remark VARCHAR(255) NULL,
    CONSTRAINT fk_coaching_application FOREIGN KEY (application_id) REFERENCES osg_job_application (application_id),
    CONSTRAINT fk_coaching_student FOREIGN KEY (student_id) REFERENCES osg_student (student_id)
);

CREATE UNIQUE INDEX uk_coaching_application ON osg_coaching (application_id);
CREATE INDEX idx_coaching_status ON osg_coaching (status);
