import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildMenuGroupsFromRuntimeRouters,
  hasRuntimeRouteAccess,
  resolveRuntimeHomePath,
  type RuntimeRouteRecord,
} from '../router/runtimeRoutes'

const routerSource = readFileSync(path.resolve(__dirname, '../router/index.ts'), 'utf-8')
const layoutSource = readFileSync(path.resolve(__dirname, '../layouts/MainLayout.vue'), 'utf-8')
const userStoreSource = readFileSync(path.resolve(__dirname, '../stores/user.ts'), 'utf-8')

describe('S-051 story regression skeleton', () => {
  it('登录后按 /getRouters 的真实返回生成侧栏与首页跳转', () => {
    const runtimeRouters: RuntimeRouteRecord[] = [
      {
        path: '/permission',
        meta: { title: '权限管理', icon: 'mdi-shield-key' },
        children: [
          { path: 'menu', meta: { title: '菜单管理', icon: 'mdi-file-tree' } },
          { path: 'roles', meta: { title: '权限配置', icon: 'mdi-key' } },
        ],
      },
      {
        path: '/career',
        meta: { title: '求职中心', icon: 'mdi-briefcase-search' },
        children: [{ path: 'positions', meta: { title: '岗位信息', icon: 'mdi-briefcase-search' } }],
      },
    ]

    expect(buildMenuGroupsFromRuntimeRouters(runtimeRouters)).toEqual([
      {
        key: '-permission',
        title: '权限管理',
        children: [
          { path: '/permission/menu', title: '菜单管理', iconClass: 'mdi-file-tree' },
          { path: '/permission/roles', title: '权限配置', iconClass: 'mdi-key' },
        ],
      },
      {
        key: '-career',
        title: '求职中心',
        children: [{ path: '/career/positions', title: '岗位信息', iconClass: 'mdi-briefcase-search' }],
      },
    ])
    expect(resolveRuntimeHomePath(runtimeRouters)).toBe('/permission/menu')
  })

  it('角色菜单授权变化后，刷新后的真实菜单树会同步改变侧栏与 URL 边界', () => {
    const beforeRefresh: RuntimeRouteRecord[] = [
      {
        path: '/permission',
        meta: { title: '权限管理', icon: 'mdi-shield-key' },
        children: [{ path: 'roles', meta: { title: '权限配置', icon: 'mdi-key' } }],
      },
    ]
    const afterRefresh: RuntimeRouteRecord[] = [
      {
        path: '/permission',
        meta: { title: '权限管理', icon: 'mdi-shield-key' },
        children: [{ path: 'users', meta: { title: '后台用户管理', icon: 'mdi-shield-account' } }],
      },
    ]

    expect(hasRuntimeRouteAccess(beforeRefresh, '/permission/roles')).toBe(true)
    expect(hasRuntimeRouteAccess(beforeRefresh, '/permission/users')).toBe(false)

    expect(hasRuntimeRouteAccess(afterRefresh, '/permission/roles')).toBe(false)
    expect(hasRuntimeRouteAccess(afterRefresh, '/permission/users')).toBe(true)
    expect(resolveRuntimeHomePath(afterRefresh)).toBe('/permission/users')
  })

  it('保留 /getRouters 真相采集，但不再让它直接替换本地菜单壳体', () => {
    expect(userStoreSource).toContain('Promise.all([getInfoApi(), getRoutersApi()])')
    expect(routerSource).not.toContain('hasRuntimeRouteAccess')
    expect(routerSource).not.toContain('resolveRuntimeHomePath')
    expect(layoutSource).toContain("const menuGroups: MenuGroup[] = [")
    expect(layoutSource).toContain("path: '/permission/roles'")
  })
})
