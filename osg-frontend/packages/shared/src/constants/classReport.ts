/**
 * §3.2 课程类型常量（硬编码，不读字典）
 * 5 类：岗位辅导 / 模拟面试 / 人际关系 / 模拟期中考试 / 基础课程
 */
export const COURSE_TYPE = {
  JOB_COACHING: 'job_coaching',
  MOCK_INTERVIEW: 'mock_interview',
  RELATION_TEST: 'relation_test',
  COMMUNICATION_TEST: 'communication_test',
  BASE_COURSE: 'base_course',
} as const

export const COURSE_TYPE_OPTIONS = [
  { value: COURSE_TYPE.JOB_COACHING, label: '岗位辅导' },
  { value: COURSE_TYPE.MOCK_INTERVIEW, label: '模拟面试' },
  { value: COURSE_TYPE.RELATION_TEST, label: '人际关系' },
  { value: COURSE_TYPE.COMMUNICATION_TEST, label: '模拟期中考试' },
  { value: COURSE_TYPE.BASE_COURSE, label: '基础课程' },
] as const

export const MEMBER_STATUS = {
  NORMAL: 'normal',
  ABSENT: 'absent',
} as const

/**
 * §3.5.5 基础课程二级类型（6 选 1，硬编码）
 */
export const BASE_CATEGORY_OPTIONS = [
  { value: 'tech', label: '技术' },
  { value: 'behavior', label: '行为训练' },
  { value: 'new_resume', label: '新简历制作' },
  { value: 'resume_update', label: '简历更新' },
  { value: 'case_study', label: '咨询案例准备' },
  { value: 'other', label: '其它' },
] as const

export const ABSENT_DEFAULT_HOURS = 0.5

/**
 * §3.5.3 人际关系反馈 - 5 项评分（description 文案 TBD，由 Agent C T-517 补充）
 */
export const RELATION_RATING_ITEMS = [
  { key: 'emailQuality', label: '电子邮件质量', max: 5, description: 'TBD' },
  { key: 'etiquette', label: '礼仪', max: 5, description: 'TBD' },
  { key: 'smallTalk', label: '闲聊', max: 10, description: 'TBD' },
  { key: 'callQuality', label: '通话', max: 10, description: 'TBD' },
  { key: 'thankYouEmail', label: '感谢邮件', max: 3, description: 'TBD' },
] as const

/**
 * §3.5.3 是否推荐（3 选 1）
 */
export const RELATION_RECOMMENDATION_OPTIONS = [
  { value: 'yes', label: '强烈推荐' },
  { value: 'no', label: '不推荐' },
  { value: 'maybe', label: '视情况' },
] as const

/**
 * §3.5.4 模拟期中考试 - 进度评估 5 档
 */
export const MIDTERM_PROGRESS_OPTIONS = [
  { value: 'level1', label: '远超预期' },
  { value: 'level2', label: '超预期' },
  { value: 'level3', label: '达预期' },
  { value: 'level4', label: '落后' },
  { value: 'level5', label: '严重落后' },
] as const

/**
 * §3.5.1 / §3.5.2 表现评价 - 4 档 emoji
 */
export const PERFORMANCE_OPTIONS = [
  { value: 'great', emoji: '😀', label: '非常好' },
  { value: 'good', emoji: '🙂', label: '好' },
  { value: 'neutral', emoji: '😐', label: '一般' },
  { value: 'poor', emoji: '😕', label: '较差' },
] as const
