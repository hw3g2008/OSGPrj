import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import JobOverviewPage from '@/views/job-overview/index.vue'
import MockPracticePage from '@/views/mock-practice/index.vue'

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@osg/shared/utils', async () => {
  const actual = await vi.importActual<typeof import('@osg/shared/utils')>('@osg/shared/utils')
  return {
    ...actual,
    getUser: vi.fn(() => ({ nickName: 'Mentor', userName: 'mentor' })),
  }
})

import { http } from '@osg/shared/utils/request'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'mock-practice', component: MockPracticePage },
          { path: 'job-overview', component: JobOverviewPage },
        ],
      },
    ],
  })
}

async function mountAt(path: string) {
  const router = createTestRouter()
  router.push(path)
  await router.isReady()

  const wrapper = mount({ template: '<router-view />' }, {
    global: {
      plugins: [router],
    },
  })

  await flushPromises()
  return wrapper
}

function findNavItem(wrapper: ReturnType<typeof mount>, label: string) {
  const navItem = wrapper.findAll('.nav-item').find((candidate) => candidate.text().includes(label))
  expect(navItem, `expected nav item containing ${label}`).toBeTruthy()
  return navItem!
}

describe('mentor nav badge state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('decrements the mock badge after confirming a mock practice row', async () => {
    const mockRows = [
      {
        practiceId: 42,
        studentId: 843,
        studentName: 'Mock Student A',
        practiceType: 'mock_interview',
        requestContent: 'Mock interview A',
        status: 'new',
      },
      {
        practiceId: 43,
        studentId: 844,
        studentName: 'Mock Student B',
        practiceType: 'relation_test',
        requestContent: 'Mock interview B',
        status: 'new',
      },
    ]

    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/api/mentor/mock-practice/list') {
        return { rows: mockRows.map((row) => ({ ...row })) }
      }
      return { rows: [] }
    })
    vi.mocked(http.put).mockImplementation(async (url: string) => {
      if (url === '/api/mentor/mock-practice/42/confirm') {
        mockRows[0].status = 'pending'
      }
      return {}
    })

    const wrapper = await mountAt('/mock-practice')

    const mockNavItem = findNavItem(wrapper, 'Mock Practice')
    expect(mockNavItem.find('.nav-badge').text()).toBe('2')

    await wrapper.findAll('tbody tr').find((row) => row.text().includes('Mock Student A'))?.get('button').trigger('click')
    await flushPromises()

    expect(mockNavItem.find('.nav-badge').text()).toBe('1')
  })

  it('hides the job badge after confirming the only unread job row', async () => {
    const jobRows = [
      {
        id: 7,
        studentId: 843,
        studentName: 'Job Student',
        company: 'Browser Smoke Capital 3',
        position: 'Consultant',
        location: 'Shanghai',
        interviewStage: 'Round 1',
        coachingStatus: 'new',
      },
    ]

    vi.mocked(http.get).mockImplementation(async (url: string, options?: Record<string, any>) => {
      if (url === '/api/mentor/job-overview/list') {
        return { rows: jobRows.map((row) => ({ ...row })) }
      }
      if (url === '/api/mentor/job-overview/calendar') {
        return []
      }
      if (url === '/api/mentor/class-records/list') {
        return { rows: [] }
      }
      if (url === '/api/mentor/job-overview/export') {
        return new Blob()
      }
      return { rows: [] }
    })
    vi.mocked(http.put).mockImplementation(async (url: string) => {
      if (url === '/api/mentor/job-overview/7/confirm') {
        jobRows[0].coachingStatus = 'coaching'
      }
      return {}
    })

    const wrapper = await mountAt('/job-overview')

    const jobNavItem = findNavItem(wrapper, 'Job Overview')
    expect(jobNavItem.find('.nav-badge').text()).toBe('1')

    await wrapper.findAll('tbody tr').find((row) => row.text().includes('Job Student'))?.get('button').trigger('click')
    await flushPromises()

    expect(jobNavItem.find('.nav-badge').exists()).toBe(false)
  })
})
