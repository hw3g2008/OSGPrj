import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8',
)
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

async function loadProfilePage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountProfilePage(initialPath = '/profile/basic') {
  const ProfilePage = await loadProfilePage()
  const HomeStub = {
    template: '<div id="page-home-stub">home</div>',
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'home', name: 'Home', component: HomeStub },
          { path: 'profile', redirect: '/profile/basic' },
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
    router,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

describe('lead-mentor profile basic shell contract', () => {
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

  it('registers the /profile/basic route and keeps /profile compatibility', () => {
    expect(routerSource).toContain("path: 'profile/basic'")
    expect(routerSource).toContain("name: 'ProfileBasic'")
    expect(routerSource).toContain("path: 'profile'")
    expect(routerSource).toContain("redirect: '/profile/basic'")
    expect(pageExists).toBe(true)
  })

  it('restores the profile basic shell with the prototype header, cards, and edit affordance', async () => {
    const page = await mountProfilePage()

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/profile/basic')
      expect(page.container.querySelector('#page-profile')).toBeTruthy()
      expect(page.container.querySelector('.page-header')).toBeTruthy()
      expect(page.container.querySelectorAll('.card')).toHaveLength(4)
      expect(page.container.textContent).toContain('基本信息')
      expect(page.container.textContent).toContain('Profile')
      expect(page.container.textContent).toContain('查看和管理您的个人信息')
      expect(page.container.textContent).toContain('编辑信息')
      expect(page.container.querySelector('[data-surface-trigger="modal-lead-edit-profile"]')).toBeTruthy()
      expect(page.container.textContent).toContain('核心信息')
      expect(page.container.textContent).toContain('联系方式')
      expect(page.container.textContent).toContain('专业方向')
      expect(page.container.textContent).toContain('课程信息')
      expect(page.container.textContent).toContain('英文名')
      expect(page.container.textContent).toContain('性别')
      expect(page.container.textContent).toContain('类型')
      expect(page.container.textContent).toContain('邮箱')
      expect(page.container.textContent).toContain('手机号')
      expect(page.container.textContent).toContain('微信号')
      expect(page.container.textContent).toContain('所属地区')
      expect(page.container.textContent).toContain('主攻方向')
      expect(page.container.textContent).toContain('二级方向')
      expect(page.container.textContent).toContain('可授课程类型')
      expect(page.container.textContent).toContain('课单价')
      expect(page.container.textContent).toContain('如需修改请联系后台文员')
      expect(page.container.textContent).toContain('Jess Lead Mentor')
    } finally {
      page.unmount()
    }
  })

  it('keeps the profile navigation highlighted and avoids prototype demo values', async () => {
    const page = await mountProfilePage('/profile')

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/profile/basic')

      const profileNav = Array.from(page.container.querySelectorAll<HTMLElement>('.nav-item')).find((item) =>
        item.textContent?.includes('基本信息 Profile'),
      )

      expect(profileNav).toBeTruthy()
      expect(profileNav?.classList.contains('active')).toBe(true)
      expect(page.container.textContent).not.toContain('lead@example.com')
      expect(page.container.textContent).not.toContain('test_lead_mentor')
      expect(page.container.textContent).toContain('¥500/h')
    } finally {
      page.unmount()
    }
  })

  it('treats /profile/basic as a live route instead of the upcoming toast path', async () => {
    const page = await mountProfilePage('/home')

    try {
      const profileNav = Array.from(page.container.querySelectorAll<HTMLAnchorElement>('.nav-item')).find((item) =>
        item.textContent?.includes('基本信息 Profile'),
      )

      expect(profileNav).toBeTruthy()

      profileNav?.click()
      await flushUi()

      expect(page.router.currentRoute.value.fullPath).toBe('/profile/basic')
      expect(page.container.querySelector('#page-profile')).toBeTruthy()
    } finally {
      page.unmount()
    }
  })
})
