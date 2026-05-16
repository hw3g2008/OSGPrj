import { describe, expect, it } from 'vitest'
import {
  ABSENT_DEFAULT_HOURS,
  BASE_CATEGORY_OPTIONS,
  COURSE_TYPE,
  COURSE_TYPE_OPTIONS,
  MEMBER_STATUS,
  RELATION_RATING_ITEMS,
  RESUME_SUBTYPE_OPTIONS,
} from '../constants/classReport'

describe('classReport constants', () => {
  it('exports course type constants', () => {
    expect(COURSE_TYPE.JOB_COACHING).toBe('job_coaching')
    expect(COURSE_TYPE.MOCK_INTERVIEW).toBe('mock_interview')
    expect(COURSE_TYPE.RELATION_TEST).toBe('relation_test')
    expect(COURSE_TYPE.COMMUNICATION_TEST).toBe('communication_test')
    expect(COURSE_TYPE.BASE_COURSE).toBe('base_course')
  })

  it('exports five course type options (label is an i18n key for caller t())', () => {
    expect(COURSE_TYPE_OPTIONS).toHaveLength(5)
    expect(COURSE_TYPE_OPTIONS[0]).toEqual({
      value: 'job_coaching',
      label: 'common.shared.classReport.constants.courseType.jobCoaching',
    })
  })

  it('exports member status constants', () => {
    expect(MEMBER_STATUS.NORMAL).toBe('normal')
    expect(MEMBER_STATUS.ABSENT).toBe('absent')
  })

  it('exports base category options (D 合并：new_resume + resume_update → resume)', () => {
    expect(BASE_CATEGORY_OPTIONS).toHaveLength(5)
    expect(BASE_CATEGORY_OPTIONS.some((item) => item.value === 'resume')).toBe(true)
    expect(BASE_CATEGORY_OPTIONS.some((item) => item.value === 'other')).toBe(true)
    // 旧 enum 不再出现在下拉里（仍保留在 BaseCategory type 用于旧数据/派生兼容）
    expect(BASE_CATEGORY_OPTIONS.some((item) => item.value === 'new_resume')).toBe(false)
    expect(BASE_CATEGORY_OPTIONS.some((item) => item.value === 'resume_update')).toBe(false)
  })

  it('exports resume subtype options (D radio)', () => {
    expect(RESUME_SUBTYPE_OPTIONS).toHaveLength(2)
    expect(RESUME_SUBTYPE_OPTIONS.map((o) => o.value)).toEqual(['new', 'update'])
  })

  it('exports relation rating items and absent default hours', () => {
    expect(RELATION_RATING_ITEMS).toHaveLength(5)
    expect(RELATION_RATING_ITEMS.find((item) => item.key === 'smallTalk')?.max).toBe(10)
    expect(ABSENT_DEFAULT_HOURS).toBe(0.5)
  })
})
