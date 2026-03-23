import { http } from '../utils/request'

export interface LeadMentorStudentOption {
  value: string
  label: string
}

export interface LeadMentorStudentRelation {
  value: string
  label: string
  tone?: string
}

export interface LeadMentorStudentListParams {
  keyword?: string
  relation?: 'coaching' | 'managed' | 'dual'
  school?: string
  majorDirection?: string
  direction?: string
  accountStatus?: string
}

export interface LeadMentorStudentListItem {
  studentId: number
  studentName?: string
  email?: string
  school?: string
  majorDirection?: string
  relations: LeadMentorStudentRelation[]
  relationCodes?: string[]
  applyCount?: number
  interviewCount?: number
  offerCount?: number
  remainingHours?: number
  accountStatus?: string
  accountStatusLabel?: string
}

export interface LeadMentorStudentMeta {
  relationOptions: LeadMentorStudentOption[]
  schools: LeadMentorStudentOption[]
  majorDirections: LeadMentorStudentOption[]
  accountStatuses: LeadMentorStudentOption[]
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

export function getLeadMentorStudentMeta() {
  return http.get<LeadMentorStudentMeta>('/lead-mentor/students/meta')
}

export function getLeadMentorStudentList(params: LeadMentorStudentListParams = {}) {
  return http.get<{ rows: LeadMentorStudentListItem[] }>('/lead-mentor/students/list', {
    params: toRequestParams(params),
  })
}
