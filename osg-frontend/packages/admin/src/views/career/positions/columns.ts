import { i18n } from '@osg/shared'

const t = (key: string) => i18n.global.t(key)

export interface PositionColumn {
  key: string
  label: string
  sortable?: boolean
}

export const positionColumns: PositionColumn[] = [
  { key: 'positionName', label: t('job_title') },
  { key: 'companyIndustry', label: t('company_industry') },
  { key: 'positionCategory', label: t('job_classification') },
  { key: 'city', label: t('area') },
  { key: 'recruitmentCycle', label: t('recruitment_cycle') },
  { key: 'displayStartTime', label: t('show_start'), sortable: true },
  { key: 'deadlineDisplay', label: t('deadline') },
  { key: 'displayStatus', label: t('status') },
  { key: 'studentCount', label: t('student') },
  { key: 'actions', label: t('operation') }
]
