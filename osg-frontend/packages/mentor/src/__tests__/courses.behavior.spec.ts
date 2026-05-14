import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Antd, { Select as ASelect } from 'ant-design-vue'
import CoursesPage from '@/views/courses/index.vue'

const mountOptions = { global: { plugins: [Antd] } }

async function setSelect(wrapper: ReturnType<typeof mount>, index: number, value: string) {
  const selects = wrapper.findAllComponents(ASelect)
  expect(selects[index], `expected ASelect at index ${index}`).toBeTruthy()
  await selects[index].vm.$emit('update:value', value)
  await selects[index].vm.$emit('change', value, null)
  await flushPromises()
}

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  const normalized = label.replace(/\s/g, '')
  return wrapper.findAll('button').find((b) => b.text().replace(/\s/g, '').includes(normalized))
}

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

import { http } from '@osg/shared/utils/request'

function createCourseRow(overrides: Record<string, unknown> = {}) {
  return {
    recordId: 11,
    classId: 'CR-0011',
    studentId: 843,
    studentName: 'Course Student',
    courseType: 'mock_interview',
    courseSource: 'mentor_report',
    classDate: '2026-03-21T10:00:00.000Z',
    durationHours: 2,
    status: 'pending',
    rate: '600',
    feedbackContent: '课堂反馈内容',
    reviewRemark: '驳回原因说明',
    ...overrides,
  }
}

function createCourseRows(count: number) {
  return Array.from({ length: count }, (_, index) => createCourseRow({
    recordId: 100 + index,
    classId: `CR-${String(100 + index).padStart(4, '0')}`,
    studentId: 800 + index,
    studentName: `Student ${index + 1}`,
    courseType: index % 2 === 0 ? 'mock_interview' : 'basic_course',
    courseSource: index % 2 === 0 ? 'mentor_report' : 'mentor',
    status: index % 3 === 0 ? 'approved' : 'pending',
    rate: index % 3 === 0 ? '5' : '600',
  }))
}

describe('mentor courses behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the full list for all and reset even when the backend defaults to 10 rows', async () => {
    const fullRows = createCourseRows(12)

    vi.mocked(http.get).mockImplementation(async (url: string, options?: Record<string, any>) => {
      if (url === '/mentor/class-records/list') {
        if (options?.params?.pageSize) {
          return { rows: fullRows }
        }
        return { rows: fullRows.slice(0, 10) }
      }
      return { rows: [] }
    })

    const wrapper = mount(CoursesPage, mountOptions)
    await flushPromises()

    expect(wrapper.text()).toContain('Student 12')

    const keywordInput = wrapper.get('input[placeholder="搜索学员姓名/ID..."]')
    await keywordInput.setValue('Student 1')
    await flushPromises()

    await findButton(wrapper, '重置')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Student 12')
  })

  it('filters mock interview rows by the displayed course content label', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/mentor/class-records/list') {
        return {
          rows: [
            createCourseRow({
              recordId: 21,
              classId: 'CR-0021',
              studentName: 'Mock Interview Student',
              courseType: 'mock_interview',
              courseSource: 'mentor_report',
            }),
            createCourseRow({
              recordId: 22,
              classId: 'CR-0022',
              studentName: 'Basic Course Student',
              courseType: 'basic_course',
              courseSource: 'mentor',
            }),
          ],
        }
      }
      return { rows: [] }
    })

    const wrapper = mount(CoursesPage, mountOptions)
    await flushPromises()

    // contentType is ASelect[1] (filters: coachingType=0, contentType=1, timeRange=2)
    await setSelect(wrapper, 1, '模拟面试')

    expect(wrapper.text()).toContain('Mock Interview Student')
    expect(wrapper.text()).not.toContain('Basic Course Student')
  })

  it('shows the reject modal with the prototype header and actions', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/mentor/class-records/list') {
        return { rows: [createCourseRow({ status: 'rejected', reviewRemark: '课程时长与学员反馈不符' })] }
      }
      return { rows: [] }
    })

    const wrapper = mount(CoursesPage, mountOptions)
    await flushPromises()

    const rejectButton = findButton(wrapper, '查看原因')
    expect(rejectButton).toBeTruthy()

    await rejectButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('课程审核驳回')
    expect(wrapper.text().replace(/\s/g, '')).toContain('关闭')
    expect(wrapper.text()).toContain('重新提交')
  })

  it('opens the confirm modal after resubmitting from the reject modal', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/mentor/class-records/list') {
        return { rows: [createCourseRow({ status: 'rejected', reviewRemark: '课程时长与学员反馈不符' })] }
      }
      return { rows: [] }
    })

    const wrapper = mount(CoursesPage, mountOptions)
    await flushPromises()

    const rejectButton = findButton(wrapper, '查看原因')
    await rejectButton!.trigger('click')
    await flushPromises()

    const resubmitButton = findButton(wrapper, '重新提交')
    expect(resubmitButton).toBeTruthy()

    await resubmitButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('确认课程并填写反馈')
    expect(wrapper.text()).toContain('请先选择课程类型，将显示对应的反馈表单')
    expect(wrapper.find('#confirm-class-type').exists()).toBe(true)
  })

  it('submits a real resubmit payload from the confirm modal', async () => {
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/mentor/class-records/list') {
        return { rows: [createCourseRow({ status: 'rejected', reviewRemark: '课程时长与学员反馈不符' })] }
      }
      return { rows: [] }
    })
    vi.mocked(http.post).mockResolvedValue({ code: 200 })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    const wrapper = mount(CoursesPage, mountOptions)
    await flushPromises()

    await findButton(wrapper, '查看原因')!.trigger('click')
    await flushPromises()
    await findButton(wrapper, '重新提交')!.trigger('click')
    await flushPromises()

    await wrapper.get('#confirm-class-type').setValue('mock_interview')
    await wrapper.get('#confirm-class-date').setValue('2026-03-21')
    await wrapper.get('#confirm-class-duration').setValue('1.5')
    await wrapper.get('#confirm-student-performance').setValue('优秀')
    await wrapper.get('#confirm-company-position').setValue('Goldman Sachs / IB Analyst')
    await wrapper.get('#confirm-feedback').setValue('重新提交后的真实反馈')
    await flushPromises()

    await findButton(wrapper, '确认并提交反馈')!.trigger('click')
    await flushPromises()

    expect(http.post).toHaveBeenCalledWith('/mentor/class-records', expect.objectContaining({
      studentId: 843,
      studentName: 'Course Student',
      classDate: '2026-03-21',
      durationHours: 1.5,
      courseType: 'mock_interview',
      classStatus: 'mock_interview',
      companyOrPosition: 'Goldman Sachs / IB Analyst',
      feedbackContent: '重新提交后的真实反馈',
    }))
    expect(alertSpy).toHaveBeenCalled()

    alertSpy.mockRestore()
  })

  // 删：mentor ReportModal 已重构为 shared ClassReportFlowModal 的薄封装，
  // students 列表改由 prop 传入，原 spec 通过 mock /mentor/students/list 触发的
  // 弹窗内部分支（mentor-class-datetime / mentor-student-status / mentor-job-select 等）
  // 现由 shared 包 StepBasicInfo / index.vue 单测覆盖；此处保留 e2e 端到端覆盖即可。
})
