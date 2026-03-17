import { http } from '../../utils/request'

export interface JobTrackingFilters {
  studentName?: string
  leadMentorName?: string
  trackingStatus?: string
  companyName?: string
  location?: string
}

export interface JobTrackingStats {
  totalStudentCount: number
  trackingCount: number
  interviewingCount: number
  offerCount: number
  rejectedCount: number
}

export interface JobTrackingRow {
  applicationId: number
  studentId: number
  studentName?: string
  mentorName?: string
  companyName: string
  positionName: string
  location?: string
  trackingStatus: string
  currentStage?: string
  interviewStage?: string | null
  interviewTime?: string
  preferredMentor?: string | null
  excludedMentor?: string | null
  note?: string | null
  submittedAt?: string
}

export interface JobTrackingResponse {
  stats: JobTrackingStats
  rows: JobTrackingRow[]
}

export interface UpdateJobTrackingPayload {
  trackingStatus: string
  interviewStage?: string
  interviewTime?: string
  preferredMentor?: string
  excludedMentor?: string
  note?: string
}

const toRequestParams = (filters: JobTrackingFilters = {}) => {
  const params: Record<string, string> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) {
      return
    }
    params[key] = value
  })

  return params
}

export function getJobTrackingList(filters: JobTrackingFilters = {}) {
  return http.get<JobTrackingResponse>('/admin/job-tracking/list', {
    params: toRequestParams(filters)
  })
}

export function updateJobTracking(applicationId: number, payload: UpdateJobTrackingPayload) {
  return http.put(`/admin/job-tracking/${applicationId}/update`, payload)
}
