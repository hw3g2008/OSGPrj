-- Admin Dict seed specification
-- Execute after sql/ry_20250522.sql in environments that need the first-phase
-- admin-dict runtime truth.
--
-- This seed intentionally uses the first batch of values that are already
-- observable in the formal business tables, instead of placeholder demo data.

-- Dict types
insert into sys_dict_type (dict_name, dict_type, status, remark, create_by, create_time)
values
  ('岗位分类', 'osg_job_category', '0', '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false}', 'admin', sysdate()),
  ('公司类别', 'osg_company_type', '0', '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false}', 'admin', sysdate()),
  ('公司名称', 'osg_company_name', '0', '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":true,"parentDictType":"osg_company_type"}', 'admin', sysdate()),
  ('大区', 'osg_region', '0', '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false}', 'admin', sysdate()),
  ('城市', 'osg_city', '0', '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":true,"parentDictType":"osg_region"}', 'admin', sysdate()),
  ('招聘周期', 'osg_recruit_cycle', '0', '{"groupKey":"job","groupLabel":"求职相关","icon":"mdi-briefcase","iconColor":"#3B82F6","iconBg":"#DBEAFE","order":10,"hasParent":false}', 'admin', sysdate()),
  ('学校', 'osg_school', '0', '{"groupKey":"student","groupLabel":"学员相关","icon":"mdi-account-school","iconColor":"#22C55E","iconBg":"#D1FAE5","order":20,"hasParent":false}', 'admin', sysdate()),
  ('主攻方向', 'osg_major_direction', '0', '{"groupKey":"student","groupLabel":"学员相关","icon":"mdi-account-school","iconColor":"#22C55E","iconBg":"#D1FAE5","order":20,"hasParent":false}', 'admin', sysdate()),
  ('子方向', 'osg_sub_direction', '0', '{"groupKey":"student","groupLabel":"学员相关","icon":"mdi-account-school","iconColor":"#22C55E","iconBg":"#D1FAE5","order":20,"hasParent":true,"parentDictType":"osg_major_direction"}', 'admin', sysdate()),
  ('课程类型', 'osg_course_type', '0', '{"groupKey":"course","groupLabel":"课程相关","icon":"mdi-book-open-variant","iconColor":"#F59E0B","iconBg":"#FEF3C7","order":30,"hasParent":false}', 'admin', sysdate()),
  ('报销类型', 'osg_expense_type', '0', '{"groupKey":"finance","groupLabel":"财务相关","icon":"mdi-cash-multiple","iconColor":"#8B5CF6","iconBg":"#E0E7FF","order":40,"hasParent":false}', 'admin', sysdate());

-- Dict data
insert into sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, remark, create_by, create_time)
values
  (10, '暑期实习', 'summer', 'osg_job_category', 'N', '0', '{}', 'admin', sysdate()),
  (20, '全职招聘', 'fulltime', 'osg_job_category', 'N', '0', '{}', 'admin', sysdate()),
  (30, 'Off-cycle', 'offcycle', 'osg_job_category', 'N', '0', '{}', 'admin', sysdate()),

  (10, 'Bulge Bracket', 'bulge_bracket', 'osg_company_type', 'N', '0', '{}', 'admin', sysdate()),
  (20, 'Investment Bank', 'investment_bank', 'osg_company_type', 'N', '0', '{}', 'admin', sysdate()),
  (30, 'Consulting', 'consulting', 'osg_company_type', 'N', '0', '{}', 'admin', sysdate()),
  (40, 'Tech', 'tech', 'osg_company_type', 'N', '0', '{}', 'admin', sysdate()),
  (50, 'PE/VC', 'pe_vc', 'osg_company_type', 'N', '0', '{}', 'admin', sysdate()),
  (60, 'PE', 'pe', 'osg_company_type', 'N', '0', '{}', 'admin', sysdate()),
  (70, 'VC', 'vc', 'osg_company_type', 'N', '0', '{}', 'admin', sysdate()),
  (80, 'Other', 'other', 'osg_company_type', 'N', '0', '{}', 'admin', sysdate()),

  (10, 'Goldman Sachs', 'goldman_sachs', 'osg_company_name', 'N', '0', '{"parentValue":"bulge_bracket"}', 'admin', sysdate()),
  (20, 'Morgan Stanley', 'morgan_stanley', 'osg_company_name', 'N', '0', '{"parentValue":"bulge_bracket"}', 'admin', sysdate()),
  (30, 'JP Morgan', 'jp_morgan', 'osg_company_name', 'N', '0', '{"parentValue":"bulge_bracket"}', 'admin', sysdate()),
  (40, 'McKinsey', 'mckinsey', 'osg_company_name', 'N', '0', '{"parentValue":"consulting"}', 'admin', sysdate()),
  (50, 'BCG', 'bcg', 'osg_company_name', 'N', '0', '{"parentValue":"consulting"}', 'admin', sysdate()),
  (60, 'Google', 'google', 'osg_company_name', 'N', '0', '{"parentValue":"tech"}', 'admin', sysdate()),

  (10, '北美', 'na', 'osg_region', 'N', '0', '{}', 'admin', sysdate()),
  (20, '欧洲', 'eu', 'osg_region', 'N', '0', '{}', 'admin', sysdate()),
  (30, '亚太', 'apac', 'osg_region', 'N', '0', '{}', 'admin', sysdate()),
  (40, '中国大陆', 'china_mainland', 'osg_region', 'N', '0', '{}', 'admin', sysdate()),

  (10, 'New York', 'new_york', 'osg_city', 'N', '0', '{"parentValue":"na"}', 'admin', sysdate()),
  (20, 'Boston', 'boston', 'osg_city', 'N', '0', '{"parentValue":"na"}', 'admin', sysdate()),
  (30, 'San Francisco', 'san_francisco', 'osg_city', 'N', '0', '{"parentValue":"na"}', 'admin', sysdate()),
  (40, 'London', 'london', 'osg_city', 'N', '0', '{"parentValue":"eu"}', 'admin', sysdate()),
  (50, 'Paris', 'paris', 'osg_city', 'N', '0', '{"parentValue":"eu"}', 'admin', sysdate()),
  (60, 'Frankfurt', 'frankfurt', 'osg_city', 'N', '0', '{"parentValue":"eu"}', 'admin', sysdate()),
  (70, 'Hong Kong', 'hong_kong', 'osg_city', 'N', '0', '{"parentValue":"apac"}', 'admin', sysdate()),
  (80, 'Singapore', 'singapore', 'osg_city', 'N', '0', '{"parentValue":"apac"}', 'admin', sysdate()),
  (90, 'Shanghai', 'shanghai', 'osg_city', 'N', '0', '{"parentValue":"china_mainland"}', 'admin', sysdate()),
  (100, 'Beijing', 'beijing', 'osg_city', 'N', '0', '{"parentValue":"china_mainland"}', 'admin', sysdate()),
  (110, 'Shenzhen', 'shenzhen', 'osg_city', 'N', '0', '{"parentValue":"china_mainland"}', 'admin', sysdate()),

  (10, '2026 秋招 / 2026 Autumn', '2026_autumn', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),
  (20, '2026 暑期 / 2026 Summer', '2026_summer', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),
  (30, '2026 全职 / 2026 Full-time', '2026_full_time', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),
  (40, '2026 春招 / 2026 Spring', '2026_spring', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),
  (50, '2025 暑期 / 2025 Summer', '2025_summer', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),
  (60, '2025 全职 / 2025 Full-time', '2025_full_time', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),
  (70, '2025 秋招 / 2025 Autumn', '2025_autumn', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),
  (80, '2025 春招 / 2025 Spring', '2025_spring', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),
  (90, 'Open', 'open', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),
  (100, 'Off-cycle', 'off_cycle', 'osg_recruit_cycle', 'N', '0', '{}', 'admin', sysdate()),

  (10, '北京大学 / Peking University', 'peking_university', 'osg_school', 'N', '0', '{}', 'admin', sysdate()),
  (20, '清华大学 / Tsinghua University', 'tsinghua_university', 'osg_school', 'N', '0', '{}', 'admin', sysdate()),
  (30, 'MIT', 'mit', 'osg_school', 'N', '0', '{}', 'admin', sysdate()),
  (40, 'Columbia University', 'columbia_university', 'osg_school', 'N', '0', '{}', 'admin', sysdate()),
  (50, 'Harvard University', 'harvard_university', 'osg_school', 'N', '0', '{}', 'admin', sysdate()),
  (60, 'New York University (NYU)', 'new_york_university', 'osg_school', 'N', '0', '{}', 'admin', sysdate()),
  (70, 'Stanford University', 'stanford_university', 'osg_school', 'N', '0', '{}', 'admin', sysdate()),
  (80, 'Yale University', 'yale_university', 'osg_school', 'N', '0', '{}', 'admin', sysdate()),

  (10, '咨询 / Consulting', 'consulting', 'osg_major_direction', 'N', '0', '{}', 'admin', sysdate()),
  (20, '金融 / Finance', 'finance', 'osg_major_direction', 'N', '0', '{}', 'admin', sysdate()),
  (30, '科技 / Tech', 'tech', 'osg_major_direction', 'N', '0', '{}', 'admin', sysdate()),
  (40, '量化 / Quant', 'quant', 'osg_major_direction', 'N', '0', '{}', 'admin', sysdate()),
  (50, '计算机 / Computer Science', 'computer_science', 'osg_major_direction', 'N', '0', '{}', 'admin', sysdate()),

  (10, '战略咨询 / Strategy', 'strategy', 'osg_sub_direction', 'N', '0', '{"parentValue":"consulting"}', 'admin', sysdate()),
  (20, '财务顾问 / Advisory', 'advisory', 'osg_sub_direction', 'N', '0', '{"parentValue":"consulting"}', 'admin', sysdate()),
  (30, '投行 / Investment Banking', 'investment_banking', 'osg_sub_direction', 'N', '0', '{"parentValue":"finance"}', 'admin', sysdate()),
  (40, '资管 / Asset Management', 'asset_management', 'osg_sub_direction', 'N', '0', '{"parentValue":"finance"}', 'admin', sysdate()),
  (50, 'PE / Private Equity', 'private_equity', 'osg_sub_direction', 'N', '0', '{"parentValue":"finance"}', 'admin', sysdate()),
  (60, 'VC / Venture Capital', 'venture_capital', 'osg_sub_direction', 'N', '0', '{"parentValue":"finance"}', 'admin', sysdate()),
  (70, '软件工程 / Software Engineering', 'software_engineering', 'osg_sub_direction', 'N', '0', '{"parentValue":"computer_science"}', 'admin', sysdate()),
  (80, '量化研究 / Quant Research', 'quant_research', 'osg_sub_direction', 'N', '0', '{"parentValue":"quant"}', 'admin', sysdate()),

  (10, '求职辅导', 'job_coaching', 'osg_course_type', 'N', '0', '{}', 'admin', sysdate()),
  (20, '模拟面试', 'mock_interview', 'osg_course_type', 'N', '0', '{}', 'admin', sysdate()),
  (30, '基础课', 'basic_course', 'osg_course_type', 'N', '0', '{}', 'admin', sysdate()),
  (40, '笔试辅导', 'written_test', 'osg_course_type', 'N', '0', '{}', 'admin', sysdate()),
  (50, '岗位辅导', 'position_coaching', 'osg_course_type', 'N', '0', '{}', 'admin', sysdate()),
  (60, '模拟应聘', 'mock_practice', 'osg_course_type', 'N', '0', '{}', 'admin', sysdate()),
  (70, 'Networking', 'networking', 'osg_course_type', 'N', '0', '{}', 'admin', sysdate()),
  (80, '期中考试', 'midterm_exam', 'osg_course_type', 'N', '0', '{}', 'admin', sysdate()),
  (90, '期中模考', 'mock_midterm', 'osg_course_type', 'N', '0', '{}', 'admin', sysdate());

-- osg_expense_type intentionally keeps only the dict type in phase 1 because
-- the current formal expense table has no confirmed business values yet.
