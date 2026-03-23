import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'

const routerSource = fs.readFileSync(
  path.resolve(__dirname, '../router/index.ts'),
  'utf-8',
)
const pagePath = path.resolve(__dirname, '../views/teaching/students/index.vue')
const pageExists = fs.existsSync(pagePath)

const apiMocks = vi.hoisted(() => ({
  getLeadMentorStudentMeta: vi.fn(),
  getLeadMentorStudentList: vi.fn(),
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

async function loadStudentListPage() {
  expect(pageExists).toBe(true)
  const moduleUrl = pathToFileURL(pagePath).href
  return (await import(/* @vite-ignore */ moduleUrl)).default
}

async function mountStudentListPage(initialPath = '/teaching/students') {
  const StudentListPage = await loadStudentListPage()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'teaching/students', name: 'TeachingStudents', component: StudentListPage },
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

describe('lead-mentor student list shell contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorStudentMeta.mockResolvedValue({
      relationOptions: [
        { value: 'coaching', label: '我教的学员' },
        { value: 'managed', label: '班主任为我' },
        { value: 'dual', label: '双关系学员' },
      ],
      schools: [
        { value: 'NYU', label: 'NYU' },
        { value: '北京大学', label: '北京大学' },
        { value: 'Harvard', label: 'Harvard' },
      ],
      majorDirections: [
        { value: '金融 Finance', label: '金融 Finance' },
        { value: '科技 Tech', label: '科技 Tech' },
      ],
      accountStatuses: [
        { value: '0', label: '正常' },
        { value: '1', label: '冻结' },
      ],
    })
    apiMocks.getLeadMentorStudentList.mockResolvedValue({
      rows: [
        {
          studentId: 58472,
          studentName: 'Emily Zhang',
          email: 'emily@nyu.edu',
          relations: [{ value: 'coaching', label: '我教的学员', tone: 'primary' }],
          school: 'NYU',
          majorDirection: '金融 Finance',
          applyCount: 12,
          interviewCount: 3,
          offerCount: 1,
          remainingHours: 15.5,
          accountStatus: '0',
          accountStatusLabel: '正常',
        },
        {
          studentId: 45821,
          studentName: 'Test Student',
          email: 'test@pku.edu.cn',
          relations: [{ value: 'managed', label: '班主任为我', tone: 'warning' }],
          school: '北京大学',
          majorDirection: '金融 Finance',
          applyCount: 5,
          interviewCount: 1,
          offerCount: 0,
          remainingHours: 8,
          accountStatus: '0',
          accountStatusLabel: '正常',
        },
        {
          studentId: 72936,
          studentName: 'Bob Chen',
          email: 'bob@harvard.edu',
          relations: [
            { value: 'coaching', label: '我教的学员', tone: 'primary' },
            { value: 'managed', label: '班主任为我', tone: 'warning' },
          ],
          school: 'Harvard',
          majorDirection: '科技 Tech',
          applyCount: 3,
          interviewCount: 0,
          offerCount: 0,
          remainingHours: 5,
          accountStatus: '1',
          accountStatusLabel: '冻结',
        },
      ],
    })
  })

  it('registers the /teaching/students route and restores the prototype source file', () => {
    expect(routerSource).toContain("path: 'teaching/students'")
    expect(routerSource).toContain("name: 'TeachingStudents'")
    expect(pageExists).toBe(true)
  })

  it('restores the student list shell with filters, relation tags, table, and pagination', async () => {
    const page = await mountStudentListPage()

    try {
      expect(page.router.currentRoute.value.fullPath).toBe('/teaching/students')
      expect(page.container.querySelector('#page-student-list')).toBeTruthy()
      expect(page.container.textContent).toContain('学员列表')
      expect(page.container.textContent).toContain('Student List')
      expect(page.container.textContent).toContain('查看我教的学员和班主任为我的全部学员信息及求职数据')
      expect(page.container.querySelector<HTMLInputElement>('input.form-input')?.placeholder).toBe('搜索姓名')
      expect(page.container.textContent).toContain('学员类型')
      expect(page.container.textContent).toContain('学校')
      expect(page.container.textContent).toContain('主攻方向')
      expect(page.container.textContent).toContain('搜索')
      expect(page.container.textContent).toContain('重置')
      expect(page.container.textContent).toContain('我教的')
      expect(page.container.textContent).toContain('班主任为我')
      expect(page.container.textContent).toContain('查看求职')
      expect(page.container.textContent).toContain('上一页')
      expect(page.container.textContent).toContain('下一页')
      expect(page.container.querySelector('.table')).toBeTruthy()
      expect(page.container.querySelectorAll('tbody tr')).toHaveLength(3)
      expect(page.container.textContent).toContain('Emily Zhang')
      expect(page.container.textContent).toContain('Bob Chen')
      expect(page.container.textContent).toContain('15.5h')
      expect(page.container.textContent).toContain('共 3 条记录')
    } finally {
      page.unmount()
    }
  })

  it('keeps the student list navigation highlighted on /teaching/students', async () => {
    const page = await mountStudentListPage()

    try {
      const studentNav = Array.from(page.container.querySelectorAll<HTMLElement>('.nav-item')).find((item) =>
        item.textContent?.includes('学员列表 Student List'),
      )

      expect(studentNav).toBeTruthy()
      expect(studentNav?.classList.contains('active')).toBe(true)
    } finally {
      page.unmount()
    }
  })
})
