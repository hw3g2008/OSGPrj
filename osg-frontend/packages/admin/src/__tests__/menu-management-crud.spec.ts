import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const menuApiSource = fs.readFileSync(
  path.resolve(__dirname, '../../../shared/src/api/admin/menu.ts'),
  'utf-8'
)

const menuViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/menu/index.vue'),
  'utf-8'
)

const modalSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/menu/components/MenuFormModal.vue'),
  'utf-8'
)

describe('菜单管理增改流程', () => {
  it('在 shared menu api 中提供新增和编辑菜单接口', () => {
    expect(menuApiSource).toContain('export function createAdminMenu')
    expect(menuApiSource).toContain("http.post('/system/menu'")
    expect(menuApiSource).toContain('export function updateAdminMenu')
    expect(menuApiSource).toContain("http.put('/system/menu'")
  })

  it('菜单管理页在提交后调用 create/update 并刷新真实列表', () => {
    expect(menuViewSource).toContain('createAdminMenu')
    expect(menuViewSource).toContain('updateAdminMenu')
    expect(menuViewSource).toContain('handleMenuSubmit')
    expect(menuViewSource).toContain("message.success('菜单已保存')")
    expect(menuViewSource).toContain('await loadMenuList()')
  })

  it('菜单表单弹层通过 submit 事件把表单值交给页面', () => {
    expect(modalSource).toContain("'submit': [payload:")
    expect(modalSource).toContain("emit('submit',")
    expect(modalSource).toContain('menuId')
    expect(modalSource).toContain('menuName')
    expect(modalSource).toContain('menuType')
    expect(modalSource).toContain('orderNum')
    expect(modalSource).toContain('status')
  })
})
