import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import RolesPage from '../views/permission/roles/index.vue'

const apiMocks = vi.hoisted(() => ({
  getRoleList: vi.fn(),
  getMenuTree: vi.fn(),
  deleteRole: vi.fn(),
  getRoleMenuIds: vi.fn(),
  updateRole: vi.fn(),
}))

const messageMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/api/role', () => apiMocks)
vi.mock('ant-design-vue', () => ({
  message: messageMocks,
  Modal: {
    confirm: vi.fn(),
  },
}))

vi.mock('../views/permission/roles/components/RoleModal.vue', () => ({
  default: defineComponent({
    name: 'RoleModalStub',
    emits: ['update:visible', 'success'],
    setup() {
      return () => h('div', { 'data-role-modal-stub': 'true' })
    },
  }),
}))

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

describe('S-050 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    apiMocks.getRoleList.mockResolvedValue({
      rows: [
        {
          roleId: 9,
          roleName: '运营专员',
          roleKey: 'ops_specialist',
          remark: '负责菜单授权收口',
          userCount: 0,
          updateTime: '2026-04-04 09:00:00',
          status: '0',
        },
      ],
      total: 1,
    })
    apiMocks.getMenuTree.mockResolvedValue([
      {
        id: 1,
        title: '权限管理',
        children: [
          {
            id: 11,
            title: '菜单管理',
            children: [
              { id: 111, title: '新增菜单' },
              { id: 112, title: '编辑菜单' },
            ],
          },
        ],
      },
    ])
    apiMocks.getRoleMenuIds.mockResolvedValue({
      checkedKeys: [11, 111],
      menus: [
        {
          id: 1,
          label: '权限管理',
          children: [
            {
              id: 11,
              label: '菜单管理',
              children: [
                { id: 111, label: '新增菜单' },
                { id: 112, label: '编辑菜单' },
              ],
            },
          ],
        },
      ],
    })
    apiMocks.updateRole.mockResolvedValue({})
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('打开角色菜单树并保存后，会调用真实角色授权接口并刷新列表', async () => {
    const wrapper = mount(RolesPage, { attachTo: document.body })
    await flushUi()

    expect(apiMocks.getRoleList).toHaveBeenCalledTimes(1)
    expect(apiMocks.getMenuTree).toHaveBeenCalledTimes(1)

    const trigger = wrapper.find('[data-surface-trigger="modal-role-menu-tree"]')
    expect(trigger.exists()).toBe(true)

    await trigger.trigger('click')
    await flushUi()

    expect(apiMocks.getRoleMenuIds).toHaveBeenCalledWith(9)
    expect(document.body.textContent).toContain('配置菜单树')
    expect(document.body.textContent).toContain('运营专员')

    const saveButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes('保存授权'),
    )
    expect(saveButton).toBeTruthy()

    saveButton?.click()
    await flushUi()

    expect(apiMocks.updateRole).toHaveBeenCalledWith(
      expect.objectContaining({
        roleId: 9,
        roleName: '运营专员',
        roleKey: 'ops_specialist',
        menuIds: [11, 111],
      }),
    )
    expect(messageMocks.success).toHaveBeenCalledWith('角色菜单树已保存')
    expect(apiMocks.getRoleList).toHaveBeenCalledTimes(3)

    wrapper.unmount()
  })

  it('菜单树回填失败时保留错误态并提示，不注入假成功结果', async () => {
    apiMocks.getRoleMenuIds.mockReset()
    apiMocks.getRoleMenuIds
      .mockResolvedValueOnce({
        checkedKeys: [11, 111],
        menus: [
          {
            id: 1,
            label: '权限管理',
            children: [
              {
                id: 11,
                label: '菜单管理',
                children: [
                  { id: 111, label: '新增菜单' },
                  { id: 112, label: '编辑菜单' },
                ],
              },
            ],
          },
        ],
      })
      .mockRejectedValueOnce(new Error('forbidden role'))

    const wrapper = mount(RolesPage, { attachTo: document.body })
    await flushUi()

    const trigger = wrapper.find('[data-surface-trigger="modal-role-menu-tree"]')
    await trigger.trigger('click')
    await flushUi()

    expect(messageMocks.error).toHaveBeenCalledWith('加载角色菜单树失败')
    expect(messageMocks.success).not.toHaveBeenCalled()
    expect(apiMocks.updateRole).not.toHaveBeenCalled()

    wrapper.unmount()
  })
})
