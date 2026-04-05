import { describe, expect, it } from 'vitest'
import {
  buildMenuGroupsFromRuntimeRouters,
  collectRuntimePaths,
  hasRuntimeRouteAccess,
  resolveRuntimeHomePath,
  type RuntimeRouteRecord,
} from '../router/runtimeRoutes'

const runtimeRouters: RuntimeRouteRecord[] = [
  {
    path: '/permission',
    meta: { title: '权限管理', icon: 'mdi-shield-key' },
    children: [
      { path: 'menu', meta: { title: '菜单管理', icon: 'mdi-file-tree' } },
      { path: 'roles', meta: { title: '权限配置', icon: 'mdi-key' } },
      { path: 'users', meta: { title: '后台用户管理', icon: 'shield-account' } },
    ],
  },
  {
    path: '/users',
    meta: { title: '用户中心', icon: 'mdi-account-group' },
    children: [
      { path: 'students', meta: { title: '学生列表', icon: 'account-school' } },
      { path: 'staff', meta: { title: '导师列表', icon: 'account-tie' }, hidden: true },
    ],
  },
]

describe('dynamic router sidebar helpers', () => {
  it('builds sidebar groups from runtime routers instead of local menu constants', () => {
    const groups = buildMenuGroupsFromRuntimeRouters(runtimeRouters)

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      title: '权限管理',
      children: [
        { path: '/permission/menu', title: '菜单管理', iconClass: 'mdi-file-tree' },
        { path: '/permission/roles', title: '权限配置', iconClass: 'mdi-key' },
        { path: '/permission/users', title: '后台用户管理', iconClass: 'mdi-shield-account' },
      ],
    })
    expect(groups[1]).toMatchObject({
      title: '用户中心',
      children: [{ path: '/users/students', title: '学生列表', iconClass: 'mdi-account-school' }],
    })
  })

  it('collects only visible runtime leaf paths', () => {
    expect(collectRuntimePaths(runtimeRouters)).toEqual([
      '/permission/menu',
      '/permission/roles',
      '/permission/users',
      '/users/students',
    ])
  })

  it('resolves the first accessible page from runtime routers', () => {
    expect(resolveRuntimeHomePath(runtimeRouters)).toBe('/permission/menu')
  })

  it('uses runtime menu paths as the URL boundary source of truth', () => {
    expect(hasRuntimeRouteAccess(runtimeRouters, '/permission/roles')).toBe(true)
    expect(hasRuntimeRouteAccess(runtimeRouters, '/permission/roles/detail')).toBe(true)
    expect(hasRuntimeRouteAccess(runtimeRouters, '/users/staff')).toBe(false)
    expect(hasRuntimeRouteAccess(runtimeRouters, '/finance/expense')).toBe(false)
  })
})
