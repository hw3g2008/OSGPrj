import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const modalPath = path.resolve(__dirname, '../components/LeadMockFeedbackModal.vue')
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
  const coachingRows = [
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
      mentorBackgrounds: 'Goldman Sachs IBD · 5年',
      completedHours: 2,
      completedHoursLabel: '2h',
      feedbackSummary: '表现稳定，框架清晰',
      feedbackRating: 4,
      submittedAt: '2026-03-20T09:00:00Z',
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
        return { rows: coachingRows }
      }
      return { rows: [...pendingRows, coachingRows[0]] }
    }),
    getLeadMentorMockPracticeDetail: vi.fn().mockResolvedValue({
      ...coachingRows[1],
      note: '结合导师反馈继续补充高频题训练',
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

async function loadMockFeedbackModal() {
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
  const { default: LeadMockFeedbackModal } = await loadMockFeedbackModal()

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(LeadMockFeedbackModal, {
    modelValue: true,
    preview: {
      studentName: '赵六',
      practiceType: '模拟面试',
      companyName: 'Goldman Sachs IB',
      sessionTime: '2025-01-15 14:00',
      mentorName: 'Jerry Li',
      status: '已完成',
      score: 4,
      scoreLabel: '良好',
      actualDuration: '1小时',
      feedback:
        '学员在Behavioral Questions方面表现良好，能够清晰地描述过往经历。Technical Questions部分对估值方法有较好的理解，但在DCF模型的细节上还需要加强。整体沟通能力不错，建议多练习Case Study。',
      suggestions: [
        '加强DCF模型的练习，特别是WACC计算',
        '准备更多关于行业趋势的观点',
        '练习用更简洁的语言回答问题',
      ],
      recommendation: '导师推荐学员进入下一阶段',
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

describe('lead-mentor mock feedback modal contract', () => {
  it('renders the mock feedback modal shell with the declared surface markers and prototype copy', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-lead-mock-feedback"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')

      expect(root).toBeTruthy()
      expect(shell).toBeTruthy()
      expect(header).toBeTruthy()
      expect(body).toBeTruthy()
      expect(root?.textContent).toContain('查看模拟反馈')
      expect(root?.textContent).toContain('赵六')
      expect(root?.textContent).toContain('模拟面试')
      expect(root?.textContent).toContain('Goldman Sachs IB')
      expect(root?.textContent).toContain('Jerry Li')
      expect(root?.textContent).toContain('已完成')
      expect(root?.textContent).toContain('4')
      expect(root?.textContent).toContain('良好')
      expect(root?.textContent).toContain('1小时')
      expect(root?.textContent).toContain('详细反馈')
      expect(root?.textContent).toContain('改进建议')
      expect(root?.textContent).toContain('导师推荐学员进入下一阶段')
      expect(root?.textContent).toContain('关闭')
      expect(root?.querySelector('.mdi-comment-check')).toBeTruthy()
      expect(root?.querySelector('.mdi-comment-text')).toBeTruthy()
      expect(root?.querySelector('.mdi-lightbulb')).toBeTruthy()
      expect(root?.querySelector('.mdi-check-circle')).toBeTruthy()
    } finally {
      modal.unmount()
    }
  })

  it('opens the mock feedback modal from the mock practice page and closes it again', async () => {
    const page = await mountMockPracticePage()

    try {
      expect(page.container.querySelector('[data-surface-id="modal-lead-mock-feedback"]')).toBeNull()

      const trigger = page.container.querySelector<HTMLElement>('[data-surface-trigger="modal-lead-mock-feedback"]')
      expect(trigger).toBeTruthy()

      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-lead-mock-feedback"]')
      const closeButton = modal?.querySelector<HTMLButtonElement>('.modal-close')

      expect(modal).toBeTruthy()
      expect(modal?.textContent).toContain('查看模拟反馈')

      closeButton?.click()
      await flushUi()

      expect(page.container.querySelector('[data-surface-id="modal-lead-mock-feedback"]')).toBeNull()
    } finally {
      page.unmount()
    }
  })
})
