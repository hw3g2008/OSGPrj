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
