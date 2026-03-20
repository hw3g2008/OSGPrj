import { describe, expect, it } from 'vitest'
import {
  COMING_SOON_TOAST,
  STUDENT_AVAILABLE_PATHS,
  isStudentPathAvailable,
  isStudentPathComingSoon
} from '../navigation/access'

describe('student navigation access policy', () => {
  it('allows only the delivered student pages for this rollout', () => {
    expect(STUDENT_AVAILABLE_PATHS).toEqual([
      '/dashboard',
      '/home',
      '/positions',
      '/applications',
      '/job-tracking',
      '/mock-practice',
      '/request',
      '/courses',
      '/myclass',
      '/profile'
    ])
  })

  it('identifies delivered and coming-soon student paths consistently', () => {
    expect(isStudentPathAvailable('/positions')).toBe(true)
    expect(isStudentPathAvailable('/questions')).toBe(false)
    expect(isStudentPathComingSoon('/questions')).toBe(true)
    expect(isStudentPathComingSoon('/profile')).toBe(false)
  })

  it('keeps one shared placeholder toast copy', () => {
    expect(COMING_SOON_TOAST).toBe('敬请期待')
  })
})
