export const staffColumnDefs = [
  { dataIndex: 'staffId', key: 'staffId', width: 90, fixed: 'left' as const },
  { dataIndex: 'staffName', key: 'staffName', width: 130, ellipsis: true },
  { dataIndex: 'contact', key: 'contact', width: 160 },
  { dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { dataIndex: 'majorDirection', key: 'majorDirection', width: 180, ellipsis: true },
  { dataIndex: 'subDirection', key: 'subDirection', width: 110, ellipsis: true },
  { dataIndex: 'region', key: 'region', width: 130, ellipsis: true },
  { dataIndex: 'companies', key: 'companies', width: 160 },
  { dataIndex: 'hourlyRate', key: 'hourlyRate', width: 80, align: 'center' as const },
  { dataIndex: 'studentCount', key: 'studentCount', width: 80, align: 'center' as const },
  { dataIndex: 'accountStatus', key: 'accountStatus', width: 90 },
  { dataIndex: 'action', key: 'action', width: 240, fixed: 'right' as const },
]

export const staffColumnDefsWithRating = [
  { dataIndex: 'staffId', key: 'staffId', width: 90, fixed: 'left' as const },
  { dataIndex: 'staffName', key: 'staffName', width: 130, ellipsis: true },
  { dataIndex: 'contact', key: 'contact', width: 160 },
  { dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { dataIndex: 'majorDirection', key: 'majorDirection', width: 180, ellipsis: true },
  { dataIndex: 'subDirection', key: 'subDirection', width: 110, ellipsis: true },
  { dataIndex: 'region', key: 'region', width: 130, ellipsis: true },
  { dataIndex: 'companies', key: 'companies', width: 160 },
  { dataIndex: 'rating', key: 'rating', width: 80, align: 'center' as const },
  { dataIndex: 'hourlyRate', key: 'hourlyRate', width: 80, align: 'center' as const },
  { dataIndex: 'studentCount', key: 'studentCount', width: 80, align: 'center' as const },
  { dataIndex: 'accountStatus', key: 'accountStatus', width: 90 },
  { dataIndex: 'action', key: 'action', width: 240, fixed: 'right' as const },
]

export const staffBlacklistColumnDefs = [
  { dataIndex: 'staffId', key: 'staffId', width: 90, fixed: 'left' as const },
  { dataIndex: 'staffName', key: 'staffName', width: 130, ellipsis: true },
  { dataIndex: 'email', key: 'email', width: 180 },
  { dataIndex: 'staffType', key: 'staffType', width: 80, align: 'center' as const },
  { dataIndex: 'majorDirection', key: 'majorDirection', width: 180, ellipsis: true },
  { dataIndex: 'blacklistReason', key: 'blacklistReason', width: 160, ellipsis: true },
  { dataIndex: 'blacklistTime', key: 'blacklistTime', width: 120 },
  { dataIndex: 'operator', key: 'operator', width: 90 },
  { dataIndex: 'action', key: 'action', width: 240, fixed: 'right' as const },
]
