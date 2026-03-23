import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'
import PositionMyStudentsModal from '../components/PositionMyStudentsModal.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorPositionList: vi.fn(),
  getLeadMentorPositionMeta: vi.fn(),
  getLeadMentorPositionStudents: vi.fn(),
}))

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8',
)
const positionsPath = path.resolve(__dirname, '../views/career/positions/index.vue')
const positionsExists = fs.existsSync(positionsPath)

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(() => ({
    nickName: 'Jess (Lead Mentor)',
    userName: 'leadmentor',
  })),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => 'lead-mentor-token'),
}))

vi.mock('@osg/shared/api', () => apiMocks)

vi.mock('ant-design-vue', () => ({
  message: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

const positionRowsFixture = [
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
  {
    positionId: 103,
    positionCategory: 'summer',
    industry: 'Tech',
    companyName: 'Google',
    companyWebsite: 'https://careers.google.com',
    positionName: 'Software Engineer',
    city: 'Singapore',
    recruitmentCycle: '2025 Summer',
    projectYear: '2025',
    publishTime: '2026-03-14T08:00:00Z',
    deadline: '2026-04-02T08:00:00Z',
    myStudentCount: 0,
    studentCount: 0,
  },
]

const positionMetaFixture = {
  categories: [
    { value: 'summer', label: '暑期实习' },
    { value: 'fulltime', label: '全职招聘' },
  ],
  displayStatuses: [{ value: 'visible', label: 'visible' }],
  industries: [
    { value: 'Investment Bank', label: 'Investment Bank' },
    { value: 'Consulting', label: 'Consulting' },
    { value: 'Tech', label: 'Tech' },
  ],
  companyTypes: [],
  companies: [
    { value: 'Goldman Sachs', label: 'Goldman Sachs' },
    { value: 'McKinsey', label: 'McKinsey' },
    { value: 'Google', label: 'Google' },
  ],
  recruitmentCycles: [
    { value: '2025 Summer', label: '2025 Summer' },
    { value: '2025 Full Time', label: '2025 Full Time' },
  ],
  projectYears: [{ value: '2025', label: '2025' }],
  regions: [
    { value: 'Hong Kong', label: 'Hong Kong' },
    { value: 'Shanghai', label: 'Shanghai' },
    { value: 'Singapore', label: 'Singapore' },
  ],
  citiesByRegion: {
    'Hong Kong': [{ value: 'Hong Kong', label: 'Hong Kong' }],
    Shanghai: [{ value: 'Shanghai', label: 'Shanghai' }],
    Singapore: [{ value: 'Singapore', label: 'Singapore' }],
  },
  sortOptions: [{ value: 'publishTime:desc', label: '发布时间倒序' }],
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function loadPositionsPage() {
  expect(positionsExists).toBe(true)
  const moduleUrl = pathToFileURL(positionsPath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountPositionsPage(initialPath = '/career/positions') {
  const PositionsPage = await loadPositionsPage()
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
    container,
    router,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

async function mountModal() {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp(PositionMyStudentsModal, {
    modelValue: true,
    preview: {
      companyName: 'Goldman Sachs',
      jobTitle: 'IB Analyst',
      students: [
        {
          studentId: '12766',
          studentName: '张三',
          jobTitle: 'IB Analyst',
          statusLabel: '面试中',
          statusTone: 'interviewing',
          lessonHours: '24h',
        },
      ],
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

describe('lead-mentor positions shell contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorPositionList.mockResolvedValue({ rows: positionRowsFixture })
    apiMocks.getLeadMentorPositionMeta.mockResolvedValue(positionMetaFixture)
  })

  it('registers the /career/positions route and restores the prototype source file', () => {
    expect(routerSource).toContain("path: 'career/positions'")
    expect(routerSource).toContain("name: 'CareerPositions'")
    expect(positionsExists).toBe(true)
  })

  it('restores the positions shell with filters, drilldown/list views, and prototype labels', async () => {
    const page = await mountPositionsPage()

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/career/positions')
      expect(page.container.querySelector('#page-positions')).toBeTruthy()
      expect(page.container.textContent).toContain('岗位信息')
      expect(page.container.textContent).toContain('Job Tracker')
      expect(page.container.textContent).toContain('下钻视图')
      expect(page.container.textContent).toContain('列表视图')
      expect(page.container.textContent).toContain('全部分类')
      expect(page.container.textContent).toContain('全部行业')
      expect(page.container.textContent).toContain('全部公司')
      expect(page.container.textContent).toContain('全部地区')
      expect(page.container.textContent).toContain('Investment Bank')
      expect(page.container.textContent).toContain('Consulting')
      expect(page.container.textContent).toContain('Tech')
      expect(page.container.textContent).toContain('Goldman Sachs')
      expect(page.container.textContent).toContain('McKinsey')
      expect(page.container.textContent).toContain('Google')
      expect(page.container.textContent).toContain('官网')
      expect(page.container.textContent).toContain('个岗位')
      expect(page.container.querySelectorAll('.table').length).toBeGreaterThanOrEqual(2)
    } finally {
      page.unmount()
    }
  })

  it('switches between drilldown and list views while preserving the positions nav highlight', async () => {
    const page = await mountPositionsPage()

    try {
      const drilldownButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('下钻视图'),
      )
      const listButton = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.includes('列表视图'),
      )
      const drilldownPanel = page.container.querySelector<HTMLElement>('#lead-position-drilldown')
      const listPanel = page.container.querySelector<HTMLElement>('#lead-position-list')
      const positionsNav = Array.from(page.container.querySelectorAll<HTMLElement>('.nav-item')).find((item) =>
        item.textContent?.includes('岗位信息 Positions'),
      )

      expect(drilldownButton).toBeTruthy()
      expect(listButton).toBeTruthy()
      expect(drilldownPanel).toBeTruthy()
      expect(listPanel).toBeTruthy()
      expect(positionsNav?.classList.contains('active')).toBe(true)
      expect(drilldownPanel?.style.display).not.toBe('none')
      expect(listPanel?.style.display).toBe('none')

      listButton?.click()
      await flushUi()

      expect(drilldownPanel?.style.display).toBe('none')
      expect(listPanel?.style.display).toBe('block')

      drilldownButton?.click()
      await flushUi()

      expect(drilldownPanel?.style.display).toBe('block')
      expect(listPanel?.style.display).toBe('none')
      expect(positionsNav?.classList.contains('active')).toBe(true)
    } finally {
      page.unmount()
    }
  })

  it('renders the my-students modal shell with the declared surface markers and prototype copy', async () => {
    const modal = await mountModal()

    try {
      const root = modal.container.querySelector('[data-surface-id="modal-position-mystudents"]')
      const shell = root?.querySelector('[data-surface-part="shell"]')
      const header = root?.querySelector('[data-surface-part="header"]')
      const body = root?.querySelector('[data-surface-part="body"]')
      const title = root?.querySelector('.modal-title')
      const footer = root?.querySelector('.modal-footer')

      expect(root).toBeTruthy()
      expect(root?.classList.contains('modal')).toBe(true)
      expect(shell).toBeTruthy()
      expect(shell?.classList.contains('modal-content')).toBe(true)
      expect(header?.classList.contains('modal-header')).toBe(true)
      expect(body?.classList.contains('modal-body')).toBe(true)
      expect(title).toBeTruthy()
      expect(footer).toBeTruthy()
      expect(header?.textContent).toContain('Goldman Sachs - IB Analyst 我的学员申请')
      expect(body?.textContent).toContain('仅显示您管理的学员')
      expect(body?.textContent).toContain('张三')
      expect(body?.textContent).toContain('面试中')
      expect(root?.textContent).toContain('关闭')
      expect(root?.textContent).toContain('保存修改')
      expect(root?.querySelector('.btn-outline')).toBeTruthy()
      expect(root?.querySelector('.btn-primary')).toBeTruthy()
      expect(root?.querySelector('.mdi-account-group')).toBeTruthy()
      expect(root?.querySelector('.mdi-information')).toBeTruthy()
      expect(root?.querySelector('.mdi-check')).toBeTruthy()
    } finally {
      modal.unmount()
    }
  })
})
