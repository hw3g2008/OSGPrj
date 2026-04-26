import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick, ref } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import Antd from 'ant-design-vue'

import MainLayout from '../layouts/MainLayout.vue'
import PositionMyStudentsModal from '../components/PositionMyStudentsModal.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorPositionList: vi.fn(),
  getLeadMentorPositionMeta: vi.fn(),
  getLeadMentorPositionStudents: vi.fn(),
}))

/**
 * 7 项 PositionMetaOption fixture（对齐 osg_company_type 字典 7 项，按 T3+T4 契约）
 * 真实后端返回 DTO 裁剪字段，shared/useIndustryMeta 映射为 { value, label, tone, icon }
 * 见 docs/plans/2026-04-19-shared-prerequisites-plan.md §5.4 / §6.2
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

// mock shared 主入口，避免 useIndustryMeta 真发网络请求（走 axios + localStorage 会在 jsdom 中失败）
// 用 importActual 保留 PositionsListTable / PositionsDrilldown / PositionsFooter 真实组件
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

// 用 importActual 保留 a-table / a-select / a-radio-button 等真实组件，只覆盖 message
vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue')
  return {
    ...actual,
    message: {
      info: vi.fn(),
      error: vi.fn(),
    },
  }
})

/**
 * positionRowsFixture 设计（覆盖双路径）：
 * - row 101: industry='bulge_bracket' → 字典命中 → label="Bulge Bracket"、tone=gold
 * - row 102: industry='Consulting'（老字符串）→ 字典未命中 → 原字符串 label、tone=slate（fallback）
 * - row 103: industry='Tech'（老字符串）→ 字典未命中 → 原字符串 label、tone=slate（fallback）
 * 真实生产数据会混杂"字典 value / 老字符串 / 空值"，fixture 同时覆盖前两种
 */
const positionRowsFixture = [
  {
    positionId: 101,
    positionCategory: 'summer',
    industry: 'bulge_bracket',
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
  app.use(Antd)
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

  app.use(Antd)
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
      // a-select placeholder 渲染到 attribute（jsdom 不在 textContent 里），改查 innerHTML
      expect(page.container.innerHTML).toContain('全部分类')
      expect(page.container.innerHTML).toContain('全部行业')
      expect(page.container.innerHTML).toContain('全部公司')
      expect(page.container.innerHTML).toContain('全部地区')
      // industries 行业 label：bulge_bracket 走字典命中显示"Bulge Bracket"，其他走 fallback 显示原字符串
      expect(page.container.textContent).toContain('Bulge Bracket')
      expect(page.container.textContent).toContain('Consulting')
      expect(page.container.textContent).toContain('Tech')
      expect(page.container.textContent).toContain('Goldman Sachs')
      expect(page.container.textContent).toContain('McKinsey')
      expect(page.container.textContent).toContain('Google')
      expect(page.container.textContent).toContain('官网')
      expect(page.container.textContent).toContain('个岗位')
      // antd 表格不使用 .table class，改查 .ant-table。
      // 默认 list 视图：list panel 含 1 个 .ant-table（visible）；drilldown panel display:none 但 DOM 存在，
      // 不过 PositionsDrilldown 嵌套表只在公司展开时渲染（默认无展开），故仅 list 1 个 .ant-table。
      expect(page.container.querySelectorAll('.ant-table').length).toBeGreaterThanOrEqual(1)

      // 新 CSS class 契约（对齐字典 css_class 字段，禁用按老 value 命名的 class）
      // 共享 PositionsListTable / PositionsDrilldown 用 tone-based class（osg-industry-tag--{tone} / osg-positions-drilldown__industry-head--{tone}）
      // 字典命中路径：bulge_bracket → tone=gold
      expect(
        page.container.querySelector('.osg-industry-tag--gold, .osg-positions-drilldown__industry-head--gold'),
      ).toBeTruthy()
      // Fallback 路径：未命中字典 → tone=slate（Consulting/Tech 老字符串）
      expect(
        page.container.querySelector('.osg-industry-tag--slate, .osg-positions-drilldown__industry-head--slate'),
      ).toBeTruthy()
      // 老 value-based class 已废除（改为 tone-based），不应出现在渲染结果
      expect(page.container.querySelector('.industry-bank')).toBeFalsy()
      expect(page.container.querySelector('.industry-consulting')).toBeFalsy()
      expect(page.container.querySelector('.industry-tech')).toBeFalsy()
    } finally {
      page.unmount()
    }
  })

  it('switches between drilldown and list views while preserving the positions nav highlight', async () => {
    const page = await mountPositionsPage()

    try {
      // a-radio-button 渲染为 <label class="ant-radio-button-wrapper"> 包裹 <input type="radio">，按 ID 直接定位 input
      const drilldownInput = page.container.querySelector<HTMLInputElement>(
        '#lead-view-drilldown input[type="radio"]',
      ) ?? page.container.querySelector<HTMLInputElement>('#lead-view-drilldown')
      const listInput = page.container.querySelector<HTMLInputElement>(
        '#lead-view-list input[type="radio"]',
      ) ?? page.container.querySelector<HTMLInputElement>('#lead-view-list')
      const drilldownLabel = page.container.querySelector<HTMLLabelElement>('label[id="lead-view-drilldown"], #lead-view-drilldown')
      const listLabel = page.container.querySelector<HTMLLabelElement>('label[id="lead-view-list"], #lead-view-list')
      const drilldownPanel = page.container.querySelector<HTMLElement>('#lead-position-drilldown')
      const listPanel = page.container.querySelector<HTMLElement>('#lead-position-list')
      const positionsNav = Array.from(page.container.querySelectorAll<HTMLElement>('.nav-item')).find((item) =>
        item.textContent?.includes('岗位信息 Positions'),
      )

      expect(drilldownLabel ?? drilldownInput).toBeTruthy()
      expect(listLabel ?? listInput).toBeTruthy()
      expect(drilldownPanel).toBeTruthy()
      expect(listPanel).toBeTruthy()
      expect(positionsNav?.classList.contains('active')).toBe(true)
      // LM 默认 list 视图（与 Asst 一致）：list panel 可见、drilldown panel display:none
      expect(listPanel?.style.display).not.toBe('none')
      expect(drilldownPanel?.style.display).toBe('none')

      // 切换到 drilldown 视图：antd radio v-model 监听 <input> change 事件
      const drilldownRadio = page.container.querySelector<HTMLInputElement>('#lead-view-drilldown input[type="radio"]')
      const listRadio = page.container.querySelector<HTMLInputElement>('#lead-view-list input[type="radio"]')
      if (drilldownRadio) {
        drilldownRadio.checked = true
        drilldownRadio.dispatchEvent(new Event('change', { bubbles: true }))
      } else {
        ;(drilldownLabel ?? drilldownInput)?.click()
      }
      await flushUi()

      expect(drilldownPanel?.style.display).not.toBe('none')
      expect(listPanel?.style.display).toBe('none')

      // 切回 list 视图
      if (listRadio) {
        listRadio.checked = true
        listRadio.dispatchEvent(new Event('change', { bubbles: true }))
      } else {
        ;(listLabel ?? listInput)?.click()
      }
      await flushUi()

      expect(listPanel?.style.display).not.toBe('none')
      expect(drilldownPanel?.style.display).toBe('none')
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
