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
  /**
   * 批次 7 + 7.5：与 accountStatus 维度正交的独立冻结标记。
   * 0 = 未冻结 / 1 = 已冻结
   * 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.2
   */
  frozen?: 0 | 1
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

/**
 * 批次 7 + 7.5 学员账号状态变更 API。
 * 后端 PUT /admin/student/status，accountStatus / frozen 二维度独立。
 * 见 docs/plans/stage-coaching-request/09-rule-a-alignment-fix-plan.md §13.4 / §13.6
 */
export interface ChangeStudentStatusPayload {
  studentId: number
  action: 'freeze' | 'unfreeze' | 'restore' | 'refund' | 'end_contract' | 'rejoin'
  reason?: string
  remark?: string
}

export interface ChangeStudentStatusResult {
  studentId: number
  accountStatus?: string
  frozen?: 0 | 1
}

export function changeStudentStatus(payload: ChangeStudentStatusPayload) {
  return http.put<ChangeStudentStatusResult>('/admin/student/status', payload)
}

export function freezeStudent(studentId: number, reason?: string, remark?: string) {
  return changeStudentStatus({ studentId, action: 'freeze', reason, remark })
}

export function unfreezeStudent(studentId: number, reason?: string, remark?: string) {
  return changeStudentStatus({ studentId, action: 'unfreeze', reason, remark })
}

export function endStudentContract(studentId: number, reason?: string, remark?: string) {
  return changeStudentStatus({ studentId, action: 'end_contract', reason, remark })
}

export function refundStudent(studentId: number, reason?: string, remark?: string) {
  return changeStudentStatus({ studentId, action: 'refund', reason, remark })
}

/**
 * 「重新加入」action — 用于退费学员的纯账号激活路径（不创建新合同）。
 * 通常前端走 RenewContractModal + reactivateAccount=true 的路径，由
 * /admin/contract/renew 在同事务内同步刷 accountStatus + frozen。
 * 本 API 保留为后端 service 兜底入口（仅在前端直接需要"激活但不续签"时使用）。
 */
export function rejoinStudent(studentId: number, reason?: string, remark?: string) {
  return changeStudentStatus({ studentId, action: 'rejoin', reason, remark })
}
