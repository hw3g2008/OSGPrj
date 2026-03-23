import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/LeadMentorClassDetailResumeModal.vue')
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

async function loadResumeModal() {
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
  const ResumeModal = await loadResumeModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(ResumeModal, {
    modelValue: true,
    preview: {
      title: '简历修改反馈详情',
      studentName: '李四',
      studentId: '12890',
      courseLabel: 'Resume Review',
      classSchedule: '12/13/2025 10:00',
      duration: '1h',
      statusLabel: 'Great',
      sectionTitle: '简历修改反馈',
      changeLabel: '修改要点',
      changeLines: [
        '优化了工作经历描述，增加了量化数据',
        '调整了项目经验排版，突出关键成果',
        '精简了技能部分，删除不相关内容',
        '修改了个人简介，更加突出求职意向',
      ],
      completionLabel: '完成度评估',
      completionValue: '80% - 基本完成，需微调',
      suggestionLabel: '后续建议',
      suggestionLines: [
        '建议针对不同公司定制简历版本',
        '可以增加一些咨询相关的课外活动',
        '下次重点修改Cover Letter',
      ],
      mentorName: 'Test Mentor',
      submittedAt: '12/13/2025 11:30',
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

describe('lead-mentor class detail resume modal contract', () => {
  it('renders the resume detail modal shell, summary and feedback copy from the prototype contract', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-class-detail-resume"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('简历修改反馈详情')
      expect(root?.textContent).toContain('李四')
      expect(root?.textContent).toContain('12890')
      expect(root?.textContent).toContain('Resume Review')
      expect(root?.textContent).toContain('12/13/2025 10:00')
      expect(root?.textContent).toContain('1h')
      expect(root?.textContent).toContain('Great')
      expect(root?.textContent).toContain('简历修改反馈')
      expect(root?.textContent).toContain('修改要点')
      expect(root?.textContent).toContain('优化了工作经历描述，增加了量化数据')
      expect(root?.textContent).toContain('调整了项目经验排版，突出关键成果')
      expect(root?.textContent).toContain('精简了技能部分，删除不相关内容')
      expect(root?.textContent).toContain('修改了个人简介，更加突出求职意向')
      expect(root?.textContent).toContain('完成度评估')
      expect(root?.textContent).toContain('80% - 基本完成，需微调')
      expect(root?.textContent).toContain('后续建议')
      expect(root?.textContent).toContain('建议针对不同公司定制简历版本')
      expect(root?.textContent).toContain('可以增加一些咨询相关的课外活动')
      expect(root?.textContent).toContain('下次重点修改Cover Letter')
      expect(root?.textContent).toContain('导师:')
      expect(root?.textContent).toContain('Test Mentor')
      expect(root?.textContent).toContain('提交时间: 12/13/2025 11:30')
      expect(root?.textContent).toContain('关闭')
    } finally {
      modal.unmount()
    }
  })

  it('opens the resume detail modal from a matching class records action trigger', async () => {
    const page = await mountClassRecordsPage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-class-detail-resume"]')).toBeNull()

      const trigger = page.container.querySelector<HTMLButtonElement>('[data-surface-trigger="modal-class-detail-resume"]')
      expect(trigger).toBeTruthy()

      trigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-class-detail-resume"]')
      expect(modal).toBeTruthy()
      expect(modal?.querySelector('[data-surface-part="header"]')?.textContent).toContain('简历修改反馈详情')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('修改要点')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('后续建议')
    } finally {
      page.unmount()
    }
  })
})
