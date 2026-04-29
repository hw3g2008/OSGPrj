-- osg_schedule_status：导师排期状态字典
-- 用于"分配/更换导师"弹层的"排期状态"下拉，并与后端 OsgLeadMentorMentorController#deriveScheduleStatus
-- 派生口径保持一致（available/normal/busy）。
--
-- 注意：dict_type 不能用 osg_mentor_ 前缀（被 DictFacadeController 标记为端点私有，
-- 跨端 LM 端无法消费），故采用 osg_schedule_status。

insert into sys_dict_type (dict_name, dict_type, status, remark, create_by, create_time)
values
  ('排期状态', 'osg_schedule_status', '0', '{"groupKey":"mentor","groupLabel":"导师相关","icon":"mdi-calendar-clock","iconColor":"#8B5CF6","iconBg":"#E0E7FF","order":50,"hasParent":false}', 'admin', sysdate())
on duplicate key update dict_name = values(dict_name);

insert into sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, remark, create_by, create_time)
values
  (10, '有空闲', 'available', 'osg_schedule_status', 'N', '0', '{"tone":"success"}', 'admin', sysdate()),
  (20, '正常', 'normal', 'osg_schedule_status', 'N', '0', '{"tone":"info"}', 'admin', sysdate()),
  (30, '排期紧张', 'busy', 'osg_schedule_status', 'N', '0', '{"tone":"warning"}', 'admin', sysdate())
on duplicate key update dict_label = values(dict_label), remark = values(remark);
