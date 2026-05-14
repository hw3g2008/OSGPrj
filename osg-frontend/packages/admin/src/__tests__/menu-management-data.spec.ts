import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const menuViewSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/menu/index.vue'),
  'utf-8'
)

const sharedMenuApiPath = path.resolve(__dirname, '../../../shared/src/api/admin/menu.ts')
const menuFormModalSource = fs.readFileSync(
  path.resolve(__dirname, '../views/permission/menu/components/MenuFormModal.vue'),
  'utf-8'
)

describe('菜单管理真实列表数据流', () => {
  it('在 shared admin api 中提供菜单列表查询接口', () => {
    expect(fs.existsSync(sharedMenuApiPath)).toBe(true)
    const apiSource = fs.readFileSync(sharedMenuApiPath, 'utf-8')

    expect(apiSource).toContain("http.get<MenuListItem[]>('/system/menu/list'")
    expect(apiSource).toContain('menuName')
    expect(apiSource).toContain('i18nKey')
    expect(apiSource).toContain('status')
    expect(apiSource).toContain('menuType')
  })

  it('菜单页接入 getAdminMenuList 并移除静态占位行', () => {
    expect(menuViewSource).toContain('getAdminMenuList')
    expect(menuViewSource).toContain('onMounted(() => {')
    expect(menuViewSource).toContain('loadMenuList()')
    expect(menuViewSource).toContain(':data-source="dataList"')
    expect(menuViewSource).not.toContain('待接真实菜单树')
  })

  it('菜单展示优先走 i18n resolver 并保留后端原名兜底', () => {
    expect(menuViewSource).toContain('resolveMenuDisplayName')
    expect(menuViewSource).toContain('resolveMenuName(record as MenuListItem)')
    expect(menuFormModalSource).toContain('resolveMenuDisplayName')
    expect(menuFormModalSource).toContain('resolveMenuName(item)')
    expect(menuFormModalSource).toContain('formState.i18nKey')
  })
})
