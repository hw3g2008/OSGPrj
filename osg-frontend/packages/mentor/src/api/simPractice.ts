import { http } from '@osg/shared/utils/request'

export interface SimPractice {
  id: number
  studentId: number
  studentName?: string
  mentorId: number
  practiceType: string
  assignedTime: string
  status: string
  totalHours?: number
  feedbackLevel?: string
  feedbackNote?: string
  createTime?: string
}

export function listSimPractice(query?: any) {
  return http.get<{ rows: SimPractice[]; total: number }>('/api/mentor/sim-practice/list', { params: query })
}

export function confirmSimPractice(id: number) {
  return http.put(`/api/mentor/sim-practice/${id}/confirm`)
}
