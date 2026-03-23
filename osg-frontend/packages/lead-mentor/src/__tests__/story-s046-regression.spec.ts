import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'
import ProfilePage from '../views/profile/basic/index.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorProfile: vi.fn(),
  submitLeadMentorProfileChangeRequest: vi.fn(),
}))

const messageMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    nickName: 'Jess Lead Mentor',
    userName: 'leadmentor',
  })),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => 'lead-mentor-token'),
}))

vi.mock('ant-design-vue', () => ({
  message: messageMocks,
}))

const baseProfileView = {
  profile: {
    staffId: 810,
    englishName: 'Jess Lead Mentor',
    genderLabel: 'Male',
    typeLabel: '班主任',
    email: 'lead@example.com',
    phone: '+86 138-0013-8000',
    wechatId: '-',
    regionArea: '中国大陆',
    regionCity: 'Shanghai 上海',
    regionLabel: '中国大陆 · Shanghai 上海',
    majorDirection: '金融 Finance',
    subDirection: 'Investment Banking / Capital Markets',
    hourlyRate: 500,
    statusLabel: '正常',
  },
  pendingChanges: [
    {
      changeRequestId: 9101,
      fieldKey: 'phone',
      fieldLabel: '手机号',
      beforeValue: '+86 138-0013-8000',
      afterValue: '+86 139-0000-0000',
      status: 'pending',
      requestedBy: 'leadmentor_profile',
      submittedAt: '2026-03-23T20:30:00+08:00',
      remark: '-',
    },
  ],
  pendingCount: 1,
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountStory(initialPath = '/profile/basic') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'profile/basic', name: 'ProfileBasic', component: ProfilePage },
        ],
      },
    ],
  })

  await router.push(initialPath)
  await router.isReady()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(RouterView)
  app.use(router)
  app.mount(container)
  await flushUi()

  return {
    container,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

describe('S-046 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorProfile.mockResolvedValue(baseProfileView)
    apiMocks.submitLeadMentorProfileChangeRequest.mockResolvedValue({
      ...baseProfileView,
      pendingChanges: [
        {
          changeRequestId: 9201,
          fieldKey: 'email',
          fieldLabel: '邮箱',
          beforeValue: 'lead@example.com',
          afterValue: 'updated.lead@example.com',
          status: 'pending',
          requestedBy: 'leadmentor_profile',
          submittedAt: '2026-03-23T21:36:00+08:00',
          remark: '-',
        },
        ...baseProfileView.pendingChanges,
      ],
      pendingCount: 2,
      staffId: 810,
      changeRequestId: 9201,
      changeRequestIds: [9201],
      createdCount: 1,
      requests: [
        {
          changeRequestId: 9201,
          fieldKey: 'email',
          fieldLabel: '邮箱',
          beforeValue: 'lead@example.com',
          afterValue: 'updated.lead@example.com',
          status: 'pending',
          requestedBy: 'leadmentor_profile',
          submittedAt: '2026-03-23T21:36:00+08:00',
          remark: '-',
        },
      ],
    })
  })

  it('keeps own profile scoped to the logged-in lead mentor and preserves pending change trace after submit', async () => {
    const page = await mountStory()

    try {
      expect(page.container.textContent).toContain('Jess Lead Mentor')
      expect(page.container.textContent).toContain('中国大陆 · Shanghai 上海')
      expect(page.container.textContent).toContain('已提交 1 条待审核变更申请')

      const trigger = page.container.querySelector<HTMLElement>('[data-surface-trigger="modal-lead-edit-profile"]')
      expect(trigger).toBeTruthy()

      trigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-lead-edit-profile"]')
      expect(modal).toBeTruthy()
      expect(modal?.textContent).toContain('编辑个人信息')
      expect(modal?.textContent).toContain('主攻方向、二级方向和课单价不可自行修改')
      expect(modal?.textContent).not.toContain('主攻方向 *')
      expect(modal?.textContent).not.toContain('二级方向 *')

      const emailField = Array.from(page.container.querySelectorAll<HTMLInputElement>('.lead-edit-profile-modal .form-input'))
        .find((input) => input.type === 'email')
      expect(emailField).toBeTruthy()

      emailField!.value = 'updated.lead@example.com'
      emailField!.dispatchEvent(new Event('input', { bubbles: true }))
      await flushUi()

      const saveButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('.lead-edit-profile-modal .btn'))
        .find((button) => button.textContent?.includes('保存修改'))
      expect(saveButton).toBeTruthy()

      saveButton?.click()
      await flushUi()

      expect(apiMocks.submitLeadMentorProfileChangeRequest).toHaveBeenCalledWith({
        staffId: 810,
        englishName: 'Jess Lead Mentor',
        genderLabel: 'Male',
        phone: '+86 138-0013-8000',
        wechatId: '',
        email: 'updated.lead@example.com',
        regionArea: '中国大陆',
        regionCity: 'Shanghai 上海',
      })
      expect(messageMocks.success).toHaveBeenCalledWith('已提交 1 条变更申请')
      expect(page.container.textContent).toContain('已提交 2 条待审核变更申请')
      expect(page.container.textContent).toContain('最近一条：邮箱 -> updated.lead@example.com')
    } finally {
      page.unmount()
    }
  })
})
