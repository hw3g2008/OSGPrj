import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const rolesViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/roles/index.vue'),
  'utf-8'
)

describe('角色管理增强页面壳体', () => {
  it('暴露动态权限页锚点和升级说明卡片', () => {
    expect(rolesViewSource).toContain('id="page-roles"')
    expect(rolesViewSource).toContain('动态权限升级说明')
    expect(rolesViewSource).toContain('菜单树授权')
    expect(rolesViewSource).toContain('/getRouters')
    expect(rolesViewSource).toContain('mdi-file-tree')
  })

  it('为普通角色提供配置菜单树入口，同时保留系统角色文案', () => {
    expect(rolesViewSource).toContain('配置菜单树')
    expect(rolesViewSource).toContain('data-surface-trigger="modal-role-menu-tree"')
    expect(rolesViewSource).toContain('系统角色')
  })
})
