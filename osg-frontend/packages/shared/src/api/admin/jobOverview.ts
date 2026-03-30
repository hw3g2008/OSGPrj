import { downloadAdminFile } from '../../utils'
import { http } from '../../utils/request'

export interface JobOverviewFilters {
  studentName?: string
  companyName?: string
  currentStage?: string
  leadMentorId?: number
  assignStatus?: string
}

export interface JobOverviewStats {
  appliedCount: number
  interviewingCount: number
  offerCount: number
  rejectedCount: number
  withdrawnCount: number
  offerRate: number
  interviewPassRate: number
  offerRateYoY: string
  interviewPassRateYoY: string
}

export interface JobOverviewFunnelNode {
  label: string
  count: number
  rate: number
}

export interface HotCompanyItem {
  companyName: string
  applicationCount: number
  offerCount: number
  offerRate: number
}

export interface JobOverviewRow {
  applicationId: number
  studentId: number
  studentName?: string
  companyName: string
  positionName: string
  region?: string
  city?: string
  currentStage: string
  interviewTime?: string
  assignedStatus?: string
  leadMentorName?: string
  stageUpdated?: boolean
  coachingStatus?: string
  mentorName?: string | null
  mentorBackground?: string | null
  hoursUsed?: number
  feedbackSummary?: string | null
}

export interface UnassignedJobOverviewRow {
  applicationId: number
  studentId: number
  studentName?: string
  companyName: string
  positionName: string
  currentStage: string
  interviewTime?: string
  requestedMentorCount?: number
  preferredMentorNames?: string
  leadMentorName?: string
  submittedAt?: string
}

export interface AssignMentorPayload {
  applicationId: number
  mentorIds: number[]
  mentorNames?: string[]
  assignNote?: string
}

export interface StageUpdatePayload {
  applicationId: number
  currentStage?: string
  interviewTime?: string
  stageUpdated?: boolean
  note?: string
}

export interface JobOverviewExportFilters extends JobOverviewFilters {
  tab?: 'pending' | 'all'
}

const toRequestParams = (filters: JobOverviewFilters = {}) => {
  const params: Record<string, string | number> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    params[key] = value
  })

  return params
}

export function getJobOverviewStats(filters: JobOverviewFilters = {}) {
  return http.get<JobOverviewStats>('/admin/job-overview/stats', {
    params: toRequestParams(filters)
  })
}

export function getJobOverviewFunnel(filters: JobOverviewFilters = {}) {
  return http.get<JobOverviewFunnelNode[]>('/admin/job-overview/funnel', {
    params: toRequestParams(filters)
  })
}

export function getHotCompanies(filters: JobOverviewFilters = {}) {
  return http.get<HotCompanyItem[]>('/admin/job-overview/hot-companies', {
    params: toRequestParams(filters)
  })
}

export function getJobOverviewList(filters: JobOverviewFilters = {}) {
  return http.get<{ rows: JobOverviewRow[] }>('/admin/job-overview/list', {
    params: toRequestParams(filters)
  })
}

export function getUnassignedJobOverviewList(filters: Omit<JobOverviewFilters, 'assignStatus'> = {}) {
  return http.get<{ rows: UnassignedJobOverviewRow[] }>('/admin/job-overview/unassigned', {
    params: toRequestParams(filters)
  })
}

export function exportJobOverview(filters: JobOverviewExportFilters = {}) {
  return downloadAdminFile({
    path: '/admin/job-overview/export',
    params: toRequestParams(filters),
    fallbackFilename: '求职总览.xlsx',
  })
}

export function assignMentors(payload: AssignMentorPayload) {
  return http.post('/admin/job-overview/assign-mentor', payload)
}

export function updateJobOverviewStage(payload: StageUpdatePayload) {
  return http.put('/admin/job-overview/stage-update', payload)
}
