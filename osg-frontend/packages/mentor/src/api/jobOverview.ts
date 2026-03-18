import { http } from '@osg/shared/utils/request'

export interface JobCoaching {
  id: number
  studentId: number
  studentName?: string
  mentorId: number
  company: string
  position: string
  location?: string
  interviewStage?: string
  interviewTime?: string
  coachingStatus: string
  result?: string
  createTime?: string
}

export function listJobOverview(query?: any) {
  return http.get<{ rows: JobCoaching[]; total: number }>('/api/mentor/job-overview/list', { params: query })
}

export function confirmJobCoaching(id: number) {
  return http.put(`/api/mentor/job-overview/${id}/confirm`)
}

export function getJobCalendar() {
  return http.get<JobCoaching[]>('/api/mentor/job-overview/calendar')
}
