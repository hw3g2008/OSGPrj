/**
 * positionsTone utils unit tests
 */
import { describe, expect, it } from 'vitest'

import {
  resolveDeadlineTone,
  deadlineToneClass,
  deriveLogoText,
  resolveLogoText,
  resolveLogoToneClass,
  isValidIndustryTone,
} from './positionsTone'

const NOW = new Date('2025-12-01T00:00:00Z').getTime()

describe('resolveDeadlineTone', () => {
  it('1. 空 deadline → normal', () => {
    expect(resolveDeadlineTone(undefined, NOW)).toBe('normal')
    expect(resolveDeadlineTone(null, NOW)).toBe('normal')
    expect(resolveDeadlineTone('', NOW)).toBe('normal')
  })

  it('2. 非法格式 → normal', () => {
    expect(resolveDeadlineTone('not-a-date', NOW)).toBe('normal')
  })

  it('3. 已过 → closed', () => {
    expect(resolveDeadlineTone('2025-11-01', NOW)).toBe('closed')
    expect(resolveDeadlineTone('2025-11-30', NOW)).toBe('closed')
  })

  it('4. 0–7 天内 → urgent', () => {
    expect(resolveDeadlineTone('2025-12-02', NOW)).toBe('urgent')
    expect(resolveDeadlineTone('2025-12-07', NOW)).toBe('urgent')
  })

  it('5. > 7 天 → normal', () => {
    expect(resolveDeadlineTone('2025-12-15', NOW)).toBe('normal')
    expect(resolveDeadlineTone('2026-03-01', NOW)).toBe('normal')
  })
})

describe('deadlineToneClass', () => {
  it('6. urgent → osg-deadline--urgent', () => {
    expect(deadlineToneClass('urgent')).toBe('osg-deadline--urgent')
  })

  it('7. closed → osg-deadline--closed', () => {
    expect(deadlineToneClass('closed')).toBe('osg-deadline--closed')
  })

  it('8. normal / undefined → 空字符串', () => {
    expect(deadlineToneClass('normal')).toBe('')
    expect(deadlineToneClass()).toBe('')
  })
})

describe('deriveLogoText', () => {
  it('9. 多词公司：取首字母', () => {
    expect(deriveLogoText('Goldman Sachs')).toBe('GS')
    expect(deriveLogoText('Morgan Stanley')).toBe('MS')
    expect(deriveLogoText('JP Morgan Chase')).toBe('JM')
  })

  it('10. 单词公司：取前 2 字母', () => {
    expect(deriveLogoText('Google')).toBe('GO')
    expect(deriveLogoText('BMO')).toBe('BM')
  })

  it('11. 空 → ?', () => {
    expect(deriveLogoText('')).toBe('?')
    expect(deriveLogoText(undefined)).toBe('?')
    expect(deriveLogoText(null)).toBe('?')
    expect(deriveLogoText('  ')).toBe('?')
  })
})

describe('resolveLogoText', () => {
  it('12. row.logoText 优先', () => {
    expect(
      resolveLogoText({
        positionId: 1,
        positionName: 'X',
        companyName: 'Goldman Sachs',
        logoText: 'GSC',
      }),
    ).toBe('GSC')
  })

  it('13. row.logoText 缺失时派生自 companyName', () => {
    expect(
      resolveLogoText({
        positionId: 1,
        positionName: 'X',
        companyName: 'Goldman Sachs',
      }),
    ).toBe('GS')
  })
})

describe('resolveLogoToneClass', () => {
  it('14. logoColor 存在 → 空 class（让 inline style 接管）', () => {
    expect(
      resolveLogoToneClass({
        positionId: 1,
        positionName: 'X',
        companyName: 'X',
        logoColor: '#ff0000',
        industryTone: 'gold',
      }),
    ).toBe('')
  })

  it('15. logoColor 缺失 → 按 industryTone 取', () => {
    expect(
      resolveLogoToneClass({
        positionId: 1,
        positionName: 'X',
        companyName: 'X',
        industryTone: 'violet',
      }),
    ).toBe('osg-positions-list-table__logo--violet')
  })

  it('16. industryTone 缺失 → fallback slate', () => {
    expect(
      resolveLogoToneClass({
        positionId: 1,
        positionName: 'X',
        companyName: 'X',
      }),
    ).toBe('osg-positions-list-table__logo--slate')
  })
})

describe('isValidIndustryTone', () => {
  it('17. 7 个合法 tone 返回 true', () => {
    expect(isValidIndustryTone('gold')).toBe(true)
    expect(isValidIndustryTone('violet')).toBe(true)
    expect(isValidIndustryTone('blue')).toBe(true)
    expect(isValidIndustryTone('amber')).toBe(true)
    expect(isValidIndustryTone('teal')).toBe(true)
    expect(isValidIndustryTone('indigo')).toBe(true)
    expect(isValidIndustryTone('slate')).toBe(true)
  })

  it('18. 非法 tone 返回 false', () => {
    expect(isValidIndustryTone('red')).toBe(false)
    expect(isValidIndustryTone('')).toBe(false)
    expect(isValidIndustryTone()).toBe(false)
  })
})
