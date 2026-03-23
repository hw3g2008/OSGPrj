import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'
import PositionsPage from '../views/career/positions/index.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorPositionList: vi.fn(),
  getLeadMentorPositionMeta: vi.fn(),
  getLeadMentorPositionStudents: vi.fn(),
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

const baseRows = [
  {
    positionId: 101,
    positionCategory: 'summer',
    industry: 'Investment Bank',
    companyName: 'Goldman Sachs',
    companyWebsite: 'https://goldmansachs.com/careers',
    positionName: 'IB Analyst',
    city: 'Hong Kong',
    recruitmentCycle: '2025 Summer',
    projectYear: '2025',
    publishTime: '2026-03-18T08:00:00Z',
    deadline: '2026-03-31T08:00:00Z',
    myStudentCount: 2,
    studentCount: 2,
  },
  {
    positionId: 102,
    positionCategory: 'fulltime',
    industry: 'Consulting',
    companyName: 'McKinsey',
    companyWebsite: 'https://mckinsey.com/careers',
    positionName: 'Business Analyst',
    city: 'Shanghai',
    recruitmentCycle: '2025 Full Time',
    projectYear: '2025',
    publishTime: '2026-03-16T08:00:00Z',
    deadline: '2026-03-20T08:00:00Z',
    myStudentCount: 1,
    studentCount: 1,
  },
]

const metaFixture = {
  categories: [
    { value: 'summer', label: '暑期实习' },
    { value: 'fulltime', label: '全职招聘' },
  ],
  displayStatuses: [{ value: 'visible', label: 'visible' }],
  industries: [
    { value: 'Investment Bank', label: 'Investment Bank' },
    { value: 'Consulting', label: 'Consulting' },
  ],
  companyTypes: [],
  companies: [
    { value: 'Goldman Sachs', label: 'Goldman Sachs' },
    { value: 'McKinsey', label: 'McKinsey' },
  ],
  recruitmentCycles: [
    { value: '2025 Summer', label: '2025 Summer' },
    { value: '2025 Full Time', label: '2025 Full Time' },
  ],
  projectYears: [{ value: '2025', label: '2025' }],
  regions: [
    { value: 'Hong Kong', label: 'Hong Kong' },
    { value: 'Shanghai', label: 'Shanghai' },
  ],
  citiesByRegion: {
    'Hong Kong': [{ value: 'Hong Kong', label: 'Hong Kong' }],
    Shanghai: [{ value: 'Shanghai', label: 'Shanghai' }],
  },
  sortOptions: [{ value: 'publishTime:desc', label: '发布时间倒序' }],
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountStoryPage(initialPath = '/career/positions') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'career/positions', name: 'CareerPositions', component: PositionsPage },
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
    router,
    container,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

function findButtonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes(text),
  )
}

function getRenderedResultText(container: HTMLElement) {
  const drilldownText = Array.from(
    container.querySelectorAll<HTMLElement>('#lead-position-drilldown .category-content'),
  )
    .map((element) => element.textContent ?? '')
    .join(' ')
  const listText = Array.from(
    container.querySelectorAll<HTMLElement>('#lead-position-list tbody'),
  )
    .map((element) => element.textContent ?? '')
    .join(' ')
  const footerText = container.querySelector<HTMLElement>('.page-footer-stats')?.textContent ?? ''

  return `${drilldownText} ${listText} ${footerText}`
}

describe('S-041 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorPositionMeta.mockResolvedValue(metaFixture)
    apiMocks.getLeadMentorPositionList.mockImplementation(async (params: Record<string, string> = {}) => {
      if (params.industry === 'Consulting') {
        return { rows: baseRows.filter((row) => row.industry === 'Consulting') }
      }
      return { rows: baseRows }
    })
    apiMocks.getLeadMentorPositionStudents.mockImplementation(async (positionId: number) => {
      if (positionId === 102) {
        return [
          {
            applicationId: 5002,
            studentId: 3002,
            studentName: 'Casey',
            positionId: 102,
            positionName: 'Business Analyst',
            currentStage: '一面中',
            status: '一面中',
            statusTone: 'warning',
            usedHours: 8,
            statusRemark: '辅导中',
          },
        ]
      }

      return [
        {
          applicationId: 5004,
          studentId: 3004,
          studentName: 'Dylan',
          positionId: 101,
          positionName: 'IB Analyst',
          currentStage: '二面中',
          status: '二面中',
          statusTone: 'warning',
          usedHours: 10,
          statusRemark: '辅导中',
        },
      ]
    })
  })

  it('covers view switching, real filtering, and scoped modal detail in one story path', async () => {
    const page = await mountStoryPage()

    try {
      const listButton = findButtonByText(page.container, '列表视图')
      const drilldownButton = findButtonByText(page.container, '下钻视图')
      const industrySelect = page.container.querySelector<HTMLSelectElement>('select[aria-label="行业"]')

      listButton?.click()
      await flushUi()
      expect(page.container.querySelector<HTMLElement>('#lead-position-list')?.style.display).toBe('block')

      drilldownButton?.click()
      await flushUi()
      expect(page.router.currentRoute.value.fullPath).toBe('/career/positions')

      industrySelect!.value = 'Consulting'
      industrySelect!.dispatchEvent(new Event('change', { bubbles: true }))
      await flushUi()

      const renderedResultText = getRenderedResultText(page.container)
      expect(apiMocks.getLeadMentorPositionList).toHaveBeenLastCalledWith({ industry: 'Consulting' })
      expect(renderedResultText).toContain('McKinsey')
      expect(renderedResultText).not.toContain('Goldman Sachs')

      const studentTrigger = page.container.querySelector<HTMLButtonElement>('#lead-position-drilldown .student-link')
      studentTrigger?.click()
      await flushUi()

      expect(apiMocks.getLeadMentorPositionStudents).toHaveBeenCalledWith(102)
      expect(page.container.querySelector('[data-surface-id="modal-position-mystudents"]')?.textContent).toContain('Casey')
      expect(page.container.querySelector('[data-surface-id="modal-position-mystudents"]')?.textContent).toContain('一面中')
      expect(page.container.querySelector('[data-surface-id="modal-position-mystudents"]')?.textContent).toContain('8h')
    } finally {
      page.unmount()
    }
  })

  it('covers out-of-scope/error boundary without fabricating modal data', async () => {
    apiMocks.getLeadMentorPositionStudents.mockRejectedValueOnce(new Error('403 forbidden'))

    const page = await mountStoryPage()

    try {
      const studentTrigger = page.container.querySelector<HTMLButtonElement>('#lead-position-drilldown .student-link')
      studentTrigger?.click()
      await flushUi()

      expect(apiMocks.getLeadMentorPositionStudents).toHaveBeenCalledWith(101)
      expect(messageMocks.error).toHaveBeenCalled()
      expect(messageMocks.info).not.toHaveBeenCalled()
      expect(page.container.querySelector('[data-surface-id="modal-position-mystudents"]')).toBeNull()
      expect(page.container.textContent).not.toContain('Dylan')
    } finally {
      page.unmount()
    }
  })

  it('covers refresh consistency by remounting and reopening with fresh backend detail', async () => {
    const firstMount = await mountStoryPage()

    try {
      const firstTrigger = firstMount.container.querySelector<HTMLButtonElement>('#lead-position-drilldown .student-link')
      firstTrigger?.click()
      await flushUi()
      expect(firstMount.container.textContent).toContain('Dylan')
    } finally {
      firstMount.unmount()
    }

    apiMocks.getLeadMentorPositionList.mockResolvedValueOnce({
      rows: [
        {
          ...baseRows[1],
          myStudentCount: 2,
          studentCount: 2,
        },
      ],
    })
    apiMocks.getLeadMentorPositionStudents.mockResolvedValueOnce([
      {
        applicationId: 5006,
        studentId: 3006,
        studentName: 'Eve',
        positionId: 102,
        positionName: 'Business Analyst',
        currentStage: 'Offer',
        status: 'Offer',
        statusTone: 'success',
        usedHours: 12,
        statusRemark: '已结项',
      },
    ])

    const secondMount = await mountStoryPage()

    try {
      const renderedResultText = getRenderedResultText(secondMount.container)
      expect(renderedResultText).toContain('McKinsey')
      expect(renderedResultText).not.toContain('Goldman Sachs')
      expect(renderedResultText).toContain('我的学员 2人')

      const studentTrigger = secondMount.container.querySelector<HTMLButtonElement>('#lead-position-drilldown .student-link')
      studentTrigger?.click()
      await flushUi()

      const modalText = secondMount.container.querySelector('[data-surface-id="modal-position-mystudents"]')?.textContent ?? ''
      expect(modalText).toContain('Eve')
      expect(modalText).toContain('Offer')
      expect(modalText).toContain('12h')
      expect(modalText).not.toContain('Dylan')
    } finally {
      secondMount.unmount()
    }
  })
})
