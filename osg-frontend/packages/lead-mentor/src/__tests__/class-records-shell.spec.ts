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
const pagePath = path.resolve(__dirname, '../views/teaching/class-records/index.vue')
const pageExists = fs.existsSync(pagePath)

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    nickName: 'Jess (Lead Mentor)',
    userName: 'leadmentor',
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

async function loadClassRecordsPage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountClassRecordsPage(initialPath = '/teaching/class-records') {
  const ClassRecordsPage = await loadClassRecordsPage()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'teaching/class-records', name: 'TeachingClassRecords', component: ClassRecordsPage },
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

describe('lead-mentor class records shell contract', () => {
  it('registers the /teaching/class-records route and restores the prototype source file', () => {
    expect(routerSource).toContain("path: 'teaching/class-records'")
    expect(routerSource).toContain("name: 'TeachingClassRecords'")
    expect(pageExists).toBe(true)
  })

  it('restores the class records shell with scope tabs, status tabs, filters, and action table', async () => {
    const page = await mountClassRecordsPage()

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/teaching/class-records')
      expect(page.container.querySelector('#page-myclass')).toBeTruthy()
      expect(page.container.textContent).toContain('课程记录')
      expect(page.container.textContent).toContain('Class Records')
      expect(page.container.textContent).toContain('查看和上报课程记录（包括我的申报和我管理的学员）')
      expect(page.container.textContent).toContain('上报课程记录')
      expect(page.container.querySelector('#lm-class-tab-mine')).toBeTruthy()
      expect(page.container.querySelector('#lm-class-tab-managed')).toBeTruthy()
      expect(page.container.textContent).toContain('我的申报')
      expect(page.container.textContent).toContain('我管理的学员')
      expect(page.container.textContent).toContain('全部')
      expect(page.container.textContent).toContain('待审核')
      expect(page.container.textContent).toContain('已通过')
      expect(page.container.textContent).toContain('已驳回')
      expect(page.container.querySelector<HTMLInputElement>('input.form-input')?.placeholder).toBe('搜索学员姓名/ID...')
      expect(page.container.textContent).toContain('重置')
      expect(page.container.textContent).toContain('查看详情')
      expect(page.container.textContent).toContain('查看原因')
      expect(page.container.querySelectorAll('.table')).toHaveLength(2)
    } finally {
      page.unmount()
    }
  })

  it('switches between mine and managed tabs while keeping the class records nav highlighted', async () => {
    const page = await mountClassRecordsPage()

    try {
      const mineButton = page.container.querySelector<HTMLButtonElement>('#lm-class-tab-mine')
      const managedButton = page.container.querySelector<HTMLButtonElement>('#lm-class-tab-managed')
      const minePanel = page.container.querySelector<HTMLElement>('#lm-class-content-mine')
      const managedPanel = page.container.querySelector<HTMLElement>('#lm-class-content-managed')
      const classRecordsNav = Array.from(page.container.querySelectorAll<HTMLElement>('.nav-item')).find((item) =>
        item.textContent?.includes('课程记录 Class Records'),
      )

      expect(mineButton).toBeTruthy()
      expect(managedButton).toBeTruthy()
      expect(minePanel?.style.display).not.toBe('none')
      expect(managedPanel?.style.display).toBe('none')
      expect(classRecordsNav?.classList.contains('active')).toBe(true)

      managedButton?.click()
      await flushUi()

      expect(minePanel?.style.display).toBe('none')
      expect(managedPanel?.style.display).toBe('block')
      expect(classRecordsNav?.classList.contains('active')).toBe(true)
    } finally {
      page.unmount()
    }
  })
})
