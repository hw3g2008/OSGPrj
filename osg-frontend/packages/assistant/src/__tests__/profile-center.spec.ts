import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getAssistantProfile: vi.fn(),
  updateAssistantProfile: vi.fn(),
}))

vi.mock('@osg/shared/api', () => apiMocks)

const { getAssistantProfile, updateAssistantProfile } = apiMocks

import ProfilePage from '@/views/profile/index.vue'

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
  })

  it('renders the real profile page and opens the editor with live values', async () => {
    const wrapper = mount(ProfilePage)
    await flushUi()

    expect(wrapper.find('#page-profile').exists()).toBe(true)
    // Page title 已迁移到 shared PageHeader 组件，BEM 类名 .page-header__title
    expect(wrapper.find('.page-header__title').text()).toContain('Profile')
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
})
