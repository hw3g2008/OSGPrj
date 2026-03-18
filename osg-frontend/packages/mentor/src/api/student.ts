import { http } from '@osg/shared/utils/request'

export interface Student {
  userId: number
  nickName: string
  phonenumber?: string
  email?: string
}

export interface StudentPosition {
  id: number
  company: string
  position: string
  location?: string
}

export function listMentorStudents() {
  return http.get<{ rows: Student[]; total: number }>('/api/mentor/students/list')
}

export function listStudentPositions(studentId: number) {
  return http.get<StudentPosition[]>(`/api/mentor/students/${studentId}/positions`)
}
