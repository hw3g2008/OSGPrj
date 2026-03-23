import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/LeadMentorClassReportModal.vue')
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

async function loadReportModal() {
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
  const ReportModal = await loadReportModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(ReportModal, {
    modelValue: true,
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

describe('lead-mentor report modal contract', () => {
  it('renders the modal shell with the declared surface parts and prototype form copy', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-lm-report"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('上报课程记录')
      expect(root?.textContent).toContain('请在上课后填写课程记录和反馈，提交后需等待后台审核')
      expect(root?.textContent).toContain('选择学员')
      expect(root?.textContent).toContain('上课日期和时长')
      expect(root?.textContent).toContain('上课日期')
      expect(root?.textContent).toContain('学习时长')
      expect(root?.textContent).toContain('学员状态')
      expect(root?.textContent).toContain('正常上课')
      expect(root?.textContent).toContain('旷课未到场')
      expect(root?.textContent).toContain('旷课备注')
      expect(root?.textContent).toContain('课程类型')
      expect(root?.textContent).toContain('岗位辅导')
      expect(root?.textContent).toContain('模拟面试')
      expect(root?.textContent).toContain('人际关系')
      expect(root?.textContent).toContain('模拟期中')
      expect(root?.textContent).toContain('基础课程')
      expect(root?.textContent).toContain('选择申请辅导的岗位')
      expect(root?.textContent).toContain('课程内容类型')
      expect(root?.textContent).toContain('基础课内容类型')
      expect(root?.textContent).toContain('课程反馈')
      expect(root?.textContent).toContain('上传原简历')
      expect(root?.textContent).toContain('上传修改后简历')
      expect(root?.textContent).toContain('模拟面试的目的是什么？')
      expect(root?.textContent).toContain('你们在这次课程中主要研究了哪些概念和主题？')
      expect(root?.textContent).toContain('这名学生哪科考的不好？')
      expect(root?.textContent).toContain('您如何评价这名学生的表现？')
      expect(root?.textContent).toContain('取消')
      expect(root?.textContent).toContain('提交记录')
      expect(root?.querySelector('.mdi-clipboard-text')).toBeTruthy()
      expect(root?.querySelector('.mdi-information')).toBeTruthy()
      expect(root?.querySelector('.mdi-format-list-bulleted')).toBeTruthy()
    } finally {
      modal.unmount()
    }
  })

  it('opens the report modal from the class records page trigger', async () => {
    const page = await mountClassRecordsPage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-lm-report"]')).toBeNull()

      const trigger = page.container.querySelector<HTMLButtonElement>('[data-surface-trigger="modal-lm-report"]')
      expect(trigger).toBeTruthy()

      trigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-lm-report"]')
      expect(modal).toBeTruthy()
      expect(modal?.querySelector('[data-surface-part="header"]')?.textContent).toContain('上报课程记录')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('选择学员')
    } finally {
      page.unmount()
    }
  })
})
