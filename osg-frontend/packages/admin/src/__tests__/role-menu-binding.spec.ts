import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const rolesViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/roles/index.vue'),
  'utf-8'
)

const roleMenuTreeModalSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/roles/components/RoleMenuTreeModal.vue'),
  'utf-8'
)

describe('角色菜单树真实授权流', () => {
  it('角色页在打开菜单树时读取 checkedKeys，并在保存后调用 updateRole', () => {
    expect(rolesViewSource).toContain('getRoleMenuIds(record.roleId)')
    expect(rolesViewSource).toContain('currentRoleTreeKeys.value = res.checkedKeys || []')
    expect(rolesViewSource).toContain('updateRole({')
    expect(rolesViewSource).toContain('menuIds')
    expect(rolesViewSource).toContain("message.success('角色菜单树已保存')")
    expect(rolesViewSource).toContain('loadRoleList()')
  })

  it('菜单树弹层通过 submit 输出 menuIds，不在浏览器里写假成功态', () => {
    expect(roleMenuTreeModalSource).toContain("emit('submit', [...selectedMenuIds.value])")
    expect(roleMenuTreeModalSource).not.toContain('message.success')
  })
})
