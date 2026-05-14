import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Antd from 'ant-design-vue'
import MainLayout from '@/layouts/MainLayout.vue'
import JobOverviewPage from '@/views/job-overview/index.vue'
import MockPracticePage from '@/views/mock-practice/index.vue'

// jsdom 不带 window.matchMedia，antd 的 Row/Col 响应式 grid 依赖它
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

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
      plugins: [router, Antd],
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

  it('shows mock badge with the count of new rows (FIX-1: no more 确认 click path)', async () => {
    // 2026-05-15 FIX-1: 需求 04-mock-practice-management §2.3 删除 mentor 端"确认"按钮，
    // 原 spec 通过"点击确认 → status new→pending → badge -1"路径不再存在。
    // badge 显示逻辑（MainLayout.fetchMockBadge）仍按 status='new' 计数，由 admin/LM 端的
    // 排课接口推进状态。本 spec 改为：只断言初始 badge 计数正确。
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
      if (url === '/mentor/mock-practice/list') {
        return { rows: mockRows.map((row) => ({ ...row })) }
      }
      return { rows: [] }
    })

    const wrapper = await mountAt('/mock-practice')

    const mockNavItem = findNavItem(wrapper, 'Mock Practice')
    expect(mockNavItem.find('.nav-badge').text()).toBe('2')

    // negative：列表已无"确认"按钮可点
    const confirmBtn = wrapper.findAll('button').find((b) => b.text().trim() === '确认')
    expect(confirmBtn).toBeUndefined()
    expect(http.put).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/mentor\/mock-practice\/\d+\/confirm/),
    )
  })

  // FIX-E：mentor 端 Job Overview 已改为只读 5 列，无"确认"按钮，
  // 因此原"通过确认按钮使 job badge 消失"的覆盖路径不再适用。
  // 班级排班/确认能力转由班主任端承担；mentor 端 badge 行为由 jobBadge 上游
  // refreshJobBadge() 在 onMounted 时统一刷新（已在 nav 单测覆盖）。
})
