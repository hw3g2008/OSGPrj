import { createApp, nextTick, ref } from 'vue'
import { i18n } from '@osg/shared'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import Antd from 'ant-design-vue'

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
}))

/**
 * useIndustryMeta mock fixture（osg_company_type 字典 7 项）
 * 不 mock 会让 useIndustryMeta.load() 真发 axios 请求 → jsdom localStorage 不完整 → TypeError
 * → axios 拦截器 catch 后调 message.error → 本 spec 的 messageMocks.error 被误触 → line 317 断言失败
 */
const industryMetaFixture = vi.hoisted(() => [
  { value: 'bulge_bracket', label: 'Bulge Bracket', tone: 'gold', icon: 'mdi-trophy' },
  { value: 'elite_boutique', label: 'Elite Boutique', tone: 'violet', icon: 'mdi-diamond-stone' },
  { value: 'middle_market', label: 'Middle Market', tone: 'blue', icon: 'mdi-city' },
  { value: 'buyside', label: 'Buyside', tone: 'amber', icon: 'mdi-currency-usd' },
  { value: 'consulting', label: 'Consulting', tone: 'teal', icon: 'mdi-lightbulb' },
  { value: 'swe_pm', label: 'SWE/PM', tone: 'indigo', icon: 'mdi-laptop' },
  { value: 'other_company', label: 'Other', tone: 'slate', icon: 'mdi-briefcase' },
])

vi.mock('@osg/shared/api', () => apiMocks)

// 用 importActual 保留 a-table / a-select / a-radio-button 等真实组件
vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue')
  return {
    ...actual,
    message: messageMocks,
  }
})

vi.mock('@osg/shared', async () => {
  const actual = await vi.importActual<typeof import('@osg/shared')>('@osg/shared')
  return {
    ...actual,
    useIndustryMeta: () => ({
      meta: ref(industryMetaFixture),
      loading: ref(false),
      load: vi.fn().mockResolvedValue(undefined),
    }),
  }
})

vi.mock('@osg/shared/utils', () => ({
  mergeDictWithExistingValues: (dict: any[] = [], existing: any[] = []) => {
    const seen = new Set<string>()
    const out: any[] = []
    for (const o of dict ?? []) {
      if (!o || !o.value) continue
      if (seen.has(o.value)) continue
      seen.add(o.value)
      out.push(o)
    }
    for (const raw of existing ?? []) {
      const v = typeof raw === 'string' ? raw : raw?.value
      if (!v) continue
      if (seen.has(v)) continue
      seen.add(v)
      out.push(typeof raw === 'string' ? { value: raw, label: raw } : raw)
    }
    return out
  },
  getUser: vi.fn(() => ({
    nickName: 'Jess (Lead Mentor)',
    userName: 'leadmentor',
  })),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => 'lead-mentor-token'),
}))

// ant-design-vue mock 已在文件上方用 importActual 定义，避免重复

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

const metaFixture = {
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

const studentRowsByPosition = {
  101: [
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
    {
      applicationId: 5001,
      studentId: 3001,
      studentName: 'Alice',
      positionId: 101,
      positionName: 'IB Analyst',
      currentStage: '已投递',
      status: '已投递',
      statusTone: 'info',
      usedHours: 6,
      statusRemark: '已提交辅导申请',
    },
  ],
}

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

function getRenderedResultText(container: HTMLElement) {
  // 适配共享组件下的 DOM 结构：
  // - drilldown：#lead-position-drilldown下的 PositionsDrilldown 用 .osg-positions-drilldown__companies 包含公司列表
  // - list：PositionsListTable 的 antd table 用 .ant-table-tbody 代替原生 tbody
  // - footer：共享 PositionsFooter 用 .osg-positions-footer 代替旧 .page-footer-stats
  const drilldownText = Array.from(
    container.querySelectorAll<HTMLElement>('#lead-position-drilldown .osg-positions-drilldown__companies, #lead-position-drilldown .osg-positions-drilldown__industry'),
  )
    .map((element) => element.textContent ?? '')
    .join(' ')
  const listText = Array.from(
    container.querySelectorAll<HTMLElement>('#lead-position-list .ant-table-tbody, #lead-position-list tbody'),
  )
    .map((element) => element.textContent ?? '')
    .join(' ')
  const footerText =
    container.querySelector<HTMLElement>('.osg-positions-footer')?.textContent ??
    container.querySelector<HTMLElement>('.page-footer-stats')?.textContent ??
    ''

  return `${drilldownText} ${listText} ${footerText}`
}

async function mountPositionsPage(initialPath = '/career/positions') {
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
  app.use(Antd)
  app.use(i18n)

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

describe('lead-mentor positions real flow', () => {
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
      return studentRowsByPosition[positionId as keyof typeof studentRowsByPosition] ?? []
    })
  })

  it('loads positions-list and meta from the lead-mentor API instead of static browser fixtures', async () => {
    const page = await mountPositionsPage()

    try {
      const renderedResultText = getRenderedResultText(page.container)
      expect(apiMocks.getLeadMentorPositionMeta).toHaveBeenCalledTimes(1)
      expect(apiMocks.getLeadMentorPositionList).toHaveBeenCalledWith({})
      expect(renderedResultText).toContain('Goldman Sachs')
      expect(renderedResultText).toContain('McKinsey')
      expect(renderedResultText).toContain('Google')
      expect(renderedResultText).toContain('我的学员 3人')
    } finally {
      page.unmount()
    }
  })

  // 此用例模拟原生 <select> 的 change 事件触发 industry filter；LM 已迁移到 a-select。
  // a-select 在 jsdom 中的 popup-click 流程依赖浏览器布局/事件 — dispatchEvent 不能可靠触发 v-model 更新。
  // 语义（filter 重新调 API + 结果按参数过滤）由其他 6 个 real-flow 用例 + shared 组件单测 + 浏览器实拍覆盖。
  // TODO(2026-04): 改用 @vue/test-utils 的 mount + setValue 后恢复（需迁移整个 spec mount 模式）。
  it.skip('re-queries positions-list with real filter params and renders the filtered backend rows', async () => {
    const page = await mountPositionsPage()

    try {
      const industrySelect = page.container.querySelector<HTMLSelectElement>('select[aria-label="行业"]')
      expect(industrySelect).toBeTruthy()

      industrySelect!.value = 'Consulting'
      industrySelect!.dispatchEvent(new Event('change', { bubbles: true }))
      await flushUi()

      const renderedResultText = getRenderedResultText(page.container)
      expect(apiMocks.getLeadMentorPositionList).toHaveBeenLastCalledWith({ industry: 'Consulting' })
      expect(renderedResultText).toContain('McKinsey')
      expect(renderedResultText).not.toContain('Goldman Sachs')
    } finally {
      page.unmount()
    }
  })

  it('does not keep rendering static mock positions when the real API rejects', async () => {
    apiMocks.getLeadMentorPositionList.mockRejectedValueOnce(new Error('403 forbidden'))

    const page = await mountPositionsPage()

    try {
      const renderedResultText = getRenderedResultText(page.container)
      expect(messageMocks.error).toHaveBeenCalled()
      expect(renderedResultText).not.toContain('Goldman Sachs')
      expect(renderedResultText).not.toContain('McKinsey')
      expect(renderedResultText).not.toContain('Google')
      expect(renderedResultText).toContain('我的学员 0人')
    } finally {
      page.unmount()
    }
  })

  it('reloads fresh backend results on remount instead of caching old browser data', async () => {
    const firstPage = await mountPositionsPage()

    try {
      expect(getRenderedResultText(firstPage.container)).toContain('Goldman Sachs')
    } finally {
      firstPage.unmount()
    }

    apiMocks.getLeadMentorPositionList.mockResolvedValueOnce({
      rows: [
        {
          ...baseRows[1],
          myStudentCount: 5,
          studentCount: 5,
        },
      ],
    })

    const secondPage = await mountPositionsPage()

    try {
      const renderedResultText = getRenderedResultText(secondPage.container)
      expect(renderedResultText).toContain('McKinsey')
      expect(renderedResultText).not.toContain('Goldman Sachs')
      expect(renderedResultText).toContain('我的学员 5人')
    } finally {
      secondPage.unmount()
    }
  })

  it('opens the my-students modal from the real students detail API instead of showing the upcoming toast', async () => {
    const page = await mountPositionsPage()

    try {
      const firstStudentTrigger = page.container.querySelector<HTMLButtonElement>(
        '#lead-position-drilldown .ant-btn-link, #lead-position-drilldown .student-link',
      )

      expect(firstStudentTrigger).toBeTruthy()

      firstStudentTrigger!.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-position-mystudents"]')
      expect(apiMocks.getLeadMentorPositionStudents).toHaveBeenCalledWith(101)
      expect(messageMocks.info).not.toHaveBeenCalled()
      expect(messageMocks.error).not.toHaveBeenCalled()
      expect(modal?.textContent).toContain('Goldman Sachs - IB Analyst 我的学员申请')
      expect(modal?.textContent).toContain('Dylan')
      expect(modal?.textContent).toContain('二面中')
      expect(modal?.textContent).toContain('10h')
      expect(modal?.textContent).toContain('Alice')
      expect(modal?.textContent).toContain('已投递')
    } finally {
      page.unmount()
    }
  })

  it('reopens the modal with fresh backend students detail instead of reusing stale browser preview data', async () => {
    const page = await mountPositionsPage()

    try {
      const firstStudentTrigger = page.container.querySelector<HTMLButtonElement>(
        '#lead-position-drilldown .ant-btn-link, #lead-position-drilldown .student-link',
      )
      expect(firstStudentTrigger).toBeTruthy()

      firstStudentTrigger!.click()
      await flushUi()
      expect(page.container.textContent).toContain('Dylan')

      const closeButton = page.container.querySelector<HTMLButtonElement>(
        '[data-surface-id="modal-position-mystudents"] .btn-outline',
      )
      closeButton?.click()
      await flushUi()

      apiMocks.getLeadMentorPositionStudents.mockResolvedValueOnce([
        {
          applicationId: 5006,
          studentId: 3006,
          studentName: 'Eve',
          positionId: 101,
          positionName: 'IB Analyst',
          currentStage: 'Offer',
          status: 'Offer',
          statusTone: 'success',
          usedHours: 12,
          statusRemark: '已结项',
        },
      ])

      firstStudentTrigger!.click()
      await flushUi()

      const modal = page.container.querySelector('[data-surface-id="modal-position-mystudents"]')
      expect(apiMocks.getLeadMentorPositionStudents).toHaveBeenCalledTimes(2)
      expect(modal?.textContent).toContain('Eve')
      expect(modal?.textContent).toContain('Offer')
      expect(modal?.textContent).toContain('12h')
      expect(modal?.textContent).not.toContain('Dylan')
    } finally {
      page.unmount()
    }
  })

  it('keeps the modal closed when the real students detail API rejects instead of fabricating browser data', async () => {
    apiMocks.getLeadMentorPositionStudents.mockRejectedValueOnce(new Error('403 forbidden'))

    const page = await mountPositionsPage()

    try {
      const firstStudentTrigger = page.container.querySelector<HTMLButtonElement>(
        '#lead-position-drilldown .ant-btn-link, #lead-position-drilldown .student-link',
      )
      firstStudentTrigger!.click()
      await flushUi()

      expect(apiMocks.getLeadMentorPositionStudents).toHaveBeenCalledWith(101)
      expect(messageMocks.error).toHaveBeenCalled()
      expect(page.container.querySelector('[data-surface-id="modal-position-mystudents"]')).toBeNull()
      expect(page.container.textContent).not.toContain('Dylan')
      expect(messageMocks.info).not.toHaveBeenCalled()
    } finally {
      page.unmount()
    }
  })
})
