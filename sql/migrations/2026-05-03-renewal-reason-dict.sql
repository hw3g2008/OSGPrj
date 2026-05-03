-- osg_renewal_reason: 续签原因字典
-- 用途：合同管理「新增/续签合同」表单的续签原因下拉，取值由字典驱动，替换硬编码列表
-- 分组：finance（财务相关），与 osg_expense_type 同组

-- 1. 字典类型
INSERT INTO sys_dict_type (dict_name, dict_type, status, create_by, create_time, remark)
VALUES ('续签原因', 'osg_renewal_reason', '0', 'admin', NOW(),
        '{"groupKey":"finance","groupLabel":"财务相关","icon":"mdi-cash-multiple","iconColor":"#8B5CF6","iconBg":"#E0E7FF","order":41,"hasParent":false}')
ON DUPLICATE KEY UPDATE dict_name = VALUES(dict_name), status = '0', remark = VALUES(remark), update_time = NOW();

-- 2. 字典数据（可重跑：先清空再插入）
DELETE FROM sys_dict_data WHERE dict_type = 'osg_renewal_reason';

INSERT INTO sys_dict_data (dict_sort, dict_label, dict_value, dict_type, is_default, status, create_by, create_time)
VALUES
  (10, '课时不足加课',   'insufficient_hours', 'osg_renewal_reason', 'N', '0', 'admin', NOW()),
  (20, '合同到期续签',   'contract_expiry',    'osg_renewal_reason', 'N', '0', 'admin', NOW()),
  (30, '增加辅导内容',   'add_coaching',       'osg_renewal_reason', 'N', '0', 'admin', NOW()),
  (40, '延长服务周期',   'extend_period',      'osg_renewal_reason', 'N', '0', 'admin', NOW()),
  (50, '其他原因',       'other',              'osg_renewal_reason', 'N', '0', 'admin', NOW());
