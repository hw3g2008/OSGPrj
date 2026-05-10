import { http } from '../utils/request'

export interface LeadMentorJobOverviewListParams {
  scope: 'pending' | 'coaching' | 'managed'
  companyName?: string
  currentStage?: string
  interviewTimeStart?: string
  interviewTimeEnd?: string
  lessonReported?: boolean
}

export interface LeadMentorJobOverviewListItem {
  applicationId: number
  coachingId?: number | null
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
  cityLabel?: string
  latestRating?: string
  lessonCount?: number
  lessonReported?: boolean
}

export interface LeadMentorAssignMentorPayload {
  mentorIds: number[]
  mentorNames: string[]
  assignNote?: string
}

export interface LeadMentorCalendarRecord {
  id: number
  studentName?: string
  company?: string
  position?: string
  location?: string
  interviewTime?: string
  interviewStage?: string
  coachingStatus?: string
  result?: string | null
}

const toRequestParams = <T extends object>(params: T) => {
  const requestParams: Record<string, string | number | boolean> = {}

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
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

export interface LeadMentorClassRecordDetailItem {
  recordId: number
  classDate: string
  courseType?: string
  memberStatus?: string
  durationHours?: number
  rate?: string
  feedbackSummary?: string | null
  referenceType?: string
  referenceId?: number | null
}

export interface LeadMentorClassRecordMentorGroup {
  mentorId: number
  mentorName: string
  totalHours: number
  avgRating?: string | null
  records: LeadMentorClassRecordDetailItem[]
}

export interface LeadMentorJobOverviewDetail extends LeadMentorJobOverviewListItem {
  classRecordsByMentor?: LeadMentorClassRecordMentorGroup[]
}

export function getLeadMentorJobOverviewDetail(applicationId: number) {
  return http.get<LeadMentorJobOverviewDetail>(`/lead-mentor/job-overview/${applicationId}`)
}

export function getLeadMentorJobOverviewCoachingDetail(coachingId: number) {
  return http.get<LeadMentorJobOverviewDetail>(`/lead-mentor/job-overview/coaching/${coachingId}`)
}

export function assignLeadMentorJobOverviewMentor(applicationId: number, payload: LeadMentorAssignMentorPayload) {
  return http.post(`/lead-mentor/job-overview/${applicationId}/assign-mentor`, payload)
}

export function assignLeadMentorJobOverviewCoachingMentor(coachingId: number, payload: LeadMentorAssignMentorPayload) {
  return http.post(`/lead-mentor/job-overview/coaching/${coachingId}/assign-mentor`, payload)
}

export function acknowledgeLeadMentorJobOverviewStage(applicationId: number) {
  return http.post(`/lead-mentor/job-overview/${applicationId}/ack-stage-update`)
}

/**
 * §C.5 LM 端确认收徒（LM 自己被分配为辅导者时的接收入口）。
 */
export function confirmLeadMentorJobOverviewCoaching(applicationId: number) {
  return http.put(`/lead-mentor/job-overview/${applicationId}/confirm-coaching`)
}

/**
 * §A.0.3 LM 端拉取活跃辅导对象（前端课程记录提交表单做下拉源）。
 */
export function getLeadMentorMyTargets() {
  return http.get('/lead-mentor/job-overview/my-targets')
}

export function getLeadMentorJobOverviewCalendar() {
  return http.get<LeadMentorCalendarRecord[]>('/lead-mentor/job-overview/calendar')
}

export function getMentorJobOverviewCalendar() {
  return http.get<LeadMentorCalendarRecord[]>('/api/mentor/job-overview/calendar')
}
