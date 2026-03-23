import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/LeadMentorClassRejectModal.vue')
const modalExists = fs.existsSync(modalPath)
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

async function loadRejectModal() {
  expect(modalExists).toBe(true)
  const moduleUrl = pathToFileURL(modalPath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function loadClassRecordsPage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountModal() {
  const RejectModal = await loadRejectModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(RejectModal, {
    modelValue: true,
    preview: {
      title: '课程审核驳回',
      studentName: '钱七',
      studentId: '12903',
      courseTypeLabel: '课程类型',
      courseTypeValue: 'Case Study',
      classTimeLabel: '上课时间',
      classTimeValue: '12/10/2025 14:00',
      submittedDurationLabel: '提交时长',
      submittedDurationValue: '1.5h',
      reasonTitle: '驳回原因',
      reasonText: '课程时长与学员反馈不符，学员反馈实际上课时间为1小时。请核实后重新提交。',
      reviewerName: '课时审核员 Admin',
      rejectedAt: '12/11/2025 10:30',
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

async function mountClassRecordsPage() {
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

  await router.push('/teaching/class-records')
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

describe('lead-mentor class reject modal contract', () => {
  it('renders the reject modal shell, warning copy and footer actions from the prototype contract', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-class-reject"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('课程审核驳回')
      expect(root?.textContent).toContain('钱七')
      expect(root?.textContent).toContain('12903')
      expect(root?.textContent).toContain('Case Study')
      expect(root?.textContent).toContain('12/10/2025 14:00')
      expect(root?.textContent).toContain('1.5h')
      expect(root?.textContent).toContain('驳回原因')
      expect(root?.textContent).toContain('课程时长与学员反馈不符，学员反馈实际上课时间为1小时。请核实后重新提交。')
      expect(root?.textContent).toContain('审核人：课时审核员 Admin')
      expect(root?.textContent).toContain('驳回时间：12/11/2025 10:30')
      expect(root?.textContent).toContain('关闭')
      expect(root?.textContent).toContain('重新提交')
    } finally {
      modal.unmount()
    }
  })

  it('opens the reject modal from a matching class records action trigger', async () => {
    const page = await mountClassRecordsPage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-class-reject"]')).toBeNull()

      const trigger = page.container.querySelector<HTMLButtonElement>('[data-surface-trigger="modal-class-reject"]')
      expect(trigger).toBeTruthy()

      trigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-class-reject"]')
      expect(modal).toBeTruthy()
      expect(modal?.querySelector('[data-surface-part="header"]')?.textContent).toContain('课程审核驳回')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('驳回原因')
      expect(modal?.textContent).toContain('重新提交')
    } finally {
      page.unmount()
    }
  })
})
