import { describe, it, expect } from 'vitest'
import { deriveMockPracticeStatus, useMockPracticeStatusDisplay } from './useMockPracticeStatusDisplay'

describe('useMockPracticeStatusDisplay', () => {
  describe('5 态全覆盖', () => {
    it('status=cancelled → cancelled', () => {
      const r = deriveMockPracticeStatus({ status: 'cancelled' })
      expect(r).toEqual({ value: 'cancelled', label: '已取消', tone: 'default' })
    })

    it('status=completed → completed', () => {
      const r = deriveMockPracticeStatus({ status: 'completed', completedHours: 0, plannedHours: 2 })
      expect(r).toEqual({ value: 'completed', label: '已完成', tone: 'success' })
    })

    it('completedHours >= plannedHours 派生 completed', () => {
      const r = deriveMockPracticeStatus({ status: 'confirmed', completedHours: 2, plannedHours: 2 })
      expect(r.value).toBe('completed')
    })

    it('status=confirmed 且 completedHours > 0 → coaching', () => {
      const r = deriveMockPracticeStatus({ status: 'confirmed', completedHours: 1, plannedHours: 2 })
      expect(r).toEqual({ value: 'coaching', label: '辅导中', tone: 'info' })
    })

    it('status=scheduled → assigned', () => {
      const r = deriveMockPracticeStatus({ status: 'scheduled', completedHours: 0, plannedHours: 2 })
      expect(r).toEqual({ value: 'assigned', label: '已分配导师', tone: 'warning' })
    })

    it('status=confirmed 且 completedHours=0 → assigned', () => {
      const r = deriveMockPracticeStatus({ status: 'confirmed', completedHours: 0, plannedHours: 2 })
      expect(r.value).toBe('assigned')
    })

    it('兜底 pending', () => {
      expect(deriveMockPracticeStatus({ status: 'pending' }).value).toBe('pending')
      expect(deriveMockPracticeStatus({}).value).toBe('pending')
    })
  })

  describe('plannedHours 边界（0 / == / >）', () => {
    it('plannedHours=0 时不派生 completed（即使 completedHours>0）', () => {
      const r = deriveMockPracticeStatus({ status: 'confirmed', completedHours: 5, plannedHours: 0 })
      // status='confirmed' 且 completedHours>0 → coaching（不派生 completed 因为 planned=0）
      expect(r.value).toBe('coaching')
    })

    it('completedHours == plannedHours → completed', () => {
      const r = deriveMockPracticeStatus({ status: 'confirmed', completedHours: 1.5, plannedHours: 1.5 })
      expect(r.value).toBe('completed')
    })

    it('completedHours > plannedHours → completed', () => {
      const r = deriveMockPracticeStatus({ status: 'confirmed', completedHours: 5, plannedHours: 2 })
      expect(r.value).toBe('completed')
    })

    it('plannedHours 为 null → 不派生 completed', () => {
      const r = deriveMockPracticeStatus({ status: 'scheduled', completedHours: 5, plannedHours: null })
      expect(r.value).toBe('assigned')
    })
  })

  describe('优先级', () => {
    it('status=cancelled 覆盖 completedHours 派生', () => {
      const r = deriveMockPracticeStatus({ status: 'cancelled', completedHours: 5, plannedHours: 2 })
      expect(r.value).toBe('cancelled')
    })

    it('显式 status=completed 覆盖 completedHours 派生', () => {
      const r = deriveMockPracticeStatus({ status: 'completed', completedHours: 0, plannedHours: 0 })
      expect(r.value).toBe('completed')
    })
  })

  describe('边界与兼容', () => {
    it('null/undefined → pending', () => {
      expect(deriveMockPracticeStatus(null).value).toBe('pending')
      expect(deriveMockPracticeStatus(undefined).value).toBe('pending')
    })

    it('字符串数值能解析', () => {
      const r = deriveMockPracticeStatus({
        status: 'confirmed',
        completedHours: '2' as unknown as number,
        plannedHours: '2' as unknown as number,
      })
      expect(r.value).toBe('completed')
    })

    it('useMockPracticeStatusDisplay 暴露 deriveMockPracticeStatus', () => {
      const { deriveMockPracticeStatus: fn } = useMockPracticeStatusDisplay()
      expect(fn({ status: 'cancelled' }).value).toBe('cancelled')
    })
  })
})
