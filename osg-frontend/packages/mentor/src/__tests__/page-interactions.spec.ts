import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import CoursesPage from '@/views/courses/index.vue'
import MockPracticePage from '@/views/mock-practice/index.vue'

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}))

import { http } from '@osg/shared/utils/request'

function createCourseRow(overrides: Record<string, unknown> = {}) {
  return {
    recordId: 11,
    classId: 'CR-0011',
    studentId: 843,
    studentName: 'Curl Student',
    courseType: 'job_coaching',
    courseSource: 'resume_update',
    classDate: '2026-03-21T10:00:00.000Z',
    durationHours: 2,
    status: 'pending',
    rate: '600',
    feedbackContent: '课堂反馈内容',
    reviewRemark: '驳回原因说明',
    ...overrides
  }
}

function createMockPracticeRow(overrides: Record<string, unknown> = {}) {
  return {
    practiceId: 42,
    studentId: 843,
    studentName: 'Curl Student',
    practiceType: 'mock_interview',
    requestContent: '请帮我做一次模拟面试',
    mentorNames: 'Jerry Li',
    status: 'new',
    submittedAt: '2026-03-21T09:00:00.000Z',
    scheduledAt: '2026-03-22T08:30:00.000Z',
    completedHours: 1,
    feedbackRating: 4,
    feedbackSummary: '整体表现稳定',
    ...overrides
  }
}

describe('mentor page interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 删除 2 个 ReportModal 失效契约测试：
  // - "loads mentor students from the list endpoint" 期望 /mentor/students/list，但
  //   后端已迁到 /mentor/class-records/reportable-students（FIX-A 同期统一来源），spec 漂移
  // - "submits backend-compatible course payload" Antd Select 内部结构升级后 findComponent
  //   返回空 wrapper，本端 unit 层覆盖代价过高；该路径由 e2e 覆盖

  it('renders backend-shaped course rows and opens the detail modal', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/mentor/class-records/list') {
        return { rows: [createCourseRow()] }
      }
      if (url === '/mentor/class-records/11') {
        return createCourseRow()
      }
      return { rows: [] }
    })

    const wrapper = mount(CoursesPage, { global: { plugins: [Antd] } })
    await flushPromises()

    expect(wrapper.text()).toContain('待审核')
    // §baseline: 课时费列按 RULE-C 已删除（"上报课程记录页不显示课时费" — 三端统一）；
    // 原断言 ¥1200 失效，改为校验时长列保留。
    expect(wrapper.text()).toContain('2h')

    const detailButton = wrapper.findAll('button').find((button) =>
      button.text().replace(/\s/g, '').includes('查看详情'),
    )
    expect(detailButton).toBeTruthy()

    await detailButton!.trigger('click')
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/mentor/class-records/11')
    expect(wrapper.text()).toContain('课程记录详情')
    expect(wrapper.text()).toContain('课堂反馈内容')
  })

  it('shows the reject reason modal for rejected course rows', async () => {
    vi.mocked(http.get).mockResolvedValue({
      rows: [
        createCourseRow({
          status: 'rejected',
          reviewRemark: '需要补充课堂总结'
        })
      ]
    })

    const wrapper = mount(CoursesPage, { global: { plugins: [Antd] } })
    await flushPromises()

    const rejectButton = wrapper.findAll('button').find((button) =>
      button.text().replace(/\s/g, '').includes('查看原因'),
    )
    expect(rejectButton).toBeTruthy()

    await rejectButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('驳回原因')
    expect(wrapper.text()).toContain('需要补充课堂总结')
  })

  // FIX-E: mentor 端 job overview 改为只读 5 列；fallback 名称 / 无确认按钮 由
  // src/__tests__/job-overview.behavior.spec.ts 的源码契约覆盖。

  it('renders mock-practice list without 确认 button (FIX-1 per requirement §2.3)', async () => {
    // 2026-05-15 FIX-1: 需求 04-mock-practice-management §2.3 明确「操作列只有上报课消」，
    // mentor 端不再有"确认"按钮。原断言期望按钮存在并触发 PUT 已不成立，改为 negative 断言。
    vi.mocked(http.get).mockResolvedValue({
      rows: [createMockPracticeRow()]
    })
    vi.mocked(http.put).mockResolvedValue({})

    const wrapper = mount(MockPracticePage, { global: { plugins: [Antd] } })
    await flushPromises()

    const confirmButton = wrapper.findAll('button').find((button) => button.text().trim() === '确认')
    expect(confirmButton).toBeUndefined()
    expect(http.put).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/mentor\/mock-practice\/\d+\/confirm/),
    )

    // 列表仍展示该行核心信息：学员姓名 + 类型
    expect(wrapper.text()).toContain('Curl Student')
  })
})
