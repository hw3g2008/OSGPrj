import { http } from '../../utils/request'

export interface ReportFilters {
  keyword?: string
  courseType?: string
  courseSource?: string
  tab?: string
}

export interface ReportSummaryItem {
  mentorId: number
  mentorName: string
  weeklyHours: number
}

export interface ReportSummary {
  allCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  selectedTab: string
  overtimeMentors: ReportSummaryItem[]
}

export interface ReportRow {
  recordId: number
  classId?: string | null
  mentorId: number
  mentorName: string
  studentId: number
  studentName: string
  courseType: string
  courseSource: string
  classDate?: string | null
  durationHours?: number
  weeklyHours?: number
  status: string
  classStatus?: string | null
  rate?: string | null
  topics?: string | null
  comments?: string | null
  feedbackContent?: string | null
  reviewRemark?: string | null
  reviewedAt?: string | null
  submittedAt?: string | null
  pendingDays?: number
  overtimeFlag?: boolean
  overdueFlag?: boolean
  pendingReviewCount?: number
}

export interface ReviewPayload {
  remark?: string
}

export interface BatchReviewPayload {
  recordIds: number[]
  remark?: string
}

const toRequestParams = (filters: ReportFilters = {}) => {
  const params: Record<string, string | number> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    params[key] = value
  })

  return params
}

export function getReportList(filters: ReportFilters = {}) {
  return http.get<{ rows: ReportRow[]; summary: ReportSummary }>('/admin/report/list', {
    params: toRequestParams(filters)
  })
}

export function getReportDetail(recordId: number) {
  return http.get<ReportRow>(`/admin/report/${recordId}`)
}

export function approveReport(recordId: number, payload: ReviewPayload = {}) {
  return http.put(`/admin/report/${recordId}/approve`, payload)
}

export function rejectReport(recordId: number, payload: ReviewPayload = {}) {
  return http.put(`/admin/report/${recordId}/reject`, payload)
}

export function batchApproveReport(payload: BatchReviewPayload) {
  return http.put('/admin/report/batch-approve', payload)
}

export function batchRejectReport(payload: BatchReviewPayload) {
  return http.put('/admin/report/batch-reject', payload)
}
