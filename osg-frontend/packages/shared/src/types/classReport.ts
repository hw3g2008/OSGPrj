export type CourseType =
  | 'job_coaching'
  | 'mock_interview'
  | 'relation_test'
  | 'communication_test'
  | 'base_course'

export type ReferenceType =
  | 'application'
  | 'mock_interview'
  | 'relation_test'
  | 'communication_test'

export type MemberStatus = 'normal' | 'absent'

export type BaseCategory =
  | 'tech'
  | 'behavior'
  | 'new_resume'
  | 'resume_update'
  | 'case_study'
  | 'other'

/**
 * 求职辅导 / 模拟面试反馈 payload（5 项评分 + 选项 + 备注）
 * §4A.1 / §3.2 Step 5 反馈区
 */
export interface JobCoachingFeedbackPayload {
  schemaVersion: 1
  type: 'job_coaching'
  ratings: {
    preparation?: number
    communication?: number
    technical?: number
    confidence?: number
    overall?: number
  }
  highlights?: string
  improvements?: string
  nextSteps?: string
  narrative?: string
}

export interface MockInterviewFeedbackPayload {
  schemaVersion: 1
  type: 'mock_interview'
  ratings: {
    preparation?: number
    communication?: number
    technical?: number
    confidence?: number
    overall?: number
  }
  highlights?: string
  improvements?: string
  nextSteps?: string
  narrative?: string
}

/**
 * 人际关系反馈 payload（5 项打分 + 推荐 + 截图 + narrative）
 */
export interface RelationFeedbackPayload {
  schemaVersion: 1
  type: 'relation_test' | 'communication_test'
  ratings: {
    emailQuality?: number
    etiquette?: number
    smallTalk?: number
    callQuality?: number
    thankYouEmail?: number
  }
  recommendation?: string
  narrative?: string
  screenshotUrls?: string[]
}

/**
 * 期中考试反馈 payload（得分 / 逐题 / 进度）
 */
export interface MidtermFeedbackPayload {
  schemaVersion: 1
  type: 'midterm'
  totalScore?: number
  maxScore?: number
  questions?: Array<{
    questionNo: number
    score?: number
    maxScore?: number
    comment?: string
  }>
  progressSummary?: string
  narrative?: string
}

/**
 * 基础课程反馈 payload（通用 narrative + 简历上传）
 */
export interface BaseCourseFeedbackPayload {
  schemaVersion: 1
  type: 'base_course'
  baseCourseCategory?: BaseCategory
  baseCourseTopics?: string[]
  narrative?: string
  resumeUrl?: string
}

export type ClassReportFeedbackPayload =
  | JobCoachingFeedbackPayload
  | MockInterviewFeedbackPayload
  | RelationFeedbackPayload
  | MidtermFeedbackPayload
  | BaseCourseFeedbackPayload

export interface ClassReportPayload {
  studentId: number
  classDate: string
  durationHours: number
  courseType: CourseType
  referenceType?: ReferenceType
  referenceId?: number
  baseCourseCategory?: BaseCategory
  baseCourseTopics?: string[]
  memberStatus: MemberStatus
  absentRemark?: string
  rate?: string
  feedbackContent?: ClassReportFeedbackPayload | Record<string, unknown>
  screenshotUrls?: string[]
}

/**
 * 学员下拉选项（reportable-students 接口返回项 / 表单选项）
 */
export interface StudentOption {
  studentId: number
  studentName: string
  disabled?: boolean
}

/**
 * 关联申请下拉选项（reference-candidates 接口返回项）
 */
export interface ReferenceOption {
  referenceType: ReferenceType
  referenceId: number
  label: string
  disabled?: boolean
  raw?: unknown
}
