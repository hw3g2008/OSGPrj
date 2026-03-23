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

async function mountClassRecordsPage(initialPath = '/teaching/class-records') {
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

describe('lead-mentor class records real create flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorStudentList.mockResolvedValue({
      rows: [
        {
          studentId: 12766,
          studentName: '张三',
          relations: [],
        },
        {
          studentId: 12890,
          studentName: '李四',
          relations: [],
        },
      ],
    })
    apiMocks.createLeadMentorClassRecord.mockResolvedValue({
      recordId: 5047,
      mentorId: 810,
      mentorName: 'leadmentor',
      studentId: 12766,
      studentName: '张三',
      courseType: 'job_coaching',
      courseSource: 'clerk',
      classStatus: 'case_prep',
      classDate: '2026-03-23T00:00:00+08:00',
      durationHours: 1.5,
      weeklyHours: 0,
      topics: 'Goldman Sachs · IB Analyst · Hong Kong',
      comments: '学员状态: 正常上课',
      feedbackContent: '围绕 GS case 做拆解并复盘框架。',
      status: 'pending',
      submittedAt: '2026-03-23T11:00:00Z',
    })
  })

  it('loads managed students from the real lead-mentor API when opening the report modal', async () => {
    const page = await mountClassRecordsPage()

    try {
      const trigger = page.container.querySelector<HTMLButtonElement>('[data-surface-trigger="modal-lm-report"]')
      expect(trigger).toBeTruthy()

      trigger?.click()
      await flushUi()

      expect(apiMocks.getLeadMentorStudentList).toHaveBeenCalledTimes(1)

      const studentSelect = page.container.querySelector<HTMLSelectElement>('[data-report-field="student-id"]')
      expect(studentSelect).toBeTruthy()
      const optionTexts = Array.from(studentSelect?.options ?? []).map((option) => option.textContent?.trim())
      expect(optionTexts).toContain('张三 (12766)')
      expect(optionTexts).toContain('李四 (12890)')
      expect(optionTexts).not.toContain('王五 (12901) - Tech SWE')
    } finally {
      page.unmount()
    }
  })

  it('submits class-record-create to the real API and prepends the returned record into mine and managed scopes', async () => {
    const page = await mountClassRecordsPage()

    try {
      page.container
        .querySelector<HTMLButtonElement>('[data-surface-trigger="modal-lm-report"]')
        ?.click()
      await flushUi()

      fillValue(page.container.querySelector('[data-report-field="student-id"]')!, '12766')
      fillValue(page.container.querySelector('[data-report-field="class-date"]')!, '2026-03-23')
      fillValue(page.container.querySelector('[data-report-field="duration-hours"]')!, '1.5')

      const jobCoachingRadio = page.container.querySelector<HTMLInputElement>('input[value="job-coaching"]')
      expect(jobCoachingRadio).toBeTruthy()
      jobCoachingRadio!.checked = true
      jobCoachingRadio!.dispatchEvent(new Event('change', { bubbles: true }))
      await flushUi()

      fillValue(page.container.querySelector('[data-report-field="job-content"]')!, 'case_prep')
      fillValue(
        page.container.querySelector('[data-report-field="feedback-content"]')!,
        '围绕 GS case 做拆解并复盘框架。',
      )

      const submitButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('.lm-report-footer .btn')).find(
        (button) => button.textContent?.includes('提交记录'),
      )
      expect(submitButton).toBeTruthy()

      submitButton?.click()
      await flushUi()

      expect(apiMocks.createLeadMentorClassRecord).toHaveBeenCalledWith({
        studentId: 12766,
        classDate: '2026-03-23T00:00:00+08:00',
        durationHours: 1.5,
        courseType: 'job_coaching',
        classStatus: 'case_prep',
        feedbackContent: '围绕 GS case 做拆解并复盘框架。',
        topics: 'Goldman Sachs · IB Analyst · Hong Kong',
        comments: '学员状态: 正常上课',
      })
      expect(messageMocks.success).toHaveBeenCalled()
      expect(page.container.textContent).toContain('#R5047')
      expect(page.container.textContent).toContain('张三')
      expect(page.container.textContent).toContain('Case准备')
      expect(page.container.textContent).toContain('待审核')

      const managedTab = page.container.querySelector<HTMLButtonElement>('#lm-class-tab-managed')
      expect(managedTab).toBeTruthy()
      managedTab?.click()
      await flushUi()

      expect(page.container.textContent).toContain('leadmentor')
      expect(page.container.textContent).toContain('#R5047')
    } finally {
      page.unmount()
    }
  })

  it('keeps the modal open and does not inject a fake success row when the real API rejects', async () => {
    apiMocks.createLeadMentorClassRecord.mockRejectedValueOnce(new Error('无权为该学员上报课程记录'))

    const page = await mountClassRecordsPage()

    try {
      page.container
        .querySelector<HTMLButtonElement>('[data-surface-trigger="modal-lm-report"]')
        ?.click()
      await flushUi()

      fillValue(page.container.querySelector('[data-report-field="student-id"]')!, '12766')
      fillValue(page.container.querySelector('[data-report-field="class-date"]')!, '2026-03-23')
      fillValue(page.container.querySelector('[data-report-field="duration-hours"]')!, '1')
      fillValue(page.container.querySelector('[data-report-field="job-content"]')!, 'case_prep')
      fillValue(page.container.querySelector('[data-report-field="feedback-content"]')!, '越权提交应被拒绝。')

      const submitButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('.lm-report-footer .btn')).find(
        (button) => button.textContent?.includes('提交记录'),
      )
      expect(submitButton).toBeTruthy()

      submitButton?.click()
      await flushUi()

      expect(messageMocks.error).toHaveBeenCalledWith('无权为该学员上报课程记录')
      expect(page.container.querySelector('[data-surface-id="modal-lm-report"]')).toBeTruthy()
      expect(page.container.textContent).not.toContain('#R5047')
      expect(messageMocks.success).not.toHaveBeenCalled()
    } finally {
      page.unmount()
    }
  })
})
