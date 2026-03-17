import { http } from '../../utils/request'

export type AllClassesTab = 'all' | 'pending' | 'unpaid' | 'paid' | 'rejected'

export interface AllClassesFilters {
  keyword?: string
  tab?: AllClassesTab
  pageNum?: number
  pageSize?: number
}

export interface AllClassesSummary {
  allCount: number
  pendingCount: number
  unpaidCount: number
  paidCount: number
  rejectedCount: number
  selectedTab: AllClassesTab
  flowSteps: string[]
}

export interface AllClassesRow {
  recordId: number
  classId?: string | null
  studentId: number
  studentName: string
  mentorId: number
  mentorName: string
  courseType: string
  courseTypeLabel: string
  courseSource: string
  sourceLabel: string
  classDate?: string | null
  durationHours?: number | null
  status: string
  displayStatus: AllClassesTab
  displayStatusLabel: string
  rate?: string | null
  modalType: string
}

export interface AllClassesListResponse {
  rows: AllClassesRow[]
  summary: AllClassesSummary
  total: number
  pageNum: number
  pageSize: number
}

export interface AllClassesDetail extends AllClassesRow {
  headerTone: string
  headerTitle: string
  classStatus?: string | null
  weeklyHours?: number | null
  topics?: string | null
  comments?: string | null
  feedbackContent?: string | null
  reviewRemark?: string | null
  reviewedAt?: string | null
  submittedAt?: string | null
}

const toParams = (filters: AllClassesFilters = {}) => {
  const params: Record<string, string | number> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    params[key] = value
  })

  return params
}

export function getAllClassesList(filters: AllClassesFilters = {}) {
  return http.get<AllClassesListResponse>('/admin/all-classes/list', {
    params: toParams(filters)
  })
}

export function getAllClassesDetail(recordId: number) {
  return http.get<AllClassesDetail>(`/admin/all-classes/${recordId}/detail`)
}
