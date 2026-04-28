export const staffColumns = [
  { title: 'ID', dataIndex: 'staffId', key: 'staffId', width: 90 },
  { title: '英文名', dataIndex: 'staffName', key: 'staffName', width: 130, ellipsis: true },
  { title: '联系方式', dataIndex: 'contact', key: 'contact', width: 160 },
  { title: '类型', dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { title: '主攻方向', dataIndex: 'majorDirection', key: 'majorDirection', width: 180, ellipsis: true },
  { title: '子方向', dataIndex: 'subDirection', key: 'subDirection', width: 110, ellipsis: true },
  { title: '所属地区', dataIndex: 'region', key: 'region', width: 130, ellipsis: true },
  { title: '课单价', dataIndex: 'hourlyRate', key: 'hourlyRate', width: 80, align: 'center' as const },
  { title: '学员数', dataIndex: 'studentCount', key: 'studentCount', width: 80, align: 'center' as const },
  { title: '账号状态', dataIndex: 'accountStatus', key: 'accountStatus', width: 90 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 240, fixed: 'right' as const },
]

export const staffBlacklistColumns = [
  { title: 'ID', dataIndex: 'staffId', key: 'staffId', width: 90 },
  { title: '英文名', dataIndex: 'staffName', key: 'staffName', width: 130, ellipsis: true },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '类型', dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { title: '主攻方向', dataIndex: 'majorDirection', key: 'majorDirection', width: 180, ellipsis: true },
  { title: '黑名单原因', dataIndex: 'blacklistReason', key: 'blacklistReason', width: 160, ellipsis: true },
  { title: '加入时间', dataIndex: 'blacklistTime', key: 'blacklistTime', width: 120 },
  { title: '操作人', dataIndex: 'operator', key: 'operator', width: 90 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 240, fixed: 'right' as const },
]
