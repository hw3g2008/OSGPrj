// 课程状态
export type CourseStatus = 'draft' | 'published' | 'archived'

// 排课状态
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

// 课程
export interface Course {
  courseId: number
  courseName: string
  description?: string
  category?: string
  duration?: number          // 课时长度（分钟）
  status: CourseStatus
  createTime?: string
  updateTime?: string
}

// 排课
export interface CourseSchedule {
  scheduleId: number
  courseId: number
  courseName?: string
  studentId: number
  studentName?: string
  mentorId: number
  mentorName?: string
  scheduledTime: string      // 预约时间
  duration: number           // 时长（分钟）
  status: ScheduleStatus
  meetingUrl?: string        // 会议链接
  notes?: string
  feedback?: string
  rating?: number
  createTime?: string
  updateTime?: string
}
