import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/AssignMockModal.vue')
const modalExists = fs.existsSync(modalPath)
const pagePath = path.resolve(__dirname, '../views/career/mock-practice/index.vue')
const pageExists = fs.existsSync(pagePath)

const apiMocks = vi.hoisted(() => {
  const pendingRows = [
    {
      practiceId: 9001,
      studentId: 3001,
      studentName: 'Alice',
      practiceType: '模拟面试',
      requestContent: 'Goldman Sachs IB 二面',
      requestedMentorCount: 2,
      preferredMentorNames: 'Jerry Li, Mike Chen',
      status: 'pending',
      statusLabel: '待分配',
      submittedAt: '2026-03-21T10:00:00Z',
    },
  ]

  return {
    getLeadMentorMockPracticeStats: vi.fn().mockResolvedValue({
      pendingCount: 1,
      scheduledCount: 1,
      completedCount: 1,
      cancelledCount: 0,
      totalCount: 3,
    }),
    getLeadMentorMockPracticeList: vi.fn().mockImplementation(async ({ scope }: { scope: string }) => {
      if (scope === 'pending') {
        return { rows: pendingRows }
      }
      if (scope === 'coaching') {
        return {
          rows: [
            {
              practiceId: 9002,
              studentId: 3002,
              studentName: 'Bob',
              practiceType: '人际关系测试',
              requestContent: 'Leadership Test',
              status: 'scheduled',
              statusLabel: '新分配',
              mentorIds: [810, 9201],
              mentorNames: 'Jess, Amy',
              mentorBackgrounds: 'Lead Mentor / Morgan Stanley',
              submittedAt: '2026-03-22T11:00:00Z',
              isNewAssignment: true,
            },
            {
              practiceId: 9003,
              studentId: 3003,
              studentName: 'Cindy',
              practiceType: '期中考试',
              requestContent: 'Midterm Review',
              status: 'completed',
              statusLabel: '已完成',
              mentorNames: 'Jerry Li',
              completedHours: 2,
              completedHoursLabel: '2h',
              feedbackSummary: '表现稳定，框架清晰',
              feedbackRating: 4,
              submittedAt: '2026-03-20T09:00:00Z',
            },
          ],
        }
      }
      return { rows: pendingRows }
    }),
    getLeadMentorMockPracticeDetail: vi.fn().mockResolvedValue({
      ...pendingRows[0],
      mentorOptions: [
        {
          mentorId: 9201,
          mentorName: 'Jerry Li',
          mentorBackground: 'Goldman Sachs IBD · 5年',
          availabilityLabel: '周二 AM, 周四 PM',
          selected: true,
        },
        {
          mentorId: 9202,
          mentorName: 'Mike Chen',
          mentorBackground: 'McKinsey · 4年',
          availabilityLabel: '周三 PM',
          selected: false,
        },
      ],
    }),
    assignLeadMentorMockPractice: vi.fn(),
    acknowledgeLeadMentorMockPractice: vi.fn(),
  }
})

vi.mock('@osg/shared/api', () => apiMocks)

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

async function loadAssignMockModal() {
  expect(modalExists).toBe(true)
  const moduleUrl = pathToFileURL(modalPath).href
  return (await import(/* @vite-ignore */ moduleUrl))
}

async function loadMockPracticePage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountModal() {
  const { default: AssignMockModal } = await loadAssignMockModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(AssignMockModal, {
    modelValue: true,
    preview: {
      studentName: '张三',
      practiceType: '模拟面试',
      companyName: 'Goldman Sachs IB 二面',
      mentorDemand: '期望2位导师',
      mentorOptions: [
        { code: 'JL', name: 'Jerry Li', meta: 'Goldman Sachs IBD · 5年', avatarColor: 'var(--primary)', selected: true },
        { code: 'TL', name: 'Test Lead', meta: 'Morgan Stanley · 3年', avatarColor: '#7C3AED', selected: false },
        { code: 'MC', name: 'Mike Chen', meta: 'McKinsey · 4年', avatarColor: '#059669', selected: false },
      ],
      scheduledAt: '',
      note: '',
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

async function mountMockPracticePage() {
  const MockPracticePage = await loadMockPracticePage()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'career/mock-practice', name: 'CareerMockPractice', component: MockPracticePage },
        ],
      },
    ],
  })

  await router.push('/career/mock-practice')
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

describe('lead-mentor assign mock modal contract', () => {
  it('renders the assign mock modal shell with the declared surface markers and prototype copy', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-assign-mock"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('处理模拟应聘申请')
      expect(root?.textContent).toContain('张三')
      expect(root?.textContent).toContain('模拟面试')
      expect(root?.textContent).toContain('Goldman Sachs IB 二面')
      expect(root?.textContent).toContain('期望2位导师')
      expect(root?.textContent).toContain('分配导师')
      expect(root?.textContent).toContain('Jerry Li')
      expect(root?.textContent).toContain('Test Lead')
      expect(root?.textContent).toContain('Mike Chen')
      expect(root?.textContent).toContain('预约时间')
      expect(root?.textContent).toContain('备注说明')
      expect(root?.textContent).toContain('取消')
      expect(root?.textContent).toContain('确认安排')
      expect(root?.querySelector('.mdi-clipboard-check')).toBeTruthy()
    } finally {
      modal.unmount()
    }
  })

  it('opens the assign mock modal from the mock practice page and closes it again', async () => {
    const page = await mountMockPracticePage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-assign-mock"]')).toBeNull()

      const trigger = page.container.querySelector<HTMLElement>('[data-surface-trigger="modal-assign-mock"]')
      expect(trigger).toBeTruthy()

      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-assign-mock"]')
      const closeButton = modal?.querySelector<HTMLButtonElement>('.modal-close')

      expect(modal).toBeTruthy()
      expect(modal?.textContent).toContain('处理模拟应聘申请')

      closeButton?.click()
      await flushUi()

      expect(page.container.querySelector('[data-surface-id="modal-assign-mock"]')).toBeNull()
    } finally {
      page.unmount()
    }
  })
})
