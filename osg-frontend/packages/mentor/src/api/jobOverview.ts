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
  return http.get<{ rows: JobCoaching[]; total: number }>('/mentor/job-overview/list', { params: query })
}

export function confirmJobCoaching(id: number) {
  return http.put(`/mentor/job-overview/${id}/confirm`)
}

/**
 * §C.3 mentor 端确认 LM 推送的阶段更新（消除 stageUpdated 标记）。
 */
export function acknowledgeMentorJobOverviewStage(id: number) {
  return http.post(`/mentor/job-overview/${id}/ack-stage-update`)
}

/**
 * §A.0.3 mentor 端拉取活跃辅导对象（前端课程记录提交表单做下拉源）。
 */
export function getMentorMyTargets() {
  return http.get('/mentor/job-overview/my-targets')
}

export function getJobCalendar() {
  return http.get<JobCoaching[]>('/mentor/job-overview/calendar')
}
