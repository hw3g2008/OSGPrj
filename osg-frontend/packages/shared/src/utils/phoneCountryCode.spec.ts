import { describe, expect, it } from 'vitest'
import {
  PHONE_COUNTRY_CODES,
  DEFAULT_PHONE_COUNTRY_CODE,
  formatCountryDisplay,
  splitPhone,
  joinPhone,
} from './phoneCountryCode'

describe('PHONE_COUNTRY_CODES', () => {
  it('包含至少 +86 默认项', () => {
    const codes = PHONE_COUNTRY_CODES.map((item) => item.code)
    expect(codes).toContain('+86')
    expect(DEFAULT_PHONE_COUNTRY_CODE).toBe('+86')
  })

  it('每个区号都以 + 开头且 labelKey 形如 i18n 命名空间', () => {
    for (const item of PHONE_COUNTRY_CODES) {
      expect(item.code.startsWith('+')).toBe(true)
      expect(item.labelKey).toMatch(/^common\.shared\.phone\.countries\./)
    }
  })

  it('formatCountryDisplay 拼接 code + t(labelKey)', () => {
    const item = PHONE_COUNTRY_CODES[0]
    const fakeT = (k: string) => `[${k}]`
    expect(formatCountryDisplay(item, fakeT)).toBe(`${item.code} [${item.labelKey}]`)
  })
})

describe('splitPhone()', () => {
  it('空值 → 默认区号 + 空号码', () => {
    expect(splitPhone('')).toEqual({ countryCode: '+86', number: '' })
    expect(splitPhone(null)).toEqual({ countryCode: '+86', number: '' })
    expect(splitPhone(undefined)).toEqual({ countryCode: '+86', number: '' })
  })

  it('"+86 13001985588" → +86 + 13001985588', () => {
    expect(splitPhone('+86 13001985588')).toEqual({
      countryCode: '+86',
      number: '13001985588',
    })
  })

  it('"+8613001985588"（无空格）→ +86 + 13001985588', () => {
    expect(splitPhone('+8613001985588')).toEqual({
      countryCode: '+86',
      number: '13001985588',
    })
  })

  it('"+1 415-555-1234" → +1 + 415-555-1234', () => {
    expect(splitPhone('+1 415-555-1234')).toEqual({
      countryCode: '+1',
      number: '415-555-1234',
    })
  })

  it('+886 vs +1 长前缀优先匹配，避免 "+886" 被当成 "+8 + 86"', () => {
    expect(splitPhone('+886912345678')).toEqual({
      countryCode: '+886',
      number: '912345678',
    })
  })

  it('"13001985588"（纯号码无前缀）→ 默认 +86 + 原号码', () => {
    expect(splitPhone('13001985588')).toEqual({
      countryCode: '+86',
      number: '13001985588',
    })
  })

  it('未知前缀（如 +99）→ 默认 +86 + 原文', () => {
    expect(splitPhone('+99 12345678')).toEqual({
      countryCode: '+86',
      number: '+99 12345678',
    })
  })
})

describe('joinPhone()', () => {
  it('空号码 → undefined（便于前端整体省略字段）', () => {
    expect(joinPhone('+86', '')).toBeUndefined()
    expect(joinPhone('+86', '   ')).toBeUndefined()
    expect(joinPhone('+86', null)).toBeUndefined()
    expect(joinPhone('+86', undefined)).toBeUndefined()
  })

  it('+86 + 13001985588 → "+86 13001985588"', () => {
    expect(joinPhone('+86', '13001985588')).toBe('+86 13001985588')
  })

  it('号码两端空白会被 trim', () => {
    expect(joinPhone('+86', '  13001985588  ')).toBe('+86 13001985588')
  })

  it('countryCode 空值 → 回退到默认 +86', () => {
    expect(joinPhone('', '13001985588')).toBe('+86 13001985588')
    expect(joinPhone(null, '13001985588')).toBe('+86 13001985588')
    expect(joinPhone(undefined, '13001985588')).toBe('+86 13001985588')
  })
})

describe('splitPhone + joinPhone 往返一致性', () => {
  it('"+86 13001985588" → split → join 还原', () => {
    const original = '+86 13001985588'
    const parsed = splitPhone(original)
    expect(joinPhone(parsed.countryCode, parsed.number)).toBe(original)
  })

  it('"+1 415-555-1234" → split → join 还原', () => {
    const original = '+1 415-555-1234'
    const parsed = splitPhone(original)
    expect(joinPhone(parsed.countryCode, parsed.number)).toBe(original)
  })
})
