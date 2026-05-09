import { describe, expect, it } from 'vitest'
import type {
  BaseCategory,
  ClassReportPayload,
  CourseType,
  MemberStatus,
  ReferenceType,
} from '../types/classReport'

describe('classReport types', () => {
  it('allows the class report union type literals', () => {
    const courseTypes: CourseType[] = [
      'job_coaching',
      'mock_interview',
      'relation_test',
      'communication_test',
      'base_course',
    ]
    const referenceType: ReferenceType = 'application'
    const memberStatus: MemberStatus = 'normal'
    const baseCategory: BaseCategory = 'tech'

    expect(courseTypes).toContain('job_coaching')
    expect(referenceType).toBe('application')
    expect(memberStatus).toBe('normal')
    expect(baseCategory).toBe('tech')
  })

  it('allows constructing a minimal class report payload', () => {
    const payload: ClassReportPayload = {
      studentId: 1,
      classDate: '2026-05-09',
      durationHours: 1.5,
      courseType: 'job_coaching',
      memberStatus: 'normal',
    }

    expect(typeof payload).toBe('object')
    expect(payload.courseType).toBe('job_coaching')
    expect(payload.memberStatus).toBe('normal')
  })
})
