import { http } from '../../utils/request'

export interface StudentChangeRequestItem {
  requestId: number
  studentId: number
  changeType?: string
  fieldKey?: string
  fieldLabel?: string
  beforeValue?: string
  afterValue?: string
  status?: string
  reviewer?: string
  reviewedAt?: string
  requestedBy?: string
  requestedAt?: string
  remark?: string
}

export interface SubmitStudentChangeRequestPayload {
  studentId: number
  changeType: string
  fieldKey: string
  fieldLabel?: string
  beforeValue?: string
  afterValue: string
  remark?: string
}

export function getStudentChangeRequestList(studentId?: number, status?: string) {
  return http.get<{ rows: StudentChangeRequestItem[] }>('/admin/student/change-request/list', {
    params: {
      studentId,
      status
    }
  })
}

export function submitStudentChangeRequest(payload: SubmitStudentChangeRequestPayload) {
  return http.post<StudentChangeRequestItem>('/admin/student/change-request', payload)
}

export function approveStudentChangeRequest(requestId: number) {
  return http.put<StudentChangeRequestItem>(`/admin/student/change-request/${requestId}/approve`)
}

export function rejectStudentChangeRequest(requestId: number, reason?: string) {
  return http.put<StudentChangeRequestItem>(`/admin/student/change-request/${requestId}/reject`, {
    reason
  })
}
