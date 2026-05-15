import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveDictDisplayName } from './dictI18n'

describe('resolveDictDisplayName', () => {
  it('uses i18nKey translation before raw dict label', () => {
    const result = resolveDictDisplayName(
      { label: '岗位分类', i18nKey: 'dict_type_job_category' },
      (key) => (key === 'dict_type_job_category' ? 'Position Category' : key),
    )

    expect(result).toBe('Position Category')
  })

  it('falls back to raw label when i18nKey is missing (handles user-defined dict types)', () => {
    const result = resolveDictDisplayName({ label: '自定义字典' }, (key) => key)
    expect(result).toBe('自定义字典')
  })

  it('falls back to raw label when the translation key is not mapped in the locale', () => {
    const result = resolveDictDisplayName(
      { label: '岗位分类', i18nKey: 'missing_key' },
      (key) => key,
    )
    expect(result).toBe('岗位分类')
  })

  it('returns empty string when neither translation nor fallback exists', () => {
    const result = resolveDictDisplayName({}, (key) => key)
    expect(result).toBe('')
  })

  it('is exported from the shared utils barrel so admin can import uniformly', () => {
    const utilsIndex = fs.readFileSync(path.resolve(__dirname, './index.ts'), 'utf-8')
    expect(utilsIndex).toContain("export * from './dictI18n'")
  })
})
