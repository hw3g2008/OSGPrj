import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeMenuTree } from '../views/permission/roles/menuTree'

const rolesViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/roles/index.vue'),
  'utf-8',
)
const roleModalSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/roles/components/RoleModal.vue'),
  'utf-8',
)
const roleMenuTreeModalSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/roles/components/RoleMenuTreeModal.vue'),
  'utf-8',
)

describe('role page menu i18n resolver wiring', () => {
  it('roles/index.vue imports resolveMenuDisplayName and routes second-level menu names through it', () => {
    expect(rolesViewSource).toContain("import { resolveMenuDisplayName } from '@osg/shared/utils/menuI18n'")
    expect(rolesViewSource).toContain('resolveMenuDisplayName(')
    expect(rolesViewSource).toContain('i18nKey: second.i18nKey')
    // No raw .label push remains in the menuNames pipeline.
    expect(rolesViewSource).not.toContain('secondLevelNames.push(second.label)')
  })

  it('RoleModal.vue resolves menu group/item labels via i18n key, not via locale-fragile substring matching', () => {
    expect(roleModalSource).toContain("import { resolveMenuDisplayName } from '@osg/shared/utils/menuI18n'")
    expect(roleModalSource).toContain('GROUP_ICON_BY_I18N_KEY')
    // inferGroupIcon must dispatch on i18nKey, not on translated label substrings.
    expect(roleModalSource).not.toMatch(/label\.includes\(t\(/)
    // Group label is resolved through resolveMenuDisplayName.
    expect(roleModalSource).toMatch(/label:\s*resolveMenuDisplayName\(\s*\{\s*menuName:\s*group\.label,\s*i18nKey:\s*group\.i18nKey\s*\},\s*t\s*\)/)
  })

  it('RoleMenuTreeModal.vue renders every label via displayLabel(node) and dispatches icons on i18nKey', () => {
    expect(roleMenuTreeModalSource).toContain("import { resolveMenuDisplayName } from '@osg/shared/utils/menuI18n'")
    expect(roleMenuTreeModalSource).toContain('GROUP_ICON_BY_I18N_KEY')
    expect(roleMenuTreeModalSource).toContain('displayLabel(group)')
    expect(roleMenuTreeModalSource).toContain('displayLabel(node)')
    expect(roleMenuTreeModalSource).toContain('displayLabel(child)')
    expect(roleMenuTreeModalSource).not.toMatch(/\{\{\s*group\.label\s*\}\}/)
    expect(roleMenuTreeModalSource).not.toMatch(/\{\{\s*node\.label\s*\}\}/)
    expect(roleMenuTreeModalSource).not.toMatch(/\{\{\s*child\.label\s*\}\}/)
    expect(roleMenuTreeModalSource).not.toMatch(/label\.includes\(t\(/)
  })
})

describe('normalizeMenuTree carries i18nKey through the pipeline', () => {
  it('preserves i18nKey from raw backend tree onto the normalized tree', () => {
    const tree = normalizeMenuTree([
      {
        id: 1,
        label: '权限管理',
        i18nKey: 'permission_management',
        children: [
          { id: 11, label: '菜单管理', i18nKey: 'menu_management' },
        ],
      },
    ])

    expect(tree).toHaveLength(1)
    expect(tree[0].i18nKey).toBe('permission_management')
    expect(tree[0].children?.[0].i18nKey).toBe('menu_management')
  })

  it('leaves i18nKey undefined when the backend node does not provide one (user-defined menus stay as-is)', () => {
    const tree = normalizeMenuTree([{ id: 99, label: '自定义模块' }])
    expect(tree[0].i18nKey).toBeUndefined()
    expect(tree[0].label).toBe('自定义模块')
  })
})
