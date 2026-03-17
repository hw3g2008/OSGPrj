export interface StaffColumn {
  key: string
  label: string
}

export const staffColumns: StaffColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '英文名' },
  { key: 'contact', label: '联系方式' },
  { key: 'type', label: '类型' },
  { key: 'majorDirection', label: '主攻方向' },
  { key: 'subDirection', label: '子方向' },
  { key: 'region', label: '所属地区' },
  { key: 'hourlyRate', label: '课单价' },
  { key: 'studentCount', label: '学员数' },
  { key: 'accountStatus', label: '账号状态' },
  { key: 'actions', label: '操作' }
]
