import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CoursesPage from '@/views/courses/index.vue'
import JobOverviewPage from '@/views/job-overview/index.vue'
import MockPracticePage from '@/views/mock-practice/index.vue'
import ProfilePage from '@/views/profile/index.vue'
import SchedulePage from '@/views/schedule/index.vue'

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: vi.fn(async (url: string) => {
      if (url.includes('/calendar')) {
        return []
      }
      if (url.includes('/profile')) {
        return {
          nickName: 'Mentor',
          userName: 'mentor',
          email: 'mentor@example.com',
          sex: '0',
          phonenumber: '13800000000',
          remark: 'mentor-wechat'
        }
      }
      if (url.includes('/schedule')) {
        return {
          monday: 'morning',
          totalHours: 8
        }
      }
      return { rows: [] }
    }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@osg/shared/utils', async () => {
  const actual = await vi.importActual<typeof import('@osg/shared/utils')>('@osg/shared/utils')
  return {
    ...actual,
    getUser: vi.fn(() => ({ nickName: 'Mentor', userId: 1001 }))
  }
})

describe('mentor page smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the courses page shell', async () => {
    const wrapper = mount(CoursesPage)
    await flushPromises()

    expect(wrapper.text()).toContain('课程记录')
    expect(wrapper.text()).toContain('上报课程记录')
  })

  it('renders the job overview page shell', async () => {
    const wrapper = mount(JobOverviewPage)
    await flushPromises()

    expect(wrapper.text()).toContain('学员求职总览')
    expect(wrapper.text()).toContain('导出')
  })

  it('renders the mock practice page shell', async () => {
    const wrapper = mount(MockPracticePage)
    await flushPromises()

    expect(wrapper.text()).toContain('模拟应聘管理')
    expect(wrapper.find('input[placeholder="搜索学员姓名/ID"]').exists()).toBe(true)
  })

  it('renders the profile page shell', async () => {
    const wrapper = mount(ProfilePage)
    await flushPromises()

    expect(wrapper.text()).toContain('基本信息')
    expect(wrapper.text()).toContain('编辑信息')
  })

  it('renders the schedule page shell', async () => {
    const wrapper = mount(SchedulePage)
    await flushPromises()

    expect(wrapper.text()).toContain('我的排期')
    expect(wrapper.text()).toContain('保存排期')
  })
})
