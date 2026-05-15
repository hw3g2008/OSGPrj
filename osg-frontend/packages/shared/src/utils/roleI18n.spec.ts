import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveRoleDescription, resolveRoleDisplayName } from './roleI18n'

describe('resolveRoleDisplayName', () => {
  it('translates when i18nKey maps to a locale entry', () => {
    const result = resolveRoleDisplayName(
      { roleName: '超级管理员', i18nKey: 'role_super_admin' },
      (key) => (key === 'role_super_admin' ? 'Super Admin' : key),
    )
    expect(result).toBe('Super Admin')
  })

  it('falls back to roleName when i18nKey is null (user-defined role)', () => {
    const result = resolveRoleDisplayName({ roleName: '会计', i18nKey: null }, (key) => key)
    expect(result).toBe('会计')
  })

  it('falls back to roleName when i18nKey is undefined', () => {
    const result = resolveRoleDisplayName({ roleName: '文员2' }, (key) => key)
    expect(result).toBe('文员2')
  })

  it('falls back to roleName when translation returns the key unchanged', () => {
    const result = resolveRoleDisplayName(
      { roleName: '自定义', i18nKey: 'role_custom_missing' },
      (key) => key,
    )
    expect(result).toBe('自定义')
  })
})

describe('resolveRoleDescription', () => {
  it('translates when remarkI18nKey maps to a locale entry', () => {
    const result = resolveRoleDescription(
      { remark: '超级管理员，拥有所有权限', remarkI18nKey: 'role_super_admin_desc' },
      (key) => (key === 'role_super_admin_desc' ? 'Super admin with full permissions' : key),
    )
    expect(result).toBe('Super admin with full permissions')
  })

  it('falls back to remark when remarkI18nKey is null', () => {
    const result = resolveRoleDescription(
      { remark: '专用管理员', remarkI18nKey: null },
      (key) => key,
    )
    expect(result).toBe('专用管理员')
  })

  it('returns empty string when neither translation nor remark is present', () => {
    const result = resolveRoleDescription({}, (key) => key)
    expect(result).toBe('')
  })
})

describe('barrel export', () => {
  it('is exported from the shared utils barrel for app imports', () => {
    const utilsIndex = fs.readFileSync(path.resolve(__dirname, './index.ts'), 'utf-8')
    expect(utilsIndex).toContain("export * from './roleI18n'")
  })
})
