import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const menuViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/menu/index.vue'),
  'utf-8'
)

const sharedMenuApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/menu.ts')

describe('菜单管理真实列表数据流', () => {
  it('在 shared admin api 中提供菜单列表查询接口', () => {
    expect(fs.existsSync(sharedMenuApiPath)).toBe(true)
    const apiSource = fs.readFileSync(sharedMenuApiPath, 'utf-8')

    expect(apiSource).toContain("http.get<MenuListItem[]>('/system/menu/list'")
    expect(apiSource).toContain('menuName')
    expect(apiSource).toContain('status')
    expect(apiSource).toContain('menuType')
  })

  it('菜单页接入 getAdminMenuList 并移除静态占位行', () => {
    expect(menuViewSource).toContain('getAdminMenuList')
    expect(menuViewSource).toContain('onMounted(() => {')
    expect(menuViewSource).toContain('loadMenuList()')
    expect(menuViewSource).toContain('v-for="item in dataList"')
    expect(menuViewSource).not.toContain('待接真实菜单树')
  })
})
