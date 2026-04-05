import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const rolesViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/roles/index.vue'),
  'utf-8'
)

const modalPath = path.resolve(__dirname, '../views/permission/roles/components/RoleMenuTreeModal.vue')

describe('角色菜单树弹层壳体', () => {
  it('提供角色菜单树弹层文件并暴露 modal-role-menu-tree surface id', () => {
    expect(fs.existsSync(modalPath)).toBe(true)
    const modalSource = fs.readFileSync(modalPath, 'utf-8')

    expect(modalSource).toContain('surface-id="modal-role-menu-tree"')
    expect(modalSource).toContain('配置菜单树')
    expect(modalSource).toContain('角色名称')
    expect(modalSource).toContain('角色 Key')
    expect(modalSource).toContain('新增菜单')
    expect(modalSource).toContain('编辑菜单')
    expect(modalSource).toContain('删除菜单')
    expect(modalSource).toContain('保存授权')
    expect(modalSource).toContain('mdi-account-key')
    expect(modalSource).toContain('mdi-folder-key')
  })

  it('在角色页中挂接 RoleMenuTreeModal 和 modal-role-menu-tree trigger', () => {
    expect(rolesViewSource).toContain('RoleMenuTreeModal')
    expect(rolesViewSource).toContain('roleTreeVisible')
    expect(rolesViewSource).toContain('data-surface-trigger="modal-role-menu-tree"')
    expect(rolesViewSource).toContain('@success="loadRoleList"')
  })
})
