SET NAMES utf8mb4;

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 10, '损益表', 'T01', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T01');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 20, '资产负债表', 'T02', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T02');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 30, '现金流量表', 'T03', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T03');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 40, '基础财务', 'T04', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T04');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 50, '企业价值与权益价值', 'T05', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T05');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 60, '稀释股份', 'T06', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T06');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 70, '商业意识_竞争战略', 'T07', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T07');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 80, 'WACC', 'T08', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T08');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 90, 'DCF 估值', 'T09', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T09');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 100, '公众可比分析', 'T10', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T10');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 110, '先前交易分析', 'T11', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T11');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 120, '估值摘要', 'T12', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T12');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 130, '并购入门', 'T13', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T13');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 140, '吸积稀释分析', 'T14', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T14');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 150, '体育入门', 'T15', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T15');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 160, 'LBO 型号', 'T16', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T16');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 170, 'LBO 面试题及书面 LBO', 'T17', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T17');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 180, '杠杆融资与杠杆债务', 'T18', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T18');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 190, '高级会计', 'T19', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":true}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T19');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 200, '高级并购', 'T20', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T20');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 210, 'DCM', 'T21', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T21');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 220, 'ECM', 'T22', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T22');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 230, 'OSG 股票推介指南', 'T23', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T23');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 240, '私募股权案例研究教育', 'T24', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"tech","required":false}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'T24');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 250, 'OSG 简历指南（不含 WM 功能）', 'B0', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'B0');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 260, '网络交流', 'B1', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'B1');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 270, '自荐信', 'B2', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'B2');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 280, '谈谈你自己吧', 'B3', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'B3');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 290, '优势与劣势', 'B4', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'B4');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 300, '成功与失败', 'B5', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'B5');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 310, '领导故事', 'B6', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'B6');
INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, remark, create_by, create_time)
SELECT 320, '动机', 'B7', 'osg_base_course_topic', NULL, NULL, 'N', '0', '{"category":"behavior"}', 'admin', sysdate() FROM dual WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'osg_base_course_topic' AND dict_value = 'B7');
