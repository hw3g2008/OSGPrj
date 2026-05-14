import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveMenuDisplayName } from './menuI18n'

describe('resolveMenuDisplayName', () => {
  it('uses i18nKey translation before backend menuName', () => {
    const result = resolveMenuDisplayName(
      { menuName: '权限管理', i18nKey: 'permission_management' },
      (key) => (key === 'permission_management' ? 'Permission Management' : key)
    )

    expect(result).toBe('Permission Management')
  })

  it('falls back to backend menuName when i18nKey is missing', () => {
    const result = resolveMenuDisplayName(
      { menuName: '自定义菜单' },
      (key) => key
    )

    expect(result).toBe('自定义菜单')
  })

  it('falls back to backend menuName when translation returns the key itself', () => {
    const result = resolveMenuDisplayName(
      { menuName: '权限管理', i18nKey: 'missing_key' },
      (key) => key
    )

    expect(result).toBe('权限管理')
  })

  it('is exported from the shared utils barrel for app imports', () => {
    const utilsIndex = fs.readFileSync(path.resolve(__dirname, './index.ts'), 'utf-8')

    expect(utilsIndex).toContain("export * from './menuI18n'")
  })
})
