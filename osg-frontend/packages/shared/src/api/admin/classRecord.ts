import { downloadAdminFile } from '../../utils'
import { http } from '../../utils/request'
import { i18n } from '../../i18n'

export interface ClassRecordRow {
  recordId: number
  recordCode?: string | null
  studentId: number
  studentName: string
  mentorId: number
  mentorName: string
  coachingType?: string | null
  courseType?: string | null
  courseContent: string
  classStatus?: string | null
  reporterRole: string
  classDate?: string | null
  durationHours?: number | null
  courseFee: string
  studentRating?: string | null
  status: string
  reviewRemark?: string | null
  feedbackContent?: string | null
  comments?: string | null
  submittedAt?: string | null
}

export interface ClassRecordStats {
  totalCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  pendingSettlementAmount: string
  flowSteps?: string[]
  mineCount?: number
  managedCount?: number
}

export interface ClassRecordFilters {
  keyword?: string
  courseType?: string
  classStatus?: string
  courseSource?: string
  tab?: string
  classDateStart?: string
  classDateEnd?: string
  scope?: 'mine' | 'managed'
}

const toParams = (filters: ClassRecordFilters = {}) => {
  const params: Record<string, string> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) {
      return
    }
    params[key] = value
  })

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

export function exportClassRecords(filters: ClassRecordFilters = {}) {
  return downloadAdminFile({
    path: '/admin/class-record/export',
    params: toParams(filters),
    fallbackFilename: `${(i18n.global.t as unknown as (k: string) => string)('common.shared.exportFile.classRecord')}.xlsx`,
  })
}
