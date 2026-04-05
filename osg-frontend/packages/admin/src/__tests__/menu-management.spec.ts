import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)

const layoutSource = fs.readFileSync(
  path.resolve(__dirname, '../layouts/MainLayout.vue'),
  'utf-8'
)

const menuViewPath = path.resolve(__dirname, '../views/permission/menu/index.vue')

describe('菜单管理页面壳体', () => {
  it('在 router 中声明 /permission/menu 路由和 system:menu:list 权限', () => {
    expect(routerSource).toContain("path: 'permission/menu'")
    expect(routerSource).toContain("name: 'MenuManagement'")
    expect(routerSource).toContain("meta: { title: '菜单管理', permission: 'system:menu:list' }")
  })

  it('在本地白名单侧边栏中保留菜单管理入口和图标元数据', () => {
    expect(layoutSource).toContain("path: '/permission/menu'")
    expect(layoutSource).toContain("title: '菜单管理'")
    expect(layoutSource).toContain("iconClass: 'mdi-file-tree'")
  })

  it('提供菜单管理页面视图文件和核心壳体锚点', () => {
    expect(fs.existsSync(menuViewPath)).toBe(true)
    const viewSource = fs.readFileSync(menuViewPath, 'utf-8')

    expect(viewSource).toContain('菜单管理')
    expect(viewSource).toContain('Menu Management')
    expect(viewSource).toContain('维护 `sys_menu` 菜单树、路由路径、组件路径与按钮级权限 Key')
    expect(viewSource).toContain('menu-tree-table')
    expect(viewSource).toContain('展开全部')
    expect(viewSource).toContain('新增菜单')
    expect(viewSource).toContain('搜索')
    expect(viewSource).toContain('新增下级')
    expect(viewSource).toContain('编辑')
  })
})
