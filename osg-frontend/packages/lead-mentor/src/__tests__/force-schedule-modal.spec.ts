import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/LeadForceScheduleModal.vue')
const modalExists = fs.existsSync(modalPath)
const pagePath = path.resolve(__dirname, '../views/profile/schedule/index.vue')
const pageExists = fs.existsSync(pagePath)

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    userId: 101,
    userName: 'student_demo',
    nickName: 'Jess Lead Mentor',
    email: 'jess@osg.test',
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

async function loadForceScheduleModal() {
  expect(modalExists).toBe(true)
  const moduleUrl = pathToFileURL(modalPath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function loadSchedulePage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountModal() {
  const ForceScheduleModal = await loadForceScheduleModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(ForceScheduleModal, {
    modelValue: true,
    weekRange: '03/30 - 04/05 (下周)',
    days: [
      { key: 'next-1', label: '周一', date: '03/30', accent: 'weekday' },
      { key: 'next-2', label: '周二', date: '03/31', accent: 'weekday' },
      { key: 'next-3', label: '周三', date: '04/01', accent: 'holiday' },
      { key: 'next-4', label: '周四', date: '04/02', accent: 'weekday' },
      { key: 'next-5', label: '周五', date: '04/03', accent: 'weekday' },
      { key: 'next-6', label: '周六', date: '04/04', accent: 'weekend' },
      { key: 'next-7', label: '周日', date: '04/05', accent: 'weekend' },
    ],
    draft: {
      weeklyHours: '10',
      dailySlots: {
        'next-1': 'morning',
        'next-2': 'afternoon',
        'next-3': '',
        'next-4': 'evening',
        'next-5': '',
        'next-6': 'morning',
        'next-7': '',
      },
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

async function mountSchedulePage(initialPath = '/profile/schedule?forceScheduleModal=1') {
  const SchedulePage = await loadSchedulePage()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
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

describe('lead-mentor force schedule modal contract', () => {
  it('renders the force schedule modal shell with the declared surface markers and prototype copy', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-lead-force-schedule"]')
      const backdrop = root?.querySelector('[data-surface-part="backdrop"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(backdrop).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('强制填写排期')
      expect(root?.textContent).toContain('当前尚未提交下周排期，请立即补全可用时间')
      expect(root?.textContent).toContain('下周可上课时长')
      expect(root?.textContent).toContain('每天可上课时间')
      expect(root?.textContent).toContain('03/30 - 04/05 (下周)')
      expect(root?.textContent).toContain('周一')
      expect(root?.textContent).toContain('周日')
      expect(root?.textContent).toContain('确认提交排期')
      expect(root?.querySelector('.mdi-calendar-alert')).toBeTruthy()
      expect(root?.querySelector('.mdi-alert')).toBeTruthy()
      expect(root?.querySelector('.mdi-clock-outline')).toBeTruthy()
      expect(root?.querySelector('.mdi-check')).toBeTruthy()
    } finally {
      modal.unmount()
    }
  })

  it('auto-opens the force schedule modal from the schedule page when the route param is present', async () => {
    const page = await mountSchedulePage()

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/profile/schedule?forceScheduleModal=1')

      const modal = page.container.querySelector('[data-surface-id="modal-lead-force-schedule"]')
      expect(modal).toBeTruthy()
      expect(modal?.querySelector('[data-surface-part="header"]')?.textContent).toContain('强制填写排期')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('每天可上课时间')
      expect(modal?.textContent).toContain('确认提交排期')
    } finally {
      page.unmount()
    }
  })
})
