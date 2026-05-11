import { http } from '../../utils/request'

export interface StudentPositionListParams {
  status?: string
  positionCategory?: string
  hasCoachingRequest?: string
  keyword?: string
}

export interface StudentPositionListItem {
  studentPositionId: number
  studentId: number
  studentName?: string
  positionCategory: string
  industry?: string
  companyName: string
  companyType?: string
  companyWebsite?: string
  positionName: string
  department?: string
  region: string
  city: string
  recruitmentCycle: string
  projectYear: string
  deadline?: string
  positionUrl?: string
  status: string
  hasCoachingRequest?: string
  rejectReason?: string
  rejectNote?: string
  reviewer?: string
  reviewedAt?: string
  positionId?: number
  flowStatus?: string
  submittedAt?: string
}

export interface ReviewStudentPositionPayload {
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
  projectYear?: string
  deadline?: string
  positionUrl?: string
  // RULE-D RD-001 合并分支：指定时仅复用已有公共岗位 ID，不写新公共岗位。
  mergeToPositionId?: number
}

export interface PublicPositionSearchItem {
  positionId: number
  companyName: string
  positionName: string
  region?: string
  city?: string
  recruitmentCycle?: string
}

export interface RejectStudentPositionPayload {
  reason: string
  note?: string
}

export function getStudentPositionList(params: StudentPositionListParams = {}) {
  return http.get<{ rows: StudentPositionListItem[] }>('/admin/student-position/list', {
    params
  })
}

export function approveStudentPosition(studentPositionId: number, payload: ReviewStudentPositionPayload) {
  return http.put<StudentPositionListItem>(`/admin/student-position/${studentPositionId}/approve`, payload)
}

export function rejectStudentPosition(studentPositionId: number, payload: RejectStudentPositionPayload) {
  return http.put<StudentPositionListItem>(`/admin/student-position/${studentPositionId}/reject`, payload)
}

/**
 * RULE-D RD-001 合并分支：按 公司+岗位 模糊搜索已有公共岗位用于合并选择。
 * 复用 admin 通用岗位列表接口（带 companyName / positionName 模糊参数）。
 */
export function searchPublicPositionsForMerge(keyword: string) {
  return http.get<{ rows: PublicPositionSearchItem[] }>('/admin/position/list', {
    params: { keyword, pageSize: 20 }
  })
}
