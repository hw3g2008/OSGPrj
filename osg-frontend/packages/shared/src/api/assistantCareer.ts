import { http } from '../utils/request'
import {
  getPositionDrillDown,
  getPositionStats,
  getPositionStudents,
  type DrillDownIndustry,
  type PositionListParams,
  type PositionStats,
  type PositionStudentRow,
} from './admin/position'

export type AssistantPositionFilters = PositionListParams
export type AssistantPositionStats = PositionStats
export type AssistantPositionIndustry = DrillDownIndustry
export type AssistantPositionStudent = PositionStudentRow

export interface AssistantJobOverviewRecord {
  id: number
  studentId?: number
  studentName?: string
  mentorId?: number
  company?: string
  position?: string
  location?: string
  interviewStage?: string
  interviewTime?: string
  coachingStatus?: string
  result?: string
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
  company?: string
  coachingStatus?: string
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
  return getPositionStats(filters)
}

export function getAssistantPositionDrillDown(filters: AssistantPositionFilters = {}) {
  return getPositionDrillDown(filters)
}

export function getAssistantPositionStudents(positionId: number) {
  return getPositionStudents(positionId)
}

export function getAssistantJobOverviewList(filters: AssistantJobOverviewFilters = {}) {
  return http.get<AssistantTableResponse<AssistantJobOverviewRecord>>('/assistant/job-overview/list', {
    params: toRequestParams(filters),
  })
}

export function getAssistantJobOverviewCalendar() {
  return http.get<AssistantJobOverviewRecord[]>('/assistant/job-overview/calendar')
}

export function getAssistantMockPracticeList(filters: AssistantMockPracticeFilters = {}) {
  return http.get<AssistantTableResponse<AssistantMockPracticeRecord>>('/api/mentor/mock-practice/list', {
    params: toRequestParams(filters),
  })
}
