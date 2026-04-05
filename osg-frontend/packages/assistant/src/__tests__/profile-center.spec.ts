import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getAssistantProfile: vi.fn(),
  updateAssistantProfile: vi.fn(),
  getAssistantCurrentSchedule: vi.fn(),
  getAssistantLastWeekSchedule: vi.fn(),
  saveAssistantSchedule: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

const {
  getAssistantProfile,
  updateAssistantProfile,
  getAssistantCurrentSchedule,
  getAssistantLastWeekSchedule,
  saveAssistantSchedule,
} = apiMocks

import ProfilePage from '@/views/profile/index.vue'
import SchedulePage from '@/views/schedule/index.vue'

const profileFixture = {
  userId: 1,
  userName: 'admin',
  nickName: 'Amy Assistant',
  email: 'amy.assistant@example.com',
  phonenumber: '13800000000',
  sex: '1',
  status: '0',
  loginIp: '127.0.0.1',
  loginDate: '2026-03-23T09:30:00',
  remark: 'WeChat-Amy',
}

const updatedProfileFixture = {
  ...profileFixture,
  nickName: 'Amy Updated',
  email: 'amy.updated@example.com',
  phonenumber: '13900000000',
}

const currentScheduleFixture = {
  id: 10,
  mentorId: 1,
  weekStartDate: '2026-03-23',
  totalHours: 8,
  monday: 'morning',
  tuesday: 'afternoon',
  wednesday: 'unavailable',
  thursday: 'evening',
  friday: 'unavailable',
  saturday: 'all_day',
  sunday: 'unavailable',
}

const lastWeekScheduleFixture = {
  ...currentScheduleFixture,
  weekStartDate: '2026-03-16',
  totalHours: 6,
  monday: 'afternoon',
}

const updatedScheduleFixture = {
  ...currentScheduleFixture,
  totalHours: 10,
  monday: 'all_day',
}

async function flushUi() {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('assistant personal center pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAssistantProfile.mockResolvedValue(profileFixture)
    updateAssistantProfile.mockResolvedValue({ code: 200, msg: '操作成功' })
    getAssistantCurrentSchedule.mockResolvedValue(currentScheduleFixture)
    getAssistantLastWeekSchedule.mockResolvedValue(lastWeekScheduleFixture)
    saveAssistantSchedule.mockResolvedValue({ code: 200, msg: '操作成功' })
  })

  it('renders the real profile page and opens the editor with live values', async () => {
    const wrapper = mount(ProfilePage)
    await flushUi()

    expect(wrapper.find('#page-profile').exists()).toBe(true)
    expect(wrapper.find('.page-title').text()).toContain('Profile')
    expect(wrapper.text()).toContain('Amy Assistant')
    expect(wrapper.text()).toContain('amy.assistant@example.com')
    expect(wrapper.text()).not.toContain('敬请期待')

    await wrapper.get('#assistant-profile-edit').trigger('click')

    expect((wrapper.get('#assistant-profile-nick-name').element as HTMLInputElement).value).toBe('Amy Assistant')
    expect((wrapper.get('#assistant-profile-email').element as HTMLInputElement).value).toBe('amy.assistant@example.com')
  })

  it('submits a valid profile update and rehydrates the latest persisted values', async () => {
    getAssistantProfile
      .mockResolvedValueOnce(profileFixture)
      .mockResolvedValueOnce(updatedProfileFixture)

    const wrapper = mount(ProfilePage)
    await flushUi()

    await wrapper.get('#assistant-profile-edit').trigger('click')
    await wrapper.get('#assistant-profile-nick-name').setValue('Amy Updated')
    await wrapper.get('#assistant-profile-email').setValue('amy.updated@example.com')
    await wrapper.get('#assistant-profile-phone').setValue('13900000000')
    await wrapper.get('#assistant-profile-save').trigger('submit')
    await flushUi()

    expect(updateAssistantProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        userName: 'admin',
        nickName: 'Amy Updated',
        email: 'amy.updated@example.com',
        phonenumber: '13900000000',
      }),
    )
    expect(wrapper.text()).toContain('Amy Updated')
    expect(wrapper.text()).toContain('amy.updated@example.com')
    expect(wrapper.text()).toContain('保存成功')
  })

  it('blocks invalid profile payloads and keeps clear inline feedback', async () => {
    const wrapper = mount(ProfilePage)
    await flushUi()

    await wrapper.get('#assistant-profile-edit').trigger('click')
    await wrapper.get('#assistant-profile-email').setValue('invalid-email')
    await wrapper.get('#assistant-profile-save').trigger('submit')
    await flushUi()

    expect(updateAssistantProfile).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入正确的邮箱格式')
    expect(wrapper.text()).toContain('无法保存')
  })

  it('renders the weekly schedule view in lead-mentor style shell and copies last week values into the current form', async () => {
    const wrapper = mount(SchedulePage)
    await flushUi()

    expect(wrapper.find('#page-schedule').exists()).toBe(true)
    expect(wrapper.find('.schedule-banner').exists()).toBe(true)
    expect(wrapper.findAll('.card')).toHaveLength(3)
    expect(wrapper.find('.card-tag').text()).toContain('只读视图')
    expect((wrapper.get('#assistant-schedule-monday').element as HTMLSelectElement).value).toBe('morning')
    expect(wrapper.text()).toContain('8 小时')

    await wrapper.get('#assistant-schedule-copy-last-week').trigger('click')
    await flushUi()

    expect((wrapper.get('#assistant-schedule-monday').element as HTMLSelectElement).value).toBe('afternoon')
    expect(wrapper.text()).toContain('复制成功')
  })

  it('submits a valid schedule update and reloads the latest persisted schedule', async () => {
    getAssistantCurrentSchedule
      .mockResolvedValueOnce(currentScheduleFixture)
      .mockResolvedValueOnce(updatedScheduleFixture)

    const wrapper = mount(SchedulePage)
    await flushUi()

    await wrapper.get('#assistant-schedule-monday').setValue('all_day')
    await wrapper.get('#assistant-schedule-total-hours').setValue('10')
    await wrapper.get('#assistant-schedule-save').trigger('click')
    await flushUi()

    expect(saveAssistantSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 10,
        weekStartDate: '2026-03-23',
        monday: 'all_day',
        totalHours: 10,
      }),
    )
    expect(wrapper.text()).toContain('保存成功')
    expect((wrapper.get('#assistant-schedule-total-hours').element as HTMLInputElement).value).toBe('10')
  })

  it('blocks invalid schedule payloads with clear feedback', async () => {
    const wrapper = mount(SchedulePage)
    await flushUi()

    for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
      await wrapper.get(`#assistant-schedule-${day}`).setValue('unavailable')
    }
    await wrapper.get('#assistant-schedule-total-hours').setValue('0')
    await wrapper.get('#assistant-schedule-save').trigger('click')
    await flushUi()

    expect(saveAssistantSchedule).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请至少选择一天可授课时间段')
  })
})
