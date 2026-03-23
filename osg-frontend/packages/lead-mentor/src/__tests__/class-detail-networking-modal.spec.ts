import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/LeadMentorClassDetailNetworkingModal.vue')
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

async function loadNetworkingModal() {
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
  const NetworkingModal = await loadNetworkingModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(NetworkingModal, {
    modelValue: true,
    preview: {
      title: '人脉拓展反馈详情',
      studentName: '赵六',
      studentId: '12902',
      courseLabel: 'Networking',
      classSchedule: '12/12/2025 16:00',
      duration: '1h',
      statusLabel: 'Great',
      sectionTitle: '人脉拓展反馈',
      progressLabel: '拓展情况',
      progressText:
        '本次帮助学生联系了高盛IBD部门的VP，进行了30分钟的Coffee Chat。讨论了IBD的日常工作、招聘流程和面试准备建议。VP对学生印象良好，表示可以帮忙内推。',
      contactNameLabel: '联系人姓名',
      contactNameValue: '张经理',
      contactRoleLabel: '联系人公司/职位',
      contactRoleValue: '高盛 / VP',
      followUpLabel: '后续跟进计划',
      followUpLines: [
        '一周后发送感谢邮件',
        '准备内推申请材料',
        '持续关注高盛招聘动态',
      ],
      mentorName: 'Test Mentor',
      submittedAt: '12/12/2025 17:30',
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

describe('lead-mentor class detail networking modal contract', () => {
  it('renders the networking detail modal shell, summary and feedback copy from the prototype contract', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-class-detail-networking"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('人脉拓展反馈详情')
      expect(root?.textContent).toContain('赵六')
      expect(root?.textContent).toContain('12902')
      expect(root?.textContent).toContain('Networking')
      expect(root?.textContent).toContain('12/12/2025 16:00')
      expect(root?.textContent).toContain('1h')
      expect(root?.textContent).toContain('Great')
      expect(root?.textContent).toContain('人脉拓展反馈')
      expect(root?.textContent).toContain('拓展情况')
      expect(root?.textContent).toContain('本次帮助学生联系了高盛IBD部门的VP')
      expect(root?.textContent).toContain('Coffee Chat')
      expect(root?.textContent).toContain('联系人姓名')
      expect(root?.textContent).toContain('张经理')
      expect(root?.textContent).toContain('联系人公司/职位')
      expect(root?.textContent).toContain('高盛 / VP')
      expect(root?.textContent).toContain('后续跟进计划')
      expect(root?.textContent).toContain('一周后发送感谢邮件')
      expect(root?.textContent).toContain('准备内推申请材料')
      expect(root?.textContent).toContain('持续关注高盛招聘动态')
      expect(root?.textContent).toContain('导师:')
      expect(root?.textContent).toContain('Test Mentor')
      expect(root?.textContent).toContain('提交时间: 12/12/2025 17:30')
      expect(root?.textContent).toContain('关闭')
    } finally {
      modal.unmount()
    }
  })

  it('opens the networking detail modal from a matching class records action trigger', async () => {
    const page = await mountClassRecordsPage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-class-detail-networking"]')).toBeNull()

      const trigger = page.container.querySelector<HTMLButtonElement>('[data-surface-trigger="modal-class-detail-networking"]')
      expect(trigger).toBeTruthy()

      trigger?.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-class-detail-networking"]')
      expect(modal).toBeTruthy()
      expect(modal?.querySelector('[data-surface-part="header"]')?.textContent).toContain('人脉拓展反馈详情')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('拓展情况')
      expect(modal?.querySelector('[data-surface-part="body"]')?.textContent).toContain('后续跟进计划')
    } finally {
      page.unmount()
    }
  })
})
