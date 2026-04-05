import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { http } from '@osg/shared/utils/request'
import ProfilePage from '@/views/profile/index.vue'

vi.mock('@osg/shared/utils/request', () => ({
  http: {
    get: vi.fn(async (url: string) => {
      if (url.includes('/profile')) {
        return {
          nickName: 'Mentor D Chain',
          userName: 'mentor_d_chain',
          email: 'mentor-d-chain@osg.local',
          sex: '1',
          phonenumber: '13900012767',
          remark: 'mentor submit/admin review chain seed',
          loginIp: '152.42.161.78',
        }
      }
      return {}
    }),
    put: vi.fn(),
  },
}))

describe('mentor profile page behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the edit modal region linkage aligned with SSOT', async () => {
    const wrapper = mount(ProfilePage)
    await flushPromises()

    await wrapper.get('#page-profile button').trigger('click')
    await flushPromises()

    expect(wrapper.find('#mentor-region-area').exists()).toBe(true)
    expect(wrapper.find('#mentor-region-city').exists()).toBe(true)

    await wrapper.find('#mentor-region-area').setValue('north-america')
    await flushPromises()

    expect(wrapper.find('#mentor-region-city').findAll('option').map(option => option.text())).toEqual([
      '选择城市',
      'New York 纽约',
      'San Francisco 旧金山',
      'Chicago 芝加哥',
    ])
  })

  it('shows the unified save confirm modal and success modal instead of native dialogs', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)
    vi.mocked(http.put).mockResolvedValueOnce({ code: 200 })

    const wrapper = mount(ProfilePage)
    await flushPromises()

    await wrapper.get('#page-profile button').trigger('click')
    await flushPromises()

    await wrapper.find('#modal-mentor-edit-profile button.btn-primary').trigger('click')
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(alertSpy).not.toHaveBeenCalled()
    expect(wrapper.find('#modal-mentor-profile-save-confirm').exists()).toBe(true)

    await wrapper.find('#modal-mentor-profile-save-confirm button.btn-primary').trigger('click')
    await flushPromises()

    expect(http.put).toHaveBeenCalledWith('/api/mentor/profile', expect.objectContaining({
      nickName: 'Mentor D Chain',
      email: 'mentor-d-chain@osg.local',
    }))
    expect(wrapper.find('#modal-mentor-edit-profile').exists()).toBe(false)
    expect(wrapper.find('#modal-mentor-profile-save-success').exists()).toBe(true)

    confirmSpy.mockRestore()
    alertSpy.mockRestore()
  })
})
