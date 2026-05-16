// i18n-skip-file: 本文件仅类型定义，中文均为字段注释，按 glossary §4 不做 t() 化
export type CourseType =
  | 'job_coaching'
  | 'mock_interview'
  | 'relation_test'
  | 'communication_test'
  | 'base_course'

export type ReferenceType =
  | 'job_coaching'
  | 'application'
  | 'mock_interview'
  | 'relation_test'
  | 'communication_test'
  | 'midterm_exam'

export type MemberStatus = 'normal' | 'absent'

/**
 * 基础课程二级类型。
 * `resume` 是 UI 合并入口（"简历"），用户选完后通过 ResumeSubType 区分新建/更新，
 * 提交后端时由 ClassReportFlowModal 派生为 `new_resume` 或 `resume_update`，DB 仍存原 enum。
 * `new_resume` / `resume_update` 保留作为派生/兼容值，UI 不再直接选择。
 */
export type BaseCategory =
  | 'tech'
  | 'behavior'
  | 'resume'           // UI 合并入口
  | 'new_resume'       // 派生/兼容（旧数据）
  | 'resume_update'    // 派生/兼容（旧数据）
  | 'case_study'
  | 'other'

export type ResumeSubType = 'new' | 'update'

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
  /** D: UI 选择 baseCourseCategory='resume' 时的二级 radio（new/update），提交时派生为 new_resume/resume_update */
  resumeSubType?: ResumeSubType
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
  accountStatus?: string
  isBlacklisted?: boolean
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
