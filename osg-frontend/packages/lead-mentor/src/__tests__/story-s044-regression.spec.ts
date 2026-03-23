import { createApp, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import MainLayout from '../layouts/MainLayout.vue'
import StudentListPage from '../views/teaching/students/index.vue'
import JobOverviewPage from '../views/career/job-overview/index.vue'

const apiMocks = vi.hoisted(() => ({
  getLeadMentorStudentMeta: vi.fn(),
  getLeadMentorStudentList: vi.fn(),
  getLeadMentorJobOverviewList: vi.fn(),
  getLeadMentorJobOverviewDetail: vi.fn(),
  assignLeadMentorJobOverviewMentor: vi.fn(),
  acknowledgeLeadMentorJobOverviewStage: vi.fn(),
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

const storyRows = [
  {
    studentId: 6201,
    studentName: 'Luna Xu',
    email: 'luna@lse.ac.uk',
    school: 'LSE',
    majorDirection: '金融 Finance',
    relations: [{ value: 'managed', label: '班主任为我', tone: 'warning' }],
    applyCount: 6,
    interviewCount: 2,
    offerCount: 1,
    remainingHours: 12,
    accountStatus: '0',
    accountStatusLabel: '正常',
  },
  {
    studentId: 6202,
    studentName: 'Marco He',
    email: 'marco@harvard.edu',
    school: 'Harvard',
    majorDirection: '科技 Tech',
    relations: [
      { value: 'coaching', label: '我教的学员', tone: 'primary' },
      { value: 'managed', label: '班主任为我', tone: 'warning' },
    ],
    applyCount: 3,
    interviewCount: 1,
    offerCount: 0,
    remainingHours: 9,
    accountStatus: '1',
    accountStatusLabel: '冻结',
  },
]

async function flushUi() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountStory(initialPath = '/teaching/students') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'teaching/students', name: 'TeachingStudents', component: StudentListPage },
          { path: 'career/job-overview', name: 'CareerJobOverview', component: JobOverviewPage },
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

describe('S-044 story regression skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getLeadMentorStudentMeta.mockResolvedValue({
      relationOptions: [
        { value: 'coaching', label: '我教的学员' },
        { value: 'managed', label: '班主任为我' },
        { value: 'dual', label: '双关系学员' },
      ],
      schools: [
        { value: 'LSE', label: 'LSE' },
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
    apiMocks.getLeadMentorStudentList.mockResolvedValue({ rows: storyRows })
    apiMocks.getLeadMentorJobOverviewList.mockImplementation(async (params: { scope: string; studentName?: string }) => ({
      rows: params.studentName
        ? [
            {
              applicationId: 7201,
              studentId: 6201,
              studentName: params.studentName,
              companyName: 'Goldman Sachs',
              positionName: 'Summer Analyst',
              currentStage: 'First Round',
              coachingStatus: '辅导中',
              assignedStatus: 'assigned',
              mentorNames: 'Jess',
            },
          ]
        : [],
    }))
    apiMocks.getLeadMentorJobOverviewDetail.mockResolvedValue({})
    apiMocks.assignLeadMentorJobOverviewMentor.mockResolvedValue({})
    apiMocks.acknowledgeLeadMentorJobOverviewStage.mockResolvedValue({})
  })

  it('covers relation-union display, out-of-scope exclusion, and linked filter persistence in one story path', async () => {
    const page = await mountStory()

    try {
      expect(page.container.textContent).toContain('Luna Xu')
      expect(page.container.textContent).toContain('Marco He')
      expect(page.container.textContent).not.toContain('Outsider')
      expect(page.container.textContent).toContain('我教的学员')
      expect(page.container.textContent).toContain('班主任为我')

      const jobButtons = Array.from(page.container.querySelectorAll<HTMLButtonElement>('button')).filter((button) =>
        button.textContent?.includes('查看求职'),
      )
      jobButtons[0]?.click()
      await flushUi()

      expect(page.router.currentRoute.value.path).toBe('/career/job-overview')
      expect(page.router.currentRoute.value.query.studentName).toBe('Luna Xu')
      expect(apiMocks.getLeadMentorJobOverviewList).toHaveBeenCalledWith({ scope: 'pending', studentName: 'Luna Xu' })
      expect(apiMocks.getLeadMentorJobOverviewList).toHaveBeenCalledWith({ scope: 'coaching', studentName: 'Luna Xu' })
      expect(apiMocks.getLeadMentorJobOverviewList).toHaveBeenCalledWith({ scope: 'managed', studentName: 'Luna Xu' })

      page.unmount()

      const reloaded = await mountStory('/career/job-overview?studentName=Luna%20Xu')
      try {
        expect(reloaded.container.querySelector<HTMLInputElement>('input.form-input')?.value).toBe('Luna Xu')
        expect(apiMocks.getLeadMentorJobOverviewList).toHaveBeenCalledWith({ scope: 'managed', studentName: 'Luna Xu' })
      } finally {
        reloaded.unmount()
      }
    } finally {
      if (document.body.contains(page.container)) {
        page.unmount()
      }
    }
  })
})
