import { describe, expect, it } from 'vitest'

import {
  isMidtermContext,
  isMockInterviewContext,
  isNetworkingContext,
  isResumeContext,
  resolveComments,
  resolvePayloadClassStatus,
  resolvePayloadCourseType,
  resolveTopics,
  type PerformanceOption,
  type ReportFormSnapshot,
} from '../views/class-records/assistantClassReportPayload'

const performanceOptions: PerformanceOption[] = [
  { value: 'disappointing', emoji: '😞', label: '失望' },
  { value: 'good', emoji: '🙂', label: '好的' },
  { value: 'great', emoji: '😊', label: '很好' },
  { value: 'amazing', emoji: '🌟', label: '真棒' },
]

function baseForm(overrides: Partial<ReportFormSnapshot> = {}): ReportFormSnapshot {
  return {
    courseTypeUi: 'job-coaching',
    basicContentType: '',
    jobContentType: '',
    attendanceStatus: 'attended',
    absenceRemark: '',
    positionLabel: '',
    mockPurpose: '',
    mockConcepts: '',
    mockWeakTopics: '',
    midtermAnalysis: '',
    performanceRating: '',
    networkingRecommendation: '',
    networkingScoreMap: {},
    midtermScore: undefined,
    midtermProgress: '',
    resumeBeforeFiles: [],
    resumeAfterFiles: [],
    ...overrides,
  }
}

describe('resolvePayloadCourseType', () => {
  it('maps basic → basic_course', () => {
    expect(resolvePayloadCourseType({ courseTypeUi: 'basic' })).toBe('basic_course')
  })

  it('maps job-coaching → job_coaching', () => {
    expect(resolvePayloadCourseType({ courseTypeUi: 'job-coaching' })).toBe('job_coaching')
  })

  it('maps mock-interview / networking / mock-midterm → mock_practice', () => {
    expect(resolvePayloadCourseType({ courseTypeUi: 'mock-interview' })).toBe('mock_practice')
    expect(resolvePayloadCourseType({ courseTypeUi: 'networking' })).toBe('mock_practice')
    expect(resolvePayloadCourseType({ courseTypeUi: 'mock-midterm' })).toBe('mock_practice')
  })
})

describe('resolvePayloadClassStatus', () => {
  it('returns absent when attendanceStatus is absent (regardless of courseTypeUi)', () => {
    expect(resolvePayloadClassStatus({
      courseTypeUi: 'job-coaching',
      basicContentType: '',
      jobContentType: '',
      attendanceStatus: 'absent',
    })).toBe('absent')
    expect(resolvePayloadClassStatus({
      courseTypeUi: 'mock-interview',
      basicContentType: '',
      jobContentType: '',
      attendanceStatus: 'absent',
    })).toBe('absent')
  })

  it('maps mock-interview → mock_interview', () => {
    expect(resolvePayloadClassStatus({
      courseTypeUi: 'mock-interview',
      basicContentType: '',
      jobContentType: '',
      attendanceStatus: 'attended',
    })).toBe('mock_interview')
  })

  it('maps networking → networking_midterm', () => {
    expect(resolvePayloadClassStatus({
      courseTypeUi: 'networking',
      basicContentType: '',
      jobContentType: '',
      attendanceStatus: 'attended',
    })).toBe('networking_midterm')
  })

  it('maps mock-midterm → mock_midterm', () => {
    expect(resolvePayloadClassStatus({
      courseTypeUi: 'mock-midterm',
      basicContentType: '',
      jobContentType: '',
      attendanceStatus: 'attended',
    })).toBe('mock_midterm')
  })

  it('passes through basicContentType when courseType is basic', () => {
    expect(resolvePayloadClassStatus({
      courseTypeUi: 'basic',
      basicContentType: 'resume_update',
      jobContentType: '',
      attendanceStatus: 'attended',
    })).toBe('resume_update')
  })

  it('passes through jobContentType for job-coaching', () => {
    expect(resolvePayloadClassStatus({
      courseTypeUi: 'job-coaching',
      basicContentType: '',
      jobContentType: 'mock_interview',
      attendanceStatus: 'attended',
    })).toBe('mock_interview')
  })
})

describe('context predicates', () => {
  it('isResumeContext matches job-coaching/resume_update AND basic/resume_update', () => {
    expect(isResumeContext({
      courseTypeUi: 'job-coaching',
      jobContentType: 'resume_update',
      basicContentType: '',
    })).toBe(true)
    expect(isResumeContext({
      courseTypeUi: 'basic',
      jobContentType: '',
      basicContentType: 'resume_update',
    })).toBe(true)
    expect(isResumeContext({
      courseTypeUi: 'mock-interview',
      jobContentType: '',
      basicContentType: '',
    })).toBe(false)
  })

  it('isMockInterviewContext matches direct AND job-coaching/mock_interview', () => {
    expect(isMockInterviewContext({
      courseTypeUi: 'mock-interview',
      jobContentType: '',
    })).toBe(true)
    expect(isMockInterviewContext({
      courseTypeUi: 'job-coaching',
      jobContentType: 'mock_interview',
    })).toBe(true)
    expect(isMockInterviewContext({
      courseTypeUi: 'basic',
      jobContentType: '',
    })).toBe(false)
  })

  it('isNetworkingContext matches direct AND job-coaching/networking_midterm', () => {
    expect(isNetworkingContext({
      courseTypeUi: 'networking',
      jobContentType: '',
    })).toBe(true)
    expect(isNetworkingContext({
      courseTypeUi: 'job-coaching',
      jobContentType: 'networking_midterm',
    })).toBe(true)
  })

  it('isMidtermContext matches direct AND job-coaching/mock_midterm', () => {
    expect(isMidtermContext({
      courseTypeUi: 'mock-midterm',
      jobContentType: '',
    })).toBe(true)
    expect(isMidtermContext({
      courseTypeUi: 'job-coaching',
      jobContentType: 'mock_midterm',
    })).toBe(true)
  })
})

describe('resolveTopics', () => {
  it('returns undefined when all topic sources are empty', () => {
    expect(resolveTopics(baseForm())).toBeUndefined()
  })

  it('joins non-empty topic fields with newline', () => {
    const form = baseForm({
      positionLabel: 'Goldman Sachs · IB Analyst · Hong Kong',
      mockConcepts: 'DCF, LBO',
      midtermAnalysis: '第 3 题错误',
    })
    const result = resolveTopics(form)
    expect(result).toContain('Goldman Sachs · IB Analyst · Hong Kong')
    expect(result).toContain('DCF, LBO')
    expect(result).toContain('第 3 题错误')
    expect(result?.split('\n').length).toBe(3)
  })

  it('trims whitespace and skips blank fields', () => {
    const form = baseForm({
      positionLabel: '  Morgan Stanley  ',
      mockPurpose: '   ',
      mockConcepts: 'Valuation',
    })
    const result = resolveTopics(form)
    expect(result).toBe('Morgan Stanley\nValuation')
  })
})

describe('resolveComments', () => {
  it('always includes attendance status — attended', () => {
    const result = resolveComments(baseForm(), performanceOptions)
    expect(result).toContain('学员状态: 正常上课')
  })

  it('includes absent status + absence remark when applicable', () => {
    const form = baseForm({
      attendanceStatus: 'absent',
      absenceRemark: '学员请假了',
    })
    const result = resolveComments(form, performanceOptions)
    expect(result).toContain('学员状态: 旷课未到场')
    expect(result).toContain('旷课备注: 学员请假了')
  })

  it('includes performance rating label when in mock interview context', () => {
    const form = baseForm({
      courseTypeUi: 'mock-interview',
      performanceRating: 'great',
    })
    const result = resolveComments(form, performanceOptions)
    expect(result).toContain('学员表现: 很好')
  })

  it('does NOT include performance rating outside mock interview context', () => {
    const form = baseForm({
      courseTypeUi: 'networking',
      performanceRating: 'great',
    })
    const result = resolveComments(form, performanceOptions)
    expect(result).not.toContain('学员表现')
  })

  it('includes networking recommendation + score entries in networking context', () => {
    const form = baseForm({
      courseTypeUi: 'networking',
      networkingRecommendation: '是的 - 我相信这位学生很适合我的团队',
      networkingScoreMap: {
        '电子邮件质量 (1-5分)': '4',
        '感谢邮件 (1-3分)': '',
      },
    })
    const result = resolveComments(form, performanceOptions)
    expect(result).toContain('推荐意见: 是的 - 我相信这位学生很适合我的团队')
    expect(result).toContain('电子邮件质量 (1-5分): 4')
    expect(result).not.toContain('感谢邮件')
  })

  it('includes midterm score + progress in midterm context', () => {
    const form = baseForm({
      courseTypeUi: 'mock-midterm',
      midtermScore: 78,
      midtermProgress: '好的 - 需要在一些方面下功夫',
    })
    const result = resolveComments(form, performanceOptions)
    expect(result).toContain('模拟期中分数: 78')
    expect(result).toContain('进度评估: 好的 - 需要在一些方面下功夫')
  })

  it('includes midterm score even when value is 0', () => {
    const form = baseForm({
      courseTypeUi: 'mock-midterm',
      midtermScore: 0,
    })
    const result = resolveComments(form, performanceOptions)
    expect(result).toContain('模拟期中分数: 0')
  })

  it('includes resume filenames when files attached', () => {
    const form = baseForm({
      courseTypeUi: 'job-coaching',
      jobContentType: 'resume_update',
      resumeBeforeFiles: [{ name: 'original.pdf' }],
      resumeAfterFiles: [{ name: 'updated.pdf' }],
    })
    const result = resolveComments(form, performanceOptions)
    expect(result).toContain('原简历: original.pdf')
    expect(result).toContain('修改后简历: updated.pdf')
  })
})
