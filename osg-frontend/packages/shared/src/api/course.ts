import { http } from '../utils/request'
import type { Course, CourseSchedule, PageResult, PageParams } from '../types'

// 获取课程列表
export function getCourseList(params: PageParams): Promise<PageResult<Course>> {
  return http.get('/course/list', { params })
}

// 获取课程详情
export function getCourseDetail(courseId: number): Promise<Course> {
  return http.get(`/course/${courseId}`)
}

// 获取排课列表
export function getScheduleList(params: PageParams & { studentId?: number; mentorId?: number }): Promise<PageResult<CourseSchedule>> {
  return http.get('/course/schedule/list', { params })
}

// 创建排课
export function createSchedule(data: Partial<CourseSchedule>): Promise<void> {
  return http.post('/course/schedule', data)
}

// 更新排课状态
export function updateScheduleStatus(scheduleId: number, status: string): Promise<void> {
  return http.put(`/course/schedule/${scheduleId}/status`, { status })
}
