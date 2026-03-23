import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/LeadMentorClassDetailRegularModal.vue')
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

async function loadRegularModal() {
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
  const RegularModal = await loadRegularModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(RegularModal, {
    modelValue: true,
    preview: {
      title: '常规辅导反馈详情',
      studentName: '王五',
      studentId: '12901',
      courseLabel: 'Technical Training',
      classSchedule: '12/16/2025 15:00',
      duration: '2h',
      statusLabel: 'Great · 88分',
      sectionTitle: '常规辅导反馈',
      lessonLabel: '上课内容',
      lessonLines: [
        '讲解了DCF估值模型的基础原理',
        '练习了Excel建模，完成了一个简单的DCF模型',
        '复习了财务报表分析的关键指标',
        '介绍了可比公司分析方法',
      ],
      performanceLabel: '学生表现',
      performanceText:
        '学生学习态度认真，课堂参与度高。对财务概念理解较快，Excel操作熟练。但在WACC计算部分还需要加强理解。',
      nextPlanLabel: '下次课程计划',
      nextPlanLines: [
        '深入讲解WACC的计算方法',
        '完成一个完整的LBO模型练习',
        '布置课后作业：分析一家上市公司的财务报表',
      ],
      mentorName: 'Test Mentor',
      submittedAt: '12/16/2025 17:30',
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

describe('lead-mentor class detail regular modal contract', () => {
  it('renders the regular detail modal shell, summary and feedback copy from the prototype contract', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-class-detail-regular"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('常规辅导反馈详情')
      expect(root?.textContent).toContain('王五')
      expect(root?.textContent).toContain('12901')
      expect(root?.textContent).toContain('Technical Training')
      expect(root?.textContent).toContain('12/16/2025 15:00')
      expect(root?.textContent).toContain('2h')
      expect(root?.textContent).toContain('Great · 88分')
      expect(root?.textContent).toContain('常规辅导反馈')
      expect(root?.textContent).toContain('上课内容')
      expect(root?.textContent).toContain('讲解了DCF估值模型的基础原理')
      expect(root?.textContent).toContain('练习了Excel建模，完成了一个简单的DCF模型')
      expect(root?.textContent).toContain('复习了财务报表分析的关键指标')
      expect(root?.textContent).toContain('介绍了可比公司分析方法')
      expect(root?.textContent).toContain('学生表现')
      expect(root?.textContent).toContain('学生学习态度认真，课堂参与度高。')
      expect(root?.textContent).toContain('下次课程计划')
      expect(root?.textContent).toContain('深入讲解WACC的计算方法')
      expect(root?.textContent).toContain('完成一个完整的LBO模型练习')
      expect(root?.textContent).toContain('布置课后作业：分析一家上市公司的财务报表')
      expect(root?.textContent).toContain('导师:')
      expect(root?.textContent).toContain('Test Mentor')
      expect(root?.textContent).toContain('提交时间: 12/16/2025 17:30')
      expect(root?.textContent).toContain('关闭')
    } finally {
      modal.unmount()
    }
  })

  it('opens the regular detail modal from a matching class records action trigger', async () => {
    const page = await mountClassRecordsPage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-class-detail-regular"]')).toBeNull()

      const trigger = page.container.querySelector<HTMLButtonElement>('[data-surface-trigger="modal-class-detail-regular"]')
      expect(trigger).toBeTruthy()

      trigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-class-detail-regular"]')
      expect(modal).toBeTruthy()
      expect(modal?.querySelector('[data-surface-part="header"]')?.textContent).toContain('常规辅导反馈详情')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('上课内容')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('下次课程计划')
    } finally {
      page.unmount()
    }
  })
})
