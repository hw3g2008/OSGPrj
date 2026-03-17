import { http } from '../../utils/request'

export interface MockPracticeFilters {
  keyword?: string
  practiceType?: string
  status?: string
  tab?: string
}

export interface MockPracticeStats {
  pendingCount: number
  scheduledCount: number
  completedCount: number
  cancelledCount: number
  totalCount: number
}

export interface MockPracticeListItem {
  practiceId: number
  studentId: number
  studentName?: string
  practiceType: string
  requestContent: string
  requestedMentorCount?: number
  preferredMentorNames?: string
  status: string
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

export interface AssignMockPracticePayload {
  practiceId: number
  mentorIds: number[]
  mentorNames?: string[]
  mentorBackgrounds?: string[]
  scheduledAt: string
  note?: string
}

const toRequestParams = (filters: MockPracticeFilters = {}) => {
  const params: Record<string, string | number> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    params[key] = value
  })

  return params
}

export function getMockPracticeStats(filters: MockPracticeFilters = {}) {
  return http.get<MockPracticeStats>('/admin/mock-practice/stats', {
    params: toRequestParams(filters)
  })
}

export function getMockPracticeList(filters: MockPracticeFilters = {}) {
  return http.get<{ rows: MockPracticeListItem[]; stats: MockPracticeStats }>('/admin/mock-practice/list', {
    params: toRequestParams(filters)
  })
}

export function assignMockPractice(payload: AssignMockPracticePayload) {
  return http.post('/admin/mock-practice/assign', payload)
}
