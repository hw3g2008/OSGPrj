import { http } from '../../utils/request'

export interface MentorChangeRequestItem {
  requestId: number
  userId: number
  changeSummary: string
  payloadJson: string
  status: 'pending' | 'approved' | 'rejected'
  requestedBy?: string
  reviewer?: string
  reviewedAt?: string
  createTime?: string
  remark?: string
}

export interface MentorChangeReviewParams {
  status?: string
  userId?: number
}

export interface RejectMentorChangePayload {
  reason: string
}

export function listMentorChangeRequests(params: MentorChangeReviewParams = {}) {
  return http.get<MentorChangeRequestItem[]>('/admin/mentor-profile-change/list', { params })
}

export function approveMentorChangeRequest(requestId: number) {
  return http.put<MentorChangeRequestItem>(`/admin/mentor-profile-change/${requestId}/approve`)
}

export function rejectMentorChangeRequest(requestId: number, payload: RejectMentorChangePayload) {
  return http.put<MentorChangeRequestItem>(`/admin/mentor-profile-change/${requestId}/reject`, payload)
}
