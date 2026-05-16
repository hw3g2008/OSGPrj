export const scheduleColumnDefs = [
  { dataIndex: 'staffId', key: 'staffId', width: 80, fixed: 'left' as const },
  { dataIndex: 'staffName', key: 'staffName', width: 200, ellipsis: true },
  { dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { dataIndex: 'availableHours', key: 'availableHours', width: 100, align: 'center' as const },
  { dataIndex: 'availableSlotLabels', key: 'availableSlotLabels' },
  { dataIndex: 'action', key: 'action', width: 160, fixed: 'right' as const },
]
