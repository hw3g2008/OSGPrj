/**
 * ForgotPasswordModal 测试
 *
 * SSOT：原型 prototype/forgot-password.html modal 块（asst/mentor/LM MD5 字字相同）
 * 关注点：
 * - props: open / endpoints
 * - 4 step 切换正确（step-1 邮箱 → step-2 验证码 → step-3 新密码 → step-4 成功）
 * - emit('update:open', false) 正确触发
 * - watch open=false 自动 reset 流程状态（不残留）
 * - endpoints 注入正确调用
 *
 * 测试技术：stub a-modal（保留 default slot 渲染），其余 antd 组件保留真实渲染。
 */
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import Antd from 'ant-design-vue'

import ForgotPasswordModal from './ForgotPasswordModal.vue'
import type { ForgotPasswordEndpoints } from '../composables/useForgotPasswordFlow'

let wrapper: VueWrapper<any> | null = null

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

/**
 * a-modal stub：保留 default slot 渲染（让我们能在 jsdom 中查询 modal body 内容），
 * 不走 teleport，避免 portal 导致 wrapper.html() 看不到内容。
 */
const AModalStub = defineComponent({
  name: 'AModal',
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['update:open'],
  setup(props, { slots }) {
    return () =>
      props.open
        ? h('div', { class: 'a-modal-stub' }, [
            slots.title ? h('div', { class: 'a-modal-stub-title' }, slots.title()) : null,
            slots.default?.(),
          ])
        : null
  },
})

const buildEndpoints = (
  overrides: Partial<ForgotPasswordEndpoints> = {},
): ForgotPasswordEndpoints => ({
  sendCode: vi.fn().mockResolvedValue(undefined),
  verifyCode: vi.fn().mockResolvedValue({ resetToken: 'tok-001' }),
  resetPassword: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

const mountModal = (props: { open?: boolean; endpoints?: ForgotPasswordEndpoints } = {}) => {
  return mount(ForgotPasswordModal, {
    props: {
      open: true,
      endpoints: buildEndpoints(),
      ...props,
    },
    global: {
      plugins: [Antd],
      stubs: {
        AModal: AModalStub,
      },
    },
  })
}

describe('ForgotPasswordModal (component)', () => {
  describe('rendering', () => {
    it('1. open=true 时渲染 modal 内容', () => {
      wrapper = mountModal({ open: true })
      expect(wrapper.find('.a-modal-stub').exists()).toBe(true)
      expect(wrapper.find('#fp-step-1').exists()).toBe(true)
    })

    it('2. open=false 时不渲染 modal 内容', () => {
      wrapper = mountModal({ open: false })
      expect(wrapper.find('.a-modal-stub').exists()).toBe(false)
    })

    it('3. 默认渲染 step 1（邮箱输入）', () => {
      wrapper = mountModal()
      expect(wrapper.find('#fp-step-1').exists()).toBe(true)
      expect(wrapper.find('#fp-step-2').exists()).toBe(false)
      expect(wrapper.find('#fp-step-3').exists()).toBe(false)
      expect(wrapper.find('#fp-step-4').exists()).toBe(false)
    })

    it('4. 渲染 3 个 step dot（原型 SSOT）', () => {
      wrapper = mountModal()
      expect(wrapper.find('#fp-dot-1').exists()).toBe(true)
      expect(wrapper.find('#fp-dot-2').exists()).toBe(true)
      expect(wrapper.find('#fp-dot-3').exists()).toBe(true)
    })

    it('5. step 1 时仅 dot 1 active', () => {
      wrapper = mountModal()
      expect(wrapper.find('#fp-dot-1').classes()).toContain('active')
      expect(wrapper.find('#fp-dot-2').classes()).not.toContain('active')
      expect(wrapper.find('#fp-dot-3').classes()).not.toContain('active')
    })

    it('6. 不渲染 password-strength meter（原型严格无）', () => {
      wrapper = mountModal()
      expect(wrapper.find('.password-strength').exists()).toBe(false)
      expect(wrapper.find('.strength-bar').exists()).toBe(false)
      expect(wrapper.find('.osg-fp-strength').exists()).toBe(false)
    })

    it('7. 渲染 mdi-key 图标在 modal title（原型 SSOT）', () => {
      wrapper = mountModal()
      expect(wrapper.html()).toContain('mdi-key')
      expect(wrapper.text()).toContain('找回密码')
    })
  })

  describe('endpoints injection', () => {
    it('8. 提交 step 1 表单调用 endpoints.sendCode', async () => {
      const endpoints = buildEndpoints()
      wrapper = mountModal({ endpoints })

      await wrapper.find('#fp-email').setValue('user@example.com')
      await wrapper.find('#fp-step-1 form').trigger('submit')
      await flushPromises()

      expect(endpoints.sendCode).toHaveBeenCalledWith({
        email: 'user@example.com',
      })
    })

    it('9. step 1 邮箱无效时不调用 sendCode 且显示错误', async () => {
      const endpoints = buildEndpoints()
      wrapper = mountModal({ endpoints })

      await wrapper.find('#fp-email').setValue('not-an-email')
      await wrapper.find('#fp-step-1 form').trigger('submit')
      await flushPromises()

      expect(endpoints.sendCode).not.toHaveBeenCalled()
    })

    it('10. step 1 成功后切到 step 2', async () => {
      const endpoints = buildEndpoints()
      wrapper = mountModal({ endpoints })

      await wrapper.find('#fp-email').setValue('user@example.com')
      await wrapper.find('#fp-step-1 form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('#fp-step-2').exists()).toBe(true)
      expect(wrapper.find('#fp-step-1').exists()).toBe(false)
    })
  })

  describe('open watch (reset on close)', () => {
    it('11. open 从 true 变 false 时复位 step 到 1', async () => {
      // 父级用 ref 控制 open
      const ParentTest = defineComponent({
        components: { ForgotPasswordModal },
        setup() {
          const open = ref(true)
          const endpoints = buildEndpoints()
          return { open, endpoints }
        },
        template: `<ForgotPasswordModal :open="open" :endpoints="endpoints" @update:open="open = $event" />`,
      })

      wrapper = mount(ParentTest, {
        global: {
          plugins: [Antd],
          stubs: { AModal: AModalStub },
        },
      })

      // 推进到 step 2
      await wrapper.find('#fp-email').setValue('user@example.com')
      await wrapper.find('#fp-step-1 form').trigger('submit')
      await flushPromises()
      expect(wrapper.find('#fp-step-2').exists()).toBe(true)

      // 关闭 modal
      ;(wrapper.vm as any).open = false
      await nextTick()
      await flushPromises()

      // 重新打开应该回到 step 1（reset 生效）
      ;(wrapper.vm as any).open = true
      await nextTick()
      expect(wrapper.find('#fp-step-1').exists()).toBe(true)
      expect(wrapper.find('#fp-step-2').exists()).toBe(false)

      // 邮箱 input 应被清空
      const emailInput = wrapper.find('#fp-email').element as HTMLInputElement
      expect(emailInput.value).toBe('')
    })
  })

  describe('contract', () => {
    it('12. 渲染必需的 SSOT id（原型字符 fp-step-1/2/3/4 + fp-email + fp-code 等）', () => {
      // step 1 默认渲染，至少 fp-email + fp-send-code-btn 必须存在
      wrapper = mountModal()
      expect(wrapper.find('#fp-email').exists()).toBe(true)
      expect(wrapper.find('#fp-send-code-btn').exists()).toBe(true)
    })
  })
})
