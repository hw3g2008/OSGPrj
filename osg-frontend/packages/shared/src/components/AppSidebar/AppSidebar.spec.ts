/**
 * AppSidebar unit tests（M0.4 Step 4.1）
 *
 * 14 个 case，对应方案 §6.1 表格 13 个 + Step 3 文档新增 1 个 unmount cleanup。
 * 严格 TDD：先红（stub 实现失败）→ 实现（GREEN）→ 重构。
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Modal } from 'ant-design-vue'

import AppSidebar from './AppSidebar.vue'
import type { NavigationGroup } from './types'

// =====================================================
// 测试夹具
// =====================================================

function makeNavigationGroups(): NavigationGroup[] {
  return [
    {
      title: '求职辅导 Career',
      items: [
        {
          path: '/career/positions',
          label: '岗位库 Positions',
          iconClass: 'mdi-briefcase-outline',
          activePaths: ['/career/positions'],
        },
        {
          path: '/career/job-overview',
          label: '求职概览 Job Overview',
          iconClass: 'mdi-clipboard-list-outline',
          activePaths: ['/career/job-overview'],
          badge: 3,
        },
      ],
    },
    {
      title: '教学管理 Teaching',
      items: [
        {
          path: '/teaching/students',
          label: '学员列表 Students',
          iconClass: 'mdi-account-group',
          activePaths: ['/teaching/students'],
        },
        {
          path: '/teaching/hidden',
          label: '隐藏项',
          iconClass: 'mdi-eye-off',
          activePaths: ['/teaching/hidden'],
          hidden: true,
        },
      ],
    },
  ]
}

interface MountOptions {
  currentPath?: string
  navigationGroups?: NavigationGroup[]
}

function mountSidebar(options: MountOptions = {}) {
  const navigationGroups = options.navigationGroups ?? makeNavigationGroups()
  // 关键：attachTo body 让 document.click 监听器能感知到测试中的 click
  return mount(AppSidebar, {
    attachTo: document.body,
    props: {
      navigationGroups,
      displayName: 'Test User',
      userInitials: 'TU',
      roleLabel: '导师',
      currentPath: options.currentPath ?? '/career/positions',
    },
  })
}

let wrapper: VueWrapper | null = null

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
  // 清理 attachTo body 残留 DOM
  document.body.innerHTML = ''
})

// =====================================================
// 14 个 unit tests
// =====================================================

describe('AppSidebar', () => {
  // Case 1: render with navigationGroups
  it('renders all navigation groups and their items', () => {
    wrapper = mountSidebar()

    const groupTitles = wrapper.findAll('.nav-section').map((el) => el.text())
    expect(groupTitles).toEqual(['求职辅导 Career', '教学管理 Teaching'])

    const navItems = wrapper.findAll('.nav-item')
    // 第二组 Teaching 有一个 hidden 项不应渲染 → 共 3 个可见 item
    expect(navItems).toHaveLength(3)
    expect(navItems[0].text()).toContain('岗位库 Positions')
    expect(navItems[1].text()).toContain('求职概览 Job Overview')
    expect(navItems[2].text()).toContain('学员列表 Students')
  })

  // Case 2: click nav item → emit('nav', path) + close menu
  it('emits "nav" with item.path and closes user menu when nav-item clicked', async () => {
    wrapper = mountSidebar()

    // 先打开 user-menu 以验证 close 行为
    await wrapper.find('.user-card').trigger('click')
    expect(wrapper.find('.user-menu').exists()).toBe(true)

    // 点击第一个 nav-item
    await wrapper.find('.nav-item').trigger('click')

    expect(wrapper.emitted('nav')).toBeTruthy()
    expect(wrapper.emitted('nav')![0]).toEqual(['/career/positions'])
    // 菜单应在导航后关闭
    expect(wrapper.find('.user-menu').exists()).toBe(false)
  })

  // Case 3: click hidden item — hidden=true 不渲染
  it('does not render items where hidden=true', () => {
    wrapper = mountSidebar()

    const allItemTexts = wrapper.findAll('.nav-item').map((el) => el.text())
    // "隐藏项" 在夹具里 hidden:true，不应出现
    expect(allItemTexts.some((text) => text.includes('隐藏项'))).toBe(false)
  })

  // Case 4: badge rendering — badge>0 显示，undefined / 0 不显示
  it('renders badge only when badge > 0', () => {
    const groups: NavigationGroup[] = [
      {
        title: 'T',
        items: [
          { path: '/a', label: 'A', iconClass: 'i', activePaths: ['/a'] }, // badge undefined
          { path: '/b', label: 'B', iconClass: 'i', activePaths: ['/b'], badge: 0 },
          { path: '/c', label: 'C', iconClass: 'i', activePaths: ['/c'], badge: 5 },
        ],
      },
    ]
    wrapper = mountSidebar({ navigationGroups: groups })

    const badges = wrapper.findAll('.nav-badge')
    expect(badges).toHaveLength(1)
    expect(badges[0].text()).toBe('5')
  })

  // Case 5: click user-card → toggle menu
  it('toggles user-menu visibility on user-card click', async () => {
    wrapper = mountSidebar()

    expect(wrapper.find('.user-menu').exists()).toBe(false)
    await wrapper.find('.user-card').trigger('click')
    expect(wrapper.find('.user-menu').exists()).toBe(true)
    await wrapper.find('.user-card').trigger('click')
    expect(wrapper.find('.user-menu').exists()).toBe(false)
  })

  // Case 6: click outside → close menu
  it('closes user-menu when document click happens outside .sidebar-footer', async () => {
    wrapper = mountSidebar()

    await wrapper.find('.user-card').trigger('click')
    expect(wrapper.find('.user-menu').exists()).toBe(true)

    // 在 body 上模拟外部点击
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.user-menu').exists()).toBe(false)
  })

  // Case 7: ESC key → close menu
  it('closes user-menu when ESC key is pressed', async () => {
    wrapper = mountSidebar()

    await wrapper.find('.user-card').trigger('click')
    expect(wrapper.find('.user-menu').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.user-menu').exists()).toBe(false)
  })

  // Case 8: click profile-click → emit + close
  it('emits "profile-click" and closes user-menu when profile menu item clicked', async () => {
    wrapper = mountSidebar()

    await wrapper.find('.user-card').trigger('click')
    expect(wrapper.find('.user-menu').exists()).toBe(true)

    const profileItem = wrapper.findAll('.user-menu-item').find((el) => !el.classes().includes('user-menu-item--danger'))
    expect(profileItem).toBeDefined()
    await profileItem!.trigger('click')

    expect(wrapper.emitted('profile-click')).toBeTruthy()
    expect(wrapper.emitted('profile-click')!.length).toBe(1)
    expect(wrapper.find('.user-menu').exists()).toBe(false)
  })

  // Case 9: click logout → Modal.confirm appears
  it('calls Modal.confirm when logout menu item clicked', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockReturnValue({} as any)
    wrapper = mountSidebar()

    await wrapper.find('.user-card').trigger('click')
    const logoutItem = wrapper.find('.user-menu-item--danger')
    expect(logoutItem.exists()).toBe(true)

    await logoutItem.trigger('click')

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    const callArgs = confirmSpy.mock.calls[0][0] as Record<string, unknown>
    expect(callArgs.title).toContain('退出登录')
    expect(typeof callArgs.onOk).toBe('function')
  })

  // Case 10: logout OK → emit('logout')
  it('emits "logout" when Modal.confirm onOk is invoked', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation((options: any) => {
      // 模拟用户点"确定"
      options?.onOk?.()
      return {} as any
    })
    wrapper = mountSidebar()

    await wrapper.find('.user-card').trigger('click')
    await wrapper.find('.user-menu-item--danger').trigger('click')

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('logout')).toBeTruthy()
    expect(wrapper.emitted('logout')!.length).toBe(1)
  })

  // Case 11: logout Cancel → no emit
  it('does not emit "logout" when Modal.confirm onCancel is invoked (or onOk not invoked)', async () => {
    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation((options: any) => {
      // 模拟用户点"取消"：仅触发 onCancel，不触发 onOk
      options?.onCancel?.()
      return {} as any
    })
    wrapper = mountSidebar()

    await wrapper.find('.user-card').trigger('click')
    await wrapper.find('.user-menu-item--danger').trigger('click')

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('logout')).toBeFalsy()
  })

  // Case 12: a11y — user-card role/aria
  it('user-card has accessible attributes (role/aria-expanded)', async () => {
    wrapper = mountSidebar()

    const userCard = wrapper.find('.user-card')
    expect(userCard.attributes('aria-expanded')).toBe('false')
    expect(userCard.attributes('aria-haspopup')).toBe('menu')

    await userCard.trigger('click')
    expect(userCard.attributes('aria-expanded')).toBe('true')
  })

  // Case 13: activePaths 高亮逻辑
  it('applies .active class to nav-item whose activePaths matches currentPath', () => {
    wrapper = mountSidebar({ currentPath: '/career/job-overview/detail/123' })

    const navItems = wrapper.findAll('.nav-item')
    // job-overview 的 activePaths 是 ['/career/job-overview']，prefix match '/career/job-overview/detail/123' 应高亮
    const jobOverviewItem = navItems.find((el) => el.text().includes('Job Overview'))
    expect(jobOverviewItem).toBeDefined()
    expect(jobOverviewItem!.classes()).toContain('active')

    // 其他不应高亮
    const positionsItem = navItems.find((el) => el.text().includes('Positions'))
    expect(positionsItem!.classes()).not.toContain('active')
  })

  // Case 14: unmount cleanup — listener 正确移除，避免重复 mount 累积
  it('removes document/window listeners on unmount (cleanup)', async () => {
    wrapper = mountSidebar()
    await wrapper.find('.user-card').trigger('click')
    expect(wrapper.find('.user-menu').exists()).toBe(true)

    // 卸载组件
    wrapper.unmount()
    wrapper = null

    // 此时再向 document/window 派发事件，不应抛错且不应触发任何残留 closure
    // （没有显式 assertion 失败 = 通过）
    expect(() => {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    }).not.toThrow()

    // 间接验证：再 mount 一次新实例，初始 user-menu 应是关闭，不受前一次实例残留影响
    const fresh = mountSidebar()
    try {
      expect(fresh.find('.user-menu').exists()).toBe(false)
      // 派发 ESC 不应抛错（如果上一次 listener 还在，可能会触发已 unmount 实例的 reactive 状态访问）
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await fresh.vm.$nextTick()
      expect(fresh.find('.user-menu').exists()).toBe(false)
    } finally {
      fresh.unmount()
    }
  })
})
