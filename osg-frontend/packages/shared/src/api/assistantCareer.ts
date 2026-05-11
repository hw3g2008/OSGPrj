import { http } from '../utils/request'
import {
  type DrillDownIndustry,
  type PositionListParams,
  type PositionStats,
  type PositionStudentRow,
} from './admin/position'

export type AssistantPositionFilters = PositionListParams
export type AssistantPositionStats = PositionStats
export type AssistantPositionIndustry = DrillDownIndustry
export type AssistantPositionStudent = PositionStudentRow

export interface AssistantPositionListItem {
  positionId: number
  positionCategory?: string
  industry?: string
  companyName?: string
  companyType?: string
  companyWebsite?: string
  positionName?: string
  department?: string
  region?: string
  city?: string
  recruitmentCycle?: string
  targetMajors?: string
  projectYear?: string
  publishTime?: string
  deadline?: string
  displayStatus?: string
  positionUrl?: string
  applicationNote?: string
  myStudentCount: number
}

export interface AssistantJobOverviewRecord {
  id: number
  applicationId?: number
  coachingId?: number
  studentId?: number
  studentName?: string
  mentorId?: number
  mentorName?: string
  mentorNames?: string
  company?: string
  companyName?: string
  position?: string
  positionName?: string
  location?: string
  city?: string
  cityLabel?: string
  region?: string
  interviewStage?: string
  currentStage?: string
  interviewTime?: string
  coachingStatus?: string
  result?: string
  latestRating?: string | number | null
  lessonCount?: number
  lessonReported?: boolean
}

export interface AssistantJobOverviewClassRecord {
  recordId?: number
  classDate?: string
  durationHours?: number | null
  courseType?: string
  memberStatus?: string
  rate?: string | null
  feedbackContent?: string | null
}

export interface AssistantJobOverviewMentorGroup {
  mentorId?: number | null
  mentorName?: string | null
  totalHours?: number | null
  avgRating?: number | null
  records: AssistantJobOverviewClassRecord[]
}

export interface AssistantJobOverviewDetail extends AssistantJobOverviewRecord {
  classRecordsByMentor?: AssistantJobOverviewMentorGroup[]
}

export interface AssistantMockPracticeRecord {
  practiceId: number
  studentId?: number
  studentName?: string
  practiceType?: string
  requestContent?: string
  requestedMentorCount?: number
  preferredMentorNames?: string
  status?: string
  mentorIds?: string | null
  mentorNames?: string | null
  mentorBackgrounds?: string | null
  scheduledAt?: string | null
  completedHours?: number
  feedbackRating?: number | null
  feedbackSummary?: string | null
  submittedAt?: string | null
  note?: string | null
}

export interface AssistantTableResponse<T> {
  rows: T[]
  total: number
}

interface AssistantJobOverviewFilters extends Record<string, string | number | undefined> {
  companyName?: string
  currentStage?: string
  coachingStatus?: string
  interviewTimeStart?: string
  interviewTimeEnd?: string
}

interface AssistantMockPracticeFilters extends Record<string, string | number | undefined> {
  practiceType?: string
  status?: string
}

function toRequestParams(filters: Record<string, string | number | undefined>) {
  const params: Record<string, string | number> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    params[key] = value
  })

  return params
}

export function getAssistantPositionStats(filters: AssistantPositionFilters = {}) {
  return http.get<AssistantPositionStats>('/assistant/positions/stats', {
    params: toRequestParams(filters as Record<string, string | number | undefined>),
  })
}

export function getAssistantPositionDrillDown(filters: AssistantPositionFilters = {}) {
  return http.get<AssistantPositionIndustry[]>('/assistant/positions/drill-down', {
    params: toRequestParams(filters as Record<string, string | number | undefined>),
  })
}

export function getAssistantPositionList(filters: AssistantPositionFilters = {}) {
  return http.get<AssistantPositionListItem[]>('/assistant/positions/list', {
    params: toRequestParams(filters as Record<string, string | number | undefined>),
  })
}

export function getAssistantPositionStudents(positionId: number) {
  return http.get<{ rows: AssistantPositionStudent[] }>(`/assistant/positions/${positionId}/students`)
}

export function getAssistantJobOverviewList(filters: AssistantJobOverviewFilters = {}) {
  return http.get<AssistantTableResponse<AssistantJobOverviewRecord>>('/assistant/job-overview/list', {
    params: toRequestParams(filters),
  })
}

export function getAssistantJobOverviewCalendar() {
  return http.get<AssistantJobOverviewRecord[]>('/assistant/job-overview/calendar')
}

export function getAssistantJobOverviewDetail(applicationId: number) {
  return http.get<AssistantJobOverviewDetail>(`/assistant/job-overview/${applicationId}`)
}

export function getAssistantMockPracticeList(filters: AssistantMockPracticeFilters = {}) {
  return http.get<AssistantTableResponse<AssistantMockPracticeRecord>>('/assistant/mock-practice/list', {
    params: toRequestParams(filters),
  })
}

/* ===== §C.6 asst 端业务接口（确认收徒 / 确认阶段更新 / 模拟应聘确认 / 模拟应聘签收） ===== */

/**
 * §C.4 asst 端确认收徒（asst 自己被分配为辅导者时的接收入口）。
 */
export function confirmAssistantJobOverviewCoaching(applicationId: number) {
  return http.put(`/assistant/job-overview/${applicationId}/confirm-coaching`)
}

/**
 * §C.4 asst 端确认 LM 推送的阶段更新（消除 stageUpdated 标记）。
 */
export function acknowledgeAssistantJobOverviewStage(applicationId: number) {
  return http.post(`/assistant/job-overview/${applicationId}/ack-stage-update`)
}

/**
 * §C.4 asst 端模拟应聘 confirm（导师确认收徒后调用）。
 */
export function confirmAssistantMockPractice(practiceId: number) {
  return http.put(`/assistant/mock-practice/${practiceId}/confirm`)
}

/**
 * §C.4 asst 端模拟应聘 acknowledge-assignment（asst 收到推送后的签收）。
 */
export function acknowledgeAssistantMockPracticeAssignment(practiceId: number) {
  return http.post(`/assistant/mock-practice/${practiceId}/acknowledge-assignment`)
}

/**
 * §A.0.3 asst 端拉取活跃辅导对象（前端课程记录提交表单做下拉源）。
 */
export interface MyTargetsResponse {
  coachings: Array<{
    applicationId: number
    studentId?: number
    studentName?: string
    companyName?: string
    positionName?: string
    status?: string
  }>
  practices: Array<{
    practiceId: number
    studentId?: number
    studentName?: string
    practiceType?: string
    status?: string
    requestContent?: string
  }>
}
export function getAssistantMyTargets() {
  return http.get<MyTargetsResponse>('/assistant/job-overview/my-targets')
}
