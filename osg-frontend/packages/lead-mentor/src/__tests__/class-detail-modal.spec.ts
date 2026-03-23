import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/LeadMentorClassDetailModal.vue')
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

async function loadDetailModal() {
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
  const DetailModal = await loadDetailModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(DetailModal, {
    modelValue: true,
    preview: {
      title: '模拟面试反馈详情',
      studentName: '张三',
      studentId: '12766',
      courseLabel: 'Mock Interview',
      classSchedule: '12/14/2025 14:00',
      duration: '1.5h',
      scoreLabel: 'Great · 85分',
      sectionTitle: '模拟面试反馈',
      performanceLabel: '面试表现',
      performanceText:
        '学生在模拟面试中表现良好，回答问题逻辑清晰，表达流畅。对DCF和LBO基础知识掌握扎实，能够清晰解释估值方法。行为面试部分STAR法则运用得当。',
      overallLabel: '综合评分',
      overallValue: '4分 - 良好，稍加练习',
      interviewTypeLabel: '面试类型',
      interviewTypeValue: '技术面试',
      suggestionLabel: '改进建议',
      suggestionLines: [
        '需要加强对TMT行业的了解',
        '建议多准备一些高级LBO场景',
        '注意控制回答时间，避免过度解释简单概念',
      ],
      mentorName: 'Test Mentor',
      submittedAt: '12/14/2025 16:30',
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

describe('lead-mentor class detail modal contract', () => {
  it('renders the default modal shell, summary and feedback copy from the prototype contract', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-class-detail"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('模拟面试反馈详情')
      expect(root?.textContent).toContain('张三')
      expect(root?.textContent).toContain('12766')
      expect(root?.textContent).toContain('Mock Interview')
      expect(root?.textContent).toContain('12/14/2025 14:00')
      expect(root?.textContent).toContain('1.5h')
      expect(root?.textContent).toContain('Great · 85分')
      expect(root?.textContent).toContain('模拟面试反馈')
      expect(root?.textContent).toContain('面试表现')
      expect(root?.textContent).toContain(
        '学生在模拟面试中表现良好，回答问题逻辑清晰，表达流畅。对DCF和LBO基础知识掌握扎实，能够清晰解释估值方法。行为面试部分STAR法则运用得当。',
      )
      expect(root?.textContent).toContain('综合评分')
      expect(root?.textContent).toContain('4分 - 良好，稍加练习')
      expect(root?.textContent).toContain('面试类型')
      expect(root?.textContent).toContain('技术面试')
      expect(root?.textContent).toContain('改进建议')
      expect(root?.textContent).toContain('需要加强对TMT行业的了解')
      expect(root?.textContent).toContain('建议多准备一些高级LBO场景')
      expect(root?.textContent).toContain('注意控制回答时间，避免过度解释简单概念')
      expect(root?.textContent).toContain('导师:')
      expect(root?.textContent).toContain('Test Mentor')
      expect(root?.textContent).toContain('提交时间: 12/14/2025 16:30')
      expect(root?.textContent).toContain('关闭')
    } finally {
      modal.unmount()
    }
  })

  it('opens the class detail modal from a matching class records action trigger', async () => {
    const page = await mountClassRecordsPage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-class-detail"]')).toBeNull()

      const trigger = page.container.querySelector<HTMLButtonElement>('[data-surface-trigger="modal-class-detail"]')
      expect(trigger).toBeTruthy()

      trigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-class-detail"]')
      expect(modal).toBeTruthy()
      expect(modal?.querySelector('[data-surface-part="header"]')?.textContent).toContain('模拟面试反馈详情')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('面试表现')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('改进建议')
    } finally {
      page.unmount()
    }
  })
})
