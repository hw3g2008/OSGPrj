import { http } from '../../utils/request'

export interface ClassRecordRow {
  recordId: number
  recordCode?: string | null
  studentId: number
  studentName: string
  mentorId: number
  mentorName: string
  coachingType: string
  courseType?: string | null
  courseContent: string
  reporterRole: string
  classDate?: string | null
  durationHours?: number | null
  courseFee: string
  studentRating?: string | null
  status: string
  reviewRemark?: string | null
  submittedAt?: string | null
}

export interface ClassRecordStats {
  totalCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  pendingSettlementAmount: string
  flowSteps: string[]
}

export interface ClassRecordFilters {
  keyword?: string
}

const toParams = (filters: ClassRecordFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.keyword) {
    params.keyword = filters.keyword
  }

  return params
}

export function getClassRecordList(filters: ClassRecordFilters = {}) {
  return http.get<{ rows: ClassRecordRow[]; total: number }>('/admin/class-record/list', {
    params: toParams(filters)
  })
}

export function getClassRecordStats(filters: ClassRecordFilters = {}) {
  return http.get<ClassRecordStats>('/admin/class-record/stats', {
    params: toParams(filters)
  })
}
