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
const pagePath = path.resolve(__dirname, '../views/profile/schedule/index.vue')
const pageExists = fs.existsSync(pagePath)

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

async function loadSchedulePage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountSchedulePage(initialPath = '/profile/schedule') {
  const SchedulePage = await loadSchedulePage()
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
          { path: 'schedule', redirect: '/profile/schedule' },
          { path: 'profile/schedule', name: 'ProfileSchedule', component: SchedulePage },
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

describe('lead-mentor profile schedule shell contract', () => {
  it('registers the /profile/schedule route and keeps /schedule compatibility', () => {
    expect(routerSource).toContain("path: 'schedule'")
    expect(routerSource).toContain("redirect: '/profile/schedule'")
    expect(routerSource).toContain("path: 'profile/schedule'")
    expect(routerSource).toContain("name: 'ProfileSchedule'")
    expect(pageExists).toBe(true)
  })

  it('restores the schedule shell with banner, readonly current-week card, and editable next-week panel', async () => {
    const page = await mountSchedulePage()

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/profile/schedule')
      expect(page.container.querySelector('#page-schedule')).toBeTruthy()
      expect(page.container.querySelector('.page-header')).toBeTruthy()
      expect(page.container.querySelectorAll('.card').length).toBeGreaterThanOrEqual(3)
      expect(page.container.textContent).toContain('我的排期')
      expect(page.container.textContent).toContain('My Schedule')
      expect(page.container.textContent).toContain('设置您的可用时间，每周日前需更新下周排期')
      expect(page.container.textContent).toContain('请在周日前更新下周排期')
      expect(page.container.textContent).toContain('未填写排期将无法被安排课程，系统将发送邮件提醒')
      expect(page.container.textContent).toContain('本周排期')
      expect(page.container.textContent).toContain('已设置的可用时间')
      expect(page.container.textContent).toContain('当前登录班主任')
      expect(page.container.textContent).toContain('下周排期')
      expect(page.container.textContent).toContain('下周可上课时长')
      expect(page.container.textContent).toContain('每天可上课时间')
      expect(page.container.textContent).toContain('上午 9-12')
      expect(page.container.textContent).toContain('下午 14-18')
      expect(page.container.textContent).toContain('晚上 19-22')
      expect(page.container.textContent).toContain('保存下周排期')
      expect(page.container.textContent).toContain('重置')
      expect(page.container.textContent).not.toContain('Test Lead Mentor')
    } finally {
      page.unmount()
    }
  })

  it('treats /profile/schedule as a live route instead of the upcoming toast path', async () => {
    const page = await mountSchedulePage('/home')

    try {
      const scheduleNav = Array.from(page.container.querySelectorAll<HTMLAnchorElement>('.nav-item')).find((item) =>
        item.textContent?.includes('课程排期 Schedule'),
      )

      expect(scheduleNav).toBeTruthy()

      scheduleNav?.click()
      await flushUi()

      expect(page.router.currentRoute.value.fullPath).toBe('/profile/schedule')
      expect(page.container.querySelector('#page-schedule')).toBeTruthy()
    } finally {
      page.unmount()
    }
  })
})
