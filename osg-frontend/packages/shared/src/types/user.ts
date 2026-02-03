// 用户角色
export type UserRole = 'student' | 'mentor' | 'lead_mentor' | 'assistant' | 'admin'

// 用户状态
export type UserStatus = 'active' | 'inactive' | 'suspended'

// 用户信息
export interface UserInfo {
  userId: number
  userName: string
  nickName: string
  email?: string
  phonenumber?: string
  sex?: '0' | '1' | '2'  // 0=男, 1=女, 2=未知
  avatar?: string
  status: UserStatus
  roles: UserRole[]
  deptId?: number
  deptName?: string
  createTime?: string
  updateTime?: string
}

// 学员扩展信息
export interface StudentInfo extends UserInfo {
  enrollmentDate?: string      // 入学日期
  expectedGraduation?: string  // 预计毕业
  classId?: number             // 班级ID
  className?: string           // 班级名称
  mentorId?: number            // 导师ID
  mentorName?: string          // 导师姓名
  totalCourseHours?: number    // 总课时
  completedHours?: number      // 已完成课时
}

// 导师扩展信息
export interface MentorInfo extends UserInfo {
  specialties?: string[]       // 专长领域
  maxStudents?: number         // 最大学员数
  currentStudents?: number     // 当前学员数
  totalCourseHours?: number    // 总授课时长
  rating?: number              // 评分
}
