create table if not exists osg_student_job_position (
  position_id bigint not null auto_increment,
  business_key varchar(128) not null,
  title varchar(128) not null,
  company varchar(128) not null,
  category varchar(32) not null,
  department varchar(64) not null,
  location varchar(64) not null,
  recruit_cycle varchar(64) not null,
  publish_date date null,
  deadline date null,
  position_url varchar(255) not null default '#',
  career_url varchar(255) not null default '#',
  company_key varchar(32) not null,
  company_code varchar(32) not null,
  industry varchar(32) not null,
  requirements varchar(255) null,
  source_type varchar(16) not null default 'global',
  owner_user_id bigint null,
  create_time datetime not null default current_timestamp,
  update_time datetime not null default current_timestamp on update current_timestamp,
  primary key (position_id),
  unique key uk_osg_student_job_position_business_key (business_key)
) engine=InnoDB default charset=utf8mb4;

create table if not exists osg_student_job_position_state (
  state_id bigint not null auto_increment,
  user_id bigint not null,
  position_id bigint not null,
  favorited char(1) not null default '0',
  applied char(1) not null default '0',
  applied_at datetime null,
  apply_method varchar(64) null,
  apply_note varchar(500) null,
  progress_stage varchar(32) not null default 'applied',
  progress_note varchar(500) null,
  coaching_requested char(1) not null default '0',
  coaching_stage varchar(32) null,
  coaching_mentor_count varchar(32) null,
  coaching_note varchar(500) null,
  coaching_status varchar(32) null,
  mentor_name varchar(64) null,
  mentor_meta varchar(128) null,
  hours_feedback varchar(32) null,
  feedback_summary varchar(255) null,
  interview_at datetime null,
  create_time datetime not null default current_timestamp,
  update_time datetime not null default current_timestamp on update current_timestamp,
  primary key (state_id),
  unique key uk_osg_student_job_position_state_user_position (user_id, position_id)
) engine=InnoDB default charset=utf8mb4;

alter table osg_student_job_position_state
  add column if not exists coaching_status varchar(32) null after coaching_note;

alter table osg_student_job_position_state
  add column if not exists mentor_name varchar(64) null after coaching_status;

alter table osg_student_job_position_state
  add column if not exists mentor_meta varchar(128) null after mentor_name;

alter table osg_student_job_position_state
  add column if not exists hours_feedback varchar(32) null after mentor_meta;

alter table osg_student_job_position_state
  add column if not exists feedback_summary varchar(255) null after hours_feedback;

alter table osg_student_job_position_state
  add column if not exists interview_at datetime null after feedback_summary;

insert into osg_student_job_position (
  business_key, title, company, category, department, location, recruit_cycle,
  publish_date, deadline, position_url, career_url, company_key, company_code,
  industry, requirements, source_type
) values
  ('global:gs:ib-analyst', 'IB Analyst', 'Goldman Sachs', 'summer', 'IBD', 'Hong Kong', '2025 Summer',
   '2025-09-15', '2025-12-31',
   'https://www.goldmansachs.com/careers/students/programs-and-internships',
   'https://www.goldmansachs.com/careers/students/programs-and-internships',
   'gs', 'GS', 'ib', '需PDF简历+Cover Letter', 'global'),
  ('global:jpm:st-analyst', 'S&T Analyst', 'JP Morgan', 'fulltime', 'S&T', 'New York', '2025 Full-time',
   '2025-10-01', '2026-01-15',
   'https://careers.jpmorgan.com/global/en/students/programs',
   'https://careers.jpmorgan.com/global/en/students/programs',
   'jpm', 'JPM', 'ib', '', 'global'),
  ('global:mck:business-analyst', 'Business Analyst', 'McKinsey', 'summer', 'Strategy', 'Shanghai', '2025 Summer',
   '2025-07-01', '2025-10-31',
   'https://www.mckinsey.com/careers/search-jobs/jobs/businessanalyst-15136',
   'https://www.mckinsey.com/careers',
   'mck', 'MCK', 'consulting', '需推荐信+案例分析准备', 'global')
on duplicate key update
  title = values(title),
  company = values(company),
  category = values(category),
  department = values(department),
  location = values(location),
  recruit_cycle = values(recruit_cycle),
  publish_date = values(publish_date),
  deadline = values(deadline),
  position_url = values(position_url),
  career_url = values(career_url),
  company_key = values(company_key),
  company_code = values(company_code),
  industry = values(industry),
  requirements = values(requirements),
  source_type = values(source_type),
  update_time = current_timestamp;
