export interface PositionColumn {
  key: string
  label: string
  sortable?: boolean
}

export const positionColumns: PositionColumn[] = [
  { key: 'positionName', label: '岗位名称' },
  { key: 'companyIndustry', label: '公司行业' },
  { key: 'positionCategory', label: '岗位分类' },
  { key: 'city', label: '地区' },
  { key: 'recruitmentCycle', label: '招聘周期' },
  { key: 'displayStartTime', label: '展示起始', sortable: true },
  { key: 'deadlineDisplay', label: '截止时间' },
  { key: 'displayStatus', label: '状态' },
  { key: 'studentCount', label: '学员' },
  { key: 'actions', label: '操作' }
]
