import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const rolesViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/roles/index.vue'),
  'utf-8',
)

const roleApiSource = fs.readFileSync(
  path.resolve(__dirname, '../api/role.ts'),
  'utf-8',
)

describe('role name / description i18n wiring (Commit C)', () => {
  it('role.ts API exposes i18nKey and remarkI18nKey on the list row type', () => {
    expect(roleApiSource).toMatch(/i18nKey\?\s*:\s*string\s*\|\s*null/)
    expect(roleApiSource).toMatch(/remarkI18nKey\?\s*:\s*string\s*\|\s*null/)
  })

  it('roles/index.vue imports both role resolvers from shared utils', () => {
    expect(rolesViewSource).toContain(
      "import { resolveRoleDisplayName, resolveRoleDescription } from '@osg/shared/utils/roleI18n'",
    )
  })

  it('table renders roleName via resolveRoleDisplayName (not raw record.roleName)', () => {
    expect(rolesViewSource).toMatch(
      /resolveRoleDisplayName\(\s*\{\s*roleName:\s*record\.roleName,\s*i18nKey:\s*record\.i18nKey\s*\}/,
    )
    // The raw `{{ record.roleName }}` binding must be gone from the roleName template.
    expect(rolesViewSource).not.toMatch(/<strong>\s*\{\{\s*record\.roleName\s*\}\}\s*<\/strong>/)
  })

  it('table renders remark via resolveRoleDescription (not raw record.remark)', () => {
    expect(rolesViewSource).toMatch(
      /resolveRoleDescription\(\s*\{\s*remark:\s*record\.remark,\s*remarkI18nKey:\s*record\.remarkI18nKey\s*\}/,
    )
    // Preserve the "-" placeholder for missing descriptions.
    expect(rolesViewSource).toContain(', t) || \'-\'')
  })
})
