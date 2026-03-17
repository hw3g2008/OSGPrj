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
  school?: string
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
  targetPosition?: string
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
  school?: string
  majorDirection?: string
  subDirection?: string
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
