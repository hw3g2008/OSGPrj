export const scheduleColumns = [
  { title: 'ID', dataIndex: 'staffId', key: 'staffId', width: 80 },
  { title: '导师', dataIndex: 'staffName', key: 'staffName', width: 200, ellipsis: true },
  { title: '类型', dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { title: '可用时长', dataIndex: 'availableHours', key: 'availableHours', width: 100, align: 'center' as const },
  { title: '可用时间', dataIndex: 'availableSlotLabels', key: 'availableSlotLabels' },
  { title: '操作', dataIndex: 'action', key: 'action', width: 160, fixed: 'right' as const },
]
