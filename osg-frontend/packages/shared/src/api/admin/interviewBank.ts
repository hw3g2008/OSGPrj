import { http } from '../../utils/request'

export type InterviewBankTab = 'banks' | 'applications'
export type InterviewStage = 'Screening Call' | 'First Round' | 'Second Round' | 'Superday'
export type InterviewType = 'Behavioral' | 'Technical' | 'Case'
export type InterviewIndustry = 'Investment Banking' | 'Consulting' | 'PE' | 'VC'
export type InterviewBankStatus = 'enabled' | 'disabled'

export interface InterviewBankRow {
  bankId?: number
  recordType?: 'bank' | 'application'
  interviewBankName?: string
  interviewStage: InterviewStage
  interviewType?: InterviewType
  industryName?: InterviewIndustry
  questionCount?: number
  status?: InterviewBankStatus
  updatedAt?: string | null
  applicationCode?: string
  studentName?: string
  appliedPosition?: string
  applicationTime?: string | null
  applicationSource?: string
  pendingFlag?: string
}

export interface InterviewBankListFilters {
  tab?: InterviewBankTab
  keyword?: string
  interviewStage?: InterviewStage | ''
  interviewType?: InterviewType | ''
  industryName?: InterviewIndustry | ''
}

export interface InterviewBankListResponse {
  rows: InterviewBankRow[]
  pendingCount: number
}

export interface SaveInterviewBankPayload {
  bankId?: number
  interviewBankName: string
  interviewStage: InterviewStage
  interviewType: InterviewType
  industryName: InterviewIndustry
  questionCount: number
  status: InterviewBankStatus
}

const toParams = (filters: InterviewBankListFilters = {}) => {
  const params: Record<string, string> = {}

  if (filters.tab) params.tab = filters.tab
  if (filters.keyword) params.keyword = filters.keyword
  if (filters.interviewStage) params.interviewStage = filters.interviewStage
  if (filters.interviewType) params.interviewType = filters.interviewType
  if (filters.industryName) params.industryName = filters.industryName

  return params
}

export function getInterviewBankList(filters: InterviewBankListFilters = {}) {
  return http.get<InterviewBankListResponse>('/admin/interview-bank/list', {
    params: toParams(filters)
  })
}

export function createInterviewBank(payload: SaveInterviewBankPayload) {
  return http.post<InterviewBankRow>('/admin/interview-bank', payload)
}

export function updateInterviewBank(payload: SaveInterviewBankPayload & { bankId: number }) {
  return http.put<InterviewBankRow>('/admin/interview-bank', payload)
}
