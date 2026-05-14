import { describe, it, expect } from 'vitest'
import { deriveApplicationStatus, useApplicationStatusDisplay } from './useApplicationStatusDisplay'

describe('useApplicationStatusDisplay', () => {
  describe('5 态全覆盖', () => {
    it('assignStatus=cancelled → cancelled', () => {
      const r = deriveApplicationStatus({ assignStatus: 'cancelled' })
      expect(r).toEqual({ value: 'cancelled', label: '已取消', tone: 'default' })
    })

    it('assignStatus=completed → completed', () => {
      const r = deriveApplicationStatus({ assignStatus: 'completed' })
      expect(r).toEqual({ value: 'completed', label: '已完成', tone: 'success' })
    })

    it('coachingStatus=coaching → coaching', () => {
      const r = deriveApplicationStatus({ assignStatus: 'assigned', coachingStatus: 'coaching' })
      expect(r).toEqual({ value: 'coaching', label: '辅导中', tone: 'info' })
    })

    it('coachingStatus=pending → assigned', () => {
      const r = deriveApplicationStatus({ assignStatus: 'assigned', coachingStatus: 'pending' })
      expect(r).toEqual({ value: 'assigned', label: '已分配导师', tone: 'warning' })
    })

    it('coachingStatus=assigned → assigned（admin 分配完，等 mentor 确认）', () => {
      const r = deriveApplicationStatus({ assignStatus: 'assigned', coachingStatus: 'assigned' })
      expect(r).toEqual({ value: 'assigned', label: '已分配导师', tone: 'warning' })
    })

    it('assignStatus=assigned 且 coaching=none → assigned', () => {
      const r = deriveApplicationStatus({ assignStatus: 'assigned', coachingStatus: 'none' })
      expect(r).toEqual({ value: 'assigned', label: '已分配导师', tone: 'warning' })
    })

    it('兜底 pending', () => {
      const r = deriveApplicationStatus({ assignStatus: 'pending', coachingStatus: 'none' })
      expect(r).toEqual({ value: 'pending', label: '待分配导师', tone: 'danger' })
    })
  })

  describe('优先级（终态 > 辅导中 > 已分配 > 兜底）', () => {
    it('assignStatus=cancelled 覆盖 coachingStatus=coaching', () => {
      const r = deriveApplicationStatus({ assignStatus: 'cancelled', coachingStatus: 'coaching' })
      expect(r.value).toBe('cancelled')
    })

    it('coachingStatus=coaching 覆盖 assignStatus=assigned', () => {
      const r = deriveApplicationStatus({ assignStatus: 'assigned', coachingStatus: 'coaching' })
      expect(r.value).toBe('coaching')
    })
  })

  describe('边界与兼容', () => {
    it('null/undefined → pending', () => {
      expect(deriveApplicationStatus(null).value).toBe('pending')
      expect(deriveApplicationStatus(undefined).value).toBe('pending')
      expect(deriveApplicationStatus({}).value).toBe('pending')
    })

    it('大小写不敏感', () => {
      expect(deriveApplicationStatus({ coachingStatus: 'COACHING' }).value).toBe('coaching')
      expect(deriveApplicationStatus({ assignStatus: 'CANCELLED' }).value).toBe('cancelled')
    })

    it('带空格', () => {
      expect(deriveApplicationStatus({ coachingStatus: '  coaching  ' }).value).toBe('coaching')
    })

    it('useApplicationStatusDisplay 暴露 deriveApplicationStatus', () => {
      const { deriveApplicationStatus: fn } = useApplicationStatusDisplay()
      expect(fn({ coachingStatus: 'coaching' }).value).toBe('coaching')
    })
  })
})
