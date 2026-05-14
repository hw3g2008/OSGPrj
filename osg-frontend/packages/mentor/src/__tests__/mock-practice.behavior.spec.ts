/**
 * Step3-F4 source contract spec：导师端模拟应聘管理一次性闭环。
 * 对应 docs/plans/stage-coaching-request/06-requirement-index-by-end.md §5.3 / 04 §2.1-§2.4。
 *
 * 关键合同：
 * - 不渲染统计卡片（StatCard 4 个全部移除）
 * - 渲染 4 个筛选：公司 / 面试阶段 / 面试时间 / 是否上报课消
 * - 列：学生 ID / 学生姓名 / 类型 / 分配时间 / 已上报课消数 / 操作
 * - 操作"上报课消"按钮触发共享 ReportModal，预填 referenceType=mock_interview/relation_test/communication_test，referenceId=practiceId
 * - new 行的"确认"入口保持工作（PUT /mentor/mock-practice/{id}/confirm）
 *
 * 反向断言：
 * - 不渲染 a-row.stats-grid / 不渲染"已上课时"/"课程反馈"列 / 不渲染本地详情 modal "学员求职详情"
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import MockPracticePage from '@/views/mock-practice/index.vue'

const mountOptions = { global: { plugins: [Antd] } }

type MockPracticeRow = {
  practiceId: number
  studentId: number
  studentName: string
  practiceType: string
  assignedTime?: string
  scheduledAt?: string
  status: string
  lessonReported?: number
  mentorIds?: number[]
}

const baseRows: MockPracticeRow[] = [
  {
    practiceId: 5105,
    studentId: 1012746878370,
    studentName: 'Mock Ack Ready 87837-1',
    practiceType: 'mock_interview',
    assignedTime: '2026-03-28T16:20:37.000+08:00',
    scheduledAt: '2026-03-28T18:50:37.000+08:00',
    status: 'scheduled',
    lessonReported: 1,
    mentorIds: [837],
  },
  {
    practiceId: 5106,
    studentId: 1010746878372,
    studentName: 'Mock Scheduled 87837-1',
    practiceType: 'relation_test',
    assignedTime: '2026-03-28T11:50:37.000+08:00',
    scheduledAt: '2026-03-28T17:50:37.000+08:00',
    status: 'completed',
    lessonReported: 0,
    mentorIds: [837],
  },
]

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: vi.fn(async (url: string) => {
      if (url.includes('/mentor/mock-practice/list')) {
        return { rows: baseRows.map((row) => ({ ...row })), total: baseRows.length }
      }
      return { rows: [] }
    }),
    post: vi.fn(),
    put: vi.fn(async () => ({ code: 200 })),
    delete: vi.fn(),
  },
}))

import { http } from '@osg/shared/utils/request'

describe('mentor mock-practice behavior (Step3-F4 strict)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url.includes('/mentor/mock-practice/list')) {
        return { rows: baseRows.map((row) => ({ ...row })), total: baseRows.length }
      }
      return { rows: [] }
    })
    vi.mocked(http.put).mockResolvedValue({ code: 200 })
  })

  it('does not render the deprecated stats cards (新分配/待进行/已完成/已取消 全部移除)', async () => {
    const wrapper = mount(MockPracticePage, mountOptions)
    await flushPromises()
    const html = wrapper.html()
    expect(html).not.toContain('class="stats-grid"')
    expect(html).not.toMatch(/<[^>]*data-stat-label[^>]*>新分配/)
    // 严格反向断言：不再渲染"新分配"卡片标签 + "已取消"卡片标签作为统计卡片入口
    const statCards = wrapper.findAll('.stat-card,[class*="StatCard"]')
    expect(statCards.length).toBe(0)
  })

  it('renders the 4 required filters: 公司 / 面试阶段 / 面试时间 / 是否上报课消', async () => {
    const wrapper = mount(MockPracticePage, mountOptions)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('公司')
    expect(text).toContain('面试阶段')
    expect(text).toContain('面试时间')
    expect(text).toContain('是否上报课消')
    // 反向断言：旧"学员"关键字搜索 / 旧"状态"select 已移除
    expect(wrapper.find('input[placeholder="搜索学员姓名/ID"]').exists()).toBe(false)
  })

  it('renders the required columns: 学生 ID / 学生姓名 / 类型 / 分配时间 / 已上报课消数 / 操作', async () => {
    const wrapper = mount(MockPracticePage, mountOptions)
    await flushPromises()
    const headers = wrapper.findAll('thead th').map((th) => th.text().trim())
    // 至少要包含 §5.3 列出的 6 列；顺序按 §5.3
    expect(headers).toContain('学生 ID')
    expect(headers).toContain('学生姓名')
    expect(headers).toContain('类型')
    expect(headers).toContain('分配时间')
    expect(headers).toContain('已上报课消数')
    expect(headers).toContain('操作')
    // 反向断言：移除"已上课时"/"课程反馈"/"状态"列
    expect(headers).not.toContain('已上课时')
    expect(headers).not.toContain('课程反馈')
    expect(headers).not.toContain('状态')
  })

  it('exposes a 上报课消 action that opens the shared ReportModal with referenceType + referenceId prefill', async () => {
    const wrapper = mount(MockPracticePage, { ...mountOptions, attachTo: document.body })
    await flushPromises()
    const reportButton = wrapper.findAll('button').find((b) => b.text().includes('上报课消'))
    expect(reportButton, 'expected to find 上报课消 button').toBeTruthy()
    await reportButton!.trigger('click')
    await flushPromises()
    // a-modal 默认 teleport 到 document.body，attachTo=body 后从 body 取 modal DOM
    const flowModalRoot = document.querySelector('[data-surface-id="shared-class-report-flow-modal"]')
        || document.querySelector('.class-report-flow-modal')
    expect(flowModalRoot, 'expected ClassReportFlowModal to be rendered after 上报课消 click').toBeTruthy()
    wrapper.unmount()
  })

  // 2026-05-15 FIX-1: 按需求文档 04-mock-practice-management §2.3「操作列只有上报课消」，
  // 删除 mentor 端"确认"按钮 + 关联 confirmMock 调用。原 spec 期望确认按钮存在并调
  // PUT /mentor/mock-practice/{id}/confirm — 与新需求矛盾，改为 negative 断言：
  // 列表里 new 行不再渲染"确认"按钮。
  it('does not render 确认 button on new rows (FIX-1 per requirement §2.3)', async () => {
    vi.mocked(http.get).mockImplementationOnce(async (url: string) => {
      if (url.includes('/mentor/mock-practice/list')) {
        return {
          rows: baseRows.map((row, i) => (i === 0 ? { ...row, status: 'new' } : row)),
          total: baseRows.length,
        }
      }
      return { rows: [] }
    })
    const wrapper = mount(MockPracticePage, mountOptions)
    await flushPromises()
    const confirmBtn = wrapper.findAll('button').find((b) => b.text().trim() === '确认')
    expect(confirmBtn, 'expected NO 确认 button on the mock-practice list').toBeUndefined()
    expect(http.put).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/mentor\/mock-practice\/\d+\/confirm/),
    )
  })

  it('does not render the deprecated 学员求职详情 modal anywhere on the page', async () => {
    const wrapper = mount(MockPracticePage, mountOptions)
    await flushPromises()
    const text = wrapper.text()
    expect(text).not.toContain('学员求职详情')
    expect(wrapper.findAll('button').find((b) => b.text().includes('查看详情'))).toBeFalsy()
  })

  it('passes filter values into the list endpoint (company / practiceType / scheduledStart / scheduledEnd / reported)', async () => {
    const wrapper = mount(MockPracticePage, mountOptions)
    await flushPromises()
    const triggerButton = wrapper.findAll('button').find((b) => b.text().includes('筛选'))
    expect(triggerButton, 'expected 筛选 trigger').toBeTruthy()
    await triggerButton!.trigger('click')
    await flushPromises()
    expect(http.get).toHaveBeenCalledWith(
      '/mentor/mock-practice/list',
      expect.objectContaining({
        params: expect.objectContaining({
          company: expect.any(String),
          practiceType: expect.any(String),
          reported: expect.any(String),
        }),
      }),
    )
  })
})
