import { http } from '@osg/shared/utils/request'

export interface MockPractice {
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

export function listMockPractice(query?: any) {
  return http.get<{ rows: MockPractice[]; total: number }>('/api/mentor/mock-practice/list', { params: query })
}

export function confirmMockPractice(id: number) {
  return http.put(`/api/mentor/mock-practice/${id}/confirm`)
}
