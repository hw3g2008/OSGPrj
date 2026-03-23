import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'
import ClassRecordsPage from '../views/teaching/class-records/index.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorStudentList: vi.fn(),
  createLeadMentorClassRecord: vi.fn(),
}))

const messageMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}))

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
  message: messageMocks,
}))

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountStory(initialPath = '/teaching/class-records') {
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
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

function fillValue(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('S-045 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorStudentList.mockResolvedValue({
      rows: [
        {
          studentId: 12903,
          studentName: '钱七',
          relations: [],
        },
      ],
    })
    apiMocks.createLeadMentorClassRecord.mockResolvedValue({
      recordId: 6051,
      mentorId: 810,
      mentorName: 'leadmentor',
      studentId: 12903,
      studentName: '钱七',
      courseType: 'job_coaching',
      courseSource: 'clerk',
      classStatus: 'case_prep',
      classDate: '2026-03-23T00:00:00+08:00',
      durationHours: 1,
      weeklyHours: 0,
      topics: 'McKinsey · Consultant · Shanghai',
      comments: '学员状态: 正常上课',
      feedbackContent: '根据驳回意见重新核实课时并补充案例反馈。',
      status: 'pending',
      submittedAt: '2026-03-23T11:50:00Z',
    })
  })

  it('keeps reject reason visible through resubmit and writes back the real created record', async () => {
    const page = await mountStory()

    try {
      const rejectTrigger = Array.from(page.container.querySelectorAll<HTMLButtonElement>('.btn-text')).find((button) =>
        button.textContent?.includes('查看原因'),
      )
      expect(rejectTrigger).toBeTruthy()

      rejectTrigger?.click()
      await flushUi()

      const rejectModal = page.container.querySelector('[data-surface-id="modal-class-reject"]')
      expect(rejectModal).toBeTruthy()
      expect(rejectModal?.textContent).toContain('驳回原因')
      expect(rejectModal?.textContent).toContain('课程时长与学员反馈不符')

      const resubmitButton = Array.from(rejectModal?.querySelectorAll<HTMLButtonElement>('button') ?? []).find((button) =>
        button.textContent?.includes('重新提交'),
      )
      expect(resubmitButton).toBeTruthy()

      resubmitButton?.click()
      await flushUi()

      const reportModal = page.container.querySelector('[data-surface-id="modal-lm-report"]')
      expect(reportModal).toBeTruthy()
      expect(apiMocks.getLeadMentorStudentList).toHaveBeenCalledTimes(1)
      expect(page.container.querySelector<HTMLSelectElement>('[data-report-field="student-id"]')?.value).toBe('12903')

      fillValue(page.container.querySelector('[data-report-field="class-date"]')!, '2026-03-23')
      fillValue(page.container.querySelector('[data-report-field="duration-hours"]')!, '1')
      fillValue(page.container.querySelector('[data-report-field="job-content"]')!, 'case_prep')
      fillValue(
        page.container.querySelector('[data-report-field="feedback-content"]')!,
        '根据驳回意见重新核实课时并补充案例反馈。',
      )

      const submitButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('.lm-report-footer .btn')).find(
        (button) => button.textContent?.includes('提交记录'),
      )
      expect(submitButton).toBeTruthy()

      submitButton?.click()
      await flushUi()

      expect(apiMocks.createLeadMentorClassRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 12903,
          classDate: '2026-03-23T00:00:00+08:00',
          classStatus: 'case_prep',
          courseType: 'job_coaching',
        }),
      )
      expect(messageMocks.success).toHaveBeenCalled()
      expect(page.container.querySelector('[data-surface-id="modal-lm-report"]')).toBeNull()
      expect(page.container.textContent).toContain('#R6051')
      expect(page.container.textContent).toContain('钱七')
      expect(page.container.textContent).toContain('待审核')
    } finally {
      page.unmount()
    }
  })
})
