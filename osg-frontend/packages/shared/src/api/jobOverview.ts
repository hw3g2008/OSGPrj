import { http } from '../utils/request'

export interface LeadMentorJobOverviewListParams {
  scope: 'pending' | 'coaching' | 'managed'
  studentName?: string
  companyName?: string
  currentStage?: string
  keyword?: string
}

export interface LeadMentorJobOverviewListItem {
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
  requestedMentorCount?: number
  preferredMentorNames?: string
  coachingStatus?: string
  mentorName?: string | null
  mentorNames?: string | null
  mentorBackground?: string | null
  hoursUsed?: number
  feedbackSummary?: string | null
  submittedAt?: string
}

export interface LeadMentorAssignMentorPayload {
  mentorIds: number[]
  mentorNames: string[]
  assignNote?: string
}

const toRequestParams = <T extends object>(params: T) => {
  const requestParams: Record<string, string | number> = {}

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    if (typeof value === 'string' || typeof value === 'number') {
      requestParams[key] = value
    }
  })

  return requestParams
}

export function getLeadMentorJobOverviewList(params: LeadMentorJobOverviewListParams) {
  return http.get<{ rows: LeadMentorJobOverviewListItem[] }>('/lead-mentor/job-overview/list', {
    params: toRequestParams(params),
  })
}

export function getLeadMentorJobOverviewDetail(applicationId: number) {
  return http.get<LeadMentorJobOverviewListItem>(`/lead-mentor/job-overview/${applicationId}`)
}

export function assignLeadMentorJobOverviewMentor(applicationId: number, payload: LeadMentorAssignMentorPayload) {
  return http.post(`/lead-mentor/job-overview/${applicationId}/assign-mentor`, payload)
}

export function acknowledgeLeadMentorJobOverviewStage(applicationId: number) {
  return http.post(`/lead-mentor/job-overview/${applicationId}/ack-stage-update`)
}
