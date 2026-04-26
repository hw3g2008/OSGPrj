import { describe, it, expect } from 'vitest'
import { useCoachingStatusMap } from './useCoachingStatusMap'

describe('useCoachingStatusMap', () => {
  const { resolveCoachingTone } = useCoachingStatusMap()

  describe('基础状态映射（复用 resolveCoachingStatusColor SSOT）', () => {
    it('辅导/coaching → purple', () => {
      expect(resolveCoachingTone('辅导中')).toBe('purple')
      expect(resolveCoachingTone('coaching')).toBe('purple')
      expect(resolveCoachingTone('Coaching')).toBe('purple')
    })

    it('待/pending → orange', () => {
      expect(resolveCoachingTone('待更新')).toBe('orange')
      expect(resolveCoachingTone('pending')).toBe('orange')
    })

    it('新/new → red', () => {
      expect(resolveCoachingTone('新申请')).toBe('red')
      expect(resolveCoachingTone('new')).toBe('red')
    })

    it('默认 → default', () => {
      expect(resolveCoachingTone('其他')).toBe('default')
      expect(resolveCoachingTone('')).toBe('default')
      expect(resolveCoachingTone(null)).toBe('default')
      expect(resolveCoachingTone(undefined)).toBe('default')
    })
  })

  describe('stageUpdated 修饰', () => {
    it('stageUpdated=true 覆盖为 blue', () => {
      expect(resolveCoachingTone('辅导中', true)).toBe('blue')
      expect(resolveCoachingTone('待更新', true)).toBe('blue')
      expect(resolveCoachingTone('', true)).toBe('blue')
    })

    it('stageUpdated=false 不影响', () => {
      expect(resolveCoachingTone('辅导中', false)).toBe('purple')
    })
  })
})
