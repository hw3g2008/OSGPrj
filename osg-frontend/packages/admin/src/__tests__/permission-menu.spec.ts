import { describe, it, expect } from 'vitest'

interface MenuItem {
  path: string
  title: string
  permission?: string
}

interface MenuGroup {
  key: string
  title: string
  children: MenuItem[]
}

// 菜单分组定义（与 MainLayout.vue 中的 menuGroups 一致）
const menuGroups: MenuGroup[] = [
  {
    key: 'permission',
    title: '权限管理',
    children: [
      { path: '/permission/roles', title: '权限配置', permission: 'system:role:list' },
      { path: '/permission/users', title: '后台用户管理', permission: 'system:user:list' },
      { path: '/permission/base-data', title: '基础数据管理', permission: 'system:baseData:list' },
    ]
  },
  {
    key: 'user-center',
    title: '用户中心',
    children: [
      { path: '/users/students', title: '学生列表', permission: 'users:student:list' },
      { path: '/users/contracts', title: '合同管理', permission: 'users:contract:list' },
    ]
  },
  {
    key: 'teaching',
    title: '教学中心',
    children: [
      { path: '/teaching/class-records', title: '课程记录', permission: 'teaching:classRecord:list' },
    ]
  },
]

// 提取过滤逻辑（与 MainLayout.vue 中的 filteredMenuGroups 一致）
function filterMenuGroups(groups: MenuGroup[], permissions: string[]): MenuGroup[] {
  const isAdmin = permissions.includes('*:*:*')

  return groups
    .map(group => ({
      ...group,
      children: group.children.filter(item => {
        if (isAdmin) return true
        return !item.permission || permissions.includes(item.permission)
      })
    }))
    .filter(group => group.children.length > 0)
}

describe('菜单权限过滤测试', () => {
  it('普通用户只能看到有权限的菜单项', () => {
    const perms = ['system:role:list', 'system:user:list']
    const filtered = filterMenuGroups(menuGroups, perms)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].key).toBe('permission')
    expect(filtered[0].children).toHaveLength(2)
    expect(filtered[0].children[0].path).toBe('/permission/roles')
    expect(filtered[0].children[1].path).toBe('/permission/users')
  })

  it('分组下所有菜单项无权限时分组标题隐藏', () => {
    const perms = ['system:role:list']
    const filtered = filterMenuGroups(menuGroups, perms)

    // 只有权限管理组可见（1项），用户中心和教学中心整组隐藏
    expect(filtered).toHaveLength(1)
    expect(filtered[0].key).toBe('permission')
    expect(filtered[0].children).toHaveLength(1)
  })

  it('超级管理员可以看到所有菜单项和分组', () => {
    const perms = ['*:*:*']
    const filtered = filterMenuGroups(menuGroups, perms)

    expect(filtered).toHaveLength(3)
    expect(filtered[0].children).toHaveLength(3)
    expect(filtered[1].children).toHaveLength(2)
    expect(filtered[2].children).toHaveLength(1)
  })

  it('空权限列表时所有分组隐藏', () => {
    const perms: string[] = []
    const filtered = filterMenuGroups(menuGroups, perms)

    expect(filtered).toHaveLength(0)
  })

  it('跨分组部分权限正确过滤', () => {
    const perms = ['system:role:list', 'users:student:list', 'teaching:classRecord:list']
    const filtered = filterMenuGroups(menuGroups, perms)

    expect(filtered).toHaveLength(3)
    expect(filtered[0].key).toBe('permission')
    expect(filtered[0].children).toHaveLength(1)
    expect(filtered[1].key).toBe('user-center')
    expect(filtered[1].children).toHaveLength(1)
    expect(filtered[2].key).toBe('teaching')
    expect(filtered[2].children).toHaveLength(1)
  })

  it('无 permission 字段的菜单项始终可见', () => {
    const groupsWithNoPermItem: MenuGroup[] = [
      {
        key: 'test',
        title: '测试组',
        children: [
          { path: '/test/open', title: '无权限菜单' },
          { path: '/test/restricted', title: '受限菜单', permission: 'test:restricted:list' },
        ]
      }
    ]

    const perms: string[] = []
    const filtered = filterMenuGroups(groupsWithNoPermItem, perms)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].children).toHaveLength(1)
    expect(filtered[0].children[0].path).toBe('/test/open')
  })
})
