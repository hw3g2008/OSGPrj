import { http } from '../../utils/request'

export type FeedbackTab = 'prep' | 'networking' | 'mock_midterm'

export interface FeedbackFilters {
  type?: FeedbackTab
  keyword?: string
}

export interface FeedbackStats {
  totalCount: number
  prepCount: number
  networkingCount: number
  mockMidtermCount: number
}

export interface FeedbackRow {
  feedbackId: number
  feedbackType: FeedbackTab
  mentorName: string
  studentName: string
  courseLabel: string
  performanceLabel?: string | null
  sourceLabel: string
  feedbackDate?: string | null
  updatedAt?: string | null
  emailQuality?: number | null
  etiquetteScore?: number | null
  callQuality?: number | null
  recommendedLabel?: string | null
  score?: number | null
  assessmentTopic?: string | null
}

const toRequestParams = (filters: FeedbackFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.type) {
    params.type = filters.type
  }

  if (filters.keyword) {
    params.keyword = filters.keyword
  }

  return params
}

export function getFeedbackList(filters: FeedbackFilters = {}) {
  return http.get<{ rows: FeedbackRow[]; stats: FeedbackStats }>('/admin/feedback/list', {
    params: toRequestParams(filters)
  })
}
