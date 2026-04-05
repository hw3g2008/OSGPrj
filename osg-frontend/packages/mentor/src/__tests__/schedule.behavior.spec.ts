import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SchedulePage from '@/views/schedule/index.vue'

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@osg/shared/utils', () => ({
  getUser: vi.fn(),
}))

import { http } from '@osg/shared/utils/request'
import { getUser } from '@osg/shared/utils'

function mountSchedulePage() {
  return mount(SchedulePage)
}

function getButtonTexts(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').map((button) => button.text().replace(/\s+/g, ' ').trim())
}

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    ;(window.HTMLElement.prototype as any).scrollIntoView = vi.fn()
    ;(window.HTMLElement.prototype as any).focus = vi.fn()
    vi.mocked(getUser).mockReturnValue({
      userName: 'mentor_d_chain',
      nickName: 'Mentor D Chain',
      userId: 12767,
    })
    vi.mocked(http.get).mockResolvedValue(null)
    vi.mocked(http.put).mockResolvedValue({})
  })

  it('renders the prototype schedule shell and visible controls', async () => {
    const wrapper = mountSchedulePage()
    await flushPromises()

    expect(wrapper.find('#page-schedule').exists()).toBe(true)
    expect(wrapper.find('.page-title').text()).toContain('我的排期')
    expect(wrapper.find('#this-week-unfilled').exists()).toBe(true)
    expect(wrapper.find('#mentor-next-weekly-hours').exists()).toBe(true)

    const buttonTexts = getButtonTexts(wrapper)
    expect(buttonTexts).toContain('立即填写')
    expect(buttonTexts).toContain('提交本周排期')
    expect(buttonTexts).toContain('保存下周排期')
    expect(buttonTexts).toContain('重置')
    expect(buttonTexts).toContain('10h')
    expect(buttonTexts).toContain('15h')
  })

  it('scrolls to the current-week block and fills the current-week hours shortcut', async () => {
    const wrapper = mountSchedulePage()
    await flushPromises()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    expect(window.HTMLElement.prototype.focus).toHaveBeenCalled()

    const currentQuickButton = wrapper
      .findAll('button')
      .find((button) => button.text().replace(/\s+/g, ' ').trim() === '10h')
    expect(currentQuickButton).toBeTruthy()

    await currentQuickButton!.trigger('click')
    expect((wrapper.find('#mentor-this-weekly-hours').element as HTMLInputElement).value).toBe('10')
  })

  it('submits the current week with a weekStartDate and backend path without double /api', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T12:00:00+08:00'))

    const wrapper = mountSchedulePage()
    await flushPromises()

    const currentQuickButton = wrapper
      .findAll('button')
      .find((button) => button.text().replace(/\s+/g, ' ').trim() === '10h')
    expect(currentQuickButton).toBeTruthy()

    await currentQuickButton!.trigger('click')
    await wrapper.find('#this-week-unfilled input[type="checkbox"]').setValue(true)

    const submitButton = wrapper.findAll('button').find((button) => button.text().includes('提交本周排期'))
    expect(submitButton).toBeTruthy()

    await submitButton!.trigger('click')
    await flushPromises()

    expect(http.put).toHaveBeenCalledWith(expect.stringContaining('/api/mentor/schedule'), expect.objectContaining({
      weekStartDate: '2026-03-23',
      totalHours: 10,
    }))
    expect(window.alert).not.toHaveBeenCalled()
    expect(wrapper.find('#modal-mentor-schedule-feedback').exists()).toBe(true)
    expect(wrapper.find('#modal-mentor-schedule-feedback').text()).toContain('本周排期已提交！')

    vi.useRealTimers()
  })

  it('supports the next-week shortcut, reset, and save flow', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T12:00:00+08:00'))

    const wrapper = mountSchedulePage()
    await flushPromises()

    const nextQuickButton = wrapper
      .findAll('button')
      .find((button) => button.text().replace(/\s+/g, ' ').trim() === '15h')
    expect(nextQuickButton).toBeTruthy()

    await nextQuickButton!.trigger('click')
    expect((wrapper.find('#mentor-next-weekly-hours').element as HTMLInputElement).value).toBe('15')

    await wrapper.find('#mentor-next-week-panel input[type="checkbox"]').setValue(true)
    await wrapper.find('#mentor-next-weekly-hours').setValue('20')
    await wrapper.find('textarea').setValue('元旦假期安排')

    const resetButton = wrapper.findAll('button').find((button) => button.text().includes('重置'))
    expect(resetButton).toBeTruthy()
    await resetButton!.trigger('click')

    expect((wrapper.find('#mentor-next-weekly-hours').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')

    await wrapper.find('#mentor-next-weekly-hours').setValue('15')
    await wrapper.find('textarea').setValue('元旦假期安排')
    await wrapper.find('#mentor-next-week-panel input[type="checkbox"]').setValue(true)

    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('保存下周排期'))
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(http.put).toHaveBeenCalledWith(expect.stringContaining('/api/mentor/schedule'), expect.objectContaining({
      weekStartDate: '2026-03-30',
      totalHours: 15,
    }))
    expect(window.alert).not.toHaveBeenCalled()
    expect(wrapper.find('#modal-mentor-schedule-feedback').exists()).toBe(true)
    expect(wrapper.find('#modal-mentor-schedule-feedback').text()).toContain('下周排期已保存！')

    vi.useRealTimers()
  })

  it('uses the unified feedback modal for validation and request failures instead of native alerts', async () => {
    vi.mocked(http.put).mockRejectedValueOnce(new Error('network fail'))

    const wrapper = mountSchedulePage()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text().replace(/\s+/g, ' ').trim() === '10h')!.trigger('click')
    await wrapper.find('#this-week-unfilled input[type="checkbox"]').setValue(true)
    await wrapper.findAll('button').find((button) => button.text().includes('提交本周排期'))!.trigger('click')
    await flushPromises()

    expect(window.alert).not.toHaveBeenCalled()
    expect(wrapper.find('#modal-mentor-schedule-feedback').exists()).toBe(true)
    expect(wrapper.find('#modal-mentor-schedule-feedback').text()).toContain('提交失败，请稍后重试')

    await wrapper.find('#modal-mentor-schedule-feedback button.btn-primary').trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text().includes('保存下周排期'))!.trigger('click')
    await flushPromises()

    expect(window.alert).not.toHaveBeenCalled()
    expect(wrapper.find('#modal-mentor-schedule-feedback').exists()).toBe(true)
    expect(wrapper.find('#modal-mentor-schedule-feedback').text()).toContain('请至少填写下周可上课时长')
  })
})
