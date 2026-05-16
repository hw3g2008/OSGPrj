/**
 * §3.2 课程类型常量（硬编码，不读字典）
 * 5 类：岗位辅导 / 模拟面试 / 人际关系 / 模拟期中考试 / 基础课程
 *
 * i18n：选项的 `label` / `description` 字段值是 **i18n key**，由消费方在模板中
 * 通过 t() 解析为本地化文本（保持纯数据，便于复用与测试）。
 */
export const COURSE_TYPE = {
  JOB_COACHING: 'job_coaching',
  MOCK_INTERVIEW: 'mock_interview',
  RELATION_TEST: 'relation_test',
  COMMUNICATION_TEST: 'communication_test',
  BASE_COURSE: 'base_course',
} as const

export const COURSE_TYPE_OPTIONS = [
  { value: COURSE_TYPE.JOB_COACHING, label: 'common.shared.classReport.constants.courseType.jobCoaching' },
  { value: COURSE_TYPE.MOCK_INTERVIEW, label: 'common.shared.classReport.constants.courseType.mockInterview' },
  { value: COURSE_TYPE.RELATION_TEST, label: 'common.shared.classReport.constants.courseType.relation' },
  { value: COURSE_TYPE.COMMUNICATION_TEST, label: 'common.shared.classReport.constants.courseType.midtermMock' },
  { value: COURSE_TYPE.BASE_COURSE, label: 'common.shared.classReport.constants.courseType.baseCourse' },
] as const

export const MEMBER_STATUS = {
  NORMAL: 'normal',
  ABSENT: 'absent',
} as const

/**
 * §3.5.5 基础课程二级类型（D 合并后 5 选 1）。
 * 'new_resume' + 'resume_update' 合并为 'resume'；选完后由 RESUME_SUBTYPE_OPTIONS 决定
 * 新建/更新，提交时由 ClassReportFlowModal 派生为旧 enum 写入后端，保持 DB 兼容。
 */
export const BASE_CATEGORY_OPTIONS = [
  { value: 'tech', label: 'common.shared.classReport.constants.baseCategory.tech' },
  { value: 'behavior', label: 'common.shared.classReport.constants.baseCategory.behavior' },
  { value: 'resume', label: 'common.shared.classReport.constants.baseCategory.resume' },
  { value: 'case_study', label: 'common.shared.classReport.constants.baseCategory.caseStudy' },
  { value: 'other', label: 'common.shared.classReport.constants.baseCategory.other' },
] as const

/** D: 选 baseCourseCategory='resume' 后的二级 radio */
export const RESUME_SUBTYPE_OPTIONS = [
  { value: 'new', label: 'common.shared.classReport.constants.resumeSubtype.new' },
  { value: 'update', label: 'common.shared.classReport.constants.resumeSubtype.update' },
] as const

export const ABSENT_DEFAULT_HOURS = 0.5

/**
 * §3.5.3 人际关系反馈 - 5 项评分
 * description 为评分细则，供导师填写时参考。
 */
export const RELATION_RATING_ITEMS = [
  {
    key: 'emailQuality',
    label: 'common.shared.classReport.constants.relationRating.emailQuality.label',
    max: 5,
    description: 'common.shared.classReport.constants.relationRating.emailQuality.description',
  },
  {
    key: 'etiquette',
    label: 'common.shared.classReport.constants.relationRating.etiquette.label',
    max: 5,
    description: 'common.shared.classReport.constants.relationRating.etiquette.description',
  },
  {
    key: 'smallTalk',
    label: 'common.shared.classReport.constants.relationRating.smallTalk.label',
    max: 10,
    description: 'common.shared.classReport.constants.relationRating.smallTalk.description',
  },
  {
    key: 'callQuality',
    label: 'common.shared.classReport.constants.relationRating.callQuality.label',
    max: 10,
    description: 'common.shared.classReport.constants.relationRating.callQuality.description',
  },
  {
    key: 'thankYouEmail',
    label: 'common.shared.classReport.constants.relationRating.thankYouEmail.label',
    max: 3,
    description: 'common.shared.classReport.constants.relationRating.thankYouEmail.description',
  },
] as const

/**
 * §3.5.3 是否推荐（3 选 1）
 */
export const RELATION_RECOMMENDATION_OPTIONS = [
  { value: 'yes', label: 'common.shared.classReport.constants.recommendation.yes' },
  { value: 'no', label: 'common.shared.classReport.constants.recommendation.no' },
  { value: 'maybe', label: 'common.shared.classReport.constants.recommendation.maybe' },
] as const

/**
 * §3.5.4 模拟期中考试 - 进度评估 5 档
 */
export const MIDTERM_PROGRESS_OPTIONS = [
  { value: 'level1', label: 'common.shared.classReport.constants.midtermProgress.level1' },
  { value: 'level2', label: 'common.shared.classReport.constants.midtermProgress.level2' },
  { value: 'level3', label: 'common.shared.classReport.constants.midtermProgress.level3' },
  { value: 'level4', label: 'common.shared.classReport.constants.midtermProgress.level4' },
  { value: 'level5', label: 'common.shared.classReport.constants.midtermProgress.level5' },
] as const

/**
 * §3.5.1 / §3.5.2 表现评价 - 4 档 emoji
 */
export const PERFORMANCE_OPTIONS = [
  { value: 'great', emoji: '😀', label: 'common.shared.classReport.constants.performance.great' },
  { value: 'good', emoji: '🙂', label: 'common.shared.classReport.constants.performance.good' },
  { value: 'neutral', emoji: '😐', label: 'common.shared.classReport.constants.performance.neutral' },
  { value: 'poor', emoji: '😕', label: 'common.shared.classReport.constants.performance.poor' },
] as const
