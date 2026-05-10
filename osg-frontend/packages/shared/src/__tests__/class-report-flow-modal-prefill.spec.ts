/**
 * Step2A-F7：shared ClassReportFlowModal 反推锁定 helper 单测
 *
 * 锁定 courseType=job_coaching 的判定与 formState 字段补丁，
 * 在 LM 求职总览「我辅导的学员」点击「上报课消」入口切到新口径
 * `prefilledReferenceType='job_coaching' + prefilledReferenceId=coachingId` 时必须生效；
 * 同时保持 legacy `application + applicationId` 路径完全兼容。
 */
import { describe, it, expect } from 'vitest'
import {
  isReferenceCourseTypeLocked,
  buildReferenceLockPatch,
} from '../components/ClassReportFlowModal/lockHelpers'

describe('ClassReportFlowModal reference lock helpers (Step2A-F7)', () => {
  describe('isReferenceCourseTypeLocked', () => {
    it('locks when prefilled job_coaching + valid coachingId (Step2A-F7 new path)', () => {
      expect(isReferenceCourseTypeLocked('job_coaching', 9702)).toBe(true)
    })

    it('locks when prefilled application + valid applicationId (legacy fallback)', () => {
      expect(isReferenceCourseTypeLocked('application', 7001)).toBe(true)
    })

    it('does not lock when referenceType is missing', () => {
      expect(isReferenceCourseTypeLocked(undefined, 9702)).toBe(false)
    })

    it('does not lock when referenceId is missing or non-positive', () => {
      expect(isReferenceCourseTypeLocked('job_coaching', undefined)).toBe(false)
      expect(isReferenceCourseTypeLocked('job_coaching', 0)).toBe(false)
      expect(isReferenceCourseTypeLocked('job_coaching', -1)).toBe(false)
      expect(isReferenceCourseTypeLocked('application', 0)).toBe(false)
    })

    it('does not lock for non-job_coaching reference types', () => {
      // 其它三种 referenceType 对应自己的 courseType，不应被锁成 job_coaching
      expect(isReferenceCourseTypeLocked('mock_interview', 100)).toBe(false)
      expect(isReferenceCourseTypeLocked('relation_test', 100)).toBe(false)
      expect(isReferenceCourseTypeLocked('communication_test', 100)).toBe(false)
    })
  })

  describe('buildReferenceLockPatch', () => {
    it('preserves prefilledReferenceType=job_coaching (Step2A-F7 new path)', () => {
      // 关键回归：referenceType 必须是 'job_coaching' 而不是 'application'，
      // 否则 submit 时后端会再次按 application 路径找 osg_job_application 记录，
      // 导致 osg_coaching 阶段记录上报失败。
      expect(buildReferenceLockPatch('job_coaching', 9702)).toEqual({
        courseType: 'job_coaching',
        referenceType: 'job_coaching',
        referenceId: 9702,
      })
    })

    it('preserves prefilledReferenceType=application (legacy fallback unchanged)', () => {
      // 旧数据兼容：本次重构前的行为是 referenceType='application'，
      // 不能改成 'job_coaching'，否则旧 application 预填路径会断。
      expect(buildReferenceLockPatch('application', 7001)).toEqual({
        courseType: 'job_coaching',
        referenceType: 'application',
        referenceId: 7001,
      })
    })
  })
})
