import { describe, it, expect } from 'vitest'
import { useCoachingStatusMap } from './useCoachingStatusMap'

describe('useCoachingStatusMap', () => {
  const { resolve } = useCoachingStatusMap()

  describe('基础状态映射（复用 resolveCoachingStatusColor SSOT）', () => {
    it('辅导/coaching → purple', () => {
      expect(resolve('辅导中')).toMatchObject({ color: 'purple' })
      expect(resolve('coaching')).toMatchObject({ color: 'purple' })
      expect(resolve('Coaching')).toMatchObject({ color: 'purple' })
    })

    it('待/pending → orange', () => {
      expect(resolve('待更新')).toMatchObject({ color: 'orange' })
      expect(resolve('pending')).toMatchObject({ color: 'orange' })
    })

    it('新/new → red', () => {
      expect(resolve('新申请')).toMatchObject({ color: 'red' })
      expect(resolve('new')).toMatchObject({ color: 'red' })
    })

    it('默认 → default', () => {
      expect(resolve('其他')).toMatchObject({ color: 'default' })
      expect(resolve('')).toMatchObject({ color: 'default' })
      expect(resolve(null)).toMatchObject({ color: 'default' })
      expect(resolve(undefined)).toMatchObject({ color: 'default' })
    })
  })

  describe('stageUpdated 修饰', () => {
    it('stageUpdated=true 覆盖为 blue', () => {
      expect(resolve('辅导中', true)).toMatchObject({ color: 'blue' })
      expect(resolve('待更新', true)).toMatchObject({ color: 'blue' })
      expect(resolve('', true)).toMatchObject({ color: 'blue' })
    })

    it('stageUpdated=false 不影响', () => {
      expect(resolve('辅导中', false)).toMatchObject({ color: 'purple' })
    })
  })

  describe('label 输出', () => {
    it('返回原始 status 作为 label', () => {
      expect(resolve('辅导中')).toMatchObject({ label: '辅导中' })
      expect(resolve('new')).toMatchObject({ label: 'new' })
    })

    it('空值回退到 fallback', () => {
      expect(resolve('')).toMatchObject({ label: '' })
      expect(resolve(null)).toMatchObject({ label: '' })
    })
  })
})
