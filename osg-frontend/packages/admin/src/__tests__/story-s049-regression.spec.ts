import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MenuPage from '../views/permission/menu/index.vue'

const apiMocks = vi.hoisted(() => ({
  getAdminMenuList: vi.fn(),
  createAdminMenu: vi.fn(),
  updateAdminMenu: vi.fn(),
}))

const messageMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@osg/shared/api/admin/menu', () => apiMocks)
vi.mock('ant-design-vue', () => ({
  message: messageMocks,
}))

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8'
)

async function flushUi() {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
}

function setInputValue(selector: string, value: string) {
  const element = document.body.querySelector<HTMLInputElement>(selector)
  expect(element).toBeTruthy()
  element!.value = value
  element!.dispatchEvent(new Event('input', { bubbles: true }))
  element!.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('S-049 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('加载真实菜单列表、创建菜单后刷新结果，并保持页面级回写链路', async () => {
    apiMocks.getAdminMenuList
      .mockResolvedValueOnce([
        {
          menuId: 1,
          parentId: 0,
          menuName: '菜单管理',
          menuType: 'C',
          orderNum: 90,
          perms: 'system:menu:list',
          component: 'permission/menu/index',
          path: '/permission/menu',
          icon: 'mdi-file-tree',
          status: '0',
          visible: '0',
        },
      ])
      .mockResolvedValueOnce([
        {
          menuId: 1,
          parentId: 0,
          menuName: '菜单管理',
          menuType: 'C',
          orderNum: 90,
          perms: 'system:menu:list',
          component: 'permission/menu/index',
          path: '/permission/menu',
          icon: 'mdi-file-tree',
          status: '0',
          visible: '0',
        },
        {
          menuId: 2,
          parentId: 0,
          menuName: '角色管理',
          menuType: 'C',
          orderNum: 80,
          perms: 'system:role:list',
          component: 'permission/roles/index',
          path: '/permission/roles',
          icon: 'mdi-account-key',
          status: '0',
          visible: '0',
        },
      ])
    apiMocks.createAdminMenu.mockResolvedValue({})

    const wrapper = mount(MenuPage, { attachTo: document.body })
    await flushUi()

    expect(apiMocks.getAdminMenuList).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('菜单管理')

    await wrapper.get('button.btn-primary[data-surface-trigger="modal-menu-form"]').trigger('click')
    await flushUi()

    expect(document.body.querySelector('[data-surface-id="modal-menu-form"]')).toBeTruthy()

    setInputValue('input[placeholder="请输入菜单名称"]', '角色管理')
    setInputValue('input[placeholder="如：/permission/menu"]', '/permission/roles')
    setInputValue('input[placeholder="如：permission/menu/index"]', 'permission/roles/index')
    setInputValue('input[placeholder="如：system:menu:list"]', 'system:role:list')
    setInputValue('input[placeholder="如：mdi-file-tree"]', 'mdi-account-key')

    const saveButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.btn'))
      .find((button) => button.textContent?.includes('保存'))
    expect(saveButton).toBeTruthy()

    saveButton?.click()
    await flushUi()

    expect(apiMocks.createAdminMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        menuName: '角色管理',
        path: '/permission/roles',
        component: 'permission/roles/index',
        perms: 'system:role:list',
      }),
    )
    expect(messageMocks.success).toHaveBeenCalledWith('菜单已保存')
    expect(apiMocks.getAdminMenuList).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('角色管理')
    expect(document.body.querySelector('[data-surface-id="modal-menu-form"]')).toBeFalsy()

    wrapper.unmount()
  })

  it('真实保存失败时保留错误态，不注入假成功结果', async () => {
    apiMocks.getAdminMenuList.mockResolvedValue([
      {
        menuId: 1,
        parentId: 0,
        menuName: '菜单管理',
        menuType: 'C',
        orderNum: 90,
        perms: 'system:menu:list',
        component: 'permission/menu/index',
        path: '/permission/menu',
        icon: 'mdi-file-tree',
        status: '0',
        visible: '0',
      },
    ])
    apiMocks.createAdminMenu.mockRejectedValue(new Error('duplicate menu'))

    const wrapper = mount(MenuPage, { attachTo: document.body })
    await flushUi()

    await wrapper.get('button.btn-primary[data-surface-trigger="modal-menu-form"]').trigger('click')
    await flushUi()

    setInputValue('input[placeholder="请输入菜单名称"]', '重复菜单')

    const saveButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.btn'))
      .find((button) => button.textContent?.includes('保存'))
    expect(saveButton).toBeTruthy()

    saveButton?.click()
    await flushUi()

    expect(messageMocks.error).toHaveBeenCalledWith('保存菜单失败')
    expect(messageMocks.success).not.toHaveBeenCalled()
    expect(apiMocks.getAdminMenuList).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('[data-surface-id="modal-menu-form"]')).toBeTruthy()

    wrapper.unmount()
  })

  it('保留页面级权限边界检查，避免无权直达路由', () => {
    expect(routerSource).toContain('const permission = to.meta.permission as string | undefined')
    expect(routerSource).toContain("message.warning('您没有权限访问此页面')")
    expect(routerSource).toContain("if (!isAdmin && !userStore.permissions.includes(permission))")
  })
})
