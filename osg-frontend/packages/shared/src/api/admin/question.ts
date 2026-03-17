import { http } from '../../utils/request'

export type QuestionTab = 'pending' | 'approved' | 'rejected'
export type InterviewRound = 'R1' | 'R2' | 'Final' | 'Superday' | 'HireVue'
export type QuestionReviewStatus = 'pending' | 'approved' | 'rejected'
export type QuestionSourceType = '入职面试申请' | '自主填写'

export interface InterviewQuestionRow {
  questionId: number
  questionCode: string
  studentId?: string
  studentName: string
  companyName: string
  departmentName: string
  officeLocation: string
  interviewRound: InterviewRound
  interviewStatus: string
  interviewDate?: string | null
  interviewerName?: string | null
  questionCount: number
  questionItems?: string[]
  supplementalNote?: string | null
  sourceType: QuestionSourceType
  submittedAt?: string | null
  reviewStatus: QuestionReviewStatus
  eligibleStudentCount?: number
  sharePreview?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewComment?: string | null
}

export interface QuestionListFilters {
  tab?: QuestionTab
  keyword?: string
  companyName?: string
  interviewRound?: InterviewRound | ''
  beginDate?: string
  endDate?: string
}

export interface QuestionListResponse {
  rows: InterviewQuestionRow[]
  pendingCount: number
}

export interface BatchReviewResponse {
  reviewedCount: number
  eligibleStudentCount: number
  rows: InterviewQuestionRow[]
}

export interface BatchReviewPayload {
  questionIds: number[]
  reviewComment?: string
}

const toParams = (filters: QuestionListFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.tab) params.tab = filters.tab
  if (filters.keyword) params.keyword = filters.keyword
  if (filters.companyName) params.companyName = filters.companyName
  if (filters.interviewRound) params.interviewRound = filters.interviewRound
  if (filters.beginDate) params.beginDate = filters.beginDate
  if (filters.endDate) params.endDate = filters.endDate

  return params
}

export function getQuestionList(filters: QuestionListFilters = {}) {
  return http.get<QuestionListResponse>('/admin/question/list', {
    params: toParams(filters)
  })
}

export function batchApproveQuestions(payload: BatchReviewPayload) {
  return http.put<BatchReviewResponse>('/admin/question/batch-approve', payload)
}

export function batchRejectQuestions(payload: BatchReviewPayload) {
  return http.put<BatchReviewResponse>('/admin/question/batch-reject', payload)
}
