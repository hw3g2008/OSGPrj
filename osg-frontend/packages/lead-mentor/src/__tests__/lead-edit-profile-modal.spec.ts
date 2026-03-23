import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/LeadEditProfileModal.vue')
const modalExists = fs.existsSync(modalPath)
const pagePath = path.resolve(__dirname, '../views/profile/basic/index.vue')
const pageExists = fs.existsSync(pagePath)

const apiMocks = vi.hoisted(() => ({
  getLeadMentorProfile: vi.fn(),
  submitLeadMentorProfileChangeRequest: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    userId: 19,
    userName: 'leadmentor',
    nickName: 'Jess Lead Mentor',
    email: 'jess@osg.test',
    phonenumber: '+86 138-0013-8000',
    sex: '0',
    status: 'active',
    roles: ['lead_mentor'],
  })),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => 'lead-mentor-token'),
}))

vi.mock('ant-design-vue', () => ({
  message: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}))

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function loadEditProfileModal() {
  expect(modalExists).toBe(true)
  const moduleUrl = pathToFileURL(modalPath).href
  return (await import(/* @vite-ignore */ moduleUrl))
}

async function loadProfilePage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountModal() {
  const { default: LeadEditProfileModal } = await loadEditProfileModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(LeadEditProfileModal, {
    modelValue: true,
    draft: {
      englishName: 'Jess Lead Mentor',
      genderLabel: 'Male',
      phone: '+86 138-0013-8000',
      wechatId: '',
      email: 'jess@osg.test',
      regionArea: '',
      regionCity: '',
    },
  })

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

async function mountProfilePage() {
  const ProfilePage = await loadProfilePage()
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

  await router.push('/profile/basic')
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

describe('lead-mentor edit profile modal contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorProfile.mockResolvedValue({
      profile: {
        staffId: 810,
        englishName: 'Jess Lead Mentor',
        genderLabel: 'Male',
        typeLabel: '班主任',
        email: 'jess@osg.test',
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
      pendingChanges: [],
      pendingCount: 0,
    })
    apiMocks.submitLeadMentorProfileChangeRequest.mockResolvedValue({
      profile: {
        staffId: 810,
        englishName: 'Jess Lead Mentor',
        genderLabel: 'Male',
        typeLabel: '班主任',
        email: 'jess@osg.test',
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
      pendingChanges: [],
      pendingCount: 0,
      staffId: 810,
      changeRequestId: 9201,
      changeRequestIds: [9201],
      createdCount: 1,
      requests: [],
    })
  })

  it('renders the edit profile modal shell with the declared surface markers and prototype copy', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-lead-edit-profile"]')
      const backdrop = root?.querySelector('[data-surface-part="backdrop"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')
      const closeControl = root?.querySelector('[data-surface-part="close-control"]')

      expect(root).toBeTruthy()
      expect(backdrop).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(closeControl).toBeTruthy()
      expect(root?.textContent).toContain('编辑个人信息')
      expect(root?.textContent).toContain('修改信息后，后台文员将收到提醒通知')
      expect(root?.textContent).toContain('主攻方向、二级方向和课单价不可自行修改')
      expect(root?.textContent).toContain('可修改信息')
      expect(root?.textContent).toContain('英文名')
      expect(root?.textContent).toContain('性别')
      expect(root?.textContent).toContain('手机号')
      expect(root?.textContent).toContain('微信号')
      expect(root?.textContent).toContain('邮箱')
      expect(root?.textContent).toContain('所属地区')
      expect(root?.textContent).toContain('取消')
      expect(root?.textContent).toContain('保存修改')
      expect(root?.querySelector('.mdi-account-edit')).toBeTruthy()
      expect(root?.querySelector('.mdi-information')).toBeTruthy()
      expect(root?.querySelector('.mdi-pencil')).toBeTruthy()
    } finally {
      modal.unmount()
    }
  })

  it('opens the edit profile modal from the profile page and closes it from the close control', async () => {
    const page = await mountProfilePage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-lead-edit-profile"]')).toBeNull()

      const trigger = page.container.querySelector<HTMLElement>('[data-surface-trigger="modal-lead-edit-profile"]')
      expect(trigger).toBeTruthy()

      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-lead-edit-profile"]')
      const closeButton = modal?.querySelector<HTMLButtonElement>('[data-surface-part="close-control"]')

      expect(modal).toBeTruthy()
      expect(modal?.textContent).toContain('编辑个人信息')

      closeButton?.click()
      await flushUi()

      expect(page.container.querySelector('[data-surface-id="modal-lead-edit-profile"]')).toBeNull()
    } finally {
      page.unmount()
    }
  })
})
