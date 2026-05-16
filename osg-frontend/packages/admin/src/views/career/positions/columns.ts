export interface PositionColumn {
  key: string
  label: string
  sortable?: boolean
}

export const positionColumns: PositionColumn[] = [
  { key: 'positionName', label: 'Position' },
  { key: 'companyIndustry', label: 'Industry' },
  { key: 'positionCategory', label: 'Category' },
  { key: 'city', label: 'Region' },
  { key: 'recruitmentCycle', label: 'Cycle' },
  { key: 'displayStartTime', label: 'Publish Start', sortable: true },
  { key: 'deadlineDisplay', label: 'Deadline' },
  { key: 'displayStatus', label: 'Status' },
  { key: 'studentCount', label: 'Applicants' },
  { key: 'actions', label: 'Action' }
]
