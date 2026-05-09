import { http } from '../../utils/request'

export interface StudentListParams {
  pageNum: number
  pageSize: number
  studentName?: string
  leadMentorId?: number
  school?: string
  graduationYear?: number
  recruitmentCycle?: string
  majorDirection?: string
  accountStatus?: string
}

export interface StudentListItem {
  studentId: number
  studentName: string
  email: string
  leadMentorId?: number
  leadMentorName?: string
  leadMentorIds?: number[]
  leadMentorNames?: string[]
  assistantId?: number
  assistantName?: string
  assistantIds?: number[]
  assistantNames?: string[]
  school?: string
  major?: string
  graduationYear?: number | string
  graduationMonth?: string
  majorDirection?: string
  targetPosition?: string
  totalHours?: number
  jobCoachingCount?: number
  basicCourseCount?: number
  mockInterviewCount?: number
  remainingHours?: number
  reminder?: string
  contractStatus?: string
  accountStatus?: string
  targetRegion?: string
  isBlacklisted?: boolean
  pendingReview?: boolean
  reviewStatus?: string | null
}

export function getStudentList(params: StudentListParams) {
  return http.get<{ rows: StudentListItem[]; total: number }>('/admin/student/list', { params })
}

export interface UpdateStudentPayload {
  studentId: number
  studentName?: string
  email: string
  school?: string | string[]
  major?: string
  graduationYear?: number
  graduationMonth?: string
  /** @deprecated 兼容期保留，新代码请使用 majorDirections[] */
  majorDirection?: string
  /** @deprecated 兼容期保留，新代码请使用 subDirections[] */
  subDirection?: string
  majorDirections?: string[]
  subDirections?: string[]
  targetRegion?: string[]
  recruitmentCycle?: string[]
  highSchool?: string
  studyPlan?: string
  visaStatus?: string
  remark?: string
  /** @deprecated 兼容期保留，新代码请使用 leadMentorIds[] */
  leadMentorId?: number
  /** @deprecated 兼容期保留，新代码请使用 assistantIds[] */
  assistantId?: number
  leadMentorIds?: number[]
  assistantIds?: number[]
}

export interface ResetStudentPasswordResult {
  studentId: number
  loginAccount: string
  defaultPassword: string
}

export function updateStudent(payload: UpdateStudentPayload) {
  return http.put<StudentListItem>('/admin/student', payload)
}

export function resetStudentPassword(studentId: number) {
  return http.post<ResetStudentPasswordResult>('/admin/student/reset-password', { studentId })
}
