ALTER TABLE sys_menu ADD COLUMN i18n_key varchar(150) DEFAULT NULL COMMENT 'menu i18n key' AFTER menu_name;

UPDATE sys_menu
SET i18n_key = CASE menu_id
  WHEN 2001 THEN 'permission_management'
  WHEN 2002 THEN 'user_center'
  WHEN 2003 THEN 'job_search_center'
  WHEN 2004 THEN 'teaching_center'
  WHEN 2005 THEN 'financial_center'
  WHEN 2006 THEN 'resource_center'
  WHEN 2007 THEN 'personal_center'
  WHEN 2010 THEN 'home_page'
  WHEN 2011 THEN 'permission_configuration'
  WHEN 2012 THEN 'backend_user_management'
  WHEN 2013 THEN 'dictionary_management'
  WHEN 2014 THEN 'student_list'
  WHEN 2015 THEN 'contract_management'
  WHEN 2016 THEN 'mentor_list'
  WHEN 2017 THEN 'tutor_schedule_management'
  WHEN 2018 THEN 'position_information'
  WHEN 2019 THEN 'posts_created_by_students'
  WHEN 2020 THEN 'overview_of_student_job_search'
  WHEN 2021 THEN 'simulated_application_management'
  WHEN 2022 THEN 'course_records'
  WHEN 2023 THEN 'interpersonal_communication_records'
  WHEN 2024 THEN 'class_hour_settlement'
  WHEN 2025 THEN 'reimbursement_management'
  WHEN 2026 THEN 'file'
  WHEN 2027 THEN 'online_test_question_bank'
  WHEN 2028 THEN 'real_person_interview_question_bank'
  WHEN 2029 THEN 'real_interview_questions'
  WHEN 2030 THEN 'mail'
  WHEN 2031 THEN 'message_management'
  WHEN 2032 THEN 'complaints_and_suggestions'
  WHEN 2033 THEN 'operation_log'
  ELSE i18n_key
END
WHERE menu_id IN (2001, 2002, 2003, 2004, 2005, 2006, 2007, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033);
