import { downloadAdminFile } from '../../utils'
import { http } from '../../utils/request'
import { i18n } from '../../i18n'

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

/** §B3: coaching 维度待分配行（行主键 coachingId，时间字段来自 osg_coaching.create_time） */
export interface UnassignedCoachingRow {
  coachingId: number
  applicationId: number
  studentId: number
  studentName?: string
  companyName: string
  positionName: string
  region?: string
  city?: string
  interviewStage: string
  interviewTime?: string | null
  requestedMentorCount: number
  companyInterviewer?: string | null
  leadMentorName?: string | null
  requestNote?: string | null
  submittedAt?: string
  /** 兼容：学生申请辅导时可能填的意向导师姓名（CSV）；coaching 维度暂未透出，保留位仅供前端 fallback */
  preferredMentorNames?: string
}

export interface AssignMentorByCoachingPayload {
  mentorIds: number[]
  mentorNames?: string[]
  assignNote?: string
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

/** §B3: 后台 coaching 维度待分配列表，行主键 coachingId */
export function getUnassignedCoachingList(filters: Omit<JobOverviewFilters, 'assignStatus' | 'currentStage'> = {}) {
  return http.get<{ rows: UnassignedCoachingRow[] }>('/admin/job-overview/unassigned-coachings', {
    params: toRequestParams(filters)
  })
}

/** §B3: 按 coachingId 精确分配导师 */
export function assignMentorsByCoaching(coachingId: number, payload: AssignMentorByCoachingPayload) {
  return http.post(`/admin/job-overview/coaching/${coachingId}/assign-mentor`, payload)
}

export function exportJobOverview(filters: JobOverviewExportFilters = {}) {
  return downloadAdminFile({
    path: '/admin/job-overview/export',
    params: toRequestParams(filters),
    fallbackFilename: `${(i18n.global.t as unknown as (k: string) => string)('common.shared.exportFile.jobOverview')}.xlsx`,
  })
}

export function assignMentors(payload: AssignMentorPayload) {
  return http.post('/admin/job-overview/assign-mentor', payload)
}

export function updateJobOverviewStage(payload: StageUpdatePayload) {
  return http.put('/admin/job-overview/stage-update', payload)
}
